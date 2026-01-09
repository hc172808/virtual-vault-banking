#!/bin/bash

# ============================================
# StableCoin Banking APK Build Script
# ============================================
# This script builds an Android APK for distribution
# 
# Prerequisites:
# 1. Node.js and npm installed
# 2. Android Studio installed with SDK
# 3. Java JDK 11+ installed
# 4. ANDROID_HOME environment variable set
#
# Usage:
#   chmod +x scripts/build-apk.sh
#   ./scripts/build-apk.sh
# ============================================

set -e

echo "=========================================="
echo "StableCoin Banking - APK Build Script"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for required tools
check_requirements() {
    echo -e "${YELLOW}Checking requirements...${NC}"
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Error: Node.js is not installed${NC}"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}Error: npm is not installed${NC}"
        exit 1
    fi
    
    if [ -z "$ANDROID_HOME" ]; then
        echo -e "${YELLOW}Warning: ANDROID_HOME not set. Trying default locations...${NC}"
        if [ -d "$HOME/Android/Sdk" ]; then
            export ANDROID_HOME="$HOME/Android/Sdk"
        elif [ -d "$HOME/Library/Android/sdk" ]; then
            export ANDROID_HOME="$HOME/Library/Android/sdk"
        else
            echo -e "${RED}Error: Could not find Android SDK${NC}"
            exit 1
        fi
    fi
    
    echo -e "${GREEN}All requirements met!${NC}"
}

# Install dependencies
install_deps() {
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
    echo -e "${GREEN}Dependencies installed!${NC}"
}

# Build the web app
build_web() {
    echo -e "${YELLOW}Building web application...${NC}"
    npm run build
    echo -e "${GREEN}Web build complete!${NC}"
}

# Sync Capacitor
sync_capacitor() {
    echo -e "${YELLOW}Syncing Capacitor...${NC}"
    npx cap sync android
    echo -e "${GREEN}Capacitor sync complete!${NC}"
}

# Build APK
build_apk() {
    echo -e "${YELLOW}Building APK...${NC}"
    
    cd android
    
    # Build debug APK
    ./gradlew assembleDebug
    
    # Copy APK to project root
    cp app/build/outputs/apk/debug/app-debug.apk ../stablecoin-banking-debug.apk
    
    cd ..
    
    echo -e "${GREEN}APK built successfully!${NC}"
    echo -e "${GREEN}Location: $(pwd)/stablecoin-banking-debug.apk${NC}"
}

# Build release APK (requires signing)
build_release_apk() {
    echo -e "${YELLOW}Building Release APK...${NC}"
    
    cd android
    
    # Build release APK
    ./gradlew assembleRelease
    
    # Copy APK to project root
    if [ -f "app/build/outputs/apk/release/app-release-unsigned.apk" ]; then
        cp app/build/outputs/apk/release/app-release-unsigned.apk ../stablecoin-banking-release.apk
        echo -e "${YELLOW}Note: Release APK is unsigned. Sign it before distribution.${NC}"
    fi
    
    cd ..
    
    echo -e "${GREEN}Release APK built!${NC}"
}

# Main execution
main() {
    check_requirements
    
    # Check if Android platform exists
    if [ ! -d "android" ]; then
        echo -e "${YELLOW}Adding Android platform...${NC}"
        npx cap add android
    fi
    
    install_deps
    build_web
    sync_capacitor
    
    # Ask for build type
    echo ""
    echo "Select build type:"
    echo "1) Debug APK (for testing)"
    echo "2) Release APK (for production)"
    read -p "Enter choice [1-2]: " choice
    
    case $choice in
        1) build_apk ;;
        2) build_release_apk ;;
        *) build_apk ;;
    esac
    
    echo ""
    echo "=========================================="
    echo -e "${GREEN}Build completed successfully!${NC}"
    echo "=========================================="
}

main "$@"
