# Sound Monitoring Mesh System - Version Information

## Current Version: 2.0.0
**Release Date:** February 12, 2026

## Component Versions

### Firmware
- **Version:** 1.2.1-prod
- **Platform:** ESP32-C3
- **Build System:** ESP-IDF 6.1

### Backend API
- **Version:** 2.0.0
- **Runtime:** Node.js >=18.0.0
- **Framework:** Express.js 4.18.2

### Frontend
- **Version:** 2.0.0
- **Main Dashboard:** index.html
- **Kiosk Display:** kiosk.html
- **Dependencies:** Chart.js 4.4.0

## Version History

### 2.0.0 (2026-02-12) 🎯 MAJOR RELEASE
- Historical data playback feature
- Timeline controls with variable speed
- Date/time range selection
- Transport controls (play, pause, jog, skip)
- Backend API endpoints for historical queries
- Enhanced triangulation visualization

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

## Development Status

### Currently in Development (Dev System Only)
- v2.0.0 historical playback feature
- Not yet deployed to production server

### Production Deployment
- Production server running v1.2.0
- Historical playback available for local development and testing

---

**Maintainer:** Stephen Klosky  
**Last Updated:** February 12, 2026
