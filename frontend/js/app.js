/**
 * Main application JavaScript
 */

// Check if API is loaded
if (typeof API === 'undefined') {
    console.error('API module failed to load');
    document.addEventListener('DOMContentLoaded', () => {
        document.body.innerHTML = '<div style="padding: 40px; text-align: center;"><h1 style="color: red;">Error: API module not loaded</h1><p>Please refresh the page. If the problem persists, check the browser console for errors.</p></div>';
    });
    throw new Error('API module not loaded');
}

// Debug: Log API configuration
console.log('=== Sound Monitoring System Initialized ===');
console.log('Current hostname:', window.location.hostname);
console.log('API baseUrl:', API.baseUrl);
console.log('localStorage apiUrl:', localStorage.getItem('apiUrl'));
console.log('===========================================');

// State management
const State = {
    devices: [],
    selectedDevice: null,
    refreshInterval: null
};

const FRONTEND_VERSION = '2.1.0';

// Helper function to format date for datetime-local input
function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    // Set Grafana link based on environment
    const grafanaLink = document.getElementById('grafanaLink');
    if (grafanaLink) {
        const grafanaUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:3001' 
            : 'http://xibo.space.nova-labs.org:3001';
        grafanaLink.href = grafanaUrl;
    }
    
    initTabs();
    initModals();
    initEventListeners();
    
    // Load color configuration
    if (typeof SoundLevelColors !== 'undefined') {
        await SoundLevelColors.load();
    }
    
    // Load initial data
    await loadDevices();
    
    // Start auto-refresh for dashboard
    startAutoRefresh();
    
    // Initialize settings
    initSettings();
});

// Tab navigation
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;

            // Update active states
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(tabName).classList.add('active');

            // Load tab-specific data
            onTabChange(tabName);
        });
    });
}

// Handle tab changes
async function onTabChange(tabName) {
    switch (tabName) {
        case 'dashboard':
            await updateDashboard();
            break;
        case 'devices':
            await loadDevicesList();
            break;
        case 'triangulation':
            await initTriangulation();
            break;
        case 'history':
            await populateDeviceSelect();
            initHistoryChart();
            break;
        case 'alerts':
            await loadAlerts();
            await populateAlertDeviceSelect();
            break;
        case 'analytics':
            await populateAnalyticsDeviceSelect();
            initAnalyticsChart();
            break;
    }
}

// Modal handling
function initModals() {
    const modals = ['registerModal', 'calibrationModal', 'editDeviceModal', 'alertModal', 'sensorPositionModal', 'barrierModal', 'labelModal'];
    const closeButtons = document.querySelectorAll('.close');

    // Open buttons
    document.getElementById('registerDeviceBtn').onclick = () => {
        document.getElementById('registerModal').style.display = 'block';
    };
    
    document.getElementById('addAlertBtn')?.addEventListener('click', () => {
        document.getElementById('alertModal').style.display = 'block';
    });

    // Close buttons
    closeButtons.forEach(btn => {
        btn.onclick = () => {
            const modalId = btn.dataset.modal;
            if (modalId) {
                document.getElementById(modalId).style.display = 'none';
            }
        };
    });

    // Click outside to close
    window.onclick = (event) => {
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (event.target == modal) {
                modal.style.display = 'none';
            }
        });
    };
}

// Event listeners
function initEventListeners() {
    // Register form
    document.getElementById('registerForm')?.addEventListener('submit', handleRegisterDevice);
    
    // Edit device form
    document.getElementById('editDeviceForm')?.addEventListener('submit', handleEditDevice);
    
    // Calibration form
    document.getElementById('calibrationForm')?.addEventListener('submit', handleCalibration);
    
    // Alert form
    document.getElementById('alertForm')?.addEventListener('submit', handleCreateAlert);
    
    // History controls
    document.getElementById('loadHistoryBtn')?.addEventListener('click', loadHistory);
    document.getElementById('exportHistoryBtn')?.addEventListener('click', exportHistory);
    
    // Analytics controls
    document.getElementById('loadAnalyticsBtn')?.addEventListener('click', loadAnalytics);
    
    // Settings
    document.getElementById('saveApiUrl')?.addEventListener('click', saveApiUrl);
    document.getElementById('cleanupBtn')?.addEventListener('click', runCleanup);
    document.getElementById('exportDataBtn')?.addEventListener('click', () => API.exportJSON());
    
    // Set default dates for history (24 hours ago to now, with second precision)
    const now = new Date();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    // Format for datetime-local input: YYYY-MM-DDTHH:mm:ss
    const endDateEl = document.getElementById('endDate');
    const startDateEl = document.getElementById('startDate');
    if (endDateEl) endDateEl.value = formatDateTimeLocal(now);
    if (startDateEl) startDateEl.value = formatDateTimeLocal(yesterday);
    
    // Set default dates for analytics (date inputs, not datetime-local)
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const yesterdayDate = yesterday.toISOString().split('T')[0];
    const analyticsEndDateEl = document.getElementById('analyticsEndDate');
    const analyticsStartDateEl = document.getElementById('analyticsStartDate');
    if (analyticsEndDateEl) analyticsEndDateEl.value = today;
    if (analyticsStartDateEl) analyticsStartDateEl.value = yesterdayDate;
}

// Load devices
async function loadDevices() {
    try {
        console.log('Loading devices from API...');
        State.devices = await API.getAllDevices();
        console.log('Devices loaded:', State.devices);
        await updateDashboard();
    } catch (error) {
        console.error('Failed to load devices:', error);
        showError('Failed to load devices. Check API connection: ' + error.message);
        // Show error on dashboard too
        const devicesGrid = document.getElementById('devicesGrid');
        if (devicesGrid) {
            const backendUrl = API.baseUrl.startsWith('/') ? window.location.origin + API.baseUrl : API.baseUrl;
            devicesGrid.innerHTML = `<p class="error-message" style="color: red; padding: 20px;">Failed to load devices: ${error.message}. Please check that the backend is running at ${backendUrl}</p>`;
        }
    }
}

// Update dashboard
async function updateDashboard() {
    const devicesGrid = document.getElementById('devicesGrid');
    
    console.log('updateDashboard called, devices:', State.devices.length);
    
    if (!devicesGrid) {
        console.error('devicesGrid element not found!');
        return;
    }
    
    devicesGrid.innerHTML = '';

    if (State.devices.length === 0) {
        devicesGrid.innerHTML = '<p class="empty-message">No devices registered yet.</p>';
        return;
    }

    // Update stats
    const now = Date.now();
    const activeDevices = State.devices.filter(d => {
        const lastSeen = new Date(d.last_seen).getTime();
        return (now - lastSeen) < 60000; // Active within last minute
    });

    document.getElementById('totalDevices').textContent = State.devices.length;
    document.getElementById('activeDevices').textContent = activeDevices.length;

    // Display devices with their latest measurements
    let totalDb = 0;
    let count = 0;

    for (const device of State.devices) {
        // Use latest_measurement from device data (already included by backend)
        const latest = device.latest_measurement;
        
        console.log(`Device ${device.device_id}:`, latest ? `${latest.db_level} dB` : 'no data');

        const card = createDeviceCard(device, latest);
        devicesGrid.appendChild(card);

        if (latest && latest.db_level) {
            totalDb += latest.db_level;
            count++;
        }
    }

    // Update average
    if (count > 0) {
        document.getElementById('avgLevel').textContent = `${(totalDb / count).toFixed(1)} dB`;
    }

    // Update last update time
    document.getElementById('lastUpdate').textContent = new Date().toLocaleTimeString();
    
    console.log(`Dashboard updated: ${count} devices with measurements`);
}

// Create device card
function createDeviceCard(device, latest) {
    const card = document.createElement('div');
    card.className = 'device-card';

    const dbLevel = latest ? latest.db_level.toFixed(1) : '--';
    const dbPeak = latest && latest.db_level_peak ? latest.db_level_peak.toFixed(1) : '--';
    const timestamp = latest ? new Date(latest.timestamp).toLocaleTimeString() : '--';
    
    // Determine level color using color config based on PEAK level for alerts
    let levelClass = 'green';
    const levelForColorClass = latest && latest.db_level_peak ? latest.db_level_peak : (latest ? latest.db_level : 0);
    if (typeof SoundLevelColors !== 'undefined' && latest) {
        levelClass = SoundLevelColors.getClass(levelForColorClass);
    } else {
        // Fallback for legacy behavior
        if (levelForColorClass > 95) levelClass = 'high';
        else if (levelForColorClass >= 80) levelClass = 'medium';
        else levelClass = 'low';
    }

    // Get frequency band config from device
    const bandConfig = device.frequency_bands || [];
    
    card.innerHTML = `
        <div class="device-header">
            <h3>${device.nickname || device.name}</h3>
            <span class="device-id">${device.device_id}</span>
        </div>
        <div class="device-location">${device.location || 'Unknown location'}</div>
        <div class="db-level ${levelClass}">${dbLevel} dB</div>
        <div class="bands">
            ${latest && latest.frequency_bands ? latest.frequency_bands.map(band => {
                const config = bandConfig.find(b => b.band_number === band.band_number);
                const freqRange = config ? `(${config.start_frequency}-${config.end_frequency} Hz)` : '';
                return `
                    <div class="band">
                        <span class="band-label">Band ${band.band_number} ${freqRange}</span>
                        <span class="band-value">${band.level.toFixed(1)} dB</span>
                    </div>
                `;
            }).join('') : '<p class="no-data">No recent data</p>'}
        </div>
        <div class="device-footer">
            <span class="timestamp">Updated: ${timestamp}</span>
            <button class="btn-link" onclick="viewFrequencyConfig('${device.device_id}')">⚙️ Configure Bands</button>
        </div>
    `;

    return card;
}

// Load devices list
async function loadDevicesList() {
    const devicesList = document.getElementById('devicesList');
    devicesList.innerHTML = '';

    if (State.devices.length === 0) {
        devicesList.innerHTML = '<p class="empty-message">No devices registered.</p>';
        return;
    }

    State.devices.forEach(device => {
        const deviceItem = document.createElement('div');
        deviceItem.className = 'device-item';
        
        const lastSeen = new Date(device.last_seen);
        const lastSeenStr = lastSeen.toLocaleString();
        const firmwareVersion = device.firmware_version || 'unknown';

        deviceItem.innerHTML = `
            <div class="device-info">
                <h3>${device.nickname || device.name}</h3>
                <p><strong>ID:</strong> ${device.device_id}</p>
                <p><strong>MAC:</strong> ${device.mac_address}</p>
                <p><strong>Location:</strong> ${device.location}</p>
                <p><strong>Firmware:</strong> v${firmwareVersion}</p>
                <p><strong>Last Seen:</strong> ${lastSeenStr}</p>
                <p><strong>Calibration:</strong> ${device.calibration_offset_db} dB</p>
            </div>
            <div class="device-actions">
                <button class="btn btn-secondary" onclick="editDevice('${device.device_id}')">Edit</button>
                <button class="btn btn-secondary" onclick="openCalibrationModal('${device.device_id}', ${device.calibration_offset_db})">Calibrate</button>
                <button class="btn btn-danger" onclick="deleteDevice('${device.device_id}', '${device.nickname || device.name}')">Delete</button>
            </div>
        `;

        devicesList.appendChild(deviceItem);
    });
}

// Register device
async function handleRegisterDevice(e) {
    e.preventDefault();

    const deviceData = {
        device_id: document.getElementById('deviceId').value,
        mac_address: document.getElementById('macAddress').value,
        name: document.getElementById('deviceName').value,
        nickname: document.getElementById('deviceNickname').value,
        location: document.getElementById('deviceLocation').value
    };

    try {
        const result = await API.registerDevice(deviceData);
        
        document.getElementById('registerResult').innerHTML = `
            <div class="success">
                Device registered successfully!<br>
                <strong>API Key:</strong> <code>${result.api_key}</code><br>
                <em>Save this key - you'll need it for ESP32 configuration!</em>
            </div>
        `;

        // Reload devices
        await loadDevices();

        // Reset form
        document.getElementById('registerForm').reset();
    } catch (error) {
        document.getElementById('registerResult').innerHTML = `
            <div class="error">Failed to register device: ${error.message}</div>
        `;
    }
}

// Populate device select for history
async function populateDeviceSelect() {
    const select = document.getElementById('historyDeviceSelect');
    select.innerHTML = '<option value="">Select Device...</option>';

    State.devices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.device_id;
        option.textContent = `${device.nickname || device.name} (${device.device_id})`;
        select.appendChild(option);
    });
    
    // Auto-load when device is selected
    select.onchange = async () => {
        if (select.value) {
            await loadHistory();
        }
    };
}

// Load history
async function loadHistory() {
    const deviceId = document.getElementById('historyDeviceSelect').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const container = document.getElementById('historyContainer');

    if (!deviceId) {
        container.innerHTML = '<p class="error">Please select a device</p>';
        return;
    }

    // Convert datetime-local format to ISO 8601 for API
    const startDateTime = startDate ? new Date(startDate).toISOString() : null;
    const endDateTime = endDate ? new Date(endDate).toISOString() : null;

    try {
        const data = await API.getMeasurements(deviceId, { 
            start_date: startDateTime, 
            end_date: endDateTime 
        });
        
        if (data.measurements.length === 0) {
            container.innerHTML = '<p class="empty-message">No measurements found for this period</p>';
            return;
        }

        // Get device for frequency band config
        const device = State.devices.find(d => d.device_id === deviceId);
        const bandConfig = device?.frequency_bands || [];

        displayHistory(data.measurements);
        updateHistoryChart(data.measurements, bandConfig);

    } catch (error) {
        container.innerHTML = `<p class="error">Failed to load history: ${error.message}</p>`;
    }
}

// Display history function
function displayHistory(measurements) {
    const container = document.getElementById('historyContainer');
    let html = `<h3>Measurements: ${measurements.length} records</h3><div class="measurements-list">`;
    
    // Get device for frequency band config
    const deviceId = document.getElementById('historyDeviceSelect').value;
    const device = State.devices.find(d => d.device_id === deviceId);
    const bandConfig = device?.frequency_bands || [];
    
    // Sort measurements newest to oldest
    const sortedMeasurements = [...measurements].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    sortedMeasurements.slice(0, 100).forEach(m => {
        const time = new Date(m.timestamp).toLocaleString();
        const bandsHtml = m.frequency_bands && m.frequency_bands.length > 0
            ? m.frequency_bands.map(b => {
                const config = bandConfig.find(c => c.band_number === b.band_number);
                const freqRange = config ? ` (${config.start_frequency}-${config.end_frequency}Hz)` : '';
                return `<span class="band-item">Band ${b.band_number}${freqRange}: ${b.level.toFixed(1)} dB</span>`;
            }).join('')
            : '<span class="band-item">No frequency band data</span>';
        
        html += `
            <div class="measurement-item">
                <div class="measurement-header">
                    <span class="time">${time}</span>
                    <span class="level"><strong>Avg: ${m.db_level.toFixed(1)} dB</strong>${m.db_level_peak ? ` | <strong style="color: #e74c3c;">Peak: ${m.db_level_peak.toFixed(1)} dB</strong>` : ''}</span>
                </div>
                <div class="bands-inline">
                    ${bandsHtml}
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

// Export history as CSV
async function exportHistory() {
    const deviceId = document.getElementById('historyDeviceSelect').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!deviceId) {
        alert('Please select a device');
        return;
    }

    API.exportCSV(deviceId, startDate, endDate);
}

// Save API URL
function saveApiUrl() {
    const url = document.getElementById('apiUrl').value;
    API.setBaseUrl(url);
    alert('API URL saved! Reloading data...');
    loadDevices();
}

// Run cleanup
async function runCleanup() {
    if (!confirm('Run data cleanup? This will delete old measurements.')) {
        return;
    }

    try {
        const result = await API.runCleanup();
        alert(`Cleanup completed! ${result.deleted_files} files deleted.`);
    } catch (error) {
        alert(`Cleanup failed: ${error.message}`);
    }
}

// Auto-refresh
function startAutoRefresh() {
    State.refreshInterval = setInterval(async () => {
        const activeTab = document.querySelector('.tab-button.active').dataset.tab;
        if (activeTab === 'dashboard') {
            await loadDevices();
        }
    }, 30000); // Refresh every 30 seconds
}

// Helper functions
function showError(message) {
    console.error(message);
    // Could add a toast notification here
}

function editDevice(deviceId) {
    const device = State.devices.find(d => d.device_id === deviceId);
    if (!device) {
        alert('Device not found');
        return;
    }

    // Populate the edit form
    document.getElementById('editDeviceId').value = device.device_id;
    document.getElementById('editDeviceName').value = device.name;
    document.getElementById('editDeviceNickname').value = device.nickname || device.name;
    document.getElementById('editDeviceLocation').value = device.location || '';
    
    // Clear previous result
    document.getElementById('editDeviceResult').innerHTML = '';
    
    // Show the modal
    document.getElementById('editDeviceModal').style.display = 'block';
}

// Handle edit device form submission
async function handleEditDevice(e) {
    e.preventDefault();

    const deviceId = document.getElementById('editDeviceId').value;
    const nickname = document.getElementById('editDeviceNickname').value;
    const location = document.getElementById('editDeviceLocation').value;

    try {
        // Update nickname using the specific endpoint
        await API.updateDeviceNickname(deviceId, nickname);
        
        // Update location using the general update endpoint
        if (location) {
            await API.updateDevice(deviceId, { location });
        }
        
        document.getElementById('editDeviceResult').innerHTML = `
            <div class="success">Device updated successfully!</div>
        `;

        // Reload devices
        await loadDevices();
        await loadDevicesList();

        // Close modal after a short delay
        setTimeout(() => {
            document.getElementById('editDeviceModal').style.display = 'none';
        }, 1500);
    } catch (error) {
        document.getElementById('editDeviceResult').innerHTML = `
            <div class="error">Failed to update device: ${error.message}</div>
        `;
    }
}

// Delete device
async function deleteDevice(deviceId, deviceName) {
    if (!confirm(`Are you sure you want to delete device "${deviceName}" (${deviceId})?\n\nThis will permanently remove the device and all its configuration. Historical measurement data will be preserved.`)) {
        return;
    }

    try {
        await API.deleteDevice(deviceId);
        
        // Reload devices list
        await loadDevices();
        await loadDevicesList();
        
        alert(`Device "${deviceName}" deleted successfully!`);
    } catch (error) {
        alert(`Failed to delete device: ${error.message}`);
    }
}

// Calibration functions
function openCalibrationModal(deviceId, currentOffset) {
    document.getElementById('calibrationDeviceId').value = deviceId;
    document.getElementById('calibrationOffset').value = currentOffset;
    document.getElementById('calibrationModal').style.display = 'block';
}

async function handleCalibration(e) {
    e.preventDefault();

    const deviceId = document.getElementById('calibrationDeviceId').value;
    const offset = parseFloat(document.getElementById('calibrationOffset').value);

    try {
        await API.updateCalibration(deviceId, offset);
        
        document.getElementById('calibrationResult').innerHTML = `
            <div class="success">Calibration updated successfully!</div>
        `;

        // Reload devices
        await loadDevices();
        await loadDevicesList();

        setTimeout(() => {
            document.getElementById('calibrationModal').style.display = 'none';
            document.getElementById('calibrationResult').innerHTML = '';
        }, 2000);
    } catch (error) {
        document.getElementById('calibrationResult').innerHTML = `
            <div class="error">Failed to update calibration: ${error.message}</div>
        `;
    }
}

// Alert functions
async function loadAlerts() {
    try {
        const alerts = await API.getAllAlerts();
        displayAlerts(alerts);

        const history = await API.getAlertHistory(50);
        displayAlertHistory(history);
    } catch (error) {
        console.error('Failed to load alerts:', error);
    }
}

function displayAlerts(alerts) {
    const alertsList = document.getElementById('alertsList');
    alertsList.innerHTML = '';

    if (alerts.length === 0) {
        alertsList.innerHTML = '<p class="empty-message">No alert rules configured.</p>';
        return;
    }

    alerts.forEach(alert => {
        const alertItem = document.createElement('div');
        alertItem.className = 'alert-item';
        alertItem.innerHTML = `
            <div class="alert-info">
                <h3>Alert for ${alert.device_id}</h3>
                <p><strong>Type:</strong> ${alert.type}</p>
                <p><strong>Threshold:</strong> ${alert.threshold} dB</p>
                <p><strong>Channel:</strong> ${alert.channel}</p>
                <p><strong>Status:</strong> ${alert.enabled ? 'Enabled' : 'Disabled'}</p>
                <p><strong>Triggered:</strong> ${alert.trigger_count} times</p>
            </div>
            <div class="alert-actions">
                <button class="btn btn-secondary" onclick="toggleAlert('${alert.alert_id}', ${!alert.enabled})">${alert.enabled ? 'Disable' : 'Enable'}</button>
                <button class="btn btn-danger" onclick="deleteAlert('${alert.alert_id}')">Delete</button>
            </div>
        `;
        alertsList.appendChild(alertItem);
    });
}

function displayAlertHistory(history) {
    const alertHistory = document.getElementById('alertHistory');
    alertHistory.innerHTML = '';

    if (history.length === 0) {
        alertHistory.innerHTML = '<p class="empty-message">No alerts triggered yet</p>';
        return;
    }

    history.forEach(entry => {
        const alertEntry = document.createElement('div');
        alertEntry.className = 'alert-entry';
        alertEntry.innerHTML = `
            <p><strong>Device:</strong> ${entry.device_id}</p>
            <p><strong>Level:</strong> ${entry.measurement_value} dB (Threshold: ${entry.threshold} dB)</p>
            <p class="timestamp">${new Date(entry.timestamp).toLocaleString()}</p>
        `;
        alertHistory.appendChild(alertEntry);
    });
}

async function populateAlertDeviceSelect() {
    const select = document.getElementById('alertDevice');
    select.innerHTML = '<option value="">Select Device...</option>';

    State.devices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.device_id;
        option.textContent = `${device.nickname || device.name} (${device.device_id})`;
        select.appendChild(option);
    });
}

async function handleCreateAlert(e) {
    e.preventDefault();

    const alertData = {
        device_id: document.getElementById('alertDevice').value,
        type: document.getElementById('alertType').value,
        threshold: parseFloat(document.getElementById('alertThreshold').value),
        channel: document.getElementById('alertChannel').value,
        webhook_url: document.getElementById('alertWebhook').value
    };

    try {
        await API.createAlert(alertData);
        
        document.getElementById('alertResult').innerHTML = `
            <div class="success">Alert rule created successfully!</div>
        `;

        // Reload alerts
        await loadAlerts();

        setTimeout(() => {
            document.getElementById('alertModal').style.display = 'none';
            document.getElementById('alertForm').reset();
            document.getElementById('alertResult').innerHTML = '';
        }, 2000);
    } catch (error) {
        document.getElementById('alertResult').innerHTML = `
            <div class="error">Failed to create alert: ${error.message}</div>
        `;
    }
}

async function toggleAlert(alertId, enabled) {
    try {
        await API.updateAlert(alertId, { enabled });
        await loadAlerts();
    } catch (error) {
        alert(`Failed to update alert: ${error.message}`);
    }
}

async function deleteAlert(alertId) {
    if (!confirm('Are you sure you want to delete this alert rule?')) {
        return;
    }

    try {
        await API.deleteAlert(alertId);
        await loadAlerts();
    } catch (error) {
        alert(`Failed to delete alert: ${error.message}`);
    }
}

// Analytics functions
async function populateAnalyticsDeviceSelect() {
    const select = document.getElementById('analyticsDeviceSelect');
    select.innerHTML = '<option value="">All Devices</option>';

    State.devices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.device_id;
        option.textContent = `${device.nickname || device.name} (${device.device_id})`;
        select.appendChild(option);
    });
}

async function loadAnalytics() {
    const deviceId = document.getElementById('analyticsDeviceSelect').value;
    const startDate = document.getElementById('analyticsStartDate').value;
    const endDate = document.getElementById('analyticsEndDate').value;

    try {
        const stats = await API.getAnalytics(deviceId, startDate, endDate);
        displayAnalyticsStats(stats);
        updateAnalyticsChart(stats);
    } catch (error) {
        alert(`Failed to load analytics: ${error.message}`);
    }
}

function displayAnalyticsStats(stats) {
    const analyticsStats = document.getElementById('analyticsStats');
    analyticsStats.innerHTML = `
        <div class="stat-card">
            <h3>Total Measurements</h3>
            <p class="stat-value">${stats.count}</p>
        </div>
        <div class="stat-card">
            <h3>Mean Level</h3>
            <p class="stat-value">${stats.mean} dB</p>
        </div>
        <div class="stat-card">
            <h3>Median Level</h3>
            <p class="stat-value">${stats.median} dB</p>
        </div>
        <div class="stat-card">
            <h3>Min / Max</h3>
            <p class="stat-value">${stats.min} / ${stats.max} dB</p>
        </div>
        <div class="stat-card">
            <h3>Std Deviation</h3>
            <p class="stat-value">${stats.std_dev} dB</p>
        </div>
        <div class="stat-card">
            <h3>95th Percentile</h3>
            <p class="stat-value">${stats.percentile_95} dB</p>
        </div>
    `;
}

// Frequency band configuration
window.viewFrequencyConfig = async function(deviceId) {
    const device = State.devices.find(d => d.device_id === deviceId);
    if (!device) return;

    const bands = device.frequency_bands || [];
    const bandsHtml = bands.map((band, idx) => `
        <div class="frequency-band-row">
            <label>Band ${band.band_number}:</label>
            <input type="number" id="band${idx}_start" value="${band.start_frequency}" placeholder="Start (Hz)" min="20" max="20000" />
            <span>-</span>
            <input type="number" id="band${idx}_end" value="${band.end_frequency}" placeholder="End (Hz)" min="20" max="20000" />
            <span>Hz</span>
        </div>
    `).join('');

    const modalHtml = `
        <div class="modal-overlay" id="frequencyConfigModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Configure Frequency Bands</h2>
                    <button class="close-button" onclick="closeFrequencyConfigModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <p><strong>Device:</strong> ${device.nickname || device.name} (${device.device_id})</p>
                    <div class="frequency-bands-form">
                        ${bandsHtml}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" onclick="closeFrequencyConfigModal()">Cancel</button>
                    <button class="btn-primary" onclick="saveFrequencyConfig('${deviceId}', ${bands.length})">Save</button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

window.closeFrequencyConfigModal = function() {
    const modal = document.getElementById('frequencyConfigModal');
    if (modal) modal.remove();
}

window.saveFrequencyConfig = async function(deviceId, bandCount) {
    const bands = [];
    for (let i = 0; i < bandCount; i++) {
        const startFreq = parseInt(document.getElementById(`band${i}_start`).value);
        const endFreq = parseInt(document.getElementById(`band${i}_end`).value);
        
        if (startFreq >= endFreq) {
            alert(`Band ${i + 1}: Start frequency must be less than end frequency`);
            return;
        }
        
        bands.push({
            band_number: i + 1,
            start_frequency: startFreq,
            end_frequency: endFreq
        });
    }

    try {
        await API.updateFrequencyBands(deviceId, bands);
        closeFrequencyConfigModal();
        await loadDevices();
        alert('Frequency bands updated successfully');
    } catch (error) {
        alert(`Failed to update frequency bands: ${error.message}`);
    }
}

// Initialize settings tab
function initSettings() {
    // Load current thresholds into UI
    loadThresholdSettings();

    // Load version info for About section
    updateVersionDisplay();
    
    // Save thresholds button
    document.getElementById('saveThresholds')?.addEventListener('click', saveThresholdSettings);
    
    // Reset thresholds button
    document.getElementById('resetThresholds')?.addEventListener('click', resetThresholdSettings);
}

async function updateVersionDisplay() {
    const frontendVersionEl = document.getElementById('frontendVersion');
    const backendVersionEl = document.getElementById('backendVersion');
    const firmwareVersionEl = document.getElementById('firmwareVersion');

    if (frontendVersionEl) {
        frontendVersionEl.textContent = FRONTEND_VERSION;
    }

    if (backendVersionEl) {
        backendVersionEl.textContent = 'Loading...';
    }

    if (firmwareVersionEl) {
        firmwareVersionEl.textContent = 'Loading...';
    }

    try {
        const versionInfo = await API.getSystemVersion();
        if (backendVersionEl) {
            backendVersionEl.textContent = versionInfo.backend?.version || 'Unknown';
        }
        if (firmwareVersionEl) {
            firmwareVersionEl.textContent = versionInfo.firmware?.version || 'Unknown';
        }
    } catch (error) {
        if (backendVersionEl) {
            backendVersionEl.textContent = 'Unknown';
        }
        if (firmwareVersionEl) {
            firmwareVersionEl.textContent = 'Unknown';
        }
        console.warn('Failed to load system version info:', error.message);
    }
}

async function loadThresholdSettings() {
    if (typeof SoundLevelColors === 'undefined') return;
    
    const thresholds = SoundLevelColors.getThresholds();
    
    document.getElementById('greenMin').value = thresholds.green.min;
    document.getElementById('greenMax').value = thresholds.green.max;
    document.getElementById('yellowMin').value = thresholds.yellow.min;
    document.getElementById('yellowMax').value = thresholds.yellow.max;
    document.getElementById('orangeMin').value = thresholds.orange.min;
    document.getElementById('orangeMax').value = thresholds.orange.max;
    document.getElementById('redMin').value = thresholds.red.min;
    document.getElementById('redMax').value = thresholds.red.max;
}

async function saveThresholdSettings() {
    if (typeof SoundLevelColors === 'undefined') return;
    
    const resultDiv = document.getElementById('thresholdResult');
    
    try {
        // Update config object
        SoundLevelColors.setThreshold('green', 'max', document.getElementById('greenMax').value);
        SoundLevelColors.setThreshold('yellow', 'min', document.getElementById('greenMax').value);
        SoundLevelColors.setThreshold('yellow', 'max', document.getElementById('yellowMax').value);
        SoundLevelColors.setThreshold('orange', 'min', document.getElementById('yellowMax').value);
        SoundLevelColors.setThreshold('orange', 'max', document.getElementById('orangeMax').value);
        SoundLevelColors.setThreshold('red', 'min', document.getElementById('orangeMax').value);
        SoundLevelColors.setThreshold('red', 'max', document.getElementById('redMax').value);
        
        // Save to backend
        const success = await SoundLevelColors.save();
        
        if (success) {
            resultDiv.textContent = 'Thresholds saved successfully! Changes will apply to all displays.';
            resultDiv.className = 'result-message success';
            
            // Reload threshold inputs to show updated min values
            loadThresholdSettings();
            
            // Refresh dashboard to show new colors
            await loadDevices();
        } else {
            throw new Error('Failed to save');
        }
    } catch (error) {
        resultDiv.textContent = 'Error saving thresholds: ' + error.message;
        resultDiv.className = 'result-message error';
    }
    
    // Clear message after 5 seconds
    setTimeout(() => {
        resultDiv.textContent = '';
        resultDiv.className = 'result-message';
    }, 5000);
}

async function resetThresholdSettings() {
    if (typeof SoundLevelColors === 'undefined') return;
    
    if (!confirm('Reset all thresholds to default values?')) return;
    
    const resultDiv = document.getElementById('thresholdResult');
    
    try {
        // Set default values
        SoundLevelColors.thresholds = {
            green: { min: 0, max: 50, label: 'Quiet' },
            yellow: { min: 50, max: 65, label: 'Moderate' },
            orange: { min: 65, max: 80, label: 'Loud' },
            red: { min: 80, max: 120, label: 'Very Loud' }
        };
        
        // Save to backend
        const success = await SoundLevelColors.save();
        
        if (success) {
            resultDiv.textContent = 'Thresholds reset to defaults!';
            resultDiv.className = 'result-message success';
            
            // Reload UI
            loadThresholdSettings();
            
            // Refresh dashboard
            await loadDevices();
        } else {
            throw new Error('Failed to reset');
        }
    } catch (error) {
        resultDiv.textContent = 'Error resetting thresholds: ' + error.message;
        resultDiv.className = 'result-message error';
    }
    
    // Clear message after 5 seconds
    setTimeout(() => {
        resultDiv.textContent = '';
        resultDiv.className = 'result-message';
    }, 5000);
}
