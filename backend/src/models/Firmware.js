const fs = require('fs');
const path = require('path');

class Firmware {
    constructor() {
        this.firmwareDir = path.join(__dirname, '../../data/firmware');
        this.metadataFile = path.join(this.firmwareDir, 'versions.json');
        this.ensureDataDirectory();
    }

    ensureDataDirectory() {
        if (!fs.existsSync(this.firmwareDir)) {
            fs.mkdirSync(this.firmwareDir, { recursive: true });
        }
        if (!fs.existsSync(this.metadataFile)) {
            fs.writeFileSync(this.metadataFile, JSON.stringify({ versions: [] }, null, 2));
        }
    }

    // Get all firmware versions
    getAllVersions() {
        try {
            const data = fs.readFileSync(this.metadataFile, 'utf8');
            return JSON.parse(data).versions || [];
        } catch (error) {
            console.error('Error reading firmware versions:', error);
            return [];
        }
    }

    // Get latest firmware version
    getLatestVersion() {
        const versions = this.getAllVersions();
        if (versions.length === 0) return null;
        
        // Sort by version (semantic versioning) and get the latest
        versions.sort((a, b) => {
            // Strip any suffix (e.g., "-prod", "-alpha") before comparing
            const cleanVersion = (v) => v.split('-')[0];
            const aVer = cleanVersion(a.version).split('.').map(Number);
            const bVer = cleanVersion(b.version).split('.').map(Number);
            
            for (let i = 0; i < Math.max(aVer.length, bVer.length); i++) {
                const aVal = aVer[i] || 0;
                const bVal = bVer[i] || 0;
                if (aVal > bVal) return -1;
                if (aVal < bVal) return 1;
            }
            return 0;
        });
        
        return versions[0];
    }

    // Get specific firmware version
    getVersion(version) {
        const versions = this.getAllVersions();
        return versions.find(v => v.version === version);
    }

    // Add new firmware version
    addVersion(versionData) {
        const versions = this.getAllVersions();
        
        // Check if version already exists
        const existingIndex = versions.findIndex(v => v.version === versionData.version);
        if (existingIndex !== -1) {
            versions[existingIndex] = versionData;
        } else {
            versions.push(versionData);
        }
        
        fs.writeFileSync(this.metadataFile, JSON.stringify({ versions }, null, 2));
        return versionData;
    }

    // Check if update is available for a device
    checkForUpdate(currentVersion) {
        const latest = this.getLatestVersion();
        
        if (!latest) {
            return { updateAvailable: false, message: 'No firmware versions available' };
        }
        
        // Compare versions
        if (this.compareVersions(latest.version, currentVersion) > 0) {
            return {
                updateAvailable: true,
                version: latest.version,
                url: `/api/firmware/download/${latest.version}`,
                filename: latest.filename,
                size: latest.size,
                releaseDate: latest.releaseDate,
                description: latest.description
            };
        }
        
        return { updateAvailable: false, message: 'Current version is up to date' };
    }

    // Compare two semantic versions
    compareVersions(v1, v2) {
        // Strip any suffix (e.g., "-prod", "-alpha") before comparing
        const cleanVersion = (v) => v.split('-')[0];
        
        const v1Parts = cleanVersion(v1).split('.').map(Number);
        const v2Parts = cleanVersion(v2).split('.').map(Number);
        
        for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
            const val1 = v1Parts[i] || 0;
            const val2 = v2Parts[i] || 0;
            if (val1 > val2) return 1;
            if (val1 < val2) return -1;
        }
        return 0;
    }

    // Get firmware file path
    getFirmwareFilePath(version) {
        const versionData = this.getVersion(version);
        if (!versionData) return null;
        
        return path.join(this.firmwareDir, versionData.filename);
    }

    // Get firmware binary
    getFirmwareBinary(version) {
        const filePath = this.getFirmwareFilePath(version);
        if (!filePath || !fs.existsSync(filePath)) {
            return null;
        }
        
        return fs.readFileSync(filePath);
    }

    // Upload firmware binary
    uploadFirmware(version, filename, buffer, description = '') {
        const filePath = path.join(this.firmwareDir, filename);
        fs.writeFileSync(filePath, buffer);
        
        const versionData = {
            version,
            filename,
            size: buffer.length,
            releaseDate: new Date().toISOString(),
            description,
            sha256: this.calculateSHA256(buffer)
        };
        
        return this.addVersion(versionData);
    }

    // Calculate SHA256 hash
    calculateSHA256(buffer) {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }

    // Delete firmware version
    deleteVersion(version) {
        const versionData = this.getVersion(version);
        if (!versionData) return false;
        
        // Delete file
        const filePath = this.getFirmwareFilePath(version);
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        
        // Remove from metadata
        const versions = this.getAllVersions().filter(v => v.version !== version);
        fs.writeFileSync(this.metadataFile, JSON.stringify({ versions }, null, 2));
        
        return true;
    }
}

module.exports = new Firmware();
