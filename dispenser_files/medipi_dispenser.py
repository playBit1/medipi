#!/usr/bin/env python3
import paho.mqtt.client as mqtt
import json
import time
import socket
import uuid
import os
import signal
import sys
import functools
from datetime import datetime, timedelta
import threading
from collections import defaultdict

# Import hardware controller
from controllers.hardware_controller import HardwareController

CONFIG_DIR = os.path.expanduser("~/Desktop/MediPi")
CONFIG_FILE = os.path.join(CONFIG_DIR, "config.ini")
os.makedirs(CONFIG_DIR, exist_ok=True)

# Read or generate serial number
SERIAL_FILE = os.path.join(CONFIG_DIR, "medipi_serial.txt")
if os.path.exists(SERIAL_FILE):
    with open(SERIAL_FILE, "r") as f:
        SERIAL_NUMBER = f.read().strip()
else:
    # Generate a unique serial number and save it
    SERIAL_NUMBER = f"DISP{uuid.uuid4().hex[:8].upper()}"
    with open(SERIAL_FILE, "w") as f:
        f.write(SERIAL_NUMBER)

print(f"Dispenser Serial Number: {SERIAL_NUMBER}")

# Local storage for schedules and logs
SCHEDULES_FILE = os.path.join(CONFIG_DIR, "schedules.json")
LOGS_FILE = os.path.join(CONFIG_DIR, "logs.json")


# Error handling decorator
def with_error_handling(default_return=None, log_error=True):
    """Decorator for consistent error handling"""

    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                instance = args[0] if args else None
                func_name = func.__name__

                if log_error:
                    print(f"Error in {func_name}: {e}")

                if hasattr(instance, "events") and hasattr(instance.events, "publish"):
                    instance.events.publish(
                        "error",
                        {
                            "function": func_name,
                            "error": str(e),
                            "timestamp": datetime.now().isoformat(),
                        },
                    )

                return default_return

        return wrapper

    return decorator

#Dispensers follow event driven architechture with publishers and subscribers
class EventBus:
    """Event system for decoupled communication"""

    def __init__(self):
        self.subscribers = defaultdict(list)

    def subscribe(self, event_type, callback):
        """Subscribe to an event type"""
        self.subscribers[event_type].append(callback)
        return lambda: self.subscribers[event_type].remove(callback)

    def publish(self, event_type, data=None):
        """Publish an event"""
        for callback in self.subscribers[event_type]:
            try:
                callback(data)
            except Exception as e:
                print(f"Error in event handler for {event_type}: {e}")


class Config:
    """Configuration manager"""

    def __init__(self, config_path):
        self.config_path = config_path
        self.values = self.load_config()

    def load_config(self):
        """Load configuration with defaults"""
        config = {
            "mqtt": {
                "broker_host": os.environ.get("MEDIPI_HUB_IP", "192.168.1.156"),
                "broker_port": int(os.environ.get("MEDIPI_MQTT_PORT", 1883)),
                "keepalive": 120,
                "qos": 1,
                "reconnect_delay": 5,
            },
            "hardware": {
                "servo_count": 6,
                "display_enabled": True,
                "rfid_enabled": True,
                "audio_enabled": True,
                "display_update_interval": 1.0,  # seconds
            },
            "schedules": {
                "check_interval": 30,  # seconds
                "dispense_window": 2,  # minutes
                "auth_timeout": 900,  # seconds
            },
        }

        # Load from file if exists (in a real system)
        # For now, just return the defaults
        return config

    def get(self, section, key):
        """Get a configuration value"""
        return self.values.get(section, {}).get(key)


class ThrottledDisplay:
    """Display controller that prevents too-frequent updates"""

    def __init__(self, display_controller, min_interval=0.1):
        self.display = display_controller
        self.min_interval = min_interval
        self.last_update = 0
        self.pending_update = None
        self.lock = threading.Lock()

    def update_display(self, title, status, details="", progress=None):
        """Throttled display update that prevents rapid changes"""
        with self.lock:
            current_time = time.time()

            # Always store the latest update request
            self.pending_update = (title, status, details, progress)

            # If it's been long enough since the last update, do it now
            if current_time - self.last_update >= self.min_interval:
                self._do_update()
                return True

            # Otherwise, schedule it for later if not already scheduled
            return False

    def _do_update(self):
        """Actually perform the display update"""
        if self.pending_update:
            title, status, details, progress = self.pending_update
            self.display.update_display(title, status, details, progress)
            self.last_update = time.time()
            self.pending_update = None

    def process_pending(self):
        """Process any pending display update"""
        with self.lock:
            current_time = time.time()
            if (
                self.pending_update
                and current_time - self.last_update >= self.min_interval
            ):
                self._do_update()


class MediPiDispenser:
    def __init__(self):
        # Setup event system
        self.events = EventBus()

        # Load configuration
        self.config = Config(CONFIG_FILE)

        # Initialize hardware
        self.hardware = HardwareController()

        # Create throttled display
        self.display = ThrottledDisplay(
            self.hardware.display,
            self.config.get("hardware", "display_update_interval"),
        )

        # Current state
        self.is_connected = False
        self.status = "OFFLINE"
        self.reconnect_count = 0
        self.was_ever_connected = False
        self.schedules = self.load_schedules()
        self.upcoming_notification_shown = False
        self.processed_schedule_hours = (
            set()
        )  # Track which hours we've already processed today
        self.dispensing_in_progress = False
        self.pending_messages = []  # For offline operation

        # Create a unique client ID to prevent conflicts
        unique_id = f"{SERIAL_NUMBER}-{uuid.uuid4().hex[:8]}"

        # Initialize MQTT client with a unique ID and clean_session=False for persistence
        self.client = mqtt.Client(
            client_id=f"medipi-dispenser-{unique_id}", clean_session=False
        )

        # Set callbacks
        self.client.on_connect = self.on_connect
        self.client.on_disconnect = self.on_disconnect
        self.client.on_message = self.on_message

        # Set Last Will and Testament message
        self.client.will_set(
            f"medipi/dispensers/{SERIAL_NUMBER}/status",
            json.dumps(
                {
                    "status": "OFFLINE",
                    "timestamp": datetime.now().isoformat(),
                    "ipAddress": self.get_ip_address(),
                    "reason": "Unexpected Disconnect",
                }
            ),
            qos=1,
            retain=True,
        )

        # Configure reconnection parameters
        self.client.reconnect_delay_set(min_delay=1, max_delay=60)

        # Register signal handlers
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)

        # Setup event handlers
        self.setup_events()

    def setup_events(self):
        """Set up event handlers"""
        self.events.subscribe("mqtt_connected", self.on_mqtt_connected)
        self.events.subscribe("schedule_due", self.on_schedule_due)
        self.events.subscribe("dispensing_completed", self.on_dispensing_completed)
        self.events.subscribe("error", self.on_error)

    def on_mqtt_connected(self, data):
        """Handle MQTT connected event"""
        # Send pending messages
        self.process_pending_messages()

        # Update display
        self.update_default_display()

    def on_schedule_due(self, schedule):
        """Handle schedule due event"""
        # Start dispensing process
        self.process_schedule(schedule)

    def on_dispensing_completed(self, result):
        """Handle dispensing completed event"""
        # Send log
        self.send_log(result)

        # Update display
        self.update_default_display()

    def on_error(self, error_data):
        """Handle error event"""
        # Log error
        print(f"ERROR: {error_data['function']}: {error_data['error']}")

        # Show on display if available
        error_msg = error_data["error"]
        if len(error_msg) > 30:
            error_msg = error_msg[:27] + "..."

        self.display.update_display("ERROR", error_data["function"], error_msg)

    @with_error_handling([])
    def load_schedules(self):
        """Load schedules from local storage"""
        if os.path.exists(SCHEDULES_FILE):
            with open(SCHEDULES_FILE, "r") as f:
                schedules = json.load(f)
                # Pre-process dates for efficiency
                return [self.process_schedule_time(s) for s in schedules]
        return []

    @with_error_handling(False)
    def save_schedules(self):
        """Save schedules to local storage"""
        # Remove pre-processed fields before saving
        clean_schedules = []
        for schedule in self.schedules:
            clean_schedule = {
                k: v for k, v in schedule.items() if not k.startswith("_")
            }
            clean_schedules.append(clean_schedule)

        with open(SCHEDULES_FILE, "w") as f:
            json.dump(clean_schedules, f)
        print(f"Saved {len(clean_schedules)} schedules to {SCHEDULES_FILE}")
        return True

    def process_schedule_time(self, schedule):
        """Pre-process schedule dates for efficient checking"""
        try:
            schedule["_start_date"] = datetime.fromisoformat(
                schedule.get("startDate", "2000-01-01T00:00:00")
            ).date()
        except (ValueError, TypeError):
            schedule["_start_date"] = datetime(2000, 1, 1).date()

        if schedule.get("endDate"):
            try:
                schedule["_end_date"] = datetime.fromisoformat(
                    schedule.get("endDate")
                ).date()
            except (ValueError, TypeError):
                schedule["_end_date"] = None
        else:
            schedule["_end_date"] = None

        return schedule

    @with_error_handling(False)
    def connect(self):
        """Connect to MQTT broker"""
        try:
            print(
                f"Connecting to MQTT broker at {self.config.get('mqtt', 'broker_host')}:{self.config.get('mqtt', 'broker_port')}"
            )
            self.display.update_display(
                "MQTT",
                "Connecting",
                f"To broker: {self.config.get('mqtt', 'broker_host')}",
            )

            self.client.connect(
                self.config.get("mqtt", "broker_host"),
                self.config.get("mqtt", "broker_port"),
                self.config.get("mqtt", "keepalive"),
            )
            self.client.loop_start()
            time.sleep(2)
            self.update_default_display()
            return True
        except Exception as e:
            print(f"MQTT Connection Error: {e}")
            # return False to indicate failure
            return False

    @with_error_handling()
    def disconnect(self):
        """Disconnect from MQTT broker"""
        # Send offline status before disconnecting
        self.set_status("OFFLINE", reason="Controlled Shutdown")
        time.sleep(1)  # Give time for the message to be sent

        # Stop the loop and disconnect
        self.client.loop_stop()
        self.client.disconnect()
        print("Disconnected from MQTT broker")

    def on_connect(self, client, userdata, flags, rc):
        """Callback when connected to MQTT broker"""
        print(f"Connected to MQTT broker with result code {rc}")

        if rc == 0:
            self.is_connected = True
            self.reconnect_count = 0
            self.was_ever_connected = True

            if self.status == "OFFLINE_AUTONOMOUS":
                print("Exiting OFFLINE_AUTONOMOUS mode - broker connection restored")
            self.status = "ONLINE"

            # Define topics map with QoS levels
            topics = {
                f"medipi/dispensers/{SERIAL_NUMBER}/commands": 1,
                f"medipi/dispensers/{SERIAL_NUMBER}/schedules": 1,
                "medipi/discovery/broadcast": 1,
            }

            # Subscribe to all topics at once
            client.subscribe([(topic, qos) for topic, qos in topics.items()])

            # Announce presence
            self.send_discovery_message()
            self.set_status("ONLINE", reason="Initial Connection")

            # Publish MQTT connected event
            self.events.publish("mqtt_connected", None)

            print("Successfully connected and subscribed to topics")
        else:
            self.is_connected = False
            print(f"Connection failed with code {rc}")
            self.display.update_display(
                "ERROR", "Connection Failed", f"Error code: {rc}"
            )

    def on_disconnect(self, client, userdata, rc):
        """Callback when disconnected from MQTT broker"""
        self.is_connected = False

        self.reconnect_count += 1
        print(
            f"Disconnection with code {rc}. Will auto-reconnect... (attempt {self.reconnect_count})"
        )

        self.display.update_display(
            "DISCONNECTED",
            "Lost connection",
            f"Reconnecting... {self.reconnect_count}",
        )

        # Immediately go to autonomous mode if dispenser doesnt detect broker
        if not self.was_ever_connected:
            print("Initial connection failed - entering OFFLINE_AUTONOMOUS mode")
            self.status = "OFFLINE_AUTONOMOUS"
            self.update_default_display()
        # Regular reconnection attempt handling
        elif self.reconnect_count > 5:
            print(
                "Multiple reconnection attempts failed. Setting status to OFFLINE_AUTONOMOUS"
            )
            self.status = "OFFLINE_AUTONOMOUS"
            self.update_default_display()

    def on_message(self, client, userdata, msg):
        """Callback when message received"""
        try:
            print(f"Message received on topic {msg.topic}")
            payload = json.loads(msg.payload.decode())

            # Handle broadcast messages
            if msg.topic == "medipi/discovery/broadcast":
                if payload.get("action") == "scan":
                    print("Received scan request, sending discovery message")
                    self.send_discovery_message()

            # Handle commands
            elif msg.topic == f"medipi/dispensers/{SERIAL_NUMBER}/commands":
                self.handle_command(payload)

            # Handle schedules
            elif msg.topic == f"medipi/dispensers/{SERIAL_NUMBER}/schedules":
                self.handle_schedule_update(payload)

        except json.JSONDecodeError:
            print("Received invalid JSON message")
        except Exception as e:
            print(f"Error handling message: {e}")
            self.events.publish(
                "error",
                {
                    "function": "on_message",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                },
            )

    @with_error_handling()
    def handle_command(self, payload):
        """Handle command messages"""
        action = payload.get("action")
        print(f"Handling command: {action}")

        if action == "set_status":
            new_status = payload.get("status")
            if new_status:
                print(f"Setting status to {new_status}")
                self.set_status(new_status)

        elif action == "dispense":
            # On-demand dispensing
            schedule_id = payload.get("scheduleId")

            # Find the schedule or use a directly provided schedule
            if "schedule" in payload:
                schedule = payload["schedule"]
                print(f"Using provided schedule for direct dispensing")
            else:
                schedule = next(
                    (s for s in self.schedules if s.get("id") == schedule_id), None
                )

            if schedule:
                # Process schedule
                self.events.publish("schedule_due", schedule)
            else:
                print(f"Schedule {schedule_id} not found")
                self.send_log(
                    {
                        "scheduleId": schedule_id,
                        "status": "ERROR",
                        "error": "Schedule not found",
                    }
                )

    @with_error_handling()
    def handle_schedule_update(self, payload):
        """Handle schedule updates"""

        print(f"Received {len(payload)} schedules")

        # Process each schedule to ensure required fields
        processed_schedules = []
        for schedule in payload:
            # Ensure schedule has required fields with defaults
            processed_schedule = {
                "id": schedule.get("id", str(uuid.uuid4())),
                "time": schedule.get("time", 0),  # Hour (0-23)
                "patientName": schedule.get("patientName", "Patient"),
                "patientId": schedule.get("patientId", ""),
                "startDate": schedule.get("startDate", datetime.now().isoformat()),
                "endDate": schedule.get("endDate", None),
                "isActive": schedule.get("isActive", True),
                "rfidTag": schedule.get("rfidTag", ""),
                "medications": schedule.get("medications", []),
                "chambers": schedule.get("chambers", []),
            }
            # Process datetime fields
            processed_schedules.append(self.process_schedule_time(processed_schedule))

        self.schedules = processed_schedules

        # Save schedules to local storage
        self.save_schedules()

        # Update display with notification
        self.display.update_display("SCHEDULES", "Updated", f"{len(payload)} schedules")

        # Show notification for 5 seconds, then return to default display
        time.sleep(5)
        self.update_default_display()

        # Send confirmation
        self.publish_message(
            f"medipi/dispensers/{SERIAL_NUMBER}/schedules/confirm",
            {
                "status": "SUCCESS",
                "count": len(payload),
                "timestamp": datetime.now().isoformat(),
            },
        )

    @with_error_handling()
    def update_default_display(self):
        """Update the default display with patient info and schedule count"""
        # Get patient name from any active schedule
        patient_name = "No Patient"
        for schedule in self.schedules:
            if schedule.get("isActive", True):
                patient_name = schedule.get("patientName", "Patient")
                break

        # To check for upcoming schedule in next 15 minutes
        now = datetime.now()
        current_hour = now.hour
        current_minute = now.minute
        current_date = now.date()

        upcoming_text = ""
        for schedule in self.schedules:
            if not schedule.get("isActive", True):
                continue

            # Check if schedule is active today
            if current_date < schedule.get("_start_date"):
                continue
            if schedule.get("_end_date") and current_date > schedule.get("_end_date"):
                continue

            schedule_hour = int(schedule.get("time", 0))

            # Check if schedule is within the next 15 minutes
            if (current_hour == schedule_hour and current_minute >= 45) or (
                current_hour == (schedule_hour - 1) % 24 and current_minute >= 45
            ):
                upcoming_text = f"Med due at {schedule_hour}:00"
                break

        self.display.update_display(
            "MediPi",
            f"Patient: {patient_name}",
            f"Schedules: {len(self.schedules)}{upcoming_text and ' - ' + upcoming_text or ''}",
        )

    @with_error_handling()
    def send_discovery_message(self):
        """Send discovery message to hub"""
        message = {
            "serialNumber": SERIAL_NUMBER,
            "ipAddress": self.get_ip_address(),
            "status": self.status,
            "lastSeen": datetime.now().isoformat(),
            "action": "announce",
            "model": "MediPi Dispenser Zero 2 W",
        }

        self.publish_message(
            f"medipi/discovery/{SERIAL_NUMBER}", message, qos=1, retain=True
        )

    @with_error_handling()
    def set_status(self, status, reason=None):
        """Update and Send the dispenser status"""
        self.status = status

        message = {
            "status": self.status,
            "timestamp": datetime.now().isoformat(),
            "ipAddress": self.get_ip_address(),
            "reason": reason or "Status Update",
            "scheduleCount": len(self.schedules),
        }

        self.publish_message(
            f"medipi/dispensers/{SERIAL_NUMBER}/status", message, qos=1, retain=True
        )

    @with_error_handling(False)
    def send_log(self, log_data):
        """Send log entry to hub"""
        # Add common fields
        log_entry = {
            "dispenserId": SERIAL_NUMBER,
            "timestamp": datetime.now().isoformat(),
            **log_data,
        }

        return self.publish_message(
            f"medipi/dispensers/{SERIAL_NUMBER}/logs", log_entry, qos=1
        )

    def publish_message(self, topic, payload, qos=1, retain=False):
        """Centralized method for publishing MQTT messages with error handling"""
        if not self.is_connected:
            self.pending_messages.append((topic, payload, qos, retain))
            return False

        try:
            result = self.client.publish(
                topic, json.dumps(payload), qos=qos, retain=retain
            )
            success = result.rc == mqtt.MQTT_ERR_SUCCESS
            if success:
                print(f"Message sent to {topic}")
            else:
                print(f"Failed to send message to {topic}, error code: {result.rc}")
            return success
        except Exception as e:
            print(f"Error publishing to {topic}: {e}")
            return False

    def process_pending_messages(self):
        """Send any pending messages after reconnection"""
        if not self.pending_messages:
            return

        print(f"Processing {len(self.pending_messages)} pending messages")
        for topic, payload, qos, retain in self.pending_messages[:]:
            if self.publish_message(topic, payload, qos, retain):
                self.pending_messages.remove((topic, payload, qos, retain))

    @with_error_handling()
    def process_schedule(self, schedule, authorized=False):
        """Process a schedule and dispense medication"""
        print(f"Processing schedule: {schedule}")

        # Set dispensing flag to prevent duplicate processes
        self.dispensing_in_progress = True

        try:
            # Dispense medication and get result
            result = self.hardware.dispense_scheduled_medication(schedule, authorized)

            # Publish dispensing completed event
            self.events.publish(
                "dispensing_completed",
                {
                    "scheduleId": schedule.get("id", "unknown"),
                    "status": result["status"],
                    "details": result,
                },
            )

            # Return to ready state
            self.update_default_display()

        finally:
            # clear dispensing flag
            self.dispensing_in_progress = False

    def get_active_schedules_for_hour(self, hour, current_date):
        """Get all active schedules for a specific hour and date"""
        active_schedules = []

        for schedule in self.schedules:
            # Skip inactive schedules
            if not schedule.get("isActive", True):
                continue

            # Use pre-processed dates
            if current_date < schedule.get("_start_date"):
                continue
            if schedule.get("_end_date") and current_date > schedule.get("_end_date"):
                continue

            # Check hour match
            if int(schedule.get("time", 0)) == hour:
                active_schedules.append(schedule)

        return active_schedules

    def check_schedules(self):
        """Thread function to check for upcoming schedules"""
        # Track the last day we reset our processed hours
        last_reset_date = datetime.now().date()

        while True:
            try:
                now = datetime.now()
                current_hour = now.hour
                current_minute = now.minute
                current_date = now.date()

                # Reset processed hours at midnight
                if current_date != last_reset_date:
                    self.processed_schedule_hours = set()
                    last_reset_date = current_date
                    print(f"Reset processed schedule hours for new day: {current_date}")

                # Skip if dispensing is already in progress
                if self.dispensing_in_progress:
                    time.sleep(5)  # Check more frequently when dispensing
                    continue

                # Get active schedules for this hour
                active_schedules = self.get_active_schedules_for_hour(
                    current_hour, current_date
                )

                # Check if it's time to dispense (start of hour)
                dispense_window = self.config.get("schedules", "dispense_window")
                if 0 <= current_minute < dispense_window:
                    for schedule in active_schedules:
                        schedule_key = f"{current_date.isoformat()}-{current_hour}"

                        # Check if already processed
                        if schedule_key in self.processed_schedule_hours:
                            continue

                        # Mark as processed
                        self.processed_schedule_hours.add(schedule_key)

                        # Publish schedule due event
                        print(
                            f"Schedule triggered: {schedule.get('id')} at {current_hour}:00"
                        )
                        self.events.publish("schedule_due", schedule)

                        # Only process one schedule at a time
                        break

                # Process any pending display updates
                self.display.process_pending()

                # Sleep according to configuration
                time.sleep(self.config.get("schedules", "check_interval"))

            except Exception as e:
                print(f"Error in schedule checker: {e}")
                self.events.publish(
                    "error",
                    {
                        "function": "check_schedules",
                        "error": str(e),
                        "timestamp": datetime.now().isoformat(),
                    },
                )
                time.sleep(60)  # Longer sleep after error

    def maintain_connection(self):
        """Thread function to keep connection alive and handle reconnection"""
        while True:
            try:
                if self.is_connected:
                    # Send a ping message to maintain the connection
                    self.publish_message(
                        f"medipi/dispensers/{SERIAL_NUMBER}/ping",
                        {
                            "timestamp": datetime.now().isoformat(),
                            "uptime": time.time() - self.start_time,
                            "status": self.status,
                        },
                        qos=0,
                    )
                else:
                    # Not connected - trigger reconnect if in offline autonomous mode
                    if self.status == "OFFLINE_AUTONOMOUS":
                        print("Attempting to reconnect from OFFLINE_AUTONOMOUS mode")
                        try:
                            self.connect()
                        except Exception as e:
                            print(f"Reconnection attempt failed: {e}")

                # Sleep for 30 seconds
                time.sleep(30)
            except Exception as e:
                print(f"Error in maintain_connection thread: {e}")
                time.sleep(60)  # Longer sleep after error

    def signal_handler(self, sig, frame):
        """Handle system signals for clean shutdown"""
        print("Shutting down...")

        # Display shutdown message
        self.display.update_display("SHUTDOWN", "System stopping", "Please wait...")

        # Disconnect from MQTT
        self.disconnect()

        # Clean up hardware
        self.hardware.cleanup()

        sys.exit(0)

    @staticmethod
    def get_ip_address():
        """Get the local IP address"""
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except:
            return "Unknown"

    def run(self):
        """Start the dispenser service"""
        self.start_time = time.time()

        # Try to connect to MQTT broker
        connection_success = self.connect()

        if not connection_success:
            print("MQTT connection failed - entering OFFLINE_AUTONOMOUS mode")
            self.display.update_display(
                "OFFLINE MODE", "No connection", "Operating autonomously"
            )
            self.status = "OFFLINE_AUTONOMOUS"
            time.sleep(2)  # Show the message for 2 seconds
        else:
            print("Dispenser service running with MQTT connection")

        # Start threads regardless of connection status
        connection_thread = threading.Thread(
            target=self.maintain_connection, daemon=True
        )
        connection_thread.start()

        schedule_thread = threading.Thread(target=self.check_schedules, daemon=True)
        schedule_thread.start()

        # Initial default display
        self.update_default_display()

        # Main thread can now just sleep and wait for signals
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            self.signal_handler(signal.SIGINT, None)


if __name__ == "__main__":
    dispenser = MediPiDispenser()
    dispenser.run()
