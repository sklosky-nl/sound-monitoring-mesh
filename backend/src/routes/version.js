const express = require('express');
const router = express.Router();
const Firmware = require('../models/Firmware');

const backendPackage = require('../../package.json');

/**
 * @route GET /api/version
 * @desc Get backend and firmware versions
 */
router.get('/', (req, res) => {
    const latestFirmware = Firmware.getLatestVersion();

    res.json({
        backend: {
            version: backendPackage.version
        },
        firmware: {
            version: latestFirmware ? latestFirmware.version : null
        }
    });
});

module.exports = router;
