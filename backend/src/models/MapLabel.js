const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');
const LABELS_FILE = path.join(DATA_DIR, 'map_labels.json');

class MapLabel {
    /**
     * Get all map labels
     */
    static async getAll() {
        try {
            const data = await fs.readFile(LABELS_FILE, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    }

    /**
     * Get a specific label by ID
     */
    static async getById(id) {
        const labels = await this.getAll();
        return labels.find(label => label.id === id);
    }

    /**
     * Create a new label
     */
    static async create(labelData) {
        const labels = await this.getAll();
        
        const newLabel = {
            id: Date.now().toString(),
            text: labelData.text,
            position: {
                x: labelData.position.x,
                y: labelData.position.y
            },
            style: {
                fontSize: labelData.style?.fontSize || 16,
                fontWeight: labelData.style?.fontWeight || 'normal',
                color: labelData.style?.color || '#ffffff',
                backgroundColor: labelData.style?.backgroundColor || '#1a1a1a',
                padding: labelData.style?.padding || 8,
                borderRadius: labelData.style?.borderRadius || 4,
                opacity: labelData.style?.opacity || 0.8
            },
            visible: labelData.visible !== false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        labels.push(newLabel);
        await fs.writeFile(LABELS_FILE, JSON.stringify(labels, null, 2));
        
        return newLabel;
    }

    /**
     * Update an existing label
     */
    static async update(id, updateData) {
        const labels = await this.getAll();
        const index = labels.findIndex(label => label.id === id);
        
        if (index === -1) {
            throw new Error('Label not found');
        }

        const updatedLabel = {
            ...labels[index],
            ...updateData,
            id: labels[index].id, // Preserve ID
            updated_at: new Date().toISOString()
        };

        labels[index] = updatedLabel;
        await fs.writeFile(LABELS_FILE, JSON.stringify(labels, null, 2));
        
        return updatedLabel;
    }

    /**
     * Delete a label
     */
    static async delete(id) {
        const labels = await this.getAll();
        const filteredLabels = labels.filter(label => label.id !== id);
        
        if (filteredLabels.length === labels.length) {
            throw new Error('Label not found');
        }

        await fs.writeFile(LABELS_FILE, JSON.stringify(filteredLabels, null, 2));
        return { success: true, deleted_id: id };
    }
}

module.exports = MapLabel;
