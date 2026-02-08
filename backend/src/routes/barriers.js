/**
 * Acoustic Barrier Routes
 * API endpoints for managing acoustic barriers (walls, curtains, etc.)
 */

const express = require('express');
const router = express.Router();
const AcousticBarrierModel = require('../models/AcousticBarrier');
const logger = require('../utils/logger');

// Get all barriers
router.get('/', async (req, res) => {
    try {
        const barriers = await AcousticBarrierModel.getAllBarriers();
        res.json(barriers);
    } catch (error) {
        logger.error('Error getting barriers:', error);
        res.status(500).json({ error: 'Failed to get barriers' });
    }
});

// Get specific barrier
router.get('/:barrierId', async (req, res) => {
    try {
        const barrier = await AcousticBarrierModel.getBarrier(req.params.barrierId);
        if (!barrier) {
            return res.status(404).json({ error: 'Barrier not found' });
        }
        res.json(barrier);
    } catch (error) {
        logger.error('Error getting barrier:', error);
        res.status(500).json({ error: 'Failed to get barrier' });
    }
});

// Create new barrier
router.post('/', async (req, res) => {
    try {
        const barrierData = req.body;

        // Validate required fields
        if (!barrierData.name) {
            return res.status(400).json({ error: 'Barrier name is required' });
        }
        if (!barrierData.type) {
            return res.status(400).json({ error: 'Barrier type is required' });
        }

        const barrier = await AcousticBarrierModel.createBarrier(barrierData);
        logger.info(`Barrier created: ${barrier.id} (${barrier.type})`);
        
        res.status(201).json({ 
            message: 'Barrier created successfully',
            barrier
        });
    } catch (error) {
        logger.error('Error creating barrier:', error);
        res.status(500).json({ error: 'Failed to create barrier' });
    }
});

// Update barrier
router.put('/:barrierId', async (req, res) => {
    try {
        const barrierId = req.params.barrierId;
        const updates = req.body;

        const updatedBarrier = await AcousticBarrierModel.updateBarrier(barrierId, updates);
        
        if (!updatedBarrier) {
            return res.status(404).json({ error: 'Barrier not found' });
        }

        logger.info(`Barrier updated: ${barrierId}`);
        res.json({ 
            message: 'Barrier updated successfully',
            barrier: updatedBarrier
        });
    } catch (error) {
        logger.error('Error updating barrier:', error);
        res.status(500).json({ error: 'Failed to update barrier' });
    }
});

// Delete barrier
router.delete('/:barrierId', async (req, res) => {
    try {
        const barrierId = req.params.barrierId;
        const success = await AcousticBarrierModel.deleteBarrier(barrierId);
        
        if (!success) {
            return res.status(404).json({ error: 'Barrier not found' });
        }

        logger.info(`Barrier deleted: ${barrierId}`);
        res.json({ message: 'Barrier deleted successfully' });
    } catch (error) {
        logger.error('Error deleting barrier:', error);
        res.status(500).json({ error: 'Failed to delete barrier' });
    }
});

// Get barriers material presets
router.get('/materials/presets', async (req, res) => {
    const presets = [
        { material: 'concrete_wall', transmission_loss_db: 30, reflection: 0.8, absorption: 0.05 },
        { material: 'drywall_single', transmission_loss_db: 17, reflection: 0.7, absorption: 0.1 },
        { material: 'drywall_double', transmission_loss_db: 25, reflection: 0.7, absorption: 0.1 },
        { material: 'brick_wall', transmission_loss_db: 28, reflection: 0.75, absorption: 0.08 },
        { material: 'metal_panel', transmission_loss_db: 25, reflection: 0.9, absorption: 0.02 },
        { material: 'glass_window', transmission_loss_db: 20, reflection: 0.85, absorption: 0.05 },
        { material: 'vinyl_curtain_heavy', transmission_loss_db: 12, reflection: 0.3, absorption: 0.4 },
        { material: 'vinyl_curtain_light', transmission_loss_db: 8, reflection: 0.4, absorption: 0.3 },
        { material: 'fabric_curtain', transmission_loss_db: 6, reflection: 0.2, absorption: 0.5 },
        { material: 'acoustic_curtain', transmission_loss_db: 18, reflection: 0.2, absorption: 0.6 },
        { material: 'wood_door', transmission_loss_db: 15, reflection: 0.6, absorption: 0.15 }
    ];
    res.json(presets);
});

module.exports = router;
