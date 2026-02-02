# Sound Level Mesh System - Frontend

Web-based dashboard for monitoring and managing sound level sensors.

## Features

- Real-time dashboard with live device status
- Device registration and management
- Measurement history visualization
- Device configuration
- Responsive design (mobile and desktop)

## Running the Frontend

### Recommended: Simple Python HTTP Server

```bash
cd frontend
python3 -m http.server 8080
```

Then open http://localhost:8080 in your browser.

**Current Development Setup:**
- Running on MacBook at http://localhost:8080
- Backend API at http://192.168.68.57:3000
- Tested and working with Chrome/Safari

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

1. Open the frontend in your browser
2. Go to the "Settings" tab
3. Set the Backend API URL (e.g., `http://localhost:3000`)
4. Click "Save Configuration"

The setting is saved to browser localStorage and persists across sessions.

## Usage

### Dashboard Tab
- View all registered devices
- See real-time sound levels
- Monitor frequency band measurements
- Auto-refreshes every 30 seconds

### Devices Tab
- Register new ESP32 devices
- View device details
- Get API keys for device configuration
- **Important:** Save the API key when registering - you'll need it for ESP32!

### History Tab
- Select a device
- Choose date range
- View historical measurements

### Settings Tab
- Configure backend API URL
- Run manual data cleanup
- View system information

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
