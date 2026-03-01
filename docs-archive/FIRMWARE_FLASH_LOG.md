# Firmware Flash Log - Production v1.2.1

## Session Summary
**Date:** February 11, 2026  
**Firmware Version:** 1.2.1-prod  
**WiFi Network:** REDACTED_WORKSHOP_WIFI_SSID  
**Server:** xibo.space.nova-labs.org/api/sound  

---

## Flashed Sensors

### Batch 1 (Earlier in session)
- **Port:** /dev/cu.usbmodem211301 (first flash)
- **Port:** /dev/cu.usbmodem21201
- **Port:** /dev/cu.usbmodem21401 (first flash)
- **Status:** Successfully flashed, devices not identified during first batch
- **MAC/Nickname:** Unable to capture during flash (bootloader mode)

### Batch 2 (Final identification run)
| Nickname | MAC Address         | USB Port              | Status  |
|----------|---------------------|-----------------------|---------|
| Green    | 08:92:72:84:1d:50  | /dev/cu.usbmodem211301 | ✅ Success |
| Purple   | 08:92:72:84:1e:4c  | /dev/cu.usbmodem21401  | ✅ Success |

---

## Flashing Results

### Total Flashed: 5 sensors
- Batch 1: 3 sensors (flashed successfully, identification incomplete)
- Batch 2: 2 sensors (flashed + identified: **Green**, **Purple**)

### Known Flashed Sensors:
1. ✅ **Green** (08:92:72:84:1d:50)
2. ✅ **Purple** (08:92:72:84:1e:4c)

### Sensors from Batch 1 (Need Identification):
3. ❓ Unknown sensor #1 (flashed on /dev/cu.usbmodem211301 - first attempt)
4. ❓ Unknown sensor #2 (flashed on /dev/cu.usbmodem21201)
5. ❓ Unknown sensor #3 (flashed on /dev/cu.usbmodem21401 - first attempt)

**Note:** Batch 1 sensors were successfully flashed but couldn't be identified because devices in bootloader mode don't output serial data. These can be identified by checking the dashboard for devices showing firmware v1.2.1-prod (besides Green and Purple).

---

## Remaining Sensors (Still on v1.1.1)

Based on the 9 registered sensors, the following likely remain on firmware v1.1.1:

- Blue (08:92:72:84:1c:ec) - **BUT verified posting data on 1.2.1?**
- Yellow (08:92:72:84:1d:18)
- Grey (08:92:72:84:1d:1c)
- Orange (08:92:72:84:1d:4c)
- Red (08:92:72:84:1d:84)
- Black (08:92:72:84:1d:d4)
- Pink (08:92:72:84:1e:34)

**Note:** Some of these may have been the 3 unidentified sensors from Batch 1.

---

## Identification Methods

### Method 1: Serial Detection (Used Successfully)
- Flash the sensor
- Immediately read serial output while sensor boots
- Parse MAC address from boot messages
- Look up nickname from device database
- **Success Rate:** 100% when sensors boot normally after flash

### Method 2: Power Cycle + Dashboard Check
For unidentified sensors:
1. Check current dashboard at http://xibo.space.nova-labs.org/sound/
2. Look for devices with firmware version 1.2.1-prod
3. Compare against known flashed sensors (Green, Purple)
4. Remaining 1.2.1-prod devices are the 3 from Batch 1

---

## Configuration Details

### WiFi Settings
```
SSID: REDACTED_WORKSHOP_WIFI_SSID
Security: WPA2-PSK
Frequency: 2.4 GHz
```

### Server Endpoint
```
Base URL: http://xibo.space.nova-labs.org/api/sound
POST Endpoint: /api/data/measurements
GET Devices: /api/devices
```

### Firmware Features (v1.2.1-prod)
- ESP32-C3 optimized
- SPL measurement and calibration
- WiFi auto-reconnect
- Automatic device registration
- OTA update capability (future)
- Dual PDM microphone support

---

## Next Steps

### 1. Identify Batch 1 Sensors
```bash
# SSH to xibo server and check device list
ssh xibo.space.nova-labs.org
cd /opt/sound-monitoring-mesh/backend/data/devices
grep -l '"firmware_version": "1.2.1"' *.json
```

### 2. Flash Remaining Sensors
When more sensors are connected via USB:
```bash
python3 /tmp/flash_and_identify.py
```

### 3. Verify Operation
- Dashboard: http://xibo.space.nova-labs.org/sound/
- Debug Page: http://xibo.space.nova-labs.org/sound/debug.html
- Check all sensors are posting measurements
- Verify SPL readings are realistic

---

## Troubleshooting

### Sensor Won't Connect to WiFi
- Verify REDACTED_WORKSHOP_WIFI_SSID is 2.4 GHz (not 5 GHz)
- Check signal strength at sensor location
- Confirm WiFi credentials in sdkconfig
- Try power cycle (unplug, wait 5s, replug)

### Dashboard Not Showing Sensor
- Wait 30 seconds for first data post
- Check backend logs: `/opt/sound-monitoring-mesh/backend/data/logs/combined.log`
- Verify sensor POSTing: check for MAC address in logs
- Try debug page to test API connectivity

### Flash Fails
- Check USB cable connection
- Verify sensor in bootloader mode (auto-triggered)
- Try different USB port
- Check ESP-IDF installation: `. $HOME/esp/esp-idf/export.sh`

---

## Files Reference

### Firmware
- Source: `firmware/sound-level-sensor/`
- Config: `firmware/sound-level-sensor/sdkconfig`
- Build: `firmware/sound-level-sensor/build/`

### Device Data
- Registrations: `backend/data/devices/*.json`
- Measurements: `backend/data/measurements/*.json`
- Firmware Versions: `backend/data/firmware/versions-prod.json`

### Flash Scripts
- Python Script: `/tmp/flash_and_identify.py`
- Identification: Auto-detects MAC from serial output
- Summary: This file

---

**Last Updated:** 2026-02-11  
**Script Version:** flash_and_identify.py v1.0
