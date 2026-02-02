/**
 * Device storage model
 * File-based storage for device information
 */

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const DEVICES_DIR = process.env.DEVICES_DIR || './data/devices';

class DeviceModel {
    static async ensureDirectory() {
        try {
            await fs.mkdir(DEVICES_DIR, { recursive: true });
        } catch (error) {
            logger.error('Failed to create devices directory:', error);
            throw error;
        }
    }

    static async registerDevice(deviceData) {
        await this.ensureDirectory();
        
        const device = {
            device_id: deviceData.device_id,
            mac_address: deviceData.mac_address,
            name: deviceData.name || deviceData.device_id,
            location: deviceData.location || 'Unknown',
            api_key: uuidv4(),
            registered_at: new Date().toISOString(),
            last_seen: new Date().toISOString(),
            status: 'registered',
            calibration_offset_db: 0.0,
            measurement_interval: 5,
            frequency_bands: [
                { band_number: 1, start_frequency: 20, end_frequency: 200, calibration_offset_db: 0.0 },
                { band_number: 2, start_frequency: 200, end_frequency: 2000, calibration_offset_db: 0.0 },
                { band_number: 3, start_frequency: 2000, end_frequency: 8000, calibration_offset_db: 0.0 }
            ]
        };

        const filePath = path.join(DEVICES_DIR, `${device.device_id}.json`);
        await fs.writeFile(filePath, JSON.stringify(device, null, 2));
        
        logger.info(`Device registered: ${device.device_id}`);
        return device;
    }

    static async getDevice(deviceId) {
        const filePath = path.join(DEVICES_DIR, `${deviceId}.json`);
        try {
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    }

    static async getAllDevices() {
        await this.ensureDirectory();
        const files = await fs.readdir(DEVICES_DIR);
        const devices = [];

        for (const file of files) {
            if (file.endsWith('.json')) {
                const filePath = path.join(DEVICES_DIR, file);
                const data = await fs.readFile(filePath, 'utf8');
                devices.push(JSON.parse(data));
            }
        }

        return devices;
    }

    static async updateDevice(deviceId, updates) {
        const device = await this.getDevice(deviceId);
        if (!device) {
            return null;
        }

        const updatedDevice = { ...device, ...updates, updated_at: new Date().toISOString() };
        const filePath = path.join(DEVICES_DIR, `${deviceId}.json`);
        await fs.writeFile(filePath, JSON.stringify(updatedDevice, null, 2));
        
        return updatedDevice;
    }

    static async updateLastSeen(deviceId) {
        return this.updateDevice(deviceId, { last_seen: new Date().toISOString() });
    }

    static async verifyApiKey(deviceId, apiKey) {
        const device = await this.getDevice(deviceId);
        return device && device.api_key === apiKey;
    }

    static async deleteDevice(deviceId) {
        const filePath = path.join(DEVICES_DIR, `${deviceId}.json`);
        try {
            await fs.unlink(filePath);
            logger.info(`Device deleted: ${deviceId}`);
            return true;
        } catch (error) {
            if (error.code === 'ENOENT') {
                return false; // Device doesn't exist
            }
            throw error;
        }
    }
}

module.exports = DeviceModel;
