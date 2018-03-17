#!/usr/bin/env node
'use strict';

var dgram = require('dgram');
var Mqtt = require('./lib/mqtt.js').Mqtt;
var Utils = require('./lib/utils.js').Utils;
const chalk = require('chalk');
var log = require('loglevel');
const prefix = require('loglevel-plugin-prefix');

const crypto = require('crypto');

const package_name = "xiaomi-mqtt";

var sidAddress = {};
var sidPort = {};
var token = {};
var payload = {};

var config = Utils.loadConfig("config.json");

var serverPort = config.xiaomi.serverPort || 9898;
var multicastAddress = config.xiaomi.multicastAddress || '224.0.0.50';
var multicastPort =  config.xiaomi.multicastPort || 4321;
var password = config.xiaomi.password || "";
var level = config.loglevel || "info";

const IV = Buffer.from([0x17, 0x99, 0x6d, 0x09, 0x3d, 0x28, 0xdd, 0xb3, 0xba, 0x69, 0x5a, 0x2e, 0x6f, 0x58, 0x56, 0x2e]);

setlogPrefix();
log.setLevel(level);

var package_version = Utils.read_packageVersion();

log.info("Start "+package_name+", version "+package_version);
log.trace("config " + JSON.stringify(config, null, 2));

var params = {
  "config": config,
  "package_name": package_name,
  "get_id_list": get_id_list,
  "read": read,
  "write": write,
  "log": log
}

var mqtt = new Mqtt(params);
mqtt.connect();

const server = dgram.createSocket('udp4');
server.bind(serverPort);

sendWhois();

server.on('listening', function() {
  var address = server.address();
  log.info("Start a UDP server, listening on port "+address.port);
  server.addMembership(multicastAddress);
})

server.on('message', function(buffer, rinfo) {
  var msg;
  
  try {
    msg = JSON.parse(buffer);
    log.trace("msg "+JSON.stringify(msg));
  } catch (e) {
    log.error("invalid message: "+buffer);
    return;
  }

  switch (msg.cmd) {
    case "iam":
      log.trace("msg "+JSON.stringify(msg));
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
      log.trace(JSON.stringify(sidAddress)+ " "+JSON.stringify(sidPort))
      log.info("Gateway sid "+msg.sid+" Address "+sidAddress[sid]+", Port "+sidPort[sid]);
      payload = {"cmd":msg.cmd, "sid":msg.sid, "data":JSON.parse(msg.data)};
      log.info(JSON.stringify(payload));
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
          log.debug(JSON.stringify(payload));  
          break;
        case "gateway":
        case "switch":
        case "sensor_motion.aq2":
          payload = {"cmd":msg.cmd ,"model":msg.model, "sid":msg.sid, "short_id":msg.short_id, "data": data};
          log.debug(JSON.stringify(payload));
          break;       
        default:
          payload = {"cmd":msg.cmd ,"model":msg.model, "sid":msg.sid, "short_id":msg.short_id, "data": data};
          log.warn("unknown model "+JSON.stringify(payload));
      }
      mqtt.publish(payload);
      break;
    case "write_ack":
      var data = JSON.parse(msg.data);
      payload = {"cmd":msg.cmd ,"model":msg.model, "sid":msg.sid, "short_id":msg.short_id, "data": data};
      log.debug(JSON.stringify(payload));
      mqtt.publish(payload); 
      break;
    case "heartbeat":
      if (msg.model === "gateway") {
        token[msg.sid] = msg.token;
      }
      var data = JSON.parse(msg.data);
      payload = {"cmd":msg.cmd ,"model":msg.model, "sid":msg.sid, "short_id":msg.short_id, "token":msg.token, "data": data};
      mqtt.publish(payload);
      break;
    default:
      log.warn("unknown msg "+JSON.stringify(msg)+" from client "+rinfo.address+":"+rinfo.port);
  }
});

// https://nodejs.org/api/errors.html
server.on('error', function(err) {
  log.error("msg - "+err.message+", stack - "+err.stack);
  server.close();
});

function sendWhois() {
  var msg = '{"cmd": "whois"}';
  log.trace("Send "+msg+" to a multicast address "+multicastAddress+":"+multicastPort);
  server.send(msg, 0, msg.length, multicastPort, multicastAddress);
}

function get_id_list(sid) {
  var msg = '{"cmd":"get_id_list"}';
  log.trace("Send "+msg+" to "+sidAddress[sid]+":"+sidPort[sid]);
  server.send(msg, 0, msg.length, sidPort[sid], sidAddress[sid]);
}

function read(sid) {
  if (sid in sidPort) {
    var msg = '{"cmd":"read", "sid":"' + sid + '"}';
    log.trace("Send "+msg+" to "+sidAddress[sid]+":"+sidPort[sid]);
    server.send(msg, 0, msg.length, sidPort[sid], sidAddress[sid]);
  } else {
    payload = {"cmd":"xm","msg":"sid >"+sid+"< unknown."};
    log.warn(JSON.stringify(payload));
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
          var cipher = crypto.createCipheriv('aes-128-cbc', password, IV);
          var key = cipher.update(token[sid], 'ascii', 'hex');
          payload.data.key = key;
          if ("rgb" in payload.data) {
            payload.data.rgb = rgb_buf(payload.data.rgb);
          }
        }
        break;
      case "todo":
        // todo
        break;
      default:
        // todo
    }
    var msg = JSON.stringify(payload);
    log.trace("Send "+msg+" to "+sidAddress[sid]+":"+sidPort[sid]);
    server.send(msg, 0, msg.length, sidPort[sid], sidAddress[sid]);
  } else {
    payload = {"cmd":"xm","msg":"sid >"+sid+"< unknown."};
    log.warn(JSON.stringify(payload));
    mqtt.publish(payload);
  }
}

function rgb_buf(rgb) {
  var bri = parseInt("0x"+rgb.substr(0,2));
  var r = parseInt("0x"+rgb.substr(2,2));
  var g = parseInt("0x"+rgb.substr(4,2));
  var b = parseInt("0x"+rgb.substr(6,2));
                  
  var buf = Buffer.alloc(4);
  buf.writeUInt8(bri, 0);
  buf.writeUInt8(r, 1);
  buf.writeUInt8(g, 2);
  buf.writeUInt8(b, 3);

  return buf.readUInt32BE(0);
}

function setlogPrefix() {
  const colors = {
    TRACE: chalk.magentaBright,
    DEBUG: chalk.cyanBright,
    INFO: chalk.whiteBright,
    WARN: chalk.yellowBright,
    ERROR: chalk.redBright,
  };

  prefix.reg(log);
  
  prefix.apply(log, {
    format(level, name, timestamp) {
      //return `${chalk.white(`[${timestamp}]`)} ${colors[level.toUpperCase()](level)} ${chalk.green(`${name}`)}`;
      return `${chalk.white(`[${timestamp}]`)} ${colors[level.toUpperCase()](level)}`;
    },
  });
}
