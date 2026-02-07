#!/bin/bash

# Turtle Trading Signals System - Startup Script
# This script starts the production application with pm2

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  Turtle Trading Signals - Production Startup Script        ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if pm2 is installed globally
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}pm2 not found globally. Installing...${NC}"
    npm install -g pm2
fi

# Create logs directory if it doesn't exist
if [ ! -d "$SCRIPT_DIR/logs" ]; then
    echo -e "${YELLOW}Creating logs directory...${NC}"
    mkdir -p "$SCRIPT_DIR/logs"
fi

# Create data directory if it doesn't exist
if [ ! -d "$SCRIPT_DIR/data" ]; then
    echo -e "${YELLOW}Creating data directory...${NC}"
    mkdir -p "$SCRIPT_DIR/data"
fi

# Check if dist/ exists, build if needed
if [ ! -d "$SCRIPT_DIR/dist" ]; then
    echo -e "${YELLOW}dist/ not found. Building project...${NC}"
    cd "$SCRIPT_DIR"
    npm install
    npm run build
    echo -e "${GREEN}Build complete.${NC}"
fi

# Check if database migrations have been run
if [ ! -f "$SCRIPT_DIR/data/signals.db" ]; then
    echo -e "${YELLOW}Database not found. Running migrations...${NC}"
    cd "$SCRIPT_DIR"
    npm run db:migrate
    echo -e "${GREEN}Migrations complete.${NC}"
fi

# Stop existing pm2 process if running
echo -e "${YELLOW}Checking for existing pm2 processes...${NC}"
if pm2 pid turtle-trading-signals &> /dev/null; then
    echo -e "${YELLOW}Stopping existing process...${NC}"
    pm2 stop turtle-trading-signals
    pm2 delete turtle-trading-signals
fi

# Start the application with pm2
echo -e "${YELLOW}Starting Turtle Trading Signals with pm2...${NC}"
cd "$SCRIPT_DIR"
pm2 start ecosystem.config.cjs

# Save pm2 process list
echo -e "${YELLOW}Saving pm2 configuration...${NC}"
pm2 save

# Enable pm2 to start on system boot
echo -e "${YELLOW}Enabling auto-start on system boot...${NC}"
pm2 startup
pm2 save

# Wait a moment for the server to start
sleep 2

# Check if the server is running
if pm2 pid turtle-trading-signals &> /dev/null; then
    echo -e "${GREEN}✅ Server started successfully!${NC}"
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  🎉 Turtle Trading Signals is now running!                 ║${NC}"
    echo -e "${GREEN}║                                                            ║${NC}"
    echo -e "${GREEN}║  🌐 Web Interface: http://localhost:3001                   ║${NC}"
    echo -e "${GREEN}║  🌐 Network Access: http://192.168.1.51:3001              ║${NC}"
    echo -e "${GREEN}║                                                            ║${NC}"
    echo -e "${GREEN}║  📊 Useful Commands:                                       ║${NC}"
    echo -e "${GREEN}║     pm2 logs turtle-trading-signals  - View live logs      ║${NC}"
    echo -e "${GREEN}║     pm2 stop turtle-trading-signals  - Stop the server     ║${NC}"
    echo -e "${GREEN}║     pm2 restart turtle-trading-signals - Restart server    ║${NC}"
    echo -e "${GREEN}║     pm2 delete turtle-trading-signals - Remove from pm2    ║${NC}"
    echo -e "${GREEN}║                                                            ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    
    # Show logs
    echo ""
    echo -e "${YELLOW}Initial startup logs (press Ctrl+C to exit):${NC}"
    pm2 logs turtle-trading-signals --lines 30
else
    echo -e "${RED}❌ Failed to start server. Checking logs...${NC}"
    pm2 logs turtle-trading-signals --err
    exit 1
fi
