#!/bin/bash
# Run this script on xibo.space.nova-labs.org as user sklosky
# Execute: bash grafana-install-prod.sh

echo "=========================================="
echo "Installing Grafana on Production Server"
echo "=========================================="
echo ""

# Install dependencies
echo "Step 1: Installing dependencies..."
sudo apt-get update
sudo apt-get install -y apt-transport-https software-properties-common wget

# Add Grafana GPG key
echo ""
echo "Step 2: Adding Grafana repository..."
sudo mkdir -p /etc/apt/keyrings/
wget -q -O - https://apt.grafana.com/gpg.key | gpg --dearmor | sudo tee /etc/apt/keyrings/grafana.gpg > /dev/null

# Add stable repository
echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com stable main" | sudo tee /etc/apt/sources.list.d/grafana.list

# Update package list
echo ""
echo "Step 3: Updating package list..."
sudo apt-get update

# Install Grafana
echo ""
echo "Step 4: Installing Grafana..."
sudo apt-get install -y grafana

# Install JSON datasource plugin
echo ""
echo "Step 5: Installing JSON datasource plugin..."
sudo grafana-cli plugins install simpod-json-datasource

# Configure Grafana to use port 3001 (avoid conflict with backend on 3000)
echo ""
echo "Step 6: Configuring Grafana port..."
sudo sed -i 's/;http_port = 3000/http_port = 3001/' /etc/grafana/grafana.ini

# Enable and start Grafana
echo ""
echo "Step 7: Starting Grafana service..."
sudo systemctl daemon-reload
sudo systemctl enable grafana-server
sudo systemctl start grafana-server

# Wait for service to start
echo ""
echo "Waiting for Grafana to start..."
sleep 5

# Check status
echo ""
echo "=========================================="
if sudo systemctl is-active --quiet grafana-server; then
    echo "✅ Grafana installed successfully!"
    echo "=========================================="
    echo ""
    echo "📊 Access Grafana at: http://xibo.space.nova-labs.org:3001"
    echo ""
    echo "🔐 Default credentials:"
    echo "   Username: admin"
    echo "   Password: admin"
    echo ""
    echo "Next steps:"
    echo "1. Login to Grafana"
    echo "2. Change admin password"
    echo "3. Add datasource: Configuration → Data Sources → Add data source"
    echo "   - Type: JSON API"
    echo "   - URL: http://localhost:3000/api/grafana"
    echo "   - Click 'Save & Test'"
    echo "4. Import dashboard from grafana-dashboard.json"
    echo ""
else
    echo "❌ Grafana service failed to start"
    echo "=========================================="
    sudo systemctl status grafana-server
    exit 1
fi
