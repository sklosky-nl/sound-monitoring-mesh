# Grafana Installation and Configuration Guide

## Installation (Run on production server: xibo.space.nova-labs.org)

```bash
# 1. Add Grafana repository
sudo mkdir -p /etc/apt/keyrings/
wget -q -O - https://apt.grafana.com/gpg.key | gpg --dearmor | sudo tee /etc/apt/keyrings/grafana.gpg > /dev/null
echo "deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com stable main" | sudo tee /etc/apt/sources.list.d/grafana.list

# 2. Install Grafana
sudo apt-get update
sudo apt-get install -y grafana

# 3. Install JSON datasource plugin
sudo grafana-cli plugins install simpod-json-datasource

# 4. Configure Grafana port (to avoid conflict with backend on 3000)
sudo sed -i 's/;http_port = 3000/http_port = 3001/' /etc/grafana/grafana.ini

# 5. Start Grafana
sudo systemctl daemon-reload
sudo systemctl enable grafana-server
sudo systemctl start grafana-server
sudo systemctl status grafana-server
```

## Access Grafana

- **URL:** http://xibo.space.nova-labs.org:3001
- **Default Username:** admin
- **Default Password:** admin
- You'll be prompted to change password on first login

## Configure JSON Datasource

1. Login to Grafana
2. Go to Configuration → Data Sources
3. Click "Add data source"
4. Search for "JSON API" (simpod-json-datasource)
5. Configure:
   - **Name:** Sound Monitoring System
   - **URL:** http://localhost:3000/api/grafana
   - Click "Save & Test"

## Create Dashboard

### Method 1: Import Pre-configured Dashboard

Save this JSON to a file and import it in Grafana:

```json
{
  "dashboard": {
    "title": "Sound Monitoring Mesh",
    "panels": [
      {
        "id": 1,
        "title": "All Sensors - dB Levels",
        "type": "graph",
        "targets": [
          {
            "target": "08:92:72:84:1c:ec.db_level_peak",
            "refId": "A",
            "type": "timeserie"
          },
          {
            "target": "08:92:72:84:1d:18.db_level_peak",
            "refId": "B",
            "type": "timeserie"
          },
          {
            "target": "08:92:72:84:1d:1c.db_level_peak",
            "refId": "C",
            "type": "timeserie"
          }
        ],
        "gridPos": {
          "h": 8,
          "w": 24,
          "x": 0,
          "y": 0
        }
      }
    ]
  }
}
```

### Method 2: Manual Dashboard Creation

1. Click "+" → "Dashboard"
2. Click "Add new panel"
3. Select datasource: "Sound Monitoring System"
4. In the query editor, type a metric like: `08:92:72:84:1c:ec.db_level_peak`
5. Repeat to add more sensors
6. Save dashboard

## Available Metrics

All sensors report:
- `{device_id}.db_level` - Average dB level
- `{device_id}.db_level_peak` - Peak dB level
- `{device_id}.band_1` - Low frequency band (20-200 Hz)
- `{device_id}.band_2` - Mid frequency band (200-2000 Hz)
- `{device_id}.band_3` - High frequency band (2000-8000 Hz)

Aggregate metrics:
- `all.avg` - Average across all sensors
- `all.max` - Maximum across all sensors
- `all.min` - Minimum across all sensors

## Device IDs

- Blue: 08:92:72:84:1c:ec
- Yellow: 08:92:72:84:1d:18
- Grey: 08:92:72:84:1d:1c
- Orange: 08:92:72:84:1d:4c
- Green: 08:92:72:84:1d:50
- Red: 08:92:72:84:1d:84
- Black: 08:92:72:84:1d:d4
- Pink: 08:92:72:84:1e:34
- Purple: 08:92:72:84:1e:4c

## Troubleshooting

### Check Grafana status
```bash
sudo systemctl status grafana-server
```

### View Grafana logs
```bash
sudo journalctl -u grafana-server -f
```

### Check datasource connectivity
```bash
curl -X POST http://localhost:3000/api/grafana/search \
  -H "Content-Type: application/json" \
  -d '{"target":""}'
```

### Restart Grafana
```bash
sudo systemctl restart grafana-server
```

## Security Notes

- Grafana runs on port 3001 (backend on 3000)
- Change default admin password immediately
- Consider setting up SSL/HTTPS through Apache proxy
- Restrict firewall access if needed
