# Sound Level Mesh System

A distributed sound monitoring system consisting of 10 ESP32-C3-based WiFi sensor devices that communicate with a central web server to monitor, analyze, and report sound levels and frequency band measurements.

**Hardware Status:** All hardware components have been purchased and are awaiting delivery (January 2026).

## 📋 Project Status

**Current Phase: Design and Planning**

This project is currently in the **design and planning phase**. All system requirements, architecture, and hardware specifications have been documented, but **no code has been generated yet**.

### What's Complete
- ✅ Product Requirements Document (PRD)
- ✅ System Architecture Document
- ✅ Hardware Design Document
- ✅ Technical specifications and design decisions
- ✅ **Hardware Purchased** (awaiting delivery - January 2026)
  - 10 × ESP32-C3 Super Mini Development Boards
  - 10 × MH-ET LIVE INMP441 I2S Microphone Modules
  - 10 × USB Wall Charger Adapters
  - 12 × USB-C Charging Cables

### What's Next
- ⏳ Hardware delivery and verification (ESP32-C3 I2S pin verification)
- ⏳ ESP32-C3 firmware development (ESP-IDF)
- ⏳ Backend API server development
- ⏳ Frontend web application development
- ⏳ Hardware assembly and testing
- ⏳ System integration and deployment

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
- **Development Machine:** MacBook with Cursor IDE
- **Remote Access:** SSH to Ubuntu 20.04 server
- **Version Control:** Git with GitHub

## 📁 Repository Structure

```
sound-monitoring-mesh/
├── README.md                           # This file
├── sound level mesh system PRD.md      # Product Requirements Document
├── sound level mesh architecture.md    # Architecture Document
├── sound level mesh hardware design.md # Hardware Design Document
└── .gitignore                          # Git ignore rules
```

## 🚀 Getting Started

### For Developers

1. **Clone the repository:**
   ```bash
   git clone git@github.com:sklosky-nl/sound-monitoring-mesh.git
   cd sound-monitoring-mesh
   ```

2. **Review the documentation:**
   - Start with the PRD for project requirements
   - Review the Architecture Document for technical details
   - Check the Hardware Design Document for hardware setup

3. **Development Environment Setup:**
   - See Architecture Document Section 9.6 for MacBook setup
   - See Architecture Document Section 9.7 for ESP-IDF installation
   - See Architecture Document Section 8.5 for Ubuntu server setup

### For Stakeholders

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
| Hardware Purchase | ✅ Complete | All components purchased, awaiting delivery |
| Hardware Verification | ⏳ Pending | ESP32-C3 I2S pins need verification upon receipt |
| ESP32-C3 Firmware | ⏳ Not Started | ESP-IDF development pending hardware verification |
| Backend API | ⏳ Not Started | Technology stack TBD |
| Frontend Web App | ⏳ Not Started | Framework TBD |
| Hardware Assembly | ⏳ Not Started | Awaiting hardware delivery |
| Testing | ⏳ Not Started | Test plans to be developed |

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

**Last Updated:** 2024  
**Project Phase:** Design and Planning  
**Code Status:** No code generated yet

