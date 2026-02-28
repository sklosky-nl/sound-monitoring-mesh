# Grafana Quick Setup Guide

## Installation (COMPLETED - script uploaded)

SSH to server and run:
```bash
ssh sklosky@xibo.space.nova-labs.org
bash grafana-install-prod.sh
```

## Access Grafana

**URL:** http://xibo.space.nova-labs.org:3001
**Username:** admin
**Password:** admin (change on first login)

## Configure JSON Datasource

1. Login to Grafana
2. Click ⚙️ **Configuration** → **Data sources**
3. Click **Add data source**
4. Search for **"JSON API"** and select it
5. Configure:
   ```
   Name: Sound Monitoring System
   URL: http://localhost:3000/api/grafana
   ```
6. Click **Save & Test** (should show green checkmark)

## Import Dashboard

1. Click **+** → **Import**
2. Click **Upload JSON file**
3. Select **grafana-dashboard.json** (in your home directory on server)
4. Select datasource: **Sound Monitoring System**
5. Click **Import**

## Dashboard Features

The dashboard includes:
- **All 9 sensors** peak dB levels on one chart
- **Blue sensor** average vs peak comparison
- **Frequency band** analysis (low/mid/high)
- **Current levels** stat panel with color thresholds
- **Auto-refresh** every 30 seconds

## Test the API

From the server:
```bash
# Test health check
curl http://localhost:3000/api/grafana/

# Test available metrics
curl -X POST http://localhost:3000/api/grafana/search \
  -H "Content-Type: application/json" \
  -d '{"target":""}'
```

## Troubleshooting

View Grafana logs:
```bash
sudo journalctl -u grafana-server -f
```

Restart Grafana:
```bash
sudo systemctl restart grafana-server
```

Check status:
```bash
sudo systemctl status grafana-server
```

## Port Configuration

- Backend API: Port 3000
- Grafana: Port 3001
- Frontend: Port 80 (via Apache)

All services are running on xibo.space.nova-labs.org
