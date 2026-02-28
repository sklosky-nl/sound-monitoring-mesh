/**
 * Sound Level Mesh System - Backend API Server
 * 
 * Main server file that initializes Express app and routes
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const logger = require('./utils/logger');

// Import routes
const deviceRoutes = require('./routes/devices');
const dataRoutes = require('./routes/data');
const configRoutes = require('./routes/config');
const alertRoutes = require('./routes/alerts');
const analyticsRoutes = require('./routes/analytics');
const positionRoutes = require('./routes/positions');
const barrierRoutes = require('./routes/barriers');
const sourceRoutes = require('./routes/sources');
const triangulationRoutes = require('./routes/triangulation');
const labelRoutes = require('./routes/labels');
const firmwareRoutes = require('./routes/firmware');
const grafanaRoutes = require('./routes/grafana');
const versionRoutes = require('./routes/version');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Set server timeout to 30 seconds
app.use((req, res, next) => {
    req.setTimeout(30000);
    res.setTimeout(30000);
    next();
});

// Request logging
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent')
    });
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// API Routes
app.use('/api/devices', deviceRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/config', configRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/positions', positionRoutes);
app.use('/api/barriers', barrierRoutes);
app.use('/api/sources', sourceRoutes);
app.use('/api/triangulation', triangulationRoutes);
app.use('/api/labels', labelRoutes);
app.use('/api/firmware', firmwareRoutes);
app.use('/api/grafana', grafanaRoutes);
app.use('/api/version', versionRoutes);
// Legacy device registration endpoint (for backward compatibility)
// MUST be last to avoid catching other /api/* routes
app.use('/api', deviceRoutes);

// Serve static frontend files
const frontendPath = path.join(__dirname, '../../frontend');
app.use(express.static(frontendPath));

// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        path: req.path
    });
});

// Start server
app.listen(PORT, HOST, () => {
    logger.info(`Sound Level Backend API running on http://${HOST}:${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Data directory: ${process.env.DATA_DIR || './data'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    process.exit(0);
});

module.exports = app;
