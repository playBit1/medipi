#!/usr/bin/env python3
import paho.mqtt.client as mqtt
import json
import time
import sys
import uuid
import argparse

# MQTT settings
HUB_IP = "192.168.1.156"  # Replace with your central hub IP
MQTT_PORT = 1883

# Predefined sample configurations
SAMPLES = {
    "single": {
        "name": "Single Chamber Test",
        "description": "Test a single medication chamber",
        "chambers": [1],
        "medications": [{"name": "Test Pill", "dosage": "1mg", "amount": 1}]
    },
    "odd": {
        "name": "Odd Chambers Test",
        "description": "Test odd-numbered chambers (1,3,5)",
        "chambers": [1, 3, 5],
        "medications": [
            {"name": "Morning Pill", "dosage": "10mg", "amount": 1},
            {"name": "Afternoon Pill", "dosage": "5mg", "amount": 1},
            {"name": "Evening Pill", "dosage": "20mg", "amount": 2}
        ]
    },
    "even": {
        "name": "Even Chambers Test",
        "description": "Test even-numbered chambers (2,4,6)",
        "chambers": [2, 4, 6],
        "medications": [
            {"name": "Aspirin", "dosage": "100mg", "amount": 1},
            {"name": "Vitamin C", "dosage": "500mg", "amount": 1},
            {"name": "Calcium", "dosage": "250mg", "amount": 2}
        ]
    },
    "all": {
        "name": "All Chambers Test",
        "description": "Test all chambers (1-6)",
        "chambers": [1, 2, 3, 4, 5, 6],
        "medications": [
            {"name": "Aspirin", "dosage": "100mg", "amount": 1},
            {"name": "Vitamin C", "dosage": "500mg", "amount": 1},
            {"name": "Calcium", "dosage": "250mg", "amount": 1},
            {"name": "Zinc", "dosage": "15mg", "amount": 1},
            {"name": "Iron", "dosage": "65mg", "amount": 1},
            {"name": "Vitamin D", "dosage": "1000IU", "amount": 1}
        ]
    },
    "realistic": {
        "name": "Realistic Medication Schedule",
        "description": "Test a realistic medication schedule for a patient",
        "chambers": [1, 2, 4],
        "medications": [
            {"name": "Lisinopril", "dosage": "20mg", "amount": 5},
            {"name": "Metformin", "dosage": "500mg", "amount": 2},
            {"name": "Atorvastatin", "dosage": "40mg", "amount": 1}
        ]
    }
}

# Set up argument parser
parser = argparse.ArgumentParser(description='Test MediPi servo dispensing via MQTT')
parser.add_argument('serial', help='Dispenser serial number (e.g., DISP001)')
parser.add_argument('--sample', '-s', choices=SAMPLES.keys(), default='single',
                    help='Predefined sample configuration to use')
parser.add_argument('--chambers', '-c', help='Custom chamber numbers (comma-separated, e.g., 1,3,5)')
parser.add_argument('--auth', '-a', action='store_true', 
                    help='Require RFID authentication (default: bypass authentication)')
parser.add_argument('--hardware-test', '-t', action='store_true',
                    help='Run hardware test instead of dispensing test')
parser.add_argument('--component', choices=['all', 'display', 'audio', 'rfid', 'servo'],
                    default='all', help='Component to test in hardware test mode')

args = parser.parse_args()

SERIAL_NUMBER = args.serial
print(f"Testing dispenser: {SERIAL_NUMBER}")

# Topics
COMMAND_TOPIC = f"medipi/dispensers/{SERIAL_NUMBER}/commands"
LOGS_TOPIC = f"medipi/dispensers/{SERIAL_NUMBER}/logs"

# If running hardware test, send that command instead
if args.hardware_test:
    test_command = {
        "action": "test_hardware",
        "component": args.component
    }
    
    # Connect to MQTT and send command
    client = mqtt.Client()
    
    def on_connect(client, userdata, flags, rc):
        print(f"Connected with result code {rc}")
        if rc == 0:
            # Subscribe to logs
            client.subscribe(LOGS_TOPIC)
            # Send command
            client.publish(COMMAND_TOPIC, json.dumps(test_command), qos=1)
            print(f"Sent hardware test command: {json.dumps(test_command)}")
    
    def on_message(client, userdata, msg):
        try:
            payload = json.loads(msg.payload)
            print(f"Received log: {json.dumps(payload, indent=2)}")
        except:
            print(f"Received message on {msg.topic}: {msg.payload}")
    
    client.on_connect = on_connect
    client.on_message = on_message
    
    print(f"Connecting to MQTT broker at {HUB_IP}:{MQTT_PORT}...")
    client.connect(HUB_IP, MQTT_PORT, 60)
    client.loop_start()
    
    try:
        time.sleep(30)  # Wait for test to complete
    except KeyboardInterrupt:
        print("Interrupted by user")
    
    client.loop_stop()
    client.disconnect()
    sys.exit(0)

# Get chambers to test
chambers_to_test = None

# Use custom chambers if provided
if args.chambers:
    try:
        chambers_to_test = [int(c) for c in args.chambers.split(',')]
        print(f"Using custom chamber configuration: {chambers_to_test}")
    except:
        print(f"Invalid chamber numbers: {args.chambers}")
        sys.exit(1)
else:
    # Use sample configuration
    sample = SAMPLES[args.sample]
    chambers_to_test = sample["chambers"]
    print(f"Using '{args.sample}' sample: {sample['name']}")
    print(f"Description: {sample['description']}")
    print(f"Chambers: {chambers_to_test}")
    print(f"Medications: {len(sample['medications'])}")

# Create test medications based on sample or default pattern
if args.chambers or args.sample not in SAMPLES:
    # For custom chambers, create generic medications
    test_medications = []
    for i, chamber in enumerate(chambers_to_test):
        test_medications.append({
            "id": f"med{i+1}",
            "name": f"Test Med {i+1}",
            "dosage": "Test",
            "amount": 1
        })
else:
    # Use medications from sample
    test_medications = []
    for i, med in enumerate(SAMPLES[args.sample]["medications"]):
        test_medications.append({
            "id": f"med{i+1}",
            "name": med["name"],
            "dosage": med["dosage"],
            "amount": med["amount"]
        })

# Create chamber assignments
chamber_assignments = []
for i, chamber in enumerate(chambers_to_test):
    med_index = min(i, len(test_medications) - 1)  # Ensure we don't exceed medications array
    chamber_assignments.append({
        "chamber": chamber,
        "medicationId": f"med{med_index+1}"
    })

# Generate a test schedule
test_schedule = {
    "id": str(uuid.uuid4()),
    "patientName": "Test Patient",
    "patientId": "patient123",
    "time": 12,  # Noon
    "isActive": True,
    "startDate": "2025-05-01T00:00:00Z",
    "endDate": "2025-06-01T00:00:00Z",
    "rfidTag": "Patient-DISP1573AB97",  # This will match with our mock RFID
    "medications": test_medications,
    "chambers": chamber_assignments
}

# Dispense command
dispense_command = {
    "action": "dispense",
    "schedule": test_schedule,
    "authorized": not args.auth  # Bypass authentication unless --auth flag is set
}

# Callback for connection
def on_connect(client, userdata, flags, rc):
    print(f"Connected with result code {rc}")
    if rc == 0:
        # Subscribe to logs to see the results
        client.subscribe(LOGS_TOPIC)
        print("Subscribed to logs topic")

# Callback for receiving messages
def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())
        print(f"Received log: {json.dumps(payload, indent=2)}")
    except:
        print(f"Received message on {msg.topic}: {msg.payload}")

# Connect to MQTT broker
client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message

print(f"Connecting to MQTT broker at {HUB_IP}:{MQTT_PORT}...")
client.connect(HUB_IP, MQTT_PORT, 60)
client.loop_start()

# Wait for connection to establish
time.sleep(2)

print(f"Sending dispense command for chambers: {chambers_to_test}")
if args.auth:
    print("RFID authentication required - have your tag ready!")
else:
    print("RFID authentication bypassed")

# Print summary of what will be dispensed
print("\nDispensing the following medications:")
for i, med in enumerate(test_medications):
    if i < len(chamber_assignments):
        print(f"  Chamber {chamber_assignments[i]['chamber']}: {med['name']} ({med['dosage']}) - {med['amount']} units")

# Send the dispense command
client.publish(COMMAND_TOPIC, json.dumps(dispense_command), qos=1)
print("\nCommand sent! Waiting for logs...")

# Wait for logs
try:
    time.sleep(30)  # Wait for the dispense operation to complete and logs to arrive
except KeyboardInterrupt:
    print("Interrupted by user")

# Disconnect
client.loop_stop()
client.disconnect()
print("Test completed")