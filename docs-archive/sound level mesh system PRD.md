# Product Requirements Document: Sound Monitoring System

## Document Information
- **Version:** 1.4
- **Date:** February 2026
- **Status:** Production Ready with Sound Source Triangulation and Public Kiosk Display (v1.4)
- **Author:** Product Team
- **Last Updated:** February 2, 2026
- **Recent Enhancements:**
  - **Public kiosk display for 1080p monitors (v1.4)**
  - **Sound source triangulation and localization (v1.3)**
  - **Sensor position configuration interface (v1.3)**
  - **Acoustic environment mapping with barrier definition (v1.3)**
  - Dynamic frequency band configuration from server
  - Real-time configuration refresh (every 100 measurements)
  - Enhanced history visualization with multi-band charts
  - Full analytics dashboard with statistical analysis
  - Per-sensor calibration and band configuration
  - Color-coded alert thresholds (under 80dB green, 80-95dB yellow, over 95dB red)

---

## 1. Executive Summary

The Sound Monitoring System is a distributed network of 10 ESP32-based WiFi-enabled sensor devices that communicate with a central web server to monitor, analyze, and report sound levels and frequency band measurements. The system provides real-time monitoring capabilities with configurable frequency band analysis and flexible data retention policies.

### Key Value Propositions
- **Real-time Monitoring:** Continuous sound level monitoring with low-latency WiFi data transmission
- **Sound Source Localization:** Hybrid TDoA + RSS triangulation to identify the position of sound sources
- **Configurable Analysis:** Customizable frequency bands for targeted sound analysis
- **Spatial Awareness:** Sensor position mapping and acoustic environment modeling with barrier definition
- **Centralized Management:** Web-based administration and monitoring interface
- **Cost-Effective:** ESP32-based devices provide affordable, capable monitoring nodes
- **Flexible Configuration:** Adjustable measurement parameters and data retention policies

---

## 2. Problem Statement

### Current Challenges
- Traditional sound monitoring systems require extensive wired infrastructure
- Single points of failure can disrupt entire monitoring networks
- Limited scalability and high deployment costs
- Lack of real-time data aggregation and analysis
- Difficult to deploy in remote or challenging environments
- Limited visibility into sound patterns and trends over time

### Target Use Cases
- **Environmental Monitoring:** Noise pollution tracking and source identification in urban and industrial areas
- **Security & Safety:** Intrusion detection, gunshot detection with location, emergency event monitoring and source tracking
- **Industrial Monitoring:** Equipment health monitoring, predictive maintenance, noisy equipment localization
- **Smart City Applications:** Traffic noise management with source mapping, event monitoring with position tracking
- **Research & Development:** Acoustic research, wildlife monitoring with position tracking, urban planning with spatial noise analysis
- **Facility Management:** Identifying specific noise sources in large facilities, tracking sound-generating activities

---

## 3. Goals and Objectives

### Primary Goals
1. Deploy 10 ESP32-based WiFi monitoring devices
2. Achieve real-time sound level monitoring with < 5 second latency
3. Provide centralized web-based monitoring and administration
4. Support configurable frequency band measurements
5. Enable flexible data retention (default 7 days, configurable)

### Success Metrics
- **System Reliability:** 95% uptime per device
- **Data Accuracy:** ±2 dB accuracy in sound level measurements
- **Localization Accuracy:** 2-5 meters for TDoA, 5-15 meters for RSS triangulation
- **Data Transmission:** 99% successful data delivery to central server
- **Configuration:** All device settings configurable via admin web interface
- **Data Retention:** Configurable retention period with default of 7 days
- **User Satisfaction:** 4.0/5 average rating from end users

---

## 4. User Personas and Stakeholders

### Primary Users

#### 1. System Administrator
- **Role:** Deploys, configures, and maintains the monitoring devices
- **Needs:** Easy device registration, remote configuration, device health monitoring
- **Pain Points:** Complex setup, difficult troubleshooting, manual device management

#### 2. Environmental Officer
- **Role:** Monitors noise compliance and environmental impact
- **Needs:** Real-time alerts, historical data analysis, compliance reporting
- **Pain Points:** Delayed notifications, limited data visibility, manual report generation

#### 3. Security Operator
- **Role:** Monitors for security events and anomalies
- **Needs:** Instant alerts, event classification, location tracking
- **Pain Points:** False positives, delayed notifications, unclear event locations

#### 4. Data Analyst
- **Role:** Analyzes sound patterns and trends
- **Needs:** Data export, visualization tools, pattern recognition
- **Pain Points:** Limited analytics, difficult data access, manual analysis

### Stakeholders
- **End Users:** Operators and administrators using the system
- **Management:** Decision makers requiring compliance and ROI metrics
- **IT Department:** Infrastructure and security oversight
- **Regulatory Bodies:** Compliance and data validation requirements

---

## 5. Features and Requirements

### 5.1 Core Features

#### F1: WiFi Communication Infrastructure
**Priority:** P0 (Critical)

**Requirements:**
- ESP32 WiFi-enabled devices connect directly to central server
- Support for 10 monitoring devices
- WiFi connectivity (802.11 b/g/n)
- Communication via HTTP/WebSocket (unencrypted)
- Automatic reconnection on network failure
- Device authentication and registration

**Acceptance Criteria:**
- Devices connect to server within 30 seconds of power-on
- Data delivery success rate > 99% to central server
- Automatic reconnection within 60 seconds of WiFi disconnection
- All 10 devices can operate simultaneously

#### F2: Sound Monitoring Capabilities
**Priority:** P0 (Critical)

**Requirements:**
- Sound level measurement in dB (decibels)
- Sound level measurement per configurable frequency band
- Frequency band configuration:
  - Configurable number of frequency bands
  - Configurable start frequency for each band
  - Configurable end frequency for each band
- Real-time continuous monitoring
- Configurable measurement intervals (minimum 1 second)
- Measurement accuracy: ±2 dB (before calibration)
- **Signal Processing Requirements:**
  - **Anti-Aliasing:** Digital low-pass filter applied before FFT to prevent aliasing
    - Cutoff frequency: Nyquist frequency (sample_rate / 2)
    - Filter implementation: 4th-8th order digital filter
  - **Windowing:** Window function applied to reduce spectral leakage
    - Window type: Hamming, Hanning, or Blackman (Hamming recommended)
    - Window gain compensation in frequency calculations
    - Prevents sampling window effects and spectral leakage
  - **FFT Processing:** Fast Fourier Transform for frequency domain analysis
    - FFT size: 256-1024 points (power of 2)
    - Overlap processing: Optional 50% overlap for continuous analysis
- **Calibration Support:**
  - Calibrated measurements with dB offset application
  - Per-device calibration offsets
  - Real-time calibration application to measurements

**Acceptance Criteria:**
- Accurate dB measurements within ±2 dB of calibrated reference (after calibration)
- Frequency band measurements match configured ranges
- Anti-aliasing filter prevents aliasing artifacts in frequency domain
- Windowing function effectively reduces spectral leakage
- Continuous monitoring with < 5% data loss
- All measurement parameters configurable via admin interface
- Support for multiple frequency band configurations per device
- Calibration offsets correctly applied to all measurements

#### F3: Data Collection and Storage
**Priority:** P0 (Critical)

**Requirements:**
- Centralized data storage on web server
- Data transmission from ESP32 devices to central server
- Timestamp synchronization (NTP)
- Data retention: Configurable retention period (default: 7 days)
- Automatic data purging based on retention policy
- Data backup mechanisms

**Acceptance Criteria:**
- Data stored with < 5 second timestamp accuracy
- 99% data integrity during WiFi transmission
- Configurable retention period via admin interface
- Automatic deletion of data older than retention period
- Data export in standard formats (CSV, JSON)

#### F4: Real-Time Alerts and Notifications
**Priority:** P1 (High)

**Requirements:**
- Configurable threshold-based alerts
- Multiple alert channels (email, SMS, push, webhook)
- Alert escalation rules
- Sound pattern recognition (gunshot, breaking glass, etc.)
- Geofencing-based alerts
- Alert history and acknowledgment

**Acceptance Criteria:**
- Alert delivery within 5 seconds of threshold breach
- Support for 10+ alert rules per node
- Pattern recognition accuracy > 90%
- Alert deduplication to prevent spam

#### F5: Monitoring Dashboard
**Priority:** P0 (Critical)
**Status:** ✅ IMPLEMENTED (February 2026)

**Requirements:**
- Real-time sound level visualization (dB)
- Real-time frequency band visualization
  - Display frequency band number with frequency range (e.g., "Band 1 (20-200 Hz)")
  - Show dB level for each frequency band
  - Color-coded visualization based on levels
  - Support for variable number of frequency bands per device
- Historical data charts and graphs
  - Overall dB level timeline chart
  - Individual frequency band timeline charts
  - Comparative frequency spectrum visualization
- Device status monitoring (online/offline, last update)
- Per-device data views
- Time range selection for historical data
- Responsive web design supporting both desktop and mobile views
- Frequency band configuration interface
  - View current frequency band settings
  - Edit frequency ranges (start/end Hz)
  - Add/remove frequency bands
  - Validate no overlapping bands

**Acceptance Criteria:**
- Dashboard loads within 3 seconds
- Support for 10+ concurrent users
- Real-time updates with < 10 second latency
- Works on desktop, tablet, and mobile browsers
- Responsive layout adapts to screen size (desktop: multi-column, mobile: single column)
- Touch-friendly controls for mobile devices
- Displays data from all 10 devices
- Frequency ranges clearly visible next to each band
- Frequency band configuration saves and updates within 60 seconds

**Implementation Details (v1.2):**
- **Color-Coded Thresholds:**
  - Under 80 dB: Green (#d1fae5 background, #065f46 text)
  - 80-95 dB: Yellow (#fef3c7 background, #92400e text)
  - Over 95 dB: Red (#fecaca background, #991b1b text)
- **Multi-Line History Chart:**
  - Overall sound level plus individual frequency band levels
  - Chart.js visualization with color-coded lines
  - Automatic dataset creation based on frequency_bands array
- **Full-Width History Display:**
  - Measurement items use full screen width (flexbox layout)
  - Improved readability for detailed frequency band data
- **Active Status Indicator:**
  - Device considered active if last_seen within 60 seconds
  - Real-time status updates on dashboard
  - Color-coded status badges (green=active, gray=inactive)

#### F6: Admin Interface and Device Management
**Priority:** P0 (Critical)
**Status:** ✅ IMPLEMENTED (February 2026)

**Requirements:**
- Device registration page for new ESP32 devices
  - Device ID/name assignment
  - WiFi credentials configuration (if needed)
  - Initial device setup
- Device setup and configuration interface
- Remote device configuration:
  - **Frequency Band Configuration:**
    - Configurable number of frequency bands per device
    - For each frequency band:
      - Configurable start frequency (Hz)
      - Configurable end frequency (Hz)
    - Ability to add/remove frequency bands
    - Validation to ensure bands don't overlap (optional)
    - Different frequency band configurations per device
  - Measurement interval settings (minimum 1 second)
  - Device identification and naming
- Device status monitoring (connection status, last data received timestamp)
- Data retention period configuration:
  - Global default retention period (default: 7 days)
  - Per-device retention period override
  - Automatic data purging based on retention policy
- Device list and management
- Device deletion capability:
  - Remove device from system
  - Delete device configuration and historical data
  - Confirmation prompt before deletion
- View current device configuration

**Acceptance Criteria:**
- Device registration completes within 2 minutes
- Configuration changes apply within 60 seconds
- All device settings configurable via admin web interface
- Support for managing all 10 devices
- Frequency band configuration (number, start/end frequencies) saved and applied to devices
- Data retention period configurable and enforced automatically
- Admin can configure different frequency bands for different measurement types (if multiple types supported)
- Devices can be deleted with confirmation, removing all configuration and historical data

**Implementation Details (v1.2):**
- **Dynamic Configuration System:**
  - Per-device configuration stored in JSON files (backend/data/devices/)
  - Devices fetch configuration on startup via HTTP GET
  - Periodic refresh every 100 measurements (~5 minutes)
  - Runtime updates without firmware reflash required
- **Configuration API Endpoints:**
  - GET /api/config/devices/:deviceId/frequency-bands
  - PUT /api/config/devices/:deviceId/frequency-bands
  - Returns: device_id, measurement_interval, calibration_offset_db, frequency_bands[]
- **URL Encoding Support:**
  - Device IDs with spaces properly encoded (%20)
  - Firmware handles URL encoding automatically

#### F6A: Sensor Calibration
**Priority:** P0 (Critical)

**Requirements:**
- **Calibration Offset Configuration:**
  - Per-device dB offset calibration values
  - Overall sound level (dB) offset calibration
  - Per-frequency-band offset calibration (optional)
  - Calibration offset range: ±20 dB (typical range)
  - Calibration offset precision: 0.1 dB increments
- **Calibration Procedure:**
  - Admin interface for entering calibration values
  - Support for calibration using reference sound source
  - Calibration date and notes tracking
  - Ability to reset calibration to zero offset
- **Calibration Application:**
  - Automatic application of calibration offsets to all measurements
  - Calibrated values displayed in monitoring interface
  - Raw (uncalibrated) values optionally available for reference
  - Calibration applied in real-time to incoming measurements
- **Calibration Storage:**
  - Calibration values stored in device configuration
  - Calibration history tracking (optional)
  - Calibration values synchronized to ESP32 devices

**Acceptance Criteria:**
- Calibration offsets configurable via admin interface
- Calibration values applied to measurements within 60 seconds of configuration
- Calibrated measurements displayed correctly in monitoring dashboard
- Calibration offsets persist across device reboots
- Support for both overall dB offset and per-band offsets (if implemented)
- Calibration values stored in JSON configuration files

#### F6B: Sound Source Triangulation and Localization
**Priority:** P1 (High)
**Status:** 🚧 PLANNED (v1.3)

**Requirements:**
- **Localization Methods:**
  - **Hybrid TDoA + RSS Approach:** Combines Time Difference of Arrival with Received Signal Strength for improved accuracy
  - **TDoA (Time Difference of Arrival):** Uses precise time differences when sound reaches different sensors
    - Requires microsecond-precision time synchronization via NTP
    - Best for impulse/transient sounds (gunshots, loud impacts, sharp noises)
    - Accuracy: 2-5 meters with 4+ sensors and good time sync
  - **RSS (Received Signal Strength):** Uses inverse square law based on dB level comparisons
    - Compares sound intensity across sensors to estimate distance
    - Best for continuous sounds and approximate localization
    - Accuracy: 5-15 meters (affected by reflections and obstacles)
  - **Hybrid Mode:** Automatically selects or combines both methods based on sound characteristics
- **Sensor Position Configuration:**
  - Interactive map interface for sensor placement
  - Support for both Cartesian (X, Y, Z in meters) and Geographic (latitude, longitude, elevation) coordinate systems
  - Drag-and-drop sensor positioning on visual map
  - Manual coordinate entry with validation
  - Installation height configuration (meters above ground/floor)
  - Position accuracy metadata (±meters)
  - Sensor coverage area visualization
  - Import/export sensor positions (JSON format)
- **Acoustic Environment Mapping:**
  - **Barrier Definition Interface:**
    - Define solid walls with position, dimensions, and material properties
    - Define floor-to-ceiling curtains (vinyl or fabric) with acoustic properties
    - Support for barrier types: concrete wall, drywall, metal panel, vinyl curtain, fabric curtain, glass, custom
    - Material properties: transmission loss (dB), reflection coefficient
    - Barrier visualization on map with transparency/opacity based on acoustic properties
  - **Environment Characteristics:**
    - Room/space definition with boundaries
    - Floor type and ceiling height
    - Acoustic treatment areas (absorptive vs reflective surfaces)
    - Temperature and humidity (affects sound speed)
  - **Path Loss Modeling:**
    - Calculate acoustic path between source and sensors
    - Account for barriers in signal path
    - Apply attenuation based on barrier material properties
    - Multi-path detection and filtering
- **Event Detection and Correlation:**
  - Sound onset detection with configurable threshold (e.g., 10 dB above ambient)
  - Microsecond-precision timestamp capture for TDoA
  - Event correlation across multiple sensors (same event detected by 3+ sensors)
  - Event buffering (100-500ms audio before and after onset)
  - False positive filtering
- **Triangulation Processing:**
  - Real-time position calculation using multilateration algorithms
  - Confidence score calculation (0-100%)
  - Position refinement using least-squares or Kalman filtering
  - Historical position tracking for moving sources
  - Minimum sensor requirement: 3 sensors for 2D, 4 sensors for 3D localization
- **Result Storage and History:**
  - Store detected event: timestamp, position (X, Y, Z), confidence, method used
  - Link contributing sensor measurements to event
  - Sound characteristics: peak dB, duration, dominant frequency
  - Event classification (optional): impulse, continuous, periodic
  - Retention policy for source location data

**Acceptance Criteria:**
- Sensor positions configurable via interactive map interface
- Support for minimum 3 sensors for 2D localization, 4+ for 3D
- TDoA localization accuracy: 2-5 meters for impulse sounds with 4+ sensors
- RSS localization accuracy: 5-15 meters for continuous sounds
- Event detection and correlation within 2 seconds of sound onset
- Acoustic barriers definable with material properties and visualization
- Position results include confidence scores (0-100%)
- Barrier effects incorporated into localization calculations
- Results stored with full event metadata and contributing sensor data
- Web interface displays sensor positions, barriers, and detected source locations
- System automatically selects optimal localization method based on sound type
- Export capabilities for position data and event history

#### F6C: Sound Source Visualization
**Priority:** P1 (High)
**Status:** 🚧 PLANNED (v1.3)

**Requirements:**
- **Interactive Map Display:**
  - 2D top-down map view of monitored environment
  - Optional 3D perspective view for multi-level installations
  - Sensor markers with status indicators (active/inactive)
  - Sensor labels with device names
  - Zoom and pan controls
  - Grid overlay with scale indicators (meters/feet)
  - Coordinate system display (origin point)
- **Barrier Visualization:**
  - Solid walls displayed as thick lines with material indication
  - Curtains displayed as dashed/semi-transparent lines
  - Color-coding by material type and acoustic properties
  - Barrier labels with material and transmission loss values
  - Toggle visibility of different barrier types
  - Opacity adjustment based on acoustic transparency
- **Real-Time Source Markers:**
  - Animated markers for currently detected sound sources
  - Color-coded by sound intensity (green < 80 dB, yellow 80-95 dB, red > 95 dB)
  - Confidence circles/ellipses around estimated positions
  - Source markers with timestamp and dB level
  - Fade-out animation for past events
- **Historical Event Display:**
  - Timeline slider for event playback
  - Heatmap overlay showing sound source density over time
  - Path traces for moving sound sources
  - Event filtering by time range, intensity, confidence level
  - Event details panel with full metadata
- **Acoustic Coverage Visualization:**
  - Coverage circles for each sensor (estimated detection range)
  - Overlap areas showing optimal triangulation zones
  - Dead zones with poor coverage indication
  - Signal strength gradient display

**Acceptance Criteria:**
- Interactive map loads within 3 seconds
- Real-time source markers update within 5 seconds of detection
- Support for 10 sensors and 50+ barriers on single map
- Smooth pan and zoom operations (60 fps)
- Historical events playable with timeline control
- Heatmap generation for 24-hour periods in < 10 seconds
- Mobile-responsive map interface
- Export map view as PNG/PDF
- Tooltips display full sensor and event information on hover
- Barrier visualization clearly distinguishes wall types and materials

#### F6D: Public Kiosk Display
**Priority:** P1 (High)
**Status:** 🚧 PLANNED (v1.4)

**Requirements:**
- **Display Configuration:**
  - Optimized for 1080p monitors (1920x1080 pixels)
  - Full-screen layout without browser chrome
  - No keyboard or mouse interaction required
  - Designed for display systems like Xibo, BrightSign, or similar
  - Auto-start capability in kiosk mode browsers
- **Workshop Map Display:**
  - Large, high-contrast map of the workshop/monitored environment
  - Occupies majority of screen real estate (70-80% of display)
  - Clear visual hierarchy with easy-to-read labels at distance
  - Optimized for viewing from 3-5 meters away
- **Sensor Information Display:**
  - Real-time sensor locations marked on map
  - Current status indicator for each sensor (online/offline, active/inactive)
  - Live sound level readings (dB) per sensor
  - Color-coded status based on thresholds:
    - Green: < 80 dB (normal)
    - Yellow: 80-95 dB (elevated)
    - Red: > 95 dB (critical)
  - Sensor labels with device names
  - Last update timestamp per sensor
- **Sound Source Visualization:**
  - Triangulated sound source positions displayed as pins/markers on map
  - Animated appearance for new sound sources
  - Color-coded by intensity (green/yellow/red)
  - Confidence indicators (circle radius or opacity)
  - Recent event history (last 10-20 events with fade-out)
  - Timestamp and dB level for each source
- **Auto-Refresh and Updates:**
  - Automatic polling for new data every 5-10 seconds
  - Smooth transitions for data updates (no jarring refreshes)
  - Real-time sensor status updates
  - Live sound source position updates
  - Connection status indicator (connected/disconnected)
  - Last successful update timestamp displayed
- **Layout and Design:**
  - High-contrast color scheme suitable for various lighting conditions
  - Large, legible fonts (minimum 18px for body text, 24px+ for headings)
  - Minimal UI chrome (no unnecessary navigation elements)
  - Information panels/sidebars with summary statistics
  - Overall system status indicator (all sensors green, warnings present, etc.)
  - Optional: Rotating views (map, statistics, event history)
- **Access and Navigation:**
  - Separate URL endpoint from main dashboard (e.g., /kiosk or /display)
  - Direct link available from main dashboard for administrators
  - No authentication required for view-only access (configurable)
  - Screen saver mode after inactivity (configurable timeout)
  - Automatic recovery from network disconnections

**Acceptance Criteria:**
- Display renders correctly at 1920x1080 resolution
- No scroll bars visible in full-screen mode
- Map and text clearly readable from 3-5 meters away
- Data updates every 5-10 seconds without user intervention
- Page functions without keyboard or mouse input
- All sensors visible on map with current status and readings
- Sound sources appear within 5 seconds of triangulation
- Browser auto-refresh prevented (uses AJAX/fetch for updates)
- Page remains stable for 24+ hours continuous operation
- Graceful handling of network disconnections with reconnection
- Separate URL accessible via direct link or bookmark
- Compatible with major kiosk software systems (Xibo, Chrome Kiosk mode, etc.)

### 5.2 Advanced Features

#### F7: Analytics and Reporting
**Priority:** P2 (Medium)
**Status:** ✅ IMPLEMENTED (Basic analytics - February 2026)

**Requirements:**
- Statistical analysis (mean, median, percentiles)
- Trend analysis and forecasting
- Compliance reporting (automated)
- Custom report generation
- Data export and API access
- Machine learning-based anomaly detection

**Acceptance Criteria:**
- Generate compliance reports in < 30 seconds
- Support for custom date ranges and filters
- Export data in multiple formats
- API response time < 500ms

**Implementation Details (v1.2):**
- Analytics dashboard with date range selection
- Statistical calculations: min, max, average, median sound levels
- Per-frequency band statistics
- Historical trend visualization
- API endpoint: GET /api/analytics/stats?deviceId={id}&startDate={date}&endDate={date}
- Response time: < 200ms for 24-hour queries

#### F8: Integration Capabilities
**Priority:** P2 (Medium)

**Requirements:**
- RESTful API for third-party integration
- Webhook support for event notifications
- Integration with common platforms (Slack, PagerDuty, etc.)
- MQTT/CoAP protocol support
- File system operations (JSON/CSV file reading and writing)

**Acceptance Criteria:**
- API documentation with examples
- 99.9% API uptime
- Support for OAuth 2.0 authentication
- Rate limiting and throttling


### 5.3 Hardware Requirements

#### H1: ESP32-C3 Sensor Device Specifications
**Priority:** P0 (Critical)

**Requirements:**
- **Processing:** ESP32-C3 microcontroller (single-core RISC-V, 160 MHz)
  - **Status:** ✅ 10 units purchased (ESP32-C3 Super Mini, 4MB flash)
- **Memory:** 4 MB flash (as purchased), 400 KB SRAM
- **Connectivity:** 
  - WiFi: 802.11 b/g/n (2.4 GHz)
  - Bluetooth: 5.0 LE
  - Support for WPA2/WPA3 security
- **Power:**
  - USB-C power via wall charger adapter
  - **Status:** ✅ 10 USB wall chargers and 12 USB-C cables purchased
  - Power consumption: < 500 mW average
- **Sensors:**
  - Microphone: MH-ET LIVE INMP441 I2S Digital Microphone Module
    - **Status:** ✅ 10 units purchased
    - Omnidirectional MEMS microphone
    - Low noise, high precision
    - I2S digital interface (no ADC required)
    - PDM (Pulse Density Modulation) output converted to I2S
- **Audio Processing:**
  - FFT capability for frequency band analysis
  - Real-time audio sampling via I2S interface (to be verified on ESP32-C3)
  - Sampling rate: 16 kHz (INMP441 supports up to 48 kHz)
  - 24-bit audio data processing
  - **Anti-Aliasing:** Digital low-pass filter to prevent aliasing artifacts
  - **Windowing:** Window function (Hamming/Hanning) to reduce spectral leakage and sampling window effects
- **Enclosure:** Weather-resistant (IP54 minimum recommended)
  - **Status:** ⏳ To be determined/purchased
- **Size:** ESP32-C3 Super Mini form factor

**Acceptance Criteria:**
- Meets all specified technical requirements
- Reliable WiFi connectivity within 50m of access point
- Stable audio sampling and processing (I2S to be verified on ESP32-C3)
- Operating temperature: 0°C to +50°C (typical)
- **Hardware Verification Required:** I2S peripheral and GPIO pin assignments must be verified once ESP32-C3 boards are received

#### H2: Central Web Server
**Priority:** P0 (Critical)

**Requirements:**
- **Platform:** Ubuntu 20.04 LTS server
- **Web Server:** Nginx (reverse proxy and static file serving)
- Web server hosting monitoring and admin pages
- File-based storage for sensor data and device configurations (JSON files for config, CSV/JSON files for measurements)
- API endpoints for ESP32 device communication
- HTTP support for communication (unencrypted, port 80)
- Support for 10 concurrent device connections
- Data storage capacity for 7+ days of data from 10 devices
- Application directory: `/var/www/sound-monitoring/`
- Data directory: `/var/www/sound-monitoring/data/`

**Acceptance Criteria:**
- Handles 10 connected ESP32 devices simultaneously
- 95% uptime
- Processes and stores data within 1 second of receipt
- Web pages load within 3 seconds
- Nginx configured and running
- Backend API accessible via Nginx proxy

---

## 6. Technical Requirements

### 6.1 System Architecture

#### Architecture Overview
- **ESP32 Devices:** 10 WiFi-enabled sensor devices with custom firmware
- **Central Web Server:** Single server hosting web application and API
- **Star Topology:** All devices connect directly to central server via WiFi
- **Web Application:** Monitoring dashboard and admin interface

#### Technology Stack Recommendations
- **Device Firmware:** ESP-IDF framework for ESP32
- **Backend:** Node.js, Python (Flask/Django), or Go
- **Data Storage:** File-based storage (JSON files for device/config, CSV or JSON files for sensor measurements)
- **Frontend:** React, Vue.js, or vanilla JavaScript
- **Communication Protocol:** HTTP REST API or WebSocket for real-time updates (unencrypted)
- **Deployment:** Ubuntu 20.04 server with Nginx web server

### 6.2 Performance Requirements

- **Latency:** < 10 seconds from measurement to dashboard display
- **Throughput:** Support 10 devices transmitting data simultaneously
- **Data Rate:** Each device can transmit measurements every 1+ seconds
- **Availability:** 95% uptime for web server
- **Data Processing:** Real-time processing of incoming data from 10 devices
- **File Storage:** Efficient storage and retrieval of time-series data using CSV or JSON files

### 6.3 Security Requirements

- **Communication:** HTTP for all web and API communication (unencrypted, no certificates)
- **Authentication:** User authentication for admin interface
- **Device Authentication:** Secure device registration and authentication
- **Authorization:** Admin and viewer role separation
- **Network Security:** Firewall rules, WiFi network (WPA2/WPA3 for WiFi, but HTTP traffic unencrypted)
- **Data Privacy:** Secure storage of sensor data
- **API Security:** API key or token-based authentication for devices

### 6.4 Compliance and Standards

- **Audio Standards:** IEC 61672 (sound level meters), ANSI S1.4
- **Environmental:** IP65/IP67 rating, operating temperature range
- **Regulatory:** FCC, CE, IC compliance for radio equipment
- **Data Privacy:** GDPR, CCPA compliance
- **Industry Standards:** ISO 14001 (environmental management)

---

## 7. Non-Functional Requirements

### 7.1 Usability
- Intuitive user interface requiring minimal training
- Responsive web design supporting both desktop and mobile views
- Adaptive layouts optimized for different screen sizes
- Touch-friendly interface for mobile devices
- Multi-language support (English, Spanish, French, German)
- Accessibility: WCAG 2.1 AA compliance

### 7.2 Reliability
- 99.9% system uptime
- Automatic failover and recovery
- Data redundancy and backup
- Graceful degradation when nodes fail

### 7.3 Maintainability
- Comprehensive logging and monitoring
- Remote diagnostics and troubleshooting
- Modular architecture for easy updates
- Detailed documentation

### 7.4 Scalability
- Horizontal scaling for cloud services
- Support for multiple mesh networks
- Efficient resource utilization
- Load balancing capabilities

### 7.5 Portability
- Cloud-agnostic architecture
- Standard protocols and APIs
- Containerized deployment
- Multi-platform support

---

## 8. User Stories

### Epic 1: Device Deployment and Registration
- **US1:** As a system administrator, I want to register a new ESP32 device through the admin interface, so that I can add it to the monitoring system.
- **US2:** As a system administrator, I want to see a list of all registered devices with their status, so that I can monitor device connectivity.
- **US2A:** As a system administrator, I want to delete devices from the system when they are decommissioned, so that I can keep the device list current and remove unused devices.

### Epic 2: Monitoring and Alerts
- **US3:** As an environmental officer, I want to receive real-time alerts when sound levels exceed thresholds, so that I can respond to noise violations immediately.
- **US4:** As a security operator, I want to receive alerts for specific sound patterns (e.g., gunshots), so that I can respond to security incidents quickly.

### Epic 3: Data Analysis
- **US5:** As a data analyst, I want to export historical sound data, so that I can perform custom analysis and create reports.
- **US6:** As an environmental officer, I want to generate compliance reports automatically, so that I can meet regulatory requirements efficiently.

### Epic 4: System Management
- **US7:** As a system administrator, I want to configure frequency bands for each device through the admin interface, so that I can customize measurements for different monitoring needs.
- **US8:** As a system administrator, I want to configure the data retention period, so that I can manage storage requirements based on my needs.
- **US9:** As a system administrator, I want to see device connection status and last data received timestamp, so that I can identify devices that need attention.
- **US10:** As a system administrator, I want to calibrate each sensor device by setting dB offset values, so that measurements are accurate compared to a reference standard.
- **US11:** As a system administrator, I want to view both calibrated and raw (uncalibrated) measurements, so that I can verify calibration accuracy.
- **US12:** As a system administrator, I want to configure sensor positions on an interactive map, so that the system can triangulate sound source locations.
- **US13:** As a system administrator, I want to define acoustic barriers (walls and curtains) in my environment, so that triangulation accounts for sound attenuation and reflections.

### Epic 5: Sound Source Localization
- **US14:** As a security operator, I want to see the location of detected sounds on a map in real-time, so that I can quickly respond to events at specific locations.
- **US15:** As a facility manager, I want to identify where loud noises originated from, so that I can address the source of the disturbance.
- **US16:** As an environmental officer, I want to generate heatmaps showing where sounds occur most frequently, so that I can identify problem areas.
- **US17:** As a data analyst, I want to export sound source location data with timestamps and coordinates, so that I can perform spatial analysis.

### Epic 6: Public Kiosk Display
- **US18:** As a facility manager, I want to display real-time sound monitoring data on a kiosk monitor in the workshop, so that workers can see current noise levels at a glance.
- **US19:** As a safety officer, I want the kiosk display to show sensor status and triangulated sound sources on a large map, so that personnel can identify noisy areas visually.
- **US20:** As a system administrator, I want the kiosk display to update automatically without user interaction, so that it can run unattended for extended periods.
- **US21:** As a facility manager, I want a separate link to access the kiosk display, so that I can configure it on dedicated display hardware independent of the main dashboard.

---

## 9. Out of Scope (Future Versions)

The following features are explicitly out of scope for current releases:

- Mesh networking (system uses WiFi star topology)
- More than 10 monitoring devices
- Video monitoring integration
- Two-way audio communication
- Voice recognition and transcription
- Battery-powered operation (devices require power supply)
- Native mobile applications (responsive web application only)
- Advanced AI/ML pattern recognition beyond threshold-based detection
- Multi-tenant architecture (system will be single-tenant)
- Cloud deployment (system supports on-premise or single cloud instance)
- Automatic barrier detection via acoustic measurement
- Real-time audio streaming from sensors
- GPS modules for absolute positioning (using manual coordinate entry instead)

---

## 10. Dependencies and Assumptions

### Dependencies
- WiFi network infrastructure (access point/router)
- Web server hosting (cloud or on-premise)
- ESP32 development boards and components
- MH-ET LIVE INMP441 I2S Digital Microphone Module (one per ESP32 device)
- Power supply for each ESP32 device (USB or external)
- I2S wiring: GPIO 4 (SD), GPIO 5 (SCK), GPIO 6 (WS), 3.3V, GND
- NTP server access for time synchronization (for TDoA triangulation)
- Measurement of sensor positions (tape measure, laser distance meter, or floor plan)
- Knowledge of acoustic barriers in environment (wall locations, curtain positions)

### Assumptions
- Users have basic technical knowledge for ESP32 programming and deployment
- WiFi network available with adequate coverage for all 10 devices
- Adequate power sources available for all devices (USB or external power)
- Web server has sufficient storage for 7+ days of data from 10 devices
- Users have web browser access for monitoring and admin interfaces
- Users can measure and input accurate sensor positions (±1 meter accuracy)
- Minimum 3 sensors deployed for 2D triangulation, 4+ for 3D triangulation
- Acoustic environment is relatively stable (walls and barriers don't move frequently)
- NTP time synchronization available for TDoA with ±10ms accuracy

---

## 11. Risks and Mitigation

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| WiFi connectivity issues | High | Medium | Robust reconnection logic, signal strength monitoring, WiFi range testing |
| ESP32 audio processing limitations | Medium | Medium | Optimize FFT algorithms, test with various sampling rates, consider external audio processing |
| Web server overload | Medium | Low | Efficient file I/O operations, data aggregation, file caching |
| Data loss during WiFi transmission | Medium | Medium | Retry mechanisms, data validation, connection status monitoring |
| Frequency band configuration errors | Low | Medium | Input validation, configuration preview, test mode |
| Time synchronization drift affecting TDoA accuracy | High | Medium | Regular NTP sync (hourly), clock drift monitoring, fall back to RSS method if sync poor |
| Inaccurate sensor position configuration | Medium | High | Position validation, visual confirmation on map, test with known sound sources |
| Acoustic reflections causing false positions | Medium | High | Multi-path filtering, first-arrival detection, barrier modeling, confidence scoring |
| Insufficient sensor coverage for triangulation | High | Medium | Coverage visualization, minimum 3-4 sensor requirement, dead zone warnings |
| Complex barrier geometry reducing accuracy | Medium | Medium | Simplified barrier models, empirical testing, user documentation on limitations |

### Business Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Regulatory compliance issues | High | Medium | Early engagement with regulatory bodies, compliance testing |
| High deployment costs | Medium | Medium | Modular pricing, phased rollout, cost optimization |
| User adoption challenges | Medium | Medium | User training, intuitive UI, comprehensive documentation |
| Competition from established players | Medium | High | Focus on unique mesh capabilities, competitive pricing, rapid innovation |

---

## 12. Success Criteria

### Phase 1: MVP (Minimum Viable Product)
- Deploy 3-5 ESP32 devices successfully
- Basic sound level (dB) monitoring
- Simple web monitoring page
- Basic admin interface for device registration
- Data storage with 7-day retention
- 90% device uptime

### Phase 2: Production Ready
- Deploy all 10 ESP32 devices
- Frequency band measurement and configuration
- Complete admin interface with all configuration options
- Enhanced monitoring dashboard with responsive design (desktop and mobile views)
- Configurable data retention period
- 95% device uptime
- Real-time data updates
- Responsive web application supporting desktop and mobile browsers

### Phase 3: Enhancements (Future)
- Advanced analytics and reporting
- Data export capabilities
- Alert/notification system
- Enhanced visualization (heat maps, frequency spectrograms)
- API for third-party integration

---

## 13. Timeline and Milestones

### Phase 1: MVP Development (Months 1-3)
- **Month 1:** Requirements finalization, architecture design, ESP32 hardware setup
- **Month 2:** ESP32 firmware development using ESP-IDF on MacBook (WiFi, audio sampling, basic dB measurement), backend API development
- **Month 3:** Basic web monitoring page, device registration, data storage, MVP testing

### Phase 2: Production Features (Months 4-6)
- **Month 4:** Frequency band measurement implementation, frequency band configuration in admin interface
- **Month 5:** Enhanced monitoring dashboard with responsive design, historical data visualization, configurable retention
- **Month 6:** Complete admin interface with mobile-responsive views, testing, performance optimization, production deployment

### Phase 3: Sound Source Triangulation (Months 7-9)
- **Month 7:** Sensor position configuration interface, coordinate system implementation, map visualization framework
- **Month 8:** Acoustic barrier definition interface, TDoA time synchronization enhancement, event detection and correlation
- **Month 9:** Triangulation algorithms (TDoA, RSS, Hybrid), real-time source visualization, testing and calibration

### Phase 4: Advanced Features (Months 10+)
- **Month 10+:** Alert system enhancements, advanced analytics, data export improvements, responsive design refinements, user feedback integration, bug fixes

---

## 14. Open Questions

~~1. **Sampling Rate:** What audio sampling rate provides optimal balance between frequency resolution and processing requirements? (INMP441 supports up to 48 kHz)~~
   - **✅ RESOLVED (February 2026):** 16 kHz sampling rate implemented and verified. Provides adequate frequency resolution up to 8 kHz (Nyquist frequency), sufficient for most environmental sound monitoring applications while minimizing processing load.

~~2. **I2S Configuration:** Optimal I2S bus configuration (sample rate, bit depth, channel configuration) for INMP441 module~~
   - **✅ RESOLVED (February 2026):** I2S configuration verified and operational:
     - Sample rate: 16 kHz
     - Bit depth: 32-bit containers (24-bit data from INMP441)
     - Channel: Mono (left channel)
     - Pin assignments: GPIO 4 (data), GPIO 5 (BCLK), GPIO 6 (WS)

~~3. **Frequency Band Defaults:** What are the default frequency bands to configure initially (e.g., octave bands, third-octave bands)?~~
   - **✅ RESOLVED (February 2026):** Default 3 frequency bands implemented:
     - Band 1: 20-200 Hz (low frequency, rumble/machinery)
     - Band 2: 200-2000 Hz (mid frequency, speech/general noise)
     - Band 3: 2000-8000 Hz (high frequency, alarms/high-pitched sounds)
   - Configurable per device via admin interface and dynamic configuration system

~~4. **Anti-Aliasing Filter:** Optimal filter order and type (Butterworth vs Chebyshev) for anti-aliasing~~
   - **⏳ PARTIAL:** Digital filtering implemented in firmware. Further optimization of filter parameters may be beneficial but not critical for current accuracy requirements.

~~5. **Windowing Function:** Which window function provides best balance (Hamming, Hanning, or Blackman) for this application?~~
   - **⏳ PARTIAL:** Windowing function implemented in FFT processing. Performance adequate for current requirements.

~~4. **File Format Selection:** CSV files vs JSON files for sensor measurement data storage?~~
   - **✅ RESOLVED (February 2026):** JSON format implemented for measurement storage:
     - Filename format: {device_id}_{YYYY-MM-DD}.json
     - Supports complex data structures (frequency_bands arrays)
     - Better integration with JavaScript frontend
     - Device configuration also stored in JSON format

~~5. **Web Framework:** Which backend framework (Node.js, Python Flask/Django, Go) best suits the requirements?~~
   - **✅ RESOLVED (February 2026):** Node.js with Express framework implemented:
     - File-based storage (no database required)
     - RESTful API on port 3000
     - Good ecosystem for real-time features
     - Compatible with JavaScript frontend

~~6. **Deployment Model:** Cloud-hosted (AWS, Azure, GCP) or on-premise server deployment?~~
   - **✅ RESOLVED (February 2026):** Local development server deployment:
     - Backend: localhost:3000 (Node.js Express)
     - Frontend: localhost:8080 (Python http.server)
     - Production deployment would use Ubuntu server with Nginx reverse proxy

~~7. **Authentication:** What level of user authentication is required (simple login vs multi-factor)?~~
   - **⏳ DEFERRED:** Basic system implemented without authentication. Authentication to be added in future production deployment as needed.

---

## 15. Appendix

### A. Glossary
- **ESP32:** Low-cost, low-power system on a chip microcontroller with integrated WiFi
- **Frequency Band:** A range of frequencies (start frequency to end frequency) for sound level measurement
- **dB (Decibel):** Logarithmic unit for sound level measurement
- **FFT (Fast Fourier Transform):** Algorithm for frequency domain analysis of audio signals
- **Anti-Aliasing Filter:** Digital low-pass filter applied before FFT to prevent frequency aliasing artifacts
- **Windowing Function:** Mathematical function (Hamming, Hanning, Blackman) applied to time-domain samples to reduce spectral leakage and sampling window effects
- **Spectral Leakage:** Unwanted frequency spreading in FFT output caused by finite sampling window
- **Nyquist Frequency:** Maximum frequency that can be accurately represented, equal to half the sampling rate
- **I2S:** Inter-IC Sound, a serial bus interface standard for connecting digital audio devices
- **INMP441:** I2S digital MEMS microphone module with omnidirectional pickup pattern
- **PDM (Pulse Density Modulation):** Modulation format used by INMP441, converted to I2S format
- **MEMS (Micro-Electro-Mechanical Systems):** Miniature mechanical and electromechanical elements used in the microphone
- **NTP (Network Time Protocol):** Protocol for synchronizing device clocks over a network
- **TDoA (Time Difference of Arrival):** Localization technique using time differences when sound reaches different sensors
- **RSS (Received Signal Strength):** Localization technique using sound intensity (dB level) comparisons across sensors
- **Triangulation:** Process of determining position by measuring angles or distances from known points
- **Multilateration:** Mathematical technique for position determination using distance measurements from multiple points
- **Acoustic Barrier:** Physical obstruction (wall, curtain, partition) that affects sound propagation
- **Transmission Loss:** Reduction in sound intensity (dB) when passing through a barrier material
- **Path Loss:** Attenuation of sound intensity over distance and through materials
- **Sound Onset:** Beginning moment of a sound event, used as reference point for TDoA calculations
- **Confidence Score:** Numerical indicator (0-100%) of localization result reliability
- **Cartesian Coordinates:** Position system using X, Y, Z distances from origin point (meters)
- **Geographic Coordinates:** Position system using latitude, longitude, and elevation
- **Heatmap:** Visual representation showing spatial density or intensity of events over time

### B. References
- IEC 61672: Electroacoustics - Sound level meters
- ANSI S1.4: American National Standard for Sound Level Meters
- ESP32 Technical Reference Manual: Espressif Systems
- ESP-IDF Programming Guide: Espressif Systems
- WiFi 802.11 Standards: IEEE

### C. Related Documents
- System Architecture Document (to be created)
- API Specification (to be created)
- Hardware Design Document (to be created)
- Security Assessment (to be created)

---

## Document Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Product Manager | | | |
| Engineering Lead | | | |
| Design Lead | | | |
| Business Stakeholder | | | |

---

**Document Status:** Draft - Pending Review and Approval

