/**
 * Historical Playback Controller (v2.0.0)
 * Provides timeline controls for replaying historical triangulation data
 */

class PlaybackController {
    constructor() {
        this.isPlaying = false;
        this.currentTime = null;
        this.startTime = null;
        this.endTime = null;
        this.playbackSpeed = 1.0; // 1x real-time
        this.windowSeconds = 10; // Time window for each frame
        this.playbackInterval = null;
        this.frameIntervalMs = 100; // Update every 100ms
        this.dataCache = new Map();
        this.availabilityData = null;
        
        // Callbacks
        this.onTimeUpdate = null;
        this.onDataLoad = null;
        this.onPlayStateChange = null;
        this.onRangeUpdate = null;
        this.onAvailabilityUpdate = null;
    }

    async initialize() {
        try {
            // Get available data range from server
            const response = await API.request('/api/triangulation/playback/range');
            
            if (!response.available) {
                console.warn('No historical data available for playback');
                return false;
            }
            
            this.startTime = new Date(response.earliestTime);
            this.endTime = new Date(response.latestTime);
            this.currentTime = new Date(this.startTime);
            
            if (this.onRangeUpdate) {
                this.onRangeUpdate({
                    start: this.startTime,
                    end: this.endTime,
                    totalDays: response.totalDays
                });
            }
            
            // Load data availability map
            await this.loadAvailabilityMap();
            
            console.log(`Playback range: ${this.startTime.toISOString()} to ${this.endTime.toISOString()}`);
            return true;
        } catch (error) {
            console.error('Failed to initialize playback:', error);
            return false;
        }
    }

    async loadAvailabilityMap() {
        try {
            const response = await API.request(
                `/api/triangulation/playback/availability?startTime=${this.startTime.toISOString()}&endTime=${this.endTime.toISOString()}&resolution=200`
            );
            
            this.availabilityData = response.availability;
            
            if (this.onAvailabilityUpdate) {
                this.onAvailabilityUpdate(this.availabilityData);
            }
            
            console.log('Availability map loaded with', this.availabilityData.length, 'data points');
        } catch (error) {
            console.error('Failed to load availability map:', error);
        }
    }

    async loadDataForTime(time) {
        const cacheKey = Math.floor(time.getTime() / 1000);
        
        if (this.dataCache.has(cacheKey)) {
            return this.dataCache.get(cacheKey);
        }
        
        try {
            const data = await API.request(
                `/api/triangulation/playback/window?time=${time.toISOString()}&windowSeconds=${this.windowSeconds}`
            );
            
            this.dataCache.set(cacheKey, data);
            
            // Limit cache size to 100 entries
            if (this.dataCache.size > 100) {
                const firstKey = this.dataCache.keys().next().value;
                this.dataCache.delete(firstKey);
            }
            
            return data;
        } catch (error) {
            console.error('Failed to load playback data:', error);
            return null;
        }
    }

    play() {
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        
        if (this.onPlayStateChange) {
            this.onPlayStateChange(true);
        }
        
        this.playbackInterval = setInterval(() => {
            this.tick();
        }, this.frameIntervalMs);
        
        console.log(`Playback started at ${this.playbackSpeed}x speed`);
    }

    pause() {
        if (!this.isPlaying) return;
        
        this.isPlaying = false;
        
        if (this.playbackInterval) {
            clearInterval(this.playbackInterval);
            this.playbackInterval = null;
        }
        
        if (this.onPlayStateChange) {
            this.onPlayStateChange(false);
        }
        
        console.log('Playback paused');
    }

    stop() {
        this.pause();
        this.currentTime = new Date(this.startTime);
        this.updateCurrentFrame();
    }

    async tick() {
        // Advance time based on playback speed
        const advanceMs = (this.frameIntervalMs / 1000) * this.playbackSpeed * 1000;
        this.currentTime = new Date(this.currentTime.getTime() + advanceMs);
        
        // Check if reached end
        if (this.currentTime >= this.endTime) {
            this.currentTime = new Date(this.endTime);
            this.pause();
            console.log('Playback reached end');
        }
        
        await this.updateCurrentFrame();
    }

    async updateCurrentFrame() {
        const data = await this.loadDataForTime(this.currentTime);
        
        if (data && this.onDataLoad) {
            this.onDataLoad(data);
        }
        
        if (this.onTimeUpdate) {
            this.onTimeUpdate(this.currentTime);
        }
    }

    setSpeed(speed) {
        // Supported speeds: 0.25x, 0.5x, 1x, 2x, 5x, 10x
        const validSpeeds = [0.25, 0.5, 1, 2, 5, 10];
        
        if (validSpeeds.includes(speed)) {
            this.playbackSpeed = speed;
            console.log(`Playback speed set to ${speed}x`);
        } else {
            console.warn(`Invalid speed: ${speed}. Use one of: ${validSpeeds.join(', ')}`);
        }
    }

    async seek(time) {
        if (time < this.startTime) {
            time = new Date(this.startTime);
        } else if (time > this.endTime) {
            time = new Date(this.endTime);
        }
        
        this.currentTime = new Date(time);
        await this.updateCurrentFrame();
    }

    async jogForward(seconds = 1) {
        const newTime = new Date(this.currentTime.getTime() + seconds * 1000);
        await this.seek(newTime);
    }

    async jogBackward(seconds = 1) {
        const newTime = new Date(this.currentTime.getTime() - seconds * 1000);
        await this.seek(newTime);
    }

    async skipToStart() {
        await this.seek(this.startTime);
    }

    async skipToEnd() {
        await this.seek(this.endTime);
    }

    setTimeWindow(seconds) {
        this.windowSeconds = Math.max(1, Math.min(60, seconds));
        console.log(`Time window set to ${this.windowSeconds}s`);
    }

    getProgress() {
        if (!this.startTime || !this.endTime) return 0;
        
        const total = this.endTime.getTime() - this.startTime.getTime();
        const current = this.currentTime.getTime() - this.startTime.getTime();
        
        return (current / total) * 100;
    }

    getDuration() {
        if (!this.startTime || !this.endTime) return 0;
        return this.endTime.getTime() - this.startTime.getTime();
    }

    getTimeRemaining() {
        if (!this.currentTime || !this.endTime) return 0;
        return Math.max(0, this.endTime.getTime() - this.currentTime.getTime());
    }

    clearCache() {
        this.dataCache.clear();
        console.log('Playback cache cleared');
    }

    destroy() {
        this.pause();
        this.clearCache();
        this.onTimeUpdate = null;
        this.onDataLoad = null;
        this.onPlayStateChange = null;
        this.onRangeUpdate = null;
    }
}

// Export for use in other modules
window.PlaybackController = PlaybackController;
