# Sound Level Mesh System

A distributed sound monitoring system consisting of 10 ESP32-C3-based WiFi sensor devices that communicate with a central web server to monitor, analyze, and report sound levels and frequency band measurements.

**Hardware Status:** All hardware components have been purchased and are awaiting delivery (January 2026).

## 📋 Project Status

**Current Phase: ✅ BUILD COMPLETE - Testing in Progress**

**All System Code Built (January 30, 2026):**

### ✅ Development Environment #1
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

**📖 See [BUILD_COMPLETE.md](BUILD_COMPLETE.md) for full build summary**  
**🚀 See [QUICKSTART.md](QUICKSTART.md) for setup instructions**

### What's Complete
- ✅ Product Requirements Document (PRD)
- ✅ System Architecture Document
- ✅ Hardware Design Document
- ✅ Technical specifications and design decisions
- ✅ **Component Pinout Reference** - Verified ESP32-C3 and INMP441 pinouts
- ✅ **Hardware Delivered and Connected**
  - ESP32-C3 SuperMini (USB connected to MacBook)
  - INMP441 I2S Microphone (wired to ESP32-C3)
  - USB-C cable and power
- ✅ **Development Environment #1 Configured**
  - MacBook with all development tools installed
  - ESP-IDF framework ready
  - Home WiFi network setup
- ✅ **ESP32-C3 Firmware Built** - Complete, ready to flash
  - 500+ lines of C code
  - I2S, FFT, WiFi, HTTP client
  - See `firmware/sound-level-sensor/`
- ✅ **Backend API Server Built** - Complete, ready to run
  - Node.js/Express with file-based storage
  - Full REST API implementation
  - See `backend/`
- ✅ **Frontend Dashboard Built** - Complete, ready to serve
  - Responsive web interface
  - Real-time monitoring and management
  - See `frontend/`

### What's Next - Testing & Deployment
- ✅ Configure and flash ESP32 firmware
- ✅ Start backend and frontend servers
- ✅ Register devices and test hardware (microphone working)
- ⏳ Complete HTTP communication testing (VPN interference resolved)
- ⏳ Verify data flow end-to-end
- ⏳ Calibrate sensors
- ⏳ System integration testing
- ⏳ Production deployment (Environment #2 - Remote Ubuntu server)

## 🎯 Project Overview

The Sound Level Mesh System is designed to:

- Monitor sound levels (dB) in real-time from 10 distributed sensor locations
- Measure sound levels across configurable frequency bands
- Provide centralized web-based monitoring and administration
- Support sensor calibration with dB offset adjustments
- Store measurement data using file-based storage (JSON/CSV)
- Deploy on Ubuntu 20.04 server with Nginx

## 📚 Documentation

This repository contains comprehensive documentation for the system:

### [Product Requirements Document (PRD)](sound%20level%20mesh%20system%20PRD.md)
Complete product requirements including:
- System goals and objectives
- Feature specifications
- User personas and use cases
- Success criteria and metrics
- Timeline and milestones

### [Architecture Document](sound%20level%20mesh%20architecture.md)
Technical architecture covering:
- System architecture and components
- Data flow and communication protocols
- File-based storage design
- API specifications
- Deployment architecture (Ubuntu 20.04 + Nginx)
- Development environment setup (MacBook + Cursor IDE)

### [Hardware Design Document](sound%20level%20mesh%20hardware%20design.md)
Hardware specifications including:
- ESP32 microcontroller specifications
- INMP441 I2S microphone module details
- Wiring diagrams and pin connections
- Power supply requirements
- Enclosure and environmental considerations
- Assembly and testing procedures

### [Component Pinout Reference](COMPONENT_PINOUT_REFERENCE.md)
Complete verified pinout specifications:
- ESP32-C3 SuperMini complete pinout with physical orientation
- INMP441 microphone pinout with pin functions
- Verified I2S wiring configuration (GPIO 4, 5, 6)
- Software configuration examples
- Testing and verification procedures
- Breadboard/protoboard wiring guidance

## 🛠️ Technology Stack

### Hardware
- **Microcontroller:** ESP32-C3 Super Mini Development Board (4MB flash) - ✅ **10 units purchased**
- **Microphone:** MH-ET LIVE INMP441 I2S Digital Microphone Module - ✅ **10 units purchased**
- **Power:** USB Wall Chargers + USB-C Cables - ✅ **10 chargers, 12 cables purchased**
- **Quantity:** 10 monitoring devices
- **Status:** Hardware purchased, awaiting delivery (January 2026)

### Firmware
- **Framework:** ESP-IDF (Espressif IoT Development Framework)
- **Development:** MacBook with Cursor IDE
- **Libraries:** ESP-IDF WiFi, HTTP client, I2S driver, ESP-DSP

### Server
- **OS:** Ubuntu 20.04 LTS
- **Web Server:** Nginx (reverse proxy and static file serving)
- **Backend:** Node.js, Python, or Go (TBD)
- **Frontend:** React, Vue.js, or vanilla JavaScript (TBD)
- **Storage:** File-based (JSON for config, CSV/JSON for measurements)

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
- **Backend API**: Port 3000 (default) - http://localhost:3000
- **Frontend UI**: Port 8080 (default) - http://localhost:8080
- **ESP32 connects to**: http://192.168.68.67:3000 (MacBook's WiFi IP)

**Notes:** 
- Port 5000 is in use by macOS ControlCenter, so avoid using it.
- Both backend and frontend ports should be **configurable via environment variables** to avoid conflicts.

**Quick Start for Development:**

1. **Activate ESP-IDF Environment:**
   ```bash
   . $HOME/esp/esp-idf/export.sh
   ```

2. **Build and Flash ESP32 Firmware:**
   ```bash
   cd firmware/
   idf.py build
   idf.py -p /dev/tty.usbserial-* flash monitor
   ```

3. **Run Backend Server:**
   ```bash
   cd backend/
   npm install  # or pip install -r requirements.txt for Python
   PORT=3000 npm start    # or python app.py (configure to use port 3000)
   ```

4. **Run Frontend (in another terminal):**
   ```bash
   cd frontend/
   npm install
   PORT=8080 npm start    # Frontend will run on port 8080
   ```

5. **Access Web Interface:**
   - Backend API: http://localhost:3000/api/
   - Frontend: http://localhost:8080
   
   **Note:** Port 5000 is in use by macOS ControlCenter (AirPlay), so we use 3000 and 8080.

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

- **Number of Devices:** 10 ESP32 monitoring nodes
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

**Last Updated:** January 30, 2026  
**Project Phase:** ✅ Build Complete - Ready for Testing  
**Code Status:** All components built and ready to deploy

**📖 Next Steps:** See [QUICKSTART.md](QUICKSTART.md) for setup instructions

