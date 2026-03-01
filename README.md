# Sound Monitoring Mesh

A distributed sound monitoring system: ESP32-C3 sensor nodes sample audio via INMP441 I2S microphone, compute FFT-based dB and frequency-band levels, and POST measurements to a Node.js backend. A browser frontend provides real-time monitoring, triangulation, history playback, alerts, analytics, and a public kiosk display.

**Status:** ✅ Operational — 9 devices at Nova Labs makerspace (`xibo.space.nova-labs.org`)  
**Firmware:** `2.1.1-prod` (production) · `2.1.2-dev` (dev / OTA testing)  
**Backend / Frontend:** `v2.1.0`

---

## Table of Contents

1. [Architecture](#architecture)
2. [Hardware](#hardware)
3. [Firmware](#firmware)
4. [Backend](#backend)
5. [Frontend](#frontend)
6. [Production Deployment](#production-deployment-nova-labs)
7. [Development Setup](#development-setup)
8. [Scripts](#scripts)
9. [Security & Credentials](#security--credentials)
10. [Changelog](#changelog)

---

## Architecture

```
ESP32-C3 + INMP441  (×9)
        │  WiFi (REDACTED_WORKSHOP_WIFI_SSID)
        ▼
┌───────────────────────────────┐
│  xibo.space.nova-labs.org     │
│  Ubuntu 20.04 · Apache proxy  │
│                               │
│  ┌──────────────────────────┐ │
│  │ Node.js/Express :3000    │ │  ← /api/*
│  │  13 REST route modules   │ │
│  └──────────────────────────┘ │
│  ┌──────────────────────────┐ │
│  │ Frontend (vanilla JS)    │ │  ← xibo.space.nova-labs.org/sound/
│  │  Served by Apache        │ │
│  └──────────────────────────┘ │
│  ┌──────────────────────────┐ │
│  │ JSON file storage        │ │  ← backend/data/
│  └──────────────────────────┘ │
└───────────────────────────────┘
```

**Data flow:** Each device POSTs to `/api/data` every 5 s → backend stores JSON → frontend polls → renders.  
**Authentication:** Shared API key in `Authorization: Bearer` header (all devices share one key, uniquely identified by MAC address).

---

## Hardware

### Bill of Materials (per sensor node)

| Component | Part | Notes |
|-----------|------|-------|
| MCU | ESP32-C3 SuperMini | RISC-V 160 MHz, 4 MB flash, 400 KB SRAM, USB-CDC |
| Microphone | INMP441 I2S MEMS | −26 dBFS, 61 dB SNR, 60 Hz–15 kHz |
| Power | USB-C cable + 5V wall charger | |
| Enclosure | 15–30 mm foam microphone windscreen | RF-transparent (<0.5 dB loss), acoustically transparent |
| Wiring | Dupont jumper wires | Solder header pins to ESP32-C3 SuperMini first |

> ⚠️ 3D-printed PETG enclosures blocked WiFi signals (6–16 dB loss). Foam windscreens are the confirmed solution.

### Wiring — ESP32-C3 → INMP441

| ESP32-C3 | GPIO | INMP441 Pin | Signal |
|----------|------|-------------|--------|
| 3V3 | — | VDD | Power (3.3 V) |
| GND | — | GND | Ground |
| GND | — | L/R | Channel select (GND = Left channel) |
| **4** | GPIO 4 | SD | I2S Data |
| **5** | GPIO 5 | SCK | I2S Bit Clock |
| **6** | GPIO 6 | WS | I2S Word Select |

> ⚠️ A **10 kΩ pull-down resistor on the SD line** (GPIO 4 to GND) is required. Without it the SD line floats and produces noise/incorrect readings.

```
ESP32-C3 SuperMini             INMP441
  3.3V ●────────────────────── VDD
   GND ●──────────┬─────────── GND
                  └─────────── L/R  (Left channel)
GPIO 4 ●──[10kΩ]──┤─────────── SD
GPIO 5 ●────────────────────── SCK
GPIO 6 ●────────────────────── WS
```

---

## Firmware

**Source:** `firmware/sound-level-sensor/`  
**Current versions:** `2.1.1-prod` (production binary) · `2.1.2-dev` (dev binary, points at local backend)

### Key Features

| Feature | Detail |
|---------|--------|
| I2S sampling | 16 kHz, **32-bit container** (INMP441 outputs 24-bit; DMA data width must be 32-bit) |
| FFT | 1024-point, Hamming window, ESP-DSP library |
| Frequency bands | 3 configurable bands (start Hz, end Hz per band), SPL via self-normalizing energy fraction |
| dB calculation | Full-spectrum RMS + peak-hold over reporting window |
| Event detection | Threshold 55 dB, min duration 50 ms, cooldown 500 ms |
| OTA updates | Checks `/api/firmware/check` hourly; dual OTA partitions; auto-rollback on failure |
| Time sync | SNTP/NTP on boot |
| Auth | `Authorization: Bearer <API_KEY>` on all API calls |
| Device identity | MAC address used as `device_id` (auto-detected at runtime) |

### Configuration (`sdkconfig.defaults` → copy to `sdkconfig`)

```ini
CONFIG_WIFI_SSID         = "YOUR_WIFI_SSID"
CONFIG_WIFI_PASSWORD     = "YOUR_WIFI_PASSWORD"
CONFIG_SERVER_URL        = "http://YOUR_SERVER_HOST:3000"
CONFIG_API_KEY           = "YOUR_API_KEY"
```

Real values live in `CREDENTIALS.local` (gitignored). Never commit actual credentials.

### Build & Flash

```bash
# One-time: source ESP-IDF
source ~/esp/esp-idf/export.sh

cd firmware/sound-level-sensor

# Configure (first time or when credentials change)
cp sdkconfig.defaults sdkconfig
idf.py menuconfig          # Set WiFi SSID, password, server URL, API key

# Build
idf.py build

# Flash (USB)
idf.py -p /dev/cu.usbmodem* flash

# Monitor serial output
idf.py -p /dev/cu.usbmodem* monitor
```

Expected serial output after successful boot:
```
I (xxxx) SOUND_SENSOR: Connected to WiFi
I (xxxx) SOUND_SENSOR: NTP sync complete
I (xxxx) SOUND_SENSOR: Starting measurement loop
I (xxxx) SOUND_SENSOR: dB=62.3 peak=71.0 band1=45.2 band2=58.1 band3=41.6
```

### OTA Update Workflow

1. Build new firmware binary
2. Copy binary to `backend/data/firmware/sound-sensor-X.Y.Z.bin`
3. Update `backend/data/firmware/versions.json` (version, filename, size, sha256)
4. Devices check hourly; auto-download and reboot if newer version found

Compute sha256:
```bash
shasum -a 256 backend/data/firmware/sound-sensor-X.Y.Z.bin
stat -f%z backend/data/firmware/sound-sensor-X.Y.Z.bin  # file size in bytes
```

### Firmware Version Registry (`backend/data/firmware/versions.json`)

| Version | Type | Notes |
|---------|------|-------|
| `2.1.1-prod` | Production | **Current** — I2S DMA fix, frequency SPL fix, 10kΩ SD pull-down |
| `2.1.2-dev` | Dev | Same fixes; points to local backend for OTA testing |
| `2.1.0-prod` | Production | Continuous sampling + peak detection |
| `1.2.0-prod` | Legacy | Production WiFi + server config |

### Critical I2S Fix (v2.1.1)

Prior firmware used `I2S_DATA_BIT_WIDTH_24BIT` in the DMA config, causing DMA mis-packing that produced a constant ~110 dB reading. The fix:

```c
// WRONG (caused constant ~110 dB):
.data_bit_width = I2S_DATA_BIT_WIDTH_24BIT,

// CORRECT (INMP441 uses 32-bit container for 24-bit data):
.data_bit_width = I2S_DATA_BIT_WIDTH_32BIT,
```

---

## Backend

**Source:** `backend/src/`  
**Runtime:** Node.js ≥18, Express.js  
**Storage:** JSON files in `backend/data/`

### Setup

```bash
cd backend
cp .env.example .env       # configure SHARED_API_KEY (and optionally PORT)
npm install
npm start                  # production
npm run dev                # development (nodemon)
```

**Environment variables (`.env`):**
```
PORT=3000
HOST=0.0.0.0
SHARED_API_KEY=<see CREDENTIALS.local>
```

### API Routes

All routes are prefixed `/api/`.

| Prefix | File | Description |
|--------|------|-------------|
| `/api/devices` | `routes/devices.js` | Register, list, update, delete devices; calibration; frequency-band config |
| `/api/data` | `routes/data.js` | Receive measurements; query recent/range; export CSV/JSON |
| `/api/config` | `routes/config.js` | Display thresholds; per-device config |
| `/api/alerts` | `routes/alerts.js` | Alert rules CRUD; alert history |
| `/api/analytics` | `routes/analytics.js` | Aggregated stats, trend data, heatmap data |
| `/api/positions` | `routes/positions.js` | Sensor XYZ positions for triangulation map |
| `/api/barriers` | `routes/barriers.js` | Acoustic barriers (walls, curtains, partitions) |
| `/api/sources` | `routes/sources.js` | Sound source location records |
| `/api/triangulation` | `routes/triangulation.js` | Locate/locate-multiple; playback endpoints |
| `/api/labels` | `routes/labels.js` | Map label annotations CRUD |
| `/api/firmware` | `routes/firmware.js` | OTA: `/check`, `/download/:version`, `/upload`, `/versions`, `/latest` |
| `/api/grafana` | `routes/grafana.js` | Grafana JSON datasource (`/search`, `/query`, `/annotations`) |
| `/api/version` | `routes/version.js` | Returns backend version |

**Key endpoints:**
```
GET  /health
GET  /api/devices
POST /api/devices/register              ← called by firmware on boot
POST /api/data                          ← called by firmware every 5 s
GET  /api/data/recent                   ← latest reading per device
GET  /api/data/measurements/:deviceId
GET  /api/firmware/check?device_id=&current_version=
GET  /api/firmware/download/:version
GET  /api/triangulation/locate
GET  /api/triangulation/playback/range
GET  /api/grafana/kiosk/data
```

**Data storage layout:**
```
backend/data/
├── devices/           ← one JSON file per device (MAC address filename)
├── measurements/      ← daily JSON files per device (gitignored)
├── config/
│   └── display-thresholds.json
├── alerts/
│   └── history/
├── firmware/
│   ├── versions.json
│   └── *.bin
├── map_labels.json
└── acoustic_barriers.json
```

---

## Frontend

**Source:** `frontend/`  
**Technology:** Vanilla JavaScript (ES6+), HTML5/CSS3, Chart.js 4.4.0  
**Served by:** Apache at `/sound/` (production) or directly from `frontend/` in development

### Pages

| File | Purpose |
|------|---------|
| `index.html` | Main dashboard (7 tabs) |
| `kiosk.html` | Public display — full-screen map + sensor status |
| `kiosk-debug.html` | Debug kiosk with API diagnostics |
| `debug.html` | API connectivity testing |

### Dashboard Tabs (`index.html`)

| Tab | Key Features |
|-----|-------------|
| **Dashboard** | Live device cards: dB level, frequency bands, color-coded status; auto-refresh 5 s |
| **Devices** | Register (MAC), edit, calibrate (dB offset), delete, export JSON |
| **Triangulation** | HTML5 Canvas map; sensor positions; acoustic barriers; map labels; real-time + playback |
| **History** | Time-series charts per device; second-precision datetime range picker |
| **Alerts** | Create/edit/delete alert rules; alert history viewer |
| **Analytics** | Statistical summaries, trend charts, customizable date ranges |
| **Settings** | Display thresholds, data retention, system configuration |

### Kiosk Mode (`kiosk.html`)

Auto-refreshing public display designed for permanent large-screen installation:
- Workshop layout canvas with sensor positions, acoustic barriers, and map labels
- Color-coded sensor indicators by dB level
- Active sensor count and system status summary

### Triangulation Playback

The Triangulation tab supports historical replay:
- Transport: play/pause, jog ±1 s, skip to start/end
- Variable speed: 0.25×, 0.5×, 1×, 2×, 5×, 10×
- Date/time range picker (day/hour/minute/second precision)
- Timeline slider with data availability indicator

### Color Thresholds (configurable via `/api/config/display-thresholds`)

| Range | Color | Default |
|-------|-------|---------|
| Quiet | Green | < 80 dB |
| Moderate | Yellow | 80–95 dB |
| Loud | Red | > 95 dB |

---

## Production Deployment (Nova Labs)

| Item | Value |
|------|-------|
| Server | `xibo.space.nova-labs.org` — Ubuntu 20.04.2 LTS |
| Proxy | Apache 2.4 reverse proxy |
| WiFi network | `REDACTED_WORKSHOP_WIFI_SSID` — isolated IoT VLAN |
| Backend URL | `http://xibo.space.nova-labs.org/api/sound` |
| Frontend URL | `http://xibo.space.nova-labs.org/sound/` |
| Active devices | 9 ESP32-C3 sensors |

### Apache Configuration (key lines)

```apache
# Proxy /api/sound/* → Node.js :3000/api/*
ProxyPass        /api/sound/ http://localhost:3000/api/
ProxyPassReverse /api/sound/ http://localhost:3000/api/

# Serve frontend static files
Alias /sound/ /path/to/frontend/
```

> ⚠️ The trailing slash on both `ProxyPass` paths is required. Without it, paths double to `/api/api/`.

### Operations

```bash
# SSH to server
ssh user@xibo.space.nova-labs.org

# Restart backend
cd ~/sound-monitoring-mesh/backend && npm start

# Deploy kiosk updates
./scripts/deploy-kiosk.sh
```

### Grafana Integration

The backend exposes a Grafana JSON datasource at `/api/grafana`.  
Dashboard definition: `scripts/grafana/grafana-dashboard.json`  
Install scripts: `scripts/grafana/install-grafana.sh` (dev) · `scripts/grafana/install-prod.sh` (production)

---

## Development Setup

```bash
# 1. Clone
git clone git@github.com:sklosky-nl/sound-monitoring-mesh.git
cd sound-monitoring-mesh

# 2. Backend
cd backend && cp .env.example .env   # fill in SHARED_API_KEY from CREDENTIALS.local
npm install && npm start             # http://localhost:3000

# 3. Access frontend
open http://localhost:3000           # main dashboard
open http://localhost:3000/kiosk.html

# 4. Flash a device
source ~/esp/esp-idf/export.sh
cd firmware/sound-level-sensor
cp sdkconfig.defaults sdkconfig
idf.py menuconfig                    # set WiFi + server + API key
idf.py build flash monitor -p /dev/cu.usbmodem*
```

**Versions:** Node.js ≥18 · ESP-IDF v6.x (tested with v6.1-dev-2300)

---

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/deploy-kiosk.sh` | Deploy frontend updates to production server |
| `scripts/grafana/install-grafana.sh` | Install Grafana on local/dev machine |
| `scripts/grafana/install-prod.sh` | Install Grafana on production server |
| `scripts/grafana/grafana-dashboard.json` | Grafana dashboard definition |

---

## Security & Credentials

**No credentials are stored in this repository.**

| Secret | Where used | How to set |
|--------|-----------|------------|
| WiFi SSID + password | Firmware `sdkconfig` | Copy from `CREDENTIALS.local` |
| Shared API key | Firmware `sdkconfig` + backend `.env` | Copy from `CREDENTIALS.local` |

The firmware and backend API key **must match exactly** for device authentication to work.

> ⚠️ **Git history note:** Commits prior to `f087388` (Feb 28, 2026) contain real credential values. Those credentials have been rotated. If you fork this repo, use `bfg --replace-text secrets.txt` to purge history before making it public.

---

## Repository Structure

```
sound-monitoring-mesh/
├── README.md                        ← this file
├── CHANGELOG.md                     ← version history
├── CREDENTIALS.local                ← gitignored; real secrets
├── backend/
│   ├── src/
│   │   ├── server.js
│   │   ├── routes/                  ← 13 route modules
│   │   ├── models/
│   │   ├── services/
│   │   └── utils/
│   └── data/                        ← gitignored runtime data
│       ├── devices/
│       ├── measurements/
│       ├── config/
│       ├── alerts/
│       ├── firmware/
│       │   ├── versions.json
│       │   └── *.bin
│       ├── map_labels.json
│       └── acoustic_barriers.json
├── frontend/
│   ├── index.html                   ← main dashboard (7 tabs)
│   ├── kiosk.html                   ← public display
│   ├── css/
│   └── js/
├── firmware/
│   ├── sound-level-sensor/          ← production firmware
│   │   ├── main/main.c
│   │   ├── sdkconfig.defaults       ← placeholder values only (never real credentials)
│   │   └── partitions.csv           ← dual OTA partitions
│   └── sound-level-sensor-debug/    ← debug build (serial only, no WiFi)
├── enclosure/
│   ├── Sound Sensor enclosure.f3d   ← Fusion 360 (archived; foam windscreens used instead)
│   └── WIFI_SIGNAL_SOLUTIONS.md
├── scripts/
│   ├── deploy-kiosk.sh
│   └── grafana/
│       ├── install-grafana.sh
│       ├── install-prod.sh
│       └── grafana-dashboard.json
└── docs-archive/                    ← superseded reference documents
```

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for full version history.

### Recent: v2.1.1-prod / v2.1.2-dev — Feb 28, 2026
- Fix I2S DMA mis-packing (`I2S_DATA_BIT_WIDTH_24BIT` → `32BIT`) — was causing constant ~110 dB
- Fix frequency band SPL calculation (self-normalizing energy fraction)
- Confirm and document 10 kΩ pull-down on SD line (GPIO 4)

### v2.1.0-prod — Feb 12, 2026
- Continuous sampling with peak detection (was previously sampling only 6.4% of audio)
- Reports both RMS average and peak dB per reporting window

### v2.0.0 — Feb 12, 2026
- Historical data playback for triangulation (timeline scrubber, variable speed)
- Backend playback API: `/api/triangulation/playback/*`

### v1.2.0 — Feb 11, 2026
- Kiosk display page; production deployment to Nova Labs (9 devices)
- Apache ProxyPass configuration

---

**Author:** Stephen Klosky — [stephen.klosky@nova-labs.org](mailto:stephen.klosky@nova-labs.org)  
**Last updated:** February 28, 2026
