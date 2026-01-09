# StableCoin Banking - APK Build Guide

This guide explains how to build an Android APK for the StableCoin Banking application.

## Prerequisites

Before building the APK, ensure you have the following installed:

### 1. Node.js (v18 or higher)
Download from: https://nodejs.org/

### 2. Android Studio
Download from: https://developer.android.com/studio

During installation, make sure to install:
- Android SDK
- Android SDK Platform-Tools
- Android SDK Build-Tools

### 3. Java JDK 11 or higher
Download from: https://adoptium.net/

### 4. Environment Variables

#### Windows:
1. Open System Properties → Advanced → Environment Variables
2. Add `ANDROID_HOME` pointing to your Android SDK location
   - Usually: `C:\Users\<username>\AppData\Local\Android\Sdk`
3. Add to PATH: `%ANDROID_HOME%\platform-tools`

#### macOS/Linux:
Add to your `~/.bashrc` or `~/.zshrc`:
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

## Quick Start

### Step 1: Clone the Repository
```bash
git clone <your-repo-url>
cd <project-folder>
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Add Capacitor Dependencies
```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

### Step 4: Add Android Platform
```bash
npx cap add android
```

### Step 5: Build the App
```bash
npm run build
npx cap sync android
```

### Step 6: Build APK

#### Using the Build Script (Recommended)

**Linux/macOS:**
```bash
chmod +x scripts/build-apk.sh
./scripts/build-apk.sh
```

**Windows:**
```bash
scripts\build-apk.bat
```

#### Manual Build

```bash
cd android
./gradlew assembleDebug  # Linux/macOS
gradlew.bat assembleDebug  # Windows
```

The APK will be located at:
`android/app/build/outputs/apk/debug/app-debug.apk`

## Building for Production

### 1. Generate a Signing Key
```bash
keytool -genkey -v -keystore my-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias my-key-alias
```

### 2. Configure Signing in `android/app/build.gradle`
Add the signing config to your build.gradle file.

### 3. Build Release APK
```bash
cd android
./gradlew assembleRelease
```

## Customizing the App

### App Icon
Replace the icons in:
- `android/app/src/main/res/mipmap-*` folders

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

## Troubleshooting

### "SDK location not found"
Ensure `ANDROID_HOME` is set correctly and the SDK is installed.

### "Build failed - Could not find tools.jar"
Make sure Java JDK (not JRE) is installed and `JAVA_HOME` is set.

### "License for package not accepted"
Run: `$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses`

### Gradle build errors
Try: `cd android && ./gradlew clean`

## Hot Reload Development

For development with hot reload:

1. Keep the Lovable preview running
2. The `capacitor.config.ts` is configured to use the live server
3. Run the app on your device/emulator

For production builds, remove or modify the `server` config in `capacitor.config.ts`.

## Support

For issues related to:
- **Capacitor**: https://capacitorjs.com/docs
- **Android Studio**: https://developer.android.com/studio/intro
- **This App**: Create a support ticket in the app
