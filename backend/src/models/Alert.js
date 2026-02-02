/**
 * Alert storage model
 * File-based storage for alert rules and history
 */

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const ALERTS_DIR = process.env.ALERTS_DIR || './data/alerts';
const ALERT_HISTORY_DIR = path.join(ALERTS_DIR, 'history');

class AlertModel {
    static async ensureDirectory() {
        try {
            await fs.mkdir(ALERTS_DIR, { recursive: true });
            await fs.mkdir(ALERT_HISTORY_DIR, { recursive: true });
        } catch (error) {
            logger.error('Failed to create alerts directory:', error);
            throw error;
        }
    }

    static async createAlert(alertData) {
        await this.ensureDirectory();
        
        const alert = {
            alert_id: uuidv4(),
            device_id: alertData.device_id,
            type: alertData.type || 'threshold',
            threshold: alertData.threshold,
            channel: alertData.channel || 'console',
            webhook_url: alertData.webhook_url,
            enabled: true,
            created_at: new Date().toISOString(),
            last_triggered: null,
            trigger_count: 0
        };

        const filePath = path.join(ALERTS_DIR, `${alert.alert_id}.json`);
        await fs.writeFile(filePath, JSON.stringify(alert, null, 2));
        
        logger.info(`Alert created: ${alert.alert_id}`);
        return alert;
    }

    static async getAllAlerts() {
        await this.ensureDirectory();
        const files = await fs.readdir(ALERTS_DIR);
        const alerts = [];

        for (const file of files) {
            if (file.endsWith('.json')) {
                const filePath = path.join(ALERTS_DIR, file);
                const data = await fs.readFile(filePath, 'utf8');
                alerts.push(JSON.parse(data));
            }
        }

        return alerts;
    }

    static async getAlert(alertId) {
        const filePath = path.join(ALERTS_DIR, `${alertId}.json`);
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

    static async updateAlert(alertId, updates) {
        const alert = await this.getAlert(alertId);
        if (!alert) {
            return null;
        }

        const updatedAlert = { ...alert, ...updates, updated_at: new Date().toISOString() };
        const filePath = path.join(ALERTS_DIR, `${alertId}.json`);
        await fs.writeFile(filePath, JSON.stringify(updatedAlert, null, 2));
        
        return updatedAlert;
    }

    static async deleteAlert(alertId) {
        const filePath = path.join(ALERTS_DIR, `${alertId}.json`);
        try {
            await fs.unlink(filePath);
            logger.info(`Alert deleted: ${alertId}`);
            return true;
        } catch (error) {
            if (error.code === 'ENOENT') {
                return false;
            }
            throw error;
        }
    }

    static async recordAlertTrigger(alertId, measurement) {
        const alert = await this.getAlert(alertId);
        if (!alert) {
            return null;
        }

        // Update alert stats
        alert.last_triggered = new Date().toISOString();
        alert.trigger_count++;
        await this.updateAlert(alertId, alert);

        // Record in history
        const historyEntry = {
            history_id: uuidv4(),
            alert_id: alertId,
            device_id: alert.device_id,
            timestamp: new Date().toISOString(),
            measurement_value: measurement.db_level,
            threshold: alert.threshold,
            resolved: false
        };

        const historyFile = path.join(ALERT_HISTORY_DIR, `${historyEntry.history_id}.json`);
        await fs.writeFile(historyFile, JSON.stringify(historyEntry, null, 2));

        return historyEntry;
    }

    static async getAlertHistory(limit = 100) {
        await this.ensureDirectory();
        const files = await fs.readdir(ALERT_HISTORY_DIR);
        const history = [];

        for (const file of files) {
            if (file.endsWith('.json')) {
                const filePath = path.join(ALERT_HISTORY_DIR, file);
                const data = await fs.readFile(filePath, 'utf8');
                history.push(JSON.parse(data));
            }
        }

        // Sort by timestamp descending
        history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return history.slice(0, limit);
    }

    static async checkAlerts(measurement) {
        const alerts = await this.getAllAlerts();
        const triggeredAlerts = [];

        for (const alert of alerts) {
            if (!alert.enabled) continue;
            if (alert.device_id !== measurement.device_id) continue;

            // Check threshold
            if (alert.type === 'threshold' && measurement.db_level >= alert.threshold) {
                const historyEntry = await this.recordAlertTrigger(alert.alert_id, measurement);
                triggeredAlerts.push({ alert, historyEntry });

                // Send notification
                await this.sendNotification(alert, measurement);
            }
        }

        return triggeredAlerts;
    }

    static async sendNotification(alert, measurement) {
        logger.info(`Alert triggered: ${alert.alert_id}, Device: ${alert.device_id}, Value: ${measurement.db_level} dB`);

        if (alert.channel === 'webhook' && alert.webhook_url) {
            try {
                const fetch = (await import('node-fetch')).default;
                await fetch(alert.webhook_url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        alert_id: alert.alert_id,
                        device_id: alert.device_id,
                        db_level: measurement.db_level,
                        threshold: alert.threshold,
                        timestamp: measurement.timestamp
                    })
                });
                logger.info(`Webhook notification sent to ${alert.webhook_url}`);
            } catch (error) {
                logger.error('Failed to send webhook notification:', error);
            }
        }
    }
}

module.exports = AlertModel;
