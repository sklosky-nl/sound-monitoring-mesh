/**
 * Data API routes (measurements)
 */

const express = require('express');
const router = express.Router();
const DeviceModel = require('../models/Device');
const MeasurementModel = require('../models/Measurement');
const AlertModel = require('../models/Alert');
const logger = require('../utils/logger');

// Middleware to verify API key
// Supports both shared API key (SHARED_API_KEY env var) and per-device API keys
async function verifyApiKey(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.warn('Missing or invalid authorization header');
        return res.status(401).json({
            error: 'Missing or invalid authorization header'
        });
    }

    const apiKey = authHeader.substring(7); // Remove 'Bearer ' prefix
    const deviceId = req.body.device_id;

    if (!deviceId) {
        logger.warn('Missing device_id in request body');
        return res.status(400).json({
            error: 'Missing device_id in request body'
        });
    }

    const isValid = await DeviceModel.verifyApiKey(deviceId, apiKey);
    
    if (!isValid) {
        logger.warn(`Invalid API key for device ${deviceId}`);
        return res.status(403).json({
            error: 'Invalid API key or device_id'
        });
    }

    next();
}

// Submit measurement data
router.post('/measurements', verifyApiKey, async (req, res) => {
    try {
        const { device_id, timestamp, db_level, db_level_raw, frequency_bands, firmware_version } = req.body;

        if (!device_id || !timestamp || db_level === undefined) {
            return res.status(400).json({
                error: 'Missing required fields: device_id, timestamp, db_level'
            });
        }

        // Store measurement
        const measurement = await MeasurementModel.storeMeasurement({
            device_id,
            timestamp,
            db_level,
            db_level_raw: db_level_raw || db_level,
            frequency_bands: frequency_bands || []
        });

        // Update device last_seen and firmware_version
        await DeviceModel.updateLastSeen(device_id, firmware_version);

        // Check alerts
        await AlertModel.checkAlerts(measurement);

        // Get device calibration info
        const device = await DeviceModel.getDevice(device_id);

        res.json({
            status: 'success',
            message: 'Measurement stored',
            calibration_applied: device?.calibration_offset_db !== 0,
            calibration_offset: device?.calibration_offset_db || 0
        });

    } catch (error) {
        logger.error('Error storing measurement:', error);
        res.status(500).json({
            error: 'Failed to store measurement',
            message: error.message
        });
    }
});

// Get measurements for a device
router.get('/measurements/:deviceId', async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { start_date, end_date, limit } = req.query;

        let measurements;
        
        if (limit) {
            measurements = await MeasurementModel.getLatestMeasurements(deviceId, parseInt(limit));
        } else {
            measurements = await MeasurementModel.getMeasurements(
                deviceId,
                start_date,
                end_date
            );
        }

        res.json({
            device_id: deviceId,
            count: measurements.length,
            measurements
        });

    } catch (error) {
        logger.error('Error getting measurements:', error);
        res.status(500).json({
            error: 'Failed to get measurements',
            message: error.message
        });
    }
});

// Cleanup old data
router.post('/cleanup', async (req, res) => {
    try {
        const deletedCount = await MeasurementModel.cleanupOldData();
        
        res.json({
            status: 'success',
            message: 'Cleanup completed',
            deleted_files: deletedCount
        });

    } catch (error) {
        logger.error('Error during cleanup:', error);
        res.status(500).json({
            error: 'Cleanup failed',
            message: error.message
        });
    }
});

// Export measurements as CSV
router.get('/export/csv/:deviceId', async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { start_date, end_date } = req.query;

        const data = await MeasurementModel.getMeasurements(deviceId, start_date, end_date);
        const measurements = data.measurements;

        if (measurements.length === 0) {
            return res.status(404).json({
                error: 'No measurements found for the specified criteria'
            });
        }

        // Generate CSV
        let csv = 'Timestamp,Device ID,dB Level,dB Level (Raw)\n';
        measurements.forEach(m => {
            csv += `${m.timestamp},${m.device_id},${m.db_level},${m.db_level_raw || m.db_level}\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${deviceId}_measurements.csv"`);
        res.send(csv);

    } catch (error) {
        logger.error('Error exporting CSV:', error);
        res.status(500).json({
            error: 'Failed to export CSV',
            message: error.message
        });
    }
});

// Export all devices measurements as JSON
router.get('/export/json', async (req, res) => {
    try {
        const DeviceModel = require('../models/Device');
        const devices = await DeviceModel.getAllDevices();
        
        const allData = {};
        
        for (const device of devices) {
            const data = await MeasurementModel.getLatestMeasurements(device.device_id, 100);
            allData[device.device_id] = {
                device: device,
                measurements: data.measurements
            };
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="all_devices_export.json"');
        res.json(allData);

    } catch (error) {
        logger.error('Error exporting JSON:', error);
        res.status(500).json({
            error: 'Failed to export JSON',
            message: error.message
        });
    }
});

module.exports = router;
