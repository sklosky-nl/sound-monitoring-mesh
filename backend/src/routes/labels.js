const express = require('express');
const router = express.Router();
const MapLabel = require('../models/MapLabel');

/**
 * GET /api/labels
 * Get all map labels
 */
router.get('/', async (req, res) => {
    try {
        const labels = await MapLabel.getAll();
        res.json(labels);
    } catch (error) {
        console.error('Error fetching labels:', error);
        res.status(500).json({ error: 'Failed to fetch labels' });
    }
});

/**
 * GET /api/labels/:id
 * Get a specific label
 */
router.get('/:id', async (req, res) => {
    try {
        const label = await MapLabel.getById(req.params.id);
        if (!label) {
            return res.status(404).json({ error: 'Label not found' });
        }
        res.json(label);
    } catch (error) {
        console.error('Error fetching label:', error);
        res.status(500).json({ error: 'Failed to fetch label' });
    }
});

/**
 * POST /api/labels
 * Create a new label
 */
router.post('/', async (req, res) => {
    try {
        const { text, position, style, visible } = req.body;

        // Validation
        if (!text || !position || typeof position.x !== 'number' || typeof position.y !== 'number') {
            return res.status(400).json({ 
                error: 'Invalid label data. Required: text (string), position (object with x, y coordinates)' 
            });
        }

        const newLabel = await MapLabel.create({
            text,
            position,
            style,
            visible
        });

        res.status(201).json(newLabel);
    } catch (error) {
        console.error('Error creating label:', error);
        res.status(500).json({ error: 'Failed to create label' });
    }
});

/**
 * PUT /api/labels/:id
 * Update an existing label
 */
router.put('/:id', async (req, res) => {
    try {
        const { text, position, style, visible } = req.body;
        
        const updatedLabel = await MapLabel.update(req.params.id, {
            text,
            position,
            style,
            visible
        });

        res.json(updatedLabel);
    } catch (error) {
        if (error.message === 'Label not found') {
            return res.status(404).json({ error: 'Label not found' });
        }
        console.error('Error updating label:', error);
        res.status(500).json({ error: 'Failed to update label' });
    }
});

/**
 * DELETE /api/labels/:id
 * Delete a label
 */
router.delete('/:id', async (req, res) => {
    try {
        const result = await MapLabel.delete(req.params.id);
        res.json(result);
    } catch (error) {
        if (error.message === 'Label not found') {
            return res.status(404).json({ error: 'Label not found' });
        }
        console.error('Error deleting label:', error);
        res.status(500).json({ error: 'Failed to delete label' });
    }
});

module.exports = router;
