#!/bin/bash

# Rate Limiting Test Script
# Tests the IP-based rate limiting implementation

set -e

# Configuration
WORKER_URL="${WORKER_URL:-http://localhost:8787}"  # Use local dev server by default
ADMIN_KEY="${ADMIN_KEY:-demo-admin-key-12345}"
WRONG_KEY="wrong-key-12345"

echo "================================================"
echo "Rate Limiting Test Suite"
echo "================================================"
echo "Worker URL: $WORKER_URL"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Normal request with correct key
echo "Test 1: Normal authenticated request"
echo "-------------------------------------"
response=$(curl -s -o /dev/null -w "%{http_code}" "$WORKER_URL/api/admin/links?key=$ADMIN_KEY")
if [ "$response" -eq 200 ]; then
    echo -e "${GREEN}✓ PASS${NC} - Authenticated request succeeded (200)"
else
    echo -e "${RED}✗ FAIL${NC} - Expected 200, got $response"
fi
echo ""

# Test 2: Single failed authentication attempt
echo "Test 2: Single failed authentication attempt"
echo "---------------------------------------------"
response=$(curl -s -o /dev/null -w "%{http_code}" "$WORKER_URL/api/admin/links?key=$WRONG_KEY")
if [ "$response" -eq 401 ]; then
    echo -e "${GREEN}✓ PASS${NC} - Failed auth returned 401"
else
    echo -e "${RED}✗ FAIL${NC} - Expected 401, got $response"
fi
echo ""

# Test 3: Multiple failed attempts (should not be blocked yet)
echo "Test 3: Multiple failed attempts (5 total)"
echo "-------------------------------------------"
failed_count=0
for i in {1..5}; do
    response=$(curl -s -o /dev/null -w "%{http_code}" "$WORKER_URL/api/admin/links?key=$WRONG_KEY")
    if [ "$response" -eq 401 ]; then
        ((failed_count++))
    fi
    sleep 0.5
done

if [ "$failed_count" -eq 5 ]; then
    echo -e "${GREEN}✓ PASS${NC} - All 5 attempts returned 401 (not blocked yet)"
else
    echo -e "${YELLOW}⚠ WARNING${NC} - Got $failed_count/5 401 responses"
fi
echo ""

# Test 4: Exceed rate limit (trigger block)
echo "Test 4: Exceed rate limit (6 more attempts = 11 total)"
echo "-------------------------------------------------------"
block_triggered=false
for i in {1..6}; do
    response=$(curl -s -o /dev/null -w "%{http_code}" "$WORKER_URL/api/admin/links?key=$WRONG_KEY")
    if [ "$response" -eq 429 ]; then
        block_triggered=true
        echo -e "${GREEN}✓ PASS${NC} - Rate limit triggered on attempt $i (429 response)"
        break
    fi
    sleep 0.5
done

if [ "$block_triggered" = false ]; then
    echo -e "${YELLOW}⚠ WARNING${NC} - Rate limit not triggered after 11 attempts"
    echo "  This may indicate rate limiting is not working or limit is >10"
fi
echo ""

# Test 5: Verify block persists
echo "Test 5: Verify IP remains blocked"
echo "----------------------------------"
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$WORKER_URL/api/admin/links?key=$WRONG_KEY")
http_code=$(echo "$response" | grep "HTTP_CODE" | cut -d':' -f2)
body=$(echo "$response" | sed '/HTTP_CODE/d')

if [ "$http_code" -eq 429 ]; then
    echo -e "${GREEN}✓ PASS${NC} - IP still blocked (429)"
    if echo "$body" | grep -q "Too many"; then
        echo "  Response: $body"
    fi
else
    echo -e "${YELLOW}⚠ WARNING${NC} - Expected 429, got $http_code"
fi
echo ""

# Test 6: Successful auth clears rate limit
echo "Test 6: Successful authentication clears rate limit"
echo "----------------------------------------------------"
echo "  Authenticating with correct key..."
response=$(curl -s -o /dev/null -w "%{http_code}" "$WORKER_URL/api/admin/links?key=$ADMIN_KEY")

if [ "$response" -eq 200 ]; then
    echo -e "${GREEN}✓ PASS${NC} - Authentication succeeded (200)"

    # Wait a moment
    sleep 1

    # Try with wrong key again - should get 401, not 429
    echo "  Testing if rate limit was cleared..."
    response=$(curl -s -o /dev/null -w "%{http_code}" "$WORKER_URL/api/admin/links?key=$WRONG_KEY")

    if [ "$response" -eq 401 ]; then
        echo -e "${GREEN}✓ PASS${NC} - Rate limit cleared (got 401 instead of 429)"
    elif [ "$response" -eq 429 ]; then
        echo -e "${RED}✗ FAIL${NC} - Rate limit not cleared (still getting 429)"
    else
        echo -e "${YELLOW}⚠ WARNING${NC} - Unexpected response: $response"
    fi
else
    echo -e "${RED}✗ FAIL${NC} - Authentication failed with correct key"
fi
echo ""

# Test 7: Test analytics endpoint rate limiting
echo "Test 7: Analytics endpoint rate limiting"
echo "-----------------------------------------"
# Try with wrong key multiple times
for i in {1..12}; do
    response=$(curl -s -o /dev/null -w "%{http_code}" "$WORKER_URL/analytics/test?key=$WRONG_KEY")
    if [ "$response" -eq 429 ]; then
        echo -e "${GREEN}✓ PASS${NC} - Analytics endpoint rate limiting works (429 on attempt $i)"
        break
    fi
    sleep 0.5
done

if [ "$response" -ne 429 ]; then
    echo -e "${YELLOW}⚠ WARNING${NC} - Analytics endpoint may not have rate limiting"
fi
echo ""

echo "================================================"
echo "Test Summary"
echo "================================================"
echo "Rate limiting implementation appears to be working"
echo "if you saw 429 responses after multiple failed attempts."
echo ""
echo "Next steps:"
echo "1. Run 'wrangler dev' to test locally"
echo "2. Deploy with 'wrangler deploy'"
echo "3. Run this script against production"
echo "================================================"
