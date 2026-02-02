/**
 * Configuration API routes
 */

const express = require('express');
const router = express.Router();
const DeviceModel = require('../models/Device');
const logger = require('../utils/logger');

// Get device configuration (frequency bands, calibration, etc.)
router.get('/devices/:deviceId/frequency-bands', async (req, res) => {
    try {
        const device = await DeviceModel.getDevice(req.params.deviceId);

        if (!device) {
            return res.status(404).json({
                error: 'Device not found'
            });
        }

        res.json({
            device_id: device.device_id,
            measurement_interval: device.measurement_interval || 5,
            calibration_offset_db: device.calibration_offset_db || 0,
            frequency_bands: device.frequency_bands || []
        });

    } catch (error) {
        logger.error('Error getting device config:', error);
        res.status(500).json({
            error: 'Failed to get device configuration',
            message: error.message
        });
    }
});

// Update device frequency bands configuration
router.put('/devices/:deviceId/frequency-bands', async (req, res) => {
    try {
        const { frequency_bands, measurement_interval, calibration_offset_db } = req.body;

        const updates = {};
        if (frequency_bands) updates.frequency_bands = frequency_bands;
        if (measurement_interval !== undefined) updates.measurement_interval = measurement_interval;
        if (calibration_offset_db !== undefined) updates.calibration_offset_db = calibration_offset_db;

        const device = await DeviceModel.updateDevice(req.params.deviceId, updates);

        if (!device) {
            return res.status(404).json({
                error: 'Device not found'
            });
        }

        res.json({
            status: 'success',
            message: 'Configuration updated',
            device_id: device.device_id,
            frequency_bands: device.frequency_bands,
            measurement_interval: device.measurement_interval,
            calibration_offset_db: device.calibration_offset_db
        });

    } catch (error) {
        logger.error('Error updating device config:', error);
        res.status(500).json({
            error: 'Failed to update device configuration',
            message: error.message
        });
    }
});

// Update device calibration
router.put('/devices/:deviceId/calibration', async (req, res) => {
    try {
        const { calibration_offset_db } = req.body;

        if (calibration_offset_db === undefined) {
            return res.status(400).json({
                error: 'Missing calibration_offset_db'
            });
        }

        const device = await DeviceModel.updateDevice(req.params.deviceId, {
            calibration_offset_db
        });

        if (!device) {
            return res.status(404).json({
                error: 'Device not found'
            });
        }

        res.json({
            status: 'success',
            message: 'Calibration updated',
            device_id: device.device_id,
            calibration_offset_db: device.calibration_offset_db
        });

    } catch (error) {
        logger.error('Error updating calibration:', error);
        res.status(500).json({
            error: 'Failed to update calibration',
            message: error.message
        });
    }
});

module.exports = router;
