/**
 * Grafana JSON Datasource API
 * Provides endpoints for Grafana to query measurement data
 * 
 * Required endpoints:
 * - GET / - Health check
 * - POST /search - Return available metrics
 * - POST /query - Return time-series data
 * - POST /annotations - Return annotations (optional)
 */

const express = require('express');
const router = express.Router();
const MeasurementModel = require('../models/Measurement');
const DeviceModel = require('../models/Device');
const logger = require('../utils/logger');

/**
 * Health check endpoint
 */
router.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'Grafana JSON datasource is running' });
});

/**
 * Search endpoint - returns available metrics/targets
 * POST /api/grafana/search
 * Body: { target: string }
 */
router.post('/search', async (req, res) => {
    try {
        const devices = await DeviceModel.getAllDevices();
        
        // Return list of available metrics
        const metrics = [];
        
        // Add per-device metrics
        devices.forEach(device => {
            const nickname = device.nickname || device.device_id;
            
            // Overall sound level metrics
            metrics.push({
                text: `${nickname} - dB Level (Avg)`,
                value: `${device.device_id}.db_level`
            });
            
            metrics.push({
                text: `${nickname} - dB Level (Peak)`,
                value: `${device.device_id}.db_level_peak`
            });
            
            // Frequency band metrics
            for (let i = 1; i <= 3; i++) {
                metrics.push({
                    text: `${nickname} - Band ${i}`,
                    value: `${device.device_id}.band_${i}`
                });
            }
        });
        
        // Add aggregate metrics
        metrics.push({ text: 'All Devices - Average dB', value: 'all.avg' });
        metrics.push({ text: 'All Devices - Max dB', value: 'all.max' });
        metrics.push({ text: 'All Devices - Min dB', value: 'all.min' });
        
        res.json(metrics);
    } catch (error) {
        logger.error('Grafana search error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Query endpoint - returns time-series data
 * POST /api/grafana/query
 * Body: {
 *   range: { from: ISO8601, to: ISO8601 },
 *   targets: [{ target: string, refId: string, type: 'timeserie' }],
 *   maxDataPoints: number
 * }
 */
router.post('/query', async (req, res) => {
    try {
        const { range, targets, maxDataPoints } = req.body;
        
        if (!range || !range.from || !range.to) {
            return res.status(400).json({ error: 'Range with from and to is required' });
        }
        
        const results = [];
        
        for (const target of targets) {
            const metric = target.target;
            
            // Parse metric: "device_id.metric_name" or "all.aggregate"
            const parts = metric.split('.');
            
            if (parts[0] === 'all') {
                // Aggregate metrics across all devices
                const aggregateData = await getAggregateData(range.from, range.to, parts[1]);
                results.push({
                    target: metric,
                    datapoints: aggregateData
                });
            } else {
                // Individual device metric
                const deviceId = parts[0];
                const metricName = parts.slice(1).join('.');
                
                const deviceData = await getDeviceMetric(deviceId, metricName, range.from, range.to);
                results.push({
                    target: metric,
                    datapoints: deviceData
                });
            }
        }
        
        res.json(results);
    } catch (error) {
        logger.error('Grafana query error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Annotations endpoint - returns event annotations
 * POST /api/grafana/annotations
 */
router.post('/annotations', async (req, res) => {
    try {
        const { range, annotation } = req.body;
        
        // For now, return empty annotations
        // Could be extended to show alert events, device offline events, etc.
        res.json([]);
    } catch (error) {
        logger.error('Grafana annotations error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Helper: Get metric data for a specific device
 */
async function getDeviceMetric(deviceId, metricName, from, to) {
    const measurements = await MeasurementModel.getMeasurements(deviceId, from, to);
    
    const datapoints = measurements.map(m => {
        let value = null;
        
        switch (metricName) {
            case 'db_level':
                value = m.db_level;
                break;
            case 'db_level_peak':
                value = m.db_level_peak || m.db_level;
                break;
            case 'band_1':
            case 'band_2':
            case 'band_3':
                const bandNum = parseInt(metricName.split('_')[1]);
                const band = m.frequency_bands?.find(b => b.band_number === bandNum);
                value = band ? band.level : null;
                break;
        }
        
        const timestamp = new Date(m.timestamp).getTime();
        return [value, timestamp];
    });
    
    return datapoints.filter(dp => dp[0] !== null);
}

/**
 * Helper: Get aggregate metric across all devices
 */
async function getAggregateData(from, to, aggregateType) {
    const devices = await DeviceModel.getAllDevices();
    
    // Create a time-indexed map to aggregate data
    const timeMap = new Map();
    
    // Collect all measurements from all devices
    for (const device of devices) {
        const measurements = await MeasurementModel.getMeasurements(device.device_id, from, to);
        
        measurements.forEach(m => {
            const timestamp = new Date(m.timestamp).getTime();
            const level = m.db_level_peak || m.db_level;
            
            if (!timeMap.has(timestamp)) {
                timeMap.set(timestamp, []);
            }
            timeMap.get(timestamp).push(level);
        });
    }
    
    // Calculate aggregate for each timestamp
    const datapoints = [];
    for (const [timestamp, values] of timeMap.entries()) {
        let aggregateValue;
        
        switch (aggregateType) {
            case 'avg':
                aggregateValue = values.reduce((a, b) => a + b, 0) / values.length;
                break;
            case 'max':
                aggregateValue = Math.max(...values);
                break;
            case 'min':
                aggregateValue = Math.min(...values);
                break;
            default:
                aggregateValue = values[0];
        }
        
        datapoints.push([aggregateValue, timestamp]);
    }
    
    // Sort by timestamp
    datapoints.sort((a, b) => a[1] - b[1]);
    
    return datapoints;
}

module.exports = router;
