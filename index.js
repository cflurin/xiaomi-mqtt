'use strict';

var dgram = require('dgram');
var Mqtt = require('./lib/mqtt.js').Mqtt;
var Utils = require('./lib/utils.js').Utils;

const package_name = "xiaomi-mqtt";

var sidAddress = {}
var sidPort = {};
//var address, port;
var payload = {};
      
var config = Utils.loadConfig(__dirname, "config.json");

var serverPort = config.xiaomi.serverPort || 9898;
var multicastAddress = config.xiaomi.multicastAddress || '224.0.0.50';
var multicastPort =  config.xiaomi.multicastPort || 4321;

var package_version = Utils.read_packageVersion();

Utils.log("Start "+package_name+", version "+package_version);
//Utils.log("config " + JSON.stringify(config, null, 2));

var params = {
  "config": config,
  "package_name": package_name,
  "get_id_list": get_id_list,
  "read": read
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
  } catch (e) {
    Utils.log("invalid message: "+buffer);
    return;
  }

  switch (msg.cmd) {
    case "iam":
      //Utils.log("msg "+JSON.stringify(json));
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
    case "heartbeat":
      if (msg.model !== 'gateway') {
        payload = {"cmd":msg.cmd ,"model":msg.model, "sid":msg.sid, "short_id":msg.short_id, "data": data};
        Utils.log(JSON.stringify(payload));
      }
      break;
    default:
      Utils.log("unknown cmd: "+msg.length+" from client "+rinfo.address+":"+rinfo.port);
      Utils.log(msg);
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
    payload = {"cmd":"status","msg":"sid >"+sid+"< unknown."};
    Utils.log(JSON.stringify(payload));
    mqtt.publish(payload);
  }
}


