/**
 * Sound Source Location Routes
 * API endpoints for triangulated sound source locations
 */

const express = require('express');
const router = express.Router();
const SourceLocationModel = require('../models/SourceLocation');
const TriangulationService = require('../services/triangulationService');
const MeasurementModel = require('../models/Measurement');
const logger = require('../utils/logger');

// Get recent source locations (last N minutes)
router.get('/recent', async (req, res) => {
    try {
        const minutes = parseInt(req.query.minutes) || 5;
        const locations = await SourceLocationModel.getRecentLocations(minutes);
        res.json(locations);
    } catch (error) {
        logger.error('Error getting recent locations:', error);
        res.status(500).json({ error: 'Failed to get recent locations' });
    }
});

// Get source locations by date range
router.get('/', async (req, res) => {
    try {
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;

        const locations = await SourceLocationModel.getLocations(startDate, endDate);
        res.json(locations);
    } catch (error) {
        logger.error('Error getting source locations:', error);
        res.status(500).json({ error: 'Failed to get source locations' });
    }
});

// Get specific source location
router.get('/:locationId', async (req, res) => {
    try {
        const location = await SourceLocationModel.getLocation(req.params.locationId);
        if (!location) {
            return res.status(404).json({ error: 'Location not found' });
        }
        res.json(location);
    } catch (error) {
        logger.error('Error getting location:', error);
        res.status(500).json({ error: 'Failed to get location' });
    }
});

// Get location statistics
router.get('/stats/summary', async (req, res) => {
    try {
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;

        const stats = await SourceLocationModel.getLocationStats(startDate, endDate);
        res.json(stats);
    } catch (error) {
        logger.error('Error getting location stats:', error);
        res.status(500).json({ error: 'Failed to get location stats' });
    }
});

// Trigger manual triangulation for recent measurements
router.post('/triangulate', async (req, res) => {
    try {
        const { startTimestamp, endTimestamp } = req.body;
        
        // Get measurements from time range
        const measurements = await MeasurementModel.getMeasurements(startTimestamp, endTimestamp);
        
        if (measurements.length === 0) {
            return res.json({ message: 'No measurements found in time range', locations: [] });
        }

        // Apply RSS triangulation
        const location = await TriangulationService.calculateRSS(measurements);
        
        const locations = location ? [location] : [];

        logger.info(`Manual triangulation: ${measurements.length} measurements -> ${locations.length} locations`);
        res.json({ 
            message: 'Triangulation completed',
            measurements_processed: measurements.length,
            locations_found: locations.length,
            locations
        });

    } catch (error) {
        logger.error('Error in manual triangulation:', error);
        res.status(500).json({ error: 'Failed to triangulate' });
    }
});

// Heatmap data for visualization
router.get('/heatmap/data', async (req, res) => {
    try {
        const startDate = req.query.startDate;
        const endDate = req.query.endDate;
        const gridSize = parseFloat(req.query.gridSize) || 1.0; // meters

        const locations = await SourceLocationModel.getLocations(startDate, endDate);

        if (locations.length === 0) {
            return res.json({ grid: [], bounds: null });
        }

        // Find bounds
        const xCoords = locations.map(l => l.position.x);
        const yCoords = locations.map(l => l.position.y);
        
        const bounds = {
            minX: Math.min(...xCoords),
            maxX: Math.max(...xCoords),
            minY: Math.min(...yCoords),
            maxY: Math.max(...yCoords)
        };

        // Create grid
        const gridWidth = Math.ceil((bounds.maxX - bounds.minX) / gridSize) + 1;
        const gridHeight = Math.ceil((bounds.maxY - bounds.minY) / gridSize) + 1;
        
        const grid = Array(gridHeight).fill(0).map(() => Array(gridWidth).fill(0));

        // Populate grid
        for (const loc of locations) {
            const gridX = Math.floor((loc.position.x - bounds.minX) / gridSize);
            const gridY = Math.floor((loc.position.y - bounds.minY) / gridSize);
            
            if (gridX >= 0 && gridX < gridWidth && gridY >= 0 && gridY < gridHeight) {
                grid[gridY][gridX]++;
            }
        }

        res.json({ 
            grid,
            bounds,
            gridSize,
            totalLocations: locations.length
        });

    } catch (error) {
        logger.error('Error generating heatmap data:', error);
        res.status(500).json({ error: 'Failed to generate heatmap' });
    }
});

module.exports = router;
