# Developer Reference

Complete reference for system architecture, APIs, development guidelines, and security for the Sound Level Mesh System.

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Frontend Features](#frontend-features)
3. [Backend API Reference](#backend-api-reference)
4. [Security & Configuration](#security--configuration)
5. [Development Workflow](#development-workflow)

---

## System Architecture

### High-Level Overview

The Sound Level Mesh System uses a **star topology** with ESP32 sensor devices connecting directly to a central server via WiFi.

```
┌────────────────────────────────────────┐
│         WiFi Network (802.11)          │
└────────────────────────────────────────┘
            │
    ┌───────┼───────┐
    │       │       │
┌───▼──┐ ┌──▼──┐ ┌──▼──┐
│ESP32 │ │ESP32│ │ESP32│  (9 devices operational)
│+MIC  │ │+MIC │ │+MIC │
└───┬──┘ └──┬──┘ └──┬──┘
    │       │       │
    └───────┼───────┘
            │
    ┌───────▼────────┐
    │  Web Server    │
    │  ┌──────────┐  │
    │  │ Frontend │  │  Browser UI
    │  └──────────┘  │
    │  ┌──────────┐  │
    │  │ Backend  │  │  Node.js/Express
    │  └──────────┘  │
    │  ┌──────────┐  │
    │  │   Data   │  │  JSON storage
    │  └──────────┘  │
    └────────────────┘
```

### Component Responsibilities

**ESP32 Devices:**
- I2S audio sampling (16kHz, 32-bit)
- FFT analysis (1024 points, Hamming window)
- Frequency band measurement (3 configurable bands)
- dB level calculation with calibration
- WiFi connectivity and HTTP client
- NTP time synchronization
- Unique MAC address identification

**Backend Server:**
- RESTful API (Express.js)
- Device registration and management
- Measurement data storage (JSON files)
- Configuration management
- Alert system
- Data aggregation and analytics

**Frontend:** with auto-refresh
- Device management interface
- Historical data visualization with Chart.js
- Configuration panels with inline editing
- Alert management and history viewer
- Sound source triangulation with interactive 2D map
- Statistical analytics with customizable date ranges
- Public kiosk display mode
- Responsive web design for desktop and tablets

---

## Frontend Features

### Architecture
- **Technology:** Vanilla JavaScript (ES6+), HTML5, CSS3
- **Charts:** Chart.js 4.4.0 for data visualization
- **Design:** Single-page application with tab-based navigation
- **API Communication:** Fetch API with centralized API service module

### Tab Overview

#### 1. Dashboard Tab
**Purpose:** Real-time monitoring of all devices

**Features:**
- Live statistics (Total Devices, Active Devices, Average Level)
- Auto-refresh every 5 seconds
- Device cards showing:
  - Current dB level with color coding (green < 80, yellow 80-95, red > 95)
  - Frequency band measurements (3 configurable bands)
  - Last update timestamp
  - Device nickname and location
- Quick access to frequency band configuration

**Key Functions:**
- `updateDashboard()` - Refreshes all device data
- `createDeviceCard()` - Renders individual device cards
- Auto-refresh via `setInterval()`

#### 2. Devices Tab
**Purpose:** Device management and registration

**Features:**
- Device registration form (MAC address, name, location)
- List of all registered devices with details:
  - Device ID, MAC address, nickname
  - Location, last seen, calibration offset
- Device actions:
  - Edit device information
  - Calibrate (set dB offset)
  - Delete device
- Export all device data to JSON

**Key Functions:**
- `registerDevice()` - Register new device
- `editDevice()` - Update device information
- `calibrateDevice()` - Set calibration offset
- `deleteDevice()` - Remove device from system

#### 3. Triangulation Tab
**Purpose:** Sound source localization using multiple sensors

**Features:**
- Interactive 2D map visualization (HTML5 Canvas)
- Sensor position configuration (X, Y, Z coordinates)
- Acoustic barrier modeling
- **Map label management** (NEW - February 2026)
- Real-time triangulation calculation
- Visual display of:
  - Sensor positions with coverage circles
  - Sound sources with confidence indicators
  - Acoustic barriers (walls, curtains, partitions)
  - Custom map labels for zones/equipment
  - Probability heatmap overlay
- Controls for sensor/barrier/label/source visibility
- Time window selection for continuous measurements

**Map Label System:**
- Add custom text annotations to map locations
- Full styling control:
  - Font size (8-24px) and weight (normal/bold)
  - Text and background colors
  - Padding and border radius
  - Opacity control
- Interactive management via "Configure Labels" modal:
  - Add new labels with position (x, y in meters)
  - Edit existing labels (click to select)
  - Delete labels with confirmation
  - Toggle visibility per label
- Real-time preview on canvas map
- Labels persist in `backend/data/map_labels.json`
- Use cases: Mark equipment ("Welding Station"), define zones ("Assembly Area"), label areas ("Storage")

**Key Functions:**
- `initTriangulation()` - Initialize map canvas
- `triangulateNow()` - Calculate source positions
- `drawMap()` - Render map with all elements
- `drawLabel()` - Render individual label on canvas
- `openSensorPositionModal()` - Configure sensor positions
- `openBarrierModal()` - Configure acoustic obstacles
- `openLabelModal()` - Manage map labels (NEW)
- `loadLabels()` - Fetch labels from API (NEW)
- `populateLabelList()` - Display label list in modal (NEW)
- `editLabel()` - Edit existing label (NEW)

**Multi-Source Detection Algorithms:**

The system uses a blend of approaches to detect multiple simultaneous sound sources:

1. **Frequency-Band Separation**
   - Analyzes 3 frequency bands independently:
     - Low (20-200 Hz): Heavy machinery, HVAC systems
     - Mid (200-2000 Hz): Power tools, voices
     - High (2000-8000 Hz): Metal work, compressed air
   - Each band runs RSS localization separately
   - Sources with distinct spectral signatures are identified
   - Minimum 50 dB energy required per band

2. **Temporal Clustering**
   - Groups measurements into 5-second windows
   - Analyzes spatial variance across devices over time
   - Detects persistent vs. transient sources
   - High coefficient of variation (>0.3) indicates multiple sources
   - Clusters measurements using spatial pattern similarity

3. **Spatial Merging**
   - Combines sources within 3 meters (configurable)
   - Weighted average by confidence scores
   - Boosts confidence when multiple methods agree
   - Prevents duplicate detections

4. **Source Classification**
   - Classifies sources by frequency profile and intensity:
     - Low band: heavy_machinery, hvac_system, ambient
     - Mid band: power_tool, machinery, voices_conversation
     - High band: metal_work_cutting, compressed_air, electronic_equipment
   - Helps distinguish between different workshop activities

**Confidence Scoring:**
- Sensor count: 40% (more sensors = higher confidence)
- Signal strength: 30% (60-100 dB range)
- Position validity: 30% (within reasonable bounds)
- Multi-method agreement: +20% bonus when frequency and temporal methods agree

#### 4. History Tab
**Purpose:** View historical measurement data

**Features:**
- Device selector dropdown
- **Second-precision datetime controls:**
  - Start date/time (YYYY-MM-DD HH:MM:SS)
  - End date/time (YYYY-MM-DD HH:MM:SS)
  - Default: Last 24 hours
- Chart.js time-series visualization
- Measurement list (newest first, limited to 100)
- Each entry shows:
  - Timestamp
  - Overall dB level
  - Frequency band measurements
- Export to CSV functionality

**Key Functions:**
- `loadHistory()` - Fetch measurements for date range
- `displayHistory()` - Render measurement list
- `updateHistoryChart()` - Create/update Chart.js line chart
- `formatDateTimeLocal()` - Format dates for datetime-local inputs

#### 5. Alerts Tab
**Purpose:** Configure and monitor alert rules

**Features:**
- Alert rule creation:
  - Device selection (or all devices)
  - Threshold value (dB)
  - Alert type (above/below threshold)
  - Email notification (optional)
- Alert rule management:
  - View all active rules
  - Edit existing rules
  - Delete rules
- Alert history viewer:
  - Recent triggered alerts
  - Timestamp, device, value, threshold
  - Sortable and filterable

**Key Functions:**
- `createAlert()` - Create new alert rule
- `loadAlerts()` - Fetch all alert rules
- `loadAlertHistory()` - Fetch triggered alerts
- `deleteAlert()` - Remove alert rule

#### 6. Analytics Tab
**Purpose:** Statistical analysis and trends

**Features:**
- Device selector (all devices or specific device)
- **Second-precision datetime controls** (same as History tab)
- Statistical metrics:
  - Total measurements
  - Mean, median, min, max
  - Standard deviation
  - 95th percentile
- Chart.js visualization:
  - Trend line
  - Distribution histogram
  - Band-specific analysis
- Custom date range analysis

**Key Functions:**
- `loadAnalytics()` - Fetch analytics data
- `displayAnalyticsStats()` - Render statistics cards
- `updateAnalyticsChart()` - Create analytics visualization

#### 7. Settings Tab
**Purpose:** System configuration and maintenance

**Features:**
- API URL configuration
- Data export (all devices + measurements as JSON)
- Data cleanup (delete old measurements)
- System information display
- Quick actions for maintenance

**Key Functions:**
- `saveApiUrl()` - Update backend API endpoint
- `runCleanup()` - Trigger data retention cleanup
- `exportAllData()` - Download complete system data

### Kiosk Display Mode
**URL:** `kiosk.html`

**Purpose:** Public-facing read-only dashboard

**Features:**
- Full-screen display optimized for large screens
- Auto-refresh every 5-10 seconds
- Simplified UI without configuration options
- Large, easy-to-read text and visualizations
- Ideal for lobbies, control rooms, public spaces
- Responsive web design

---

## Backend Data Models

The backend uses file-based JSON storage with model classes providing CRUD operations. All models are located in `backend/src/models/`.

### Core Models

#### Device (Device.js)
Represents an ESP32 sensor device.

**Storage:** `backend/data/devices/{device_id}.json`

**Schema:**
```javascript
{
  device_id: "08:92:72:84:1d:18",      // MAC address
  mac_address: "08:92:72:84:1d:18",
  name: "Workshop Sensor 1",
  nickname: "Welding Area",            // Optional display name
  location: "North Wall",
  registered_at: "2026-02-08T10:00:00Z",
  last_seen: "2026-02-08T12:30:00Z",
  status: "active",                    // active | inactive | error
  calibration_offset_db: 0.0,
  measurement_interval: 5,             // seconds
  frequency_bands: [...],
  position: {
    x: 10.0, y: 20.0, z: 1.5,
    installation_height: 2.0,
    coordinate_system: "workshop_floor"
  }
}
```

#### Measurement (Measurement.js)
Sound level measurements from devices.

**Storage:** `backend/data/measurements/{device_id}_{YYYY-MM-DD}.json`

**Schema:**
```javascript
{
  timestamp: "2026-02-08T12:30:15.234Z",
  device_id: "08:92:72:84:1d:18",
  db_level: 72.5,
  band1_level: 65.3,
  band2_level: 72.5,
  band3_level: 58.1,
  frequency_bands: [
    { band_number: 1, start_freq: 20, end_freq: 200, level: 65.3 },
    { band_number: 2, start_freq: 200, end_freq: 2000, level: 72.5 },
    { band_number: 3, start_freq: 2000, end_freq: 8000, level: 58.1 }
  ]
}
```

#### Alert (Alert.js)
Alert rules and triggered alerts.

**Storage:** 
- Rules: `backend/data/alerts/rules.json`
- History: `backend/data/alerts/history/{YYYY-MM-DD}.json`

#### AcousticBarrier (AcousticBarrier.js)
Physical barriers affecting sound propagation.

**Storage:** `backend/data/acoustic_barriers.json`

**Schema:**
```javascript
{
  id: "barrier_1707364800000",
  name: "North Wall",
  type: "wall" | "curtain" | "partition" | "door" | "window",
  material: "concrete_wall" | "drywall_single" | "brick_wall" | ...,
  geometry: {
    type: "line",
    start: { x: 0, y: 10, z: 0 },
    end: { x: 20, y: 10, z: 0 },
    height: 2.5,
    thickness: 0.2
  },
  acoustic_properties: {
    transmission_loss_db: 45,          // Sound reduction through barrier
    reflection_coefficient: 0.7,
    absorption_coefficient: 0.1
  },
  notes: "Concrete block wall",
  created_at: "2026-02-08T10:00:00Z",
  updated_at: "2026-02-08T10:00:00Z"
}
```

#### MapLabel (MapLabel.js) - NEW (February 2026)
Custom text labels for map annotation.

**Storage:** `backend/data/map_labels.json`

**Schema:**
```javascript
{
  id: "1707364800000",                 // Timestamp-based ID
  text: "Welding Station",             // Label text
  position: {
    x: 15.0,                           // Meters from origin
    y: 10.0
  },
  style: {
    fontSize: 16,                      // 8-24 pixels
    fontWeight: "bold",                // "normal" | "bold"
    color: "#ffffff",                  // Text color (hex)
    backgroundColor: "#e74c3c",        // Background color (hex)
    padding: 8,                        // 2-20 pixels
    borderRadius: 4,                   // 0-20 pixels
    opacity: 0.9                       // 0.0-1.0
  },
  visible: true,                       // Show/hide label
  created_at: "2026-02-08T10:00:00Z",
  updated_at: "2026-02-08T10:00:00Z"
}
```

**Methods:**
- `getAll()` - Fetch all labels
- `getById(id)` - Fetch single label
- `create(labelData)` - Create new label
- `update(id, updates)` - Update existing label
- `delete(id)` - Delete label

**Use Cases:**
- Equipment location markers ("CNC Machine", "Welding Station")
- Zone definitions ("Assembly Area", "Storage", "Office")
- Safety markers ("Hearing Protection Required")
- Facility labels ("Loading Dock", "Break Room")

#### SourceLocation (SourceLocation.js)
Triangulated sound source positions.

**Storage:** `backend/data/source_locations/`

**Schema:**
```javascript
{
  id: "source_1707364800000",
  timestamp: "2026-02-08T12:30:15Z",
  position: { x: 25.5, y: 30.2, z: 1.5 },
  confidence: 85,                      // 0-100
  method: "rss_band_2+rss_temporal_cluster",
  sound_characteristics: {
    peak_db: 82.3,
    avg_db: 78.5,
    dominant_frequency_band: 2,
    frequency_range: { start: 200, end: 2000 }
  },
  source_type: "power_tool",           // Classified source
  measurements_used: 45,
  sensors_involved: ["08:92:72:84:1d:18", ...],
  triangulation_metadata: {...}
}
```

---

## Backend API Reference

### Base URL
```
http://localhost:3000
```

### Authentication
API key required in header for measurement submission:
```
Authorization: Bearer your-api-key-here
```

### Device Management Endpoints

#### Register New Device
```http
POST /api/devices/register
Content-Type: application/json

{
  "device_id": "08:92:72:84:1d:18",
  "mac_address": "08:92:72:84:1d:18",
  "name": "Front Entrance Sensor",
  "location": "Building A - Main Door"
}

Response: 201 Created
{
  "device_id": "08:92:72:84:1d:18",
  "api_key": "YOUR_API_KEY_HERE",
  "status": "registered"
}
```

**Note**: When using shared API key approach, all devices are automatically assigned the shared API key (from `SHARED_API_KEY` or `API_KEY` environment variable) during registration. The returned `api_key` will match the firmware's `CONFIG_API_KEY`.

#### List All Devices
```http
GET /api/devices

Response: 200 OK
{
  "devices": [
    {
      "device_id": "08:92:72:84:1d:18",
      "name": "Front Entrance Sensor",
      "location": "Building A - Main Door",
      "status": "active",
      "last_seen": "2026-02-07T12:30:00Z",
      "calibration_offset_db": 0.0
    }
  ]
}
```

#### Get Device Details
```http
GET /api/devices/:deviceId

Response: 200 OK
{
  "device_id": "08:92:72:84:1d:18",
  "mac_address": "08:92:72:84:1d:18",
  "name": "Front Entrance Sensor",
  "location": "Building A - Main Door",
  "registered_at": "2026-02-07T10:00:00Z",
  "last_seen": "2026-02-07T12:30:00Z",
  "status": "active",
  "calibration_offset_db": 0.0,
  "measurement_interval": 5,
  "frequency_bands": [...],
  "position": {...}
}
```

#### Update Device
```http
PUT /api/devices/:deviceId
Content-Type: application/json

{
  "name": "Updated Name",
  "location": "New Location"
}

Response: 200 OK
```

#### Delete Device
```http
DELETE /api/devices/:deviceId

Response: 200 OK
{
  "message": "Device deleted successfully"
}
```

### Measurement Data Endpoints

#### Submit Measurement (requires auth)
```http
POST /api/data/measurements
Authorization: Bearer api-key
Content-Type: application/json

{
  "device_id": "08:92:72:84:1d:18",
  "timestamp": "2026-02-07T12:30:15Z",
  "db_level": 65.5,
  "db_level_raw": 63.2,
  "frequency_bands": [
    {
      "band_number": 1,
      "start_freq": 20,
      "end_freq": 200,
      "level": 58.3,
      "level_raw": 58.3
    },
    {
      "band_number": 2,
      "start_freq": 200,
      "end_freq": 2000,
      "level": 65.5,
      "level_raw": 63.2
    },
    {
      "band_number": 3,
      "start_freq": 2000,
      "end_freq": 8000,
      "level": 52.1,
      "level_raw": 52.1
    }
  ]
}

Response: 200 OK
{
  "status": "success",
  "message": "Measurement stored"
}
```

#### Get Device Measurements
```http
GET /api/data/measurements/:deviceId?start_date=2026-02-07&end_date=2026-02-08

Response: 200 OK
{
  "device_id": "08:92:72:84:1d:18",
  "measurements": [
    {
      "timestamp": "2026-02-07T12:30:15Z",
      "db_level": 65.5,
      "frequency_bands": [...]
    }
  ],
  "count": 1234
}
```

#### Export to CSV
```http
GET /api/data/export/csv/:deviceId?start_date=2026-02-07&end_date=2026-02-08

Response: 200 OK (text/csv)
timestamp,db_level,band1_level,band2_level,band3_level
2026-02-07T12:30:15Z,65.5,58.3,65.5,52.1
...
```

### Configuration Endpoints

#### Get Device Configuration
```http
GET /api/config/devices/:deviceId/frequency-bands

Response: 200 OK
{
  "device_id": "08:92:72:84:1d:18",
  "measurement_interval": 5,
  "calibration_offset_db": 0.0,
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
    },
    {
      "band_number": 3,
      "start_frequency": 2000,
      "end_frequency": 8000,
      "calibration_offset_db": 0.0
    }
  ]
}
```

#### Update Frequency Bands
```http
PUT /api/config/devices/:deviceId/frequency-bands
Content-Type: application/json

{
  "frequency_bands": [
    {
      "band_number": 1,
      "start_frequency": 20,
      "end_frequency": 200
    }
  ],
  "measurement_interval": 5,
  "calibration_offset_db": 2.5
}

Response: 200 OK
```

#### Update Calibration
```http
PUT /api/config/devices/:deviceId/calibration
Content-Type: application/json

{
  "calibration_offset_db": 2.5
}

Response: 200 OK
```

### Additional Endpoints

#### Alerts
```http
# Get all alert rules
GET /api/alerts

# Create alert rule
POST /api/alerts
{
  "device_id": "08:92:72:84:1d:18",  // or null for all devices
  "threshold": 85.0,
  "type": "above",  // or "below"
  "enabled": true
}

# Get alert history
GET /api/alerts/history/all?limit=100
```

#### Analytics
```http
# Get statistics for device(s)
GET /api/analytics/stats?device_id=08:92:72:84:1d:18&start_date=2026-02-07T00:00:00Z&end_date=2026-02-08T23:59:59Z

Response:
{
  "count": 1234,
  "mean": 72.5,
  "median": 71.2,
  "min": 45.3,
  "max": 95.7,
  "std_dev": 8.4,
  "percentile_95": 88.2
}
```

#### Triangulation
```http
# Locate single sound source from recent measurements
GET /api/triangulation/locate?time_window_ms=30000

Response:
{
  "position": {
    "x": 25.5,
    "y": 30.2,
    "z": 1.5
  },
  "confidence": 85,
  "method": "rss",
  "measurements_used": 45,
  "time_window_ms": 30000
}

# Locate multiple simultaneous sources
GET /api/triangulation/locate-multiple?time_window_seconds=30&min_confidence=40

Response:
{
  "sources": [
    {
      "position": { "x": 25.5, "y": 30.2, "z": 1.5 },
      "confidence": 85,
      "method": "rss_band_2+rss_temporal_cluster",
      "frequency_band": 2,
      "band_name": "mid",
      "frequency_range": { "start": 200, "end": 2000 },
      "source_type": "power_tool",
      "merged_from": 2,
      "characteristics": {
        "avg_db": 82.3,
        "sensor_count": 5,
        "dominant_frequency": "mid",
        "agreement_count": 2
      }
    },
    {
      "position": { "x": 45.2, "y": 18.7, "z": 1.5 },
      "confidence": 72,
      "method": "rss_band_1",
      "frequency_band": 1,
      "band_name": "low",
      "frequency_range": { "start": 20, "end": 200 },
      "source_type": "hvac_system",
      "characteristics": {
        "avg_db": 68.5,
        "sensor_count": 4,
        "dominant_frequency": "low"
      }
    }
  ],
  "measurements_used": 48,
  "time_window_seconds": 30,
  "timestamp": "2026-02-08T12:30:45Z",
  "options": {
    "min_confidence": 40,
    "merge_distance": 3.0,
    "frequency_bands_enabled": true,
    "temporal_clustering_enabled": true
  }
}
```

#### Sensor Positions
```http
# Update sensor position
PUT /api/positions/sensors
{
  "device_id": "08:92:72:84:1d:18",
  "x": 10.0,
  "y": 20.0,
  "z": 1.5
}

# Get all sensor positions
GET /api/positions/sensors
```

#### Acoustic Barriers
```http
# Add acoustic barrier
POST /api/barriers
{
  "name": "Wall A",
  "start_x": 0,
  "start_y": 10,
  "end_x": 20,
  "end_y": 10,
  "attenuation_db": 15
}

# Get all barriers
GET /api/barriers
```

#### Map Labels

**Purpose:** Add custom text labels to annotate locations on the workshop map (both kiosk display and triangulation interface).

```http
# Get all map labels
GET /api/labels

Response: 200 OK
[
  {
    "id": "1707364800000",
    "text": "Welding Station",
    "position": {
      "x": 15.0,
      "y": 10.0
    },
    "style": {
      "fontSize": 16,
      "fontWeight": "bold",
      "color": "#ffffff",
      "backgroundColor": "#e74c3c",
      "padding": 8,
      "borderRadius": 4,
      "opacity": 0.9
    },
    "visible": true,
    "created_at": "2026-02-08T10:00:00Z",
    "updated_at": "2026-02-08T10:00:00Z"
  }
]

# Create new map label
POST /api/labels
Content-Type: application/json

{
  "text": "Assembly Area",
  "position": {
    "x": 35.0,
    "y": 20.0
  },
  "style": {
    "fontSize": 14,
    "fontWeight": "normal",
    "color": "#ffffff",
    "backgroundColor": "#3498db",
    "padding": 8,
    "borderRadius": 4,
    "opacity": 0.9
  },
  "visible": true
}

Response: 201 Created
{
  "id": "1707364900000",
  "text": "Assembly Area",
  ...
}

# Get single label
GET /api/labels/:id

Response: 200 OK
{ ... }

# Update label
PUT /api/labels/:id
Content-Type: application/json

{
  "text": "Welding Area (Updated)",
  "position": { "x": 15.5, "y": 10.5 },
  "style": { "fontSize": 18, "color": "#ff0000" }
}

Response: 200 OK
{ ... }

# Delete label
DELETE /api/labels/:id

Response: 200 OK
{ "message": "Label deleted successfully" }
```

**Style Properties:**
- `fontSize`: 8-24 (pixels)
- `fontWeight`: "normal" or "bold"
- `color`: Hex color code for text (e.g., "#ffffff")
- `backgroundColor`: Hex color code for background (e.g., "#333333")
- `padding`: 2-20 (pixels)
- `borderRadius`: 0-20 (pixels, for rounded corners)
- `opacity`: 0.0-1.0 (transparency)

**Use Cases:**
- Mark equipment locations ("CNC Machine", "Welding Station")
- Define work areas ("Assembly Area", "Storage")
- Label zones ("Quiet Zone", "High Noise Area")
- Annotate map features ("Office", "Loading Dock")

**Frontend Integration:**
- **Kiosk Display:** Labels auto-render on SVG map with drop shadows
- **Triangulation Tab:** Full CRUD interface with "Configure Labels" button
  - Add/edit/delete labels via modal
  - Real-time preview on canvas map
  - Toggle visibility with "Labels" checkbox
  - Color pickers for text and background
  - Interactive positioning

### Complete API Route Modules

The backend implements 10 route modules in `backend/src/routes/`:

1. **devices.js** - Device registration, management, CRUD operations
2. **data.js** - Measurement submission and retrieval
3. **config.js** - Device configuration (frequency bands, calibration)
4. **alerts.js** - Alert rule management and history
5. **analytics.js** - Statistical analysis and aggregations
6. **triangulation.js** - Sound source localization
7. **positions.js** - Sensor position management
8. **sources.js** - Sound source management
9. **barriers.js** - Acoustic barrier configuration

---

## Security & Configuration

### Environment Variables

**Backend** (`.env`):
```bash
# Server Configuration
PORT=3000
HOST=0.0.0.0

# API Security - Shared Key Approach
# All devices use this single API key (must match firmware CONFIG_API_KEY)
SHARED_API_KEY=REDACTED
# Legacy alias (SHARED_API_KEY takes precedence)
API_KEY=REDACTED

# Data Storage
DATA_DIR=./data

# Logging
LOG_LEVEL=info
LOG_FILE=./data/logs/server.log
```

**Important**: The `SHARED_API_KEY` (or `API_KEY`) must exactly match the `CONFIG_API_KEY` value compiled into the ESP32 firmware.

### Sensitive Files (Excluded from Git)

**Firmware:**
- `sdkconfig` - WiFi credentials, server URL, API key
  - Template: `sdkconfig.example`

**Backend:**
- `.env` - Environment variables
- `data/devices/*.json` - Device registrations
- `data/measurements/*.json` - Measurement data
- `data/logs/*.log` - Server logs

**Setup Instructions:**
```bash
# Firmware
cd firmware/sound-level-sensor
cp sdkconfig.example sdkconfig
idf.py menuconfig  # Configure WiFi, server URL, API key

# Backend
cd backend
cp .env.example .env
# Edit .env with your settings
```

### API Key Security

**Shared API Key Approach** (Current Implementation):
- All devices use a **single shared API key** hardcoded in the firmware
- Set via `CONFIG_API_KEY` in firmware `sdkconfig` (e.g., `YOUR_API_KEY_HERE`)
- Same key configured in backend via `SHARED_API_KEY` or `API_KEY` environment variable
- Each device is uniquely identified by its MAC address (device_id)
- Backend validates the shared key + verifies device exists
- Simplifies deployment: flash same firmware to all devices
- Devices automatically registered with this shared key

**Why Shared Key?**
- **Simplicity**: One firmware build for all devices (9 operational, 10 purchased)
- **No per-device provisioning**: Each ESP32 auto-identifies via MAC address
- **Easier deployment**: Flash and deploy without individual configuration
- **Suitable for trusted networks**: All devices on isolated internal network

**Alternative: Per-Device API Keys** (Optional):
- Each device can have its own unique API key stored in device registration JSON
- Backend checks shared key first, then falls back to per-device key
- Useful for mixed deployments or added security
- Requires individual device provisioning

**Security Considerations:**
- Keys transmitted in plain text over WiFi (internal network only)
- No HTTPS/TLS encryption
- Shared key means compromise of one device exposes all
- **Use only on isolated/trusted networks**

### Network Security Warnings

⚠️ **IMPORTANT**: This system is designed for **internal/private networks only**

**Not Secure For:**
- Public internet exposure
- Untrusted networks
- Networks with sensitive data compliance requirements

**Security Limitations:**
- No HTTPS/TLS encryption
- No user authentication
- API keys in plain text
- No rate limiting
- No input sanitization beyond basic validation

**Recommended Deployment:**
- Isolated WiFi network (separate VLAN)
- Firewall rules restricting access
- VPN for remote administration
- Regular security audits
- Network monitoring

---

## Development Workflow

### Setting Up Development Environment

**Prerequisites:**
- ESP-IDF v5.0+ (for firmware)
- Node.js v18+ (for backend)
- Git
- Code editor (VS Code recommended)

**Initial Setup:**
```bash
# Clone repository
git clone <repository>
cd sound-monitoring-mesh

# Backend setup
cd backend
npm install
cp .env.example .env
# Edit .env

# Firmware setup (macOS)
cd ../firmware/sound-level-sensor
. $HOME/esp/esp-idf/export.sh
cp sdkconfig.example sdkconfig
idf.py menuconfig
idf.py build
```

### Code Style Guidelines

**Firmware (C):**
- Follow ESP-IDF coding standards
- Use `snake_case` for functions and variables
- Comment complex logic
- Use `ESP_LOGI`/`ESP_LOGE` for logging
- Keep functions focused and short

**Backend (JavaScript):**
- ES6+ syntax
- Async/await for asynchronous operations
- JSDoc comments for public functions
- Consistent error handling with try/catch
- Use meaningful variable names

**Frontend (JavaScript):**
- ES6+ syntax
- Modular code organization
- Clear, descriptive function names
- Responsive design principles
- Progressive enhancement

### Git Workflow

**Branches:**
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Production hotfixes

**Commit Message Format:**
```
type: Short description (50 chars or less)

More detailed explanatory text, if necessary. Wrap at 72 characters.

- Bullet points for details
- Use present tense: "Add feature" not "Added feature"
- Reference issues: "Fixes #123"
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance tasks

### Testing

**Firmware Testing:**
```bash
cd firmware/sound-level-sensor
idf.py build
idf.py -p /dev/cu.usbmodem1201 flash monitor
```

**Backend Testing:**
```bash
cd backend
npm start

# In another terminal
curl http://localhost:3000/health
curl http://localhost:3000/api/devices
```

**Integration Testing:**
- Verify end-to-end data flow
- Test all API endpoints
- Validate measurement accuracy
- Check configuration updates

### Deployment

**Development Environment:**
- Local MacBook for testing
- Single ESP32 device for validation
- Hot reload for frontend (python3 -m http.server)
- Nodemon for backend auto-restart
- WiFi: Home network

**Production Environment (Nova Labs):**
- Location: Nova Labs makerspace
- WiFi Network: `YOUR_WORKSHOP_WIFI` (isolated IoT network)
- Server: Ubuntu server (20.04+) - TBD
- Deployment: Nginx reverse proxy + PM2
- Devices: All 10 ESP32-C3 sensors deployed
- Network: Isolated from main network for security

**Production Configuration:**
```bash
# Firmware (use menuconfig)
WiFi SSID: YOUR_WORKSHOP_WIFI
WiFi Password: YOUR_WORKSHOP_PASSWORD
Server URL: http://<nova-labs-server-ip>:3000
API Key: <production-api-key>

# Backend (.env)
PORT=3000
API_KEY=<production-api-key>
DATA_DIR=/opt/sound-monitoring-mesh/data
LOG_LEVEL=info
```

**Deployment Checklist:**
- [ ] Update firmware configuration (WiFi, server URL)
- [ ] Flash all 10 ESP32 devices
- [ ] Configure backend environment
- [ ] Set up reverse proxy (Nginx)
- [ ] Configure firewall rules
- [ ] Start backend service (PM2)
- [ ] Verify all devices connecting
- [ ] Test frontend access
- [ ] Monitor logs for errors

---

## Frontend Application Structure

### Architecture
- **Framework**: Vanilla JavaScript (no dependencies)
- **Pattern**: Single Page Application (SPA)
- **Navigation**: Tab-based interface
- **API Client**: Custom wrapper (`js/api.js`)
- **Charts**: Chart.js for visualizations
- **Styling**: Custom CSS, responsive design

### File Structure
```
frontend/
├── index.html          # Main application
├── kiosk.html          # Public kiosk display
├── test.html           # Testing utilities
├── css/
│   ├── styles.css      # Main styles
│   ├── kiosk.css       # Kiosk-specific
│   └── features.css    # Feature styles
└── js/
    ├── api.js          # API client
    ├── app.js          # Main logic
    ├── charts.js       # Chart utilities
    ├── kiosk.js        # Kiosk display
    └── triangulation.js # Triangulation viz
```

### Key Features

**Dashboard Tab:**
- Real-time device status grid
- Live measurement displays
- Color-coded status (active/inactive/error)
- Auto-refresh every 30 seconds

**Devices Tab:**
- Device registration form
- Device list with details
- Calibration interface
- Frequency band configuration

**History Tab:**
- Historical data viewer
- Date range selection
- Interactive charts (Chart.js)
- CSV export functionality

**Alerts Tab:**
- Alert threshold configuration
- Active alerts display
- Alert history

**Analytics Tab:**
- Aggregate statistics
- Trend analysis
- Multi-device comparisons

**Triangulation Tab:**
- 2D/3D spatial visualization
- Sound source localization
- Sensor position configuration
- Acoustic barrier modeling

---

## Project Requirements Summary

### Key Requirements
- 10 distributed ESP32-C3 sensor devices
- WiFi mesh communication (star topology)
- Real-time sound level monitoring (dB)
- 3 configurable frequency bands
- Web-based dashboard and management
- File-based JSON storage
- Device calibration support
- Historical data viewing and export
- Sound source triangulation
- Alert system

### Success Criteria
- 9 devices operational and sending data
- 10 devices purchased (1 spare/development unit)
- <5 second measurement interval
- <1 second latency for dashboard updates
- 99% uptime target
- Calibration accuracy ±2 dB
- Responsive web interface (mobile-friendly)
- Data retention: 30 days minimum

### Technical Specifications
- **Audio Sampling**: 16 kHz, 32-bit I2S
- **FFT**: 1024 points with Hamming window
- **Frequency Range**: 20 Hz - 8 kHz
- **Default Bands**: 20-200Hz, 200-2000Hz, 2000-8000Hz
- **WiFi**: 802.11 b/g/n (2.4 GHz)
- **HTTP**: RESTful API, JSON payloads
- **Storage**: JSON files, daily rotation

---

## Troubleshooting

### Backend Issues

**Port already in use:**
```bash
lsof -i :3000
kill -9 <PID>
```

**Data directory errors:**
```bash
mkdir -p backend/data/{devices,measurements,alerts/history,logs}
```

**Module not found:**
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

### Frontend Issues

**CORS errors:**
- Ensure backend has CORS enabled (it does by default)
- Check `Access-Control-Allow-Origin` in response headers

**API not reachable:**
- Verify backend is running: `curl http://localhost:3000/health`
- Check `API_BASE_URL` in `frontend/js/api.js`

### Device Communication Issues

**Device not registering:**
- Check device is powered and connected to WiFi
- Monitor serial output: `idf.py monitor`
- Verify backend URL in firmware config
- Check API key matches

**No measurements received:**
- Device registered? Check `/api/devices`
- API key valid? Check `.env` and device config
- Network connectivity? Ping backend from device network

---

**Document Version**: 1.0  
**Last Updated**: February 7, 2026  
**Related Docs**: [README.md](README.md), [HARDWARE_AND_FIRMWARE.md](HARDWARE_AND_FIRMWARE.md)
