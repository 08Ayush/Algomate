import bcrypt from 'bcryptjs';
import crypto from 'crypto';

/**
 * Cryptography Utilities
 * 
 * Helper functions for password hashing, token generation, and encryption
 */

/**
 * Hash a password using bcrypt
 * 
 * @param password - Plain text password
 * @param saltRounds - Number of salt rounds (default: 10)
 * @returns Hashed password
 * 
 * @example
 * ```typescript
 * const hashedPassword = await hashPassword('myPassword123');
 * ```
 */
export async function hashPassword(
    password: string,
    saltRounds: number = 10
): Promise<string> {
    return bcrypt.hash(password, saltRounds);
}

/**
 * Verify a password against a hash
 * 
 * @param password - Plain text password
 * @param hash - Hashed password
 * @returns True if password matches hash
 * 
 * @example
 * ```typescript
 * const isValid = await verifyPassword('myPassword123', hashedPassword);
 * ```
 */
export async function verifyPassword(
    password: string,
    hash: string
): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

/**
 * Generate a random token
 * 
 * @param length - Length of token in bytes (default: 32)
 * @returns Random token as hex string
 * 
 * @example
 * ```typescript
 * const token = generateToken(); // 64 character hex string
 * ```
 */
export function generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a random numeric code
 * 
 * @param length - Length of code (default: 6)
 * @returns Random numeric code
 * 
 * @example
 * ```typescript
 * const code = generateNumericCode(6); // "123456"
 * ```
 */
export function generateNumericCode(length: number = 6): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
}

/**
 * Generate a UUID v4
 * 
 * @returns UUID string
 * 
 * @example
 * ```typescript
 * const id = generateUUID(); // "550e8400-e29b-41d4-a716-446655440000"
 * ```
 */
export function generateUUID(): string {
    return crypto.randomUUID();
}

/**
 * Encode data to Base64
 * 
 * @param data - Data to encode
 * @returns Base64 encoded string
 * 
 * @example
 * ```typescript
 * const encoded = encodeBase64({ userId: '123' });
 * ```
 */
export function encodeBase64(data: any): string {
    const json = JSON.stringify(data);
    return Buffer.from(json).toString('base64');
}

/**
 * Decode Base64 data
 * 
 * @param encoded - Base64 encoded string
 * @returns Decoded data
 * 
 * @example
 * ```typescript
 * const decoded = decodeBase64<{ userId: string }>(token);
 * ```
 */
export function decodeBase64<T = any>(encoded: string): T {
    const json = Buffer.from(encoded, 'base64').toString('utf-8');
    return JSON.parse(json);
}

/**
 * Create a hash of data using SHA-256
 * 
 * @param data - Data to hash
 * @returns SHA-256 hash as hex string
 * 
 * @example
 * ```typescript
 * const hash = createHash('some data');
 * ```
 */
export function createHash(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Create an HMAC signature
 * 
 * @param data - Data to sign
 * @param secret - Secret key
 * @returns HMAC signature as hex string
 * 
 * @example
 * ```typescript
 * const signature = createHMAC('data', 'secret');
 * ```
 */
export function createHMAC(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verify an HMAC signature
 * 
 * @param data - Original data
 * @param signature - Signature to verify
 * @param secret - Secret key
 * @returns True if signature is valid
 * 
 * @example
 * ```typescript
 * const isValid = verifyHMAC('data', signature, 'secret');
 * ```
 */
export function verifyHMAC(
    data: string,
    signature: string,
    secret: string
): boolean {
    const expectedSignature = createHMAC(data, secret);
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

/**
 * Encrypt data using AES-256-GCM
 * 
 * @param data - Data to encrypt
 * @param key - Encryption key (32 bytes)
 * @returns Encrypted data with IV and auth tag
 * 
 * @example
 * ```typescript
 * const encrypted = encrypt('sensitive data', encryptionKey);
 * ```
 */
export function encrypt(data: string, key: string): {
    encrypted: string;
    iv: string;
    authTag: string;
} {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
        'aes-256-gcm',
        Buffer.from(key, 'hex'),
        iv
    );

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: cipher.getAuthTag().toString('hex')
    };
}

/**
 * Decrypt data using AES-256-GCM
 * 
 * @param encrypted - Encrypted data
 * @param key - Encryption key (32 bytes)
 * @param iv - Initialization vector
 * @param authTag - Authentication tag
 * @returns Decrypted data
 * 
 * @example
 * ```typescript
 * const decrypted = decrypt(encrypted, key, iv, authTag);
 * ```
 */
export function decrypt(
    encrypted: string,
    key: string,
    iv: string,
    authTag: string
): string {
    const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        Buffer.from(key, 'hex'),
        Buffer.from(iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}
