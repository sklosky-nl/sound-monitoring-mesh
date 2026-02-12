# Sound Monitoring Mesh System - Version Information

## Current Version: 1.2.0
**Release Date:** February 11, 2026

## Component Versions

### Firmware
- **Version:** 1.2.1-prod
- **Platform:** ESP32-C3
- **Build System:** ESP-IDF 6.1

### Backend API
- **Version:** 1.2.0
- **Runtime:** Node.js >=18.0.0
- **Framework:** Express.js 4.18.2

### Frontend
- **Version:** 1.2.0
- **Main Dashboard:** index.html
- **Kiosk Display:** kiosk.html
- **Dependencies:** Chart.js 4.4.0

## Version History

### 1.2.0 (2026-02-11)
- Production deployment fixes
- Kiosk display implementation
- API endpoint fixes
- Frontend cache-busting improvements

### 1.1.1 (2026-02-08)
- Dual microphone support
- Frequency band analysis
- Triangulation service

### 1.0.0 (2026-01-15)
- Initial release
- Core monitoring functionality

## Deployment Information

### Production Server
- **URL:** xibo.space.nova-labs.org
- **Frontend Path:** /sound/
- **API Path:** /api/sound/
- **Backend Port:** 3000 (proxied via Apache)

### WiFi Configuration
- **Network:** REDACTED_WORKSHOP_WIFI_SSID
- **Frequency:** 2.4 GHz
- **Security:** WPA2-PSK

### Active Sensors
- **Total Registered:** 9 devices
- **Firmware 1.2.1-prod:** 5 devices
- **Firmware 1.1.1:** 4 devices

## Next Release: 2.0.0 (Planned)

### Major Features
- Historical data playback
- Timeline controls with jog functionality
- Variable playback speed (0.25x - 10x)
- Enhanced triangulation visualization

---

**Maintainer:** Stephen Klosky  
**Last Updated:** February 11, 2026
