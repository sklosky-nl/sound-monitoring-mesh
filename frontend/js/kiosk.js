// Kiosk Display JavaScript
// Auto-refreshing display for 1080p monitors

const KIOSK_CONFIG = {
    refreshInterval: 10000, // 10 seconds
    maxEvents: 10,
    fadeOutTime: 30000, // 30 seconds for events to fade
    mapWidth: 800,
    mapHeight: 600,
    sensorRadius: 20,
    mapPadding: 60 // Padding around sensors in pixels
};

let updateTimer = null;
let isConnected = false;

// Map transform state for auto-scaling and centering
let mapTransform = {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    minX: 0,
    minY: 0,
    maxX: 100,
    maxY: 75
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Kiosk Display Initializing...');
    
    // Check if API is available
    if (typeof API === 'undefined') {
        console.error('API module not loaded');
        updateConnectionStatus(false);
        document.body.innerHTML = '<div class="error-message">API module failed to load. Please refresh the page.</div>';
        return;
    }
    
    // API base URL is auto-detected by api.js (localhost vs production)
    console.log('Kiosk using API baseUrl:', API.baseUrl);
    
    initializeKiosk();
});

function initializeKiosk() {
    // Load color configuration
    if (typeof SoundLevelColors !== 'undefined') {
        SoundLevelColors.load().then(() => {
            console.log('Color config loaded for kiosk');
            // Initial data fetch after config loaded
            fetchAllData();
        }).catch(err => {
            console.warn('Failed to load color config, using defaults:', err);
            fetchAllData();
        });
    } else {
        // Initial data fetch
        fetchAllData();
    }
    
    // Set up auto-refresh
    updateTimer = setInterval(fetchAllData, KIOSK_CONFIG.refreshInterval);
    
    // Prevent accidental navigation
    preventNavigation();
}

async function fetchAllData() {
    try {
        updateConnectionStatus(true);
        
        // Fetch all necessary data
        const [devices, sensors, sources, labels] = await Promise.all([
            fetchDevices(),
            fetchSensorPositions(),
            fetchSoundSources(),
            fetchMapLabels()
        ]);
        
        // Update UI
        updateSystemStatus(devices);
        updateSensorList(devices);
        updateMap(devices, sensors, sources, labels);
        updateEventsList(sources);
        updateTimestamp();
        
    } catch (error) {
        console.error('Error fetching data:', error);
        updateConnectionStatus(false);
    }
}

async function fetchDevices() {
    try {
        const devices = await API.getAllDevices();
        
        // Fetch latest measurements for each device
        const devicesWithMeasurements = await Promise.all(
            devices.map(async (device) => {
                try {
                    const data = await API.getLatestMeasurements(device.device_id, 1);
                    const latest = data.measurements[0];
                    return {
                        ...device,
                        latest_measurement: latest ? {
                            db_level: latest.db_level,
                            db_level_peak: latest.db_level_peak,
                            overall_db: latest.db_level,
                            frequency_bands: latest.frequency_bands,
                            timestamp: latest.timestamp
                        } : null
                    };
                } catch (error) {
                    console.error(`Failed to load measurements for ${device.device_id}:`, error);
                    return {
                        ...device,
                        latest_measurement: null
                    };
                }
            })
        );
        
        return devicesWithMeasurements;
    } catch (error) {
        console.error('Error fetching devices:', error);
        return [];
    }
}

async function fetchSensorPositions() {
    try {
        const response = await fetch(`${API.baseUrl}/api/triangulation/sensors`);
        if (!response.ok) throw new Error('Failed to fetch sensor positions');
        return await response.json();
    } catch (error) {
        console.error('Error fetching sensor positions:', error);
        return [];
    }
}

async function fetchSoundSources() {
    try {
        const response = await fetch(`${API.baseUrl}/api/triangulation/sources/recent`);
        if (!response.ok) throw new Error('Failed to fetch sound sources');
        return await response.json();
    } catch (error) {
        console.error('Error fetching sound sources:', error);
        return [];
    }
}

async function fetchMapLabels() {
    try {
        const response = await fetch(`${API.baseUrl}/api/labels`);
        if (!response.ok) throw new Error('Failed to fetch map labels');
        return await response.json();
    } catch (error) {
        console.error('Error fetching map labels:', error);
        return [];
    }
}

function updateConnectionStatus(connected) {
    isConnected = connected;
    const statusText = document.getElementById('statusText');
    const statusDot = document.querySelector('.status-dot');
    
    if (connected) {
        statusText.textContent = 'Connected';
        statusDot.classList.remove('disconnected');
    } else {
        statusText.textContent = 'Disconnected';
        statusDot.classList.add('disconnected');
    }
}

function updateSystemStatus(devices) {
    const activeDevices = devices.filter(d => isDeviceActive(d)).length;
    const totalDevices = devices.length;
    
    document.getElementById('activeSensors').textContent = `${activeDevices}/${totalDevices}`;
    
    // Determine overall status based on PEAK values (or fall back to average)
    let criticalDevices, warningDevices;
    
    if (typeof SoundLevelColors !== 'undefined') {
        // Use color config thresholds
        const thresholds = SoundLevelColors.getThresholds();
        criticalDevices = devices.filter(d => {
            const level = d.latest_measurement?.db_level_peak || d.latest_measurement?.db_level || 0;
            return isDeviceActive(d) && level >= thresholds.red.min;
        }).length;
        warningDevices = devices.filter(d => {
            const level = d.latest_measurement?.db_level_peak || d.latest_measurement?.db_level || 0;
            return isDeviceActive(d) && level >= thresholds.orange.min && level < thresholds.red.min;
        }).length;
    } else {
        // Fallback to hardcoded thresholds
        criticalDevices = devices.filter(d => {
            const level = d.latest_measurement?.db_level_peak || d.latest_measurement?.db_level || 0;
            return isDeviceActive(d) && level > 95;
        }).length;
        warningDevices = devices.filter(d => {
            const level = d.latest_measurement?.db_level_peak || d.latest_measurement?.db_level || 0;
            return isDeviceActive(d) && level >= 80 && level <= 95;
        }).length;
    }
    
    const statusBadge = document.getElementById('overallStatus');
    if (criticalDevices > 0) {
        statusBadge.textContent = 'Critical';
        statusBadge.className = 'value status-badge critical';
    } else if (warningDevices > 0) {
        statusBadge.textContent = 'Elevated';
        statusBadge.className = 'value status-badge warning';
    } else {
        statusBadge.textContent = 'Normal';
        statusBadge.className = 'value status-badge normal';
    }
}

function updateSensorList(devices) {
    const sensorList = document.getElementById('sensorList');
    sensorList.innerHTML = '';
    
    // Sort by peak dB level (highest first), fall back to average
    const sortedDevices = [...devices].sort((a, b) => {
        const aDb = a.latest_measurement?.db_level_peak || a.latest_measurement?.db_level || 0;
        const bDb = b.latest_measurement?.db_level_peak || b.latest_measurement?.db_level || 0;
        return bDb - aDb;
    });
    
    sortedDevices.forEach(device => {
        const sensorItem = createSensorItem(device);
        sensorList.appendChild(sensorItem);
    });
}

function createSensorItem(device) {
    const div = document.createElement('div');
    const isActive = isDeviceActive(device);
    const dbAvg = device.latest_measurement?.db_level || 0;
    const dbPeak = device.latest_measurement?.db_level_peak;
    const db = dbPeak || dbAvg;  // Use peak for status color if available
    
    let statusClass = 'normal';
    if (!isActive) {
        statusClass = 'offline';
    } else if (typeof SoundLevelColors !== 'undefined') {
        // Use color config
        const band = SoundLevelColors.getBand(db);
        statusClass = band === 'red' ? 'critical' : band === 'orange' ? 'warning' : 'normal';
    } else {
        // Fallback to hardcoded thresholds
        if (db > 95) {
            statusClass = 'critical';
        } else if (db >= 80) {
            statusClass = 'warning';
        }
    }
    
    div.className = `sensor-item ${statusClass}`;
    div.innerHTML = `
        <div class="sensor-header">
            <span class="sensor-name">${device.nickname || device.name || device.device_id}</span>
            <span class="sensor-status ${isActive ? '' : 'offline'}">
                ${isActive ? 'Active' : 'Offline'}
            </span>
        </div>
        <div class="sensor-value">
            ${isActive ? (
                dbPeak ? 
                    `<div style="font-size: 0.85em; margin-bottom: 2px;">Avg: ${dbAvg.toFixed(1)} dB</div><div style="font-weight: bold; color: #e74c3c;">Peak: ${dbPeak.toFixed(1)} dB</div>` 
                    : `${dbAvg.toFixed(1)} dB`
            ) : '--'}
        </div>
    `;
    
    return div;
}

function updateMap(devices, sensors, sources, labels) {
    const sensorsGroup = document.getElementById('sensors');
    const sourcesGroup = document.getElementById('soundSources');
    const labelsGroup = document.getElementById('mapLabels');
    
    // Clear existing elements
    sensorsGroup.innerHTML = '';
    sourcesGroup.innerHTML = '';
    if (labelsGroup) labelsGroup.innerHTML = '';
    
    // Calculate best fit for all sensor positions
    calculateMapBounds(devices, sensors);
    
    // Draw barriers (if available)
    // TODO: Fetch and draw barriers from API
    
    // Draw custom labels
    if (labels && labelsGroup) {
        labels.forEach(label => {
            if (label.visible !== false) {
                const labelElement = createMapLabel(label);
                labelsGroup.appendChild(labelElement);
            }
        });
    }
    
    // Draw sensors
    devices.forEach(device => {
        // Try to find position for this device
        const sensorPos = sensors.find(s => s.device_id === device.device_id);
        
        if (sensorPos && sensorPos.position) {
            const marker = createSensorMarker(device, sensorPos.position);
            sensorsGroup.appendChild(marker);
        } else {
            // Place in default grid if no position configured (in meters)
            const index = devices.indexOf(device);
            const defaultPos = {
                x: (index % 5) * 3,  // 3 meters apart
                y: Math.floor(index / 5) * 3
            };
            const marker = createSensorMarker(device, defaultPos);
            sensorsGroup.appendChild(marker);
        }
    });
    
    // Draw sound sources
    sources.forEach(source => {
        if (source.position) {
            const sourceMarker = createSoundSourceMarker(source);
            sourcesGroup.appendChild(sourceMarker);
        }
    });
}

function calculateMapBounds(devices, sensors) {
    // Collect all sensor positions
    const positions = [];
    
    devices.forEach(device => {
        const sensorPos = sensors.find(s => s.device_id === device.device_id);
        
        if (sensorPos && sensorPos.position) {
            // Use actual positions (calibrated or not)
            positions.push({
                x: sensorPos.position.x,
                y: sensorPos.position.y
            });
        } else {
            // Use default grid positions for uncalibrated sensors (in meters)
            const index = devices.indexOf(device);
            positions.push({
                x: (index % 5) * 3,  // 3 meters apart
                y: Math.floor(index / 5) * 3
            });
        }
    });
    
    // If no positions, use defaults
    if (positions.length === 0) {
        mapTransform.minX = 0;
        mapTransform.minY = 0;
        mapTransform.maxX = 100;
        mapTransform.maxY = 75;
        mapTransform.scale = 1;
        mapTransform.offsetX = 0;
        mapTransform.offsetY = 0;
        return;
    }
    
    // Calculate bounding box
    const xs = positions.map(p => p.x);
    const ys = positions.map(p => p.y);
    
    let minX = Math.min(...xs);
    let maxX = Math.max(...xs);
    let minY = Math.min(...ys);
    let maxY = Math.max(...ys);
    
    // Ensure minimum size (at least 10m x 10m)
    const widthMeters = maxX - minX;
    const heightMeters = maxY - minY;
    
    if (widthMeters < 10) {
        const centerX = (minX + maxX) / 2;
        minX = centerX - 5;
        maxX = centerX + 5;
    }
    
    if (heightMeters < 10) {
        const centerY = (minY + maxY) / 2;
        minY = centerY - 5;
        maxY = centerY + 5;
    }
    
    // Store bounds
    mapTransform.minX = minX;
    mapTransform.minY = minY;
    mapTransform.maxX = maxX;
    mapTransform.maxY = maxY;
    
    // Calculate scale to fit in viewport with padding
    const dataWidth = maxX - minX;
    const dataHeight = maxY - minY;
    
    const availableWidth = KIOSK_CONFIG.mapWidth - (KIOSK_CONFIG.mapPadding * 2);
    const availableHeight = KIOSK_CONFIG.mapHeight - (KIOSK_CONFIG.mapPadding * 2);
    
    const scaleX = availableWidth / dataWidth;
    const scaleY = availableHeight / dataHeight;
    
    // Use the smaller scale to ensure everything fits
    mapTransform.scale = Math.min(scaleX, scaleY);
    
    // Calculate centering offsets
    const scaledWidth = dataWidth * mapTransform.scale;
    const scaledHeight = dataHeight * mapTransform.scale;
    
    mapTransform.offsetX = KIOSK_CONFIG.mapPadding + (availableWidth - scaledWidth) / 2;
    mapTransform.offsetY = KIOSK_CONFIG.mapPadding + (availableHeight - scaledHeight) / 2;
}

function createSensorMarker(device, position) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const isActive = isDeviceActive(device);
    const db = device.latest_measurement?.db_level || 0;
    
    let statusClass = 'normal';
    if (!isActive) {
        statusClass = 'offline';
    } else if (typeof SoundLevelColors !== 'undefined') {
        // Use color config
        const band = SoundLevelColors.getBand(db);
        statusClass = band === 'red' ? 'critical' : band === 'orange' ? 'warning' : 'normal';
    } else {
        // Fallback to hardcoded thresholds
        if (db > 95) {
            statusClass = 'critical';
        } else if (db >= 80) {
            statusClass = 'warning';
        }
    }
    
    group.setAttribute('class', `sensor-marker ${statusClass}`);
    
    // Scale position to map coordinates
    const x = scaleX(position.x);
    const y = scaleY(position.y);
    
    // Circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', KIOSK_CONFIG.sensorRadius);
    group.appendChild(circle);
    
    // Label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', y + 5);
    text.setAttribute('class', 'sensor-label');
    text.textContent = device.nickname || device.name || device.device_id.substring(0, 8);
    group.appendChild(text);
    
    // dB value below
    const dbText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    dbText.setAttribute('x', x);
    dbText.setAttribute('y', y + KIOSK_CONFIG.sensorRadius + 18);
    dbText.setAttribute('class', 'sensor-label');
    dbText.setAttribute('font-size', '12');
    dbText.textContent = isActive ? `${db.toFixed(1)} dB` : 'Offline';
    group.appendChild(dbText);
    
    return group;
}

function createSoundSourceMarker(source) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'sound-source');
    
    const x = scaleX(source.position.x);
    const y = scaleY(source.position.y);
    
    // Confidence circle
    if (source.confidence) {
        const confidenceRadius = (100 - source.confidence) * 2; // Larger circle = less confidence
        const confidenceCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        confidenceCircle.setAttribute('cx', x);
        confidenceCircle.setAttribute('cy', y);
        confidenceCircle.setAttribute('r', confidenceRadius);
        confidenceCircle.setAttribute('class', 'confidence-circle');
        group.appendChild(confidenceCircle);
    }
    
    // Source marker
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', 15);
    group.appendChild(circle);
    
    // Icon (speaker emoji or text)
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', y + 6);
    text.setAttribute('class', 'sensor-label');
    text.setAttribute('font-size', '16');
    text.textContent = '🔊';
    group.appendChild(text);
    
    // dB level
    if (source.db_level) {
        const dbText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        dbText.setAttribute('x', x);
        dbText.setAttribute('y', y + 30);
        dbText.setAttribute('class', 'sensor-label');
        dbText.setAttribute('font-size', '12');
        dbText.textContent = `${source.db_level.toFixed(1)} dB`;
        group.appendChild(dbText);
    }
    
    return group;
}

function createMapLabel(label) {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'map-label');
    
    const x = scaleX(label.position.x);
    const y = scaleY(label.position.y);
    
    // Text label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', y);
    text.setAttribute('class', 'map-label-text');
    text.setAttribute('font-size', label.font_size || '14');
    text.setAttribute('fill', label.color || '#ffffff');
    text.textContent = label.text || '';
    group.appendChild(text);
    
    return group;
}

function updateEventsList(sources) {
    const eventsList = document.getElementById('eventsList');
    
    if (!sources || sources.length === 0) {
        eventsList.innerHTML = '<p class="no-events">No recent events</p>';
        return;
    }
    
    eventsList.innerHTML = '';
    
    // Show only recent events (last 10)
    const recentSources = sources.slice(0, KIOSK_CONFIG.maxEvents);
    
    recentSources.forEach(source => {
        const eventItem = createEventItem(source);
        eventsList.appendChild(eventItem);
    });
}

function createEventItem(source) {
    const div = document.createElement('div');
    div.className = 'event-item';
    
    const location = source.position 
        ? `(${source.position.x.toFixed(1)}m, ${source.position.y.toFixed(1)}m)`
        : 'Unknown location';
    
    const dbLevel = source.db_level ? `${source.db_level.toFixed(1)} dB` : '--';
    const confidence = source.confidence ? `${source.confidence}% confidence` : '';
    const timeAgo = formatTimeAgo(source.timestamp);
    
    div.innerHTML = `
        <div class="event-location">${location}</div>
        <div class="event-details">${dbLevel} • ${confidence} • ${timeAgo}</div>
    `;
    
    return div;
}

function updateTimestamp() {
    const now = new Date();
    document.getElementById('lastUpdateTime').textContent = 
        `Updated: ${now.toLocaleTimeString()}`;
}

// Utility Functions

function isDeviceActive(device) {
    if (!device.last_seen) return false;
    const lastSeen = new Date(device.last_seen);
    const now = new Date();
    const diffSeconds = (now - lastSeen) / 1000;
    return diffSeconds < 60; // Active if seen within last 60 seconds
}

function formatTime(timestamp) {
    if (!timestamp) return '--';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
}

function formatTimeAgo(timestamp) {
    if (!timestamp) return 'Unknown';
    
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffMin < 60) return `${diffMin}m ago`;
    return `${diffHour}h ago`;
}

function scaleX(x) {
    // Scale from real-world coordinates (meters) to SVG coordinates using dynamic transform
    return mapTransform.offsetX + (x - mapTransform.minX) * mapTransform.scale;
}

function scaleY(y) {
    // Scale from real-world coordinates (meters) to SVG coordinates using dynamic transform
    return mapTransform.offsetY + (y - mapTransform.minY) * mapTransform.scale;
}

function preventNavigation() {
    // Prevent accidental back navigation
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', () => {
        window.history.pushState(null, '', window.location.href);
    });
    
    // Prevent context menu (right-click)
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });
    
    // Prevent certain keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Prevent F5 refresh
        if (e.key === 'F5') {
            e.preventDefault();
        }
        // Prevent Ctrl+R refresh
        if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
            e.preventDefault();
        }
    });
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (updateTimer) {
        clearInterval(updateTimer);
    }
});

console.log('Kiosk Display Script Loaded');
