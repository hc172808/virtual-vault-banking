import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

// Types for the biometric auth plugin
interface BiometricAuthResult {
  verified: boolean;
  error?: string;
}

interface BiometryType {
  isAvailable: boolean;
  biometryType: 'none' | 'touchId' | 'faceId' | 'fingerprintAuthentication' | 'faceAuthentication' | 'irisAuthentication';
  reason?: string;
}

// Lazy load the biometric plugin only when needed
let BiometricAuth: any = null;

const loadBiometricPlugin = async () => {
  if (BiometricAuth) return BiometricAuth;
  
  try {
    const module = await import('@aparajita/capacitor-biometric-auth');
    BiometricAuth = module.BiometricAuth;
    return BiometricAuth;
  } catch (error) {
    console.log('Biometric plugin not available:', error);
    return null;
  }
};

export const useNativeBiometrics = () => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState<BiometryType['biometryType']>('none');
  const [isNative, setIsNative] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAvailability();
  }, []);

  const checkAvailability = async () => {
    setIsLoading(true);
    
    // Check if running on native platform
    const platform = Capacitor.getPlatform();
    const native = platform === 'ios' || platform === 'android';
    setIsNative(native);

    if (native) {
      // Try native biometric check
      try {
        const plugin = await loadBiometricPlugin();
        if (plugin) {
          const result = await plugin.checkBiometry();
          setIsAvailable(result.isAvailable);
          setBiometryType(result.biometryType || 'none');
        } else {
          setIsAvailable(false);
          setBiometryType('none');
        }
      } catch (error) {
        console.log('Native biometric check failed:', error);
        setIsAvailable(false);
        setBiometryType('none');
      }
    } else {
      // Web platform - use Web Authentication API
      try {
        if (window.PublicKeyCredential) {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setIsAvailable(available);
          setBiometryType(available ? 'fingerprintAuthentication' : 'none');
        } else {
          setIsAvailable(false);
          setBiometryType('none');
        }
      } catch (error) {
        console.log('Web biometric check failed:', error);
        setIsAvailable(false);
        setBiometryType('none');
      }
    }
    
    setIsLoading(false);
  };

  const authenticate = useCallback(async (
    reason: string = 'Verify your identity'
  ): Promise<BiometricAuthResult> => {
    if (!isAvailable) {
      return { verified: false, error: 'Biometrics not available' };
    }

    if (isNative) {
      // Native biometric authentication
      try {
        const plugin = await loadBiometricPlugin();
        if (!plugin) {
          return { verified: false, error: 'Biometric plugin not loaded' };
        }

        await plugin.authenticate({
          reason,
          cancelTitle: 'Cancel',
          allowDeviceCredential: true,
          iosFallbackTitle: 'Use Passcode',
          androidTitle: 'Biometric Authentication',
          androidSubtitle: reason,
          androidConfirmationRequired: false,
        });

        return { verified: true };
      } catch (error: any) {
        console.error('Native biometric auth failed:', error);
        
        // Handle specific error codes
        if (error?.code === 'userCancel') {
          return { verified: false, error: 'Authentication cancelled' };
        }
        if (error?.code === 'biometryNotAvailable') {
          return { verified: false, error: 'Biometrics not available on this device' };
        }
        if (error?.code === 'biometryNotEnrolled') {
          return { verified: false, error: 'No biometrics enrolled on this device' };
        }
        if (error?.code === 'authenticationFailed') {
          return { verified: false, error: 'Authentication failed' };
        }
        
        return { verified: false, error: error?.message || 'Biometric authentication failed' };
      }
    } else {
      // Web biometric authentication using WebAuthn
      try {
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);

        const credential = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: "StableCoin Banking", id: window.location.hostname },
            user: {
              id: new Uint8Array(16),
              name: "transaction-verify",
              displayName: "Transaction Verification",
            },
            pubKeyCredParams: [{ alg: -7, type: "public-key" }],
            timeout: 60000,
            authenticatorSelection: {
              authenticatorAttachment: "platform",
              userVerification: "required",
            },
          },
        });

        if (credential) {
          return { verified: true };
        }
        return { verified: false, error: 'Authentication failed' };
      } catch (error: any) {
        console.error('Web biometric auth failed:', error);
        
        if (error.name === 'NotAllowedError') {
          return { verified: false, error: 'Authentication cancelled' };
        }
        
        return { verified: false, error: error?.message || 'Biometric authentication failed' };
      }
    }
  }, [isAvailable, isNative]);

  const getBiometryLabel = useCallback(() => {
    switch (biometryType) {
      case 'touchId':
      case 'fingerprintAuthentication':
        return 'Fingerprint';
      case 'faceId':
      case 'faceAuthentication':
        return 'Face ID';
      case 'irisAuthentication':
        return 'Iris Scan';
      default:
        return 'Biometrics';
    }
  }, [biometryType]);

  const getBiometryIcon = useCallback(() => {
    switch (biometryType) {
      case 'touchId':
      case 'fingerprintAuthentication':
        return 'fingerprint';
      case 'faceId':
      case 'faceAuthentication':
        return 'face';
      case 'irisAuthentication':
        return 'iris';
      default:
        return 'fingerprint';
    }
  }, [biometryType]);

  return {
    isAvailable,
    isNative,
    biometryType,
    isLoading,
    authenticate,
    getBiometryLabel,
    getBiometryIcon,
    checkAvailability,
  };
};

export default useNativeBiometrics;
