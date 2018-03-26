# xiaomi-mqtt

[![NPM version][npm-image]][npm-url]

[npm-image]: http://img.shields.io/npm/v/xiaomi-mqtt.svg
[npm-url]: https://npmjs.org/package/xiaomi-mqtt

A Bridge between the Xiaomi Mi Smart Home Gateway and the Mqtt broker.

Xiaomi-mqtt exchanges data between the xiaomi gateway and the mqtt-broker at a low-level, principally based on the device `sid` (Security Identifier?). The automation and dashboard tasks are implemented at a higher level. [Node-RED](http://nodered.org/) is the perfect tool to use for this purpose.

Defined Devices (models) so far:
* gateway
* sensor_ht
* sensor_motion.aq2
* magnet
* switch

**Note:** not defined devices (models) will also send a payload, the log will report a warning `to define`.

### Installation

```sh
sudo npm install -g --unsafe-perm xiaomi-mqtt
```

### Installation from GitHub

Clone the source repository directly from GitHub to a local folder:

```sh
git clone https://github.com/cflurin/xiaomi-mqtt.git
```

Local Installation:

```sh
cd xiaomi-mqtt
npm install
```

### Configuration

Copy the `config.json` file to the `.xiaomi-mqtt` folder inside of your home folder.

```sh
mkdir ~/.xiaomi-mqtt
cp config.json ~/.xiaomi-mqtt/
```
On macOS and Linux, the full path for your config.json would be `~/.xiaomi-mqtt/config.json`.

Edit `~/xiaomi-mqtt/config.json` to fit your requirements:

```sh
{
  "xiaomi": {
    "serverPort": 9898,
    "multicastAddress": "224.0.0.50",
    "multicastPort": 4321,
    "password": "FFF..."
  },
  "mqtt": {
    "url": "mqtt://127.0.0.1",
    "port": 1883,
    "username": "foo",
    "password": "bar"
  },
  "loglevel": "info"
}
```

```sh
"loglevel": <"debug"> | <"info"> | <"warn"> | <"error">
```

Replace `127.0.0.1` with the address of your mqtt broker.


### Usage (global installation)

Use `xiaomi-mqtt` or `xm` to run xiaomi-mqtt.<br>
Use `ctrl c` to stop xiaomi-mqtt.

### Usage (local installation)

In the `xiaomi-mqtt` folder.

Use `npm start` to run xiaomi-mqtt.<br>
Use `ctrl c` to stop xiaomi-mqtt.

#
# mqtt API

The data (payload) is sent/received in a JSON format using following topics:

* xiaomi/from
* xiaomi/to/read
* xiaomi/to/write
* xiaomi/to/get_id_list

## Howto examples


At start and stop xiaomi-mqtt sends following messages.

### start

```sh
topic: xiaomi/from
payload: {"cmd":"xm","msg":"xiaomi-mqtt started."}
```
and

```sh
topic: xiaomi/from
payload: 
{
  "cmd":"get_id_list_ack",
  "sid":"fff...",
  "data":["158d00017118ac","158d0001a2eb66","158d0001f35b90","158d0001e52516"]
}
```

### stop

```sh
topic: xiaomi/from
payload: {"cmd":"xm","msg":"xiaomi-mqtt stopped."}
```

### heartbeat

**gateway**

```sh
topic: xiaomi/from
payload:
{
  "cmd": "heartbeat",
  "model": "gateway",
  "sid": "fff...",
  "short_id": "0",
  "token": "v4GeGCO9TBpTUlVy",
  "data": {
    "ip": "127.0.0.1"
  }
}
```

### reporting

Xiaomi-mqtt sends periodically or on events device reports.

**gateway**

```sh
topic: xiaomi/from
payload:

{
  "cmd": "report",
  "model": "gateway",
  "sid": "fff...",
  "short_id": 0,
  "data": {
    "rgb": 0,
    "illumination": 1292
  }
}
```

**sensor_ht**

```sh
topic: xiaomi/from
payload:
{
  "cmd":"report",
  "model":"sensor_ht",
  "sid":"158d0001a2eb66",
  "short_id":30124,
  "data":{"voltage":3005,"temperature":16.7,"humidity":null}
}
```

```sh
"data": {"voltage":3005,"temperature":16.7,"humidity":null}
or
"data": {"voltage":3005,"temperature":null,"humidity":51.7} 
```

**magnet**

```sh
topic: xiaomi/from
payload:
{
  "cmd": "report",
  "model": "magnet",
  "sid": "158d0001f3651f",
  "short_id": 57029,
  "data": {
    "status": "close"
  }
}
```

```sh
"status": "close" or "open"
```

**switch**

```sh
topic: xiaomi/from
payload:
{
  "cmd":"report",
  "model":"switch",
  "sid":"158d0001f35b90",
  "short_id":46517,
  "data":{"status":"click"}
}
```

```sh
"status": "click" or "double_click" or "long_click_press" or "long_click_release"
```

### read

**gateway**

```sh
topic: xiaomi/to/read
payload: {"sid":"fff..."}
```

response

```sh
topic: xiaomi/from
payload:
{
  "cmd":"read_ack",
  "model":"gateway",
  "sid":"fff...",
  "short_id":0,
  "data":{"rgb":0,"illumination":1292,"proto_version":"1.0.9"}
}
```

**sensor_ht**

```sh
topic: xiaomi/to/read
payload: {"sid":"158d00017118ac"}
```

response

```sh
topic: xiaomi/from
payload:
{
  "cmd":"read_ack",
  "model":"sensor_ht",
  "sid":"158d00017118ac",
  "short_id":48290,
  "data":{"voltage":2985,"temperature":19,"humidity":46.3}
}
```

**switch**

```sh
topic: xiaomi/to/read
payload: {"sid":"158d0001f35b90"}
```

response

```sh
topic: xiaomi/from
payload:
{
  "cmd":"read_ack",
  "model":"switch",
  "sid":"158d0001f35b90",
  "short_id":46517,
  "data":{"voltage":3112}
}
```
### write

```sh
topic: xiaomi/to/write
payload: 
{
  "cmd": "write",
  "model": "gateway",
  "sid": "fff...",
  "data": {
      "rgb": "1000FF00"
  }
}
```
**Note:** rgb = [brightness] [red] [green] [blue] - each hex 00 to FF

response

```sh
topic: xiaomi/from
payload:
{
  "cmd":"write_ack",
  "model":"gateway",
  "sid":"fff...",
  "short_id":0,
  "data":{"rgb":268500736,"illumination":1292,"proto_version":"1.0.9"}
}
```

### get_id_list:

```sh
topic: xiaomi/to/get_id_list
payload: {"sid":"fff..."}
```
**Note:** sid = gateway sid.

response

```sh
topic: xiaomi/from
payload:
{
  "cmd":"get_id_list_ack",
  "sid":"fff...",
  "data":["158d00017118ac","158d0001a2eb66","158d0001f35b90","158d0001e52516"]
}
```

#
# Node-RED examples

### basic

![node-red-ex1](https://user-images.githubusercontent.com/5056710/37292838-1612a042-2612-11e8-8473-939496dc0022.jpeg)

### write gateway

![node-red-ex2](https://user-images.githubusercontent.com/5056710/37520088-f6fe26a6-291b-11e8-9040-c32bf7c38c94.jpeg)

Flow:

```sh
[{"id":"9339669d.8e38b8","type":"mqtt out","z":"d0877ed4.9e0cc","name":"","topic":"xiaomi/to/write","qos":"","retain":"","broker":"325f5be5.555734","x":560,"y":480,"wires":[]},{"id":"c508a302.61467","type":"ui_colour_picker","z":"d0877ed4.9e0cc","name":"","label":"gateway color","group":"4d5fcade.c527d4","format":"hex","outformat":"string","showSwatch":true,"showPicker":false,"showValue":true,"showAlpha":false,"showLightness":true,"dynOutput":"false","order":0,"width":0,"height":0,"passthru":true,"topic":"","x":220,"y":480,"wires":[["dcd9ac95.fd93"]]},{"id":"dcd9ac95.fd93","type":"template","z":"d0877ed4.9e0cc","name":"map","field":"payload","fieldType":"msg","format":"handlebars","syntax":"mustache","template":"{\n    \"cmd\": \"write\",\n    \"model\": \"gateway\",\n    \"sid\": \"fff...\",\n    \"data\": {\n        \"rgb\": \"10{{payload}}\"\n    }\n}","output":"json","x":390,"y":480,"wires":[["9339669d.8e38b8"]]},{"id":"325f5be5.555734","type":"mqtt-broker","z":"","broker":"127.0.0.1","port":"1883","clientid":"","usetls":false,"compatmode":false,"keepalive":"60","cleansession":true,"willTopic":"","willQos":"0","willPayload":"","birthTopic":"","birthQos":"0","birthPayload":""},{"id":"4d5fcade.c527d4","type":"ui_group","z":"","name":"Xiaomi","tab":"f3d46e49.beaec","order":1,"disp":true,"width":"6"},{"id":"f3d46e49.beaec","type":"ui_tab","z":"","name":"Main","icon":"dashboard","order":1}]
```

![node-red-ex3](https://user-images.githubusercontent.com/5056710/37528165-327882b8-2934-11e8-98b1-cdcbf039f724.jpeg)

Flow:

```sh
[{"id":"aacbdba0.0519f8","type":"inject","z":"d0877ed4.9e0cc","name":"doorbell","topic":"","payload":"{\"cmd\":\"write\",\"model\":\"gateway\",\"sid\":\"fff...\",\"short_id\":0,\"key\":\"8\",\"data\":{\"mid\":10}}","payloadType":"json","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":120,"y":580,"wires":[["83a2b4f.eb0d748"]]},{"id":"8f56c43e.16c048","type":"inject","z":"d0877ed4.9e0cc","name":"police","topic":"","payload":"{\"cmd\":\"write\",\"model\":\"gateway\",\"sid\":\"fff...\",\"short_id\":0,\"key\":\"8\",\"data\":{\"mid\":1}}","payloadType":"json","repeat":"","crontab":"","once":false,"onceDelay":0.1,"x":110,"y":620,"wires":[["83a2b4f.eb0d748"]]},{"id":"83a2b4f.eb0d748","type":"mqtt out","z":"d0877ed4.9e0cc","name":"","topic":"xiaomi/to/write","qos":"","retain":"","broker":"325f5be5.555734","x":340,"y":580,"wires":[]},{"id":"325f5be5.555734","type":"mqtt-broker","z":"","broker":"192.168.0.35","port":"1883","clientid":"","usetls":false,"compatmode":false,"keepalive":"60","cleansession":true,"willTopic":"","willQos":"0","willPayload":"","birthTopic":"","birthQos":"0","birthPayload":""}]
```
