#!/bin/bash

# ============================================
# StableCoin Banking IPA Build Script
# ============================================
# This script builds an iOS IPA for distribution
# 
# Prerequisites:
# 1. macOS with Xcode installed
# 2. Node.js and npm installed
# 3. Apple Developer account configured
# 4. Valid signing certificates and provisioning profiles
#
# Usage:
#   chmod +x scripts/build-ipa.sh
#   ./scripts/build-ipa.sh
# ============================================

set -e

echo "=========================================="
echo "StableCoin Banking - IPA Build Script"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check for macOS
check_macos() {
    if [[ "$OSTYPE" != "darwin"* ]]; then
        echo -e "${RED}Error: This script requires macOS to build iOS apps${NC}"
        echo "iOS development requires a Mac with Xcode installed."
        exit 1
    fi
    echo -e "${GREEN}✓ Running on macOS${NC}"
}

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
    
    if ! command -v xcodebuild &> /dev/null; then
        echo -e "${RED}Error: Xcode is not installed${NC}"
        echo "Please install Xcode from the App Store"
        exit 1
    fi
    echo -e "${GREEN}✓ Xcode installed${NC}"
    
    # Check Xcode command line tools
    if ! xcode-select -p &> /dev/null; then
        echo -e "${YELLOW}Installing Xcode command line tools...${NC}"
        xcode-select --install
    fi
    echo -e "${GREEN}✓ Xcode command line tools installed${NC}"
    
    # Check CocoaPods
    if ! command -v pod &> /dev/null; then
        echo -e "${YELLOW}Installing CocoaPods...${NC}"
        sudo gem install cocoapods
    fi
    echo -e "${GREEN}✓ CocoaPods installed${NC}"
    
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

# Add iOS platform if not exists
add_ios_platform() {
    if [ ! -d "ios" ]; then
        echo -e "${YELLOW}Adding iOS platform...${NC}"
        npx cap add ios
        echo -e "${GREEN}iOS platform added!${NC}"
    else
        echo -e "${GREEN}iOS platform already exists${NC}"
    fi
}

# Sync Capacitor
sync_capacitor() {
    echo -e "${YELLOW}Syncing Capacitor with iOS...${NC}"
    npx cap sync ios
    echo -e "${GREEN}Capacitor sync complete!${NC}"
}

# Install CocoaPods dependencies
install_pods() {
    echo -e "${YELLOW}Installing CocoaPods dependencies...${NC}"
    cd ios/App
    pod install
    cd ../..
    echo -e "${GREEN}CocoaPods dependencies installed!${NC}"
}

# Open in Xcode
open_xcode() {
    echo -e "${BLUE}Opening project in Xcode...${NC}"
    npx cap open ios
    echo ""
    echo -e "${YELLOW}=========================================="
    echo "Next Steps in Xcode:"
    echo "=========================================="
    echo "1. Select your Team in Signing & Capabilities"
    echo "2. Configure your Bundle Identifier"
    echo "3. Select a destination device or simulator"
    echo "4. Product → Archive (for distribution)"
    echo "5. Distribute App → Ad Hoc or App Store"
    echo -e "==========================================${NC}"
}

# Build for simulator (debug)
build_simulator() {
    echo -e "${YELLOW}Building for iOS Simulator...${NC}"
    
    cd ios/App
    
    xcodebuild \
        -workspace App.xcworkspace \
        -scheme App \
        -configuration Debug \
        -destination 'platform=iOS Simulator,name=iPhone 15 Pro' \
        -derivedDataPath build \
        build
    
    cd ../..
    
    echo -e "${GREEN}Simulator build complete!${NC}"
    echo -e "${GREEN}Run 'npx cap run ios' to launch on simulator${NC}"
}

# Build archive for distribution
build_archive() {
    echo -e "${YELLOW}Building archive for distribution...${NC}"
    
    cd ios/App
    
    # Clean previous builds
    xcodebuild clean \
        -workspace App.xcworkspace \
        -scheme App \
        -configuration Release
    
    # Build archive
    xcodebuild archive \
        -workspace App.xcworkspace \
        -scheme App \
        -configuration Release \
        -archivePath build/StableCoinBanking.xcarchive \
        -destination 'generic/platform=iOS'
    
    cd ../..
    
    echo -e "${GREEN}Archive created at ios/App/build/StableCoinBanking.xcarchive${NC}"
}

# Export IPA (requires export options plist)
export_ipa() {
    echo -e "${YELLOW}Exporting IPA...${NC}"
    
    # Check if export options exist
    if [ ! -f "scripts/ExportOptions.plist" ]; then
        echo -e "${YELLOW}Creating default ExportOptions.plist...${NC}"
        create_export_options
    fi
    
    cd ios/App
    
    xcodebuild -exportArchive \
        -archivePath build/StableCoinBanking.xcarchive \
        -exportPath build/IPA \
        -exportOptionsPlist ../../scripts/ExportOptions.plist
    
    cd ../..
    
    if [ -f "ios/App/build/IPA/App.ipa" ]; then
        cp ios/App/build/IPA/App.ipa ./stablecoin-banking.ipa
        echo -e "${GREEN}IPA exported successfully!${NC}"
        echo -e "${GREEN}Location: $(pwd)/stablecoin-banking.ipa${NC}"
    else
        echo -e "${RED}IPA export failed. Please check signing configuration.${NC}"
    fi
}

# Create default export options plist
create_export_options() {
    cat > scripts/ExportOptions.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>development</string>
    <key>signingStyle</key>
    <string>automatic</string>
    <key>stripSwiftSymbols</key>
    <true/>
    <key>teamID</key>
    <string>YOUR_TEAM_ID</string>
    <key>uploadSymbols</key>
    <true/>
</dict>
</plist>
EOF
    echo -e "${YELLOW}Created ExportOptions.plist - Please update YOUR_TEAM_ID${NC}"
}

# Print help
print_help() {
    echo ""
    echo "Usage: ./scripts/build-ipa.sh [option]"
    echo ""
    echo "Options:"
    echo "  (no option)  Interactive menu"
    echo "  --simulator  Build for iOS Simulator"
    echo "  --archive    Build release archive"
    echo "  --xcode      Open in Xcode"
    echo "  --help       Show this help message"
    echo ""
}

# Interactive menu
show_menu() {
    echo ""
    echo "Select build type:"
    echo "1) Build for Simulator (testing)"
    echo "2) Build Release Archive"
    echo "3) Export IPA (requires archive)"
    echo "4) Open in Xcode (recommended)"
    echo "5) Full build + Export IPA"
    echo "6) Exit"
    read -p "Enter choice [1-6]: " choice
    
    case $choice in
        1) build_simulator ;;
        2) build_archive ;;
        3) export_ipa ;;
        4) open_xcode ;;
        5) 
            build_archive
            export_ipa
            ;;
        6) exit 0 ;;
        *) 
            echo -e "${RED}Invalid choice${NC}"
            show_menu
            ;;
    esac
}

# Main execution
main() {
    check_macos
    check_requirements
    
    # Handle command line arguments
    case "$1" in
        --simulator)
            install_deps
            build_web
            add_ios_platform
            sync_capacitor
            install_pods
            build_simulator
            exit 0
            ;;
        --archive)
            install_deps
            build_web
            add_ios_platform
            sync_capacitor
            install_pods
            build_archive
            exit 0
            ;;
        --xcode)
            install_deps
            build_web
            add_ios_platform
            sync_capacitor
            install_pods
            open_xcode
            exit 0
            ;;
        --help)
            print_help
            exit 0
            ;;
    esac
    
    install_deps
    build_web
    add_ios_platform
    sync_capacitor
    install_pods
    
    show_menu
    
    echo ""
    echo "=========================================="
    echo -e "${GREEN}Process completed!${NC}"
    echo "=========================================="
}

main "$@"
