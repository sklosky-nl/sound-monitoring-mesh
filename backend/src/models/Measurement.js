/**
 * Measurement storage model
 * File-based storage for measurement data
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

const MEASUREMENTS_DIR = process.env.MEASUREMENTS_DIR || './data/measurements';
const DATA_RETENTION_DAYS = parseInt(process.env.DATA_RETENTION_DAYS || '7');

class MeasurementModel {
    static async ensureDirectory() {
        try {
            await fs.mkdir(MEASUREMENTS_DIR, { recursive: true });
        } catch (error) {
            logger.error('Failed to create measurements directory:', error);
            throw error;
        }
    }

    static async storeMeasurement(measurement) {
        await this.ensureDirectory();

        const date = new Date();
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
        const fileName = `${measurement.device_id}_${dateStr}.json`;
        const filePath = path.join(MEASUREMENTS_DIR, fileName);

        // Read existing measurements for the day
        let measurements = [];
        try {
            const data = await fs.readFile(filePath, 'utf8');
            measurements = JSON.parse(data);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                logger.error('Error reading measurements file:', error);
            }
        }

        // Add new measurement
        const measurementData = {
            ...measurement,
            stored_at: new Date().toISOString(),
            is_event: false  // Continuous monitoring only
        };

        measurements.push(measurementData);

        // Write back to file
        await fs.writeFile(filePath, JSON.stringify(measurements, null, 2));
        
        logger.info(`Measurement stored for device ${measurement.device_id}`);
        return measurementData;
    }

    static async getMeasurements(deviceId, startDate, endDate) {
        await this.ensureDirectory();

        const start = startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();

        const measurements = [];
        const currentDate = new Date(start);

        while (currentDate <= end) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const fileName = `${deviceId}_${dateStr}.json`;
            const filePath = path.join(MEASUREMENTS_DIR, fileName);

            try {
                const data = await fs.readFile(filePath, 'utf8');
                const dayMeasurements = JSON.parse(data);
                measurements.push(...dayMeasurements);
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    logger.error(`Error reading measurements for ${dateStr}:`, error);
                }
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return measurements;
    }

    // Event detection removed - system uses continuous monitoring only

    static async cleanupOldData() {
        await this.ensureDirectory();
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - DATA_RETENTION_DAYS);

        const files = await fs.readdir(MEASUREMENTS_DIR);
        let deletedCount = 0;

        for (const file of files) {
            if (!file.endsWith('.json')) continue;

            const parts = file.replace('.json', '').split('_');
            if (parts.length < 2) continue;

            const dateStr = parts[parts.length - 1];
            const fileDate = new Date(dateStr);

            if (fileDate < cutoffDate) {
                const filePath = path.join(MEASUREMENTS_DIR, file);
                await fs.unlink(filePath);
                deletedCount++;
                logger.info(`Deleted old measurement file: ${file}`);
            }
        }

        logger.info(`Cleanup complete: ${deletedCount} files deleted`);
        return deletedCount;
    }

    static async getLatestMeasurements(deviceId, limit = 10) {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const measurements = await this.getMeasurements(deviceId, oneDayAgo, new Date());
        
        return measurements
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, limit);
    }

    static async getAvailableDates(deviceId) {
        await this.ensureDirectory();
        
        try {
            const files = await fs.readdir(MEASUREMENTS_DIR);
            const dates = [];
            
            for (const file of files) {
                if (!file.endsWith('.json')) continue;
                
                // Check if file matches this device
                if (file.startsWith(deviceId + '_')) {
                    const parts = file.replace('.json', '').split('_');
                    if (parts.length >= 2) {
                        const dateStr = parts[parts.length - 1];
                        dates.push(dateStr);
                    }
                }
            }
            
            // Sort dates chronologically
            dates.sort();
            return dates;
        } catch (error) {
            logger.error('Error getting available dates:', error);
            return [];
        }
    }
}

module.exports = MeasurementModel;
