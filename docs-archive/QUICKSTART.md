# Sound Level Mesh System - Quick Start Guide

Complete setup guide for the Sound Level Mesh System.

## System Overview

- **Firmware**: ESP32-C3 with INMP441 microphone
- **Backend**: Node.js API server (Port 3000)
- **Frontend**: Web dashboard (Port 8080)
- **Network**: Home WiFi connecting all components

## Prerequisites Installed ✅

All development tools are already installed on your MacBook:
- ESP-IDF v6.1-dev-2300
- Node.js v23.11.0
- Python 3.12.8
- All build tools (cmake, ninja, dfu-util)

## Quick Start

### 1. Start the Backend API Server

```bash
cd backend

# Install dependencies (first time only)
npm install

# Start the server
PORT=3000 npm start
```

Backend will be running at **http://localhost:3000**

### 2. Start the Frontend

```bash
cd frontend

# Start simple HTTP server
python3 -m http.server 8080
```

Frontend will be available at **http://localhost:8080**

### 3. Configure the Frontend

1. Open http://localhost:8080 in your browser
2. Go to Settings tab
3. Ensure API URL is set to: `http://localhost:3000`
4. Click "Save Configuration"

### 4. Register Your ESP32 Device

1. Go to the "Devices" tab in the web interface
2. Click "Register New Device"
3. Fill in:
   - **Device ID**: `esp32_001`
   - **MAC Address**: (your ESP32's MAC address)
   - **Name**: `Living Room Sensor` (or any name)
   - **Location**: `Living Room, North Wall` (or any location)
4. Click "Register Device"
5. **IMPORTANT**: Copy and save the API Key shown - you'll need it next!

### 5. Configure and Flash ESP32 Firmware

```bash
cd firmware/sound-level-sensor

# Activate ESP-IDF environment
. $HOME/esp/esp-idf/export.sh

# Configure the project
idf.py menuconfig
```

In menuconfig, navigate to "Sound Level Sensor Configuration" and set:
- **WiFi SSID**: Your home WiFi network name (e.g., `YOUR_WIFI_SSID`)
- **WiFi Password**: Your home WiFi password
- **Backend Server URL**: `http://192.168.68.57:3000` (your MacBook's IP - verify with `ifconfig`)
- **API Key**: (paste the API key from step 4)

**Important:** Get your MacBook's IP address:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}'
```

Save and exit (press 'S' then 'Q').

```bash
# Build and flash
idf.py build
idf.py -p /dev/tty.usbserial-* flash monitor
```

(Replace `/dev/tty.usbserial-*` with your actual port - check with `ls /dev/tty.*`)

### 6. Monitor the System

1. Watch the ESP32 serial monitor for connection status
2. Open the web dashboard (http://localhost:8080)
3. You should see your device appear on the Dashboard
4. Sound level measurements will start appearing within 5 seconds

## Troubleshooting

### VPN Software Interference

**Problem:** ESP32 cannot connect to backend server, connection timeouts or "Connection reset by peer" errors.

**Solution:** VPN software can interfere with local network routing. Disconnect any VPN connections and restart:
```bash
# Kill and restart backend
lsof -ti :3000 | xargs kill -9 2>/dev/null
cd backend && node src/server.js

# Kill and restart frontend
lsof -ti :8080 | xargs kill -9 2>/dev/null
cd frontend && python3 -m http.server 8080

# Reset ESP32 (re-flash or press reset button)
```

### Network Configuration

**Verify MacBook IP Address:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}'
```

**Check Backend is Accessible:**
```bash
curl http://localhost:3000/health
```

**Check Firmware Configuration:**
```bash
cd firmware/sound-level-sensor
grep "CONFIG_SERVER_URL" sdkconfig.defaults
```

### Serial Monitor Issues

**Find ESP32 USB Port:**
```bash
ls /dev/cu.usbmodem*
```

**Monitor Serial Output:**
```bash
stty -f /dev/cu.usbmodem2101 115200 && cat /dev/cu.usbmodem2101
```

## Network Configuration

Your current setup:
- **MacBook WiFi IP**: 192.168.68.67
- **Backend API**: http://192.168.68.67:3000 (ESP32 connects here)
- **Backend Local**: http://localhost:3000 (browser uses this)
- **Frontend**: http://localhost:8080

## Troubleshooting

### Backend won't start
- Check if port 3000 is available: `lsof -i :3000`
- Try a different port: `PORT=3001 npm start`
- Check logs in `backend/data/logs/`

### Frontend can't connect to backend
- Verify backend is running: `curl http://localhost:3000/health`
- Check API URL in Settings tab
- Check browser console for errors (F12)

### ESP32 won't connect to WiFi
- Verify SSID and password in menuconfig
- Check that your WiFi is 2.4GHz (ESP32-C3 doesn't support 5GHz)
- Monitor serial output for error messages: `idf.py monitor`

### ESP32 can't reach backend
- Verify MacBook IP hasn't changed: `ipconfig getifaddr en0`
- Update server URL in menuconfig if IP changed
- Check firewall isn't blocking port 3000
- Test from terminal: `curl http://192.168.68.67:3000/health`

### No audio data from microphone
- Check I2S wiring (GPIO 4, 5, 6)
- Verify 3.3V power connection
- Ensure L/R pin connected to GND
- Check serial monitor for I2S errors

## Testing

### Test Backend API
```bash
# Health check
curl http://localhost:3000/health

# List devices
curl http://localhost:3000/api/devices
```

### Test Frontend
1. Open http://localhost:8080
2. Check Dashboard shows stats
3. Register a test device
4. View device in Devices tab

### Test ESP32
1. Watch serial monitor
2. Look for "WiFi connected" message
3. Look for "HTTP POST Status = 200" messages
4. Check Dashboard for device card with data

## Next Steps

1. **Calibrate your sensor**: 
   - Go to Devices tab → Edit device
   - Adjust calibration offset if needed

2. **Configure frequency bands**:
   - Modify ranges in ESP32 firmware
   - Or update via API

3. **Set up multiple devices**:
   - Repeat registration and flashing for each ESP32
   - Use unique device IDs (esp32_002, esp32_003, etc.)

4. **Production deployment**:
   - See architecture docs for Ubuntu server deployment
   - Configure Nginx as reverse proxy
   - Set up systemd services

## Project Structure

```
sound monitoring mesh/
├── firmware/                   # ESP32-C3 firmware
│   └── sound-level-sensor/
│       ├── main/
│       │   ├── main.c          # Main firmware code
│       │   ├── CMakeLists.txt
│       │   └── Kconfig.projbuild
│       └── README.md
├── backend/                    # Node.js API server
│   ├── src/
│   │   ├── server.js           # Main server
│   │   ├── routes/             # API routes
│   │   ├── models/             # Data models
│   │   └── utils/              # Utilities
│   ├── data/                   # Data storage
│   ├── package.json
│   ├── .env                    # Configuration
│   └── README.md
├── frontend/                   # Web dashboard
│   ├── index.html
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── api.js
│   │   └── app.js
│   └── README.md
└── QUICKSTART.md              # This file
```

## Support

- Check individual component READMEs for detailed information
- Review architecture documentation for system design
- Check hardware design docs for wiring diagrams

## License

TBD
