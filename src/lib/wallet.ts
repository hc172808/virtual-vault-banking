// GYD Wallet Generation Utility
// Generates a cryptographic key pair for blockchain operations

export interface WalletKeyPair {
  publicKey: string;
  privateKey: string;
  address: string;
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
 * Encrypts a private key for secure storage
 * Uses a simple XOR cipher with the user's password hash
 * For production, use a proper encryption library
 */
export const encryptPrivateKey = async (privateKey: string, password: string): Promise<string> => {
  const passwordHash = await simpleHash(password);
  
  // XOR encryption (simplified - in production use AES-256)
  let encrypted = '';
  for (let i = 0; i < privateKey.length; i++) {
    const keyChar = passwordHash.charCodeAt(i % passwordHash.length);
    const dataChar = privateKey.charCodeAt(i);
    encrypted += String.fromCharCode(keyChar ^ dataChar);
  }
  
  // Convert to base64 for storage
  return btoa(encrypted);
};

/**
 * Decrypts a private key
 */
export const decryptPrivateKey = async (encryptedKey: string, password: string): Promise<string> => {
  const passwordHash = await simpleHash(password);
  
  // Decode from base64
  const encrypted = atob(encryptedKey);
  
  // XOR decryption
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
