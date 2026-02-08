/**
 * Device API routes
 */

const express = require('express');
const router = express.Router();
const DeviceModel = require('../models/Device');
const MeasurementModel = require('../models/Measurement');
const logger = require('../utils/logger');

// Register a new device
router.post('/register', async (req, res) => {
    try {
        const { device_id, mac_address, name, location } = req.body;

        if (!device_id || !mac_address) {
            return res.status(400).json({
                error: 'Missing required fields: device_id and mac_address'
            });
        }

        // Check if device already exists
        const existing = await DeviceModel.getDevice(device_id);
        if (existing) {
            return res.status(409).json({
                error: 'Device already registered',
                device_id: device_id
            });
        }

        const device = await DeviceModel.registerDevice({
            device_id,
            mac_address,
            name,
            location
        });

        res.status(201).json({
            device_id: device.device_id,
            api_key: device.api_key,
            status: 'registered'
        });

    } catch (error) {
        logger.error('Error registering device:', error);
        res.status(500).json({
            error: 'Failed to register device',
            message: error.message
        });
    }
});

// Get all devices
router.get('/', async (req, res) => {
    try {
        const devices = await DeviceModel.getAllDevices();
        
        // Fetch latest measurement for each device
        const devicesWithMeasurements = await Promise.all(devices.map(async (device) => {
            try {
                const measurements = await MeasurementModel.getLatestMeasurements(device.device_id, 1);
                return {
                    ...device,
                    latest_measurement: measurements.length > 0 ? measurements[0] : null
                };
            } catch (err) {
                logger.warn(`Failed to fetch measurement for ${device.device_id}:`, err.message);
                return {
                    ...device,
                    latest_measurement: null
                };
            }
        }));
        
        res.json(devicesWithMeasurements);
    } catch (error) {
        logger.error('Error getting devices:', error);
        res.status(500).json({
            error: 'Failed to get devices',
            message: error.message
        });
    }
});

// Get a specific device
router.get('/:deviceId', async (req, res) => {
    try {
        const device = await DeviceModel.getDevice(req.params.deviceId);
        
        if (!device) {
            return res.status(404).json({
                error: 'Device not found'
            });
        }

        res.json(device);
    } catch (error) {
        logger.error('Error getting device:', error);
        res.status(500).json({
            error: 'Failed to get device',
            message: error.message
        });
    }
});

// Update device configuration
router.put('/:deviceId', async (req, res) => {
    try {
        const updates = req.body;
        const device = await DeviceModel.updateDevice(req.params.deviceId, updates);

        if (!device) {
            return res.status(404).json({
                error: 'Device not found'
            });
        }

        res.json(device);
    } catch (error) {
        logger.error('Error updating device:', error);
        res.status(500).json({
            error: 'Failed to update device',
            message: error.message
        });
    }
});

// Update device nickname
router.patch('/:deviceId/nickname', async (req, res) => {
    try {
        const { nickname } = req.body;
        
        if (!nickname) {
            return res.status(400).json({
                error: 'Nickname is required'
            });
        }

        const device = await DeviceModel.updateNickname(req.params.deviceId, nickname);

        if (!device) {
            return res.status(404).json({
                error: 'Device not found'
            });
        }

        res.json(device);
    } catch (error) {
        logger.error('Error updating device nickname:', error);
        res.status(500).json({
            error: 'Failed to update device nickname',
            message: error.message
        });
    }
});

// Delete a device
router.delete('/:deviceId', async (req, res) => {
    try {
        const deleted = await DeviceModel.deleteDevice(req.params.deviceId);

        if (!deleted) {
            return res.status(404).json({
                error: 'Device not found'
            });
        }

        res.json({
            message: 'Device deleted successfully',
            device_id: req.params.deviceId
        });
    } catch (error) {
        logger.error('Error deleting device:', error);
        res.status(500).json({
            error: 'Failed to delete device',
            message: error.message
        });
    }
});

module.exports = router;
