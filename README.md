# Sound Level Mesh System

A distributed sound monitoring system consisting of ESP32-C3-based WiFi sensor devices that communicate with a central web server to monitor, analyze, and report sound levels and frequency band measurements.

**Current Status:** ✅ **Operational with 9 devices** actively sending real-time data every 5 seconds.

**Hardware Status:** All hardware components have been purchased and are awaiting delivery (January 2026).

## 📋 Project Status

**Current Phase: ✅ BUILD COMPLETE - Production Deployment at Nova Labs**

**All System Code Built (January 30, 2026):**

### ✅ Development Environment #1 (MacBook - Testing)
- ✅ MacBook Development Setup Complete
  - VS Code with Cursor IDE
  - ESP-IDF v6.1-dev-2300 installed and configured
  - Node.js v23.11.0, Python 3.12.8
  - All build tools installed (cmake, ninja, dfu-util)
- ✅ Hardware Setup Complete
  - ESP32-C3 SuperMini connected via USB to MacBook (/dev/cu.usbmodem2101)
  - INMP441 microphone wired to ESP32-C3 (GPIO 4, 5, 6 for I2S)
  - Home WiFi network for ESP32 ↔ MacBook communication
  - Verified working: I2S audio sampling (56-70 dB range observed)
- ✅ Network Configuration
  - WiFi SSID: YOUR_WIFI_SSID (WPA2)
  - MacBook IP: 192.168.68.57 (en0 interface)
  - Backend: http://192.168.68.57:3000
  - Frontend: http://localhost:8080
  - Device MAC: 08:92:72:84:1d:18

### ⏳ Production Environment #2 (Nova Labs - In Progress)
- 📍 Location: Nova Labs makerspace
- 📡 WiFi Network: YOUR_WORKSHOP_WIFI (isolated IoT network)
- 🔒 Network Password: YOUR_WORKSHOP_PASSWORD
- 💻 Server: Ubuntu 20.04+ (TBD)
- 📱 Deployment: All 10 ESP32-C3 sensors
- 🌐 Backend URL: TBD (configure when server ready)
- 🔑 **Shared API Key**: All devices use same key (configured in firmware and backend)
  - Example: `YOUR_API_KEY_HERE`
  - Set in firmware via `CONFIG_API_KEY` (sdkconfig)
  - Set in backend via `SHARED_API_KEY` in `.env`
  - Must match exactly for authentication to work

### ✅ Software Components Built
- ✅ **ESP32-C3 Firmware** - Complete and tested
  - I2S audio sampling (16kHz, 32-bit), FFT analysis (1024 points), frequency bands
  - WiFi connectivity with automatic reconnection
  - HTTP client with retry logic (3 attempts, exponential backoff)
  - NTP time sync, robust error handling
  - Successfully reading microphone (56-70 dB range)
  - Full source code in `firmware/sound-level-sensor/`
- ✅ **Backend API Server** - Complete and running
  - Node.js/Express RESTful API with 10MB body parser
  - Device management, measurement storage (file-based JSON)
  - 30-second request/response timeouts for IoT devices
  - Full source code in `backend/`
- ✅ **Frontend Dashboard** - Complete and running
  - Responsive web interface
  - Real-time monitoring, device management
  - Full source code in `frontend/`

### What's Complete
- ✅ Product Requirements Document (PRD)
- ✅ System Architecture Document
- ✅ Hardware Design Document
- ✅ Technical specifications and design decisions
- ✅ **Component Pinout Reference** - Verified ESP32-C3 and INMP441 pinouts
- ✅ **Hardware Delivered and Connected**
  - ESP32-C3 SuperMini devices
  - INMP441 I2S Microphones
  - USB-C cables and power
- ✅ **Development Environment Configured**
  - MacBook with all development tools installed
  - ESP-IDF framework ready
  - WiFi network setup
- ✅ **ESP32-C3 Firmware** - Complete and tested
  - I2S audio sampling (16kHz, 32-bit)
  - FFT analysis (1024 points) with frequency band measurement
  - WiFi connectivity with HTTP client
  - Shared API key authentication
  - Automatic MAC address-based device identification
  - **OTA firmware updates** - Remote updates over WiFi
  - See `firmware/sound-level-sensor/`
- ✅ **Backend API Server** - Complete and operational
  - Node.js/Express with file-based JSON storage
  - Full REST API with 10 route modules
  - Shared API key validation
  - Device, measurement, alert, analytics, triangulation endpoints
  - **Firmware management** - OTA update serving and version control
  - See `backend/`
- ✅ **Frontend Dashboard** - Complete and operational
  - 7 functional tabs (Dashboard, Devices, Triangulation, History, Alerts, Analytics, Settings)
  - Real-time device monitoring with auto-refresh
  - Historical data visualization with Chart.js
  - Second-precision datetime controls for history and analytics
  - Device management and configuration
  - Alert configuration and monitoring
  - Sound source triangulation with visual map
  - Public kiosk display mode
  - See `frontend/`

### Current System Status
- ✅ **Multiple devices registered and operational**
- ✅ **Real-time data collection active**
- ✅ **All frontend features functional**
- ✅ **Backend API fully operational**
- ✅ **End-to-end data flow verified**

## 🎯 Project Overview

The Sound Level Mesh System is designed to:

- Monitor sound levels (dB) in real-time from 10 distributed sensor locations
- Measure sound levels across configurable frequency bands
- Provide centralized web-based monitoring and administration
- Support sensor calibration with dB offset adjustments
- Store measurement data using file-based storage (JSON/CSV)
- Deploy on Ubuntu 20.04 server with Nginx

## 📚 Documentation

### Main Documentation

- **[HARDWARE_AND_FIRMWARE.md](HARDWARE_AND_FIRMWARE.md)** - Complete hardware setup, wiring, firmware building, flashing, and device registration
- **[DEVELOPER_REFERENCE.md](DEVELOPER_REFERENCE.md)** - Architecture, API documentation, security, and development guidelines

### Archive

All detailed reference docs and older documentation have been consolidated. See [docs-archive/](docs-archive/) for:
- Product Requirements Document (PRD)
- Detailed Architecture Document
- Hardware Design Specifications
- Previous build/setup guides
Complete verified pinout specifications:
- ESP32-C3 SuperMini complete pinout with physical orientation
### Archive

Older documentation files have been consolidated. See [docs-archive/](docs-archive/) for archived files.

## 🛠️ Technology Stack

### Hardware
- **Microcontroller:** ESP32-C3 Super Mini Development Board (4MB flash) - ✅ **10 units purchased**
- **Microphone:** MH-ET LIVE INMP441 I2S Digital Microphone Module - ✅ **10 units purchased**
- **Power:** USB Wall Chargers + USB-C Cables - ✅ **10 chargers, 12 cables purchased**
- **Enclosure:** Microphone foam windscreens - ✅ **Simple, RF-transparent dust protection**
- **Deployed:** 9 devices currently operational and sending data
- **Status:** Hardware delivered and operational (February 2026)

### Firmware
- **Framework:** ESP-IDF (Espressif IoT Development Framework)
- **Development:** MacBook with Cursor IDE
- **Libraries:** ESP-IDF WiFi, HTTP client, I2S driver, ESP-DSP
- **Device Identification:** Automatic via MAC address (e.g., `08:92:72:84:1d:18`)
- **Authentication:** Shared API key across all devices
- **OTA Updates:** Over-the-air firmware updates via HTTP
- **Partition Table:** Dual OTA partitions for safe rollback
- **Version Control:** Semantic versioning (MAJOR.MINOR.PATCH)

### Authentication Architecture
**Shared API Key Approach:**
- All devices use the **same API key** compiled into firmware
- Simplifies deployment: one firmware build for all devices
- Each device uniquely identified by MAC address (e.g., `08:92:72:84:1d:18`)
- Backend validates shared key + verifies device exists  
- Suitable for trusted, internal networks only
- Current deployment: 9 devices using shared key `YOUR_API_KEY_HERE`

**Configuration:**
- Firmware: `CONFIG_API_KEY` in `sdkconfig`
- Backend: `SHARED_API_KEY` or `API_KEY` in `.env`
- **Must match exactly** for authentication

### Server
- **Runtime:** Node.js v18+ with Express.js
- **API:** RESTful architecture with 9 route modules
- **Storage:** File-based JSON (devices, measurements, alerts, configurations)
- **Deployment:** Can run on any Node.js environment (development: MacBook, production: Ubuntu/Nginx)

### Frontend
- **Technology:** Vanilla JavaScript with Chart.js for visualizations
- **Architecture:** Single-page application with tab-based navigation
- **Features:**
  - **Dashboard:** Real-time device monitoring with live statistics
  - **Devices:** Device registration, management, and configuration
  - **Triangulation:** Sound source localization with visual 2D map
    - Interactive sensor position configuration
    - Acoustic barrier modeling
    - **Map Labels:** Custom text annotations for zones/equipment (add/edit/delete)
  - **History:** Time-series data viewer with second-precision datetime controls
  - **Alerts:** Alert rule configuration and history viewer
  - **Analytics:** Statistical analysis and trend visualization
  - **Settings:** System configuration and data management
  - **Kiosk Mode:** Public display dashboard with auto-scaling map and labels
- **Responsive:** Works on desktop and tablet devices

### Development Environment
- **Development Machine:** MacBook with VS Code/Cursor IDE
- **Remote Access:** SSH to Ubuntu 20.04 server (for production deployment)
- **Local Development:** MacBook for all development and testing

**Current Setup (Environment #1):**
- MacBook serves as both development machine AND web server
- ESP32-C3 connected via USB (for flashing) and WiFi (for runtime)
- INMP441 microphone connected via I2S to ESP32-C3
- Home WiFi network for ESP32 ↔ MacBook communication
- All components co-located for rapid development

**Future Setup (Environment #2):**
- MacBook for development
- Remote Ubuntu 20.04 server for production deployment
- 10 ESP32 devices deployed at various locations

## 📁 Repository Structure

```
sound-monitoring-mesh/
├── README.md                           # This file
├── sound level mesh system PRD.md      # Product Requirements Document
├── sound level mesh architecture.md    # Architecture Document
├── sound level mesh hardware design.md # Hardware Design Document
├── COMPONENT_PINOUT_REFERENCE.md       # Verified component pinouts
├── enclosure/                          # 3D printable enclosure files
└── .gitignore                          # Git ignore rules
```

## 🚀 Getting Started

### Current Development Environment (Environment #1)

**You are here!** This is the active development setup as of January 2026.

**Setup Summary:**
- **MacBook** - Development machine running VS Code, backend server, and frontend
- **ESP32-C3 SuperMini** - Connected via USB to MacBook, connected to WiFi for runtime
- **INMP441 Microphone** - Wired to ESP32-C3 using I2S (GPIO 4, 5, 6)
- **Home WiFi** - Network connecting ESP32 to MacBook backend

**Port Configuration:**
- **Server**: Port 3000 (backend serves both API and frontend)
- **Access URLs**:
  - Main Dashboard: http://localhost:3000
  - API Endpoints: http://localhost:3000/api/*
  - Health Check: http://localhost:3000/health
  - Kiosk Display: http://localhost:3000/kiosk.html
- **ESP32 connects to**: http://192.168.68.57:3000 (MacBook's WiFi IP)

**Notes:** 
- Port 5000 is in use by macOS ControlCenter, so avoid using it.
- Both backend and frontend ports should be **configurable via environment variables** to avoid conflicts.

**Quick Start for Development:**

1. **Start Backend Server (serves both API and frontend):**
   ```bash
   cd backend/
   npm install
   npm start    # Runs on port 3000
   ```

2. **Access the System:**
   - Main Dashboard: http://localhost:3000
   - Kiosk Display: http://localhost:3000/kiosk.html
   - API Health: http://localhost:3000/health
   
   **Note:** Frontend is served automatically by the backend. No separate frontend server needed.

3. **Flash ESP32 Firmware (if needed):**
   ```bash
   cd firmware/sound-level-sensor
   . $HOME/esp/esp-idf/export.sh
   idf.py build
   idf.py -p /dev/cu.usbmodem* flash monitor
   ```

4. **Access Features:**
   - Main Dashboard: http://localhost:3000
   - API Docs: See DEVELOPER_REFERENCE.md
   - Kiosk Display: http://localhost:3000/kiosk.html

### For Future Production Deployment (Environment #2)

For deploying to a remote Ubuntu 20.04 server with multiple ESP32 devices:

1. **Clone the repository:**
   ```bash
   git clone git@github.com:sklosky-nl/sound-monitoring-mesh.git
   cd sound-monitoring-mesh
   ```

2. **Review the documentation:**
   - Start with the PRD for project requirements
   - Review the Architecture Document Section 8.1.2 for production deployment
   - Check the Hardware Design Document for hardware setup
   - Review Component Pinout Reference for wiring

3. **Production Server Setup:**
   - See Architecture Document Section 8.5 for Ubuntu 20.04 setup
   - Configure Nginx as reverse proxy
   - Deploy backend and frontend applications

### For Developers and Stakeholders

Review the [Product Requirements Document](sound%20level%20mesh%20system%20PRD.md) for:
- Project goals and objectives
- Feature requirements
- Success metrics
- Timeline and milestones

## 📊 System Specifications

- **Number of Devices:** 9 ESP32 monitoring nodes (currently operational)
- **Hardware Capacity:** 10 devices purchased (1 spare/development unit)
- **Communication:** WiFi (802.11 b/g/n) to central server
- **Data Storage:** File-based (7-day default retention, configurable)
- **Measurement Range:** 30-130 dB
- **Frequency Bands:** Configurable per device
- **Calibration:** Per-device dB offset calibration
- **Web Interface:** Responsive design (desktop and mobile)

## 🔧 Key Features

- **Real-time Monitoring:** Continuous sound level monitoring with < 10 second latency
- **Frequency Band Analysis:** Configurable frequency bands for targeted sound analysis
- **Sensor Calibration:** Per-device dB offset calibration for accurate measurements
- **Centralized Management:** Web-based administration and monitoring interface
- **File-based Storage:** Simple deployment without database requirements
- **Responsive Web App:** Works on desktop and mobile browsers

## 📝 Development Status

| Component | Status | Notes |
|-----------|--------|-------|
| Documentation | ✅ Complete | All design documents finalized |
| **Component Pinout** | ✅ **Complete** | **ESP32-C3 and INMP441 pinouts verified** |
| Hardware Purchase | ✅ Complete | All components purchased and delivered |
| **Hardware Assembly** | ✅ **Complete** | **ESP32-C3 connected to INMP441 via I2S** |
| **Dev Environment #1** | ✅ **Complete** | **MacBook setup with ESP-IDF, USB & WiFi ready** |
| **ESP32-C3 Firmware** | ✅ **BUILT** | **Complete implementation, ready to flash** |
| **Backend API** | ✅ **BUILT** | **Node.js server complete, ready to run** |
| **Frontend Web App** | ✅ **BUILT** | **Dashboard complete, ready to serve** |
| **Integration Testing** | ⏳ Next | Testing with Environment #1 |
| Production Deployment | ⏳ Future | Environment #2 - Remote server |

## 🔒 Security

**⚠️ IMPORTANT: This repository does NOT contain sensitive credentials**

Before committing to a public repository, sensitive files have been excluded via `.gitignore`:

- `firmware/sound-level-sensor/sdkconfig` - WiFi credentials and server URLs
- `backend/data/` - Device data, measurements, and logs
- `.env` files - Environment variables

**Setup Required:**
1. Copy `firmware/sound-level-sensor/sdkconfig.example` to `sdkconfig`
2. Run `idf.py menuconfig` and configure your WiFi credentials
3. Backend creates data directories automatically on first run

📖 **See [SECURITY.md](SECURITY.md) for complete security guide**

## 🤝 Contributing

This is currently a private project in the design phase. Development will begin once the design phase is complete and approved.

## 📄 License

[License to be determined]

## 👤 Author

**Stephen Klosky**  
GitHub: [@sklosky-nl](https://github.com/sklosky-nl)  
Email: stephen.klosky@nova-labs.org

## 📞 Contact

For questions or inquiries about this project, please contact the project maintainer.

---

## 📋 Recent Changes

### February 10, 2026 - OTA Firmware Updates
**New Feature: Over-The-Air Firmware Updates**
- Added OTA update capability for remote firmware deployment
- **Firmware Changes:**
  - Updated partition table to `TWO_OTA` for dual app partitions
  - Increased flash size configuration from 2MB to 4MB
  - Added OTA update task checking for updates every hour
  - Automatic rollback on failed updates
  - Version tracking with semantic versioning (e.g., "1.0.0")
  - First check 5 minutes after boot, then hourly
- **Backend: Firmware Management API**
  - New model: `Firmware.js` with version tracking and binary management
  - New routes: `firmware.js` providing OTA endpoints
  - Storage: `backend/data/firmware/` directory for binaries and metadata
  - Endpoints: `/check`, `/download/:version`, `/upload`, `/versions`, `/latest`
  - HTTP-based downloads for simplicity on trusted networks
  - SHA-256 checksums for integrity verification
- **Features:**
  - Automatic update checks and downloads
  - Staged rollout support (monitor first device before wide deployment)
  - Version comparison using semantic versioning
  - Safe dual-partition updates with automatic rollback
  - Update history and version tracking
- **Documentation:**
  - Added comprehensive OTA section to HARDWARE_AND_FIRMWARE.md
  - Created firmware management README at `backend/data/firmware/README.md`
  - Updated system documentation for OTA workflows
- **Use Cases:** Bug fixes, feature additions, configuration updates without physical access
- **Safety:** Dual partitions prevent bricking, automatic rollback on failures

### February 8, 2026 - Map Label System
**New Feature: Custom Map Labels**
- Added map label management system for annotating workshop maps
- Backend: New `/api/labels` REST API with full CRUD operations
  - Model: `MapLabel.js` with JSON file storage
  - Routes: `labels.js` providing GET, POST, PUT, DELETE endpoints
  - Storage: `backend/data/map_labels.json`
- Frontend: Interactive label management in Triangulation tab
  - "Configure Labels" button opens modal interface
  - Add/edit/delete labels with position and styling
  - Full style customization (colors, fonts, opacity, borders)
  - Toggle label visibility with "Labels" checkbox
  - Real-time canvas rendering with drop shadows
- Kiosk Display: Auto-rendering of styled labels on SVG map
  - Labels display between barriers and sensors
  - Dynamic scaling with map bounds
  - Sample labels included: Welding Station, Assembly Area, Storage
- Use cases: Equipment markers, zone definitions, safety indicators
- Documentation: Updated DEVELOPER_REFERENCE.md with API details and schemas

### January 30, 2026 - Build Complete
- All firmware, backend, and frontend components completed
- 9 ESP32-C3 devices operational and sending data
- Full triangulation system with multi-source detection
- Kiosk display mode for public viewing

---

**Last Updated:** February 10, 2026  
**Project Phase:** ✅ Build Complete - Production Deployment  
**Code Status:** All components operational with 9 active devices

**📖 Next Steps:** See [QUICKSTART.md](QUICKSTART.md) for setup instructions

