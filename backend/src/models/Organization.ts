import mongoose, { Schema, Document } from 'mongoose';

export interface IOrganization extends Document {
  organizationId: string;
  name: string;
  registrationNumber: string;
  country: string;
  kycStatus: 'pending' | 'approved' | 'rejected';
  kycDocuments: string[];
  subscriptionTier: 'starter' | 'business' | 'enterprise';
  employeeLimit: number;
  adminWallets: Array<{
    address: string;
    role: 'owner' | 'admin' | 'finance';
  }>;
  treasuryAddresses: {
    ethereum?: string;
    sui?: string;
    base?: string;
  };
  ensName?: string;
  contractAddresses: {
    ethereum?: string;
    sui?: string;
  };
  metadata: {
    website?: string;
    contactEmail?: string;
    contactPerson?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema: Schema = new Schema(
  {
    organizationId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    registrationNumber: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    kycStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    kycDocuments: [String],
    subscriptionTier: {
      type: String,
      enum: ['starter', 'business', 'enterprise'],
      default: 'starter',
    },
    employeeLimit: {
      type: Number,
      required: true,
      default: 10,
    },
    adminWallets: [
      {
        address: { type: String, required: true },
        role: {
          type: String,
          enum: ['owner', 'admin', 'finance'],
          default: 'admin',
        },
      },
    ],
    treasuryAddresses: {
      ethereum: String,
      sui: String,
      base: String,
    },
    ensName: String,
    contractAddresses: {
      ethereum: String,
      sui: String,
    },
    metadata: {
      website: String,
      contactEmail: String,
      contactPerson: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
OrganizationSchema.index({ kycStatus: 1, createdAt: -1 });
OrganizationSchema.index({ 'adminWallets.address': 1 });

export default mongoose.model<IOrganization>('Organization', OrganizationSchema);
