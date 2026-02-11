# Sound Sensor Enclosure

This directory contains enclosure design files and documentation for the sound sensor hardware.

## ✅ Current Solution: Microphone Foam Windscreen Enclosure

**The final working solution uses microphone foam windscreens as the complete enclosure.**

### Implementation

**Materials:**
- Microphone foam windscreen (medium size, 15-30mm diameter)
- Zip tie or twist tie
- USB-C cable for power

**Assembly:**
1. Insert assembled ESP32-C3 + INMP441 sensor into foam windscreen
2. Route USB-C cable through foam
3. Secure foam around cable with zip tie
4. Ensure microphone opening has clear path through foam

**Why This Works:**
- ✅ **RF Transparent**: Foam has <0.5 dB WiFi signal loss
- ✅ **Acoustically Transparent**: Designed for microphone use, minimal SPL impact
- ✅ **Dust Protection**: Open-cell foam filters particles while allowing airflow
- ✅ **Cost Effective**: ~$1-2 per device
- ✅ **Washable**: Can clean foam when dirty
- ✅ **Quick Assembly**: No 3D printing required
- ✅ **Lightweight**: Easy to mount anywhere

**Recommended Products:**
- [Amazon microphone windscreens](https://a.co/d/01RMTvTz) - Medium size (15-25mm)
- Alternative: Air filter foam from hardware stores

**Maintenance:**
- Inspect foam monthly in dusty environments
- Wash with mild soap and water when dirty
- Dry completely (24 hours) before reinstalling
- Replace every 6-12 months or when degraded

---

## ❌ Previous Attempts (Did Not Work)

### 3D Printed PETG Enclosures

- **Sound Sensor enclosure.f3d** - Fusion 360 source file (archived)
- **Sound Sensor enclosure.stl** - STL file for 3D printing (archived)

**Issues Discovered:**
- ❌ **WiFi Signal Blocking**: PETG plastic attenuates 2.4 GHz WiFi by 6-16 dB
- ❌ **Connection Failures**: Devices could not maintain WiFi connection when fully enclosed
- ❌ **Fit Problems**: Lid required heat gun adjustment to close properly
- ❌ **Complexity**: 3D printing and post-processing time not justified

**Lessons Learned:**
- Solid plastic enclosures create Faraday cage effect for 2.4 GHz WiFi
- RF transparency is critical for wireless IoT devices
- Simple foam solutions outperform complex rigid enclosures for this application

**→ See [WIFI_SIGNAL_SOLUTIONS.md](WIFI_SIGNAL_SOLUTIONS.md) for detailed analysis of WiFi blocking issues and alternative solutions tested.**

---

## Design Files (Reference Only)

The 3D printed enclosure files are retained for reference but are **not recommended** for production use due to WiFi blocking issues.

---

## Usage Instructions (Foam Windscreen Solution)

### Assembly Steps

**Step 1: Component Preparation**
- Fully assemble ESP32-C3 with INMP441 microphone (see [HARDWARE_AND_FIRMWARE.md](../HARDWARE_AND_FIRMWARE.md))
- Connect USB-C cable for power
- Test device functionality before enclosing

**Step 2: Foam Installation**
1. Select foam windscreen slightly larger than device (20-30mm diameter typical)
2. Gently insert device into foam, microphone end first
3. Position INMP441 near an opening in the foam for clear sound path
4. Route USB cable through opposite end of foam

**Step 3: Securing**
1. Gather foam around USB cable at exit point
2. Secure with zip tie or twist tie (not too tight - allow some airflow)
3. Trim excess zip tie

**Step 4: Testing**
1. Power on device
2. Verify WiFi connection in backend dashboard (http://localhost:3000)
3. Check sound level readings are within expected range
4. If readings seem low, adjust foam position around microphone

**Step 5: Deployment**
- Mount device in desired location
- Ensure foam doesn't compress against surfaces
- Orient microphone opening away from direct weather exposure if outdoor
- Label device with MAC address for easy identification

### Mounting Options

- **Zip tie to post/beam**: Create loops through foam
- **Velcro strips**: Works well on flat surfaces  
- **Hanging with string**: Thread through foam
- **Shelf placement**: Simply set on flat surface

### Troubleshooting

**Issue: WiFi disconnections**
- Ensure foam is dry (wet foam increases RF attenuation)
- Check device is not in metal enclosure or near metal surfaces
- Verify router signal strength in deployment location

**Issue: Inaccurate sound readings**
- Check microphone opening is not blocked by compressed foam
- Verify foam is not touching INMP441 membrane directly
- Calibrate using `calibration_offset_db` parameter if needed

**Issue: Dust accumulation**
- Remove and wash foam with mild soap and water
- Dry completely for 24 hours before reinstalling
- Replace foam if heavily soiled or degraded
