// GYD Wallet Generation Utility
// Generates a cryptographic key pair for blockchain operations

export interface WalletKeyPair {
  publicKey: string;
  privateKey: string;
  address: string;
}

interface EncryptedData {
  ciphertext: string;
  iv: string;
  salt: string;
}

/**
 * Generates a random hex string of specified length
 */
const generateRandomHex = (bytes: number): string => {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Simple hash function for address generation
 */
const simpleHash = async (data: string): Promise<string> => {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Derives an AES-256-GCM key from a password using PBKDF2
 */
const deriveKey = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  // Import password as raw key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );
  
  // Derive AES-256-GCM key using PBKDF2 with 100,000 iterations
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

/**
 * Generates a new GYD wallet key pair
 * Returns public key, private key, and derived wallet address
 */
export const generateWalletKeyPair = async (): Promise<WalletKeyPair> => {
  // Generate 32-byte (256-bit) private key
  const privateKey = generateRandomHex(32);
  
  // Derive public key from private key using SHA-256
  const publicKey = await simpleHash(privateKey);
  
  // Generate wallet address (first 20 bytes of hashed public key with 0x prefix)
  const addressHash = await simpleHash(publicKey);
  const address = '0x' + addressHash.substring(0, 40);
  
  return {
    publicKey,
    privateKey,
    address
  };
};

/**
 * Encrypts a private key using AES-256-GCM with PBKDF2 key derivation
 * Uses proper cryptographic standards for secure storage
 */
export const encryptPrivateKey = async (privateKey: string, password: string): Promise<string> => {
  const encoder = new TextEncoder();
  
  // Generate random salt (16 bytes) and IV (12 bytes for AES-GCM)
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Derive encryption key from password
  const key = await deriveKey(password, salt);
  
  // Encrypt the private key
  const plaintextBuffer = encoder.encode(privateKey);
  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    plaintextBuffer
  );
  
  // Convert to base64 for storage
  const encryptedData: EncryptedData = {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer))),
    iv: btoa(String.fromCharCode(...iv)),
    salt: btoa(String.fromCharCode(...salt))
  };
  
  return JSON.stringify(encryptedData);
};

/**
 * Decrypts a private key using AES-256-GCM
 * Supports both new format (JSON with salt/iv) and legacy XOR format for migration
 */
export const decryptPrivateKey = async (encryptedKey: string, password: string): Promise<string> => {
  // Try to parse as new JSON format first
  try {
    const encryptedData: EncryptedData = JSON.parse(encryptedKey);
    
    if (encryptedData.ciphertext && encryptedData.iv && encryptedData.salt) {
      // New AES-256-GCM format
      const ciphertext = Uint8Array.from(atob(encryptedData.ciphertext), c => c.charCodeAt(0));
      const iv = Uint8Array.from(atob(encryptedData.iv), c => c.charCodeAt(0));
      const salt = Uint8Array.from(atob(encryptedData.salt), c => c.charCodeAt(0));
      
      // Derive the same key
      const key = await deriveKey(password, salt);
      
      // Decrypt
      const plaintextBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        ciphertext
      );
      
      const decoder = new TextDecoder();
      return decoder.decode(plaintextBuffer);
    }
  } catch {
    // Not JSON format, fall through to legacy handling
  }
  
  // Legacy XOR format - for backwards compatibility during migration
  // This will be removed once all keys are migrated
  const passwordHash = await simpleHash(password);
  const encrypted = atob(encryptedKey);
  
  let decrypted = '';
  for (let i = 0; i < encrypted.length; i++) {
    const keyChar = passwordHash.charCodeAt(i % passwordHash.length);
    const dataChar = encrypted.charCodeAt(i);
    decrypted += String.fromCharCode(keyChar ^ dataChar);
  }
  
  return decrypted;
};

/**
 * Validates a wallet address format
 */
export const isValidAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Shortens address for display (0x1234...5678)
 */
export const shortenAddress = (address: string): string => {
  if (!isValidAddress(address)) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};
