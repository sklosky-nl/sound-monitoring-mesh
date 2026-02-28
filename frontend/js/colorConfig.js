/**
 * Color Configuration Module (v2.0.0)
 * Manages sound level color coding and thresholds across all visualizations
 */

class ColorConfig {
    constructor() {
        // Default thresholds for 4-band color scheme
        this.thresholds = {
            green: { min: 0, max: 50, label: 'Quiet' },
            yellow: { min: 50, max: 65, label: 'Moderate' },
            orange: { min: 65, max: 80, label: 'Loud' },
            red: { min: 80, max: 120, label: 'Very Loud' }
        };
        
        // Color definitions
        this.colors = {
            green: { rgb: 'rgb(76, 175, 80)', hex: '#4CAF50', light: '#d1fae5', dark: '#065f46' },
            yellow: { rgb: 'rgb(255, 235, 59)', hex: '#FFEB3B', light: '#fef3c7', dark: '#92400e' },
            orange: { rgb: 'rgb(255, 152, 0)', hex: '#FF9800', light: '#fed7aa', dark: '#9a3412' },
            red: { rgb: 'rgb(244, 67, 54)', hex: '#F44336', light: '#fecaca', dark: '#991b1b' }
        };
        
        this.loaded = false;
    }
    
    async load() {
        try {
            const response = await API.request('/api/config/display-thresholds');
            if (response && response.thresholds) {
                this.thresholds = response.thresholds;
            }
            this.loaded = true;
            console.log('Color config loaded:', this.thresholds);
        } catch (error) {
            console.warn('Using default color thresholds:', error.message);
            this.loaded = true;
        }
    }
    
    async save() {
        try {
            await API.request('/api/config/display-thresholds', {
                method: 'POST',
                body: JSON.stringify({ thresholds: this.thresholds })
            });
            console.log('Color config saved');
            return true;
        } catch (error) {
            console.error('Failed to save color config:', error);
            return false;
        }
    }
    
    /**
     * Get color band for a given dB level
     * @param {number} dbLevel - Sound level in dB
     * @returns {string} - Band name: 'green', 'yellow', 'orange', or 'red'
     */
    getBand(dbLevel) {
        if (dbLevel < this.thresholds.yellow.min) return 'green';
        if (dbLevel < this.thresholds.orange.min) return 'yellow';
        if (dbLevel < this.thresholds.red.min) return 'orange';
        return 'red';
    }
    
    /**
     * Get color object for a given dB level
     * @param {number} dbLevel - Sound level in dB
     * @returns {object} - Color object with rgb, hex, light, dark properties
     */
    getColor(dbLevel) {
        const band = this.getBand(dbLevel);
        return this.colors[band];
    }
    
    /**
     * Get RGB color string for a given dB level
     * @param {number} dbLevel - Sound level in dB
     * @returns {string} - RGB color string
     */
    getRGB(dbLevel) {
        return this.getColor(dbLevel).rgb;
    }
    
    /**
     * Get hex color string for a given dB level
     * @param {number} dbLevel - Sound level in dB
     * @returns {string} - Hex color string
     */
    getHex(dbLevel) {
        return this.getColor(dbLevel).hex;
    }
    
    /**
     * Get CSS class name for a given dB level
     * @param {number} dbLevel - Sound level in dB
     * @returns {string} - CSS class name
     */
    getClass(dbLevel) {
        return this.getBand(dbLevel);
    }
    
    /**
     * Get color and radius for sensor visualization (triangulation map)
     * @param {number} dbLevel - Sound level in dB
     * @returns {object} - Object with color (rgb) and radius properties
     */
    getSensorVisualization(dbLevel) {
        const band = this.getBand(dbLevel);
        const color = this.colors[band].rgb;
        
        // Calculate normalized position within the full range
        const minDb = this.thresholds.green.min;
        const maxDb = this.thresholds.red.max;
        const normalized = Math.max(0, Math.min(1, (dbLevel - minDb) / (maxDb - minDb)));
        
        // Radius grows with dB level (15-40 pixels)
        const radius = 15 + (normalized * 25);
        
        return { color, radius, band };
    }
    
    /**
     * Update a threshold value
     * @param {string} band - Band name (green, yellow, orange, red)
     * @param {string} property - Property to update (min or max)
     * @param {number} value - New value
     */
    setThreshold(band, property, value) {
        if (this.thresholds[band] && (property === 'min' || property === 'max')) {
            this.thresholds[band][property] = parseFloat(value);
        }
    }
    
    /**
     * Get all thresholds
     * @returns {object} - Thresholds object
     */
    getThresholds() {
        return { ...this.thresholds };
    }
}

// Create global instance
window.SoundLevelColors = new ColorConfig();
