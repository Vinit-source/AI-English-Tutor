// Utility module for securely storing and retrieving API keys using Web Crypto API

const STORAGE_PREFIX = 'enc_api_key_';

/**
 * Generate a crypto key from a passphrase (derived from browser fingerprint)
 * Note: This approach intentionally ties API keys to a specific browser/device.
 * Keys are not portable across devices, which is acceptable for this use case
 * as the encryption primarily prevents plain-text storage in localStorage.
 */
async function getEncryptionKey() {
  // Use a combination of browser characteristics as entropy
  const entropy = `${navigator.userAgent}-${navigator.language}-${screen.width}x${screen.height}`;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(entropy);
  
  // Hash the entropy to create consistent key material
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  
  return crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt API key and store it in localStorage
 * @param {string} serviceName - Name of the service (e.g., 'gemini', 'mistral', 'openrouter')
 * @param {string} apiKey - The API key to encrypt and store
 */
export async function storeApiKey(serviceName, apiKey) {
  try {
    const key = await getEncryptionKey();
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    
    // Generate a random IV (initialization vector)
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt the API key
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    // Store both the IV and encrypted data
    const encryptedArray = new Uint8Array(encryptedData);
    const combined = new Uint8Array(iv.length + encryptedArray.length);
    combined.set(iv);
    combined.set(encryptedArray, iv.length);
    
    // Convert to base64 for storage
    const base64 = btoa(String.fromCharCode(...combined));
    
    localStorage.setItem(`${STORAGE_PREFIX}${serviceName}`, base64);
    return true;
  } catch (error) {
    console.error('Error storing API key:', error);
    return false;
  }
}

/**
 * Retrieve and decrypt API key from localStorage
 * @param {string} serviceName - Name of the service (e.g., 'gemini', 'mistral', 'openrouter')
 * @returns {Promise<string|null>} - The decrypted API key or null if not found
 */
export async function getApiKey(serviceName) {
  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${serviceName}`);
    if (!stored) {
      return null;
    }
    
    const key = await getEncryptionKey();
    
    // Decode from base64
    const combined = new Uint8Array(
      atob(stored).split('').map(char => char.charCodeAt(0))
    );
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);
    
    // Decrypt the API key
    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decryptedData);
  } catch (error) {
    console.error('Error retrieving API key:', error);
    return null;
  }
}

/**
 * Check if an API key exists for a service
 * @param {string} serviceName - Name of the service
 * @returns {boolean} - True if API key exists
 */
export function hasApiKey(serviceName) {
  return localStorage.getItem(`${STORAGE_PREFIX}${serviceName}`) !== null;
}

/**
 * Remove API key for a service
 * @param {string} serviceName - Name of the service
 */
export function removeApiKey(serviceName) {
  localStorage.removeItem(`${STORAGE_PREFIX}${serviceName}`);
}

/**
 * Get the service name from model name
 * @param {string} model - Model name (gemini, mistral, gemma, deepseek)
 * @returns {string} - Service name
 */
export function getServiceFromModel(model) {
  const modelToService = {
    'gemini': 'gemini',
    'mistral': 'mistral',
    'gemma': 'openrouter',
    'deepseek': 'openrouter'
  };
  return modelToService[model] || model;
}
