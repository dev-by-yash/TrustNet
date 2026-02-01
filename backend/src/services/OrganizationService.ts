import crypto from 'crypto';
import bcrypt from 'bcrypt';
import Organization, { IOrganization } from '../models/Organization';
import AuthKey from '../models/AuthKey';

interface RegisterOrganizationInput {
  name: string;
  registrationNumber: string;
  country: string;
  subscriptionTier: 'starter' | 'business' | 'enterprise';
  adminWallet: string;
  contactEmail: string;
  contactPerson: string;
}

class OrganizationService {
  /**
   * Register a new organization
   */
  async registerOrganization(input: RegisterOrganizationInput): Promise<IOrganization> {
    // Generate unique organization ID from name
    const organizationId = input.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    // Check if organization already exists
    const existing = await Organization.findOne({ organizationId });
    if (existing) {
      throw new Error('Organization with this name already exists');
    }

    // Determine employee limit based on subscription tier
    const employeeLimits = {
      starter: 10,
      business: 100,
      enterprise: 1000,
    };

    // Create organization
    const organization = new Organization({
      organizationId,
      name: input.name,
      registrationNumber: input.registrationNumber,
      country: input.country,
      kycStatus: 'pending',
      subscriptionTier: input.subscriptionTier,
      employeeLimit: employeeLimits[input.subscriptionTier],
      adminWallets: [
        {
          address: input.adminWallet,
          role: 'owner',
        },
      ],
      metadata: {
        contactEmail: input.contactEmail,
        contactPerson: input.contactPerson,
      },
    });

    await organization.save();

    console.log(`Organization registered: ${organizationId}`);
    return organization;
  }

  /**
   * Update organization KYC status
   */
  async updateKYCStatus(
    organizationId: string,
    status: 'approved' | 'rejected',
    documents?: string[]
  ): Promise<IOrganization | null> {
    const organization = await Organization.findOneAndUpdate(
      { organizationId },
      {
        kycStatus: status,
        ...(documents && { kycDocuments: documents }),
      },
      { new: true }
    );

    if (!organization) {
      throw new Error('Organization not found');
    }

    console.log(`Organization ${organizationId} KYC status updated to: ${status}`);
    return organization;
  }

  /**
   * Generate auth keys for employees
   */
  async generateAuthKeys(
    organizationId: string,
    count: number,
    generatedBy: string
  ): Promise<Array<{ key: string; keyHash: string }>> {
    // Verify organization exists
    const organization = await Organization.findOne({ organizationId });
    if (!organization) {
      throw new Error('Organization not found');
    }

    if (organization.kycStatus !== 'approved') {
      throw new Error('Organization must complete KYC before generating auth keys');
    }

    // Limit key generation
    if (count > organization.employeeLimit) {
      throw new Error(`Cannot generate more than ${organization.employeeLimit} keys`);
    }

    const keys: Array<{ key: string; keyHash: string }> = [];

    // Generate keys
    for (let i = 0; i < count; i++) {
      // Generate random 16-character key (XXXX-XXXX-XXXX-XXXX format)
      const randomBytes = crypto.randomBytes(12);
      const key = randomBytes
        .toString('base64')
        .replace(/[^A-Za-z0-9]/g, '')
        .substring(0, 16)
        .toUpperCase()
        .match(/.{1,4}/g)!
        .join('-');

      // Hash the key for storage
      const keyHash = await bcrypt.hash(key, 10);

      // Store in database
      await AuthKey.create({
        keyHash,
        organizationId,
        status: 'unused',
        metadata: {
          generatedBy,
        },
      });

      keys.push({ key, keyHash });
    }

    console.log(`Generated ${count} auth keys for organization: ${organizationId}`);
    return keys;
  }

  /**
   * Get organization details
   */
  async getOrganization(organizationId: string): Promise<IOrganization | null> {
    return await Organization.findOne({ organizationId });
  }

  /**
   * Get organization by admin wallet
   */
  async getOrganizationByAdmin(adminWallet: string): Promise<IOrganization | null> {
    return await Organization.findOne({
      'adminWallets.address': adminWallet,
    });
  }

  /**
   * Update organization treasury addresses
   */
  async updateTreasuryAddresses(
    organizationId: string,
    treasuryAddresses: {
      ethereum?: string;
      sui?: string;
      base?: string;
    }
  ): Promise<IOrganization | null> {
    const organization = await Organization.findOneAndUpdate(
      { organizationId },
      { treasuryAddresses },
      { new: true }
    );

    if (!organization) {
      throw new Error('Organization not found');
    }

    console.log(`Updated treasury addresses for: ${organizationId}`);
    return organization;
  }

  /**
   * Get available auth keys count
   */
  async getAvailableKeysCount(organizationId: string): Promise<number> {
    return await AuthKey.countDocuments({
      organizationId,
      status: 'unused',
    });
  }

  /**
   * Get organization statistics
   */
  async getOrganizationStats(organizationId: string) {
    const organization = await Organization.findOne({ organizationId });
    if (!organization) {
      throw new Error('Organization not found');
    }

    const totalKeys = await AuthKey.countDocuments({ organizationId });
    const usedKeys = await AuthKey.countDocuments({
      organizationId,
      status: 'active',
    });
    const unusedKeys = await AuthKey.countDocuments({
      organizationId,
      status: 'unused',
    });

    return {
      organization,
      stats: {
        totalKeys,
        usedKeys,
        unusedKeys,
        employeeLimit: organization.employeeLimit,
        remainingSlots: organization.employeeLimit - usedKeys,
      },
    };
  }
}

export default new OrganizationService();
