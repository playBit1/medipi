import board
import adafruit_ssd1306
from PIL import Image, ImageDraw, ImageFont
import traceback
import time
import threading


class DisplayController:
    def __init__(self):
        self.display = None
        self.font = None
        self.lock = threading.Lock()  # Added thread safety

        try:
            i2c = board.I2C()
            self.display = adafruit_ssd1306.SSD1306_I2C(128, 64, i2c, addr=0x3D)

            # Load fonts
            try:
                self.font = ImageFont.truetype(
                    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 10
                )
            except:
                print("Using default font")
                self.font = ImageFont.load_default()

        except Exception as e:
            print(f"Display initialization error: {e}")
            traceback.print_exc()
            self.display = None

    def update_display(self, title, status, details="", progress=None):
        """Update the OLED display with the given information"""
        # Thread-safe update
        with self.lock:
            # print message for debug
            print(f"DISPLAY: {title} - {status} - {details} - Progress: {progress}%")

            if self.display is None:
                return

            try:
                # Clear display
                self.display.fill(0)

                # Create blank image for drawing
                image = self.create_display_image(title, status, details, progress)

                # Display image
                self.display.image(image)
                self.display.show()

            except Exception as e:
                print(f"Error updating display: {e}")
                traceback.print_exc()

    def create_display_image(self, title, status, details="", progress=None):
        """Create a display image without updating the display"""
        # Create blank image for drawing
        image = Image.new("1", (128, 64))
        draw = ImageDraw.Draw(image)

        # Draw border
        draw.rectangle((0, 0, 127, 63), outline=1)

        # Draw title at top
        draw.text((5, 5), title, font=self.font, fill=1)

        # Draw horizontal line
        draw.line((0, 18, 127, 18), fill=1)

        # Draw status text
        draw.text((5, 22), status, font=self.font, fill=1)

        # Draw details in smaller font
        if details:
            # Optimize text wrapping for details
            self.draw_wrapped_text(draw, details, 5, 36)

        # Draw progress bar if provided (and not None)
        if progress is not None and 0 <= progress <= 100:
            # Progress bar outline
            draw.rectangle((10, 50, 118, 58), outline=1, fill=0)
            # Progress bar fill
            width = int((108 * progress) / 100)
            draw.rectangle((11, 51, 11 + width, 57), outline=0, fill=1)
            # Progress text
            draw.text((50, 50), f"{progress}%", font=self.font, fill=1)

        return image

    def draw_wrapped_text(self, draw, text, x, y, max_width=118, line_height=10):
        """Draw text with word wrapping"""
        # Calculate how many characters fit on a line
        if len(text) <= 21:  # Short text, no need to wrap
            draw.text((x, y), text, font=self.font, fill=1)
            return

        # Split text into words
        words = text.split()
        lines = []
        current_line = []
        current_width = 0

        for word in words:
            word_width = self.font.getlength(word + " ")
            if current_width + word_width <= max_width:
                current_line.append(word)
                current_width += word_width
            else:
                lines.append(" ".join(current_line))
                current_line = [word]
                current_width = word_width

        if current_line:
            lines.append(" ".join(current_line))

        # Draw up to 2 lines
        for i, line in enumerate(lines[:2]):
            draw.text((x, y + i * line_height), line, font=self.font, fill=1)

    def clear(self):
        """Clear the display"""
        with self.lock:
            if self.display is not None:
                try:
                    self.display.fill(0)
                    self.display.show()
                except Exception as e:
                    print(f"Error clearing display: {e}")
