# Device Registration Guide - Shared API Key System

## ✅ System Configuration

This system uses a **shared API key** approach where all devices use the same API key compiled into the firmware. Each device is uniquely identified by its MAC address.

**Key Points:**
- ✅ One firmware build flashed to all devices
- ✅ Each device auto-identifies with unique MAC address
- ✅ All devices use the same API key for authentication
- ✅ Suitable for trusted, internal networks

## How Device Registration Works

### 1. Automatic Device ID (Firmware)
Each ESP32 automatically uses its MAC address as the device ID:
- Example: `08:92:72:84:1d:18`
- No manual configuration needed
- Unique for each device
- Read from factory-burned MAC address

### 2. Shared API Key Configuration
- **Firmware**: Set once via `CONFIG_API_KEY` in `sdkconfig` (e.g., `YOUR_API_KEY_HERE`)
- **Backend**: Set via `SHARED_API_KEY` or `API_KEY` in `.env` file
- **Must match exactly** for devices to authenticate
- Same key used for all 10 devices

### 2. Backend Registration
When a device first connects, it can self-register OR you can pre-register it:

#### Option A: Manual Pre-Registration (Recommended)
Use the frontend web interface at `http://localhost:3000`:
1. Click "Register Device" button
2. Fill in the form:
   - **Device ID**: The MAC address (e.g., `08:92:72:84:1d:18`)
   - **MAC Address**: Same as device ID
   - **Name**: Friendly name (e.g., "Front Door Sensor")
   - **Location**: Physical location (e.g., "Building A - Entrance")
3. Click "Register"
4. Backend automatically assigns the shared API key (matches firmware CONFIG_API_KEY)
5. Device starts sending data within 5-10 seconds

#### Option B: Auto-Registration via API
The ESP32 can auto-register on first boot by calling:
```bash
POST /api/devices/register
{
  "device_id": "08:92:72:84:1d:18",
  "mac_address": "08:92:72:84:1d:18",
  "name": "Sensor 1",
  "location": "Unknown"
}
```

**Note**: With shared API key, all devices receive the same `api_key` value during registration (from backend environment variable).

### 3. Device Configuration
After registration, the device will:
- Automatically fetch frequency band configuration
- Apply calibration settings
- Start sending measurements

## Verifying Registration

### Check Serial Output
When monitoring the ESP32, you should see:
```
I (xxx) SOUND_SENSOR: Device ID: 08:92:72:84:1d:18
I (xxx) SOUND_SENSOR: WiFi connected
I (xxx) SOUND_SENSOR: Fetching configuration...
I (xxx) SOUND_SENSOR: Config received, starting measurements
```

### Check Backend
View registered devices:
```bash
# List all devices
curl http://localhost:3000/api/devices

# Check specific device
curl http://localhost:3000/api/devices/08:92:72:84:1d:18
```

### Check Frontend
1. Open `http://localhost:3000` in browser
2. Navigate to "Devices" tab
3. You should see all registered devices with their MAC addresses

## Device ID Format

✅ **Supported format**: `08:92:72:84:1d:18` (colon-separated hex)

The backend and frontend both handle colons in device IDs correctly:
- URLs are properly encoded
- File names use the MAC address format
- All API endpoints work with this format

## Setting Up 10 Devices

### Quick Workflow
1. **Flash all ESP32s** with the same firmware (see [FLASHING_MULTIPLE_DEVICES.md](FLASHING_MULTIPLE_DEVICES.md))
2. **Power up one device** at a time
3. **Monitor serial output** to get its MAC address
4. **Register in frontend** with meaningful name and location
5. **Repeat** for all 10 devices

### Example Device List
| Device ID | Name | Location |
|-----------|------|----------|
| 08:92:72:84:1d:18 | Sensor 01 | Front Entrance |
| 08:92:72:84:2a:3c | Sensor 02 | Conference Room A |
| 08:92:72:84:1f:92 | Sensor 03 | Manufacturing Floor |
| ... | ... | ... |

## Troubleshooting

### Device Not Registering
1. Check WiFi credentials are correct in firmware `sdkconfig`
2. Verify backend server URL in firmware matches your backend
3. Check backend server is running: `cd backend && npm start`
4. Monitor serial output for error messages

### Device ID Not Showing
1. The MAC address is read at startup - check serial monitor output
2. Format should be lowercase with colons: `08:92:72:84:1d:18`
3. Each ESP32 has a unique MAC address - no duplicates possible

### API Key Mismatch Issues
**Symptoms**: Device connects but measurements are rejected (403 errors)

**Solution**:
1. Check firmware API key:
   ```bash
   cd firmware/sound-level-sensor
   grep CONFIG_API_KEY sdkconfig
   ```
2. Check backend API key:
   ```bash
   cd backend
   grep SHARED_API_KEY .env
   # or
   grep API_KEY .env
   ```
3. **Verify they match exactly** (including case and special characters)
4. If they don't match:
   - Update backend `.env` file to match firmware, OR
   - Rebuild and reflash firmware with correct key
5. Restart backend server after .env changes
6. Check backend logs for authentication errors:
   ```bash
   tail -f backend/data/logs/server.log
   ```

### Devices Show Zero Data
**This was the original issue** - all devices except the first were showing zeros because they had different API keys than the firmware. Now with shared key approach:
- All devices use same API key from firmware
- All devices registered with same key in backend
- All devices should send data successfully

## Next Steps

1. ✅ Data cleared
2. ✅ Firmware updated for MAC address IDs
3. ⏳ Flash all 10 ESP32 devices
4. ⏳ Register each device in the system
5. ⏳ Verify measurements are being received

See [FLASHING_MULTIPLE_DEVICES.md](FLASHING_MULTIPLE_DEVICES.md) for flashing instructions.
