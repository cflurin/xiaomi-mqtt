#!/usr/bin/env node
'use strict';

var dgram = require('dgram');
var Mqtt = require('./lib/mqtt.js').Mqtt;
var Utils = require('./lib/utils.js').Utils;
const crypto = require('crypto');

const package_name = "xiaomi-mqtt";

var sidAddress = {}
var sidPort = {};
var token = {};
var payload = {};
      
var config = Utils.loadConfig("config.json");

var serverPort = config.xiaomi.serverPort || 9898;
var multicastAddress = config.xiaomi.multicastAddress || '224.0.0.50';
var multicastPort =  config.xiaomi.multicastPort || 4321;
var password = config.xiaomi.password || "";

const IV = Buffer.from([0x17, 0x99, 0x6d, 0x09, 0x3d, 0x28, 0xdd, 0xb3, 0xba, 0x69, 0x5a, 0x2e, 0x6f, 0x58, 0x56, 0x2e])

var package_version = Utils.read_packageVersion();

Utils.log("Start "+package_name+", version "+package_version);
//Utils.log("config " + JSON.stringify(config, null, 2));

var params = {
  "config": config,
  "package_name": package_name,
  "get_id_list": get_id_list,
  "read": read,
  "write": write
}

var mqtt = new Mqtt(params);
mqtt.connect();

const server = dgram.createSocket('udp4');
server.bind(serverPort);

sendWhois();

server.on('listening', function() {
  var address = server.address();
  Utils.log("Start a UDP server, listening on port "+address.port);
  server.addMembership(multicastAddress);
})

server.on('message', function(buffer, rinfo) {
  var msg;
  
  try {
    msg = JSON.parse(buffer);
    //Utils.log("msg "+JSON.stringify(msg));
  } catch (e) {
    Utils.log("invalid message: "+buffer);
    return;
  }

  switch (msg.cmd) {
    case "iam":
      //Utils.log("msg "+JSON.stringify(msg));
      var sid = msg.sid;
      sidAddress[sid] = msg.ip;
      sidPort[sid] = msg.port;
      get_id_list(sid);
      break;
    case "get_id_list_ack":
      var data = JSON.parse(msg.data);
      var sid;
      for(var index in data) {
        sid = data[index];
        sidAddress[sid] = rinfo.address;
        sidPort[sid] = rinfo.port;
      }
      //Utils.log("debug "+ JSON.stringify(sidAddress)+ " "+JSON.stringify(sidPort))
      Utils.log("Gateway sid "+msg.sid+" Address "+sidAddress[sid]+", Port "+sidPort[sid]);
      payload = {"cmd":msg.cmd, "sid":msg.sid, "data":JSON.parse(msg.data)};
      Utils.log(JSON.stringify(payload));
      mqtt.publish(payload);
      break;
    case "read_ack":
    case "report":
      var data = JSON.parse(msg.data);
      switch (msg.model) {
        case "sensor_ht":
          var temperature = data.temperature ? Math.round(data.temperature / 10.0) / 10 : null;
          var humidity = data.humidity ? Math.round(data.humidity / 10.0) / 10: null;
          payload = {"cmd":msg.cmd ,"model":msg.model, "sid":msg.sid, "short_id":msg.short_id, "data": {"voltage": data.voltage, "temperature":temperature, "humidity":humidity}};
          Utils.log(JSON.stringify(payload));
          mqtt.publish(payload);      
          break;
        case "gateway":
        case "switch":
        case "sensor_motion.aq2":
          payload = {"cmd":msg.cmd ,"model":msg.model, "sid":msg.sid, "short_id":msg.short_id, "data": data};
          Utils.log(JSON.stringify(payload));
          mqtt.publish(payload); 
          break;       
        default:
          payload = {"cmd":msg.cmd ,"model":msg.model, "sid":msg.sid, "short_id":msg.short_id, "data": data};
          Utils.log("unknown model: "+JSON.stringify(payload));
          mqtt.publish(payload); 
      }
      break;
    case "write_ack":
      var data = JSON.parse(msg.data);
      payload = {"cmd":msg.cmd ,"model":msg.model, "sid":msg.sid, "short_id":msg.short_id, "data": data};
      Utils.log(JSON.stringify(payload));
      mqtt.publish(payload); 
      break;
    case "heartbeat":
      if (msg.model === "gateway") {
        token[msg.sid] = msg.token;
      }
      var data = JSON.parse(msg.data);
      payload = {"cmd":msg.cmd ,"model":msg.model, "sid":msg.sid, "short_id":msg.short_id, "token":msg.token, "data": data};
      //Utils.log(JSON.stringify(payload));
      mqtt.publish(payload);
      break;
    default:
      Utils.log("unknown msg = "+JSON.stringify(msg)+" from client "+rinfo.address+":"+rinfo.port);
  }
});

// https://nodejs.org/api/errors.html
server.on('error', function(err) {
  Utils.log("error, msg - "+err.message+", stack - "+err.stack);
  server.close();
});

function sendWhois() {
  var msg = '{"cmd": "whois"}';
  Utils.log("Send "+msg+" to a multicast address "+multicastAddress+":"+multicastPort);
  server.send(msg, 0, msg.length, multicastPort, multicastAddress);
}

function get_id_list(sid) {
  var msg = '{"cmd":"get_id_list"}';
  Utils.log("Send "+msg+" to "+sidAddress[sid]+":"+sidPort[sid]);
  server.send(msg, 0, msg.length, sidPort[sid], sidAddress[sid]);
}

function read(sid) {
  if (sid in sidPort) {
    var msg = '{"cmd":"read", "sid":"' + sid + '"}';
    //Utils.log("Send "+msg+" to "+sidAddress[sid]+":"+sidPort[sid]);
    server.send(msg, 0, msg.length, sidPort[sid], sidAddress[sid]);
  } else {
    payload = {"cmd":"xm","msg":"sid >"+sid+"< unknown."};
    Utils.log(JSON.stringify(payload));
    mqtt.publish(payload);
  }
}

function write(mqtt_payload) {

  payload = mqtt_payload;
  var sid = payload.sid;

  if (sid in sidPort) {
    switch (payload.model) {
      case "gateway":
        if (token[sid]) {
          //Utils.log("token "+token[sid]);
          var cipher = crypto.createCipheriv('aes-128-cbc', password, IV);
          var key = cipher.update(token[sid], 'ascii', 'hex');
          payload.data.key = key;
          payload.data.rgb = rgb_buf(payload.data.rgb);
        }
        break;
      default:
    }
    var msg = JSON.stringify(payload);
    Utils.log("Send "+msg+" to "+sidAddress[sid]+":"+sidPort[sid]);
    server.send(msg, 0, msg.length, sidPort[sid], sidAddress[sid]);
  } else {
    payload = {"cmd":"xm","msg":"sid >"+sid+"< unknown."};
    Utils.log(JSON.stringify(payload));
    mqtt.publish(payload);
  }
}

function rgb_buf(rgb) {
  //Utils.log("rgb "+rgb);
  var bri = parseInt("0x"+rgb.substr(0,2));
  var r = parseInt("0x"+rgb.substr(2,2));
  var g = parseInt("0x"+rgb.substr(4,2));
  var b = parseInt("0x"+rgb.substr(6,2));
  //Utils.log("bri"+bri+" r"+r+" g"+g+" b"+b);
                  
  var buf = Buffer.alloc(4);
  buf.writeUInt8(bri, 0);
  buf.writeUInt8(r, 1);
  buf.writeUInt8(g, 2);
  buf.writeUInt8(b, 3);

  return buf.readUInt32BE(0);
}
