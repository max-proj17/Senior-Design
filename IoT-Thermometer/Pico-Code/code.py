import wifi
import socketpool
import adafruit_minimqtt.adafruit_minimqtt as MQTT
import board
import displayio
import time
from adafruit_onewire.bus import OneWireBus
import adafruit_ds18x20
from adafruit_bitmap_font import bitmap_font
from adafruit_display_text import label
from pimoroni_pico_display import PimoroniPicoDisplay

virtual_a_press = False
# Initialize temperature sensor
ow_bus = OneWireBus(board.GP26)
ds18b20 = adafruit_ds18x20.DS18X20(ow_bus, ow_bus.scan()[0])

# Initialize the display
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

# Create a text label with initial text and scale
text_area = label.Label(font, text="Initializing...", color=0x000000, x=20, y=60)
text_area.scale = 1
splash.append(text_area)

# Show the "Initializing..." message initially
display.display.show(splash)
display.display.refresh()

# Sleep for half a second
time.sleep(0.5)

# Create black screen once
black_bitmap = displayio.Bitmap(240, 135, 1)
black_palette = displayio.Palette(1)
black_palette[0] = 0x000000  # Black
black_sprite = displayio.TileGrid(black_bitmap, pixel_shader=black_palette, x=0, y=0)
black_screen = displayio.Group()
black_screen.append(black_sprite)

# Show the black screen initially after "Initializing..."
display.display.show(black_screen)
display.display.refresh()

# Initialize WiFi
wifi.radio.connect('Transponder Snail', 'max17$$$')
print('Connected to WiFi')

# Create socket pool
pool = socketpool.SocketPool(wifi.radio)

# MQTT setup
mqtt_broker = 'test.mosquitto.org'
mqtt_client = MQTT.MQTT(broker=mqtt_broker, username=None, password=None, socket_pool=pool)

def connected(client, userdata, flags, rc):
    print('Connected to MQTT broker!')
    mqtt_client.subscribe('pico/display', qos=1)  # Subscribe to the display topic

mqtt_client.on_connect = connected
mqtt_client.connect()

def message_handler(client, topic, message):
    try:
        global virtual_a_press
        print(f"Received message on topic {topic}: {message}")
        if message == 'OFF':
            print("turn off")
            virtual_a_press = False;
        elif message == 'ON':
            print("turn on")
            virtual_a_press = True;
    except Exception as e:
        print(f"Error handling message: {e}")



            
mqtt_client.on_message = message_handler  # Set the message handler

display_on = False
while True:
    try:
        # Continuously read temperature and send via MQTT
        temp = ds18b20.temperature
        print(f'Temperature: {temp} C')
        mqtt_client.publish('pico/temperature', str(temp), qos=1)
        #mqtt_client.loop()
        # Update the display text variable and turn on/off the display based on button A state
        if display.button_pressed('A') or virtual_a_press == True:
            text_area.text = f"{temp:.2f}°C"
            text_area.scale = 2
            display.display.show(splash)  # Show the splash screen with the temperature
            display.display.refresh()  # Refresh the display to show the changes
        else:
            display.display.show(black_screen)  # Show the black screen
            display.display.refresh()  # Refresh the display to show the changes
    except Exception as e:
        # Handle sensor disconnection error
        print("Unplugged Sensor")
        mqtt_client.publish('pico/temperature', 'SENSOR_UNPLUGGED', qos=1)
        text_area.text = "Unplugged"
        text_area.scale = 2
        display.display.show(splash)  # Show the splash screen with the error message
        display.display.refresh()  # Refresh the display to show the changes
    time.sleep(.06125)  # Sleep to avoid busy-waiting