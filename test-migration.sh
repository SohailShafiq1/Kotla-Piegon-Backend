#!/bin/bash

echo "========================================="
echo "Testing Image Upload Migration"
echo "========================================="
echo ""

# Configuration
API_URL="http://localhost:5001"
TOKEN="your_token_here"  # Replace with actual admin token

echo "1. Testing server is running..."
curl -s "$API_URL/api/test" && echo " ✅ Server is running" || echo " ❌ Server not running"
echo ""

echo "2. Checking uploads folder..."
if [ -d "../uploads" ]; then
    echo " ✅ Uploads folder exists"
else
    echo " ❌ Uploads folder missing"
fi
echo ""

echo "3. Testing static file serving..."
# This will only work if there are files in uploads
if [ "$(ls -A ../uploads)" ]; then
    FIRST_FILE=$(ls ../uploads | head -1)
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/uploads/$FIRST_FILE")
    if [ "$STATUS" == "200" ]; then
        echo " ✅ Static files are served correctly"
    else
        echo " ⚠️  Got HTTP $STATUS (expected 200)"
    fi
else
    echo " ℹ️  No files in uploads folder yet"
fi
echo ""

echo "4. Testing API endpoints..."
echo "   - GET /api/owners"
curl -s -o /dev/null -w "     Status: %{http_code}\n" \
    -H "Authorization: Bearer $TOKEN" \
    "$API_URL/api/owners"

echo "   - GET /api/tournaments"
curl -s -o /dev/null -w "     Status: %{http_code}\n" \
    "$API_URL/api/tournaments"

echo "   - GET /api/settings"
curl -s -o /dev/null -w "     Status: %{http_code}\n" \
    "$API_URL/api/settings"

echo ""
echo "========================================="
echo "Test Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Run migration: node migrate-images.js"
echo "2. Test file uploads with Postman"
echo "3. Update frontend code to use FormData"
