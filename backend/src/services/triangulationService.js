/**
 * Triangulation Service
 * Implements RSS (Received Signal Strength) sound source localization
 * Uses continuous measurement data to estimate source positions based on dB levels
 */

const DeviceModel = require('../models/Device');
const MeasurementModel = require('../models/Measurement');
const AcousticBarrierModel = require('../models/AcousticBarrier');
const SourceLocationModel = require('../models/SourceLocation');
const logger = require('../utils/logger');

const MIN_SENSORS_FOR_2D = 3;
const MIN_SENSORS_FOR_3D = 4;

class TriangulationService {
    /**
     * Received Signal Strength (RSS) localization
     * Uses continuous measurement dB levels to estimate source position
     */
    static async calculateRSS(measurements) {
        if (measurements.length < MIN_SENSORS_FOR_2D) {
            return null;
        }

        // Get sensor positions and dB levels
        const sensorData = [];
        for (const measurement of measurements) {
            const device = await DeviceModel.getDevice(measurement.device_id);
            if (device && device.position) {
                sensorData.push({
                    device_id: measurement.device_id,
                    x: device.position.x,
                    y: device.position.y,
                    z: device.position.z,
                    db: measurement.db_level
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
     * Calculate confidence score for localization result
     */
    static calculateConfidence(measurements, position) {
        let confidence = 0;

        // Factor 1: Number of sensors (more is better)
        const sensorCount = measurements.length;
        const sensorScore = Math.min(sensorCount / 6, 1.0) * 40; // up to 40%
        confidence += sensorScore;

        // Factor 2: Signal strength (higher is better)
        const avgDb = measurements.reduce((sum, m) => sum + m.db_level, 0) / measurements.length;
        const dbScore = Math.min((avgDb - 60) / 40, 1.0) * 30; // 60-100dB -> 0-30%
        confidence += Math.max(0, dbScore);

        // Factor 3: Position validity (within reasonable bounds)
        if (position) {
            const isValid = !isNaN(position.x) && !isNaN(position.y) && 
                           Math.abs(position.x) < 1000 && Math.abs(position.y) < 1000;
            confidence += isValid ? 30 : 0;
        }

        return Math.min(Math.max(confidence, 0), 100);
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

    /**
     * Multi-source localization using frequency-band separation and temporal clustering
     * Combines multiple approaches to detect simultaneous sound sources
     */
    static async locateMultipleSources(measurements, options = {}) {
        const {
            timeWindowSeconds = 30,
            minConfidence = 40,
            spatialMergeDistance = 3.0, // meters
            useFrequencyBands = true,
            useTemporalClustering = true
        } = options;

        if (measurements.length < MIN_SENSORS_FOR_2D) {
            return [];
        }

        const sources = [];

        // Approach 1: Frequency-band separation
        if (useFrequencyBands) {
            const bandSources = await this.locateSourcesByFrequencyBand(measurements);
            sources.push(...bandSources);
        }

        // Approach 2: Temporal clustering
        if (useTemporalClustering) {
            const clusteredSources = await this.locateSourcesByTemporalClustering(measurements, timeWindowSeconds);
            sources.push(...clusteredSources);
        }

        // If no specialized methods found sources, use basic RSS
        if (sources.length === 0) {
            const basicPosition = await this.calculateRSS(measurements);
            if (basicPosition) {
                sources.push({
                    position: basicPosition,
                    confidence: this.calculateConfidence(measurements, basicPosition),
                    method: 'rss',
                    frequency_profile: this.getFrequencyProfile(measurements),
                    source_type: 'unknown',
                    characteristics: {
                        avg_db: measurements.reduce((sum, m) => sum + m.db_level, 0) / measurements.length,
                        sensor_count: measurements.length
                    }
                });
            }
        }

        // Merge spatially similar sources
        const mergedSources = this.mergeSimilarSources(sources, spatialMergeDistance);

        // Filter by confidence
        const filteredSources = mergedSources.filter(s => s.confidence >= minConfidence);

        // Sort by confidence (highest first)
        filteredSources.sort((a, b) => b.confidence - a.confidence);

        return filteredSources;
    }

    /**
     * Locate sources using frequency-band separation
     * Different sources often have distinct spectral signatures
     */
    static async locateSourcesByFrequencyBand(measurements) {
        const sources = [];
        const bandNames = ['low', 'mid', 'high'];
        
        // Run RSS on each frequency band independently
        for (let bandIndex = 0; bandIndex < 3; bandIndex++) {
            const bandMeasurements = measurements.map(m => {
                if (!m.frequency_bands || !m.frequency_bands[bandIndex]) {
                    return null;
                }
                
                return {
                    ...m,
                    db_level: m.frequency_bands[bandIndex].level
                };
            }).filter(m => m !== null && m.db_level > 40); // Only consider bands with significant energy

            if (bandMeasurements.length < MIN_SENSORS_FOR_2D) {
                continue;
            }

            const position = await this.calculateRSS(bandMeasurements);
            if (position) {
                const confidence = this.calculateConfidence(bandMeasurements, position);
                const avgDb = bandMeasurements.reduce((sum, m) => sum + m.db_level, 0) / bandMeasurements.length;
                
                // Only include if this band has significant energy
                if (avgDb > 50 && confidence > 30) {
                    sources.push({
                        position,
                        confidence,
                        method: `rss_band_${bandIndex + 1}`,
                        frequency_band: bandIndex + 1,
                        band_name: bandNames[bandIndex],
                        frequency_range: this.getFrequencyRange(bandIndex),
                        source_type: this.classifySourceByBand(bandIndex, avgDb),
                        characteristics: {
                            avg_db: avgDb,
                            sensor_count: bandMeasurements.length,
                            dominant_frequency: bandNames[bandIndex]
                        }
                    });
                }
            }
        }

        return sources;
    }

    /**
     * Locate sources using temporal clustering
     * Identifies patterns in measurement variations over time
     */
    static async locateSourcesByTemporalClustering(measurements, timeWindowSeconds) {
        const sources = [];
        
        // Group measurements by time windows (e.g., every 5 seconds)
        const windowSizeMs = 5000;
        const measurementGroups = this.groupMeasurementsByTime(measurements, windowSizeMs);

        if (measurementGroups.length < 3) {
            return sources; // Need multiple time samples for clustering
        }

        // For each device, analyze temporal patterns
        const devicePatterns = new Map();
        
        for (const group of measurementGroups) {
            for (const measurement of group) {
                if (!devicePatterns.has(measurement.device_id)) {
                    devicePatterns.set(measurement.device_id, []);
                }
                devicePatterns.get(measurement.device_id).push(measurement.db_level);
            }
        }

        // Look for spatial patterns that indicate multiple sources
        // If some sensors show consistent high readings while others don't,
        // it suggests localized sources
        const spatialVariance = this.analyzeSpatialVariance(devicePatterns);
        
        if (spatialVariance.hasMultipleSources) {
            // Split measurements into clusters based on spatial patterns
            const clusters = await this.clusterMeasurementsBySpatialPattern(measurements);
            
            for (const cluster of clusters) {
                if (cluster.length >= MIN_SENSORS_FOR_2D) {
                    const position = await this.calculateRSS(cluster);
                    if (position) {
                        sources.push({
                            position,
                            confidence: this.calculateConfidence(cluster, position),
                            method: 'rss_temporal_cluster',
                            source_type: 'clustered',
                            characteristics: {
                                avg_db: cluster.reduce((sum, m) => sum + m.db_level, 0) / cluster.length,
                                sensor_count: cluster.length,
                                temporal_consistency: spatialVariance.consistency
                            }
                        });
                    }
                }
            }
        }

        return sources;
    }

    /**
     * Group measurements by time windows
     */
    static groupMeasurementsByTime(measurements, windowSizeMs) {
        if (measurements.length === 0) return [];

        const sorted = [...measurements].sort((a, b) => 
            new Date(a.timestamp) - new Date(b.timestamp)
        );

        const groups = [];
        let currentGroup = [];
        let windowStart = new Date(sorted[0].timestamp);

        for (const measurement of sorted) {
            const timestamp = new Date(measurement.timestamp);
            if (timestamp - windowStart > windowSizeMs) {
                if (currentGroup.length > 0) {
                    groups.push(currentGroup);
                }
                currentGroup = [measurement];
                windowStart = timestamp;
            } else {
                currentGroup.push(measurement);
            }
        }

        if (currentGroup.length > 0) {
            groups.push(currentGroup);
        }

        return groups;
    }

    /**
     * Analyze spatial variance to detect multiple sources
     */
    static analyzeSpatialVariance(devicePatterns) {
        const devices = Array.from(devicePatterns.keys());
        
        if (devices.length < 3) {
            return { hasMultipleSources: false, consistency: 0 };
        }

        // Calculate coefficient of variation for each device
        const cvs = [];
        for (const [deviceId, readings] of devicePatterns) {
            const mean = readings.reduce((a, b) => a + b, 0) / readings.length;
            const variance = readings.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / readings.length;
            const stdDev = Math.sqrt(variance);
            const cv = stdDev / mean;
            cvs.push(cv);
        }

        // High variance across some devices but not others suggests multiple sources
        const avgCv = cvs.reduce((a, b) => a + b, 0) / cvs.length;
        const maxCv = Math.max(...cvs);
        const minCv = Math.min(...cvs);
        
        const hasMultipleSources = (maxCv - minCv) > 0.3 && avgCv > 0.2;
        const consistency = 1 - avgCv; // Higher consistency = lower variation

        return { hasMultipleSources, consistency };
    }

    /**
     * Cluster measurements by spatial pattern
     */
    static async clusterMeasurementsBySpatialPattern(measurements) {
        // Simple k-means-like clustering based on dB levels
        // Group measurements that have similar spatial patterns
        
        const k = 2; // Assume 2 sources for now
        const clusters = [];
        
        // Initialize clusters with highest and lowest dB measurements
        const sorted = [...measurements].sort((a, b) => b.db_level - a.db_level);
        const cluster1 = [sorted[0]];
        const cluster2 = [sorted[sorted.length - 1]];
        
        // Assign remaining measurements to nearest cluster
        for (let i = 1; i < sorted.length - 1; i++) {
            const measurement = sorted[i];
            const dist1 = Math.abs(measurement.db_level - cluster1[0].db_level);
            const dist2 = Math.abs(measurement.db_level - cluster2[0].db_level);
            
            if (dist1 < dist2) {
                cluster1.push(measurement);
            } else {
                cluster2.push(measurement);
            }
        }
        
        if (cluster1.length >= MIN_SENSORS_FOR_2D) clusters.push(cluster1);
        if (cluster2.length >= MIN_SENSORS_FOR_2D) clusters.push(cluster2);
        
        return clusters;
    }

    /**
     * Merge spatially similar sources
     */
    static mergeSimilarSources(sources, mergeDistance) {
        if (sources.length <= 1) return sources;

        const merged = [];
        const used = new Set();

        for (let i = 0; i < sources.length; i++) {
            if (used.has(i)) continue;

            const source = sources[i];
            const similar = [source];
            used.add(i);

            // Find similar sources
            for (let j = i + 1; j < sources.length; j++) {
                if (used.has(j)) continue;

                const other = sources[j];
                const distance = Math.sqrt(
                    Math.pow(source.position.x - other.position.x, 2) +
                    Math.pow(source.position.y - other.position.y, 2)
                );

                if (distance < mergeDistance) {
                    similar.push(other);
                    used.add(j);
                }
            }

            // Merge similar sources (weighted average by confidence)
            if (similar.length === 1) {
                merged.push(source);
            } else {
                const totalConfidence = similar.reduce((sum, s) => sum + s.confidence, 0);
                const mergedPosition = {
                    x: similar.reduce((sum, s) => sum + s.position.x * s.confidence, 0) / totalConfidence,
                    y: similar.reduce((sum, s) => sum + s.position.y * s.confidence, 0) / totalConfidence,
                    z: similar.reduce((sum, s) => sum + (s.position.z || 0) * s.confidence, 0) / totalConfidence
                };

                const methods = similar.map(s => s.method).join('+');
                const avgConfidence = totalConfidence / similar.length;

                merged.push({
                    position: mergedPosition,
                    confidence: Math.min(avgConfidence * 1.2, 100), // Boost confidence for multi-method agreement
                    method: methods,
                    source_type: similar[0].source_type,
                    merged_from: similar.length,
                    characteristics: {
                        ...similar[0].characteristics,
                        agreement_count: similar.length
                    }
                });
            }
        }

        return merged;
    }

    /**
     * Get frequency profile from measurements
     */
    static getFrequencyProfile(measurements) {
        if (!measurements[0] || !measurements[0].frequency_bands) {
            return null;
        }

        const avgBands = [0, 0, 0];
        let count = 0;

        for (const m of measurements) {
            if (m.frequency_bands && m.frequency_bands.length >= 3) {
                avgBands[0] += m.frequency_bands[0].level;
                avgBands[1] += m.frequency_bands[1].level;
                avgBands[2] += m.frequency_bands[2].level;
                count++;
            }
        }

        if (count === 0) return null;

        return {
            low: avgBands[0] / count,
            mid: avgBands[1] / count,
            high: avgBands[2] / count
        };
    }

    /**
     * Get frequency range for band index
     */
    static getFrequencyRange(bandIndex) {
        const ranges = [
            { start: 20, end: 200 },
            { start: 200, end: 2000 },
            { start: 2000, end: 8000 }
        ];
        return ranges[bandIndex] || null;
    }

    /**
     * Classify source type by frequency band and level
     */
    static classifySourceByBand(bandIndex, avgDb) {
        const classifications = [
            {
                band: 0,
                types: [
                    { minDb: 70, type: 'heavy_machinery' },
                    { minDb: 60, type: 'hvac_system' },
                    { minDb: 50, type: 'ambient_low_frequency' }
                ]
            },
            {
                band: 1,
                types: [
                    { minDb: 80, type: 'power_tool' },
                    { minDb: 70, type: 'machinery' },
                    { minDb: 60, type: 'voices_conversation' },
                    { minDb: 50, type: 'ambient_mid_frequency' }
                ]
            },
            {
                band: 2,
                types: [
                    { minDb: 80, type: 'metal_work_cutting' },
                    { minDb: 70, type: 'compressed_air' },
                    { minDb: 60, type: 'electronic_equipment' },
                    { minDb: 50, type: 'ambient_high_frequency' }
                ]
            }
        ];

        const bandClassifications = classifications[bandIndex];
        if (!bandClassifications) return 'unknown';

        for (const classification of bandClassifications.types) {
            if (avgDb >= classification.minDb) {
                return classification.type;
            }
        }

        return 'unknown';
    }
}

module.exports = TriangulationService;
