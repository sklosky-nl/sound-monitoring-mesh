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

        // Add new measurement with optional onset data
        const measurementData = {
            ...measurement,
            stored_at: new Date().toISOString()
        };

        // Add onset timestamp and peak amplitude if this is an event detection
        if (measurement.onset_timestamp_us !== undefined) {
            measurementData.onset_timestamp_us = measurement.onset_timestamp_us;
            measurementData.peak_amplitude_db = measurement.peak_amplitude_db || measurement.db_level;
            measurementData.event_duration_ms = measurement.event_duration_ms || 0;
            measurementData.is_event = true;
        } else {
            measurementData.is_event = false;
        }

        measurements.push(measurementData);

        // Write back to file
        await fs.writeFile(filePath, JSON.stringify(measurements, null, 2));
        
        logger.info(`Measurement stored for device ${measurement.device_id}${measurementData.is_event ? ' (EVENT)' : ''}`);
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

    static async getEvents(startTimestamp, endTimestamp) {
        await this.ensureDirectory();

        // Get date range from timestamps
        const start = startTimestamp ? new Date(startTimestamp) : new Date(Date.now() - 60000); // last minute
        const end = endTimestamp ? new Date(endTimestamp) : new Date();

        const events = [];
        const files = await fs.readdir(MEASUREMENTS_DIR);

        // Get all relevant date files
        const currentDate = new Date(start);
        while (currentDate <= end) {
            const dateStr = currentDate.toISOString().split('T')[0];
            
            for (const file of files) {
                if (!file.includes(dateStr) || !file.endsWith('.json')) continue;

                const filePath = path.join(MEASUREMENTS_DIR, file);
                try {
                    const data = await fs.readFile(filePath, 'utf8');
                    const measurements = JSON.parse(data);
                    
                    // Filter only events within time range
                    const fileEvents = measurements.filter(m => {
                        if (!m.is_event) return false;
                        const mTime = new Date(m.timestamp);
                        return mTime >= start && mTime <= end;
                    });

                    events.push(...fileEvents);
                } catch (error) {
                    logger.error(`Error reading events from ${file}:`, error);
                }
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Sort by onset timestamp
        events.sort((a, b) => a.onset_timestamp_us - b.onset_timestamp_us);
        return events;
    }

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
}

module.exports = MeasurementModel;
