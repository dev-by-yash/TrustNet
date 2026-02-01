import bcrypt from 'bcrypt';
import crypto from 'crypto';
import Employee, { IEmployee } from '../models/Employee';
import AuthKey from '../models/AuthKey';
import Organization from '../models/Organization';

interface OnboardEmployeeInput {
  authKey: string;
  walletAddress: string;
  chain: 'ethereum' | 'sui' | 'base';
  nickname?: string;
  email?: string;
}

class EmployeeService {
  /**
   * Validate and onboard employee with auth key
   */
  async onboardEmployee(input: OnboardEmployeeInput): Promise<IEmployee> {
    // Find all auth keys and check against the provided key
    const authKeys = await AuthKey.find({ status: 'unused' });

    let matchedKey = null;
    for (const key of authKeys) {
      const isMatch = await bcrypt.compare(input.authKey, key.keyHash);
      if (isMatch) {
        matchedKey = key;
        break;
      }
    }

    if (!matchedKey) {
      throw new Error('Invalid or already used auth key');
    }

    // Get organization details
    const organization = await Organization.findOne({
      organizationId: matchedKey.organizationId,
    });

    if (!organization) {
      throw new Error('Organization not found');
    }

    if (organization.kycStatus !== 'approved') {
      throw new Error('Organization KYC not approved');
    }

    // Check if wallet already exists
    const existingEmployee = await Employee.findOne({
      [`walletAddresses.${input.chain}`]: input.walletAddress,
    });

    if (existingEmployee) {
      throw new Error('Wallet address already registered');
    }

    // Generate employee ID
    const employeeId = `emp_${crypto.randomBytes(8).toString('hex')}`;

    // Generate ENS name (simplified - actual ENS provisioning would happen on-chain)
    const ensName = input.nickname
      ? `${input.nickname.toLowerCase()}.${organization.organizationId}.eth`
      : `${employeeId}.${organization.organizationId}.eth`;

    // Create employee record
    const employee = new Employee({
      employeeId,
      organizationId: matchedKey.organizationId,
      walletAddresses: {
        [input.chain]: input.walletAddress,
      },
      authKeyHash: matchedKey.keyHash,
      ensName,
      profileData: {
        nickname: input.nickname,
        email: input.email,
      },
      status: 'active',
      privacyPreferences: {
        defaultChain: input.chain,
      },
    });

    await employee.save();

    // Update auth key status
    matchedKey.status = 'active';
    matchedKey.assignedEmployeeId = employeeId;
    matchedKey.usedAt = new Date();
    await matchedKey.save();

    console.log(
      `Employee onboarded: ${employeeId} for organization: ${matchedKey.organizationId}`
    );
    return employee;
  }

  /**
   * Get employee by ID
   */
  async getEmployee(employeeId: string): Promise<IEmployee | null> {
    return await Employee.findOne({ employeeId });
  }

  /**
   * Get employee by wallet address
   */
  async getEmployeeByWallet(walletAddress: string): Promise<IEmployee | null> {
    return await Employee.findOne({
      $or: [
        { 'walletAddresses.ethereum': walletAddress },
        { 'walletAddresses.sui': walletAddress },
        { 'walletAddresses.base': walletAddress },
      ],
    });
  }

  /**
   * Get all employees for an organization
   */
  async getOrganizationEmployees(organizationId: string): Promise<IEmployee[]> {
    return await Employee.find({
      organizationId,
      status: 'active',
    }).sort({ onboardingDate: -1 });
  }

  /**
   * Add additional wallet address to employee
   */
  async addWalletAddress(
    employeeId: string,
    chain: 'ethereum' | 'sui' | 'base',
    walletAddress: string
  ): Promise<IEmployee | null> {
    // Check if wallet already exists
    const existingEmployee = await Employee.findOne({
      [`walletAddresses.${chain}`]: walletAddress,
    });

    if (existingEmployee && existingEmployee.employeeId !== employeeId) {
      throw new Error('Wallet address already registered to another employee');
    }

    const employee = await Employee.findOneAndUpdate(
      { employeeId },
      {
        $set: {
          [`walletAddresses.${chain}`]: walletAddress,
        },
      },
      { new: true }
    );

    if (!employee) {
      throw new Error('Employee not found');
    }

    console.log(`Added ${chain} wallet for employee: ${employeeId}`);
    return employee;
  }

  /**
   * Update employee profile
   */
  async updateProfile(
    employeeId: string,
    profileData: {
      nickname?: string;
      avatar?: string;
      email?: string;
    }
  ): Promise<IEmployee | null> {
    const employee = await Employee.findOneAndUpdate(
      { employeeId },
      {
        $set: {
          'profileData.nickname': profileData.nickname,
          'profileData.avatar': profileData.avatar,
          'profileData.email': profileData.email,
        },
      },
      { new: true }
    );

    if (!employee) {
      throw new Error('Employee not found');
    }

    return employee;
  }

  /**
   * Update employee status
   */
  async updateStatus(
    employeeId: string,
    status: 'active' | 'inactive' | 'revoked'
  ): Promise<IEmployee | null> {
    const employee = await Employee.findOneAndUpdate(
      { employeeId },
      { status },
      { new: true }
    );

    if (!employee) {
      throw new Error('Employee not found');
    }

    console.log(`Employee ${employeeId} status updated to: ${status}`);
    return employee;
  }

  /**
   * Add state channel to employee
   */
  async addStateChannel(
    employeeId: string,
    channelId: string,
    network: string
  ): Promise<IEmployee | null> {
    const employee = await Employee.findOneAndUpdate(
      { employeeId },
      {
        $push: {
          channels: {
            channelId,
            network,
            status: 'open',
          },
        },
      },
      { new: true }
    );

    if (!employee) {
      throw new Error('Employee not found');
    }

    console.log(`Added state channel ${channelId} for employee: ${employeeId}`);
    return employee;
  }

  /**
   * Get employee count for organization
   */
  async getEmployeeCount(organizationId: string): Promise<number> {
    return await Employee.countDocuments({
      organizationId,
      status: 'active',
    });
  }

  /**
   * Validate auth key without onboarding
   */
  async validateAuthKey(authKey: string): Promise<{ valid: boolean; organizationId?: string }> {
    const authKeys = await AuthKey.find({ status: 'unused' });

    for (const key of authKeys) {
      const isMatch = await bcrypt.compare(authKey, key.keyHash);
      if (isMatch) {
        return {
          valid: true,
          organizationId: key.organizationId,
        };
      }
    }

    return { valid: false };
  }
}

export default new EmployeeService();
