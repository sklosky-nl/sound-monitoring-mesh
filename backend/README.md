# Backend

See the [main README](../README.md) for full documentation.

# Sound Level Mesh System - Backend API

Node.js backend API server for the Sound Level Mesh System.

**Status:** ✅ Operational with 9 devices actively sending data

## Features

### Core Functionality
- RESTful API with 9 route modules
- Device registration and management
- Real-time measurement data collection and storage
- Shared API key authentication with per-device validation
- File-based JSON storage (no database required)
- Automatic data cleanup with configurable retention
- Comprehensive logging with Winston

### API Modules
1. **Device Management** - Registration, CRUD operations, device info
2. **Data Collection** - Measurement submission and retrieval
3. **Configuration** - Frequency bands, calibration, device settings
4. **Alerts** - Alert rules, threshold monitoring, notification system
5. **Analytics** - Statistical analysis, trends, aggregations
6. **Triangulation** - Sound source localization using continuous RSS (Received Signal Strength) measurements
   - Single-source localization using basic RSS
   - Multi-source detection using frequency-band separation and temporal clustering
7. **Positions** - Sensor spatial positioning and mapping
8. **Sources** - Sound source tracking and management
9. **Barriers** - Acoustic obstacle modeling for triangulation

### Data Management
- JSON file-based storage for devices, measurements, alerts
- Time-series measurement data organized by device and date
- Configurable data retention (default: 7 days)
- CSV export functionality
- Bulk data export (all devices + measurements)

## Setup

### Prerequisites

- Node.js 18.0.0 or higher
- npm

### Installation

```bash
cd backend
npm install
```

### Configuration

Create a `.env` file in the backend directory:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development
HOST=0.0.0.0

# Data Storage
DATA_DIR=./data
DATA_RETENTION_DAYS=7

# API Configuration - Shared Key Approach
# All devices use this SAME API key (must match firmware CONFIG_API_KEY)
SHARED_API_KEY=<your-api-key>  # see CREDENTIALS.local
# Legacy alias (SHARED_API_KEY takes precedence)
API_KEY=<your-api-key>  # see CREDENTIALS.local

# Logging
LOG_LEVEL=info
```

**Shared API Key Approach:**
- All ESP32 devices use the **same API key** compiled into firmware
- The `SHARED_API_KEY` (or `API_KEY`) must **exactly match** the firmware's `CONFIG_API_KEY`
- Each device is uniquely identified by its MAC address (e.g., `08:92:72:84:1d:18`)
- Backend validates the shared key first, then checks if device exists
- Simplifies deployment: one firmware build for all devices
- **Current deployment:** 9 devices operational, 10 purchased (1 spare)

**To change the key:**
1. Choose a secure random string (e.g., UUID)
2. Update `SHARED_API_KEY` in backend `.env`
3. Update `CONFIG_API_KEY` in firmware `sdkconfig` (via `idf.py menuconfig`)
4. Rebuild and reflash all devices
5. Re-register all devices in backend (they'll get new shared key)

### Server Settings

The backend includes the following optimizations for IoT device communication:

- **Body Parser Limit**: 10MB (handles large JSON payloads)
- **Request Timeout**: 30 seconds
- **Response Timeout**: 30 seconds
- **CORS**: Enabled for all origins (development mode)
- **Host**: 0.0.0.0 (listens on all network interfaces)

## Running the Server

### Development mode (with auto-restart)

```bash
npm run dev
```

### Production mode

```bash
npm start
```

The server will start on port 3000 (configurable via `PORT` env variable).

**Access:**
- API Base: http://localhost:3000/api/
- Frontend: http://localhost:3000 (serves static files from ../frontend)
- Health Check: http://localhost:3000/health
- Kiosk Display: http://localhost:3000/kiosk.html

**Logs:**
- Console output (info level)
- File logging: `data/logs/server.log`

### Current Status

**Active System:**
- 9 devices registered and sending data
- Real-time measurements every 5 seconds
- All API endpoints operational
- Frontend fully integrated

---

## API Endpoints

### Quick Reference

**Devices:**
- `GET /api/devices` - List all devices
- `POST /api/devices/register` - Register new device
- `GET /api/devices/:id` - Get device details
- `PUT /api/devices/:id` - Update device
- `DELETE /api/devices/:id` - Delete device

**Measurements:**
- `POST /api/data/measurements` - Submit measurement (requires auth)
- `GET /api/data/measurements/:deviceId` - Get device measurements
- `GET /api/data/export/csv/:deviceId` - Export to CSV

**Configuration:**
- `GET /api/config/devices/:id/frequency-bands` - Get device config
- `PUT /api/config/devices/:id/frequency-bands` - Update bands
- `PUT /api/config/devices/:id/calibration` - Update calibration

**Alerts:**
- `GET /api/alerts` - List alert rules
- `POST /api/alerts` - Create alert rule
- `GET /api/alerts/history/all` - Get alert history

**Analytics:**
- `GET /api/analytics/stats` - Get statistics

**Triangulation:**
- `GET /api/triangulation/locate` - Locate single sound source using RSS
- `GET /api/triangulation/locate-multiple` - Locate multiple simultaneous sources
- `GET /api/triangulation/sensors` - Get sensor positions
- `GET /api/triangulation/sources/recent` - Get recent sound sources

**Positions & Barriers:**
- `GET /api/positions/sensors` - Get sensor positions
- `PUT /api/positions/sensors` - Update position
- `GET /api/barriers` - Get acoustic barriers
- `POST /api/barriers` - Add barrier

See [DEVELOPER_REFERENCE.md](../DEVELOPER_REFERENCE.md) for complete API documentation.

---

## Architecture

### File Structure
```
backend/
├── src/
│   ├── server.js           # Main Express server
│   ├── routes/             # API route modules (9 files)
│   ├── models/             # Data models (5 files)
│   ├── services/           # Business logic (triangulation, etc.)
│   └── utils/              # Helpers (logger)
├── data/
│   ├── devices/            # Device JSON files
│   ├── measurements/       # Measurement time-series data
│   ├── alerts/             # Alert rules and history
│   └── logs/               # Server logs
├── package.json
└── .env                    # Configuration
```

### Data Storage

**Devices:** `data/devices/{device_id}.json`
- One file per device
- Contains registration info, config, position

**Measurements:** `data/measurements/{device_id}_{YYYY-MM-DD}.json`
- One file per device per day
- Array of measurements with timestamps
- Old files cleaned up based on retention policy

**Alerts:** `data/alerts/`
- Alert rules and triggered alert history

### Authentication Flow

1. Device sends measurement with `Authorization: Bearer {api_key}` header
2. Backend extracts API key and device_id from request
3. Validates via `DeviceModel.verifyApiKey()`:
   - First checks if key matches `SHARED_API_KEY` (if configured)
   - If shared key matches, verifies device exists
   - Otherwise checks device-specific API key
4. If valid, stores measurement and updates last_seen
5. If invalid, returns 403 error

---

## API Endpoints (Detailed)

### Health Check

```http
GET /health
```

### Device Management

**Register a device:**
```http
POST /api/devices/register
Content-Type: application/json

{
  "device_id": "esp32_001",
  "mac_address": "AA:BB:CC:DD:EE:FF",
  "name": "Living Room Sensor",
  "location": "Living Room, North Wall"
}
```

**Get all devices:**
```http
GET /api/devices
```

**Get specific device:**
```http
GET /api/devices/:deviceId
```

**Update device:**
```http
PUT /api/devices/:deviceId
Content-Type: application/json

{
  "name": "Updated Name",
  "location": "New Location"
}
```

### Data Submission

**Submit measurement (requires API key):**
```http
POST /api/data/measurements
Authorization: Bearer <api_key>
Content-Type: application/json

{
  "device_id": "esp32_001",
  "timestamp": "2026-01-30T18:00:00Z",
  "db_level": 65.5,
  "db_level_raw": 65.5,
  "frequency_bands": [
    {
      "band_number": 1,
      "start_freq": 20,
      "end_freq": 200,
      "level": 45.2,
      "level_raw": 45.2
    }
  ]
}
```

**Get measurements:**
```http
GET /api/data/measurements/:deviceId?start_date=2026-01-29&end_date=2026-01-30
GET /api/data/measurements/:deviceId?limit=10
```

### Configuration

**Get device configuration:**
```http
GET /api/config/devices/:deviceId/frequency-bands
```

**Update frequency bands:**
```http
PUT /api/config/devices/:deviceId/frequency-bands
Content-Type: application/json

{
  "frequency_bands": [
    {
      "band_number": 1,
      "start_frequency": 20,
      "end_frequency": 200,
      "calibration_offset_db": 0.0
    }
  ],
  "measurement_interval": 5,
  "calibration_offset_db": 2.5
}
```

**Update calibration:**
```http
PUT /api/config/devices/:deviceId/calibration
Content-Type: application/json

{
  "calibration_offset_db": 2.5
}
```

## Data Storage

All data is stored in the `./data` directory:

- `data/devices/` - Device configuration files (JSON)
- `data/measurements/` - Measurement data files (JSON, one file per device per day)
- `data/logs/` - Server logs

## Automatic Cleanup

Old measurement data is automatically cleaned up based on the `DATA_RETENTION_DAYS` setting (default: 7 days).

Manual cleanup:
```http
POST /api/data/cleanup
```

## Development

### Project Structure

```
backend/
├── src/
│   ├── server.js          # Main server file
│   ├── routes/            # API route handlers
│   │   ├── devices.js
│   │   ├── data.js
│   │   └── config.js
│   ├── models/            # Data models
│   │   ├── Device.js
│   │   └── Measurement.js
│   └── utils/             # Utility functions
│       └── logger.js
├── data/                  # Data storage (git-ignored)
│   ├── devices/
│   ├── measurements/
│   └── logs/
├── package.json
├── .env                   # Environment configuration
└── README.md
```

### Adding New Endpoints

1. Create route handler in `src/routes/`
2. Import and register in `src/server.js`
3. Add model functions if needed in `src/models/`

## Deployment

For production deployment on Ubuntu server, see the main architecture document.

## License

TBD
