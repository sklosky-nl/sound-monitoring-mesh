# Sound Level Mesh System - Architecture Document

## Document Information
- **Version:** 1.0
- **Date:** 2024
- **Status:** Draft
- **Author:** Engineering Team
- **Related Documents:** Sound Level Mesh System PRD

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
- **ESP32 Microcontroller**
  - Dual-core 240 MHz processor
  - WiFi 802.11 b/g/n (2.4 GHz)
  - I2S interface for digital microphone connection
  - GPIO pins for sensor connections
  - I2S pins: I2S_BCLK (Bit Clock), I2S_WS (Word Select), I2S_DOUT (Data Out)

- **Audio Input - MH-ET LIVE INMP441 I2S Digital Microphone Module**
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
  - **Pin Connections (INMP441 to ESP32):**
    - VDD → ESP32 3.3V
    - GND → ESP32 GND
    - SCK (Serial Clock) → ESP32 I2S_BCLK (e.g., GPIO 26)
    - WS (Word Select) → ESP32 I2S_WS (e.g., GPIO 25)
    - SD (Serial Data) → ESP32 I2S_DOUT (e.g., GPIO 22)
    - L/R (Left/Right select) → ESP32 GND (for mono/left channel)
  - **Connection Type:** Direct I2S digital connection (no analog components required)

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

1. **Audio Sampling Module**
   - **I2S Interface Configuration for INMP441:**
     - Sample rate: 16 kHz (configurable, INMP441 supports up to 48 kHz)
     - Bit depth: 24-bit
     - Channel format: Mono (left channel)
     - Communication format: I2S (standard)
     - DMA buffer size: 1024 bytes (configurable)
   - Continuous audio sampling via I2S DMA
   - 24-bit audio data reception from INMP441
   - Buffer management for audio data (double buffering recommended)
   - Interrupt-driven I2S DMA for real-time processing
   - Data format conversion: 24-bit I2S data to 16-bit or 32-bit float for processing

2. **Audio Processing Module**
   - FFT (Fast Fourier Transform) for frequency analysis
   - dB calculation from audio samples
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
     │  2. FFT Processing            │
     │     - Calculate dB             │
     │     - Calculate frequency      │
     │       band levels              │
     │                               │
     │  3. Apply Calibration         │
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

### 4.2 Configuration Flow

```
Admin User                    Web Server                    ESP32 Device
     │                            │                              │
     │  1. Configure Frequency    │                              │
     │     Bands via Admin UI     │                              │
     │                            │                              │
     │  2. Save Configuration     │                              │
     │  ────────────────────────> │                              │
     │                            │                              │
     │                            │  3. Store in File System    │
     │                            │                              │
     │                            │  4. Device Polls Config      │
     │                            │  <───────────────────────────│
     │                            │  GET /api/config/devices/:id │
     │                            │                              │
     │                            │  5. Return Configuration     │
     │                            │  ───────────────────────────>│
     │                            │                              │
     │                            │                              │  6. Update Local Config
     │                            │                              │     - Frequency bands
     │                            │                              │     - Measurement interval
     │                            │                              │
     │  7. View Updated Config    │                              │
     │  <──────────────────────── │                              │
     │                            │                              │
```

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

```
frontend/
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

1. **User Authentication (Web Interface)**
   - Username/password authentication
   - Session management (JWT tokens or session cookies)
   - Role-based access (admin vs viewer)

2. **Device Authentication**
   - Device registration with unique device ID
   - API key or token-based authentication
   - MAC address validation

### 7.2 Data Security

1. **Transport Security**
   - HTTP for all communication (unencrypted, no certificates)
   - WiFi network (WPA2/WPA3 for WiFi authentication, but application traffic unencrypted)

2. **Data Storage Security**
   - File system access (local file storage)
   - Secure password hashing (bcrypt, Argon2)
   - Configuration data storage (unencrypted)

3. **API Security**
   - Input validation and sanitization
   - Rate limiting
   - CORS configuration
   - SQL injection prevention (parameterized queries)

### 7.3 Network Security

- Firewall rules on web server
- Network segmentation (optional)
- VPN access for remote administration (optional)

---

## 8. Deployment Architecture

### 8.1 Deployment Platform

**Target Platform:**
- **Operating System:** Ubuntu 20.04 LTS
- **Web Server:** Nginx (already installed and running)
- **Deployment Type:** On-premise or cloud server
- **Network:** Local network or public IP with WiFi access

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
  - Audio: ESP-IDF I2S driver (driver/i2s.h) for INMP441 microphone module
  - NVS: Non-volatile storage for configuration (nvs_flash)
  - NTP: Network time protocol (lwip)
- **I2S Configuration:** 16-48 kHz sample rate, 24-bit depth, mono channel
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

### 9.6 Development Environment

**Development Platform:**
- **Development Machine:** MacBook with Cursor IDE
- **Target Server:** Ubuntu 20.04 LTS server
- **Remote Access:** SSH for server development and deployment
- **Local Development:** MacBook for code editing and ESP32 firmware development

**Development Workflow:**
1. **Code Development:**
   - Edit code on MacBook using Cursor IDE
   - Source code stored locally on MacBook
   - Version control (Git) for code management

2. **Server Development:**
   - SSH into Ubuntu server for server-side development
   - Deploy backend and frontend to server
   - Test and debug on server environment

3. **ESP32 Firmware Development:**
   - Develop firmware code on MacBook using Cursor IDE
   - Build firmware using ESP-IDF on MacBook
   - Flash ESP32 devices via USB from MacBook
   - Test devices locally before deployment

**Remote Server Access:**
- **SSH Connection:** `ssh user@server-ip`
- **File Transfer:** SCP or SFTP for transferring files
- **Remote Development:** Use Cursor's remote SSH extension or terminal
- **Port Forwarding:** May be needed for testing (if server behind firewall)

**Development Tools on MacBook:**
- **IDE:** Cursor (for code editing)
- **ESP32 Development:**
  - ESP-IDF framework
  - esptool.py for flashing
  - USB drivers for ESP32 (CP2102 or CH340 drivers)
- **Version Control:** Git
- **Terminal:** macOS Terminal or iTerm2
- **SSH Client:** Built-in SSH or Terminal

**Server Development Tools:**
- **Remote Access:** SSH
- **File Editing:** nano, vim, or remote editing via Cursor
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
- **FFT Processing:** Optimize FFT size for ESP32 capabilities (256-1024 point FFT)
- **Sampling Rate:** Balance between frequency resolution and processing load (recommended 16 kHz for INMP441)
- **Calibration Processing:**
  - Apply calibration offsets efficiently (simple addition operation)
  - Store both raw and calibrated values for comparison
  - Cache calibration values in memory to avoid repeated lookups
- **Data Batching:** Batch multiple measurements if network is slow
- **I2S DMA:** Use DMA for efficient data transfer from INMP441 to ESP32 memory

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
- **FFT:** Fast Fourier Transform for frequency domain analysis
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

