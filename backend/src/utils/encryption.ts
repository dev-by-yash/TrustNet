import crypto from 'crypto';
import logger from './logger';

class EncryptionUtil {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly saltLength = 64;
  private readonly tagLength = 16;
  private masterKey: Buffer;

  constructor() {
    const encryptionKey = process.env.ENCRYPTION_KEY;
    
    if (!encryptionKey) {
      logger.warn('ENCRYPTION_KEY not set - using default key. DO NOT USE IN PRODUCTION!');
      this.masterKey = crypto.scryptSync('default-key-change-in-production', 'salt', this.keyLength);
    } else {
      // Derive key from environment variable
      this.masterKey = crypto.scryptSync(encryptionKey, 'trustnet-salt', this.keyLength);
    }
  }

  /**
   * Encrypt sensitive data
   */
  encrypt(plaintext: string): string {
    try {
      // Generate random IV
      const iv = crypto.randomBytes(this.ivLength);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);
      
      // Encrypt data
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get auth tag
      const authTag = cipher.getAuthTag();
      
      // Combine IV + encrypted data + auth tag
      const result = iv.toString('hex') + ':' + encrypted + ':' + authTag.toString('hex');
      
      logger.debug('Data encrypted successfully');
      
      return result;
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  decrypt(ciphertext: string): string {
    try {
      // Split the combined string
      const parts = ciphertext.split(':');
      
      if (parts.length !== 3) {
        throw new Error('Invalid ciphertext format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const authTag = Buffer.from(parts[2], 'hex');
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.masterKey, iv);
      decipher.setAuthTag(authTag);
      
      // Decrypt data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      logger.debug('Data decrypted successfully');
      
      return decrypted;
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash sensitive data (one-way)
   */
  hash(data: string, salt?: string): string {
    try {
      const actualSalt = salt || crypto.randomBytes(this.saltLength).toString('hex');
      const hash = crypto.pbkdf2Sync(data, actualSalt, 100000, 64, 'sha512').toString('hex');
      
      return salt ? hash : `${actualSalt}:${hash}`;
    } catch (error) {
      logger.error('Hashing failed:', error);
      throw new Error('Failed to hash data');
    }
  }

  /**
   * Verify hashed data
   */
  verifyHash(data: string, hashedData: string): boolean {
    try {
      const [salt, originalHash] = hashedData.split(':');
      const hash = this.hash(data, salt);
      
      return hash === originalHash;
    } catch (error) {
      logger.error('Hash verification failed:', error);
      return false;
    }
  }

  /**
   * Generate random encryption key
   */
  generateKey(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Encrypt object fields
   */
  encryptFields<T extends Record<string, any>>(
    obj: T,
    fieldsToEncrypt: (keyof T)[]
  ): T {
    const result = { ...obj };
    
    for (const field of fieldsToEncrypt) {
      if (result[field] !== undefined && result[field] !== null) {
        const value = String(result[field]);
        result[field] = this.encrypt(value) as any;
      }
    }
    
    return result;
  }

  /**
   * Decrypt object fields
   */
  decryptFields<T extends Record<string, any>>(
    obj: T,
    fieldsToDecrypt: (keyof T)[]
  ): T {
    const result = { ...obj };
    
    for (const field of fieldsToDecrypt) {
      if (result[field] !== undefined && result[field] !== null) {
        try {
          const value = String(result[field]);
          result[field] = this.decrypt(value) as any;
        } catch (error) {
          logger.error(`Failed to decrypt field ${String(field)}:`, error);
          // Keep encrypted value if decryption fails
        }
      }
    }
    
    return result;
  }
}

export default new EncryptionUtil();
