# Sound Level Mesh System - Architecture Document

## Document Information
- **Version:** 1.2
- **Date:** 2024 (Updated: February 1, 2026)
- **Status:** Active - Production Implementation
- **Author:** Engineering Team
- **Related Documents:** Sound Level Mesh System PRD
- **Latest Updates:** Dynamic frequency band configuration, enhanced visualization, analytics dashboard

---

## Important Note: PCB Design Approach

**Date:** January 30, 2026

**Lesson Learned:** Initial attempts to automate KiCad PCB generation through Python scripting proved overly complex and ultimately unsuccessful. While the KiCad Python API (pcbnew) exists, the complexity of automated PCB generation, combined with the limitations of AI assistance in this specialized domain, made this approach impractical.

**Decision:** For this project, we will use **breadboard or protoboard** assembly for the ESP32-C3 and INMP441 microphone modules. This approach is:
- Faster to implement and test
- More flexible for prototyping and debugging
- Appropriate for a 10-device deployment
- Easier to modify during development
- Well-documented in the Component Pinout Reference

**Recommendation:** For future projects requiring custom PCBs, consider:
- Manual PCB design using KiCad GUI (not automated)
- Working with professional PCB design services
- Using off-the-shelf breakout boards and protoboard
- Only investing in custom PCB design for production-scale deployments (100+ units)

The [Component Pinout Reference](COMPONENT_PINOUT_REFERENCE.md) document contains all necessary wiring information for breadboard/protoboard assembly.

---

## 1. Executive Summary

This document describes the technical architecture for the Sound Level Mesh System, a distributed monitoring solution consisting of 10 ESP32-based WiFi sensor devices communicating with a central web server. The architecture is designed for real-time sound level monitoring, configurable frequency band analysis, and flexible data management.

### Architecture Principles
- **Centralized Processing:** All data processing and storage occurs on the central server
- **Star Topology:** ESP32 devices connect directly to the central server via WiFi
- **RESTful Communication:** HTTP-based API for device-server communication (unencrypted)
- **Web-Based Interface:** Browser-accessible monitoring and administration
- **Configurable Design:** Flexible frequency band and retention period configuration

---

## 2. System Architecture Overview

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    WiFi Network (802.11)                     │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼──────┐   ┌────────▼────────┐   ┌─────▼──────┐
│  ESP32       │   │   ESP32         │   │  ESP32     │
│  Device 1    │   │   Device 2      │   │  Device N  │
│              │   │                 │   │  (up to 10)│
│  [Firmware]  │   │  [Firmware]     │   │  [Firmware]│
└───────┬──────┘   └────────┬────────┘   └─────┬──────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                    ┌───────▼────────┐
                    │  Central Web   │
                    │     Server     │
                    │                │
                    │  ┌──────────┐ │
                    │  │  Web App │ │
                    │  │ (Frontend)│ │
                    │  └──────────┘ │
                    │  ┌──────────┐ │
                    │  │  Backend │ │
                    │  │   API    │ │
                    │  └──────────┘ │
                    │  ┌──────────┐ │
                    │  │File System│ │
                    │  │  Storage  │ │
                    │  └──────────┘ │
                    └───────────────┘
```

### 2.2 Component Overview

The system consists of three main components:

1. **ESP32 Sensor Devices (10 units)**
   - Custom firmware for audio sampling and processing
   - WiFi connectivity for data transmission
   - Local audio processing (FFT for frequency bands)

2. **Central Web Server**
   - Backend API server
   - Web application (monitoring and admin interfaces)
   - File-based storage for data storage and configuration

3. **WiFi Infrastructure**
   - Access point/router connecting devices to server
   - Network security (WPA2/WPA3)

---

## 3. Component Architecture

### 3.1 ESP32 Device Architecture

#### Hardware Components
- **ESP32-C3 Microcontroller (Purchased)**
  - Single-core RISC-V 160 MHz processor
  - WiFi 802.11 b/g/n (2.4 GHz)
  - Bluetooth 5.0 LE
  - I2S interface for digital microphone connection (to be verified)
  - GPIO pins for sensor connections
  - USB-C interface
  - **Status:** 10 units purchased, awaiting delivery

- **Audio Input - MH-ET LIVE INMP441 I2S Digital Microphone Module (Purchased)**
  - **Status:** ✅ 10 units purchased, awaiting delivery
  - **Module Specifications:**
    - Omnidirectional MEMS microphone
    - Low noise, high precision design
    - I2S digital interface (no ADC required)
    - PDM (Pulse Density Modulation) output converted to I2S format
    - Operating voltage: 1.8V - 3.3V (typically 3.3V)
    - Sample rate: Up to 48 kHz
    - Bit depth: 24-bit
    - Signal-to-Noise Ratio (SNR): 65 dB
    - Sensitivity: -26 dBFS
  - **Pin Connections (INMP441 to ESP32-C3 - Verified):**
    - VDD → ESP32-C3 3.3V
    - GND → ESP32-C3 GND
    - SCK (Serial Clock) → ESP32-C3 GPIO 5 (I2S_BCLK)
    - WS (Word Select) → ESP32-C3 GPIO 6 (I2S_WS)
    - SD (Serial Data) → ESP32-C3 GPIO 4 (I2S_DATA)
    - L/R (Left/Right select) → ESP32-C3 GND (for mono/left channel)
  - **Connection Type:** Direct I2S digital connection (no analog components required)
  - **Status:** ✅ Verified and implemented in firmware. I2S peripheral confirmed functional on ESP32-C3.

- **Power Supply**
  - USB power (5V) or external power adapter
  - Optional: Battery backup for temporary operation

#### Firmware Architecture

```
┌─────────────────────────────────────────┐
│         ESP32 Firmware Stack             │
├─────────────────────────────────────────┤
│  Application Layer                       │
│  ├─ Audio Sampling                       │
│  ├─ FFT Processing (Frequency Bands)     │
│  ├─ dB Calculation                       │
│  ├─ Data Packaging                       │
│  └─ WiFi Communication                   │
├─────────────────────────────────────────┤
│  System Services                         │
│  ├─ WiFi Manager                         │
│  ├─ HTTP Client                          │
│  ├─ NTP Time Sync                        │
│  ├─ Configuration Manager                │
│  └─ Error Handling & Retry Logic         │
├─────────────────────────────────────────┤
│  Hardware Abstraction                    │
│  ├─ Audio Driver (I2S)                   │
│  ├─ WiFi Driver                          │
│  └─ System Timer                         │
├─────────────────────────────────────────┤
│  ESP-IDF Framework                        │
└─────────────────────────────────────────┘
```

#### Firmware Modules

1. **HTTP Communication Module**
   - **Connection Management:**
     - Timeout: 10 seconds per attempt
     - Maximum retries: 3 attempts
     - Retry delay: Exponential backoff (2s, 4s, 8s)
     - Keep-alive: Disabled (fresh connections per request)
     - Transport type: HTTP_TRANSPORT_OVER_TCP
     - Connection header: "Connection: close"
   - **Error Handling:**
     - Automatic retry on connection failures
     - Detailed error logging with symbols (✓/✗)
     - Handles ESP_ERR_HTTP_CONNECT errors
     - Recovers from network interruptions
   - **Data Submission:**
     - POST to /api/data/measurements endpoint
     - JSON payload with device_id, timestamp, dB levels, frequency bands
     - Bearer token authentication
     - Content-Type: application/json
   - **Network Considerations:**
     - Works on standard WiFi networks (WPA2/WPA3)
     - Compatible with DHCP IP assignment
     - May experience issues with VPN software on server machine
     - Requires both devices on same network or proper routing

2. **Audio Sampling Module**
   - **I2S Interface Configuration for INMP441:**
     - Sample rate: 16 kHz (INMP441 supports up to 48 kHz)
     - Bit depth: 32-bit containers (24-bit data left-aligned)
     - Channel format: Mono (left channel)
     - Communication format: I2S MSB standard mode
     - DMA buffer size: 1024 samples
     - DMA buffer count: 4
     - GPIO Pins: BCLK=GPIO5, WS=GPIO6, DATA=GPIO4
   - Continuous audio sampling via I2S DMA
   - 24-bit audio data reception from INMP441 in 32-bit containers
   - Buffer management for audio data (1024 samples per read)
   - Interrupt-driven I2S DMA for real-time processing
   - Data format conversion: 24-bit I2S data (right-shifted by 8) to float normalized -1.0 to 1.0
   - **Windowing:**
     - Hamming window applied before FFT
     - Reduces spectral leakage
     - Implemented in firmware

2. **Audio Processing Module**
   - **FFT (Fast Fourier Transform) for frequency analysis:**
     - FFT size: 256-1024 points (configurable, power of 2)
     - **Windowing Function:**
       - Apply window function to reduce spectral leakage
       - Window types: Hamming, Hanning, or Blackman (recommended: Hamming)
       - Window applied to time-domain samples before FFT
       - Compensates for window gain in frequency domain calculations
     - **Overlap Processing (Optional):**
       - Overlap-add or overlap-save technique for continuous analysis
       - 50% overlap recommended for smooth frequency response
       - Reduces edge effects from windowing
   - **Frequency Domain Processing:**
     - Magnitude calculation from FFT output
     - Power spectral density (PSD) computation
     - Frequency bin to Hz conversion: `frequency = (bin_index × sample_rate) / FFT_size`
   - dB calculation from frequency domain data
   - Frequency band filtering and level calculation
   - **Calibration Application:**
     - Apply calibration offset to overall dB measurement
     - Apply per-band calibration offsets (if configured)
     - Store both raw and calibrated values (optional)
   - A-weighting/C-weighting (optional)

3. **Configuration Module**
   - Device registration and authentication
   - Frequency band configuration storage (EEPROM/Flash)
   - Measurement interval configuration
   - **Calibration Configuration:**
     - Calibration offset storage (EEPROM/Flash)
     - Per-band calibration offset storage (if supported)
     - Calibration enable/disable flag
   - WiFi credentials management

4. **Communication Module**
   - HTTP client for API communication (unencrypted, using esp_http_client)
   - Data transmission to central server
   - Configuration retrieval from server
   - Retry logic and error handling
   - Connection status monitoring
   - WiFi connection management (esp_wifi)

5. **System Management Module**
   - NTP time synchronization
   - Watchdog timer
   - Error logging
   - OTA update capability (future)

### 3.2 Central Web Server Architecture

#### Server Components (Ubuntu 20.04 with Nginx)

```
┌─────────────────────────────────────────────────────┐
│         Ubuntu 20.04 Server with Nginx               │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │         Nginx Web Server (Port 80)           │  │
│  │  - Reverse Proxy                             │  │
│  │  - Static File Serving (Frontend)            │  │
│  │  - API Proxy to Backend                      │  │
│  └──────────────┬───────────────────────────────┘  │
│                 │                                    │
│  ┌──────────────▼───────────────────────────────┐  │
│  │         Web Application (Frontend)            │  │
│  │  ┌──────────────┐      ┌──────────────┐      │  │
│  │  │  Monitoring  │      │    Admin     │      │  │
│  │  │    Pages     │      │    Pages     │      │  │
│  │  └──────────────┘      └──────────────┘      │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
│  ┌──────────────────────────────────────────────┐  │
│  │         Backend API Server (Port 3000)       │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐   │  │
│  │  │  Device  │  │   Data   │  │   Config │   │  │
│  │  │   API    │  │   API    │  │   API    │   │  │
│  │  └──────────┘  └──────────┘  └──────────┘   │  │
│  └──────────────┬───────────────────────────────┘  │
│                 │                                    │
│  ┌──────────────▼───────────────────────────────┐  │
│  │         File Storage Layer                    │  │
│  │  ┌──────────────┐      ┌──────────────┐      │  │
│  │  │  JSON Config │      │ CSV/JSON     │      │  │
│  │  │    Files     │      │ Measurements │      │  │
│  │  └──────────────┘      └──────────────┘      │  │
│  │  Location: /var/www/sound-monitoring/data/   │  │
│  └──────────────────────────────────────────────┘  │
│                                                      │
└─────────────────────────────────────────────────────┘
```

#### Backend API Server

**Technology Stack Options:**
- **Option 1:** Node.js + Express
- **Option 2:** Python + Flask/FastAPI
- **Option 3:** Go + Gin/Echo

**API Endpoints:**

1. **Device Management API**
   - `POST /api/devices/register` - Register new device
   - `GET /api/devices` - List all devices
   - `GET /api/devices/:id` - Get device details
   - `PUT /api/devices/:id/config` - Update device configuration
   - `GET /api/devices/:id/status` - Get device status

2. **Data Collection API**
   - `POST /api/data/measurements` - Receive measurement data from devices
   - `GET /api/data/devices/:id` - Get measurements for specific device
   - `GET /api/data/devices/:id/bands` - Get frequency band data
   - `GET /api/data/devices/:id/history` - Get historical data

3. **Configuration API**
   - `GET /api/config/devices/:id/frequency-bands` - Get frequency band config
   - `PUT /api/config/devices/:id/frequency-bands` - Update frequency bands
   - `GET /api/config/retention` - Get retention period settings
   - `PUT /api/config/retention` - Update retention period
   - `GET /api/config/devices/:id/calibration` - Get calibration settings
   - `PUT /api/config/devices/:id/calibration` - Update calibration offsets
   - `POST /api/config/devices/:id/calibration/reset` - Reset calibration to zero

4. **Monitoring API**
   - `GET /api/monitoring/devices/:id/realtime` - Real-time data stream
   - `GET /api/monitoring/summary` - System summary
   - `GET /api/monitoring/health` - System health check

#### Web Application (Frontend)

**Technology Stack:**
- **Framework:** React, Vue.js, or vanilla JavaScript
- **Charts/Visualization:** Chart.js, D3.js, or Plotly
- **HTTP Client:** Axios or Fetch API
- **Real-time Updates:** WebSocket or Server-Sent Events (SSE)
- **Responsive Design:** CSS Grid, Flexbox, or responsive framework (Bootstrap, Tailwind CSS)
- **Mobile Optimization:** Touch events, responsive breakpoints, mobile-first design

**Application Structure:**

1. **Monitoring Dashboard**
   - Real-time sound level display (dB)
   - Frequency band visualization
   - Historical data charts
   - Device status indicators
   - Time range selector
   - **Responsive Layout:**
     - Desktop view: Multi-column layout, larger charts, detailed information
     - Mobile view: Single column layout, compact charts, touch-optimized controls

2. **Admin Interface**
   - Device registration form
   - Device list and management
   - Frequency band configuration interface
   - **Sensor Calibration Interface:**
     - Calibration offset input (dB)
     - Per-band calibration offset input (optional)
     - Calibration date and notes
     - Calibration enable/disable toggle
     - View raw vs calibrated values
   - Data retention configuration
   - System settings
   - **Responsive Layout:**
     - Desktop view: Full form layouts, side-by-side panels
     - Mobile view: Stacked forms, collapsible sections, touch-friendly inputs

3. **Components:**
   - Device status widget
   - Real-time chart component
   - Historical chart component
   - Frequency band editor
   - Configuration form components
   - **Responsive Components:**
     - Adaptive navigation (hamburger menu for mobile)
     - Responsive tables (scrollable or card view on mobile)
     - Touch-optimized buttons and controls

### 3.3 File-Based Storage Architecture

#### File Structure Design

**Storage Organization:**

```
data/
├── config/
│   ├── devices.json              # Device registry (array of device objects)
│   ├── device_configs/
│   │   ├── esp32_001.json       # Per-device configuration
│   │   ├── esp32_002.json
│   │   └── ...
│   ├── frequency_bands/
│   │   ├── esp32_001.json       # Frequency band configs per device
│   │   └── ...
│   ├── system_settings.json      # Global system settings
│   └── users.json                # User accounts (optional)
├── measurements/
│   ├── esp32_001/
│   │   ├── 2024-01-15.csv       # Daily measurement files (CSV format)
│   │   ├── 2024-01-16.csv
│   │   └── ...
│   ├── esp32_002/
│   │   └── ...
│   └── ...
└── logs/
    └── application.log
```

#### File Format Specifications

**1. Device Registry (`config/devices.json`):**

```json
[
  {
    "id": "esp32_001",
    "name": "Building A - Floor 1",
    "mac_address": "AA:BB:CC:DD:EE:FF",
    "registered_at": "2024-01-10T10:00:00Z",
    "last_seen": "2024-01-15T14:30:00Z",
    "status": "online",
    "location": "Building A, Floor 1",
    "created_by": "admin"
  }
]
```

**2. Device Configuration (`config/device_configs/esp32_001.json`):**

```json
{
  "device_id": "esp32_001",
  "measurement_interval": 5,
  "sampling_rate": 16000,
  "retention_days": 7,
  "calibration": {
    "offset_db": 2.5,
    "enabled": true,
    "date": "2024-01-10T14:30:00Z",
    "notes": "Calibrated using reference sound level meter"
  }
}
```

**3. Frequency Bands Configuration (`config/frequency_bands/esp32_001.json`):**

```json
[
  {
    "band_number": 1,
    "start_frequency": 20,
    "end_frequency": 200,
    "calibration_offset_db": 2.2
  },
  {
    "band_number": 2,
    "start_frequency": 200,
    "end_frequency": 2000,
    "calibration_offset_db": 0.0
  }
]
```

**4. System Settings (`config/system_settings.json`):**

```json
{
  "default_retention_days": 7,
  "max_devices": 10,
  "system_name": "Sound Monitoring System"
}
```

**5. Measurement Data (`measurements/esp32_001/2024-01-15.csv`):**

```csv
timestamp,db_level,db_level_raw,band_1_level,band_1_raw,band_2_level,band_2_raw
2024-01-15T10:00:00Z,65.5,63.0,45.2,43.0,52.1,50.0
2024-01-15T10:00:05Z,66.2,63.7,46.1,43.9,52.8,50.7
2024-01-15T10:00:10Z,64.8,62.3,44.5,42.3,51.5,49.4
...
```

**Alternative: JSON Measurement Format (`measurements/esp32_001/2024-01-15.json`):**

```json
[
  {
    "timestamp": "2024-01-15T10:00:00Z",
    "db_level": 65.5,
    "db_level_raw": 63.0,
    "frequency_bands": [
      {
        "band_number": 1,
        "level": 45.2,
        "level_raw": 43.0
      },
      {
        "band_number": 2,
        "level": 52.1,
        "level_raw": 50.0
      }
    ]
  }
]
```

#### Data Retention Strategy

- **Automatic Purging:** Background job runs daily to delete data older than retention period
- **Per-Device Retention:** Each device can have custom retention period
- **Global Default:** System-wide default retention (7 days)
- **Retention Job:** Scheduled task (cron job or task scheduler)

---

## 4. Data Flow Architecture

### 4.1 Measurement Data Flow

```
ESP32 Device                    Central Server
     │                               │
     │  1. Audio Sampling            │
     │     (Continuous)               │
     │                               │
     │  2. Anti-Aliasing Filter      │
     │     - Apply low-pass filter   │
     │     - Cutoff at Nyquist freq  │
     │                               │
     │  3. Apply Windowing Function  │
     │     - Hamming/Hanning window  │
     │     - Reduce spectral leakage │
     │                               │
     │  4. FFT Processing            │
     │     - Calculate frequency     │
     │       domain representation   │
     │     - Calculate dB             │
     │     - Calculate frequency      │
     │       band levels              │
     │                               │
     │  5. Apply Calibration         │
     │     - Apply dB offset         │
     │     - Apply per-band offsets  │
     │     - Store raw values        │
     │                               │
     │  4. Package Data              │
     │     - Timestamp               │
     │     - Device ID               │
     │     - dB level (calibrated)   │
     │     - dB level (raw)          │
     │     - Frequency band levels   │
     │       (calibrated & raw)      │
     │                               │
     │  4. HTTP POST                 │
     │  ────────────────────────────>│
     │  POST /api/data/measurements  │
     │                               │
     │                               │  5. Validate & Store
     │                               │     - Validate data
     │                               │     - Write to file
     │                               │     - Update device status
     │                               │
     │  6. HTTP Response             │
     │  <────────────────────────────│
     │  200 OK / Error               │
     │                               │
     │  7. Update Configuration      │
     │     (if needed)               │
     │                               │
```

### 4.2 Dynamic Configuration Flow (Updated February 2026)

```
Admin User                    Web Server                    ESP32 Device
     │                            │                              │
     │  1. Configure Frequency    │                              │
     │     Bands via Dashboard    │                              │
     │     (Click ⚙️ on device)   │                              │
     │                            │                              │
     │  2. Save Configuration     │                              │
     │  ────────────────────────> │                              │
     │  PUT /api/config/devices/:id/frequency-bands               │
     │                            │                              │
     │                            │  3. Store in Device JSON     │
     │                            │     (data/devices/{id}.json)  │
     │                            │                              │
     │                            │                              │
     │                            │  4. Device Startup:          │
     │                            │     Fetch Configuration      │
     │                            │  <───────────────────────────│
     │                            │  GET /api/config/devices/     │
     │                            │      Sensor%2001/frequency-bands│
     │                            │                              │
     │                            │  5. Return Configuration     │
     │                            │  ───────────────────────────>│
     │                            │  {frequency_bands: [...],    │
     │                            │   calibration_offset_db: 1}  │
     │                            │                              │
     │                            │                              │  6. Apply Configuration
     │                            │                              │     - Update frequency bands
     │                            │                              │     - Update calibration
     │                            │                              │     - Log changes
     │                            │                              │
     │                            │  7. Periodic Refresh         │
     │                            │     (Every 100 measurements  │
     │                            │      ~5 minutes)             │
     │                            │  <───────────────────────────│
     │                            │  GET /api/config/devices/...  │
     │                            │                              │
     │  8. View Live Data with    │                              │
     │     Updated Configuration  │                              │
     │  <──────────────────────── │                              │
     │                            │                              │
```

**Key Features:**
- **Startup Configuration Fetch:** Device fetches configuration immediately after WiFi connection
- **Periodic Refresh:** Configuration automatically re-fetched every ~5 minutes (100 measurements)
- **Per-Sensor Settings:** Each sensor stores and applies its own unique configuration
- **Runtime Updates:** No firmware reflash needed for frequency band changes
- **URL Encoding:** Device ID automatically URL-encoded in firmware to handle spaces
- **Calibration Sync:** Both frequency bands and calibration offsets fetched together

### 4.3 Real-Time Monitoring Flow

```
Web Browser                    Web Server                    File System
     │                            │                              │
     │  1. Load Dashboard         │                              │
     │  ────────────────────────> │                              │
     │                            │                              │
     │                            │  2. Read Recent Data Files  │
     │                            │  ──────────────────────────> │
     │                            │                              │
     │                            │  3. Return Data             │
     │                            │  <────────────────────────── │
     │                            │                              │
     │  4. Display Initial Data   │                              │
     │  <──────────────────────── │                              │
     │                            │                              │
     │  5. Establish WebSocket/   │                              │
     │     SSE Connection         │                              │
     │  ────────────────────────> │                              │
     │                            │                              │
     │                            │  6. Subscribe to Updates    │
     │                            │                              │
     │                            │  7. New Data Written to File │
     │                            │  <────────────────────────── │
     │                            │                              │
     │  8. Receive Real-Time      │                              │
     │     Update                │                              │
     │  <──────────────────────── │                              │
     │                            │                              │
```

---

## 5. Network Architecture

### 5.1 Network Topology

```
                    Internet (Optional)
                         │
                         │
              ┌──────────▼──────────┐
              │   Router/Gateway    │
              │   (WiFi Access      │
              │    Point)           │
              └──────────┬──────────┘
                         │
              ┌──────────┼──────────┐
              │          │          │
         ┌────▼───┐ ┌────▼───┐ ┌────▼───┐
         │ ESP32  │ │ ESP32  │ │ ESP32  │
         │Device 1│ │Device 2│ │Device N│
         └────────┘ └────────┘ └────────┘
              │          │          │
              └──────────┼──────────┘
                         │
              ┌──────────▼──────────┐
              │   Central Web       │
              │   Server            │
              │   (LAN IP or        │
              │    Public IP)       │
              └─────────────────────┘
```

### 5.2 Network Requirements

- **WiFi Standard:** 802.11 b/g/n (2.4 GHz)
- **Security:** WPA2 or WPA3
- **Range:** Devices within 50m of access point (recommended)
- **Bandwidth:** Minimum 1 Mbps per device (10 devices = 10 Mbps total)
- **Network Type:** Local Area Network (LAN) or VPN for remote access

### 5.3 Communication Protocols

1. **Device to Server:**
   - **Protocol:** HTTP (REST API, unencrypted)
   - **Port:** 80 (HTTP)
   - **Method:** POST for data transmission
   - **Format:** JSON payload

2. **Server to Browser:**
   - **Protocol:** HTTP for web pages (unencrypted)
   - **Protocol:** WebSocket or SSE for real-time updates (unencrypted)
   - **Port:** 80 (HTTP)

3. **Configuration Sync:**
   - **Protocol:** HTTP (REST API, unencrypted)
   - **Method:** GET (device polls server)
   - **Interval:** Configurable (default: every 5 minutes)

---

## 6. Application Architecture

### 6.1 Backend Application Structure

```
backend/
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── devices.js          # Device management routes
│   │   │   ├── data.js              # Data collection routes
│   │   │   ├── config.js            # Configuration routes
│   │   │   └── monitoring.js        # Monitoring routes
│   │   ├── controllers/
│   │   │   ├── deviceController.js
│   │   │   ├── dataController.js
│   │   │   └── configController.js
│   │   └── middleware/
│   │       ├── auth.js              # Authentication middleware
│   │       ├── validation.js        # Input validation
│   │       └── errorHandler.js      # Error handling
│   ├── services/
│   │   ├── deviceService.js         # Device business logic
│   │   ├── dataService.js           # Data processing logic
│   │   ├── configService.js         # Configuration management
│   │   ├── calibrationService.js     # Calibration logic and offset application
│   │   └── retentionService.js       # Data retention logic
│   ├── models/
│   │   ├── Device.js                # Device model
│   │   ├── Measurement.js           # Measurement model
│   │   └── FrequencyBand.js         # Frequency band model
│   ├── storage/
│   │   ├── configManager.js         # JSON config file handler
│   │   ├── measurementWriter.js     # CSV/JSON measurement writer
│   │   ├── measurementReader.js      # CSV/JSON measurement reader
│   │   ├── fileLock.js              # File locking for concurrent access
│   │   └── retentionManager.js       # Data retention and cleanup
│   ├── utils/
│   │   ├── logger.js                # Logging utility
│   │   └── validators.js            # Validation helpers
│   └── server.js                    # Application entry point
├── config/
│   ├── storage.js                   # Storage configuration
│   └── app.js                       # Application configuration
└── package.json
```

### 6.2 Frontend Application Structure

**Implementation Status:** ✅ Production Ready (February 2026)

The current frontend implementation uses vanilla JavaScript with Chart.js for visualization, deployed via Python's http.server for development.

**Production Structure:**
```
frontend/
├── index.html                       # Main application page
├── test.html                        # Testing page
├── css/
│   ├── styles.css                   # Main styles with color-coded thresholds
│   └── features.css                 # Feature-specific styles
└── js/
    ├── app.js                       # Main application logic, device management
    ├── api.js                       # Backend API client
    └── charts.js                    # Chart.js visualization wrapper
```

**Key Features Implemented (v1.2):**

1. **Color-Coded Sound Level Display**
   - Under 80 dB: Green (#d1fae5 background, #065f46 text)
   - 80-95 dB: Yellow (#fef3c7 background, #92400e text)
   - Over 95 dB: Red (#fecaca background, #991b1b text)
   - Applied to: Dashboard cards, history items, measurement badges

2. **Multi-Line History Chart**
   - Chart.js v4.4.0 with multi-dataset support
   - Overall sound level (primary line)
   - Individual frequency band levels (3 additional lines)
   - Color scheme: Green, Orange, Pink, Purple, Yellow
   - Automatic dataset creation based on frequency_bands array
   - Time-series visualization with ISO timestamp parsing

3. **Full-Width History Display**
   - Flexbox layout for measurement items
   - Full screen width utilization (changed from grid layout)
   - Improved readability for frequency band data
   - Responsive design for mobile/desktop

4. **Active Status Monitoring**
   - 60-second activity threshold
   - Real-time status indicators (green=active, gray=inactive)
   - last_seen timestamp display
   - Auto-refresh every 10 seconds

5. **Analytics Dashboard**
   - Date range selection for queries
   - Statistical calculations (min, max, average, median)
   - Per-frequency band statistics
   - API endpoint: GET /api/analytics/stats

**Future Migration Path (Optional):**
```
frontend/ (React/Vue migration - not yet implemented)
├── src/
│   ├── components/
│   │   ├── monitoring/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── DeviceStatus.jsx
│   │   │   ├── RealTimeChart.jsx
│   │   │   └── HistoricalChart.jsx
│   │   ├── admin/
│   │   │   ├── DeviceList.jsx
│   │   │   ├── DeviceRegistration.jsx
│   │   │   ├── FrequencyBandEditor.jsx
│   │   │   ├── SensorCalibration.jsx
│   │   │   └── RetentionConfig.jsx
│   │   └── common/
│   │       ├── Header.jsx
│   │       ├── Navigation.jsx
│   │       └── LoadingSpinner.jsx
│   ├── pages/
│   │   ├── MonitoringPage.jsx
│   │   └── AdminPage.jsx
│   ├── services/
│   │   ├── api.js                   # API client
│   │   └── websocket.js             # WebSocket client
│   ├── hooks/
│   │   ├── useRealtimeData.js
│   │   └── useDevices.js
│   ├── utils/
│   │   ├── formatters.js
│   │   └── validators.js
│   └── App.jsx
├── public/
│   └── index.html
└── package.json
```

### 6.3 ESP32 Firmware Structure

```
firmware/
├── main/
│   ├── main.c                       # Main application entry (ESP-IDF)
│   ├── main.h
│   └── CMakeLists.txt
├── components/                      # ESP-IDF components (optional)
│   ├── audio/
│   │   ├── i2s_driver.c            # I2S interface driver for INMP441
│   │   ├── audio_sampler.c         # Audio sampling via I2S
│   │   ├── anti_alias_filter.c     # Anti-aliasing low-pass filter
│   │   ├── window_function.c       # Windowing functions (Hamming, Hanning, etc.)
│   │   ├── audio_processor.c       # FFT and dB calculation
│   │   ├── frequency_bands.c       # Frequency band processing
│   │   └── calibration.c          # Calibration offset application
│   ├── communication/
│   │   ├── wifi_manager.c          # WiFi connection management
│   │   ├── http_client.c           # HTTP client
│   │   └── api_client.c            # API communication
│   ├── config/
│   │   ├── config_manager.c        # Configuration management (NVS)
│   │   ├── calibration_config.c    # Calibration configuration storage
│   │   └── ntp_sync.c              # NTP time synchronization
│   └── system/
│       ├── watchdog.c              # Watchdog timer
│       └── logger.c                # Logging
├── CMakeLists.txt                  # Main build configuration
├── sdkconfig                        # ESP-IDF configuration
└── partitions.csv                   # Flash partition table
```

---

## 7. Security Architecture

### 7.1 Authentication & Authorization

**Current Implementation Status (February 2026):**
- **⏳ Not Yet Implemented:** User authentication deferred for MVP
- System currently operates in development mode without authentication
- Future implementation would include:
  - Username/password authentication
  - Session management (JWT tokens or session cookies)
  - Role-based access (admin vs viewer)

**Device Authentication:**
- Device registration with unique device ID
- Device IDs support alphanumeric names with spaces (URL encoded)
- MAC address tracking for device identification
- Configuration access controlled by device_id parameter

### 7.2 Data Security

1. **Transport Security**
   - HTTP for all communication (unencrypted, no certificates)
   - Local network deployment (WiFi WPA2/WPA3)
   - Development environment: localhost communication
   - Production recommendation: HTTPS with Let's Encrypt certificates

2. **Data Storage Security**
   - File-based storage with filesystem permissions
   - Device configurations stored per device in JSON format
   - Measurement data organized by device and date
   - No sensitive credential storage in current implementation

3. **API Security**
   - Input validation via Express middleware
   - URL parameter sanitization (device IDs, dates)
   - CORS enabled for development (localhost:8080 to localhost:3000)
   - Rate limiting: Not yet implemented (recommended for production)

### 7.3 Network Security

**Current Deployment:**
- Local network deployment (192.168.68.x subnet)
- WiFi security: WPA2/WPA3 network encryption
- Backend server: 192.168.68.57:3000
- Frontend server: localhost:8080

**Production Recommendations:**
- Firewall rules on web server (block non-HTTP/HTTPS ports)
- Network segmentation (IoT devices on separate VLAN)
- VPN access for remote administration (if internet-accessible)

---

## 7A. Current Deployment Status (February 2026)

### 7A.1 Active Hardware Deployment

**Operational Sensor:**
- **Device ID:** "Sensor 01"
- **MAC Address:** 08:92:72:84:1d:18
- **Status:** ✅ Active and transmitting
- **Connection:** USB-C wall charger power
- **Location:** Development environment
- **Last Seen:** Within 5 seconds (continuous operation)
- **Measurement Frequency:** Every 5 seconds
- **Current Readings:** 76-77 dB ambient levels

**Hardware Configuration:**
- ESP32-C3 Super Mini microcontroller
- INMP441 I2S digital microphone
- Pin connections verified: GPIO 4 (data), GPIO 5 (BCLK), GPIO 6 (WS)
- I2S configuration: 16kHz sample rate, 32-bit containers
- WiFi: Connected to local network (192.168.68.x)

### 7A.2 Software Deployment

**Backend Server:**
- Platform: Node.js with Express
- Host: 192.168.68.57:3000
- Status: ✅ Running and accepting measurements
- API Endpoints: All operational
- Storage: File-based JSON (backend/data/)
- Log: backend/src/utils/logger.js

**Frontend Application:**
- Platform: Vanilla JavaScript + Chart.js
- Host: localhost:8080 (Python http.server)
- Status: ✅ Operational
- Features: Dashboard, history chart, analytics, config management
- Browser: Chrome/Safari compatible

**Firmware:**
- Framework: ESP-IDF v6.1-dev-2300
- Language: C
- Features:
  - I2S audio sampling (16kHz)
  - FFT frequency analysis (3 bands: 20-200Hz, 200-2000Hz, 2000-8000Hz)
  - Dynamic configuration fetch (startup + periodic refresh)
  - HTTP POST measurements every 5 seconds
  - URL encoding for device IDs with spaces
  - Calibration offset application (1.0 dB)

### 7A.3 Data Flow Verification

**Measurement Transmission:**
```
ESP32 Device → WiFi Network → Backend API (POST /api/data/measurements)
              ↓
         JSON storage (backend/data/measurements/Sensor 01_YYYY-MM-DD.json)
              ↓
         Frontend retrieval (GET /api/data/measurements/:deviceId)
              ↓
         Dashboard display + Chart visualization
```

**Configuration Sync:**
```
Backend storage (backend/data/devices/Sensor 01.json)
              ↓
ESP32 fetch (GET /api/config/devices/Sensor%2001/frequency-bands)
              ↓
Apply settings (calibration offset, frequency bands)
              ↓
Periodic refresh (every 100 measurements, ~5 minutes)
```

**Performance Metrics:**
- Measurement latency: < 1 second (device to server)
- API response time: < 200ms (typical)
- Configuration update: < 60 seconds (includes periodic refresh)
- Data retention: Currently unlimited (no auto-purge implemented)
- Active status threshold: 60 seconds

---

## 8. Deployment Architecture

### 8.1 Deployment Environments

This system supports multiple deployment configurations depending on the development phase and scale of deployment.

#### 8.1.1 Development Environment #1 (Current - January 2026)

**Local Development and Testing**

See Section 9.6.1 for detailed configuration.

**Platform:**
- **Server:** MacBook running local development servers
- **Network:** Home WiFi network
- **ESP32:** Single device connected via USB and WiFi
- **Purpose:** Initial development, firmware testing, system prototyping

**Quick Summary:**
- All components (backend, frontend, ESP32) run on or connect to MacBook
- ESP32-C3 connected via USB for flashing, WiFi for runtime communication
- INMP441 microphone wired per design specifications (GPIO 4, 5, 6)
- Ideal for rapid development and testing

#### 8.1.2 Production Environment (Future)

**Remote Server Deployment**

**Target Platform:**
- **Operating System:** Ubuntu 20.04 LTS
- **Web Server:** Nginx (already installed and running)
- **Deployment Type:** On-premise or cloud server
- **Network:** Local network or public IP with WiFi access
- **ESP32 Devices:** Up to 10 units deployed at various locations

**Server Environment:**
- Ubuntu 20.04.4 LTS server
- Nginx web server (reverse proxy and static file serving)
- Application server (Node.js, Python, or Go backend)
- File system storage for data and configuration files

### 8.2 Deployment Components

```
┌─────────────────────────────────────┐
│      Deployment Environment         │
├─────────────────────────────────────┤
│                                     │
│  ┌──────────────────────────────┐   │
│  │   Nginx Web Server           │   │
│  │   - Reverse Proxy           │   │
│  │   - HTTP Server (port 80)   │   │
│  │   - Static File Serving      │   │
│  │   - API Proxy to Backend     │   │
│  └──────────────┬───────────────┘   │
│                 │                    │
│  ┌──────────────▼───────────────┐   │
│  │   Application Server         │   │
│  │   - Backend API              │   │
│  │   - Frontend App             │   │
│  └──────────────┬───────────────┘   │
│                 │                    │
│  ┌──────────────▼───────────────┐   │
│  │   File System Storage        │   │
│  │   - JSON config files         │   │
│  │   - CSV/JSON measurement files│   │
│  │   - Local file system        │   │
│  └──────────────────────────────┘   │
│                                     │
│  ┌──────────────────────────────┐   │
│  │   Background Jobs            │   │
│  │   - Data Retention Cleanup   │   │
│  │   - Health Monitoring        │   │
│  └──────────────────────────────┘   │
└─────────────────────────────────────┘
```

### 8.3 Infrastructure Requirements

**Server Platform:**
- **Operating System:** Ubuntu 20.04 LTS
- **Web Server:** Nginx (pre-installed)
- **Package Manager:** apt

**Server Specifications (Minimum):**
- CPU: 2 cores
- RAM: 4 GB
- Storage: 50 GB (for 7 days of data from 10 devices)
- Network: 100 Mbps connection

**Server Specifications (Recommended):**
- CPU: 4 cores
- RAM: 8 GB
- Storage: 100 GB SSD
- Network: 1 Gbps connection

### 8.4 Nginx Configuration

**Nginx Setup:**
- Nginx installed and running on Ubuntu 20.04
- Configuration file: `/etc/nginx/sites-available/sound-monitoring`
- Symlink to: `/etc/nginx/sites-enabled/sound-monitoring`
- Default port: 80 (HTTP, unencrypted)

**Nginx Configuration Example:**

```nginx
server {
    listen 80;
    server_name localhost;  # or your domain/IP

    # Root directory for static files (frontend)
    root /var/www/sound-monitoring/frontend/dist;
    index index.html;

    # API proxy to backend application
    location /api/ {
        proxy_pass http://localhost:3000;  # Backend API port
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support (if using WebSocket for real-time updates)
    location /ws/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Static files (frontend)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # File storage directory (optional, for direct file access)
    location /data/ {
        alias /var/www/sound-monitoring/data/;
        autoindex off;
    }
}
```

**Nginx Service Management:**
- Start: `sudo systemctl start nginx`
- Stop: `sudo systemctl stop nginx`
- Restart: `sudo systemctl restart nginx`
- Reload config: `sudo nginx -s reload`
- Status: `sudo systemctl status nginx`
- Enable on boot: `sudo systemctl enable nginx`

### 8.5 Ubuntu 20.04 Deployment Steps

**Note:** These steps are performed via SSH from your MacBook development machine.

**Prerequisites:**
- SSH access to Ubuntu 20.04 server
- Sudo privileges on server
- Files transferred from MacBook to server (via SCP, Git, or rsync)

**Remote Access:**
```bash
# From MacBook, connect to server
ssh user@your-server-ip

# Or use Cursor's remote SSH extension for seamless editing
```

**1. System Preparation:**
```bash
# Update system packages
sudo apt update
sudo apt upgrade -y

# Install required packages
sudo apt install -y nginx nodejs npm  # or python3, python3-pip for Python
sudo apt install -y git curl
```

**2. Application Deployment:**
```bash
# Create application directory
sudo mkdir -p /var/www/sound-monitoring
sudo chown $USER:$USER /var/www/sound-monitoring

# Transfer files from MacBook to server (from MacBook terminal)
# Option A: Using SCP
scp -r backend/ user@server-ip:/var/www/sound-monitoring/
scp -r frontend/ user@server-ip:/var/www/sound-monitoring/

# Option B: Using Git (recommended)
# On MacBook: git push origin main
# On server:
cd /var/www/sound-monitoring
git clone <repository-url> .
# Or: git pull (if already cloned)

# Install dependencies and build (on server via SSH)
cd /var/www/sound-monitoring
cd backend && npm install
cd ../frontend && npm install && npm run build

# Create data directory
mkdir -p /var/www/sound-monitoring/data/{config,measurements,logs}
```

**3. Nginx Configuration:**
```bash
# Create nginx configuration
sudo nano /etc/nginx/sites-available/sound-monitoring
# (paste configuration from above)

# Enable site
sudo ln -s /etc/nginx/sites-available/sound-monitoring /etc/nginx/sites-enabled/

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

**4. Application Service (systemd):**
```bash
# Create systemd service file
sudo nano /etc/systemd/system/sound-monitoring.service

# Example service file:
[Unit]
Description=Sound Monitoring System Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/sound-monitoring/backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable sound-monitoring
sudo systemctl start sound-monitoring
```

**5. Firewall Configuration:**
```bash
# Allow HTTP traffic (port 80)
sudo ufw allow 80/tcp
sudo ufw allow 'Nginx HTTP'
sudo ufw status
```

---

## 9. Technology Stack Recommendations

### 9.1 Backend Stack

**Option 1: Node.js**
- Runtime: Node.js 18+
- Framework: Express.js
- File System: fs-extra, jsonfile, csv-writer, csv-parser
- Authentication: Passport.js, JWT
- Validation: Joi or express-validator

**Option 2: Python**
- Runtime: Python 3.10+
- Framework: FastAPI or Flask
- File System: json, csv, pathlib (Python standard library)
- Authentication: Flask-Login, JWT
- Validation: Pydantic

**Option 3: Go**
- Runtime: Go 1.20+
- Framework: Gin or Echo
- File System: os, encoding/json, encoding/csv (Go standard library)
- Authentication: JWT
- Validation: validator

### 9.2 Frontend Stack

**Option 1: React**
- Framework: React 18+
- State Management: React Context or Redux
- HTTP Client: Axios
- Charts: Chart.js or Recharts
- Real-time: Socket.io-client or EventSource (SSE)
- Responsive Design: CSS Modules, Styled Components, or Tailwind CSS
- Mobile Optimization: React Touch Events, responsive hooks

**Option 2: Vue.js**
- Framework: Vue 3+
- State Management: Pinia
- HTTP Client: Axios
- Charts: Chart.js or Vue-Chartjs
- Real-time: Socket.io-client
- Responsive Design: Vue responsive utilities, Tailwind CSS, or Vuetify

### 9.3 File Storage Stack

**File Storage:**
- **Configuration Files:** JSON format
- **Measurement Files:** CSV or JSON format
- **File Organization:** Directory structure by device and date

**File Management Libraries:**
- **Node.js:**
  - `fs-extra` - Enhanced file system operations
  - `jsonfile` - JSON file reading/writing
  - `csv-writer` - CSV file writing
  - `csv-parser` - CSV file reading
  - `lockfile` - File locking for concurrent access
- **Python:**
  - `json` - JSON file operations (standard library)
  - `csv` - CSV file operations (standard library)
  - `pathlib` - Path operations (standard library)
  - `filelock` - File locking
- **Go:**
  - `encoding/json` - JSON operations (standard library)
  - `encoding/csv` - CSV operations (standard library)
  - `os` - File system operations (standard library)

### 9.4 ESP32 Firmware Stack

- **Framework:** ESP-IDF (Espressif IoT Development Framework)
- **Libraries:**
  - WiFi: ESP-IDF WiFi library (esp_wifi)
  - HTTP: ESP-IDF HTTP client (esp_http_client)
  - JSON: cJSON library
  - FFT: ESP-DSP library (esp-dsp)
  - **Signal Processing:**
    - ESP-DSP library for FFT and digital filters
    - Anti-aliasing filter implementation (Butterworth/Chebyshev)
    - Windowing functions (Hamming, Hanning, Blackman)
  - Audio: ESP-IDF I2S driver (driver/i2s.h) for INMP441 microphone module
  - NVS: Non-volatile storage for configuration (nvs_flash)
  - NTP: Network time protocol (lwip)
- **I2S Configuration:** 16-48 kHz sample rate, 24-bit depth, mono channel
- **Signal Processing:**
  - Anti-aliasing: Digital low-pass filter (4th-8th order)
  - Windowing: Hamming window (or configurable window type)
  - FFT: 256-1024 point FFT with window gain compensation
- **Development:** MacBook with Cursor IDE, ESP-IDF installed locally

### 9.5 DevOps & Deployment

- **Operating System:** Ubuntu 20.04 LTS (server)
- **Web Server:** Nginx (pre-installed, reverse proxy and static file serving)
- **Process Manager:** systemd (for service management), PM2 (Node.js, optional)
- **Package Management:** apt (Ubuntu package manager)
- **Service Management:** systemd
- **File Permissions:** Proper ownership for /var/www/sound-monitoring
- **Monitoring:** systemd journal, custom logging
- **Logging:** Application logs to /var/www/sound-monitoring/data/logs/
- **Backup:** File system backups using rsync or tar

### 9.6 Development Environments

#### 9.6.1 Development Environment #1 (Current - January 2026)

**Local Development and Testing Environment**

This is the **first development environment** being used for initial firmware development and system testing.

**Hardware Configuration:**
- **Development Machine:** MacBook with VS Code/Cursor IDE
- **Web Server:** Running locally on MacBook (Node.js/Python development server)
- **ESP32 Device:** ESP32-C3 SuperMini connected via USB to MacBook
- **Microphone:** INMP441 I2S microphone connected to ESP32-C3 per design specs:
  - VDD → ESP32-C3 3.3V
  - GND → ESP32-C3 GND
  - SCK → GPIO 5 (I2S_BCLK)
  - WS → GPIO 6 (I2S_WS)
  - SD → GPIO 4 (I2S_DATA)
  - L/R → GND (left channel/mono)
- **Network:** Home WiFi network connecting ESP32 to MacBook

**Network Topology:**
```
┌─────────────────────────────────────────┐
│         Home WiFi Network               │
│         (2.4 GHz 802.11n)              │
└────────────┬────────────────┬───────────┘
             │                │
    ┌────────▼────────┐  ┌────▼──────────────┐
    │   MacBook       │  │  ESP32-C3         │
    │  (Dev Server)   │  │  SuperMini        │
    │                 │  │                   │
    │  Backend API:   │  │  Connected via:   │
    │  Port 3000      │  │  - USB (flashing) │
    │                 │  │  - WiFi (runtime) │
    │  Frontend UI:   │  │                   │
    │  Port 8080      │  │  Connects to:     │
    │                 │  │  MacBook IP:3000  │
    │  Browser:       │  │  (Backend API)    │
    │  localhost:8080 │  │                   │
    └─────────────────┘  │  INMP441 Mic      │
                         │  (I2S wired)      │
                         └───────────────────┘
```

**Network Configuration:**
- **MacBook Local IP:** Obtain via `ipconfig getifaddr en0` (typically 192.168.x.x)
  - Current IP (Jan 30, 2026): 192.168.68.67
- **Backend API Endpoint (from ESP32):** `http://<MacBook-IP>:<API_PORT>/api/`
  - Example (default): `http://192.168.68.67:3000/api/`
  - Port should be configurable via environment variable
- **Frontend Access (browser):** `http://localhost:<FRONTEND_PORT>`
  - Example (default): `http://localhost:8080`
  - Port should be configurable via environment variable
- **ESP32 WiFi Configuration:**
  - SSID: Home WiFi network name
  - Password: Home WiFi password
  - Server URL: `http://<MacBook-IP>:<API_PORT>`
  - Example (default): `http://192.168.68.67:3000`
  - ESP32 firmware should read server URL from configuration

**Development Workflow:**
1. **Firmware Development:**
   - Edit ESP32 firmware code in VS Code on MacBook
   - Build firmware using ESP-IDF: `. ~/esp/esp-idf/export.sh && idf.py build`
   - Flash to ESP32 via USB: `idf.py -p /dev/tty.usbserial-* flash`
   - Monitor serial output: `idf.py monitor`

2. **Backend Development:**
   - Run backend API server locally on MacBook (Node.js/Python)
   - Backend listens on **http://localhost:3000** (API endpoints, default port)
   - **Port should be configurable** via `PORT` or `API_PORT` environment variable
   - ESP32 connects to backend via home WiFi network using MacBook's local IP

3. **Frontend Development:**
   - Run frontend development server on MacBook
   - Frontend listens on **http://localhost:8080** (web interface, default port)
   - **Port should be configurable** via `PORT` or `FRONTEND_PORT` environment variable
   - Access web interface via browser on MacBook at http://localhost:8080

4. **Testing:**
   - ESP32 samples audio from INMP441 microphone
   - ESP32 sends data to backend running on MacBook via WiFi
   - Monitor and visualize data in web browser on MacBook
   - Debug and iterate on firmware and backend code

**Installed Development Tools:**
- ESP-IDF v6.1-dev-2300-g17a74c925c
- Python 3.12.8
- Node.js v23.11.0
- npm 10.9.2
- cmake 4.2.3
- ninja 1.13.2
- dfu-util 0.11
- Git 2.50.1
- Homebrew 5.0.12

**Port Allocation:**
- **Port 3000** - Backend API server (available, default)
- **Port 8080** - Frontend development server (available, default)
- **Port 5000** - IN USE by macOS ControlCenter (AirPlay) - DO NOT USE
- **Port 7000** - IN USE by macOS ControlCenter - DO NOT USE

**Note:** Backend API and Frontend UI ports should be **configurable via environment variables** (e.g., `PORT`, `API_PORT`, `FRONTEND_PORT`) to avoid conflicts with other services.

**Benefits of This Environment:**
- Fast iteration cycle (all components on one machine)
- Easy debugging with direct USB serial access
- No network latency or remote server dependencies
- Ideal for initial development and testing
- Simple setup for hardware testing

#### 9.6.2 Production Environment (Future)

**Remote Server Deployment**

This environment will be used for production deployment with multiple ESP32 devices.

**Hardware Configuration:**
- **Development Machine:** MacBook with VS Code/Cursor IDE
- **Target Server:** Ubuntu 20.04 LTS server (remote)
- **Remote Access:** SSH for server development and deployment
- **ESP32 Devices:** 10 units deployed at various locations

**Development Workflow:**
1. **Code Development:**
   - Edit code on MacBook using VS Code/Cursor IDE
   - Source code stored locally on MacBook
   - Version control (Git) for code management

2. **Server Deployment:**
   - SSH into Ubuntu server for server-side development
   - Deploy backend and frontend to server
   - Test and debug on server environment

3. **ESP32 Firmware:**
   - Develop firmware code on MacBook using VS Code/Cursor IDE
   - Build firmware using ESP-IDF on MacBook
   - Flash ESP32 devices via USB from MacBook
   - Deploy devices to remote locations

**Remote Server Access:**
- **SSH Connection:** `ssh user@server-ip`
- **File Transfer:** SCP or SFTP for transferring files
- **Remote Development:** Use VS Code remote SSH extension or terminal
- **Port Forwarding:** May be needed for testing (if server behind firewall)

**Development Tools on MacBook:**
- **IDE:** VS Code/Cursor (for code editing)
- **ESP32 Development:**
  - ESP-IDF framework
  - esptool.py for flashing
  - USB drivers for ESP32 (built into modern macOS)
- **Version Control:** Git
- **Terminal:** macOS Terminal or iTerm2
- **SSH Client:** Built-in SSH or Terminal

**Server Development Tools:**
- **Remote Access:** SSH
- **File Editing:** nano, vim, or remote editing via VS Code
- **Process Management:** systemd, PM2
- **Log Monitoring:** journalctl, tail -f

### 9.7 ESP32 Development on MacBook

**MacBook Development Setup:**

**1. Install ESP-IDF on MacBook:**
```bash
# Install prerequisites using Homebrew
brew install cmake ninja dfu-util

# Install Python dependencies
pip3 install --user pyparsing

# Clone ESP-IDF
mkdir -p ~/esp
cd ~/esp
git clone --recursive https://github.com/espressif/esp-idf.git
cd esp-idf
./install.sh esp32

# Add to PATH (add to ~/.zshrc or ~/.bash_profile)
alias get_idf='. $HOME/esp/esp-idf/export.sh'
```

**2. Development Workflow:**
- Edit firmware code in Cursor IDE on MacBook
- Build firmware: `idf.py build`
- Connect ESP32 via USB to MacBook
- Identify port: `ls /dev/tty.usbserial-*` or `ls /dev/tty.usbmodem*`
- Flash firmware: `idf.py -p /dev/tty.usbserial-* flash`
- Monitor output: `idf.py -p /dev/tty.usbserial-* monitor`

**3. File Transfer to Server:**
```bash
# Transfer built application from MacBook to server
scp -r backend/ user@server-ip:/var/www/sound-monitoring/
scp -r frontend/dist/ user@server-ip:/var/www/sound-monitoring/frontend/

# Or use Git for version control
git push origin main
# Then on server: git pull
```

**4. Remote Server Management:**
```bash
# SSH into server
ssh user@server-ip

# Edit files remotely (using Cursor remote SSH or terminal editors)
# Deploy and restart services
sudo systemctl restart sound-monitoring
sudo systemctl reload nginx
```

**5. ESP32 Firmware Build and Flash:**
```bash
# From MacBook, in firmware directory
cd firmware/

# Configure project (first time)
idf.py menuconfig
# Configure WiFi, server URL, I2S settings

# Build firmware
idf.py build

# Flash to connected ESP32
idf.py -p /dev/tty.usbserial-* flash monitor
```

---

## 10. API Specifications

### 10.1 Device Registration API

```http
POST /api/devices/register
Content-Type: application/json

{
  "device_id": "esp32_001",
  "mac_address": "AA:BB:CC:DD:EE:FF",
  "name": "Building A - Floor 1",
  "location": "Building A, Floor 1, Room 101"
}

Response: 201 Created
{
  "device_id": "esp32_001",
  "api_key": "abc123...",
  "status": "registered"
}
```

### 10.2 Data Submission API

```http
POST /api/data/measurements
Authorization: Bearer <api_key>
Content-Type: application/json

{
  "device_id": "esp32_001",
  "timestamp": "2024-01-15T10:30:00Z",
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
    }
  ]
}

Response: 200 OK
{
  "status": "success",
  "message": "Measurement stored",
  "calibration_applied": true,
  "calibration_offset": 2.5
}
```

### 10.3 Configuration Retrieval API

```http
GET /api/config/devices/esp32_001/frequency-bands
Authorization: Bearer <api_key>

Response: 200 OK
{
  "device_id": "esp32_001",
  "measurement_interval": 5,
  "frequency_bands": [
    {
      "band_number": 1,
      "start_frequency": 20,
      "end_frequency": 200,
      "calibration_offset_db": 0.0
    },
    {
      "band_number": 2,
      "start_frequency": 200,
      "end_frequency": 2000,
      "calibration_offset_db": 0.0
    }
  ]
}
```

### 10.5 Calibration Configuration API

```http
GET /api/config/devices/esp32_001/calibration
Authorization: Bearer <api_key>

Response: 200 OK
{
  "device_id": "esp32_001",
  "calibration_offset_db": 2.5,
  "calibration_enabled": true,
  "calibration_date": "2024-01-10T14:30:00Z",
  "calibration_notes": "Calibrated using reference sound level meter"
}

PUT /api/config/devices/esp32_001/calibration
Authorization: Bearer <api_key>
Content-Type: application/json

{
  "calibration_offset_db": 2.5,
  "calibration_enabled": true,
  "calibration_notes": "Calibrated using reference sound level meter"
}

Response: 200 OK
{
  "status": "success",
  "message": "Calibration updated"
}
```

### 10.4 Monitoring Data API

```http
GET /api/data/devices/esp32_001?start_time=2024-01-15T00:00:00Z&end_time=2024-01-15T23:59:59Z

Response: 200 OK
{
  "device_id": "esp32_001",
  "data": [
    {
      "timestamp": "2024-01-15T10:30:00Z",
      "db_level": 65.5,
      "frequency_bands": [...]
    },
    ...
  ]
}
```

---

## 11. Data Models

### 11.1 Measurement Data Model

```json
{
  "device_id": "esp32_001",
  "timestamp": "2024-01-15T10:30:00Z",
  "db_level": 65.5,
  "db_level_raw": 63.0,
  "calibration_applied": true,
  "calibration_offset": 2.5,
  "frequency_bands": [
    {
      "band_number": 1,
      "start_frequency": 20,
      "end_frequency": 200,
      "level": 45.2,
      "level_raw": 43.0,
      "calibration_offset": 2.2
    }
  ],
  "metadata": {
    "sampling_rate": 16000,
    "sample_count": 1024
  }
}
```

### 11.2 Device Configuration Model

```json
{
  "device_id": "esp32_001",
  "name": "Building A - Floor 1",
  "measurement_interval": 5,
  "sampling_rate": 16000,
  "retention_days": 7,
  "calibration": {
    "offset_db": 2.5,
    "enabled": true,
    "date": "2024-01-10T14:30:00Z",
    "notes": "Calibrated using reference sound level meter"
  },
  "frequency_bands": [
    {
      "band_number": 1,
      "start_frequency": 20,
      "end_frequency": 200,
      "calibration_offset_db": 2.2
    }
  ]
}
```

---

## 12. Performance Considerations

### 12.1 Data Processing

- **I2S Configuration:** Configure I2S for INMP441 (16-48 kHz, 24-bit, mono)
- **Anti-Aliasing Filter:**
  - Implement digital low-pass filter before FFT processing
  - Cutoff at Nyquist frequency (sample_rate / 2)
  - Use ESP-DSP library filters or optimized FIR filter
  - Filter order: 4th-8th order for adequate stopband attenuation
  - Prevents aliasing artifacts in frequency domain
- **FFT Processing:**
  - Optimize FFT size for ESP32-C3 capabilities (256-1024 point FFT)
  - Apply windowing function (Hamming recommended) to reduce spectral leakage
  - Window gain compensation in frequency domain calculations
  - Consider overlap processing (50% overlap) for continuous analysis
- **Windowing Techniques:**
  - **Hamming Window:** Good balance of main lobe width and side lobe suppression
  - **Hanning Window:** Slightly better side lobe suppression
  - **Blackman Window:** Best side lobe suppression, wider main lobe
  - Window function applied to time-domain samples before FFT
  - Compensate for window gain: `magnitude_corrected = magnitude_raw / window_gain`
- **Sampling Rate:** Balance between frequency resolution and processing load (recommended 16 kHz for INMP441)
- **Frequency Resolution:** `frequency_resolution = sample_rate / FFT_size`
  - For 16 kHz sample rate, 1024-point FFT: ~15.6 Hz resolution
- **Calibration Processing:**
  - Apply calibration offsets efficiently (simple addition operation)
  - Store both raw and calibrated values for comparison
  - Cache calibration values in memory to avoid repeated lookups
- **Data Batching:** Batch multiple measurements if network is slow
- **I2S DMA:** Use DMA for efficient data transfer from INMP441 to ESP32-C3 memory

### 12.2 File Storage Optimization

- **File Organization:** Organize by device and date for efficient access
- **File Size Management:** Limit file size (one file per day per device recommended)
- **Caching:** Cache frequently accessed configuration files in memory
- **File Locking:** Implement proper file locking to prevent concurrent write conflicts
- **Batch Writes:** Buffer measurements and write in batches to reduce I/O operations
- **Streaming Reads:** Stream large CSV/JSON files instead of loading entirely into memory
- **File Compression:** Compress old files to save disk space (optional)

### 12.3 Network Optimization

- **Compression:** Gzip compression for HTTP responses
- **Caching:** Cache static assets and configuration data
- **Connection Reuse:** HTTP keep-alive for device connections

---

## 13. Monitoring & Maintenance

### 13.1 System Monitoring

- **Device Status:** Track last seen timestamp, connection status
- **Data Quality:** Monitor for missing data, outliers
- **System Health:** Server resources, file system performance, disk space
- **Error Logging:** Centralized error logging and alerting

### 13.2 Maintenance Tasks

- **Data Retention:** Automated file deletion based on retention policy
- **File Cleanup:** Remove old measurement files older than retention period
- **Disk Space Monitoring:** Monitor available disk space
- **File Integrity:** Periodic checksum verification of critical files (optional)
- **Log Rotation:** Manage log file sizes
- **Backup:** Regular file system backups (copy data directory)

---

## 14. Future Enhancements

### 14.1 Potential Additions

- **OTA Updates:** Over-the-air firmware updates
- **Advanced Analytics:** Machine learning for pattern detection
- **Alert System:** Threshold-based alerts and notifications
- **Progressive Web App (PWA):** Enhanced mobile web experience with offline capabilities and app-like features
- **Multi-Tenant:** Support for multiple organizations
- **Edge Processing:** More processing on ESP32 devices
- **Battery Support:** Battery-powered operation with power management

---

## 15. Appendix

### A. Glossary

- **ESP32:** Low-cost microcontroller with integrated WiFi
- **FFT:** Fast Fourier Transform for frequency domain analysis of audio signals
- **Anti-Aliasing Filter:** Digital low-pass filter applied before FFT to prevent frequency aliasing
- **Windowing Function:** Mathematical function applied to time-domain samples to reduce spectral leakage (e.g., Hamming, Hanning, Blackman windows)
- **Spectral Leakage:** Unwanted frequency spreading in FFT output caused by finite sampling window, mitigated by windowing functions
- **Nyquist Frequency:** Maximum frequency that can be accurately represented (sample_rate / 2)
- **File Locking:** Mechanism to prevent concurrent write conflicts
- **I2S:** Inter-IC Sound interface for digital audio
- **INMP441:** MH-ET LIVE INMP441 I2S Digital Microphone Module - omnidirectional MEMS microphone
- **PDM:** Pulse Density Modulation - audio format used by INMP441
- **MEMS:** Micro-Electro-Mechanical Systems - technology used in the microphone sensor
- **DMA:** Direct Memory Access - efficient data transfer method for I2S
- **NTP:** Network Time Protocol for time synchronization
- **SSE:** Server-Sent Events for real-time updates
- **WebSocket:** Bidirectional communication protocol

### B. References

- ESP32 Technical Reference Manual
- ESP-IDF Programming Guide
- JSON File Format Specification
- CSV File Format Specification
- REST API Design Best Practices

### C. Related Documents

- Sound Level Mesh System PRD
- Hardware Design Document
- API Specification (to be created)
- Firmware Development Guide (see Section 9.7 for MacBook ESP-IDF setup)
- Deployment Guide for Ubuntu 20.04 with Nginx (see Section 8.5)

---

## Document Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| System Architect | | | |
| Engineering Lead | | | |
| DevOps Lead | | | |

---

**Document Status:** Draft - Pending Review and Approval

