# Flashing Multiple ESP32 Devices

## ✅ One Build for All Devices

**Good news!** You can now flash all 10 ESP32 devices with the same firmware build. The firmware has been modified to automatically use each ESP32's unique MAC address as its device ID.

## How It Works

Each ESP32 has a unique MAC address burned in at the factory (e.g., `08:92:72:84:1d:18`). The firmware now:
1. Reads the MAC address at startup
2. Uses it as the device ID (format: `08:92:72:84:1d:18`)
3. Registers with the backend using this unique identifier

## Flashing Process

### 1. Build Once
```bash
cd firmware/sound-level-sensor
# Source ESP-IDF environment
. $HOME/esp/esp-idf/export.sh

# Configure WiFi and server settings (only needed once)
idf.py menuconfig
# Set: WiFi SSID, WiFi Password, Server URL, API Key

# Build the firmware
idf.py build
```

### 2. Flash All Devices
Connect each ESP32 one at a time and flash with the same binary:

```bash
# Device 1
idf.py -p /dev/cu.usbmodem1201 flash

# Device 2 (port may change)
idf.py -p /dev/cu.usbmodem1401 flash

# Device 3
idf.py -p /dev/cu.usbmodem1101 flash

# ... and so on for all 10 devices
```

### 3. Verify Each Device
Monitor the serial output to see the unique device ID:

```bash
idf.py -p /dev/cu.usbmodem1201 monitor
```

You should see:
```
I (xxx) SOUND_SENSOR: Device ID: 08:92:72:84:1d:18
```

## Quick Flash Script

Create a script to make flashing easier:

```bash
#!/bin/bash
# flash_next_device.sh

echo "Connect next ESP32 and press Enter..."
read

PORT=$(ls /dev/cu.usb* | head -n 1)
echo "Flashing to $PORT..."

cd firmware/sound-level-sensor
idf.py -p $PORT flash monitor
```

## Device Identification

After flashing all devices, each will appear in your backend with its MAC address:
- Device 1: `08:92:72:84:1d:18`
- Device 2: `08:92:72:84:2a:3c`
- Device 3: `08:92:72:84:1f:92`
- etc.

You can then label them in your monitoring dashboard for easier identification.

## Benefits

✅ **One build** - saves time and ensures consistency  
✅ **No configuration per device** - fully automated  
✅ **Unique IDs** - factory-guaranteed uniqueness  
✅ **Easy scaling** - add more devices anytime  

## Notes

- WiFi credentials and server URL are the same for all devices
- Each device auto-registers with its MAC address
- The backend will see 10 different devices automatically
- No need to track which firmware goes to which device
