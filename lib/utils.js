'use strict';

var path = require('path');
var fs = require('fs');

var package_json = "../package.json";
var package_version, github_version, npm_version;

module.exports = {
  Utils: Utils
}

function Utils() {
}

Utils.loadConfig = function(config_path, config_name) {
  
  var config_path = path.join(config_path, config_name);
  
  // Complain and exit if config_name doesn't exist yet
  if (!fs.existsSync(config_path)) {
      console.log("Couldn't find a %s file at %s.", config_name, config_path);
      process.exit(1);
  }
  
  // Load up the configuration file
  var config;
  try {
    //console.log("Utils.loadConfig");
    config = JSON.parse(fs.readFileSync(config_path));
  }
  catch (err) {
    console.log("There was a problem reading your %s file.", config_name);
    console.log("Please try pasting your %s file here to validate it: http://jsonlint.com", config_name);
    console.log("");
    throw err;
  }
  return config;
}

Utils.log = function(msg) {
  var date = new Date();
  var msg = "[" + date.toLocaleString() + "]" + " " + msg;
  
  console.log(msg);
}

Utils.getPluginVersion = function() {
  return plugin_version;
}

Utils.get_npmVersion = function(pkg) {
  // Update version for the next call
  this.read_npmVersion(pkg, function(version) {
    npm_version = version;
  });
  return npm_version;
}

Utils.read_packageVersion = function() {
  
  var packageJSONPath = path.join(__dirname, package_json);
  var packageJSON = JSON.parse(fs.readFileSync(packageJSONPath));
  package_version = packageJSON.version;
  return package_version;
}

Utils.read_npmVersion = function(pck, callback) {
  var exec = require('child_process').exec;
  var cmd = 'npm view '+pck+' version';
  exec(cmd, function(error, stdout, stderr) {
    npm_version = stdout.trim();
    //npm_version = stdout.replace(/(\r\n|\n|\r)/gm,"");
    callback(npm_version);
    //console.log("npm_version %s", npm_version);
 });
}
