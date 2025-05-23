from adafruit_servokit import ServoKit
import atexit
import time
import traceback
import threading

class ServoController:
    def __init__(self):
        self.servos_initialized = False
        self.kit = None
        self.pca = None  # Direct reference to PCA9685
        self.lock = threading.Lock()  # For thread safety

        try:
            # Initialize the servo controller
            print("Initializing servo controller...")
            self.kit = ServoKit(channels=16)
            
            # Get direct access to PCA9685 for safety controls
            self.pca = self.kit._pca
            
            # Set all servos to stop (throttle 0)
            print("Stopping all servos initially...")
            for i in range(6):
                # For continuous servos, 0 throttle means stop
                self.kit.continuous_servo[i].throttle = 0
                # For extra safety, force the PWM to zero
                self.pca.channels[i].duty_cycle = 0
                time.sleep(0.1)

            self.servos_initialized = True
            print("Servo controller initialized successfully")

            # Register cleanup function
            atexit.register(self.stop_all_servos)

        except Exception as e:
            print(f"Servo initialization error: {e}")
            traceback.print_exc()

    def run_servo(self, servo_num, throttle, duration_seconds):
        """Run a servo at specified throttle for a duration, then stop it safely"""
        with self.lock:  # Thread safety
            if not self.servos_initialized or self.kit is None:
                print(f"SERVO: Running servo {servo_num} at {throttle} (simulated)")
                time.sleep(duration_seconds)
                return True
                
            try:
                # Validate servo number
                if servo_num < 0 or servo_num >= 6:
                    print(f"Invalid servo number: {servo_num}")
                    return False
                    
                # Set throttle (ensure it's between -1 and 1)
                throttle = max(-1, min(1, throttle))
                self.kit.continuous_servo[servo_num].throttle = throttle
                print(f"Servo {servo_num} running at {throttle} throttle")
                
                # Run for specified duration
                time.sleep(duration_seconds)
                
                # Stop servo
                self.kit.continuous_servo[servo_num].throttle = 0
                self.pca.channels[servo_num].duty_cycle = 0  # Extra safety
                print(f"Servo {servo_num} stopped")
                
                return True
            except Exception as e:
                print(f"Error running servo {servo_num}: {e}")
                traceback.print_exc()
                
                # Emergency stop
                try:
                    self.kit.continuous_servo[servo_num].throttle = 0
                    self.pca.channels[servo_num].duty_cycle = 0
                except:
                    pass
                    
                return False

    def stop_all_servos(self):
        """Thread-safe method to stop all servos"""
        with self.lock:
            if not self.servos_initialized or self.kit is None:
                return

            print("Stopping all servos...")

            try:
                for i in range(6):
                    # Stop at throttle level
                    self.kit.continuous_servo[i].throttle = 0
                    # For extra safety, force the PWM to zero
                    self.pca.channels[i].duty_cycle = 0
                    print(f"Servo {i} stopped")
                print("All servos stopped")
            except Exception as e:
                print(f"Error stopping servos: {e}")
                
                # Final emergency stop attempt
                try:
                    for i in range(6):
                        self.pca.channels[i].duty_cycle = 0
                except:
                    pass