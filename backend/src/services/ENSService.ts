import { ethers } from 'ethers';
import logger from '../utils/logger';
import redisService from './RedisService';

interface CommitData {
  commitment: string;
  secret: string;
  owner: string;
  duration: number;
  timestamp: number;
}

interface TextRecordUpdate {
  key: string;
  value: string;
}

class ENSService {
  private provider: ethers.JsonRpcProvider | null = null;
  private commitments: Map<string, CommitData> = new Map();

  /**
   * Initialize ENS service with provider
   */
  async initialize(): Promise<void> {
    try {
      const rpcUrl = process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/your-api-key';
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      
      logger.info('ENS Service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ENS Service:', error);
      throw error;
    }
  }

  /**
   * Generate commit hash for ENS registration (commit-reveal flow)
   */
  async generateCommitment(
    name: string,
    owner: string,
    duration: number = 31536000, // 1 year default
    secret?: string
  ): Promise<{ commitment: string; secret: string }> {
    try {
      if (!this.provider) {
        throw new Error('ENS provider not initialized');
      }

      // Generate random secret if not provided
      const secretBytes = secret || ethers.hexlify(ethers.randomBytes(32));
      
      // Get the registrar controller contract
      const registrarControllerAddress = process.env.ENS_REGISTRAR_CONTROLLER || 
        '0x253553366Da8546fc250F225fe3d25d0C782303b'; // Mainnet address
      
      const registrarABI = [
        'function makeCommitment(string name, address owner, uint256 duration, bytes32 secret, address resolver, bytes[] data, bool reverseRecord, uint16 ownerControlledFuses) view returns (bytes32)',
      ];
      
      const registrar = new ethers.Contract(
        registrarControllerAddress,
        registrarABI,
        this.provider
      );

      // Generate commitment
      const label = name.split('.')[0]; // Remove .eth
      const commitment = await registrar.makeCommitment(
        label,
        owner,
        duration,
        secretBytes,
        ethers.ZeroAddress, // resolver
        [], // data
        false, // reverseRecord
        0 // ownerControlledFuses
      );

      // Store commitment data
      this.commitments.set(commitment, {
        commitment,
        secret: secretBytes,
        owner,
        duration,
        timestamp: Date.now(),
      });

      logger.info(`Generated commitment for ${name}: ${commitment}`);
      
      return {
        commitment,
        secret: secretBytes,
      };
    } catch (error) {
      logger.error('Failed to generate commitment:', error);
      throw error;
    }
  }

  /**
   * Commit to registering an ENS name (step 1 of commit-reveal)
   */
  async commitRegistration(commitment: string, signerPrivateKey: string): Promise<string> {
    try {
      if (!this.provider) {
        throw new Error('ENS provider not initialized');
      }

      const wallet = new ethers.Wallet(signerPrivateKey, this.provider);
      
      const registrarControllerAddress = process.env.ENS_REGISTRAR_CONTROLLER || 
        '0x253553366Da8546fc250F225fe3d25d0C782303b';
      
      const registrarABI = [
        'function commit(bytes32 commitment)',
      ];
      
      const registrar = new ethers.Contract(
        registrarControllerAddress,
        registrarABI,
        wallet
      );

      const tx = await registrar.commit(commitment);
      await tx.wait();

      logger.info(`Committed registration: ${commitment}, tx: ${tx.hash}`);
      
      return tx.hash;
    } catch (error) {
      logger.error('Failed to commit registration:', error);
      throw error;
    }
  }

  /**
   * Register ENS name after commitment (step 2 of commit-reveal)
   * Must wait at least 60 seconds after commit
   */
  async registerName(
    name: string,
    commitment: string,
    signerPrivateKey: string
  ): Promise<string> {
    try {
      if (!this.provider) {
        throw new Error('ENS provider not initialized');
      }

      const commitData = this.commitments.get(commitment);
      if (!commitData) {
        throw new Error('Commitment not found');
      }

      // Check if 60 seconds have passed
      const timeSinceCommit = Date.now() - commitData.timestamp;
      if (timeSinceCommit < 60000) {
        throw new Error(`Must wait ${60000 - timeSinceCommit}ms before registering`);
      }

      const wallet = new ethers.Wallet(signerPrivateKey, this.provider);
      
      const registrarControllerAddress = process.env.ENS_REGISTRAR_CONTROLLER || 
        '0x253553366Da8546fc250F225fe3d25d0C782303b';
      
      const registrarABI = [
        'function register(string name, address owner, uint256 duration, bytes32 secret, address resolver, bytes[] data, bool reverseRecord, uint16 ownerControlledFuses) payable',
        'function rentPrice(string name, uint256 duration) view returns (uint256)',
      ];
      
      const registrar = new ethers.Contract(
        registrarControllerAddress,
        registrarABI,
        wallet
      );

      const label = name.split('.')[0];
      
      // Get rental price
      const price = await registrar.rentPrice(label, commitData.duration);
      
      // Add 10% buffer for price fluctuations
      const value = price + (price / 10n);

      // Register the name
      const tx = await registrar.register(
        label,
        commitData.owner,
        commitData.duration,
        commitData.secret,
        ethers.ZeroAddress,
        [],
        false,
        0,
        { value }
      );
      
      await tx.wait();

      logger.info(`Registered ENS name: ${name}, tx: ${tx.hash}`);
      
      // Clear commitment
      this.commitments.delete(commitment);
      
      return tx.hash;
    } catch (error) {
      logger.error('Failed to register ENS name:', error);
      throw error;
    }
  }

  /**
   * Set subdomain for employee
   */
  async setSubdomain(
    parentName: string,
    subdomain: string,
    owner: string,
    signerPrivateKey: string
  ): Promise<string> {
    try {
      if (!this.provider) {
        throw new Error('ENS provider not initialized');
      }

      const wallet = new ethers.Wallet(signerPrivateKey, this.provider);
      
      // Get ENS registry
      const ensRegistryAddress = process.env.ENS_REGISTRY || 
        '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
      
      const registryABI = [
        'function setSubnodeOwner(bytes32 node, bytes32 label, address owner) returns (bytes32)',
      ];
      
      const registry = new ethers.Contract(
        ensRegistryAddress,
        registryABI,
        wallet
      );

      // Calculate parent node
      const parentNode = ethers.namehash(parentName);
      const labelHash = ethers.id(subdomain);

      const tx = await registry.setSubnodeOwner(parentNode, labelHash, owner);
      await tx.wait();

      const fullName = `${subdomain}.${parentName}`;
      logger.info(`Set subdomain: ${fullName}, tx: ${tx.hash}`);
      
      return tx.hash;
    } catch (error) {
      logger.error('Failed to set subdomain:', error);
      throw error;
    }
  }

  /**
   * Resolve ENS name to address with caching
   */
  async resolveNameToAddress(name: string): Promise<string | null> {
    try {
      // Check cache first
      const cached = await redisService.getCachedENSAddress(name);
      if (cached) {
        logger.debug(`ENS resolution from cache: ${name} -> ${cached}`);
        return cached;
      }

      if (!this.provider) {
        throw new Error('ENS provider not initialized');
      }

      const address = await this.provider.resolveName(name);
      
      if (address) {
        // Cache the result
        await redisService.cacheENSAddress(name, address);
        logger.info(`Resolved ENS name: ${name} -> ${address}`);
      }
      
      return address;
    } catch (error) {
      logger.error('Failed to resolve ENS name:', error);
      return null;
    }
  }

  /**
   * Reverse resolve address to ENS name with caching
   */
  async resolveAddressToName(address: string): Promise<string | null> {
    try {
      // Check cache first
      const cached = await redisService.getCachedENSName(address);
      if (cached) {
        logger.debug(`Reverse ENS resolution from cache: ${address} -> ${cached}`);
        return cached;
      }

      if (!this.provider) {
        throw new Error('ENS provider not initialized');
      }

      const name = await this.provider.lookupAddress(address);
      
      if (name) {
        // Cache the result
        await redisService.cacheENSName(address, name);
        logger.info(`Reverse resolved address: ${address} -> ${name}`);
      }
      
      return name;
    } catch (error) {
      logger.error('Failed to reverse resolve address:', error);
      return null;
    }
  }

  /**
   * Update text records for ENS name
   */
  async updateTextRecords(
    name: string,
    records: TextRecordUpdate[],
    signerPrivateKey: string
  ): Promise<string> {
    try {
      if (!this.provider) {
        throw new Error('ENS provider not initialized');
      }

      const wallet = new ethers.Wallet(signerPrivateKey, this.provider);
      
      // Get the public resolver address
      const resolverAddress = await this.provider.resolveName(name);
      if (!resolverAddress) {
        throw new Error('Resolver not found for name');
      }

      const resolverABI = [
        'function setText(bytes32 node, string key, string value)',
      ];
      
      const resolver = new ethers.Contract(
        resolverAddress,
        resolverABI,
        wallet
      );

      const node = ethers.namehash(name);
      
      // Update each text record
      const txHashes: string[] = [];
      for (const record of records) {
        const tx = await resolver.setText(node, record.key, record.value);
        await tx.wait();
        txHashes.push(tx.hash);
        logger.info(`Updated text record ${record.key} for ${name}`);
      }

      return txHashes[txHashes.length - 1]; // Return last tx hash
    } catch (error) {
      logger.error('Failed to update text records:', error);
      throw error;
    }
  }

  /**
   * Get text record from ENS name
   */
  async getTextRecord(name: string, key: string): Promise<string | null> {
    try {
      if (!this.provider) {
        throw new Error('ENS provider not initialized');
      }

      const resolver = await this.provider.getResolver(name);
      if (!resolver) {
        return null;
      }

      const value = await resolver.getText(key);
      logger.debug(`Got text record ${key} for ${name}: ${value}`);
      
      return value;
    } catch (error) {
      logger.error('Failed to get text record:', error);
      return null;
    }
  }

  /**
   * Check if ENS name is available
   */
  async isNameAvailable(name: string): Promise<boolean> {
    try {
      if (!this.provider) {
        throw new Error('ENS provider not initialized');
      }

      const address = await this.provider.resolveName(name);
      return address === null;
    } catch (error) {
      logger.error('Failed to check name availability:', error);
      return false;
    }
  }
}

export default new ENSService();
