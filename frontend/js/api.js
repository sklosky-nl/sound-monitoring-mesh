/**
 * API Service - handles all backend API calls
 */

const API = {
    baseUrl: localStorage.getItem('apiUrl') || 'http://localhost:3000',

    setBaseUrl(url) {
        this.baseUrl = url;
        localStorage.setItem('apiUrl', url);
    },

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        
        console.log('API Request:', url, options);
        
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });

            console.log('API Response status:', response.status);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || error.error || 'Request failed');
            }

            const data = await response.json();
            console.log('API Response data:', data);
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    },

    // Health check
    async healthCheck() {
        return this.request('/health');
    },

    // Device endpoints
    async getAllDevices() {
        return this.request('/api/devices');
    },

    async getDevice(deviceId) {
        return this.request(`/api/devices/${deviceId}`);
    },

    async registerDevice(deviceData) {
        return this.request('/api/devices/register', {
            method: 'POST',
            body: JSON.stringify(deviceData)
        });
    },

    async updateDevice(deviceId, updates) {
        return this.request(`/api/devices/${deviceId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    },

    async updateDeviceNickname(deviceId, nickname) {
        return this.request(`/api/devices/${deviceId}/nickname`, {
            method: 'PATCH',
            body: JSON.stringify({ nickname })
        });
    },

    async deleteDevice(deviceId) {
        return this.request(`/api/devices/${deviceId}`, {
            method: 'DELETE'
        });
    },

    // Measurement endpoints
    async getMeasurements(deviceId, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `/api/data/measurements/${deviceId}${queryString ? '?' + queryString : ''}`;
        return this.request(endpoint);
    },

    async getLatestMeasurements(deviceId, limit = 10) {
        return this.getMeasurements(deviceId, { limit });
    },

    // Configuration endpoints
    async getDeviceConfig(deviceId) {
        return this.request(`/api/config/devices/${deviceId}/frequency-bands`);
    },

    async updateDeviceConfig(deviceId, config) {
        return this.request(`/api/config/devices/${deviceId}/frequency-bands`, {
            method: 'PUT',
            body: JSON.stringify(config)
        });
    },

    async updateCalibration(deviceId, offset) {
        return this.request(`/api/config/devices/${deviceId}/calibration`, {
            method: 'PUT',
            body: JSON.stringify({ calibration_offset_db: offset })
        });
    },

    // Cleanup
    async runCleanup() {
        return this.request('/api/data/cleanup', {
            method: 'POST'
        });
    },

    // Alerts
    async getAllAlerts() {
        return this.request('/api/alerts');
    },

    async createAlert(alertData) {
        return this.request('/api/alerts', {
            method: 'POST',
            body: JSON.stringify(alertData)
        });
    },

    async updateAlert(alertId, updates) {
        return this.request(`/api/alerts/${alertId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    },

    async deleteAlert(alertId) {
        return this.request(`/api/alerts/${alertId}`, {
            method: 'DELETE'
        });
    },

    async getAlertHistory(limit = 100) {
        return this.request(`/api/alerts/history/all?limit=${limit}`);
    },

    // Analytics
    async getAnalytics(deviceId, startDate, endDate) {
        const params = new URLSearchParams();
        if (deviceId) params.append('device_id', deviceId);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        return this.request(`/api/analytics/stats?${params.toString()}`);
    },

    async getTrend(deviceId, startDate, endDate, interval = '1h') {
        const params = new URLSearchParams({ device_id: deviceId });
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        params.append('interval', interval);
        return this.request(`/api/analytics/trend?${params.toString()}`);
    },

    // Export
    async exportCSV(deviceId, startDate, endDate) {
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        const url = `${this.baseUrl}/api/data/export/csv/${deviceId}?${params.toString()}`;
        window.open(url, '_blank');
    },

    async exportJSON() {
        const url = `${this.baseUrl}/api/data/export/json`;
        window.open(url, '_blank');
    },

    // Frequency bands
    async updateFrequencyBands(deviceId, bands) {
        return this.request(`/api/config/devices/${deviceId}/frequency-bands`, {
            method: 'PUT',
            body: JSON.stringify({ frequency_bands: bands })
        });
    },

    // Sensor positions (Triangulation)
    async getSensorPositions() {
        return this.request('/api/positions');
    },

    async getSensorPosition(deviceId) {
        return this.request(`/api/positions/${deviceId}`);
    },

    async updateSensorPosition(deviceId, positionData) {
        return this.request(`/api/positions/${deviceId}`, {
            method: 'PUT',
            body: JSON.stringify(positionData)
        });
    },

    async batchUpdatePositions(positions) {
        return this.request('/api/positions/batch', {
            method: 'POST',
            body: JSON.stringify({ positions })
        });
    },

    // Acoustic barriers (Triangulation)
    async getBarriers() {
        return this.request('/api/barriers');
    },

    async getBarrier(barrierId) {
        return this.request(`/api/barriers/${barrierId}`);
    },

    async createBarrier(barrierData) {
        return this.request('/api/barriers', {
            method: 'POST',
            body: JSON.stringify(barrierData)
        });
    },

    async updateBarrier(barrierId, updates) {
        return this.request(`/api/barriers/${barrierId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    },

    async deleteBarrier(barrierId) {
        return this.request(`/api/barriers/${barrierId}`, {
            method: 'DELETE'
        });
    },

    async getMaterialPresets() {
        return this.request('/api/barriers/materials/presets');
    },

    // Map labels (Triangulation)
    async getLabels() {
        return this.request('/api/labels');
    },

    async getLabel(labelId) {
        return this.request(`/api/labels/${labelId}`);
    },

    async createLabel(labelData) {
        return this.request('/api/labels', {
            method: 'POST',
            body: JSON.stringify(labelData)
        });
    },

    async updateLabel(labelId, updates) {
        return this.request(`/api/labels/${labelId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    },

    async deleteLabel(labelId) {
        return this.request(`/api/labels/${labelId}`, {
            method: 'DELETE'
        });
    },

    // Sound source locations (Triangulation)
    async getRecentSources(minutes = 5) {
        return this.request(`/api/sources/recent?minutes=${minutes}`);
    },

    async getSources(startDate, endDate) {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        return this.request(`/api/sources?${params.toString()}`);
    },

    async getSource(locationId) {
        return this.request(`/api/sources/${locationId}`);
    },

    async getSourceStats(startDate, endDate) {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        return this.request(`/api/sources/stats/summary?${params.toString()}`);
    },

    async triangulateNow(startTimestamp, endTimestamp) {
        return this.request('/api/sources/triangulate', {
            method: 'POST',
            body: JSON.stringify({ startTimestamp, endTimestamp })
        });
    },

    async getHeatmapData(startDate, endDate, gridSize = 1.0) {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        params.append('gridSize', gridSize);
        return this.request(`/api/sources/heatmap/data?${params.toString()}`);
    }
};
