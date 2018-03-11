# xiaomi-mqtt

A Bridge between the Xiaomi Mi Smart Home Gateway and the Mqtt broker.

# Work in progress ...

### Installation

Install xiaomi-mqt in your working folder:
```sh
sudo npm install xiaomi-mqtt
```

### Configuration

config.json:

```sh
{
  "xiaomi": {
    "serverPort": 9898,
    "multicastAddress": "224.0.0.50",
    "multicastPort": 4321,
  },
  "mqtt": {
    "url": "mqtt://127.0.0.1",
    "port": "1883",
    "username": "foo",
    "password": "bar"
  }
}
```

Replace `127.0.0.1` with the ip-address of your mqtt broker.

#
# mqtt API

The data (payload) is sent/received in a JSON format using following topics:

todo ...
