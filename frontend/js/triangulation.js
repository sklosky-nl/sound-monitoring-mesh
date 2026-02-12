/**
 * Triangulation Interface JavaScript
 * Handles sensor positioning, barrier configuration, and map visualization
 */

// State for triangulation
const TriangulationState = {
    sensors: [],
    barriers: [],
    sources: [],
    labels: [],
    selectedSensor: null,
    selectedBarrier: null,
    selectedLabel: null,
    mapCanvas: null,
    mapCtx: null,
    mapScale: 50, // pixels per meter
    mapOffsetX: 0,
    mapOffsetY: 0,
    isDragging: false,
    materialPresets: {},
    playbackController: null,
    isPlaybackMode: false
};

// Initialize triangulation when tab is loaded
async function initTriangulation() {
    // Set up canvas
    TriangulationState.mapCanvas = document.getElementById('triangulationMap');
    TriangulationState.mapCtx = TriangulationState.mapCanvas.getContext('2d');
    
    // Set canvas size
    TriangulationState.mapCanvas.width = TriangulationState.mapCanvas.offsetWidth;
    TriangulationState.mapCanvas.height = 600;

    // Load data
    await loadPositions();
    await loadBarriers();
    await loadRecentSources();
    await loadMaterialPresets();
    await loadLabels();

    // Set up event listeners
    document.getElementById('configureSensorsBtn').addEventListener('click', openSensorPositionModal);
    document.getElementById('configureBarriersBtn').addEventListener('click', openBarrierModal);
    document.getElementById('configureLabelsBtn').addEventListener('click', openLabelModal);
    document.getElementById('enablePlaybackBtn').addEventListener('click', enablePlaybackMode);
    document.getElementById('triangulateNowBtn').addEventListener('click', triggerTriangulation);
    document.getElementById('resetViewBtn').addEventListener('click', resetMapView);
    
    document.getElementById('timeRangeSelect').addEventListener('change', () => loadRecentSources());
    document.getElementById('showSensors').addEventListener('change', () => drawMap());
    document.getElementById('showBarriers').addEventListener('change', () => drawMap());
    document.getElementById('showLabels').addEventListener('change', () => drawMap());
    document.getElementById('showSources').addEventListener('change', () => drawMap());
    document.getElementById('showHeatmap').addEventListener('change', () => drawMap());

    // Map canvas interactions
    TriangulationState.mapCanvas.addEventListener('mousedown', handleMapMouseDown);
    TriangulationState.mapCanvas.addEventListener('mousemove', handleMapMouseMove);
    TriangulationState.mapCanvas.addEventListener('mouseup', handleMapMouseUp);
    TriangulationState.mapCanvas.addEventListener('wheel', handleMapWheel);

    // Initial draw
    drawMap();
    updateTriangulationStats();
}

// Load sensor positions
async function loadPositions() {
    try {
        TriangulationState.sensors = await API.getSensorPositions();
        updateSensorStatusList();
    } catch (error) {
        console.error('Error loading positions:', error);
    }
}

// Load barriers
async function loadBarriers() {
    try {
        TriangulationState.barriers = await API.getBarriers();
    } catch (error) {
        console.error('Error loading barriers:', error);
    }
}

// Load map labels
async function loadLabels() {
    try {
        TriangulationState.labels = await API.getLabels();
    } catch (error) {
        console.error('Error loading labels:', error);
    }
}

// Load recent sound sources
async function loadRecentSources() {
    try {
        const minutes = parseInt(document.getElementById('timeRangeSelect').value);
        TriangulationState.sources = await API.getRecentSources(minutes);
        updateSourcesList();
        drawMap();
    } catch (error) {
        console.error('Error loading sources:', error);
    }
}

// Load material presets
async function loadMaterialPresets() {
    try {
        const presets = await API.getMaterialPresets();
        TriangulationState.materialPresets = {};
        presets.forEach(p => {
            TriangulationState.materialPresets[p.material] = p;
        });
    } catch (error) {
        console.error('Error loading material presets:', error);
    }
}

// Draw the map
function drawMap() {
    const ctx = TriangulationState.mapCtx;
    const canvas = TriangulationState.mapCanvas;
    const scale = TriangulationState.mapScale;
    const offsetX = TriangulationState.mapOffsetX + canvas.width / 2;
    const offsetY = TriangulationState.mapOffsetY + canvas.height / 2;

    // Clear canvas
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += scale) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += scale) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Draw origin
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(offsetX - 10, offsetY);
    ctx.lineTo(offsetX + 10, offsetY);
    ctx.moveTo(offsetX, offsetY - 10);
    ctx.lineTo(offsetX, offsetY + 10);
    ctx.stroke();
    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    ctx.fillText('(0,0)', offsetX + 5, offsetY - 5);

    // Draw barriers
    if (document.getElementById('showBarriers').checked) {
        for (const barrier of TriangulationState.barriers) {
            drawBarrier(barrier, offsetX, offsetY, scale);
        }
    }

    // Draw labels
    if (document.getElementById('showLabels').checked) {
        for (const label of TriangulationState.labels) {
            if (label.visible !== false) {
                drawLabel(label, offsetX, offsetY, scale);
            }
        }
    }

    // Draw sound sources
    if (document.getElementById('showSources').checked) {
        for (const source of TriangulationState.sources) {
            drawSource(source, offsetX, offsetY, scale);
        }
    }

    // Draw sensors
    if (document.getElementById('showSensors').checked) {
        for (const sensor of TriangulationState.sensors) {
            drawSensor(sensor, offsetX, offsetY, scale);
        }
    }

    // Draw scale legend
    ctx.fillStyle = '#000';
    ctx.font = '14px Arial';
    ctx.fillText(`Scale: ${scale}px = 1m`, 10, canvas.height - 10);
}

// Draw a sensor on the map
function drawSensor(sensor, offsetX, offsetY, scale) {
    const ctx = TriangulationState.mapCtx;
    const x = offsetX + sensor.position.x * scale;
    const y = offsetY - sensor.position.y * scale; // Flip Y for canvas coords

    // Draw sensor circle
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw border
    ctx.strokeStyle = '#2E7D32';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw label
    ctx.fillStyle = '#000';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(sensor.nickname || sensor.name || sensor.device_id, x + 12, y + 4);

    // Draw coordinates
    ctx.font = '10px Arial';
    ctx.fillStyle = '#666';
    ctx.fillText(`(${sensor.position.x.toFixed(1)}, ${sensor.position.y.toFixed(1)})`, x + 12, y + 16);
}

// Draw a barrier on the map
function drawBarrier(barrier, offsetX, offsetY, scale) {
    const ctx = TriangulationState.mapCtx;
    
    if (barrier.geometry.type === 'line' && barrier.geometry.start && barrier.geometry.end) {
        const x1 = offsetX + barrier.geometry.start.x * scale;
        const y1 = offsetY - barrier.geometry.start.y * scale;
        const x2 = offsetX + barrier.geometry.end.x * scale;
        const y2 = offsetY - barrier.geometry.end.y * scale;

        // Choose color/style based on type
        let strokeStyle = '#333';
        let lineWidth = 4;
        let lineDash = [];

        if (barrier.type === 'curtain') {
            strokeStyle = '#FF9800';
            lineWidth = 3;
            lineDash = [10, 5]; // Dashed for curtains
        } else if (barrier.type === 'wall') {
            strokeStyle = '#795548';
            lineWidth = 6;
        } else if (barrier.type === 'window') {
            strokeStyle = '#2196F3';
            lineWidth = 3;
        }

        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.setLineDash(lineDash);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw label
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        ctx.fillStyle = strokeStyle;
        ctx.font = '11px Arial';
        ctx.fillText(barrier.name, midX + 5, midY - 5);
        ctx.font = '9px Arial';
        ctx.fillStyle = '#666';
        ctx.fillText(`${barrier.acoustic_properties.transmission_loss_db}dB`, midX + 5, midY + 5);
    }
}

// Draw a sound source on the map
function drawSource(source, offsetX, offsetY, scale) {
    const ctx = TriangulationState.mapCtx;
    const x = offsetX + source.position.x * scale;
    const y = offsetY - source.position.y * scale;

    // Color based on confidence
    let color = '#F44336'; // Red for low confidence
    if (source.confidence > 70) color = '#4CAF50'; // Green for high
    else if (source.confidence > 40) color = '#FFC107'; // Yellow for medium

    // Draw confidence circle
    const radius = 15 + (source.sound_characteristics.peak_db - 60) / 5;
    ctx.fillStyle = color + '40'; // Semi-transparent
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();

    // Draw source marker
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, 2 * Math.PI);
    ctx.fill();

    // Draw border
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw label
    ctx.fillStyle = color;
    ctx.font = 'bold 11px Arial';
    const time = new Date(source.timestamp).toLocaleTimeString();
    ctx.fillText(`${source.sound_characteristics.peak_db.toFixed(0)}dB`, x + 10, y);
    ctx.font = '9px Arial';
    ctx.fillText(`${source.confidence.toFixed(0)}% @ ${time}`, x + 10, y + 12);
}

// Draw a label on the map
function drawLabel(label, offsetX, offsetY, scale) {
    const ctx = TriangulationState.mapCtx;
    const x = offsetX + label.position.x * scale;
    const y = offsetY - label.position.y * scale;

    const style = label.style || {};
    const fontSize = style.fontSize || 14;
    const fontWeight = style.fontWeight || 'normal';
    const color = style.color || '#ffffff';
    const bgColor = style.backgroundColor || '#333333';
    const padding = style.padding || 8;
    const borderRadius = style.borderRadius || 4;
    const opacity = style.opacity || 0.9;

    // Set font for measuring text
    ctx.font = `${fontWeight} ${fontSize}px Arial`;
    const textMetrics = ctx.measureText(label.text);
    const textWidth = textMetrics.width;
    const textHeight = fontSize;

    // Draw background rectangle with opacity
    ctx.globalAlpha = opacity;
    ctx.fillStyle = bgColor;
    
    // Draw rounded rectangle (with fallback for older browsers)
    if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(
            x - padding,
            y - textHeight - padding,
            textWidth + padding * 2,
            textHeight + padding * 2,
            borderRadius
        );
        ctx.fill();
    } else {
        // Fallback for browsers without roundRect
        ctx.fillRect(
            x - padding,
            y - textHeight - padding,
            textWidth + padding * 2,
            textHeight + padding * 2
        );
    }

    // Draw text
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = color;
    ctx.fillText(label.text, x, y);

    // Add subtle shadow for visibility
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillText(label.text, x, y);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}

// Map interaction handlers
function handleMapMouseDown(e) {
    TriangulationState.isDragging = true;
}

function handleMapMouseMove(e) {
    if (TriangulationState.isDragging) {
        TriangulationState.mapOffsetX += e.movementX;
        TriangulationState.mapOffsetY += e.movementY;
        drawMap();
    }
}

function handleMapMouseUp(e) {
    TriangulationState.isDragging = false;
}

function handleMapWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    TriangulationState.mapScale *= delta;
    TriangulationState.mapScale = Math.max(10, Math.min(200, TriangulationState.mapScale));
    drawMap();
}

function resetMapView() {
    TriangulationState.mapScale = 50;
    TriangulationState.mapOffsetX = 0;
    TriangulationState.mapOffsetY = 0;
    drawMap();
}

// Update sensor status list
function updateSensorStatusList() {
    const container = document.getElementById('sensorStatusList');
    container.innerHTML = '';

    for (const sensor of TriangulationState.sensors) {
        const item = document.createElement('div');
        item.className = 'sensor-status-item';
        
        const calibrated = sensor.position.calibrated ? '✓' : '✗';
        const calibratedClass = sensor.position.calibrated ? 'calibrated' : 'not-calibrated';
        
        item.innerHTML = `
            <strong>${sensor.nickname || sensor.name}</strong>
            <div class="sensor-coords">
                Position: (${sensor.position.x.toFixed(1)}, ${sensor.position.y.toFixed(1)}, ${sensor.position.z.toFixed(1)})m
            </div>
            <div class="sensor-status ${calibratedClass}">
                Calibrated: ${calibrated}
            </div>
        `;
        container.appendChild(item);
    }
}

// Update sources list
function updateSourcesList() {
    const container = document.getElementById('sourcesList');
    
    if (TriangulationState.sources.length === 0) {
        container.innerHTML = '<p class="empty-message">No sound sources detected in time range</p>';
        return;
    }

    container.innerHTML = '';
    for (const source of TriangulationState.sources) {
        const item = document.createElement('div');
        item.className = 'source-item';
        
        const time = new Date(source.timestamp).toLocaleString();
        const methodLabel = source.localization_method.toUpperCase();
        
        item.innerHTML = `
            <div class="source-header">
                <strong>${source.sound_characteristics.peak_db.toFixed(1)} dB</strong>
                <span class="source-time">${time}</span>
            </div>
            <div class="source-position">
                Position: (${source.position.x.toFixed(1)}, ${source.position.y.toFixed(1)})m
            </div>
            <div class="source-details">
                <span class="badge">Confidence: ${source.confidence.toFixed(0)}%</span>
                <span class="badge">${methodLabel}</span>
                <span class="badge">${source.contributing_sensors.length} sensors</span>
            </div>
        `;
        
        container.appendChild(item);
    }
}

// Update triangulation statistics
async function updateTriangulationStats() {
    document.getElementById('totalEvents').textContent = TriangulationState.sources.length;
    
    if (TriangulationState.sources.length > 0) {
        const avgConf = TriangulationState.sources.reduce((sum, s) => sum + s.confidence, 0) / TriangulationState.sources.length;
        document.getElementById('avgConfidence').textContent = avgConf.toFixed(0) + '%';
    } else {
        document.getElementById('avgConfidence').textContent = '0%';
    }
    
    document.getElementById('activeSensors').textContent = TriangulationState.sensors.filter(s => s.position.calibrated).length;
    document.getElementById('totalBarriers').textContent = TriangulationState.barriers.length;
}

// Open sensor position modal
async function openSensorPositionModal() {
    await loadPositions();
    populateSensorPositionList();
    document.getElementById('sensorPositionModal').style.display = 'block';
}

// Populate sensor position list in modal
function populateSensorPositionList() {
    const container = document.getElementById('sensorPositionList');
    container.innerHTML = '';

    for (const sensor of TriangulationState.sensors) {
        const item = document.createElement('div');
        item.className = 'position-list-item';
        item.innerHTML = `
            <strong>${sensor.nickname || sensor.name}</strong>
            <div>${sensor.position.x.toFixed(1)}, ${sensor.position.y.toFixed(1)}</div>
        `;
        item.onclick = () => editSensorPosition(sensor);
        container.appendChild(item);
    }
}

// Edit sensor position
function editSensorPosition(sensor) {
    document.getElementById('positionDeviceId').value = sensor.device_id;
    document.getElementById('positionDeviceName').textContent = sensor.nickname || sensor.name;
    document.getElementById('positionX').value = sensor.position.x;
    document.getElementById('positionY').value = sensor.position.y;
    document.getElementById('positionZ').value = sensor.position.z;
    document.getElementById('positionHeight').value = sensor.position.installation_height;
    document.getElementById('positionSystem').value = sensor.position.coordinate_system;
    document.getElementById('positionAccuracy').value = sensor.position.position_accuracy;
    document.getElementById('positionNotes').value = sensor.position.notes || '';
}

// Handle position form submission
document.getElementById('positionForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const deviceId = document.getElementById('positionDeviceId').value;
    const positionData = {
        x: parseFloat(document.getElementById('positionX').value),
        y: parseFloat(document.getElementById('positionY').value),
        z: parseFloat(document.getElementById('positionZ').value),
        coordinate_system: document.getElementById('positionSystem').value,
        installation_height: parseFloat(document.getElementById('positionHeight').value),
        position_accuracy: parseFloat(document.getElementById('positionAccuracy').value),
        notes: document.getElementById('positionNotes').value
    };

    try {
        await API.updateSensorPosition(deviceId, positionData);
        document.getElementById('positionResult').textContent = 'Position saved successfully!';
        document.getElementById('positionResult').className = 'result-message success';
        
        setTimeout(async () => {
            await loadPositions();
            populateSensorPositionList();
            drawMap();
            updateSensorStatusList();
        }, 500);
    } catch (error) {
        document.getElementById('positionResult').textContent = 'Error: ' + error.message;
        document.getElementById('positionResult').className = 'result-message error';
    }
});

// Open barrier modal
async function openBarrierModal() {
    await loadBarriers();
    populateBarrierList();
    document.getElementById('barrierModal').style.display = 'block';
}

// Populate barrier list
function populateBarrierList() {
    const container = document.getElementById('barrierListItems');
    container.innerHTML = '';

    for (const barrier of TriangulationState.barriers) {
        const item = document.createElement('div');
        item.className = 'barrier-list-item';
        item.innerHTML = `
            <strong>${barrier.name}</strong>
            <div>${barrier.type} - ${barrier.material}</div>
        `;
        item.onclick = () => editBarrier(barrier);
        container.appendChild(item);
    }
}

// Edit barrier
function editBarrier(barrier) {
    document.getElementById('barrierId').value = barrier.id;
    document.getElementById('barrierEditorTitle').textContent = 'Edit Barrier';
    document.getElementById('barrierName').value = barrier.name;
    document.getElementById('barrierType').value = barrier.type;
    document.getElementById('barrierMaterial').value = barrier.material;
    document.getElementById('barrierStartX').value = barrier.geometry.start.x;
    document.getElementById('barrierStartY').value = barrier.geometry.start.y;
    document.getElementById('barrierEndX').value = barrier.geometry.end.x;
    document.getElementById('barrierEndY').value = barrier.geometry.end.y;
    document.getElementById('barrierHeight').value = barrier.geometry.height;
    document.getElementById('barrierThickness').value = barrier.geometry.thickness;
    document.getElementById('barrierTransmissionLoss').value = barrier.acoustic_properties.transmission_loss_db;
    document.getElementById('barrierNotes').value = barrier.notes || '';
    document.getElementById('deleteBarrierBtn').style.display = 'inline-block';
}

// Add new barrier
document.getElementById('addBarrierBtn')?.addEventListener('click', () => {
    document.getElementById('barrierId').value = '';
    document.getElementById('barrierEditorTitle').textContent = 'New Barrier';
    document.getElementById('barrierForm').reset();
    document.getElementById('deleteBarrierBtn').style.display = 'none';
});

// Update transmission loss when material changes
document.getElementById('barrierMaterial')?.addEventListener('change', (e) => {
    const material = e.target.value;
    const preset = TriangulationState.materialPresets[material];
    if (preset) {
        document.getElementById('barrierTransmissionLoss').value = preset.transmission_loss_db;
    }
});

// Handle barrier form submission
document.getElementById('barrierForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const barrierId = document.getElementById('barrierId').value;
    const barrierData = {
        name: document.getElementById('barrierName').value,
        type: document.getElementById('barrierType').value,
        material: document.getElementById('barrierMaterial').value,
        geometry: {
            type: 'line',
            start: {
                x: parseFloat(document.getElementById('barrierStartX').value),
                y: parseFloat(document.getElementById('barrierStartY').value),
                z: 0
            },
            end: {
                x: parseFloat(document.getElementById('barrierEndX').value),
                y: parseFloat(document.getElementById('barrierEndY').value),
                z: 0
            },
            height: parseFloat(document.getElementById('barrierHeight').value),
            thickness: parseFloat(document.getElementById('barrierThickness').value)
        },
        acoustic_properties: {
            transmission_loss_db: parseFloat(document.getElementById('barrierTransmissionLoss').value),
            reflection_coefficient: 0.7,
            absorption_coefficient: 0.1
        },
        notes: document.getElementById('barrierNotes').value
    };

    try {
        if (barrierId) {
            await API.updateBarrier(barrierId, barrierData);
            document.getElementById('barrierResult').textContent = 'Barrier updated successfully!';
        } else {
            await API.createBarrier(barrierData);
            document.getElementById('barrierResult').textContent = 'Barrier created successfully!';
        }
        document.getElementById('barrierResult').className = 'result-message success';
        
        setTimeout(async () => {
            await loadBarriers();
            populateBarrierList();
            drawMap();
            updateTriangulationStats();
        }, 500);
    } catch (error) {
        document.getElementById('barrierResult').textContent = 'Error: ' + error.message;
        document.getElementById('barrierResult').className = 'result-message error';
    }
});

// Delete barrier
document.getElementById('deleteBarrierBtn')?.addEventListener('click', async () => {
    const barrierId = document.getElementById('barrierId').value;
    if (!barrierId) return;
    
    if (confirm('Are you sure you want to delete this barrier?')) {
        try {
            await API.deleteBarrier(barrierId);
            document.getElementById('barrierResult').textContent = 'Barrier deleted successfully!';
            document.getElementById('barrierResult').className = 'result-message success';
            
            setTimeout(async () => {
                await loadBarriers();
                populateBarrierList();
                document.getElementById('barrierForm').reset();
                drawMap();
                updateTriangulationStats();
            }, 500);
        } catch (error) {
            document.getElementById('barrierResult').textContent = 'Error: ' + error.message;
            document.getElementById('barrierResult').className = 'result-message error';
        }
    }
});

// Cancel barrier editing
document.getElementById('cancelBarrierBtn')?.addEventListener('click', () => {
    document.getElementById('barrierForm').reset();
    document.getElementById('barrierId').value = '';
    document.getElementById('barrierEditorTitle').textContent = 'New Barrier';
});

// Trigger manual triangulation
async function triggerTriangulation() {
    const btn = document.getElementById('triangulateNowBtn');
    btn.disabled = true;
    btn.textContent = 'Triangulating...';
    
    try {
        // Get events from last 5 minutes
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - 5 * 60 * 1000);
        
        const result = await API.triangulateNow(startTime.toISOString(), endTime.toISOString());
        
        alert(`Triangulation complete!\nEvents processed: ${result.events_processed}\nLocations found: ${result.locations_found}`);
        
        await loadRecentSources();
        drawMap();
        updateTriangulationStats();
    } catch (error) {
        alert('Error: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = 'Triangulate Now';
    }
}

// ============ LABEL MANAGEMENT ============

// Open label modal
async function openLabelModal() {
    await loadLabels();
    populateLabelList();
    document.getElementById('labelModal').style.display = 'block';
}

// Populate label list
function populateLabelList() {
    const container = document.getElementById('labelListItems');
    container.innerHTML = '';

    for (const label of TriangulationState.labels) {
        const item = document.createElement('div');
        item.className = 'barrier-list-item';
        item.innerHTML = `
            <strong>${label.text}</strong>
            <div>Position: ${label.position.x.toFixed(1)}, ${label.position.y.toFixed(1)}</div>
        `;
        item.onclick = () => editLabel(label);
        container.appendChild(item);
    }
}

// Edit label
function editLabel(label) {
    document.getElementById('labelId').value = label.id;
    document.getElementById('labelEditorTitle').textContent = 'Edit Label';
    document.getElementById('labelText').value = label.text;
    document.getElementById('labelX').value = label.position.x;
    document.getElementById('labelY').value = label.position.y;
    
    const style = label.style || {};
    document.getElementById('labelFontSize').value = style.fontSize || 14;
    document.getElementById('labelFontWeight').value = style.fontWeight || 'normal';
    document.getElementById('labelColor').value = style.color || '#ffffff';
    document.getElementById('labelBgColor').value = style.backgroundColor || '#333333';
    document.getElementById('labelPadding').value = style.padding || 8;
    document.getElementById('labelOpacity').value = style.opacity || 0.9;
    document.getElementById('labelBorderRadius').value = style.borderRadius || 4;
    document.getElementById('labelVisible').checked = label.visible !== false;
    
    document.getElementById('deleteLabelBtn').style.display = 'inline-block';
}

// Add new label
document.getElementById('addLabelBtn')?.addEventListener('click', () => {
    document.getElementById('labelId').value = '';
    document.getElementById('labelEditorTitle').textContent = 'New Label';
    document.getElementById('labelForm').reset();
    document.getElementById('deleteLabelBtn').style.display = 'none';
});

// Handle label form submission
document.getElementById('labelForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const labelId = document.getElementById('labelId').value;
    const labelData = {
        text: document.getElementById('labelText').value,
        position: {
            x: parseFloat(document.getElementById('labelX').value),
            y: parseFloat(document.getElementById('labelY').value)
        },
        style: {
            fontSize: parseInt(document.getElementById('labelFontSize').value),
            fontWeight: document.getElementById('labelFontWeight').value,
            color: document.getElementById('labelColor').value,
            backgroundColor: document.getElementById('labelBgColor').value,
            padding: parseInt(document.getElementById('labelPadding').value),
            borderRadius: parseInt(document.getElementById('labelBorderRadius').value),
            opacity: parseFloat(document.getElementById('labelOpacity').value)
        },
        visible: document.getElementById('labelVisible').checked
    };

    try {
        if (labelId) {
            await API.updateLabel(labelId, labelData);
            document.getElementById('labelResult').textContent = 'Label updated successfully!';
        } else {
            await API.createLabel(labelData);
            document.getElementById('labelResult').textContent = 'Label created successfully!';
        }
        document.getElementById('labelResult').className = 'result-message success';
        
        setTimeout(async () => {
            await loadLabels();
            populateLabelList();
            drawMap();
        }, 500);
    } catch (error) {
        document.getElementById('labelResult').textContent = 'Error: ' + error.message;
        document.getElementById('labelResult').className = 'result-message error';
    }
});

// Delete label
document.getElementById('deleteLabelBtn')?.addEventListener('click', async () => {
    const labelId = document.getElementById('labelId').value;
    if (!labelId) return;
    
    if (confirm('Are you sure you want to delete this label?')) {
        try {
            await API.deleteLabel(labelId);
            document.getElementById('labelResult').textContent = 'Label deleted successfully!';
            document.getElementById('labelResult').className = 'result-message success';
            
            setTimeout(async () => {
                await loadLabels();
                populateLabelList();
                document.getElementById('labelForm').reset();
                drawMap();
            }, 500);
        } catch (error) {
            document.getElementById('labelResult').textContent = 'Error: ' + error.message;
            document.getElementById('labelResult').className = 'result-message error';
        }
    }
});

// Cancel label editing
document.getElementById('cancelLabelBtn')?.addEventListener('click', () => {
    document.getElementById('labelForm').reset();
    document.getElementById('labelId').value = '';
    document.getElementById('labelEditorTitle').textContent = 'New Label';
    document.getElementById('deleteLabelBtn').style.display = 'none';
});

// ========================================
// Historical Playback Functions (v2.0.0)
// ========================================

async function enablePlaybackMode() {
    try {
        // Show playback section
        document.getElementById('playbackSection').style.display = 'block';
        TriangulationState.isPlaybackMode = true;
        
        // Initialize playback controller if not already done
        if (!TriangulationState.playbackController) {
            TriangulationState.playbackController = new PlaybackController();
            
            // Set up callbacks
            TriangulationState.playbackController.onTimeUpdate = updatePlaybackTime;
            TriangulationState.playbackController.onDataLoad = updatePlaybackData;
            TriangulationState.playbackController.onPlayStateChange = updatePlaybackPlayButton;
            TriangulationState.playbackController.onRangeUpdate = updatePlaybackDateInputs;
            
            // Initialize playback controls
            setupPlaybackControls();
            
            // Initialize the controller
            const success = await TriangulationState.playbackController.initialize();
            
            if (!success) {
                alert('No historical data available for playback');
                exitPlaybackMode();
                return;
            }
        }
        
        // Disable live updates
        document.getElementById('timeRangeSelect').disabled = true;
        document.getElementById('triangulateNowBtn').disabled = true;
        
        console.log('Playback mode enabled');
    } catch (error) {
        console.error('Error enabling playback mode:', error);
        alert('Failed to enable playback mode: ' + error.message);
    }
}

function exitPlaybackMode() {
    document.getElementById('playbackSection').style.display = 'none';
    TriangulationState.isPlaybackMode = false;
    
    if (TriangulationState.playbackController) {
        TriangulationState.playbackController.pause();
    }
    
    // Re-enable live updates
    document.getElementById('timeRangeSelect').disabled = false;
    document.getElementById('triangulateNowBtn').disabled = false;
    
    // Reload live data
    loadRecentSources();
    
    console.log('Playback mode exited');
}

function setupPlaybackControls() {
    // Exit playback button
    document.getElementById('exitPlaybackBtn').addEventListener('click', exitPlaybackMode);
    
    // Load data button
    document.getElementById('loadPlaybackDataBtn').addEventListener('click', loadPlaybackTimeRange);
    
    // Transport controls
    document.getElementById('skipToStartBtn').addEventListener('click', () => {
        TriangulationState.playbackController.skipToStart();
    });
    
    document.getElementById('jogBackwardBtn').addEventListener('click', () => {
        TriangulationState.playbackController.jogBackward(1);
    });
    
    document.getElementById('playPauseBtn').addEventListener('click', () => {
        if (TriangulationState.playbackController.isPlaying) {
            TriangulationState.playbackController.pause();
        } else {
            TriangulationState.playbackController.play();
        }
    });
    
    document.getElementById('jogForwardBtn').addEventListener('click', () => {
        TriangulationState.playbackController.jogForward(1);
    });
    
    document.getElementById('skipToEndBtn').addEventListener('click', () => {
        TriangulationState.playbackController.skipToEnd();
    });
    
    // Timeline slider
    const timelineSlider = document.getElementById('timelineSlider');
    let isSliderDragging = false;
    
    timelineSlider.addEventListener('mousedown', () => {
        isSliderDragging = true;
        if (TriangulationState.playbackController.isPlaying) {
            TriangulationState.playbackController.pause();
        }
    });
    
    timelineSlider.addEventListener('mouseup', () => {
        isSliderDragging = false;
    });
    
    timelineSlider.addEventListener('input', (e) => {
        if (!TriangulationState.playbackController) return;
        
        const progress = parseFloat(e.target.value);
        const duration = TriangulationState.playbackController.getDuration();
        const newTime = new Date(
            TriangulationState.playbackController.startTime.getTime() + 
            (duration * progress / 100)
        );
        
        TriangulationState.playbackController.seek(newTime);
    });
    
    // Speed buttons
    document.querySelectorAll('.speed-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const speed = parseFloat(e.target.dataset.speed);
            TriangulationState.playbackController.setSpeed(speed);
            
            // Update active state
            document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });
    });
}

function loadPlaybackTimeRange() {
    const startDate = document.getElementById('playbackStartDate').value;
    const startTime = document.getElementById('playbackStartTime').value;
    const endDate = document.getElementById('playbackEndDate').value;
    const endTime = document.getElementById('playbackEndTime').value;
    
    if (!startDate || !startTime || !endDate || !endTime) {
        alert('Please fill in all date/time fields');
        return;
    }
    
    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);
    
    if (end <= start) {
        alert('End time must be after start time');
        return;
    }
    
    // Update playback controller time range
    TriangulationState.playbackController.startTime = start;
    TriangulationState.playbackController.endTime = end;
    TriangulationState.playbackController.currentTime = new Date(start);
    
    // Clear cache and reload
    TriangulationState.playbackController.clearCache();
    TriangulationState.playbackController.updateCurrentFrame();
    
    console.log(`Loaded playback range: ${start.toISOString()} to ${end.toISOString()}`);
}

function updatePlaybackTime(time) {
    // Update time display
    document.getElementById('currentTimeDisplay').textContent = formatPlaybackTime(time);
    
    // Update timeline slider
    const progress = TriangulationState.playbackController.getProgress();
    document.getElementById('timelineSlider').value = progress;
}

function updatePlaybackData(data) {
    // Update map with historical data
    if (data.deviceStates) {
        // Update sensor states
        TriangulationState.sensors = data.deviceStates.filter(d => d.position).map(d => ({
            device_id: d.device_id,
            nickname: d.nickname,
            position: d.position,
            status: d.active ? 'active' : 'offline'
        }));
        
        updateSensorStatusList();
    }
    
    if (data.sources) {
        // Update sound sources
        TriangulationState.sources = data.sources;
        updateSourcesList();
    }
    
    // Redraw map
    drawMap();
}

function updatePlaybackPlayButton(isPlaying) {
    const btn = document.getElementById('playPauseBtn');
    btn.textContent = isPlaying ? '⏸' : '▶';
}

function updatePlaybackDateInputs(range) {
    // Set date inputs to available range
    const startDate = range.start.toISOString().split('T')[0];
    const startTime = range.start.toISOString().split('T')[1].split('.')[0];
    const endDate = range.end.toISOString().split('T')[0];
    const endTime = range.end.toISOString().split('T')[1].split('.')[0];
    
    document.getElementById('playbackStartDate').value = startDate;
    document.getElementById('playbackStartTime').value = startTime;
    document.getElementById('playbackEndDate').value = endDate;
    document.getElementById('playbackEndTime').value = endTime;
    
    // Update duration display
    document.getElementById('durationDisplay').textContent = 
        `${range.totalDays} days (${formatPlaybackDuration(range.end.getTime() - range.start.getTime())})`;
}

function formatPlaybackTime(date) {
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

function formatPlaybackDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

