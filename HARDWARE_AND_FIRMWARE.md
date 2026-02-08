# Hardware & Firmware Guide

Complete guide for hardware setup, wiring, firmware building, flashing, and device management for the Sound Level Mesh System.

**System Status:** ✅ Operational with multiple devices actively collecting data

## Table of Contents
1. [Hardware Components](#hardware-components)
2. [Component Pinouts & Wiring](#component-pinouts--wiring)
3. [Firmware Building](#firmware-building)
4. [Flashing Multiple Devices](#flashing-multiple-devices)
5. [Device Registration](#device-registration)
6. [Firmware Features](#firmware-features)
7. [Troubleshooting](#troubleshooting)

---

## Hardware Components

### Bill of Materials (Per Sensor Node)
- **1x ESP32-C3 SuperMini** - RISC-V microcontroller with WiFi
- **1x INMP441** - I2S digital MEMS microphone module  
- **1x USB-C cable** - For programming and power
- **Jumper wires** - For connecting microphone to ESP32

### ESP32-C3 SuperMini Specifications
- **MCU**: ESP32-C3 (RISC-V, single-core, 160 MHz)
- **RAM**: 400 KB SRAM
- **Flash**: 4 MB
- **WiFi**: 802.11 b/g/n (2.4 GHz)
- **GPIO**: 13 available pins
- **USB**: Built-in USB-CDC (no external USB-UART needed)
- **Power**: 5V via USB-C or 3.3V direct
- **Size**: Compact SuperMini form factor

### INMP441 I2S Microphone Specifications
- **Type**: Digital MEMS omnidirectional microphone
- **Interface**: I2S (Inter-IC Sound)
- **Sensitivity**: -26 dBFS
- **SNR**: 61 dB
- **Dynamic Range**: 83 dB
- **Frequency Response**: 60 Hz to 15 kHz
- **Supply Voltage**: 1.8V to 3.3V
- **Current**: ~1.4 mA

---

## Component Pinouts & Wiring

### ESP32-C3 SuperMini Pinout

**Physical Orientation**: Hold board with USB-C connector facing UP, chip facing YOU.

#### Complete Pin Table

| Pin Label | GPIO    | Physical Position   | Function / Notes                          |
|-----------|---------|---------------------|-------------------------------------------|
| **5V**    | -       | Right Side, Pin 1   | 5V Power Input (from USB or external)     |
| **GND**   | -       | Right Side, Pin 2   | Ground                                     |
| **3V3**   | -       | Right Side, Pin 3   | 3.3V Output (Regulated) or Input          |
| **0**     | GPIO 0  | Right Side, Pin 4   | ADC1_CH0, Digital I/O                     |
| **1**     | GPIO 1  | Right Side, Pin 5   | ADC1_CH1, Digital I/O                     |
| **2**     | GPIO 2  | Right Side, Pin 6   | ⚠️ Strapping Pin (Keep floating at boot) |
| **3**     | GPIO 3  | Right Side, Pin 7   | ADC1_CH3, Digital I/O                     |
| **4**     | GPIO 4  | Right Side, Pin 8   | 🎤 **I2S_DATA (SD)** - Used for microphone |
| **5**     | GPIO 5  | Left Side, Pin 1    | 🎤 **I2S_BCK (SCK)** - Used for microphone |
| **6**     | GPIO 6  | Left Side, Pin 2    | 🎤 **I2S_WS (WS)** - Used for microphone  |
| **7**     | GPIO 7  | Left Side, Pin 3    | SS (SPI), Digital I/O                     |
| **8**     | GPIO 8  | Left Side, Pin 4    | ⚠️ Strapping Pin (Keep floating at boot) |
| **9**     | GPIO 9  | Left Side, Pin 5    | ⚠️ Strapping Pin (Keep floating at boot) |
| **10**    | GPIO 10 | Left Side, Pin 6    | Digital I/O                               |
| **20**    | GPIO 20 | Left Side, Pin 7    | UART0 RX (USB CDC)                        |
| **21**    | GPIO 21 | Left Side, Pin 8    | UART0 TX (USB CDC)                        |

### INMP441 Microphone Pinout

| Pin | Name | Function                    |
|-----|------|-----------------------------|
| 1   | VDD  | Power supply (1.8-3.3V)     |
| 2   | GND  | Ground                      |
| 3   | SD   | Serial Data (I2S_DATA)      |
| 4   | SCK  | Bit Clock (I2S_BCK)         |
| 5   | WS   | Word Select / L/R Clock     |
| 6   | L/R  | Channel select (GND = Left) |

### Wiring Connections

**ESP32-C3 → INMP441**

| ESP32-C3 Pin | INMP441 Pin | Wire Color (Suggested) |
|--------------|-------------|------------------------|
| 3V3          | VDD         | Red                    |
| GND          | GND         | Black                  |
| GPIO 4       | SD          | Yellow                 |
| GPIO 5       | SCK         | Blue                   |
| GPIO 6       | WS          | Green                  |
| GND          | L/R         | Black (same ground)    |

### Wiring Diagram (Text)
```
ESP32-C3 SuperMini              INMP441 Microphone
┌────────────────┐              ┌──────────────┐
│                │              │              │
│     3.3V   ●───┼──────────────┼─● VDD        │
│                │              │              │
│      GND   ●───┼──────┬───────┼─● GND        │
│                │      │       │              │
│  GPIO 4    ●───┼──────┼───────┼─● SD         │
│  (I2S_DATA)    │      │       │              │
│                │      │       │              │
│  GPIO 5    ●───┼──────┼───────┼─● SCK        │
│  (I2S_BCK)     │      │       │              │
│                │      │       │              │
│  GPIO 6    ●───┼──────┼───────┼─● WS         │
│  (I2S_WS)      │      │       │              │
│                │      └───────┼─● L/R        │
│                │              │              │
└────────────────┘              └──────────────┘
```

### Important Notes
- ⚠️ **Strapping Pins**: GPIO 2, 8, and 9 must be floating or pulled correctly during boot
- ⚠️ **L/R Pin**: Connect to GND to set microphone as Left channel
- ⚠️ **Power**: Use 3.3V output from ESP32-C3, NOT 5V
- ⚠️ **Cable Length**: Keep wires short (<15cm) to reduce noise

---

## Firmware Building

### Prerequisites

#### Install ESP-IDF (macOS)
```bash
# Install dependencies
brew install cmake ninja dfu-util

# Clone ESP-IDF
mkdir -p ~/esp
cd ~/esp
git clone -b v5.3 --recursive https://github.com/espressif/esp-idf.git

# Install ESP-IDF tools
cd esp-idf
./install.sh esp32c3

# Add to shell profile (~/.zshrc or ~/.bash_profile)
alias get_idf='. $HOME/esp/esp-idf/export.sh'
```

### Configure the Project

```bash
cd firmware/sound-level-sensor

# Source ESP-IDF environment
. $HOME/esp/esp-idf/export.sh

# Configure project (opens menu)
idf.py menuconfig
```

#### Configuration Menu Settings

Navigate to: **Sound Level Sensor Configuration**

**Required Settings:**
- **WiFi SSID**: Your WiFi network name
- **WiFi Password**: Your WiFi password  
- **Server URL**: Backend API URL (e.g., `http://192.168.68.57:3000`)
- **API Key**: Shared authentication key (use same key for all devices)

**Shared API Key Approach:**
- ⚠️ **IMPORTANT**: All devices use the **same API key** hardcoded in firmware
- This allows flashing the same firmware to all devices without modification
- Current deployment: 9 operational devices (10 purchased)
- Each device is uniquely identified by its MAC address (e.g., `08:92:72:84:1d:18`)
- Example shared key: `YOUR_API_KEY_HERE`
- Backend must have matching key in `.env` as `SHARED_API_KEY` or `API_KEY`

**Production Environment (Nova Labs):**
- **WiFi SSID**: `YOUR_WORKSHOP_WIFI`
- **WiFi Password**: `YOUR_WORKSHOP_PASSWORD`
- **Server URL**: TBD (configure when server is set up)
- **API Key**: `YOUR_API_KEY_HERE` (or your chosen shared key)

⚠️ **Security Note**: These credentials are for the isolated IoT network at Nova Labs. The shared API key approach is suitable for trusted, internal networks only.

**Optional Settings (ESP-IDF standard menus):**
- Serial flasher config → Flash size: 4MB
- Component config → ESP32C3-Specific → CPU frequency: 160 MHz
- Component config → FreeRTOS → Tick rate: 1000 Hz

Save and exit (press `S`, then `Q`)

### Build the Firmware

```bash
# Clean build (if needed)
idf.py fullclean

# Build firmware
idf.py build
```

**Build Output:**, ~30 seconds (incremental)

**Current Firmware Version:**
- I2S sampling: 16kHz, 32-bit
- FFT: 1024 points with Hamming window
- Frequency bands: 3 configurable ranges
- Network: WiFi with HTTP client and NTP sync
- Authentication: Shared API key
- Auto-identification: MAC address-based device ID
- Binary file: `build/sound-level-sensor.bin`
- ELF file: `build/sound-level-sensor.elf`
- Build time: ~2-5 minutes (first build)

---

## Flashing Multiple Devices

### ✨ One Build for All Devices

The firmware automatically uses each ESP32's unique MAC address as its device ID. This means you can:

1. **Build once**
2. **Flash all 10 ESP32 devices** with the same binary
3. Each device **automatically identifies itself** with its unique MAC address (e.g., `08:92:72:84:1d:18`)

### Single Device Flash

```bash
# Find device port
ls /dev/cu.usb*

# Flash and monitor
idf.py -p /dev/cu.usbmodem1201 flash monitor

# Or flash only
idf.py -p /dev/cu.usbmodem1201 flash
```

### Flashing Multiple Devices - Manual Method

Connect and flash each device one at a time:

```bash
# Device 1
idf.py -p /dev/cu.usbmodem1201 flash monitor
# Note the MAC address from serial output!

# Disconnect device 1, connect device 2
idf.py -p /dev/cu.usbmodem1401 flash monitor
# Note the MAC address!

# Repeat for each additional device
# (9 devices currently deployed)
```

### Automated Flashing Script

Create `flash_next.sh`:

```bash
#!/bin/bash
echo "===================="
echo "ESP32 Mass Flasher"
echo "===================="
echo ""
echo "Connect next ESP32 and press Enter..."
read

# Find the USB port
PORT=$(ls /dev/cu.usb* 2>/dev/null | head -n 1)

if [ -z "$PORT" ]; then
    echo "❌ No USB device found!"
    exit 1
fi

echo "✅ Found device at: $PORT"
echo ""
echo "Flashing firmware..."
cd firmware/sound-level-sensor
idf.py -p $PORT flash monitor

echo ""
echo "Device flashed! Make note of the MAC address above."
echo ""
```

Make executable and run:
```bash
chmod +x flash_next.sh
./flash_next.sh
```

### Verifying Flash

When monitoring serial output, you should see:

```
I (xxx) SOUND_SENSOR: Sound Level Sensor Starting...
I (xxx) SOUND_SENSOR: Device ID: 08:92:72:84:1d:18
I (xxx) SOUND_SENSOR: Connecting to WiFi...
I (xxx) SOUND_SENSOR: WiFi connected
I (xxx) SOUND_SENSOR: IP address: 192.168.1.XXX
I (xxx) SOUND_SENSOR: Fetching configuration from server...
```

**Record each MAC address** - you'll need them for registration!

### Flash Time Estimates
- **Per device**: ~30 seconds flash + 1 minute testing = ~90 seconds
- **Single device**: ~2-3 minutes
- **Multiple devices**: ~2-3 minutes per device (sequential)
- **9 operational devices**: ~15-20 minutes total

---

## Device Registration

**⚠️ Important: Shared API Key System**

This system uses a **shared API key** approach where all devices use the same API key compiled into the firmware. Each device is uniquely identified by its MAC address.

### How Device IDs Work

Each ESP32 has a **factory-burned unique MAC address** that cannot be changed. The firmware reads this at startup and uses it as the device ID in format: `08:92:72:84:1d:18`

### Registration Methods

#### Option 1: Frontend Web Interface (Recommended)

1. **Start Backend Server**
   ```bash
   cd backend
   npm start
   ```

2. **Open Frontend** in browser: `http://localhost:3000`

3. **Navigate** to "Devices" tab

4. **Click** "Register Device" button

5. **Fill in form:**
   - **Device ID**: MAC address from serial output (e.g., `08:92:72:84:1d:18`)
   - **MAC Address**: Same as device ID
   - **Name**: Friendly name (e.g., "Front Door Sensor", "Manufacturing Floor 1")
   - **Location**: Physical location (e.g., "Building A - Main Entrance")

6. **Save** - Backend automatically assigns the shared API key (matches firmware CONFIG_API_KEY)

7. **Verify** - Device should appear in devices list and start sending data within 5-10 seconds

#### Option 2: Direct API Registration

```bash
curl -X POST http://localhost:3000/api/devices/register \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "08:92:72:84:1d:18",
    "mac_address": "08:92:72:84:1d:18",
    "name": "Sensor 01",
    "location": "Building A - Floor  from server (3 bands: 20-200Hz, 200-2000Hz, 2000-8000Hz)
- Apply calibration settings (if configured)
- Start sending measurements every 5 seconds
- Sync time via NTP
- Reconnect automatically if WiFi drops

### Current Deployment Status

**Operational Devices:** 9 sensors actively sending data
**Data Collection:** Real-time measurements every 5 seconds
**Features Active:**
- dB level monitoring
- 3-band frequency analysis
- Timestamp synchronization
- Automatic reconnection
- Calibration offset applied

### Device List Example

| Device ID           | Name                  | Location                   |
|---------------------|-----------------------|----------------------------|
| 08:92:72:84:1d:18   | Front Entrance        | Building A - Main Door     |
| 08:92:72:84:2a:3c   | Conference Room A     | Building A - 2nd Floor     |
| 08:92:72:84:1f:92   | Manufacturing Floor   | Building B - Production    |
| ... (6 more)        | ...                   | ...                        |

---

## Firmware Features

### Current Capabilities

**Audio Processing:**
- 16kHz sampling rate (optimal for speech/environmental sounds)
- 32-bit I2S interface with INMP441 microphone
- 1024-point FFT with Hamming window
- dB calculation: 20 * log10(RMS amplitude)
- Configurable calibration offset

**Frequency Band Analysis:**
- Band 1: 20-200 Hz (Low frequencies - vehicle noise, machinery)
- Band 2: 200-2000 Hz (Mid frequencies - speech, music)
- Band 3: 2000-8000 Hz (High frequencies - alarms, mechanical sounds)
- Per-band dB levels calculated separately
- Configurable via backend API

**Network Features:**
- WiFi auto-connect with retry logic
- HTTP client with exponential backoff (3 retries)
- NTP time synchronization
- JSON payload formatting
- Shared API key authentication
- MAC address auto-detection

**Data Transmission:**
- Measurements sent every 5 seconds
- Timestamp: ISO 8601 format
- Overall dB + 3 frequency bands
- Reliable delivery with retry mechanism
- Backend validates and stores data

**Error Handling:**
- WiFi disconnect recovery
- HTTP timeout handling (30 seconds)
- Microphone failure detection
- Automatic restart on critical errors
- Serial logging for debugging

### Device List Example

| Device ID           | Name                  | Location                   |
|---------------------|-----------------------|----------------------------|
| 08:92:72:84:1d:18   | Front Entrance        | Building A - Main Door     |
| 08:92:72:84:2a:3c   | Conference Room A     | Building A - 2nd Floor     |
| 08:92:72:84:1f:92   | Manufacturing Floor   | Building B - Production    |
| 08:92:72:85:3b:1a   | Loading Dock          | Building B - Rear Entrance |
| 08:92:72:86:4c:2b   | Office Area           | Building A - 3rd Floor     |
| ... (5 more)        | ...                   | ...                        |

---

## Troubleshooting

### ESP-IDF Not Found
```bash
# Re-source the environment
. $HOME/esp/esp-idf/export.sh

# Or add to ~/.zshrc:
alias get_idf='. $HOME/esp/esp-idf/export.sh'
source ~/.zshrc
get_idf
```

### Build Errors

**Error: `idf.py: command not found`**
```bash
. $HOME/esp/esp-idf/export.sh
```

**Error: `CMake Error`**
```bash
brew install cmake ninja
idf.py fullclean
idf.py build
```

**Error: `esp_driver_i2s not found`**
- Update ESP-IDF to v5.3+: `cd ~/esp/esp-idf && git pull`

### Flash Errors

**Error: `Failed to connect to ESP32-C3`**
1. Check USB cable (try different cable)
2. Hold BOOT button while connecting USB
3. Try different USB port
4. Check device appears: `ls /dev/cu.usb*`

**Error: `A fatal error occurred: Could not open port`**
```bash
# Kill any process using the port
lsof | grep usbmodem
kill -9 <PID>

# Or unplug and replug USB
```

**Error: `Timeout waiting for packet content`**
- Device may be in deep sleep
- Unplug and replug USB
- Hold BOOT button and press RESET

### Runtime Errors

**Device ID not showing**
```
I (xxx) SOUND_SENSOR: Device ID: 08:92:72:84:1d:18
```
- If not shown, firmware wasn't rebuilt with MAC address changes
- Run `idf.py fullclean && idf.py build`

**WiFi not connecting**
- Check SSID and password in menuconfig
- Verify 2.4 GHz network (ESP32-C3 doesn't support 5 GHz)
- Check WiFi signal strength
- Monitor serial output for error details

**Cannot reach server**
- Verify server URL in menuconfig
- Check backend is running: `curl http://192.168.68.57:3000/health`
- Ping server from ESP32 network
- Check firewall settings

**Device not sending measurements**
- **Check device is registered** in backend:
  ```bash
  curl http://localhost:3000/api/devices/08:92:72:84:1d:18
  ```
- **Verify API key matches** between firmware and backend:
  - Firmware: Check `sdkconfig` for `CONFIG_API_KEY`
  - Backend: Check `.env` for `SHARED_API_KEY` or `API_KEY`
  - **They must match exactly!**
- **Monitor backend logs**: `cd backend && npm start`
- **Check serial output** for HTTP error codes:
  - 401: Missing/invalid authorization header
  - 403: Invalid API key (key mismatch between firmware and backend)
  - 404: Device not registered in backend

### Serial Monitor Commands

**View logs:**
```bash
idf.py -p /dev/cu.usbmodem1201 monitor
```

**Exit monitor:** `Ctrl+]`

**Clear screen and reset:** `Ctrl+T` then `Ctrl+R`

**Filter logs:**
```bash
idf.py monitor -p /dev/cu.usbmodem1201 | grep SOUND_SENSOR
```

### Hardware Issues

**No audio readings**
- Check INMP441 wiring (especially GND and 3.3V)
- Verify GPIO pins match firmware (4, 5, 6)
- Check L/R pin connected to GND
- Test microphone with loud sound

**Erratic readings**
- Shorten wire connections (<15cm)
- Twist I2S signal wires together
- Add 0.1µF capacitor near microphone VDD
- Keep away from EMI sources

**Device keeps resetting**
- Power supply issue - use quality USB cable
- Remove connections to strapping pins (GPIO 2, 8, 9)
- Check for short circuits

---

## Quick Reference Card

### Wiring (ESP32-C3 → INMP441)
```
3.3V → VDD
GND  → GND  
GPIO4 → SD   (I2S Data)
GPIO5 → SCK  (I2S Clock)
GPIO6 → WS   (Word Select)
GND  → L/R  (Channel Select)
```

### Common Commands
```bash
# Setup environment
. $HOME/esp/esp-idf/export.sh

# Configure
idf.py menuconfig

# Build
idf.py build

# Flash and monitor
idf.py -p /dev/cu.usbmodem1201 flash monitor

# Monitor only
idf.py -p /dev/cu.usbmodem1201 monitor

# Exit monitor
Ctrl+]
```

### Device ID Format
- MAC address: `08:92:72:84:1d:18`
- Unique per device
- Auto-generated at startup
- Used for registration and API calls

---

**Document Version**: 1.0  
**Last Updated**: February 7, 2026  
**Related Docs**: [README.md](README.md), [DEVELOPER_REFERENCE.md](DEVELOPER_REFERENCE.md)
