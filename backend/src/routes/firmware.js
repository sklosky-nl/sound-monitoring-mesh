const express = require('express');
const router = express.Router();
const Firmware = require('../models/Firmware');
const logger = require('../utils/logger');

/**
 * @route GET /api/firmware/check
 * @desc Check if a firmware update is available for a device
 * @query device_id - Device identifier
 * @query current_version - Current firmware version on device
 */
router.get('/check', (req, res) => {
    try {
        const { device_id, current_version } = req.query;
        
        if (!current_version) {
            return res.status(400).json({ error: 'current_version is required' });
        }
        
        logger.info(`Firmware update check from ${device_id || 'unknown'}: v${current_version}`);
        
        const updateInfo = Firmware.checkForUpdate(current_version);
        
        if (updateInfo.updateAvailable) {
            logger.info(`Update available for ${device_id}: v${updateInfo.version}`);
            return res.json(updateInfo);
        } else {
            // Return 204 No Content when no update is available
            return res.status(204).send();
        }
    } catch (error) {
        logger.error('Error checking for firmware update:', error);
        res.status(500).json({ error: 'Failed to check for updates' });
    }
});

/**
 * @route GET /api/firmware/download/:version
 * @desc Download a specific firmware version binary
 * @param version - Firmware version to download
 */
router.get('/download/:version', (req, res) => {
    try {
        const { version } = req.params;
        
        const versionData = Firmware.getVersion(version);
        if (!versionData) {
            return res.status(404).json({ error: 'Firmware version not found' });
        }
        
        const binary = Firmware.getFirmwareBinary(version);
        if (!binary) {
            return res.status(404).json({ error: 'Firmware binary not found' });
        }
        
        logger.info(`Serving firmware v${version} (${versionData.size} bytes)`);
        
        res.set({
            'Content-Type': 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${versionData.filename}"`,
            'Content-Length': versionData.size,
            'X-Firmware-Version': version,
            'X-Firmware-SHA256': versionData.sha256
        });
        
        res.send(binary);
    } catch (error) {
        logger.error('Error downloading firmware:', error);
        res.status(500).json({ error: 'Failed to download firmware' });
    }
});

/**
 * @route GET /api/firmware/versions
 * @desc Get all available firmware versions
 */
router.get('/versions', (req, res) => {
    try {
        const versions = Firmware.getAllVersions();
        res.json({ versions });
    } catch (error) {
        logger.error('Error getting firmware versions:', error);
        res.status(500).json({ error: 'Failed to get firmware versions' });
    }
});

/**
 * @route GET /api/firmware/latest
 * @desc Get the latest firmware version info
 */
router.get('/latest', (req, res) => {
    try {
        const latest = Firmware.getLatestVersion();
        if (!latest) {
            return res.status(404).json({ error: 'No firmware versions available' });
        }
        res.json(latest);
    } catch (error) {
        logger.error('Error getting latest firmware:', error);
        res.status(500).json({ error: 'Failed to get latest firmware' });
    }
});

/**
 * @route POST /api/firmware/upload
 * @desc Upload a new firmware binary
 * @body version - Firmware version (e.g., "1.0.1")
 * @body description - Release description
 * @body binary - Firmware binary file (multipart/form-data)
 */
router.post('/upload', express.raw({ type: 'application/octet-stream', limit: '10mb' }), (req, res) => {
    try {
        const { version, description } = req.query;
        
        if (!version) {
            return res.status(400).json({ error: 'version is required' });
        }
        
        if (!req.body || req.body.length === 0) {
            return res.status(400).json({ error: 'Firmware binary is required' });
        }
        
        const filename = `sound-sensor-${version}.bin`;
        const versionData = Firmware.uploadFirmware(version, filename, req.body, description || '');
        
        logger.info(`Firmware v${version} uploaded successfully (${versionData.size} bytes)`);
        
        res.json({
            message: 'Firmware uploaded successfully',
            version: versionData
        });
    } catch (error) {
        logger.error('Error uploading firmware:', error);
        res.status(500).json({ error: 'Failed to upload firmware' });
    }
});

/**
 * @route DELETE /api/firmware/:version
 * @desc Delete a firmware version
 * @param version - Firmware version to delete
 */
router.delete('/:version', (req, res) => {
    try {
        const { version } = req.params;
        
        const success = Firmware.deleteVersion(version);
        if (!success) {
            return res.status(404).json({ error: 'Firmware version not found' });
        }
        
        logger.info(`Firmware v${version} deleted`);
        res.json({ message: 'Firmware version deleted successfully' });
    } catch (error) {
        logger.error('Error deleting firmware:', error);
        res.status(500).json({ error: 'Failed to delete firmware' });
    }
});

module.exports = router;
