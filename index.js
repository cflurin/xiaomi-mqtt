'use strict';

var dgram = require('dgram');
var Mqtt = require('./lib/mqtt.js').Mqtt;
var Utils = require('./lib/utils.js').Utils;

const node_name = "xiaomi-mqtt";
const topic_from = "xiaomi/from/";

var sidToAddress, sidToPort;
var address, port;
var payload = {};
      
var config = Utils.loadConfig(__dirname, "config.json");

var serverPort = config.xiaomi.serverPort || 9898;
var multicastAddress = config.xiaomi.multicastAddress || '224.0.0.50';
var multicastPort =  config.xiaomi.multicastPort || 4321;

var package_version = Utils.read_packageVersion();

Utils.log("Start xiaomi-mqtt, version " + package_version);
//Utils.log("config " + JSON.stringify(config, null, 2));

var params = {
  "config": config,
  "node_name": node_name,
  "get_id_list": get_id_list,
  "read": read
}

var mqtt = new Mqtt(params);
mqtt.connect();

const serverSocket = dgram.createSocket('udp4');
serverSocket.bind(serverPort);
sendWhois();

serverSocket.on('listening', function() {
  Utils.log("Start a UDP server, listening on port "+serverPort);
  serverSocket.addMembership(multicastAddress);
})

serverSocket.on('message', function(msg, rinfo) {
  var json;
  
  try {
    json = JSON.parse(msg);
  } catch (e) {
    Utils.log("invalid message: "+msg);
    return;
  }

  switch (json.cmd) {
    case "iam":
      address = json.ip;
      port = json.port;
      get_id_list();
      break;
    case "get_id_list_ack":
      sidToAddress = rinfo.address;
      sidToPort = rinfo.port;
      payload = {"cmd":json.cmd, "sid":json.sid, "data":JSON.parse(json.data)};
      Utils.log(JSON.stringify(payload, null, 2));
      mqtt.publish(topic_from, payload);
      break;
    case "read_ack":
    case "report":
      var data = JSON.parse(json.data);
      switch (json.model) {
        case "sensor_ht":
          var temperature = data.temperature ? Math.round(data.temperature / 10.0) / 10 : null;
          var humidity = data.humidity ? Math.round(data.humidity / 10.0) / 10: null;
          payload = {"cmd":json.cmd ,"model":json.model, "sid":json.sid, "short_id":json.short_id, "data": {"temperature":temperature, "humidity":humidity}};
          Utils.log(JSON.stringify(payload));
          mqtt.publish(topic_from, payload);      
          break;
        case "switch":
        case "sensor_motion.aq2":
          payload = {"cmd":json.cmd ,"model":json.model, "sid":json.sid, "short_id":json.short_id, "data": data};
          Utils.log(JSON.stringify(payload));
          mqtt.publish(topic_from, payload); 
          break;
        case "gateway":
          payload = {"cmd":json.cmd ,"model":json.model, "sid":json.sid, "short_id":json.short_id, "data": data};
          Utils.log(JSON.stringify(payload));
          mqtt.publish(topic_from, payload);
          break;       
        default:
          payload = {"cmd":json.cmd ,"model":json.model, "sid":json.sid, "short_id":json.short_id, "data": data};
          Utils.log("unkown model: "+JSON.stringify(payload));
      }
      break;
    case "heartbeat":
      if (json.model !== 'gateway') {
        payload = {"cmd":json.cmd ,"model":json.model, "sid":json.sid, "short_id":json.short_id, "data": data};
        Utils.log(JSON.stringify(payload));
      }
      break;
    default:
      Utils.log("unknow cmd:  "+msg.length+" from client "+rinfo.address+":"+rinfo.port);
      Utils.log(msg);
  }
});

// https://nodejs.org/api/errors.html
serverSocket.on('error', function(err) {
  Utils.log("error, msg - "+err.message+", stack - "+err.stack);
});

function sendWhois() {
  var msg = '{"cmd": "whois"}';
  Utils.log("Send "+msg+" to a multicast address "+multicastAddress+":"+multicastPort);
  serverSocket.send(msg, 0, msg.length, multicastPort, multicastAddress);
}

function get_id_list() {
  var msg = '{"cmd":"get_id_list"}';
  Utils.log("Send "+msg+" to "+address+":"+port);
  serverSocket.send(msg, 0, msg.length, port, address);
}

function read(sid) {
  var msg = '{"cmd":"read", "sid":"' + sid + '"}';
  //Utils.log("Send "+msg+" to "+sidToAddress+":"+sidToPort);
  serverSocket.send(msg, 0, msg.length, sidToPort, sidToAddress);
}


