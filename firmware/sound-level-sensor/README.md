# Sound Level Sensor - ESP32-C3 Firmware

ESP32-C3 firmware for sound level monitoring with INMP441 I2S microphone.

## Features

- I2S audio sampling from INMP441 microphone (16kHz, 32-bit)
- FFT-based frequency analysis (1024 points with Hamming window)
- Configurable frequency bands (default: 20-200Hz, 200-2000Hz, 2000-8000Hz)
- dB level calculation with calibration support
- WiFi connectivity with automatic reconnection
- HTTP client with retry logic (3 attempts with exponential backoff)
- NTP time synchronization
- Robust error handling and connection management

## Hardware Configuration

- **ESP32-C3 SuperMini**
- **INMP441 I2S Microphone**

### Wiring (ESP32-C3 to INMP441)
- GPIO 4 → SD (I2S Data)
- GPIO 5 → SCK (I2S Clock)
- GPIO 6 → WS (Word Select)
- 3.3V → VDD
- GND → GND
- GND → L/R (Left channel select)

## Building and Flashing

### Prerequisites
- ESP-IDF v5.0 or later installed
- ESP32-C3 connected via USB

### Configure the Project

```bash
cd firmware/sound-level-sensor
. $HOME/esp/esp-idf/export.sh
idf.py menuconfig
```

Navigate to "Sound Level Sensor Configuration" and set:
- WiFi SSID (your home WiFi network name)
- WiFi Password
- Backend Server URL (e.g., `http://192.168.68.67:3000`)
- API Key (obtain from backend server)

### Build and Flash

```bash
# Build
idf.py build

# Flash to ESP32-C3 (replace port as needed)
idf.py -p /dev/tty.usbserial-* flash

# Monitor serial output
idf.py -p /dev/tty.usbserial-* monitor
```

### Build, Flash, and Monitor (all in one)

```bash
idf.py -p /dev/tty.usbserial-* flash monitor
```

## Configuration

Edit via `idf.py menuconfig` under "Sound Level Sensor Configuration":

- **WiFi SSID**: Your WiFi network name
- **WiFi Password**: Your WiFi password
- **Server URL**: Backend API server URL (e.g., `http://192.168.68.57:3000`)
- **API Key**: Authentication token for backend API

### HTTP Communication Settings

The firmware includes robust HTTP communication with the following configuration:

- **Connection Timeout**: 10 seconds
- **Retry Attempts**: 3 maximum retries
- **Retry Delay**: Exponential backoff (2s, 4s, 8s)
- **Keep-Alive**: Disabled (forces fresh connections)
- **Transport Type**: HTTP_TRANSPORT_OVER_TCP
- **Connection Header**: "Connection: close"

These settings ensure reliable communication even in challenging network conditions.

## Data Format

The firmware sends JSON data to `POST /api/data/measurements`:

```json
{
  "device_id": "esp32_001",
  "timestamp": "2026-01-30T18:00:00Z",
  "db_level": 65.5,
  "db_level_raw": 65.5,
  "frequency_bands": [
    {
      "band_number": 1,
      "start_freq": 20,
      "end_freq": 200,
      "level": 45.2,
      "level_raw": 45.2
    },
    {
      "band_number": 2,
      "start_freq": 200,
      "end_freq": 2000,
      "level": 52.1,
      "level_raw": 52.1
    },
    {
      "band_number": 3,
      "start_freq": 2000,
      "end_freq": 8000,
      "level": 48.3,
      "level_raw": 48.3
    }
  ]
}
```

## Troubleshooting

### Can't find serial port
- Check USB connection
- Verify driver installation: `ls /dev/tty.*`
- Try different USB port or cable

### Build errors
- Ensure ESP-IDF environment is activated: `. $HOME/esp/esp-idf/export.sh`
- Clean build: `idf.py fullclean && idf.py build`

### WiFi connection issues
- Verify SSID and password in menuconfig
- Check 2.4GHz WiFi availability (ESP32-C3 doesn't support 5GHz)
- Monitor serial output for connection status

### No audio data
- Verify I2S wiring connections
- Check microphone power (3.3V)
- Ensure L/R pin is connected to GND

## License

TBD
