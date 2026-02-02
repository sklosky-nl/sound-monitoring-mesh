/**
 * Analytics API routes
 */

const express = require('express');
const router = express.Router();
const MeasurementModel = require('../models/Measurement');
const logger = require('../utils/logger');

// Get analytics for a device or all devices
router.get('/stats', async (req, res) => {
    try {
        const { device_id, start_date, end_date } = req.query;
        
        const params = {};
        if (start_date) params.start_date = start_date;
        if (end_date) params.end_date = end_date;
        
        let measurements = [];
        if (device_id) {
            measurements = await MeasurementModel.getMeasurements(device_id, start_date, end_date);
        } else {
            // Get all measurements from all devices
            const DeviceModel = require('../models/Device');
            const devices = await DeviceModel.getAllDevices();
            
            for (const device of devices) {
                const deviceMeasurements = await MeasurementModel.getMeasurements(device.device_id, start_date, end_date);
                measurements = measurements.concat(deviceMeasurements);
            }
        }

        if (measurements.length === 0) {
            return res.json({
                count: 0,
                mean: 0,
                median: 0,
                min: 0,
                max: 0,
                std_dev: 0,
                percentile_25: 0,
                percentile_75: 0,
                percentile_95: 0
            });
        }

        // Calculate statistics
        const dbLevels = measurements.map(m => m.db_level).sort((a, b) => a - b);
        const count = dbLevels.length;
        const sum = dbLevels.reduce((a, b) => a + b, 0);
        const mean = sum / count;
        
        const median = count % 2 === 0
            ? (dbLevels[count / 2 - 1] + dbLevels[count / 2]) / 2
            : dbLevels[Math.floor(count / 2)];
        
        const min = dbLevels[0];
        const max = dbLevels[count - 1];
        
        // Standard deviation
        const squaredDiffs = dbLevels.map(val => Math.pow(val - mean, 2));
        const variance = squaredDiffs.reduce((a, b) => a + b, 0) / count;
        const std_dev = Math.sqrt(variance);
        
        // Percentiles
        const percentile = (p) => {
            const index = Math.ceil((p / 100) * count) - 1;
            return dbLevels[Math.max(0, index)];
        };
        
        const stats = {
            count,
            mean: parseFloat(mean.toFixed(2)),
            median: parseFloat(median.toFixed(2)),
            min: parseFloat(min.toFixed(2)),
            max: parseFloat(max.toFixed(2)),
            std_dev: parseFloat(std_dev.toFixed(2)),
            percentile_25: parseFloat(percentile(25).toFixed(2)),
            percentile_75: parseFloat(percentile(75).toFixed(2)),
            percentile_95: parseFloat(percentile(95).toFixed(2)),
            start_time: measurements[0].timestamp,
            end_time: measurements[measurements.length - 1].timestamp
        };

        res.json(stats);
    } catch (error) {
        logger.error('Error calculating analytics:', error);
        res.status(500).json({
            error: 'Failed to calculate analytics',
            message: error.message
        });
    }
});

// Get trend data for charting
router.get('/trend', async (req, res) => {
    try {
        const { device_id, start_date, end_date, interval = '1h' } = req.query;
        
        if (!device_id) {
            return res.status(400).json({
                error: 'device_id parameter is required'
            });
        }

        const params = {};
        if (start_date) params.start_date = start_date;
        if (end_date) params.end_date = end_date;
        
        const data = await MeasurementModel.getMeasurements(device_id, params);
        const measurements = data.measurements;

        // Group by time interval
        const intervals = {};
        measurements.forEach(m => {
            const date = new Date(m.timestamp);
            let key;
            
            // Simple hourly grouping
            if (interval === '1h') {
                date.setMinutes(0, 0, 0);
                key = date.toISOString();
            } else {
                key = date.toISOString().split(':')[0] + ':00:00.000Z';
            }
            
            if (!intervals[key]) {
                intervals[key] = [];
            }
            intervals[key].push(m.db_level);
        });

        // Calculate average for each interval
        const trend = Object.keys(intervals).sort().map(timestamp => ({
            timestamp,
            avg_db: parseFloat((intervals[timestamp].reduce((a, b) => a + b, 0) / intervals[timestamp].length).toFixed(2)),
            count: intervals[timestamp].length
        }));

        res.json(trend);
    } catch (error) {
        logger.error('Error calculating trend:', error);
        res.status(500).json({
            error: 'Failed to calculate trend',
            message: error.message
        });
    }
});

module.exports = router;
