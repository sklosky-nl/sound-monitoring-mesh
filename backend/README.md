# Sound Level Mesh System - Backend API

Node.js backend API server for the Sound Level Mesh System.

## Features

- RESTful API for device management
- Measurement data storage (file-based)
- Device configuration management
- API key authentication
- Automatic data cleanup (configurable retention)
- Logging with Winston

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

Edit `.env` file:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development
HOST=0.0.0.0

# Data Storage
DATA_DIR=./data
DATA_RETENTION_DAYS=7

# API Configuration - CHANGE THIS!
API_KEY=your_secure_api_key_here

# Logging
LOG_LEVEL=info
```

**Important:** Change the `API_KEY` to a secure random string. This key will be used by ESP32 devices to authenticate.

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

The server will start on `http://localhost:3000` (or the configured PORT).

## API Endpoints

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
