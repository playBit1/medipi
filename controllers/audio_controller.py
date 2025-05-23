import RPi.GPIO as GPIO
import time
import traceback
import threading


class AudioController:
    def __init__(self):
        self.BUZZER_PIN = 17
        self.buzzer = None
        self.lock = threading.Lock()  # For thread safety

        try:
            # Set GPIO mode - this should be done once in the main controller
            # so we check if it's already set as an extra measure
            if GPIO.getmode() is None:
                GPIO.setmode(GPIO.BCM)

            GPIO.setup(self.BUZZER_PIN, GPIO.OUT)
            self.buzzer = GPIO.PWM(self.BUZZER_PIN, 440)
            print("Buzzer initialized successfully")

            # Test the buzzer with shortened duration
            self.play_sound("test")

        except Exception as e:
            print(f"Buzzer initialization error: {e}")
            traceback.print_exc()
            self.buzzer = None

    def play_sound(self, sound_type):
        """Thread-safe method to play different buzzer sounds based on the type"""
        with self.lock:
            print(f"BUZZER: Playing {sound_type} sound")

            if self.buzzer is None:
                return

            try:
                # Sound profiles with optimized durations
                profiles = {
                    "success": [
                        (880, 0.2),  # Higher pitch, shorter
                        (1047, 0.2),  # Even higher pitch
                    ],
                    "error": [(220, 0.3)],  # Lower pitch, shorter
                    "waiting": [(440, 0.1)],  # Medium pitch, very short
                    "alert": [
                        (880, 0.2),  # Higher pitch
                        (0, 0.05),  # Pause
                        (880, 0.2),  # Repeat
                    ],
                    "test": [(440, 0.05)],  # Medium pitch, extremely short
                }

                profile = profiles.get(sound_type, profiles["test"])

                # Play the sound profile
                for frequency, duration in profile:
                    if frequency == 0:
                        # Pause
                        self.buzzer.stop()
                        time.sleep(duration)
                        self.buzzer.start(50)
                    else:
                        # Tone
                        self.buzzer.start(50)
                        self.buzzer.ChangeFrequency(frequency)
                        time.sleep(duration)

                self.buzzer.stop()

            except Exception as e:
                print(f"Error playing sound: {e}")

                # Try to stop the buzzer in case of error
                try:
                    self.buzzer.stop()
                except:
                    pass

    def play_sound_async(self, sound_type):
        """Play a sound in a background thread"""
        threading.Thread(
            target=self.play_sound, args=(sound_type,), daemon=True
        ).start()
