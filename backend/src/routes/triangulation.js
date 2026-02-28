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

// ========================================
// Historical Playback Endpoints (v2.0.0)
// ========================================

// Get historical measurements in time range
router.get('/playback/measurements', async (req, res) => {
    try {
        const { startTime, endTime, deviceIds } = req.query;
        
        if (!startTime || !endTime) {
            return res.status(400).json({ error: 'startTime and endTime are required' });
        }
        
        const start = new Date(startTime);
        const end = new Date(endTime);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ error: 'Invalid date format' });
        }
        
        if (end <= start) {
            return res.status(400).json({ error: 'endTime must be after startTime' });
        }
        
        // Get all or specific devices
        const devices = deviceIds 
            ? deviceIds.split(',').map(id => ({ device_id: id }))
            : await DeviceModel.getAllDevices();
        
        const allMeasurements = [];
        
        for (const device of devices) {
            const measurements = await MeasurementModel.getMeasurements(
                device.device_id,
                start.toISOString().split('T')[0],
                end.toISOString().split('T')[0]
            );
            
            // Filter to exact time window
            const filtered = measurements.filter(m => {
                const timestamp = new Date(m.timestamp);
                return timestamp >= start && timestamp <= end;
            }).map(m => ({
                ...m,
                device_id: device.device_id
            }));
            
            allMeasurements.push(...filtered);
        }
        
        // Sort by timestamp
        allMeasurements.sort((a, b) => 
            new Date(a.timestamp) - new Date(b.timestamp)
        );
        
        res.json({
            measurements: allMeasurements,
            count: allMeasurements.length,
            startTime,
            endTime,
            devices: devices.length
        });
        
    } catch (error) {
        logger.error('Error getting historical measurements:', error);
        res.status(500).json({ error: 'Failed to get historical measurements' });
    }
});

// Get historical sound sources in time range
router.get('/playback/sources', async (req, res) => {
    try {
        const { startTime, endTime } = req.query;
        
        if (!startTime || !endTime) {
            return res.status(400).json({ error: 'startTime and endTime are required' });
        }
        
        const start = new Date(startTime);
        const end = new Date(endTime);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ error: 'Invalid date format' });
        }
        
        const sources = await SourceLocationModel.getLocationsByDateRange(start, end);
        
        res.json({
            sources,
            count: sources.length,
            startTime,
            endTime
        });
        
    } catch (error) {
        logger.error('Error getting historical sources:', error);
        res.status(500).json({ error: 'Failed to get historical sources' });
    }
});

// Get playback data for a specific time window (measurements + sources)
router.get('/playback/window', async (req, res) => {
    try {
        const { time, windowSeconds = 10 } = req.query;
        
        if (!time) {
            return res.status(400).json({ error: 'time parameter is required' });
        }
        
        const centerTime = new Date(time);
        if (isNaN(centerTime.getTime())) {
            return res.status(400).json({ error: 'Invalid date format' });
        }
        
        const halfWindow = parseInt(windowSeconds) * 1000 / 2;
        const startTime = new Date(centerTime.getTime() - halfWindow);
        const endTime = new Date(centerTime.getTime() + halfWindow);
        
        // Get measurements from all devices
        const devices = await DeviceModel.getAllDevices();
        const measurements = [];
        
        for (const device of devices) {
            const deviceMeasurements = await MeasurementModel.getMeasurements(
                device.device_id,
                startTime.toISOString().split('T')[0],
                endTime.toISOString().split('T')[0]
            );
            
            const filtered = deviceMeasurements.filter(m => {
                const timestamp = new Date(m.timestamp);
                return timestamp >= startTime && timestamp <= endTime;
            }).map(m => ({
                ...m,
                device_id: device.device_id
            }));
            
            measurements.push(...filtered);
        }
        
        // Get sound sources in window
        const sources = await SourceLocationModel.getLocationsByDateRange(startTime, endTime);
        
        // Get device states at this time
        const deviceStates = devices.map(device => {
            const deviceMeasurements = measurements.filter(m => m.device_id === device.device_id);
            const latest = deviceMeasurements.length > 0 
                ? deviceMeasurements[deviceMeasurements.length - 1]
                : null;
            
            return {
                device_id: device.device_id,
                nickname: device.nickname,
                position: device.position,
                latest_measurement: latest,
                active: latest !== null
            };
        });
        
        res.json({
            time: centerTime.toISOString(),
            windowSeconds: parseInt(windowSeconds),
            measurements,
            sources,
            deviceStates,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        logger.error('Error getting playback window:', error);
        res.status(500).json({ error: 'Failed to get playback window' });
    }
});

// Get available time range for playback
router.get('/playback/range', async (req, res) => {
    try {
        const devices = await DeviceModel.getAllDevices();
        let earliestMeasurement = null;
        let latestMeasurement = null;
        
        for (const device of devices) {
            // Get first and last measurement dates
            const allDates = await MeasurementModel.getAvailableDates(device.device_id);
            
            if (allDates.length > 0) {
                const firstDate = new Date(allDates[0]);
                const lastDate = new Date(allDates[allDates.length - 1]);
                
                if (!earliestMeasurement || firstDate < earliestMeasurement) {
                    earliestMeasurement = firstDate;
                }
                
                if (!latestMeasurement || lastDate > latestMeasurement) {
                    latestMeasurement = lastDate;
                }
            }
        }
        
        if (!earliestMeasurement || !latestMeasurement) {
            return res.json({
                available: false,
                message: 'No historical data available'
            });
        }
        
        res.json({
            available: true,
            earliestTime: earliestMeasurement.toISOString(),
            latestTime: latestMeasurement.toISOString(),
            totalDays: Math.ceil((latestMeasurement - earliestMeasurement) / (1000 * 60 * 60 * 24))
        });
        
    } catch (error) {
        logger.error('Error getting playback range:', error);
        res.status(500).json({ error: 'Failed to get playback range' });
    }
});

// Get data availability map for timeline visualization
router.get('/playback/availability', async (req, res) => {
    try {
        const { startTime, endTime, resolution = 100 } = req.query;
        
        if (!startTime || !endTime) {
            return res.status(400).json({ error: 'startTime and endTime required' });
        }
        
        const start = new Date(startTime);
        const end = new Date(endTime);
        const totalMs = end - start;
        const blockMs = totalMs / resolution;
        
        const devices = await DeviceModel.getAllDevices();
        const availabilityMap = new Array(resolution).fill(0);
        
        // For each device, check which time blocks have data
        for (const device of devices) {
            const allDates = await MeasurementModel.getAvailableDates(device.device_id);
            
            for (const dateStr of allDates) {
                const date = new Date(dateStr);
                
                // Skip if outside range
                if (date < start || date > end) continue;
                
                // Get measurements for this date
                const measurements = await MeasurementModel.getMeasurements(
                    device.device_id,
                    dateStr,
                    dateStr
                );
                
                // Mark time blocks that have measurements
                for (const measurement of measurements) {
                    const timestamp = new Date(measurement.timestamp);
                    if (timestamp >= start && timestamp <= end) {
                        const blockIndex = Math.floor((timestamp - start) / blockMs);
                        if (blockIndex >= 0 && blockIndex < resolution) {
                            availabilityMap[blockIndex]++;
                        }
                    }
                }
            }
        }
        
        // Normalize to 0-1 based on max device count
        const maxCount = Math.max(...availabilityMap, 1);
        const normalizedMap = availabilityMap.map(count => count / maxCount);
        
        res.json({
            startTime: start.toISOString(),
            endTime: end.toISOString(),
            resolution,
            availability: normalizedMap,
            deviceCount: devices.length
        });
        
    } catch (error) {
        logger.error('Error getting data availability:', error);
        res.status(500).json({ error: 'Failed to get data availability' });
    }
});

module.exports = router;
