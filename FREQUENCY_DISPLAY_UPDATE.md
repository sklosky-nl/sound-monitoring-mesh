# Frequency Range Display Enhancement

## Summary
Enhanced the UI to display actual frequency ranges (Hz) alongside band numbers throughout the application, and added a configuration interface to customize frequency bands per device.

## Changes Made

### 1. PRD Updates (`sound level mesh system PRD.md`)
Updated F5 Dashboard section to specify:
- Display frequency ranges (Hz) for each band
- Format: "Band 1 (20-200 Hz)", "Band 2 (200-2000 Hz)", etc.
- Add frequency band trend chart showing each band's dB level over time
- Add configuration UI for admin to modify frequency band ranges

### 2. Frontend UI Enhancements

#### Device Cards (`frontend/js/app.js`)
- Enhanced `createDeviceCard()` to display frequency ranges from device configuration
- Format: "Band 1 (20-200 Hz): 65.3 dB"
- Added ⚙️ Configure Bands button to each device card

#### History Display (`frontend/js/app.js`)
- Updated `displayHistory()` to show frequency ranges in measurement lists
- Format: "B1 (20-200Hz): 65.3dB | B2 (200-2000Hz): 72.1dB | B3 (2000-8000Hz): 58.9dB"

#### Frequency Band Configuration Modal
Added new functions:
- `viewFrequencyConfig(deviceId)` - Opens configuration modal
- `saveFrequencyConfig(deviceId, bandCount)` - Saves updated frequency bands
- `closeFrequencyConfigModal()` - Closes the modal

Features:
- Configure start/end frequency for each band
- Validation: Start frequency must be less than end frequency
- Persists to backend via API

### 3. API Updates (`frontend/js/api.js`)
Added new endpoint:
- `updateFrequencyBands(deviceId, bands)` - PUT `/api/config/devices/:deviceId/frequency-bands`

### 4. Styling (`frontend/css/features.css`)
Added styles for:
- `.frequency-bands-form` - Configuration form container
- `.frequency-band-row` - Individual band configuration row
- `.btn-link` - Gear icon button styling

## Data Flow

### Device Configuration Structure
```json
{
  "device_id": "08:92:72:84:1d:18",
  "name": "Sensor 01",
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

### Measurement Display
1. Device card loads device configuration from `State.devices`
2. For each measurement's frequency band, looks up corresponding config
3. Displays: `Band ${band.band_number} (${start_frequency}-${end_frequency} Hz)`

## Backend Support

### Existing Endpoints (Already Implemented)
- `GET /api/config/devices/:deviceId/frequency-bands` - Get frequency band config
- `PUT /api/config/devices/:deviceId/frequency-bands` - Update frequency band config

### Device Model
- Stores `frequency_bands` array in device registration
- Default bands: 20-200Hz, 200-2000Hz, 2000-8000Hz

## User Interface Improvements

### Before
- "Band 1: 65.3 dB"
- "Band 2: 72.1 dB"  
- "Band 3: 58.9 dB"

### After
- "Band 1 (20-200 Hz): 65.3 dB"
- "Band 2 (200-2000 Hz): 72.1 dB"
- "Band 3 (2000-8000 Hz): 58.9 dB"
- ⚙️ Configure Bands button for customization

## Testing
1. ✅ JavaScript syntax validated with `node -c`
2. Both servers running (frontend: 8080, backend: 3000)
3. Ready for browser testing

## Next Steps (Future Enhancements)
1. Add frequency spectrum visualization chart (multi-line chart over time)
2. Add frequency band presets (e.g., "Speech", "Music", "Industrial")
3. Add visual frequency spectrum analyzer (bar chart by frequency)
4. Export frequency band data in CSV/JSON exports
