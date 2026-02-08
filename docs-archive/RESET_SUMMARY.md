# System Reset & New Device Setup - Summary

## 🎯 Quick Start

Your system is now ready! Here's what to do:

1. **Rebuild firmware**: `cd firmware/sound-level-sensor && idf.py build`
2. **Flash device**: `idf.py -p /dev/cu.usbmodem1201 flash monitor`
3. **Note MAC address** from serial output (e.g., `08:92:72:84:1d:18`)
4. **Register in frontend**: Open http://localhost:3000 → Devices → Register
5. **Repeat** for all 10 devices (same firmware binary!)

---

## ✅ Changes Completed

### 1. Data Cleanup
- ✅ Removed all existing device files from `backend/data/devices/`
- ✅ Removed all measurement files from `backend/data/measurements/`
- ✅ Cleared alert history
- System is now in a clean state ready for new device registrations

### 2. Firmware Updates
Modified `firmware/sound-level-sensor/main/main.c`:

- ✅ Removed hardcoded `DEVICE_ID "Sensor 01"`
- ✅ Added dynamic `device_id[32]` variable
- ✅ Device ID now auto-generated from ESP32 MAC address at startup
- ✅ Format: `08:92:72:84:1d:18` (lowercase, colon-separated)
- ✅ URL encoding updated to properly encode colons (`%3A`) in API requests

### 3. Backend Compatibility
Verified backend can handle MAC address format device IDs:

- ✅ Express routes properly decode URL-encoded device IDs
- ✅ File storage uses MAC address format (e.g., `08:92:72:84:1d:18.json`)
- ✅ All API endpoints tested and working:
  - `GET /api/config/devices/08%3A92%3A72%3A84%3A1d%3A18/frequency-bands`
  - `POST /api/data/measurements` (with MAC address as device_id)
  - `GET /api/devices/08:92:72:84:1d:18`

### 4. Frontend Compatibility
- ✅ Frontend dynamically loads device IDs from backend
- ✅ All device displays, selects, and tables will show MAC addresses
- ✅ Device registration form ready to accept MAC address format
- ✅ No changes needed - already supports any device ID format

## What This Means for Your 10 Devices

### ✨ Single Build, Multiple Flash
You can now:
1. Build firmware **once**
2. Flash **all 10 ESP32 devices** with same binary
3. Each device **automatically** uses its unique MAC address
4. No per-device configuration needed

### 📝 Device Registration Process
Each device can be registered via:

**Option 1: Frontend Web UI** (Recommended)
- Navigate to "Devices" tab → "Register Device"
- Enter MAC address as Device ID
- Add friendly name and location
- Get API key

**Option 2: Device Auto-Registration**
- Device attempts to register on first connection
- Provide basic info, backend assigns API key
- Device stores key for future use

## Files to Review

1. **[FLASHING_MULTIPLE_DEVICES.md](FLASHING_MULTIPLE_DEVICES.md)**
   - How to build and flash all 10 devices
   - Quick flash script
   - Device identification tips

2. **[DEVICE_REGISTRATION_GUIDE.md](DEVICE_REGISTRATION_GUIDE.md)**
   - Step-by-step registration process
   - Troubleshooting guide
   - API examples

## Next Steps

### 1. Rebuild Firmware
```bash
cd firmware/sound-level-sensor
. $HOME/esp/esp-idf/export.sh
idf.py build
```

### 2. Flash First Device
```bash
idf.py -p /dev/cu.usbmodem1201 flash monitor
```

### 3. Verify MAC Address
Watch serial output for:
```
I (xxx) SOUND_SENSOR: Device ID: 08:92:72:84:1d:18
```

### 4. Register in Frontend
- Open http://localhost:3000
- Register device with MAC address
- Save API key (or use global key from .env)

### 5. Repeat for All 10 Devices
Each flash takes ~30 seconds, registration takes ~1 minute

**Total time estimate: ~15 minutes for all 10 devices**

## Troubleshooting

### Issue: Device ID not showing in serial output
**Solution:** Check that firmware was rebuilt after changes

### Issue: Backend not accepting device
**Solution:** Verify backend is running (`cd backend && npm start`)

### Issue: URL encoding errors
**Solution:** Firmware now properly encodes colons as `%3A`

### Issue: Can't find device in frontend
**Solution:** Check "Devices" tab - may need to refresh page

## Testing Checklist

Before deploying all 10 devices:

- [ ] Rebuild firmware with new MAC address code
- [ ] Flash one test device
- [ ] Verify MAC address appears in serial output
- [ ] Register device in frontend
- [ ] Confirm device receives configuration
- [ ] Verify measurements are being stored
- [ ] Check device appears in dashboard

Once one device works, repeat for remaining 9 devices!

## Rollback (if needed)

If you need to revert to hardcoded device IDs:
1. Restore backup of `main/main.c`
2. Or manually change back to:
   ```c
   #define DEVICE_ID "Sensor 01"
   ```
3. Rebuild and reflash

However, the MAC address approach is **recommended** for managing multiple devices.
