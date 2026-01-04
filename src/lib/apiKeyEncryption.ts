/**
 * API Key Encryption Utilities
 * Provides client-side encryption for API keys before storing in database
 * Uses AES-256-GCM with a derived key from the admin's session
 */

// Generate a random IV for each encryption
export const generateIV = (): string => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
};

// Derive a key from the admin session for encrypting API keys
const deriveEncryptionKey = async (sessionId: string): Promise<CryptoKey> => {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(sessionId + 'api_key_encryption_salt'),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('lovable_api_key_encryption'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

// Encrypt an API key value
export const encryptApiKey = async (plainKey: string, sessionId: string): Promise<{ encrypted: string; iv: string }> => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveEncryptionKey(sessionId);
  const encoder = new TextEncoder();
  
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plainKey)
  );
  
  const encryptedArray = Array.from(new Uint8Array(encryptedBuffer));
  const encrypted = encryptedArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
  
  return { encrypted, iv: ivHex };
};

// Decrypt an API key value
export const decryptApiKey = async (encryptedHex: string, ivHex: string, sessionId: string): Promise<string> => {
  const key = await deriveEncryptionKey(sessionId);
  
  // Convert hex strings back to Uint8Array
  const encrypted = new Uint8Array(encryptedHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
};

// Mask API key for display (show only first and last 4 chars)
export const maskApiKey = (value: string): string => {
  if (!value) return '••••••••';
  if (value.length <= 8) return '••••••••';
  return value.substring(0, 4) + '••••••••' + value.substring(value.length - 4);
};
