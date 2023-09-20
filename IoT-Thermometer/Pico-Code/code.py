import board
from adafruit_onewire.bus import OneWireBus
import adafruit_ds18x20
import wifi
import socketpool
import ssl
import time
import json
import adafruit_minimqtt.adafruit_minimqtt as MQTT

# Initialize temperature sensor
ow_bus = OneWireBus(board.GP16)
ds18b20 = adafruit_ds18x20.DS18X20(ow_bus, ow_bus.scan()[0])

# Initialize WiFi
wifi.radio.connect('Transponder Snail', 'max17$$$')
print('Connected to WiFi')

# Create socket pool
pool = socketpool.SocketPool(wifi.radio)

# MQTT setup
mqtt_broker = 'test.mosquitto.org'
mqtt_client = MQTT.MQTT(
    broker=mqtt_broker,
    username=None,
    password=None,
    socket_pool=pool
)

def connected(client, userdata, flags, rc):
    print('Connected to MQTT broker!')

mqtt_client.on_connect = connected
mqtt_client.connect()

while True:
    temp = ds18b20.temperature
    print(f'Temperature: {temp} C')
    mqtt_client.publish('pico/temperature', str(temp), qos=1)
    time.sleep(1)


