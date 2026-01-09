import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.c9793375777b4c7d8cc8e3cd32256bfe',
  appName: 'netlifegy-virtual-banking',
  webDir: 'dist',
  server: {
    url: 'https://c9793375-777b-4c7d-8cc8-e3cd32256bfe.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1e3a5f',
      showSpinner: true,
      spinnerColor: '#22c55e'
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#1e3a5f'
    }
  }
};

export default config;
