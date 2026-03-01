#!/bin/bash

# Install Grafana on Ubuntu/Debian Server
# This script installs Grafana and the JSON datasource plugin

set -e

echo "========================================"
echo "Installing Grafana for Sound Monitoring"
echo "========================================"
echo ""

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo "Please run with sudo"
    exit 1
fi

# Install required dependencies
echo "📦 Installing dependencies..."
apt-get update
apt-get install -y apt-transport-https software-properties-common wget

# Add Grafana GPG key
echo "🔑 Adding Grafana repository..."
mkdir -p /etc/apt/keyrings/
wget -q -O - https://apt.grafana.com/gpg.key | gpg --dearmor | tee /etc/apt/keyrings/grafana.gpg > /dev/null

# Add stable repository
echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com stable main" | tee /etc/apt/sources.list.d/grafana.list

# Update package list
apt-get update

# Install Grafana
echo "📥 Installing Grafana..."
apt-get install -y grafana

# Install JSON datasource plugin
echo "🔌 Installing JSON datasource plugin..."
grafana-cli plugins install simpod-json-datasource

# Enable and start Grafana
echo "🚀 Starting Grafana service..."
systemctl daemon-reload
systemctl enable grafana-server
systemctl start grafana-server

# Wait for service to start
sleep 5

# Check status
if systemctl is-active --quiet grafana-server; then
    echo ""
    echo "========================================"
    echo "✅ Grafana installed successfully!"
    echo "========================================"
    echo ""
    echo "📊 Grafana is running on: http://localhost:3001"
    echo "   (Default port changed to 3001 to avoid conflict with backend)"
    echo ""
    echo "🔐 Default credentials:"
    echo "   Username: admin"
    echo "   Password: admin"
    echo "   (You'll be prompted to change on first login)"
    echo ""
    echo "🔧 Configuration file: /etc/grafana/grafana.ini"
    echo "📁 Plugin directory: /var/lib/grafana/plugins"
    echo ""
    echo "Next steps:"
    echo "1. Access Grafana web UI"
    echo "2. Configure JSON datasource pointing to:"
    echo "   http://localhost:3000/api/grafana"
    echo "3. Import dashboard configuration"
    echo ""
else
    echo "❌ Grafana service failed to start"
    systemctl status grafana-server
    exit 1
fi
