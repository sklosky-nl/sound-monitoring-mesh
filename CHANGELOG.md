# Changelog

All notable changes to the Sound Monitoring Mesh System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.1-prod] - 2026-02-28

### Fixed
- **Critical**: I2S DMA mis-packing caused by using `I2S_DATA_BIT_WIDTH_24BIT` instead of `I2S_DATA_BIT_WIDTH_32BIT` — resulted in constant ~110 dB readings regardless of actual audio level
- Frequency band SPL calculation rewritten to use self-normalizing energy fraction (avoids dependence on absolute FFT magnitude scale)
- 10 kΩ pull-down resistor on SD line (GPIO 4 to GND) confirmed required and documented

### Added
- `2.1.1-prod` firmware binary for production (Nova Labs WiFi + production backend)
- `2.1.2-dev` firmware binary for development OTA testing (dev WiFi + local backend)
- Removed legacy `versions-prod.json`; all versions tracked in `versions.json`

---

## [2.0.0] - 2026-02-12

### Added
- **Major Feature**: Historical data playback for triangulation visualization
  - Timeline controls with play/pause, jog forward/backward
  - Variable playback speed (0.25x, 0.5x, 1x, 2x, 5x, 10x)
  - Date/time range selection (day, hour, minute, second precision)
  - Transport controls (skip to start/end, jog 1 second)
  - Real-time timeline slider with progress indicator
  - Historical sensor state visualization
  - Historical sound source replay
  - Data caching for smooth playback
- Backend API endpoints for historical playback:
  - `/api/triangulation/playback/measurements` - Get measurements in time range
  - `/api/triangulation/playback/sources` - Get sound sources in time range
  - `/api/triangulation/playback/window` - Get data for specific time window
  - `/api/triangulation/playback/range` - Get available data range
- `PlaybackController` class for managing playback state and controls
- `getAvailableDates()` method in Measurement model
- `getLocationsByDateRange()` method in SourceLocation model
- Comprehensive playback UI with responsive design
- Playback mode indicator and controls styling

### Changed
- Version synchronized to 2.0.0 across all components
- Enhanced triangulation interface with playback mode toggle
- Updated frontend script versions for cache busting

### Developer Notes
- Playback feature implemented on dev system only (not yet deployed to production)
- Historical data playback allows analysis of past sound events
- Playback speed control enables both detailed analysis (slow) and overview (fast)

## [1.2.0] - 2026-02-11

### Added
- Kiosk display page for public-facing sound level monitoring
- Kiosk debug tool for API connectivity testing
- Production firmware deployment script with device identification
- Comprehensive flashing scripts for bulk sensor updates
- Firmware flash log tracking

### Fixed
- **Critical**: Fixed Apache ProxyPass configuration causing double `/api/api/` paths
- **Critical**: Fixed frontend API configuration to auto-detect production vs localhost
- Fixed kiosk.js JavaScript syntax errors in multiple functions
- Fixed kiosk triangulation endpoint paths to work with Apache proxy
- Fixed API module method calls for proper path construction
- Added missing `createMapLabel` function for map labels display
- Fixed `formatTimeAgo` function corruption
- Fixed `createSensorItem` incomplete HTML template
- Fixed `updateMap` function duplication and corruption

### Changed
- Updated frontend API module to use environment-aware base URLs
- Added cache-busting version parameters (v=16 through v=22) to frontend scripts
- Improved localStorage handling to clear cached localhost URLs in production
- Enhanced debug.html page with better error reporting
- Synced WiFi credentials to REDACTED_WORKSHOP_WIFI_SSID network for production deployment
- Updated server URL to xibo.space.nova-labs.org/api/sound

### Production Deployment
- Successfully flashed 5 sensors with firmware v1.2.1-prod
  - Identified: Green (08:92:72:84:1d:50), Purple (08:92:72:84:1e:4c)
  - 3 additional sensors flashed but pending physical identification
- Confirmed Blue sensor (08:92:72:84:1c:ec) actively posting data
- 9 total sensors registered in system

### Infrastructure
- Apache 2.4.41 reverse proxy configured
- Node.js backend deployed on port 3000
- Frontend served via Apache at /sound/ path
- Production server: xibo.space.nova-labs.org

## [1.1.1] - 2026-02-08

### Added
- Dual PDM microphone support (INMP441)
- Frequency band analysis (SPL per band)
- Device registration API endpoint
- Triangulation service for sound source localization
- Acoustic barrier modeling

### Changed
- Improved SPL calibration accuracy
- Enhanced WiFi auto-reconnect logic
- Optimized measurement posting frequency

## [1.0.0] - 2026-01-15

### Added
- Initial release
- ESP32-C3 firmware with WiFi connectivity
- Backend API server with Express.js
- Frontend dashboard with real-time updates
- Device management and configuration
- Measurement data collection and storage
- Alert system for threshold violations

[2.1.1-prod]: https://github.com/sklosky-nl/sound-monitoring-mesh/compare/v2.0.0...v2.1.1-prod
[2.0.0]: https://github.com/sklosky-nl/sound-monitoring-mesh/compare/v1.2.0...v2.0.0
[1.2.0]: https://github.com/sklosky-nl/sound-monitoring-mesh/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/sklosky-nl/sound-monitoring-mesh/compare/v1.0.0...v1.1.1
[1.0.0]: https://github.com/sklosky-nl/sound-monitoring-mesh/releases/tag/v1.0.0
