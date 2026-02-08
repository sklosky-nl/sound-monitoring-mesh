/**
 * Triangulation API Routes
 * Consolidated endpoints for kiosk display and triangulation features
 */

const express = require('express');
const router = express.Router();
const SourceLocationModel = require('../models/SourceLocation');
const DeviceModel = require('../models/Device');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

// Get sensor positions (for map display)
router.get('/sensors', async (req, res) => {
    try {
        const devices = await DeviceModel.getAllDevices();
        
        // Extract position information from devices
        const sensors = devices.map(device => ({
            device_id: device.device_id,
            name: device.name,
            nickname: device.nickname,
            position: device.position || null,
            status: device.status || 'unknown'
        })).filter(sensor => sensor.position); // Only return sensors with positions
        
        res.json(sensors);
    } catch (error) {
        logger.error('Error getting sensor positions:', error);
        res.status(500).json({ error: 'Failed to get sensor positions' });
    }
});

// Get acoustic barriers (walls, curtains)
router.get('/barriers', async (req, res) => {
    try {
        const barriersFile = path.join(__dirname, '../../data/config/barriers.json');
        
        try {
            const data = await fs.readFile(barriersFile, 'utf8');
            const barriers = JSON.parse(data);
            res.json(barriers);
        } catch (err) {
            if (err.code === 'ENOENT') {
                // File doesn't exist yet
                res.json([]);
            } else {
                throw err;
            }
        }
    } catch (error) {
        logger.error('Error getting barriers:', error);
        res.status(500).json({ error: 'Failed to get barriers' });
    }
});

// Get recent sound sources (for kiosk display)
router.get('/sources/recent', async (req, res) => {
    try {
        const minutes = parseInt(req.query.minutes) || 10;
        const limit = parseInt(req.query.limit) || 20;
        
        const locations = await SourceLocationModel.getRecentLocations(minutes);
        
        // Limit results
        const limitedLocations = locations.slice(0, limit);
        
        res.json(limitedLocations);
    } catch (error) {
        logger.error('Error getting recent sources:', error);
        res.status(500).json({ error: 'Failed to get recent sources' });
    }
});

// Get kiosk display data (all-in-one endpoint)
router.get('/kiosk/data', async (req, res) => {
    try {
        // Fetch all data needed for kiosk display
        const [devices, sensors, sources, barriers] = await Promise.all([
            DeviceModel.getAllDevices(),
            getSensorPositions(),
            SourceLocationModel.getRecentLocations(10),
            getBarriers()
        ]);
        
        res.json({
            devices,
            sensors,
            sources: sources.slice(0, 20), // Limit to 20 most recent
            barriers,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        logger.error('Error getting kiosk data:', error);
        res.status(500).json({ error: 'Failed to get kiosk data' });
    }
});

// Helper function to get sensor positions
async function getSensorPositions() {
    const devices = await DeviceModel.getAllDevices();
    return devices
        .map(device => ({
            device_id: device.device_id,
            name: device.name,
            nickname: device.nickname,
            position: device.position || null,
            status: device.status || 'unknown'
        }))
        .filter(sensor => sensor.position);
}

// Helper function to get barriers
async function getBarriers() {
    try {
        const barriersFile = path.join(__dirname, '../../data/config/barriers.json');
        const data = await fs.readFile(barriersFile, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        if (err.code === 'ENOENT') {
            return [];
        }
        throw err;
    }
}

module.exports = router;
