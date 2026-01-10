# StableCoin Banking - Mobile App Build Guide

This guide covers building the StableCoin Banking app for both Android (APK) and iOS (IPA).

---

## Table of Contents
1. [Android APK Build](#android-apk-build)
2. [iOS IPA Build](#ios-ipa-build)
3. [Troubleshooting](#troubleshooting)

---

## Android APK Build

### Prerequisites

Before building the APK, ensure you have the following installed:

#### 1. Node.js (v18 or higher)
Download from: https://nodejs.org/

#### 2. Android Studio
Download from: https://developer.android.com/studio

During installation, make sure to install:
- Android SDK
- Android SDK Platform-Tools
- Android SDK Build-Tools

#### 3. Java JDK 11 or higher
Download from: https://adoptium.net/

#### 4. Environment Variables

**Windows:**
1. Open System Properties → Advanced → Environment Variables
2. Add `ANDROID_HOME` pointing to your Android SDK location
   - Usually: `C:\Users\<username>\AppData\Local\Android\Sdk`
3. Add to PATH: `%ANDROID_HOME%\platform-tools`

**macOS/Linux:**
Add to your `~/.bashrc` or `~/.zshrc`:
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### Quick Start

#### Step 1: Clone the Repository
```bash
git clone <your-repo-url>
cd <project-folder>
```

#### Step 2: Install Dependencies
```bash
npm install
```

#### Step 3: Add Android Platform
```bash
npx cap add android
```

#### Step 4: Build the App
```bash
npm run build
npx cap sync android
```

#### Step 5: Build APK

**Using the Build Script (Recommended)**

Linux/macOS:
```bash
chmod +x scripts/build-apk.sh
./scripts/build-apk.sh
```

Windows:
```cmd
scripts\build-apk.bat
```

**Command Line Options:**
```bash
./scripts/build-apk.sh --debug     # Build debug APK
./scripts/build-apk.sh --release   # Build unsigned release APK  
./scripts/build-apk.sh --signed    # Build signed release APK
./scripts/build-apk.sh --studio    # Open in Android Studio
./scripts/build-apk.sh --help      # Show help
```

**Manual Build:**
```bash
cd android
./gradlew assembleDebug  # Linux/macOS
gradlew.bat assembleDebug  # Windows
```

The APK will be located at:
`android/app/build/outputs/apk/debug/app-debug.apk`

---

## iOS IPA Build

### Prerequisites

**IMPORTANT: iOS builds require macOS with Xcode installed.**

#### 1. macOS Computer
iOS development is only possible on macOS.

#### 2. Xcode
Download from the Mac App Store or: https://developer.apple.com/xcode/

#### 3. Apple Developer Account
Required for distribution. Sign up at: https://developer.apple.com/

#### 4. CocoaPods
Install via Terminal:
```bash
sudo gem install cocoapods
```

### Quick Start

#### Step 1: Clone the Repository
```bash
git clone <your-repo-url>
cd <project-folder>
```

#### Step 2: Install Dependencies
```bash
npm install
```

#### Step 3: Add iOS Platform
```bash
npx cap add ios
```

#### Step 4: Build the App
```bash
npm run build
npx cap sync ios
```

#### Step 5: Build IPA

**Using the Build Script (Recommended)**

```bash
chmod +x scripts/build-ipa.sh
./scripts/build-ipa.sh
```

**Command Line Options:**
```bash
./scripts/build-ipa.sh --simulator  # Build for iOS Simulator
./scripts/build-ipa.sh --archive    # Build release archive
./scripts/build-ipa.sh --xcode      # Open in Xcode (recommended)
./scripts/build-ipa.sh --help       # Show help
```

**Using Xcode (Manual):**
1. Open in Xcode: `npx cap open ios`
2. Select your Team in Signing & Capabilities
3. Configure Bundle Identifier
4. Select target device
5. Product → Archive (for distribution)
6. Distribute App → Ad Hoc or App Store

---

## Customizing the App

### App Icon

**Android:**
Replace icons in `android/app/src/main/res/mipmap-*` folders

**iOS:**
Replace icons in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

### Splash Screen
Customize in `capacitor.config.ts`:
```typescript
plugins: {
  SplashScreen: {
    launchShowDuration: 2000,
    backgroundColor: '#1e3a5f',
    showSpinner: true,
    spinnerColor: '#22c55e'
  }
}
```

### App Name & ID
Edit in `capacitor.config.ts`:
```typescript
appId: 'com.yourcompany.appname',
appName: 'Your App Name'
```

---

## Building for Production

### Android Signing

#### 1. Generate a Signing Key
```bash
keytool -genkey -v -keystore release-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias stablecoin
```

#### 2. Use the Signed Build Option
```bash
./scripts/build-apk.sh --signed
```

### iOS Signing

#### 1. Configure in Xcode
- Open in Xcode: `npx cap open ios`
- Select your Team
- Enable Automatic Signing

#### 2. Export IPA
- Product → Archive
- Distribute App
- Choose distribution method (Ad Hoc, App Store, etc.)

---

## Troubleshooting

### Android Issues

#### "SDK location not found"
Ensure `ANDROID_HOME` is set correctly and the SDK is installed.

#### "Build failed - Could not find tools.jar"
Make sure Java JDK (not JRE) is installed and `JAVA_HOME` is set.

#### "License for package not accepted"
```bash
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses
```

#### Gradle build errors
```bash
cd android && ./gradlew clean
```

### iOS Issues

#### "No signing certificate found"
- Open Xcode → Preferences → Accounts
- Add your Apple ID
- Download certificates

#### "CocoaPods not found"
```bash
sudo gem install cocoapods
pod setup
```

#### "Archive failed"
- Ensure valid provisioning profile
- Check Bundle Identifier matches

#### "Simulator build fails"
```bash
cd ios/App
pod install
```

---

## Hot Reload Development

For development with hot reload:

1. Keep the Lovable preview running
2. The `capacitor.config.ts` is configured to use the live server
3. Run the app on your device/emulator

**For production builds:** Remove or modify the `server` config in `capacitor.config.ts`.

---

## Support

For issues related to:
- **Capacitor**: https://capacitorjs.com/docs
- **Android Studio**: https://developer.android.com/studio/intro
- **Xcode**: https://developer.apple.com/documentation/xcode
- **This App**: Create a support ticket in the app
