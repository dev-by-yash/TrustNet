import mongoose, { Schema, Document } from 'mongoose';

export interface IAuthKey extends Document {
  keyHash: string;
  organizationId: string;
  status: 'unused' | 'active' | 'revoked';
  assignedEmployeeId?: string;
  generatedAt: Date;
  usedAt?: Date;
  revokedAt?: Date;
  metadata: {
    generatedBy?: string;
    purpose?: string;
  };
}

const AuthKeySchema: Schema = new Schema({
  keyHash: {
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
  status: {
    type: String,
    enum: ['unused', 'active', 'revoked'],
    default: 'unused',
    index: true,
  },
  assignedEmployeeId: {
    type: String,
    default: null,
  },
  generatedAt: {
    type: Date,
    default: Date.now,
  },
  usedAt: Date,
  revokedAt: Date,
  metadata: {
    generatedBy: String,
    purpose: String,
  },
});

// Composite index for finding available keys
AuthKeySchema.index({ organizationId: 1, status: 1 });

export default mongoose.model<IAuthKey>('AuthKey', AuthKeySchema);
