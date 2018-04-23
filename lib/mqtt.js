'use strict';

var mqtt = require('mqtt');
var Utils = require('./utils.js').Utils;

var topic_from, topic_to;

var config, package_name;
var get_id_list, read, write, log;

var client;

module.exports = {
  Mqtt: Mqtt
}

function Mqtt(params) {

  config = params.config;
  package_name = params.package_name;
  get_id_list = params.get_id_list;
  read = params.read;
  write = params.write;
  log = params.log;

  log.trace("config " + JSON.stringify(config, null, 2));
}

Mqtt.prototype.connect = function() {

  var options = {}
  var url = config.mqtt.url;
  
  var topic_prefix = config.mqtt.topic_prefix || "xiaomi";
  topic_from = topic_prefix + '/from';
  topic_to = topic_prefix + '/to';
  
  options.username = config.mqtt.username || null;
  options.password = config.mqtt.password || null;
  options.port = config.mqtt.port || 1883;

  options.clientId = package_name+"_"+Math.random().toString(16).substr(2, 8);
  log.info("clientId = " + options.clientId);
  
  client = mqtt.connect(url, options);
  
  var signals = { 'SIGINT': 2, 'SIGTERM': 15 };
  Object.keys(signals).forEach(function (signal) {
    process.on(signal, function () {
      log.info("Got " + signal + " closing mqtt connection.");
      this.end();
    }.bind(this));
  }.bind(this));

  var timeout = setTimeout(function() {
    if (!client.connected) {
      log.error("Mqtt connect error! url = "+url+":"+options.port);
    }
  }, 5000);
  
  client.on('connect', function () {
      
    log.info("Mqtt connected, url = "+url+":"+options.port);
    
    client.subscribe(topic_to+"/#");
    log.info("Mqtt subscribe " + topic_to+"/#");
    
    var payload = {"cmd":"xm" ,"msg":"xiaomi-mqtt started."};
    client.publish(topic_from, JSON.stringify(payload));
  });
    
  client.on('message', function (topic, buffer) {

    var payload = buffer.toString();
    var msg;
    
    try {
      payload = JSON.parse(payload);
      log.trace("Mqtt to " + payload);
    } catch(e) {
      msg = "invalid JSON format >"+payload+"<";
      payload = {"cmd":"xm" ,"msg":msg};
      log.warn(msg);
      client.publish(topic_from, JSON.stringify(payload));
      return;
    }
    
    switch(topic) {
      case topic_to+"/read":
        read(payload.sid);     
        break;      
      case topic_to+"/get_id_list":
        get_id_list(payload.sid);
        break;
      case topic_to+"/write":
        write(payload);
        break;
      default:
        log.warn("Mqtt topic unknown.");
    }
    /*
    } catch(e) {
      msg = "invalid JSON format >"+payload+"<";
      payload = {"cmd":"xm" ,"msg":msg};
      log.warn(msg);
      client.publish(topic_from, JSON.stringify(payload));
    }
    */
  });

  client.on('close', function() {
    log.info(package_name+"-client closed, shutting down.");
    process.exit();
  });

}

Mqtt.prototype.end = function() {
  var payload = {"cmd":"xm" ,"msg":"xiaomi-mqtt stopped."};
  client.publish(topic_from, JSON.stringify(payload));
  client.end();
}

Mqtt.prototype.publish = function(payload) {

  client.publish(topic_from, JSON.stringify(payload));
  log.trace("Mqtt from " + JSON.stringify(payload));
}
