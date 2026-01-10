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
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check for required tools
check_requirements() {
    echo -e "${YELLOW}Checking requirements...${NC}"
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}Error: Node.js is not installed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Node.js installed${NC}"
    
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}Error: npm is not installed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ npm installed${NC}"
    
    if [ -z "$ANDROID_HOME" ]; then
        echo -e "${YELLOW}Warning: ANDROID_HOME not set. Trying default locations...${NC}"
        if [ -d "$HOME/Android/Sdk" ]; then
            export ANDROID_HOME="$HOME/Android/Sdk"
        elif [ -d "$HOME/Library/Android/sdk" ]; then
            export ANDROID_HOME="$HOME/Library/Android/sdk"
        elif [ -d "/usr/local/share/android-sdk" ]; then
            export ANDROID_HOME="/usr/local/share/android-sdk"
        else
            echo -e "${RED}Error: Could not find Android SDK${NC}"
            echo "Please set ANDROID_HOME environment variable"
            exit 1
        fi
    fi
    echo -e "${GREEN}✓ Android SDK found at $ANDROID_HOME${NC}"
    
    # Check for Java
    if ! command -v java &> /dev/null; then
        echo -e "${RED}Error: Java is not installed${NC}"
        echo "Please install JDK 11 or higher"
        exit 1
    fi
    echo -e "${GREEN}✓ Java installed${NC}"
    
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

# Add Android platform if not exists
add_android_platform() {
    if [ ! -d "android" ]; then
        echo -e "${YELLOW}Adding Android platform...${NC}"
        npx cap add android
        echo -e "${GREEN}Android platform added!${NC}"
    else
        echo -e "${GREEN}Android platform already exists${NC}"
    fi
}

# Sync Capacitor
sync_capacitor() {
    echo -e "${YELLOW}Syncing Capacitor with Android...${NC}"
    npx cap sync android
    echo -e "${GREEN}Capacitor sync complete!${NC}"
}

# Build Debug APK
build_debug_apk() {
    echo -e "${YELLOW}Building Debug APK...${NC}"
    
    cd android
    
    # Make gradlew executable
    chmod +x gradlew
    
    # Build debug APK
    ./gradlew assembleDebug
    
    # Copy APK to project root
    if [ -f "app/build/outputs/apk/debug/app-debug.apk" ]; then
        cp app/build/outputs/apk/debug/app-debug.apk ../stablecoin-banking-debug.apk
        echo -e "${GREEN}Debug APK built successfully!${NC}"
        echo -e "${GREEN}Location: $(pwd)/../stablecoin-banking-debug.apk${NC}"
    else
        echo -e "${RED}APK not found at expected location${NC}"
    fi
    
    cd ..
}

# Build Release APK (unsigned)
build_release_apk() {
    echo -e "${YELLOW}Building Release APK...${NC}"
    
    cd android
    
    # Make gradlew executable
    chmod +x gradlew
    
    # Build release APK
    ./gradlew assembleRelease
    
    # Copy APK to project root
    if [ -f "app/build/outputs/apk/release/app-release-unsigned.apk" ]; then
        cp app/build/outputs/apk/release/app-release-unsigned.apk ../stablecoin-banking-release-unsigned.apk
        echo -e "${GREEN}Release APK built!${NC}"
        echo -e "${YELLOW}Note: This APK is unsigned. Sign it before distribution.${NC}"
        echo -e "${GREEN}Location: $(pwd)/../stablecoin-banking-release-unsigned.apk${NC}"
    else
        echo -e "${RED}Release APK not found${NC}"
    fi
    
    cd ..
}

# Build signed Release APK
build_signed_release() {
    echo -e "${YELLOW}Building Signed Release APK...${NC}"
    
    # Check for keystore
    if [ ! -f "android/app/release-keystore.jks" ]; then
        echo -e "${YELLOW}No keystore found. Creating new keystore...${NC}"
        create_keystore
    fi
    
    cd android
    
    # Make gradlew executable
    chmod +x gradlew
    
    # Build signed release
    ./gradlew assembleRelease
    
    if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
        cp app/build/outputs/apk/release/app-release.apk ../stablecoin-banking-release.apk
        echo -e "${GREEN}Signed Release APK built!${NC}"
        echo -e "${GREEN}Location: $(pwd)/../stablecoin-banking-release.apk${NC}"
    fi
    
    cd ..
}

# Create signing keystore
create_keystore() {
    echo -e "${BLUE}Creating release keystore...${NC}"
    echo "You will be prompted to enter keystore details."
    echo ""
    
    keytool -genkey -v \
        -keystore android/app/release-keystore.jks \
        -alias stablecoin \
        -keyalg RSA \
        -keysize 2048 \
        -validity 10000
    
    echo -e "${GREEN}Keystore created!${NC}"
    echo -e "${YELLOW}IMPORTANT: Save your keystore password securely!${NC}"
}

# Open in Android Studio
open_android_studio() {
    echo -e "${BLUE}Opening project in Android Studio...${NC}"
    npx cap open android
}

# Print help
print_help() {
    echo ""
    echo "Usage: ./scripts/build-apk.sh [option]"
    echo ""
    echo "Options:"
    echo "  (no option)  Interactive menu"
    echo "  --debug      Build debug APK"
    echo "  --release    Build unsigned release APK"
    echo "  --signed     Build signed release APK"
    echo "  --studio     Open in Android Studio"
    echo "  --help       Show this help message"
    echo ""
}

# Interactive menu
show_menu() {
    echo ""
    echo "Select build type:"
    echo "1) Debug APK (for testing)"
    echo "2) Release APK (unsigned)"
    echo "3) Signed Release APK (for distribution)"
    echo "4) Open in Android Studio"
    echo "5) Exit"
    read -p "Enter choice [1-5]: " choice
    
    case $choice in
        1) build_debug_apk ;;
        2) build_release_apk ;;
        3) build_signed_release ;;
        4) open_android_studio ;;
        5) exit 0 ;;
        *) 
            echo -e "${RED}Invalid choice${NC}"
            show_menu
            ;;
    esac
}

# Main execution
main() {
    check_requirements
    
    # Handle command line arguments
    case "$1" in
        --debug)
            install_deps
            build_web
            add_android_platform
            sync_capacitor
            build_debug_apk
            exit 0
            ;;
        --release)
            install_deps
            build_web
            add_android_platform
            sync_capacitor
            build_release_apk
            exit 0
            ;;
        --signed)
            install_deps
            build_web
            add_android_platform
            sync_capacitor
            build_signed_release
            exit 0
            ;;
        --studio)
            install_deps
            build_web
            add_android_platform
            sync_capacitor
            open_android_studio
            exit 0
            ;;
        --help)
            print_help
            exit 0
            ;;
    esac
    
    install_deps
    build_web
    add_android_platform
    sync_capacitor
    
    show_menu
    
    echo ""
    echo "=========================================="
    echo -e "${GREEN}Build completed successfully!${NC}"
    echo "=========================================="
}

main "$@"
