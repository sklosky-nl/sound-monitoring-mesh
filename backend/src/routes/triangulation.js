/**
 * Triangulation API Routes
 * Consolidated endpoints for kiosk display and triangulation features
 */

const express = require('express');
const router = express.Router();
const SourceLocationModel = require('../models/SourceLocation');
const DeviceModel = require('../models/Device');
const MeasurementModel = require('../models/Measurement');
const TriangulationService = require('../services/triangulationService');
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

// Locate single sound source using RSS
router.get('/locate', async (req, res) => {
    try {
        const timeWindowMs = parseInt(req.query.time_window_ms) || 30000; // Default 30 seconds
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - timeWindowMs);

        // Get measurements from all devices in time window
        const devices = await DeviceModel.getAllDevices();
        const allMeasurements = [];

        for (const device of devices) {
            const measurements = await MeasurementModel.getMeasurements(
                device.device_id,
                startTime.toISOString().split('T')[0],
                endTime.toISOString().split('T')[0]
            );

            // Filter to time window and add to collection
            const filtered = measurements.filter(m => {
                const timestamp = new Date(m.timestamp);
                return timestamp >= startTime && timestamp <= endTime;
            });

            allMeasurements.push(...filtered);
        }

        if (allMeasurements.length === 0) {
            return res.json({ 
                message: 'No measurements found in time window',
                position: null 
            });
        }

        // Calculate single source position using RSS
        const position = await TriangulationService.calculateRSS(allMeasurements);

        if (!position) {
            return res.json({
                message: 'Unable to calculate source position',
                position: null
            });
        }

        const confidence = TriangulationService.calculateConfidence(allMeasurements, position);

        res.json({
            position,
            confidence,
            method: 'rss',
            measurements_used: allMeasurements.length,
            time_window_ms: timeWindowMs,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logger.error('Error locating sound source:', error);
        res.status(500).json({ error: 'Failed to locate sound source' });
    }
});

// Locate multiple simultaneous sound sources
router.get('/locate-multiple', async (req, res) => {
    try {
        const timeWindowSeconds = parseInt(req.query.time_window_seconds) || 30;
        const minConfidence = parseInt(req.query.min_confidence) || 40;
        const spatialMergeDistance = parseFloat(req.query.merge_distance) || 3.0;
        const useFrequencyBands = req.query.frequency_bands !== 'false';
        const useTemporalClustering = req.query.temporal_clustering !== 'false';

        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - timeWindowSeconds * 1000);

        // Get measurements from all devices in time window
        const devices = await DeviceModel.getAllDevices();
        const allMeasurements = [];

        for (const device of devices) {
            const measurements = await MeasurementModel.getMeasurements(
                device.device_id,
                startTime.toISOString().split('T')[0],
                endTime.toISOString().split('T')[0]
            );

            // Filter to time window
            const filtered = measurements.filter(m => {
                const timestamp = new Date(m.timestamp);
                return timestamp >= startTime && timestamp <= endTime;
            });

            allMeasurements.push(...filtered);
        }

        if (allMeasurements.length === 0) {
            return res.json({ 
                message: 'No measurements found in time window',
                sources: [] 
            });
        }

        // Locate multiple sources
        const sources = await TriangulationService.locateMultipleSources(allMeasurements, {
            timeWindowSeconds,
            minConfidence,
            spatialMergeDistance,
            useFrequencyBands,
            useTemporalClustering
        });

        res.json({
            sources,
            measurements_used: allMeasurements.length,
            time_window_seconds: timeWindowSeconds,
            timestamp: new Date().toISOString(),
            options: {
                min_confidence: minConfidence,
                merge_distance: spatialMergeDistance,
                frequency_bands_enabled: useFrequencyBands,
                temporal_clustering_enabled: useTemporalClustering
            }
        });

    } catch (error) {
        logger.error('Error locating multiple sources:', error);
        res.status(500).json({ error: 'Failed to locate multiple sources' });
    }
});

module.exports = router;
