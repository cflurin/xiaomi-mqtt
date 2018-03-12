# xiaomi-mqtt

A Bridge between the Xiaomi Mi Smart Home Gateway and the Mqtt broker.

Xiaomi-mqtt exchanges data between the xiaomi gateway and the mqtt-broker at a low-level principally based on the device `sid` (Security Identifier?). The automation and dashboard tasks are implemented at a higher level. [Node-RED](http://nodered.org/) is the perfect tool to use with xiaomi-mqtt.

# Work in progress ...

Devices (models) implemented so far:
* gateway
* sensor_ht
* sensor_motion.aq2
* switch

### Installation

Install xiaomi-mqtt in your working folder (e.g. `xiaomi`).

**Note:** Installation from `npm` will be provided as soon as the the first release version is published.

```sh
npm install cflurin/xiaomi-mqtt
```

### Configuration

Edit the `config.json` in the `xiaomi-mqtt` folder to fit your requirements:

```sh
cd node_modules/xiaomi-mqtt
```

```sh
{
  "xiaomi": {
    "serverPort": 9898,
    "multicastAddress": "224.0.0.50",
    "multicastPort": 4321,
  },
  "mqtt": {
    "url": "mqtt://127.0.0.1",
    "port": 1883,
    "username": "foo",
    "password": "bar"
  }
}
```

Replace `127.0.0.1` with the ip-address of your mqtt broker.

### Usage

Go to the `xiaomi-mqtt` folder.

Use `node index.js` to run xiaomi-mqtt.

Use `ctrl c` to stop xiaomi-mqtt.

#
# mqtt API

The data (payload) is sent/received in a JSON format using following topics:

* xiaomi/from
* xiaomi/to/get_id_list
* xiaomi/to/read

## Howto examples

At sart or stop xiaomi-mqtt sends status messages.

### start

```sh
topic: xiaomi/from
payload: {"cmd":"status","msg":"xiaomi-mqtt started."}
```
and

```sh
topic: xiaomi/from
payload: {
  "cmd":"get_id_list_ack",
  "sid":"286c07f096fb",
  "data":["158d00017118ac","158d0001a2eb66","158d0001f35b90","158d0001e52516"]
}
```

### stop

```sh
topic: xiaomi/from
payload: {"cmd":"status","msg":"xiaomi-mqtt stopped."}
```

### reporting

Xiaomi-mqtt sends periodically device reports.

```sh
topic: xiaomi/from
payload:
{
"cmd":"report",
  "model":"sensor_ht",
  "sid":"158d0001a2eb66",
  "short_id":30124,
  "data":{"temperature":null,"humidity":48.9}
}
```

### read devices

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
  "data":{"temperature":19,"humidity":46.3}
}
```

### get_id_list:

```sh
topic: xiaomi/to/get_id_list
payload: {"sid":"286c07f096fb"}
```
**Note:** sid = gateway sid.

response

```sh
topic: xiaomi/from
payload:
{
  "cmd":"get_id_list_ack",
  "sid":"286c07f096fb",
  "data":["158d00017118ac","158d0001a2eb66","158d0001f35b90","158d0001e52516"]
}
```

#
# Node-RED example

![node-red-ex1](https://user-images.githubusercontent.com/5056710/37292838-1612a042-2612-11e8-8473-939496dc0022.jpeg)
