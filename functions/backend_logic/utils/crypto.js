'use strict';

const crypto = require('crypto');

// Generate a 32-byte key from Master Key + Dynamic User JWT Salt
function deriveKey(masterKey, dynamicSalt) {
    if (!masterKey) {
        throw new Error('ENCRYPTION_MASTER_KEY is not defined in environment variables.');
    }
    // Combine Master Key and Dynamic Salt using SHA-256
    return crypto.createHash('sha256')
        .update(masterKey + (dynamicSalt || ''))
        .digest();
}

/**
 * Encrypt plain text using AES-256-GCM
 * @param {string} text - The raw text to encrypt
 * @param {string} dynamicSalt - Session-bound user token salt
 * @returns {string} - Encrypted string in format hex(iv):hex(authTag):hex(cipherText)
 */
function encrypt(text, dynamicSalt) {
    try {
        if (!text) return text;
        const masterKey = process.env.ENCRYPTION_MASTER_KEY || 'default_master_key_for_testing_only';
        const key = deriveKey(masterKey, dynamicSalt);
        
        const iv = crypto.randomBytes(12); // 12-byte IV is standard for GCM
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag().toString('hex');
        
        return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (err) {
        console.error(`[CRYPTO_ERROR] Encryption failed: ${err.message}`);
        throw new Error('Encryption failed. Please verify security configs.');
    }
}

/**
 * Decrypt cipher text using AES-256-GCM
 * @param {string} cipherText - Format: hex(iv):hex(authTag):hex(encrypted)
 * @param {string} dynamicSalt - Session-bound user token salt
 * @returns {string} - Decrypted plain text
 */
function decrypt(cipherText, dynamicSalt) {
    try {
        if (!cipherText || !cipherText.includes(':')) return cipherText;
        const parts = cipherText.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted text format.');
        }
        
        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encrypted = parts[2];
        
        const masterKey = process.env.ENCRYPTION_MASTER_KEY || 'default_master_key_for_testing_only';
        const key = deriveKey(masterKey, dynamicSalt);
        
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (err) {
        console.error(`[CRYPTO_ERROR] Decryption failed: ${err.message}`);
        // Return placeholder fallback to prevent raw ciphertext leakage or system crash
        return '[DECRYPTION_FAILED]';
    }
}

module.exports = {
    encrypt,
    decrypt
};
