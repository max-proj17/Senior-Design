import busio
import board
import displayio
from adafruit_st7789 import ST7789

class PimoroniPicoDisplay:
    """Class representing the Pimoroni Pico Display Pack."""

    def __init__(self, spi=None, cs=board.GP17, dc=board.GP16, reset=None):
        displayio.release_displays()
        
        if not spi:
            self._spi = busio.SPI(clock=board.GP18, MOSI=board.GP19)

        self._display_bus = displayio.FourWire(
            self._spi, command=dc, chip_select=cs, reset=reset
        )

        self.display = ST7789(
            self._display_bus,
            rotation=90,
            width=240,
            height=135,
            rowstart=40,  # Adjust this value if needed
            colstart=53    # Start with 0 and adjust as needed
        )


    def show(self, group):
        """Show the specified displayio group on the display."""
        self.display.show(group)

    def refresh(self):
        """Refresh the display to show any changes."""
        self.display.refresh()
# Usage:
# display = PimoroniPicoDisplay()
