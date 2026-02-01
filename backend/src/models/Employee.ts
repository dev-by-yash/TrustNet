import mongoose, { Schema, Document } from 'mongoose';

export interface IEmployee extends Document {
  employeeId: string;
  organizationId: string;
  walletAddresses: {
    ethereum?: string;
    sui?: string;
    base?: string;
  };
  authKeyHash: string;
  ensName?: string;
  profileData: {
    nickname?: string;
    avatar?: string;
    email?: string;
  };
  onboardingDate: Date;
  status: 'active' | 'inactive' | 'revoked';
  privacyPreferences: {
    defaultChain?: string;
    notificationMethod?: string;
  };
  channels: Array<{
    channelId: string;
    network: string;
    status: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema: Schema = new Schema(
  {
    employeeId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    organizationId: {
      type: String,
      required: true,
      index: true,
    },
    walletAddresses: {
      ethereum: String,
      sui: String,
      base: String,
    },
    authKeyHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    ensName: String,
    profileData: {
      nickname: String,
      avatar: String,
      email: String,
    },
    onboardingDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'revoked'],
      default: 'active',
      index: true,
    },
    privacyPreferences: {
      defaultChain: String,
      notificationMethod: String,
    },
    channels: [
      {
        channelId: String,
        network: String,
        status: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Composite indexes for efficient queries
EmployeeSchema.index({ organizationId: 1, status: 1 });
EmployeeSchema.index({ 'walletAddresses.ethereum': 1 });
EmployeeSchema.index({ 'walletAddresses.sui': 1 });

export default mongoose.model<IEmployee>('Employee', EmployeeSchema);
