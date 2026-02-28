# Sound Level Mesh System - Frontend

Web-based dashboard for monitoring and managing sound level sensors.

**Status:** ✅ Operational - Served automatically by backend on port 3000

## Features

- **Dashboard:** Real-time device monitoring with live statistics (auto-refresh every 30 seconds)
- **Devices:** Device registration, management, and configuration
- **Triangulation:** Sound source localization with visual 2D map
- **History:** Time-series data viewer with second-precision datetime controls
- **Alerts:** Alert rule configuration and history viewer
- **Analytics:** Statistical analysis and trend visualization
- **Settings:** System configuration and data management
- **Kiosk Mode:** Public display dashboard (separate page)
- Responsive design (desktop and tablet)

## Running the Frontend

### Recommended: Backend Serves Frontend (Default)

**The backend automatically serves the frontend - no separate server needed!**

```bash
cd backend
npm install
npm start
```

Then open http://localhost:3000 in your browser.

**Access URLs:**
- Main Dashboard: http://localhost:3000
- Kiosk Display: http://localhost:3000/kiosk.html  
- API Endpoints: http://localhost:3000/api/*
- Health Check: http://localhost:3000/health

**Current Setup:**
- Running on MacBook
- Backend + Frontend on single port (3000)
- API and static files served together
- All devices connecting and sending data

### Alternative: Standalone Development Server (Optional)

For frontend-only development without backend:

```bash
cd frontend
python3 -m http.server 8080
```

Then open http://localhost:8080 in your browser.

**Note:** You'll need to configure the backend API URL in Settings tab.

### Option 2: Node.js http-server

```bash
# Install globally
npm install -g http-server

# Run
cd frontend
http-server -p 8080
```

### Option 3: VS Code Live Server Extension

1. Install "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

### Troubleshooting

**Port Already in Use:**
```bash
# Kill existing process on port 8080
lsof -ti :8080 | xargs kill -9 2>/dev/null
```

**CORS Issues:**
- The backend has CORS enabled for all origins (development mode)
- Make sure backend is running and accessible
- Check browser console for specific CORS errors

## Configuration

**Default Configuration (when served by backend):**
- API URL is automatically set to the same origin (http://localhost:3000)
- No configuration needed for normal use

**Production Configuration (Nova Labs):**
- Set the Backend API URL to http://xibo.space.nova-labs.org/api/sound

**Manual Configuration (if needed):**
1. Open the frontend in your browser
2. Go to the "Settings" tab
3. Set the Backend API URL (e.g., `http://localhost:3000` or `http://xibo.space.nova-labs.org/api/sound`)
4. Click "Save Configuration"

The setting is saved to browser localStorage and persists across sessions.

## Usage

### Dashboard Tab
- View all 9 registered devices
- See real-time sound levels and frequency bands
- Monitor device status (active within last minute)
- View average sound level across all devices
- Auto-refreshes every 30 seconds

### Devices Tab
- View detailed device information
- Edit device names (nickname) and locations
- Configure frequency bands
- Update calibration offsets
- Delete devices

### Triangulation Tab
- Visual 2D map of sensor positions
- Click-to-place sensor locations
- Real-time sound source localization
- Acoustic barrier modeling  

### History Tab  
- Select device from dropdown
- Choose date/time range with **second precision**
- View time-series chart of measurements
- Export data to CSV

### Alerts Tab
- Create threshold-based alert rules
- Configure alert conditions and durations
- View alert history
- Manage alert notifications

### Analytics Tab
- Statistical analysis (avg, min, max, std dev)
- Trend visualization
- Device comparison
- Custom date range selection

## API Integration

The frontend communicates with the backend API at the configured URL.

Default: `http://localhost:3000`

All API calls are made from `js/api.js`. The base URL is configurable through the Settings tab.

## Browser Support

- Chrome/Edge (recommended)
- Firefox
- Safari
- Modern mobile browsers

## Development

### File Structure

```
frontend/
├── index.html          # Main HTML file
├── css/
│   └── styles.css      # Application styles
└── js/
    ├── api.js          # API client
    └── app.js          # Main application logic
```

### Customization

- **Colors**: Edit CSS custom properties in `styles.css` `:root` section
- **Refresh interval**: Change value in `startAutoRefresh()` in `app.js`
- **Default ports**: Update in `api.js` and Settings tab

## Screenshots

(Screenshots would go here in a real README)

## License

TBD
