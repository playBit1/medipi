# MediPi - Automated Medication Dispenser System

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-14.0-black?style=for-the-badge&logo=next.js" alt="Next.js"/>
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Raspberry%20Pi-Compatible-red?style=for-the-badge&logo=raspberry-pi" alt="Raspberry Pi"/>
  <img src="https://img.shields.io/badge/MQTT-Protocol-purple?style=for-the-badge" alt="MQTT"/>
</div>

## 📋 Overview

MediPi is an automated medication dispensing system designed for healthcare facilities. It combines a centralized web-based management system with distributed IoT dispensers to ensure patients receive their medications on time, every time.

### Key Features

- **Automated Dispensing**: Schedule-based medication dispensing with RFID authentication
- **Central Management**: Web dashboard for managing patients, medications, and schedules
- **Offline Operation**: Dispensers continue to work even when disconnected from the network
- **Real-time Monitoring**: Track dispenser status, medication levels, and adherence rates
- **Alert System**: Notifications for missed doses, low stock, and system issues

## 🏗️ System Architecture

### Components

1. **Central Hub (Raspberry Pi 4)**

   - Next.js web application with TypeScript
   - SQLite database with Prisma ORM
   - Mosquitto MQTT broker
   - Node-RED middleware for IoT communication

2. **Dispenser Units (Raspberry Pi Zero 2W)**
   - 6 servo-controlled medication chambers
   - OLED display for patient feedback
   - RFID reader for authentication
   - Buzzer for alerts
   - Python-based hardware controller

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- Raspberry Pi 4 (for central hub)
- Raspberry Pi Zero 2W (for each dispenser)
- MQTT broker (Mosquitto)

### Central Hub Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/medipi.git
   cd medipi
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Initialize the database**

   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

### Dispenser Setup

1. **Install Python dependencies on Raspberry Pi Zero**

   ```bash
   cd dispenser
   pip install -r requirements.txt
   ```

2. **Configure dispenser**

   ```bash
   # Edit config to set hub IP address
   nano ~/Desktop/MediPi/config.ini
   ```

3. **Run dispenser service**
   ```bash
   sudo systemctl enable medipi-dispenser
   sudo systemctl start medipi-dispenser
   ```

## 📱 Features

### Web Dashboard

- **Patient Management**: Add, edit, and assign patients to dispensers
- **Medication Inventory**: Track stock levels and set low-stock alerts
- **Schedule Creation**: Define medication schedules with time and dosage
- **Real-time Monitoring**: View dispenser status and recent dispensing events
- **Alert Dashboard**: Monitor missed doses and system issues

### Dispenser Functionality

- **RFID Authentication**: Secure patient verification before dispensing
- **Scheduled Dispensing**: Automatic alerts when medication is due
- **Offline Mode**: Continue operation even without network connectivity
- **Hardware Control**: Precise servo control for accurate dispensing
- **User Feedback**: OLED display and audio alerts for patient guidance

## 🔧 Hardware Requirements

### Central Hub (Raspberry Pi 4)

- Raspberry Pi 4 (4GB+ RAM recommended)
- MicroSD card (32GB+)
- Ethernet connection or WiFi
- Power supply

### Each Dispenser Unit

- Raspberry Pi Zero 2W
- 6x Continuous rotation servos
- 128x64 OLED display (I2C)
- MFRC522 RFID reader
- Piezo buzzer
- PCA9685 servo driver board
- 4.5/5V power supply (3A+)

## 🛠️ Development

### Tech Stack

- **Frontend**: Next.js, TypeScript, TailwindCSS, DaisyUI
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: SQLite
- **IoT Communication**: MQTT, WebSockets
- **Hardware Control**: Python, RPi.GPIO, Adafruit libraries

### Project Structure

```
medipi/
├── src/                    # Next.js application source
│   ├── app/               # App router pages
│   ├── components/        # React components
│   ├── lib/              # Utilities and services
│   └── types/            # TypeScript definitions
├── dispenser/             # Dispenser Python code
│   ├── controllers/      # Hardware control modules
│   └── medipi_dispenser.py
```

## 🙏 Acknowledgments

- Developed as part of the Embedded Systems course project

---

## ⚠️ Disclaimer

<div align="center">
  <p><strong>⚠️ IMPORTANT NOTICE ⚠️</strong></p>
  <p>The current version is an <strong>early prototype</strong> and <strong>MUST NOT</strong> be used in real healthcare settings.</p>
  <p>This system is for educational and demonstration purposes only.</p>
</div>
