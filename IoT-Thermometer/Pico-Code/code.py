import wifi
import socketpool
import adafruit_minimqtt.adafruit_minimqtt as MQTT
from adafruit_st7789 import ST7789
import busio
import board
import displayio
import time
import digitalio
from adafruit_onewire.bus import OneWireBus
import adafruit_ds18x20
from adafruit_bitmap_font import bitmap_font

from adafruit_display_text import label
from pimoroni_pico_display import PimoroniPicoDisplay


    
# Initialize temperature sensor
ow_bus = OneWireBus(board.GP26)
ds18b20 = adafruit_ds18x20.DS18X20(ow_bus, ow_bus.scan()[0])

# Initialize the display using the library we created
display = PimoroniPicoDisplay()

# Create a display context
splash = displayio.Group()

# Create a background color fill
color_bitmap = displayio.Bitmap(240, 135, 1)
color_palette = displayio.Palette(1)
color_palette[0] = 0xFFFFFF  # White
bg_sprite = displayio.TileGrid(color_bitmap, pixel_shader=color_palette, x=0, y=0)
splash.append(bg_sprite)

# Load the font
font = bitmap_font.load_font("/fonts/LeagueSpartan-Bold-16.bdf")

# Create a text label
text_area = label.Label(font, text="Initializing...", color=0x000000, x=50, y=60)
text_area.scale = 2
# Add the text label to the display context
splash.append(text_area)

# Show the display context
display.display.show(splash)

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
    # Update the display
    text_area.text = f"{temp:.2f}°C"
    
    time.sleep(1)
