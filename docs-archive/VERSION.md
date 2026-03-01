# Sound Monitoring Mesh System - Version Information

## Current Version: 2.1.0
**Release Date:** February 12, 2026

## Component Versions

### Firmware
- **Version:** 2.1.0-prod
- **Platform:** ESP32-C3
- **Build System:** ESP-IDF 6.1

### Backend API
- **Version:** 2.1.0
- **Runtime:** Node.js >=18.0.0
- **Framework:** Express.js 4.18.2

### Frontend
- **Version:** 2.1.0
- **Main Dashboard:** index.html
- **Kiosk Display:** kiosk.html
- **Dependencies:** Chart.js 4.4.0

## Version History

### 2.1.0 (2026-02-12) 🚨 CRITICAL SAMPLING UPDATE
**Continuous Sampling with Peak Detection**
- **Firmware 2.1.0-prod:**
  - Implemented continuous audio sampling (removing 1-second gaps between samples)
  - Added peak dB tracking over 5-second reporting windows
  - Now captures 100% of sound instead of 6.4%
  - Reports both RMS average and peak dB values
  - Improved FFT sample coverage from 78 samples every 5 minutes to 78 samples every 5 seconds
- **Backend Updates:**
  - Added `db_level_peak` and `db_level_peak_raw` fields to measurement storage
  - Updated CSV exports to include peak values
  - Backward compatible with older firmware versions
- **Frontend Updates:**
  - Dashboard displays both average and peak dB readings
  - Peak values shown in red for visibility
  - Kiosk display updated with dual readings
  - Charts show peak levels as dashed line overlays
  - Alert thresholds now based on peak values for better event detection
- **Impact:** This update addresses critical issue where loud noise events were not being captured, providing accurate monitoring of peak sound levels in noisy environments

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
