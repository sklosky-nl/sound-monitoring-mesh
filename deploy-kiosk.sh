#!/bin/bash

# Deploy Kiosk Updates to Production Server
# This script copies updated frontend files to xibo.space.nova-labs.org

set -e

SERVER="sklosky@xibo.space.nova-labs.org"
REMOTE_DIR="/opt/sound-monitoring-mesh/frontend"
LOCAL_DIR="/Users/steve.klosky/Downloads/Code/sound monitoring mesh/frontend"

echo "========================================"
echo "🚀 Deploying Kiosk Updates to Production"
echo "========================================"
echo ""
echo "Server: $SERVER"
echo "Target: $REMOTE_DIR"
echo ""

# Copy updated files
echo "📦 Copying updated files..."
echo ""

echo "  → kiosk.html (with cache-busting v=22)"
scp "$LOCAL_DIR/kiosk.html" "$SERVER:$REMOTE_DIR/"

echo "  → js/kiosk.js (with fixed API endpoints)"
scp "$LOCAL_DIR/js/kiosk.js" "$SERVER:$REMOTE_DIR/js/"

echo ""
echo "✅ Files copied successfully!"
echo ""

# Note: Apache restart requires sudo password
echo "⚠️  Apache restart skipped (requires sudo password)"
echo "   Files are deployed and will be served on next request"
echo ""

echo "========================================"
echo "✅ Deployment Complete!"
echo "========================================"
echo ""
echo "🌐 Kiosk URL: http://xibo.space.nova-labs.org/sound/kiosk.html"
echo ""
echo "Note: You may need to hard refresh (Cmd+Shift+R) in your browser"
echo "      to clear the cached JavaScript files."
echo ""
