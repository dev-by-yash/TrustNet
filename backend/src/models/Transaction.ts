import mongoose, { Schema, Document } from 'mongoose';

export interface ITransaction extends Document {
  transactionId: string;
  organizationId: string;
  fromEmployeeId: string;
  toEmployeeId: string;
  amount: number;
  currency: string;
  chain: string;
  transactionType: 'yellow_offchain' | 'uniswap_privacy' | 'sui_direct' | 'standard';
  blockchainTxHash?: string;
  privacyLevel: 'public' | 'organization-only' | 'fully-private';
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: Date;
  gasUsed?: number;
  metadata: {
    memo?: string;
    tags?: string[];
  };
}

const TransactionSchema: Schema = new Schema({
  transactionId: {
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
  fromEmployeeId: {
    type: String,
    required: true,
    index: true,
  },
  toEmployeeId: {
    type: String,
    required: true,
    index: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    required: true,
    default: 'USDC',
  },
  chain: {
    type: String,
    required: true,
  },
  transactionType: {
    type: String,
    enum: ['yellow_offchain', 'uniswap_privacy', 'sui_direct', 'standard'],
    default: 'standard',
  },
  blockchainTxHash: String,
  privacyLevel: {
    type: String,
    enum: ['public', 'organization-only', 'fully-private'],
    default: 'organization-only',
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'failed'],
    default: 'pending',
    index: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  gasUsed: Number,
  metadata: {
    memo: String,
    tags: [String],
  },
});

// Composite indexes for efficient transaction queries
TransactionSchema.index({ organizationId: 1, timestamp: -1 });
TransactionSchema.index({ fromEmployeeId: 1, timestamp: -1 });
TransactionSchema.index({ toEmployeeId: 1, timestamp: -1 });
TransactionSchema.index({ blockchainTxHash: 1 });

export default mongoose.model<ITransaction>('Transaction', TransactionSchema);
