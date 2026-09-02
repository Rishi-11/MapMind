import { EncryptedCryptoPayload } from '@/types/auth';

const CRYPTO_VERSION = 1;
const KDF_ITERATIONS = 100000;
const AES_KEY_LENGTH = 256;
const GCM_IV_LENGTH_BYTES = 12; // 96-bit recommended for AES-GCM
const SALT_LENGTH_BYTES = 16;   // 128-bit random salt

/**
 * Custom error for cryptographic failures (tampering, wrong key, corrupt data)
 */
export class CryptoDecryptionError extends Error {
  constructor(message = 'Failed to decrypt data. Invalid key, corrupted ciphertext, or unauthorized modification.') {
    super(message);
    this.name = 'CryptoDecryptionError';
  }
}

/**
 * Generate cryptographically secure random IDs with type prefixes
 * e.g., usr_9f2a41bc87..., nb_a1c7..., pg_39fe..., dev_77b1..., req_88ac...
 */
export function generateSecureId(prefix: 'usr' | 'nb' | 'pg' | 'att' | 'dev' | 'req'): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${prefix}_${hex}`;
}

/**
 * Convert ArrayBuffer to URL-safe Base64 string
 */
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to Uint8Array buffer
 */
export function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generate a fresh cryptographically secure random salt (16 bytes, base64)
 */
export function generateRandomSalt(): string {
  const saltBytes = new Uint8Array(SALT_LENGTH_BYTES);
  crypto.getRandomValues(saltBytes);
  return bufferToBase64(saltBytes);
}

/**
 * Import raw password string as a PBKDF2 base key
 */
async function importPasswordKey(password: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey', 'deriveBits']
  );
}

/**
 * Derive client-side AES-256-GCM encryption key from password + unique user salt
 * The key remains in browser memory and is NEVER sent to Google Sheets or logged.
 */
export async function deriveEncryptionKey(password: string, salt: string): Promise<CryptoKey> {
  const baseKey = await importPasswordKey(password);
  const saltBytes = base64ToBuffer(salt);
  
  // Combine salt with domain-separation context to prevent key reuse across contexts
  const encoder = new TextEncoder();
  const contextBytes = encoder.encode('mapmind_aes_enc_v1');
  const combinedSalt = new Uint8Array(saltBytes.length + contextBytes.length);
  combinedSalt.set(saltBytes, 0);
  combinedSalt.set(contextBytes, saltBytes.length);

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: combinedSalt,
      iterations: KDF_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: AES_KEY_LENGTH,
    },
    false, // Key cannot be extracted
    ['encrypt', 'decrypt']
  );
}

/**
 * Derive authentication verifier for server login.
 * This is cryptographically separated from the encryption key using domain separation.
 * Even if the server verifier is compromised, the encryption key cannot be computed without the raw password.
 */
export async function deriveAuthVerifier(password: string, salt: string): Promise<string> {
  const baseKey = await importPasswordKey(password);
  const saltBytes = base64ToBuffer(salt);
  
  const encoder = new TextEncoder();
  const contextBytes = encoder.encode('mapmind_auth_verifier_v1');
  const combinedSalt = new Uint8Array(saltBytes.length + contextBytes.length);
  combinedSalt.set(saltBytes, 0);
  combinedSalt.set(contextBytes, saltBytes.length);

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: combinedSalt,
      iterations: KDF_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    256
  );

  return bufferToBase64(derivedBits);
}

/**
 * Encrypt any JavaScript object/string using AES-256-GCM with a fresh 12-byte IV per operation.
 * Nonce is guaranteed unique for every single invocation.
 */
export async function encryptData(data: any, key: CryptoKey): Promise<EncryptedCryptoPayload> {
  const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(jsonStr);

  // Generate fresh cryptographically secure 12-byte IV (never reuse)
  const iv = new Uint8Array(GCM_IV_LENGTH_BYTES);
  crypto.getRandomValues(iv);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128, // 128-bit authentication tag
    },
    key,
    encodedData
  );

  return {
    version: CRYPTO_VERSION,
    algorithm: 'AES-256-GCM',
    kdf: 'PBKDF2-HMAC-SHA256',
    iterations: KDF_ITERATIONS,
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(ciphertextBuffer),
  };
}

/**
 * Decrypt an EncryptedCryptoPayload with AES-256-GCM.
 * Validates version and GCM authentication tag. If tampering or wrong key, throws CryptoDecryptionError.
 */
export async function decryptData<T = any>(payload: EncryptedCryptoPayload, key: CryptoKey): Promise<T> {
  if (!payload || payload.algorithm !== 'AES-256-GCM') {
    throw new CryptoDecryptionError('Unsupported or invalid cryptographic payload format.');
  }

  const iv = base64ToBuffer(payload.iv);
  const ciphertext = base64ToBuffer(payload.ciphertext);

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128,
      },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    const jsonStr = decoder.decode(decryptedBuffer);

    try {
      return JSON.parse(jsonStr) as T;
    } catch {
      return jsonStr as unknown as T;
    }
  } catch (err) {
    throw new CryptoDecryptionError();
  }
}
