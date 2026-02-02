/**
 * Alert API routes
 */

const express = require('express');
const router = express.Router();
const AlertModel = require('../models/Alert');
const logger = require('../utils/logger');

// Create a new alert rule
router.post('/', async (req, res) => {
    try {
        const alert = await AlertModel.createAlert(req.body);
        res.status(201).json(alert);
    } catch (error) {
        logger.error('Error creating alert:', error);
        res.status(500).json({
            error: 'Failed to create alert',
            message: error.message
        });
    }
});

// Get all alert rules
router.get('/', async (req, res) => {
    try {
        const alerts = await AlertModel.getAllAlerts();
        res.json(alerts);
    } catch (error) {
        logger.error('Error getting alerts:', error);
        res.status(500).json({
            error: 'Failed to get alerts',
            message: error.message
        });
    }
});

// Get a specific alert
router.get('/:alertId', async (req, res) => {
    try {
        const alert = await AlertModel.getAlert(req.params.alertId);
        
        if (!alert) {
            return res.status(404).json({
                error: 'Alert not found'
            });
        }

        res.json(alert);
    } catch (error) {
        logger.error('Error getting alert:', error);
        res.status(500).json({
            error: 'Failed to get alert',
            message: error.message
        });
    }
});

// Update an alert
router.put('/:alertId', async (req, res) => {
    try {
        const alert = await AlertModel.updateAlert(req.params.alertId, req.body);

        if (!alert) {
            return res.status(404).json({
                error: 'Alert not found'
            });
        }

        res.json(alert);
    } catch (error) {
        logger.error('Error updating alert:', error);
        res.status(500).json({
            error: 'Failed to update alert',
            message: error.message
        });
    }
});

// Delete an alert
router.delete('/:alertId', async (req, res) => {
    try {
        const deleted = await AlertModel.deleteAlert(req.params.alertId);

        if (!deleted) {
            return res.status(404).json({
                error: 'Alert not found'
            });
        }

        res.json({
            message: 'Alert deleted successfully',
            alert_id: req.params.alertId
        });
    } catch (error) {
        logger.error('Error deleting alert:', error);
        res.status(500).json({
            error: 'Failed to delete alert',
            message: error.message
        });
    }
});

// Get alert history
router.get('/history/all', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        const history = await AlertModel.getAlertHistory(limit);
        res.json(history);
    } catch (error) {
        logger.error('Error getting alert history:', error);
        res.status(500).json({
            error: 'Failed to get alert history',
            message: error.message
        });
    }
});

module.exports = router;
