/**
 * Acoustic Barrier storage model
 * File-based storage for acoustic barrier information (walls, curtains, etc.)
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

const BARRIERS_FILE = process.env.BARRIERS_FILE || './data/acoustic_barriers.json';

class AcousticBarrierModel {
    static async ensureFile() {
        try {
            const dir = path.dirname(BARRIERS_FILE);
            await fs.mkdir(dir, { recursive: true });
            
            // Create file if it doesn't exist
            try {
                await fs.access(BARRIERS_FILE);
            } catch {
                await fs.writeFile(BARRIERS_FILE, JSON.stringify({ barriers: [] }, null, 2));
            }
        } catch (error) {
            logger.error('Failed to ensure barriers file:', error);
            throw error;
        }
    }

    static async readBarriers() {
        await this.ensureFile();
        try {
            const data = await fs.readFile(BARRIERS_FILE, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            logger.error('Error reading barriers:', error);
            return { barriers: [] };
        }
    }

    static async writeBarriers(barriersData) {
        await this.ensureFile();
        await fs.writeFile(BARRIERS_FILE, JSON.stringify(barriersData, null, 2));
    }

    static async getAllBarriers() {
        const data = await this.readBarriers();
        return data.barriers || [];
    }

    static async getBarrier(barrierId) {
        const barriers = await this.getAllBarriers();
        return barriers.find(b => b.id === barrierId);
    }

    static async createBarrier(barrierData) {
        const data = await this.readBarriers();
        
        const barrier = {
            id: Date.now().toString(),
            name: barrierData.name,
            type: barrierData.type, // 'wall', 'curtain', 'partition', etc.
            material: barrierData.material, // 'concrete', 'drywall', 'vinyl', 'fabric', etc.
            geometry: {
                type: barrierData.geometry?.type || 'line', // 'line', 'polygon', 'rectangle'
                points: barrierData.geometry?.points || [], // Array of {x, y, z} coordinates
                start: barrierData.geometry?.start, // For line barriers: {x, y, z}
                end: barrierData.geometry?.end, // For line barriers: {x, y, z}
                height: barrierData.geometry?.height || 2.5, // meters
                thickness: barrierData.geometry?.thickness || 0.1 // meters
            },
            acoustic_properties: {
                transmission_loss_db: barrierData.acoustic_properties?.transmission_loss_db || 15,
                reflection_coefficient: barrierData.acoustic_properties?.reflection_coefficient || 0.7,
                absorption_coefficient: barrierData.acoustic_properties?.absorption_coefficient || 0.1
            },
            created_at: new Date().toISOString(),
            notes: barrierData.notes || ''
        };

        data.barriers.push(barrier);
        await this.writeBarriers(data);
        
        logger.info(`Barrier created: ${barrier.id} (${barrier.type})`);
        return barrier;
    }

    static async updateBarrier(barrierId, updates) {
        const data = await this.readBarriers();
        const index = data.barriers.findIndex(b => b.id === barrierId);
        
        if (index === -1) {
            return null;
        }

        data.barriers[index] = {
            ...data.barriers[index],
            ...updates,
            updated_at: new Date().toISOString()
        };

        await this.writeBarriers(data);
        logger.info(`Barrier updated: ${barrierId}`);
        return data.barriers[index];
    }

    static async deleteBarrier(barrierId) {
        const data = await this.readBarriers();
        const index = data.barriers.findIndex(b => b.id === barrierId);
        
        if (index === -1) {
            return false;
        }

        data.barriers.splice(index, 1);
        await this.writeBarriers(data);
        
        logger.info(`Barrier deleted: ${barrierId}`);
        return true;
    }

    static async getBarriersInPath(point1, point2) {
        const barriers = await this.getAllBarriers();
        const intersecting = [];

        for (const barrier of barriers) {
            if (this.checkIntersection(barrier, point1, point2)) {
                intersecting.push(barrier);
            }
        }

        return intersecting;
    }

    static checkIntersection(barrier, point1, point2) {
        // Simple 2D line-segment intersection check
        // For line barriers, check if path from point1 to point2 intersects barrier
        
        if (barrier.geometry.type === 'line' && barrier.geometry.start && barrier.geometry.end) {
            // Line-segment intersection algorithm
            const x1 = point1.x, y1 = point1.y;
            const x2 = point2.x, y2 = point2.y;
            const x3 = barrier.geometry.start.x, y3 = barrier.geometry.start.y;
            const x4 = barrier.geometry.end.x, y4 = barrier.geometry.end.y;

            const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
            if (Math.abs(denom) < 0.0001) return false; // Parallel

            const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
            const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

            if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
                return true; // Intersection exists
            }
        }

        // TODO: Add polygon and rectangle intersection checks
        return false;
    }
}

module.exports = AcousticBarrierModel;
