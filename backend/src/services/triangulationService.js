/**
 * Triangulation Service
 * Implements Hybrid TDoA + RSS sound source localization
 */

const DeviceModel = require('../models/Device');
const MeasurementModel = require('../models/Measurement');
const AcousticBarrierModel = require('../models/AcousticBarrier');
const SourceLocationModel = require('../models/SourceLocation');
const logger = require('../utils/logger');

const SOUND_SPEED = 343.0; // meters per second at 20°C
const EVENT_CORRELATION_WINDOW_MS = 100; // milliseconds
const MIN_SENSORS_FOR_2D = 3;
const MIN_SENSORS_FOR_3D = 4;

class TriangulationService {
    /**
     * Correlate events from multiple sensors within time window
     */
    static async correlateEvents(events, windowMs = EVENT_CORRELATION_WINDOW_MS) {
        if (events.length < MIN_SENSORS_FOR_2D) {
            return [];
        }

        // Sort events by onset timestamp
        const sortedEvents = events.sort((a, b) => a.onset_timestamp_us - b.onset_timestamp_us);

        const correlatedGroups = [];
        const used = new Set();

        for (let i = 0; i < sortedEvents.length; i++) {
            if (used.has(i)) continue;

            const reference = sortedEvents[i];
            const group = [reference];
            used.add(i);

            // Find events within time window
            for (let j = i + 1; j < sortedEvents.length; j++) {
                if (used.has(j)) continue;

                const candidate = sortedEvents[j];
                const timeDiffUs = candidate.onset_timestamp_us - reference.onset_timestamp_us;
                const timeDiffMs = timeDiffUs / 1000.0;

                if (timeDiffMs <= windowMs) {
                    group.push(candidate);
                    used.add(j);
                } else {
                    break; // Events are sorted, no need to continue
                }
            }

            if (group.length >= MIN_SENSORS_FOR_2D) {
                correlatedGroups.push(group);
            }
        }

        logger.info(`Event correlation: ${events.length} events -> ${correlatedGroups.length} groups`);
        return correlatedGroups;
    }

    /**
     * Time Difference of Arrival (TDoA) localization
     */
    static async calculateTDoA(events) {
        if (events.length < MIN_SENSORS_FOR_2D) {
            return null;
        }

        // Get sensor positions
        const sensorPositions = [];
        for (const event of events) {
            const device = await DeviceModel.getDevice(event.device_id);
            if (device && device.position) {
                sensorPositions.push({
                    device_id: event.device_id,
                    x: device.position.x,
                    y: device.position.y,
                    z: device.position.z,
                    onset_us: event.onset_timestamp_us
                });
            }
        }

        if (sensorPositions.length < MIN_SENSORS_FOR_2D) {
            logger.warn('Insufficient sensor positions for TDoA');
            return null;
        }

        // Use first sensor as reference (earliest detection)
        const reference = sensorPositions[0];
        
        // Calculate time differences and distance differences
        const measurements = [];
        for (let i = 1; i < sensorPositions.length; i++) {
            const sensor = sensorPositions[i];
            const timeDiffUs = sensor.onset_us - reference.onset_us;
            const timeDiffS = timeDiffUs / 1000000.0;
            const distanceDiff = SOUND_SPEED * timeDiffS;

            measurements.push({
                sensor,
                distanceDiff
            });
        }

        // Solve using multilateration (iterative least squares)
        const position = this.solveMultilateration(reference, measurements);

        return position;
    }

    /**
     * Received Signal Strength (RSS) localization
     */
    static async calculateRSS(events) {
        if (events.length < MIN_SENSORS_FOR_2D) {
            return null;
        }

        // Get sensor positions and dB levels
        const sensorData = [];
        for (const event of events) {
            const device = await DeviceModel.getDevice(event.device_id);
            if (device && device.position) {
                sensorData.push({
                    device_id: event.device_id,
                    x: device.position.x,
                    y: device.position.y,
                    z: device.position.z,
                    db: event.peak_amplitude_db || event.db_level
                });
            }
        }

        if (sensorData.length < MIN_SENSORS_FOR_2D) {
            logger.warn('Insufficient sensor data for RSS');
            return null;
        }

        // Find sensor with highest dB (closest to source)
        const loudest = sensorData.reduce((max, s) => s.db > max.db ? s : max);
        
        // Estimate distances using inverse square law
        // L = L0 - 20 * log10(d/d0) - path_loss
        // Simplified: d = d0 * 10^((L0 - L) / (10 * n))
        // where n is path loss exponent (2 for free space, 2-4 for indoor)
        const pathLossExponent = 2.5; // Indoor environment
        const referenceDistance = 1.0; // meters

        const distanceEstimates = [];
        for (const sensor of sensorData) {
            const dbDiff = loudest.db - sensor.db;
            const distance = referenceDistance * Math.pow(10, dbDiff / (10 * pathLossExponent));
            
            distanceEstimates.push({
                x: sensor.x,
                y: sensor.y,
                z: sensor.z,
                distance
            });
        }

        // Trilateration using estimated distances
        const position = this.solveTrilateration(distanceEstimates);

        return position;
    }

    /**
     * Apply acoustic barrier effects to distance/dB estimates
     */
    static async applyBarrierEffects(sourcePosition, sensorPosition, dbLevel) {
        const barriers = await AcousticBarrierModel.getBarriersInPath(sourcePosition, sensorPosition);

        let totalTransmissionLoss = 0;
        const barriersConsidered = [];

        for (const barrier of barriers) {
            totalTransmissionLoss += barrier.acoustic_properties.transmission_loss_db;
            barriersConsidered.push({
                id: barrier.id,
                type: barrier.type,
                material: barrier.material,
                transmission_loss_db: barrier.acoustic_properties.transmission_loss_db
            });
        }

        // Adjust dB level for barriers
        const adjustedDb = dbLevel + totalTransmissionLoss;

        return {
            original_db: dbLevel,
            adjusted_db: adjustedDb,
            transmission_loss_db: totalTransmissionLoss,
            barriers: barriersConsidered
        };
    }

    /**
     * Hybrid TDoA + RSS localization
     */
    static async calculateHybrid(events) {
        const tdoaPosition = await this.calculateTDoA(events);
        const rssPosition = await this.calculateRSS(events);

        if (!tdoaPosition && !rssPosition) {
            return null;
        }

        if (!tdoaPosition) {
            return { position: rssPosition, method: 'rss', alpha: 0 };
        }

        if (!rssPosition) {
            return { position: tdoaPosition, method: 'tdoa', alpha: 1 };
        }

        // Determine sound type: impulse or continuous
        const avgDuration = events.reduce((sum, e) => sum + (e.event_duration_ms || 0), 0) / events.length;
        const isImpulse = avgDuration < 50; // milliseconds

        // Weight TDoA higher for impulse sounds, RSS for continuous
        const alpha = isImpulse ? 0.75 : 0.25;

        // Combine positions: P = alpha * TDoA + (1-alpha) * RSS
        const hybridPosition = {
            x: alpha * tdoaPosition.x + (1 - alpha) * rssPosition.x,
            y: alpha * tdoaPosition.y + (1 - alpha) * rssPosition.y,
            z: alpha * (tdoaPosition.z || 0) + (1 - alpha) * (rssPosition.z || 0)
        };

        return {
            position: hybridPosition,
            method: 'hybrid',
            alpha,
            tdoa_position: tdoaPosition,
            rss_position: rssPosition
        };
    }

    /**
     * Calculate confidence score for localization result
     */
    static calculateConfidence(events, position) {
        let confidence = 0;

        // Factor 1: Number of sensors (more is better)
        const sensorCount = events.length;
        const sensorScore = Math.min(sensorCount / 6, 1.0) * 30; // up to 30%
        confidence += sensorScore;

        // Factor 2: Signal strength (higher is better)
        const avgDb = events.reduce((sum, e) => sum + (e.peak_amplitude_db || e.db_level), 0) / events.length;
        const dbScore = Math.min((avgDb - 60) / 40, 1.0) * 30; // 60-100dB -> 0-30%
        confidence += Math.max(0, dbScore);

        // Factor 3: Time sync quality (lower variance is better)
        if (events.length > 2) {
            const onsetTimes = events.map(e => e.onset_timestamp_us);
            const mean = onsetTimes.reduce((a, b) => a + b) / onsetTimes.length;
            const variance = onsetTimes.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / onsetTimes.length;
            const stdDev = Math.sqrt(variance);
            const syncScore = Math.max(0, 1 - stdDev / 10000) * 20; // up to 20%
            confidence += syncScore;
        }

        // Factor 4: Position validity (within reasonable bounds)
        if (position) {
            const isValid = !isNaN(position.x) && !isNaN(position.y) && 
                           Math.abs(position.x) < 1000 && Math.abs(position.y) < 1000;
            confidence += isValid ? 20 : 0;
        }

        return Math.min(Math.max(confidence, 0), 100);
    }

    /**
     * Process event group and generate source location
     */
    static async processEventGroup(events) {
        try {
            const result = await this.calculateHybrid(events);
            
            if (!result || !result.position) {
                logger.warn('Triangulation failed for event group');
                return null;
            }

            const confidence = this.calculateConfidence(events, result.position);

            const sourceLocation = {
                timestamp: events[0].timestamp,
                position: result.position,
                confidence,
                localization_method: result.method,
                contributing_sensors: events.map(e => e.device_id),
                sound_characteristics: {
                    peak_db: Math.max(...events.map(e => e.peak_amplitude_db || e.db_level)),
                    duration_ms: events[0].event_duration_ms || 0,
                    is_impulse: (events[0].event_duration_ms || 0) < 50
                },
                triangulation_details: {
                    tdoa_position: result.tdoa_position,
                    rss_position: result.rss_position,
                    hybrid_weight_alpha: result.alpha,
                    barriers_considered: []
                }
            };

            const stored = await SourceLocationModel.storeLocation(sourceLocation);
            return stored;

        } catch (error) {
            logger.error('Error processing event group:', error);
            return null;
        }
    }

    /**
     * Multilateration solver using iterative least squares
     */
    static solveMultilateration(reference, measurements) {
        // Initial guess: reference position
        let x = reference.x;
        let y = reference.y;
        let z = reference.z || 0;

        // Iterative refinement (Gauss-Newton)
        const maxIterations = 20;
        const tolerance = 0.01;

        for (let iter = 0; iter < maxIterations; iter++) {
            let sumDx = 0, sumDy = 0, sumDz = 0;
            let count = 0;

            for (const m of measurements) {
                // Distance from current guess to reference sensor
                const dr = Math.sqrt(Math.pow(x - reference.x, 2) + Math.pow(y - reference.y, 2) + Math.pow(z - reference.z, 2));
                
                // Distance from current guess to other sensor
                const di = Math.sqrt(Math.pow(x - m.sensor.x, 2) + Math.pow(y - m.sensor.y, 2) + Math.pow(z - m.sensor.z, 2));
                
                // Expected distance difference
                const expectedDiff = m.distanceDiff;
                const actualDiff = di - dr;
                const error = actualDiff - expectedDiff;

                // Gradient
                if (di > 0 && dr > 0) {
                    const dxdi = (x - m.sensor.x) / di;
                    const dydi = (y - m.sensor.y) / di;
                    const dzdi = (z - m.sensor.z) / di;
                    
                    const dxdr = (x - reference.x) / dr;
                    const dydr = (y - reference.y) / dr;
                    const dzdr = (z - reference.z) / dr;

                    sumDx += error * (dxdi - dxdr);
                    sumDy += error * (dydi - dydr);
                    sumDz += error * (dzdi - dzdr);
                    count++;
                }
            }

            if (count === 0) break;

            // Update position
            const step = 0.1;
            const dx = -step * sumDx / count;
            const dy = -step * sumDy / count;
            const dz = -step * sumDz / count;

            x += dx;
            y += dy;
            z += dz;

            // Check convergence
            if (Math.abs(dx) < tolerance && Math.abs(dy) < tolerance && Math.abs(dz) < tolerance) {
                break;
            }
        }

        return { x, y, z };
    }

    /**
     * Trilateration solver for RSS distance estimates
     */
    static solveTrilateration(distanceEstimates) {
        if (distanceEstimates.length < 3) {
            return null;
        }

        // Use first 3 sensors for basic trilateration
        const s1 = distanceEstimates[0];
        const s2 = distanceEstimates[1];
        const s3 = distanceEstimates[2];

        // Simplified 2D trilateration
        // Place s1 at origin for calculation, then translate
        const dx = s2.x - s1.x;
        const dy = s2.y - s1.y;
        const d = Math.sqrt(dx * dx + dy * dy);

        if (d < 0.01) {
            return { x: s1.x, y: s1.y, z: s1.z };
        }

        const i = (s1.distance * s1.distance - s2.distance * s2.distance + d * d) / (2 * d);
        
        const ex = dx / d;
        const ey = dy / d;

        const ix = s3.x - s1.x;
        const iy = s3.y - s1.y;
        const j = ex * ix + ey * iy;

        const jx = ix - j * ex;
        const jy = iy - j * ey;
        const jd = Math.sqrt(jx * jx + jy * jy);

        if (jd < 0.01) {
            return { x: s1.x + i * ex, y: s1.y + i * ey, z: s1.z };
        }

        const exx = jx / jd;
        const exy = jy / jd;

        const yPos = (s1.distance * s1.distance - s3.distance * s3.distance + Math.pow(j, 2) + Math.pow(jd, 2)) / (2 * jd);
        const xPos = i - j * yPos / jd;

        // Check if solution is valid
        if (isNaN(xPos) || isNaN(yPos)) {
            return { x: s1.x, y: s1.y, z: s1.z };
        }

        // Transform back to original coordinate system
        const x = s1.x + xPos * ex + yPos * exx;
        const y = s1.y + xPos * ey + yPos * exy;

        return { x, y, z: s1.z };
    }
}

module.exports = TriangulationService;
