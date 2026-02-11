# Firmware OTA Update System

This directory contains firmware binaries for Over-The-Air (OTA) updates to ESP32-C3 sound sensor devices.

## Directory Structure

```
firmware/
├── versions.json           # Firmware version metadata
├── sound-sensor-1.0.0.bin  # Firmware binary files
├── sound-sensor-1.0.1.bin
└── README.md              # This file
```

## How OTA Updates Work

1. **Firmware Check**: Devices periodically check for updates via `GET /api/firmware/check`
2. **Version Comparison**: Backend compares device version with latest available
3. **Download**: If update available, device downloads binary via `GET /api/firmware/download/:version`
4. **Installation**: Device writes firmware to alternate partition and reboots
5. **Verification**: On boot, device verifies new firmware and marks it valid
6. **Rollback**: If new firmware fails, device automatically reverts to previous version

## Uploading New Firmware

### Method 1: Using curl

```bash
# Build firmware first
cd firmware/sound-level-sensor
idf.py build

# Upload to backend
curl -X POST "http://localhost:3000/api/firmware/upload?version=1.0.1&description=Bug%20fixes" \
     -H "Content-Type: application/octet-stream" \
     --data-binary "@build/sound-level-sensor.bin"
```

### Method 2: Manual File Copy

```bash
# Copy binary file
cp firmware/sound-level-sensor/build/sound-level-sensor.bin \
   backend/data/firmware/sound-sensor-1.0.1.bin

# Update versions.json
# Add new version entry manually
```

## API Endpoints

### Check for Updates
```http
GET /api/firmware/check?device_id=08:92:72:84:1d:18&current_version=1.0.0
```

Response (update available):
```json
{
  "updateAvailable": true,
  "version": "1.0.1",
  "url": "/api/firmware/download/1.0.1",
  "filename": "sound-sensor-1.0.1.bin",
  "size": 823456,
  "releaseDate": "2026-02-10T12:00:00.000Z",
  "description": "Bug fixes and performance improvements"
}
```

Response (no update): `204 No Content`

### Download Firmware
```http
GET /api/firmware/download/1.0.1
```

Returns binary file with headers:
- `Content-Type: application/octet-stream`
- `X-Firmware-Version: 1.0.1`
- `X-Firmware-SHA256: <hash>`

### List All Versions
```http
GET /api/firmware/versions
```

### Get Latest Version
```http
GET /api/firmware/latest
```

### Upload Firmware
```http
POST /api/firmware/upload?version=1.0.1&description=Release%20notes
Content-Type: application/octet-stream
Body: <binary data>
```

### Delete Version
```http
DELETE /api/firmware/1.0.0
```

## Firmware Update Schedule

- Devices check for updates every **60 minutes**
- First check occurs **5 minutes** after boot (allows system to stabilize)
- Updates only occur when WiFi is connected
- Devices automatically reboot after successful update

## Version Naming Convention

Use semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR**: Incompatible API changes or major new features
- **MINOR**: Backward-compatible functionality additions
- **PATCH**: Backward-compatible bug fixes

## Safety Features

1. **Dual Partition**: Firmware stored in two partitions (ota_0 and ota_1)
2. **Automatic Rollback**: If new firmware fails to boot, device reverts to previous version
3. **Verification**: Devices validate firmware before marking as successful
4. **SHA-256 Checksums**: Ensures firmware integrity during download
5. **Timeout Protection**: HTTP downloads timeout after 30 seconds

## Staged Rollout

For production deployments with multiple devices:

1. Upload new firmware to backend
2. Monitor first device to receive update
3. Verify device stability for 24 hours
4. Allow remaining devices to update naturally
5. Or trigger immediate updates via device reboot (forces check)

## Troubleshooting

### Device Not Updating

1. Check device logs for OTA task status
2. Verify WiFi connectivity
3. Check backend firmware versions: `GET /api/firmware/versions`
4. Verify version comparison logic

### Update Failed

1. Check device logs for error messages
2. Verify firmware binary is valid ESP32-C3 image
3. Check firmware size (must fit in partition)
4. Device will automatically rollback to previous version

### Manual Rollback

If needed, flash device manually via USB:
```bash
cd firmware/sound-level-sensor
idf.py flash
```

## Security Considerations

- **HTTP vs HTTPS**: Currently using HTTP for simplicity
- **Authentication**: Uses API key authentication
- **Network**: Deploy on trusted network only
- **Future**: Consider HTTPS for production environments

## Monitoring

Device logs show OTA status:
```
I (12345) SOUND_SENSOR: Checking for firmware updates...
I (12346) SOUND_SENSOR: Current firmware version: 1.0.0
I (12500) SOUND_SENSOR: Update available: 1.0.1
I (12501) SOUND_SENSOR: Starting OTA update...
I (45000) SOUND_SENSOR: OTA update successful! Rebooting...
```

Backend logs show update activity:
```
Firmware update check from 08:92:72:84:1d:18: v1.0.0
Update available for 08:92:72:84:1d:18: v1.0.1
Serving firmware v1.0.1 (823456 bytes)
```
