/**
 * Sensor Position Routes
 * API endpoints for managing sensor positions
 */

const express = require('express');
const router = express.Router();
const DeviceModel = require('../models/Device');
const logger = require('../utils/logger');

// Get all sensor positions
router.get('/', async (req, res) => {
    try {
        const positions = await DeviceModel.getAllPositions();
        res.json(positions);
    } catch (error) {
        logger.error('Error getting positions:', error);
        res.status(500).json({ error: 'Failed to get positions' });
    }
});

// Get position for specific device
router.get('/:deviceId', async (req, res) => {
    try {
        const device = await DeviceModel.getDevice(req.params.deviceId);
        if (!device) {
            return res.status(404).json({ error: 'Device not found' });
        }
        res.json({ device_id: device.device_id, name: device.name, nickname: device.nickname, position: device.position });
    } catch (error) {
        logger.error('Error getting device position:', error);
        res.status(500).json({ error: 'Failed to get device position' });
    }
});

// Update position for specific device
router.put('/:deviceId', async (req, res) => {
    try {
        const deviceId = req.params.deviceId;
        const positionData = req.body;

        // Validate position data
        if (positionData.x !== undefined && isNaN(parseFloat(positionData.x))) {
            return res.status(400).json({ error: 'Invalid x coordinate' });
        }
        if (positionData.y !== undefined && isNaN(parseFloat(positionData.y))) {
            return res.status(400).json({ error: 'Invalid y coordinate' });
        }
        if (positionData.z !== undefined && isNaN(parseFloat(positionData.z))) {
            return res.status(400).json({ error: 'Invalid z coordinate' });
        }

        const updatedDevice = await DeviceModel.updatePosition(deviceId, positionData);
        
        if (!updatedDevice) {
            return res.status(404).json({ error: 'Device not found' });
        }

        logger.info(`Position updated for device ${deviceId}: (${positionData.x}, ${positionData.y}, ${positionData.z})`);
        res.json({ 
            message: 'Position updated successfully',
            device_id: updatedDevice.device_id,
            position: updatedDevice.position
        });
    } catch (error) {
        logger.error('Error updating position:', error);
        res.status(500).json({ error: 'Failed to update position' });
    }
});

// Batch update multiple positions
router.post('/batch', async (req, res) => {
    try {
        const updates = req.body.positions; // Array of {device_id, position}
        
        if (!Array.isArray(updates)) {
            return res.status(400).json({ error: 'Expected array of position updates' });
        }

        const results = [];
        for (const update of updates) {
            try {
                const updatedDevice = await DeviceModel.updatePosition(update.device_id, update.position);
                results.push({ device_id: update.device_id, success: true });
            } catch (error) {
                results.push({ device_id: update.device_id, success: false, error: error.message });
            }
        }

        res.json({ message: 'Batch update completed', results });
    } catch (error) {
        logger.error('Error in batch position update:', error);
        res.status(500).json({ error: 'Failed to batch update positions' });
    }
});

module.exports = router;
