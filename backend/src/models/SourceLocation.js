/**
 * Source Location storage model
 * File-based storage for triangulated sound source locations
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

const SOURCE_LOCATIONS_DIR = process.env.SOURCE_LOCATIONS_DIR || './data/source_locations';

class SourceLocationModel {
    static async ensureDirectory() {
        try {
            await fs.mkdir(SOURCE_LOCATIONS_DIR, { recursive: true });
        } catch (error) {
            logger.error('Failed to create source locations directory:', error);
            throw error;
        }
    }

    static async storeLocation(locationData) {
        await this.ensureDirectory();

        const date = new Date();
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
        const fileName = `${dateStr}.json`;
        const filePath = path.join(SOURCE_LOCATIONS_DIR, fileName);

        // Read existing locations for the day
        let locations = [];
        try {
            const data = await fs.readFile(filePath, 'utf8');
            locations = JSON.parse(data);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                logger.error('Error reading source locations file:', error);
            }
        }

        // Create location record
        const location = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: locationData.timestamp || new Date().toISOString(),
            position: {
                x: locationData.position.x,
                y: locationData.position.y,
                z: locationData.position.z || 0
            },
            confidence: locationData.confidence || 0, // 0-100%
            localization_method: locationData.localization_method || 'hybrid', // 'tdoa', 'rss', 'hybrid'
            contributing_sensors: locationData.contributing_sensors || [],
            sound_characteristics: {
                peak_db: locationData.sound_characteristics?.peak_db,
                duration_ms: locationData.sound_characteristics?.duration_ms,
                dominant_frequency: locationData.sound_characteristics?.dominant_frequency,
                is_impulse: locationData.sound_characteristics?.is_impulse || false
            },
            triangulation_details: {
                tdoa_position: locationData.triangulation_details?.tdoa_position,
                rss_position: locationData.triangulation_details?.rss_position,
                hybrid_weight_alpha: locationData.triangulation_details?.hybrid_weight_alpha,
                barriers_considered: locationData.triangulation_details?.barriers_considered || []
            },
            stored_at: new Date().toISOString()
        };

        locations.push(location);

        // Write back to file
        await fs.writeFile(filePath, JSON.stringify(locations, null, 2));
        
        logger.info(`Source location stored: ${location.id} at (${location.position.x.toFixed(1)}, ${location.position.y.toFixed(1)}) confidence: ${location.confidence.toFixed(0)}%`);
        return location;
    }

    static async getLocations(startDate, endDate) {
        await this.ensureDirectory();

        const start = startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();

        const locations = [];
        const currentDate = new Date(start);

        while (currentDate <= end) {
            const dateStr = currentDate.toISOString().split('T')[0];
            const fileName = `${dateStr}.json`;
            const filePath = path.join(SOURCE_LOCATIONS_DIR, fileName);

            try {
                const data = await fs.readFile(filePath, 'utf8');
                const dayLocations = JSON.parse(data);
                locations.push(...dayLocations);
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    logger.error(`Error reading locations for ${dateStr}:`, error);
                }
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        return locations;
    }

    static async getRecentLocations(minutes = 5) {
        const endTime = new Date();
        const startTime = new Date(endTime.getTime() - minutes * 60 * 1000);

        const locations = await this.getLocations(startTime, endTime);
        
        // Filter by exact timestamp
        return locations.filter(loc => {
            const locTime = new Date(loc.timestamp);
            return locTime >= startTime && locTime <= endTime;
        });
    }

    static async getLocation(locationId) {
        // Extract date from location ID (timestamp part)
        const timestampPart = locationId.split('_')[0];
        const date = new Date(parseInt(timestampPart));
        const dateStr = date.toISOString().split('T')[0];
        
        const fileName = `${dateStr}.json`;
        const filePath = path.join(SOURCE_LOCATIONS_DIR, fileName);

        try {
            const data = await fs.readFile(filePath, 'utf8');
            const locations = JSON.parse(data);
            return locations.find(loc => loc.id === locationId);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                logger.error(`Error reading location ${locationId}:`, error);
            }
            return null;
        }
    }

    static async getLocationStats(startDate, endDate) {
        const locations = await this.getLocations(startDate, endDate);

        if (locations.length === 0) {
            return {
                count: 0,
                average_confidence: 0,
                methods_used: {}
            };
        }

        const confidences = locations.map(l => l.confidence);
        const methodCounts = {};

        locations.forEach(loc => {
            const method = loc.localization_method;
            methodCounts[method] = (methodCounts[method] || 0) + 1;
        });

        return {
            count: locations.length,
            average_confidence: confidences.reduce((a, b) => a + b, 0) / confidences.length,
            min_confidence: Math.min(...confidences),
            max_confidence: Math.max(...confidences),
            methods_used: methodCounts
        };
    }

    static async cleanupOldData(retentionDays = 7) {
        await this.ensureDirectory();
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const files = await fs.readdir(SOURCE_LOCATIONS_DIR);
        let deletedCount = 0;

        for (const file of files) {
            if (!file.endsWith('.json')) continue;

            const dateStr = file.replace('.json', '');
            const fileDate = new Date(dateStr);

            if (fileDate < cutoffDate) {
                const filePath = path.join(SOURCE_LOCATIONS_DIR, file);
                await fs.unlink(filePath);
                deletedCount++;
                logger.info(`Deleted old source location file: ${file}`);
            }
        }

        logger.info(`Source location cleanup complete: ${deletedCount} files deleted`);
        return deletedCount;
    }
}

module.exports = SourceLocationModel;
