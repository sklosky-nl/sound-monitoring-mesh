# Kiosk Display - Public Sound Monitoring Display

## Overview

The kiosk display is a full-screen, auto-refreshing webpage designed for public viewing on 1080p monitors (1920x1080 pixels). It provides a real-time view of the sound monitoring system without requiring any user interaction.

## Features

- **Large Workshop Map**: Visual representation of sensor locations and sound sources
- **Real-time Sensor Readings**: Live dB levels and status for all sensors
- **Sound Source Visualization**: Triangulated sound sources shown on map
- **Color-coded Status**: Green (< 80 dB), Yellow (80-95 dB), Red (> 95 dB)
- **Auto-refresh**: Updates every 10 seconds automatically
- **Recent Events**: List of recent sound source detections
- **No User Interaction Required**: Perfect for unattended displays

## Access

The kiosk display can be accessed at:

```
http://localhost:8080/kiosk.html
```

Or from the main dashboard, click the "📺 Kiosk Display" link in the top-right corner.

## Setup for Kiosk Mode

### Option 1: Chrome/Chromium Kiosk Mode

Launch Chrome in kiosk mode:

```bash
# Linux
chromium-browser --kiosk --noerrdialogs --disable-infobars --incognito http://localhost:8080/kiosk.html

# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --kiosk --noerrdialogs --disable-infobars --incognito http://localhost:8080/kiosk.html

# Windows
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --noerrdialogs --disable-infobars --incognito http://localhost:8080/kiosk.html
```

### Option 2: Raspberry Pi Auto-Start

1. Install Chromium:
```bash
sudo apt-get update
sudo apt-get install chromium-browser unclutter
```

2. Create autostart script at `~/.config/lxsession/LXDE-pi/autostart`:
```bash
@xset s off
@xset -dpms
@xset s noblank
@chromium-browser --noerrdialogs --disable-infobars --kiosk http://localhost:8080/kiosk.html
@unclutter -idle 0
```

3. Disable screen saver:
```bash
sudo apt-get install xscreensaver
# Configure via GUI to disable
```

### Option 3: Digital Signage Software

The kiosk display is compatible with digital signage platforms like:
- **Xibo**: Add as a web page widget
- **Screenly**: Set as display URL
- **BrightSign**: Configure as HTML page
- **PiSignage**: Add as custom URL

## Hardware Requirements

### Minimum Configuration
- **Display**: 1920x1080 (1080p) monitor, 32"+ recommended
- **Computer**: Raspberry Pi 4 (4GB RAM) or equivalent
- **Network**: Ethernet connection (WiFi acceptable with strong signal)
- **Power**: Continuous power supply

### Recommended Configuration
- **Display**: 43-55" commercial-grade LED monitor (500+ nits brightness)
- **Computer**: Intel NUC or mini PC (i3/8GB RAM)
- **Network**: Wired Ethernet connection
- **Mounting**: VESA wall mount
- **Backup Power**: UPS for uninterrupted operation

## Configuration

### Update Rate

The display refreshes every 10 seconds by default. To change this, edit `frontend/js/kiosk.js`:

```javascript
const KIOSK_CONFIG = {
    refreshInterval: 10000, // Change to desired milliseconds
    // ...
};
```

### API Endpoint

If your backend is on a different server, update the API URL in `frontend/js/kiosk.js`:

```javascript
const KIOSK_CONFIG = {
    apiBaseUrl: 'http://your-server-ip:3000/api',
    // ...
};
```

### Map Scaling

To adjust the map dimensions for your workshop, edit the scaling functions in `frontend/js/kiosk.js`:

```javascript
function scaleX(x) {
    // Adjust workshop width (default: 100 meters)
    return (x / 100) * KIOSK_CONFIG.mapWidth;
}

function scaleY(y) {
    // Adjust workshop height (default: 75 meters)
    return (y / 75) * KIOSK_CONFIG.mapHeight;
}
```

## Display Features

### System Status Panel
- Shows active vs total sensors
- Overall system status (Normal/Elevated/Critical)

### Sensor List
- All sensors with current readings
- Color-coded by sound level
- Last update timestamp
- Online/offline status

### Workshop Map
- Large-scale map occupying 70% of screen
- Sensor positions marked with color-coded circles
- Sound sources shown with purple markers
- Grid overlay for spatial reference
- Confidence circles around sound sources

### Recent Events
- Last 10 sound source detections
- Position coordinates
- dB level and confidence
- Time since detection

### Legend
- Color-coding explanation
- Icon meanings

## Troubleshooting

### Display Not Updating
1. Check network connectivity
2. Verify backend server is running at `http://localhost:3000`
3. Check browser console for errors (F12)
4. Verify API endpoints are accessible

### Map Not Showing Sensors
1. Ensure sensors have positions configured
2. Check that positions are in correct format (X, Y coordinates)
3. Verify backend API returns sensor positions at `/api/triangulation/sensors`

### Connection Status Shows "Disconnected"
1. Check that backend server is running
2. Verify CORS is enabled on backend
3. Check network firewall settings
4. Ensure API URLs match your server configuration

### Browser Exits Full-Screen
1. Disable browser keyboard shortcuts
2. Use proper kiosk mode flags
3. Consider using dedicated kiosk software
4. Prevent accidental input (disable keyboard/mouse if possible)

## Maintenance

### Daily
- Verify display is operational
- Check data is updating

### Weekly
- Review any error messages
- Restart system if performance degrades

### Monthly
- Update browser/OS security patches
- Clean display screen
- Verify all sensors still online

### Quarterly
- Test recovery from power failure
- Update kiosk software if needed
- Verify all features working correctly

## Security Considerations

The kiosk display is designed for **public viewing** and:
- Does not require authentication
- Shows real-time but non-sensitive data
- Cannot modify system settings
- Prevents common navigation shortcuts

For restricted access, consider:
- Network-level restrictions
- VPN access only
- Adding authentication layer at backend
- Physical security of display hardware

## Browser Compatibility

Tested and compatible with:
- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Best performance with Chrome/Chromium due to optimization and kiosk mode support.

## Support

For issues or questions:
1. Check browser console for JavaScript errors
2. Verify backend API is responding
3. Review network connectivity
4. Check this documentation for configuration options

## Version History

- **v1.4** (February 2026): Initial kiosk display implementation
  - 1080p optimized layout
  - Auto-refresh functionality
  - Real-time sensor and sound source visualization
  - Integrated with triangulation system
