#!/usr/bin/env python3
import RPi.GPIO as GPIO
import sys
import traceback
import time
import threading

from controllers.display_controller import DisplayController
from controllers.audio_controller import AudioController
from controllers.rfid_controller import RfidController
from controllers.servo_controller import ServoController

# Debug mode for extra output
DEBUG = True


class HardwareController:
    def __init__(self):
        print("\n===== Initializing MediPi Hardware Controller =====")

        # Use lazy initialization for hardware components
        self._display = None
        self._audio = None
        self._rfid = None
        self._servo = None

        try:
            # Set up GPIO mode
            GPIO.setmode(GPIO.BCM)

            # Initialize display first for feedback
            self.display.update_display(
                "MediPi", "Initializing", "Starting hardware...", 0
            )

            print("\n===== MediPi Hardware Controller Initialized =====")
            self.display.update_display("MediPi", "Starting up", "System ready", 100)

        except Exception as e:
            print(f"Error initializing hardware controller: {e}")
            traceback.print_exc()
            sys.exit(1)

    # Property-based lazy initialization
    @property
    def display(self):
        if self._display is None:
            print("\n--- Initializing Display ---")
            self._display = DisplayController()
        return self._display

    @property
    def audio(self):
        if self._audio is None:
            print("\n--- Initializing Audio ---")
            self._audio = AudioController()
        return self._audio

    @property
    def rfid(self):
        if self._rfid is None:
            print("\n--- Initializing RFID ---")
            self._rfid = RfidController()
        return self._rfid

    @property
    def servo(self):
        if self._servo is None:
            print("\n--- Initializing Servo Controller ---")
            self._servo = ServoController()
        return self._servo

    def cleanup(self):
        """Release hardware resources"""
        print("Cleaning up hardware resources...")

        # Only clean up components that were actually initialized
        if self._display:
            self._display.clear()

        if self._servo:
            self._servo.stop_all_servos()

        try:
            GPIO.cleanup()
            print("GPIO cleaned up")
        except Exception as e:
            print(f"Error cleaning up GPIO: {e}")

        print("Hardware resources released")

    def wait_for_rfid_auth(self, expected_tag, timeout=900, patient_name="Patient"):
        """
        Wait for RFID authentication with timeout (default: 15 minutes = 900 seconds)
        Returns True if authorized, False otherwise

        Uses non-blocking approach with a callback to avoid blocking the main thread
        """
        print(f"Waiting for RFID authentication. Expected tag: {expected_tag}")
        self.display.update_display(
            "AUTH NEEDED", f"Hello {patient_name}", "Scan your tag"
        )
        self.audio.play_sound("waiting")

        # Create event for thread synchronization
        auth_event = threading.Event()
        auth_result = {"authorized": False}

        def auth_worker():
            # Track elapsed time
            start_time = time.time()

            # Wait for tag within timeout period
            while time.time() - start_time < timeout and not auth_event.is_set():
                # Check for tag with non-blocking read
                tag_data = self.rfid.read_tag()

                # If tag found, process it
                if tag_data:
                    tag_id, tag_text = tag_data
                    print(f"Tag detected: ID={tag_id}, Text={tag_text}")

                    # Check if this is the correct tag
                    if str(tag_id) == str(expected_tag) or (
                        expected_tag and expected_tag in tag_text
                    ):
                        self.display.update_display(
                            "AUTHORIZED", "Tag Accepted", "Preparing..."
                        )
                        self.audio.play_sound("success")
                        time.sleep(1)
                        auth_result["authorized"] = True
                        auth_event.set()
                        return
                    else:
                        self.display.update_display(
                            "UNAUTHORIZED", "Wrong Tag", "Try again"
                        )
                        self.audio.play_sound("error")
                        time.sleep(2)
                        # Reset the display to show scan instruction again
                        self.display.update_display(
                            "AUTH NEEDED", f"Hello {patient_name}", "Scan your tag"
                        )

                # Sleep briefly to avoid CPU spinning
                time.sleep(0.2)

            # Timeout occurred after specified period
            if not auth_event.is_set():
                print(
                    f"Authentication timeout: No valid tag scanned within {timeout} seconds"
                )
                self.display.update_display(
                    "TIMEOUT", "No tag scanned", "Try again later"
                )
                self.audio.play_sound("error")
                time.sleep(2)
                auth_event.set()

        # Start the authentication thread
        auth_thread = threading.Thread(target=auth_worker)
        auth_thread.daemon = True
        auth_thread.start()

        # Wait for the authentication to complete or timeout
        auth_event.wait()
        return auth_result["authorized"]

    def dispense_scheduled_medication(self, schedule, authorized=False):
        """Process a medication schedule and dispense if authorized"""
        try:
            print(f"Processing schedule: {schedule}")

            patient_name = schedule.get("patientName", "Patient")
            scheduled_time = schedule.get("time", "Unknown time")
            chamber_assignments = schedule.get("chambers", [])
            rfid_tag = schedule.get("rfidTag", "")

            # Show scheduled medication info
            self.display.update_display(
                "MEDICATION DUE", f"{patient_name}", f"Time: {scheduled_time}:00"
            )

            # Sound medication alert
            self.audio.play_sound("alert")
            time.sleep(1)  # Give time for alert to finish

            # If not pre-authorized, wait for RFID authentication
            if not authorized:
                print(f"Waiting for patient authentication with RFID tag: {rfid_tag}")
                authorized = self.wait_for_rfid_auth(
                    rfid_tag, timeout=900, patient_name=patient_name
                )

            # If authorized, dispense medications
            if authorized:
                print("Authentication successful, dispensing medication")

                # Dispense from each chamber
                total_chambers = len(chamber_assignments)
                total_doses = 0
                successful_doses = 0

                for idx, assignment in enumerate(chamber_assignments):
                    # Extract chamber and medication info
                    if isinstance(assignment, dict):
                        chamber_num = assignment.get("chamber", 0)

                        # Get medication info
                        medication = assignment.get("medication", {})
                        med_name = medication.get("name", "Unknown Medication")
                        med_unit = medication.get("dosageUnit", "unit")

                        # Get dosage amount
                        doses = assignment.get("dosageAmount", 1)

                        print(f"Processing chamber {chamber_num}: {med_name} x{doses}")
                    else:
                        print(f"Invalid chamber assignment: {assignment}")
                        continue

                    self.display.update_display(
                        f"DISPENSING            {idx+1}/{total_chambers}",
                        f"Name: {med_name}",
                        f"Doses: {doses} {med_unit}{'s' if doses > 1 and med_unit != 'mg' and med_unit != 'ml' else ''}",
                    )

                    # Process each dose
                    for dose in range(1, doses + 1):
                        print(
                            f"Dispensing dose {dose}/{doses} from chamber {chamber_num}"
                        )
                        total_doses += 1

                        # Run servo at 0.3 throttle for 1.1 seconds (it was the most optimal for the current servos)
                        success = self.servo.run_servo(chamber_num - 1, 0.3, 1.1)

                        if success:
                            successful_doses += 1

                        # Pause between doses
                        if dose < doses:
                            time.sleep(1.0)

                # Update display wth completion message
                self.display.update_display(
                    "COMPLETE",
                    f"Dispensed: {successful_doses}/{total_doses}",
                    "Thank you!",
                )
                self.audio.play_sound("success")
                time.sleep(2)

                return {
                    "schedule_id": schedule.get("id", "unknown"),
                    "timestamp": time.time(),
                    "status": ("COMPLETED"),
                    "dispensed_count": successful_doses,
                    "total_count": total_doses,
                }
            else:
                # Authentication failed or timed out
                print("Authentication failed or timed out")
                return {
                    "schedule_id": schedule.get("id", "unknown"),
                    "timestamp": time.time(),
                    "status": "MISSED",
                    "reason": "Authentication failed",
                }

        except Exception as e:
            print(f"Error dispensing medication: {e}")
            traceback.print_exc()
            self.display.update_display("ERROR", "Dispensing failed", str(e))
            self.audio.play_sound("error")
            time.sleep(2)

            return {
                "schedule_id": schedule.get("id", "unknown") if schedule else "unknown",
                "timestamp": time.time(),
                "status": "ERROR",
                "error": str(e),
            }
