import crypto from 'crypto';
import Transaction, { ITransaction } from '../models/Transaction';
import Employee from '../models/Employee';
import Organization from '../models/Organization';

interface SendTransactionInput {
  fromEmployeeId: string;
  toEmployeeId: string;
  amount: number;
  currency: string;
  chain: string;
  transactionType?: 'yellow_offchain' | 'uniswap_privacy' | 'sui_direct' | 'standard';
  privacyLevel?: 'public' | 'organization-only' | 'fully-private';
  memo?: string;
}

class TransactionService {
  /**
   * Send transaction between employees
   */
  async sendTransaction(input: SendTransactionInput): Promise<ITransaction> {
    // Validate sender
    const fromEmployee = await Employee.findOne({ employeeId: input.fromEmployeeId });
    if (!fromEmployee || fromEmployee.status !== 'active') {
      throw new Error('Sender employee not found or inactive');
    }

    // Validate receiver
    const toEmployee = await Employee.findOne({ employeeId: input.toEmployeeId });
    if (!toEmployee || toEmployee.status !== 'active') {
      throw new Error('Receiver employee not found or inactive');
    }

    // Verify both employees are in same organization
    if (fromEmployee.organizationId !== toEmployee.organizationId) {
      throw new Error('Cross-organization transactions not supported in this version');
    }

    // Verify amount is positive
    if (input.amount <= 0) {
      throw new Error('Transaction amount must be positive');
    }

    // Generate transaction ID
    const transactionId = `tx_${crypto.randomBytes(16).toString('hex')}`;

    // Create transaction record
    const transaction = new Transaction({
      transactionId,
      organizationId: fromEmployee.organizationId,
      fromEmployeeId: input.fromEmployeeId,
      toEmployeeId: input.toEmployeeId,
      amount: input.amount,
      currency: input.currency || 'USDC',
      chain: input.chain,
      transactionType: input.transactionType || 'standard',
      privacyLevel: input.privacyLevel || 'organization-only',
      status: 'pending',
      metadata: {
        memo: input.memo,
      },
    });

    await transaction.save();

    // In a real implementation, this would trigger:
    // 1. Yellow Network state channel update (if off-chain)
    // 2. Uniswap v4 privacy swap (if privacy swap)
    // 3. Sui blockchain transaction (if on-chain)
    // For now, we'll simulate instant confirmation for off-chain
    if (input.transactionType === 'yellow_offchain') {
      setTimeout(async () => {
        await this.confirmTransaction(transactionId, 'offchain_instant');
      }, 100);
    }

    console.log(
      `Transaction created: ${transactionId} (${input.amount} ${input.currency} from ${input.fromEmployeeId} to ${input.toEmployeeId})`
    );

    return transaction;
  }

  /**
   * Confirm transaction
   */
  async confirmTransaction(
    transactionId: string,
    blockchainTxHash?: string
  ): Promise<ITransaction | null> {
    const transaction = await Transaction.findOneAndUpdate(
      { transactionId },
      {
        status: 'confirmed',
        ...(blockchainTxHash && { blockchainTxHash }),
      },
      { new: true }
    );

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    console.log(`Transaction confirmed: ${transactionId}`);
    return transaction;
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(transactionId: string): Promise<ITransaction | null> {
    return await Transaction.findOne({ transactionId });
  }

  /**
   * Get employee transactions (sent and received)
   */
  async getEmployeeTransactions(employeeId: string, limit: number = 50): Promise<ITransaction[]> {
    return await Transaction.find({
      $or: [{ fromEmployeeId: employeeId }, { toEmployeeId: employeeId }],
    })
      .sort({ timestamp: -1 })
      .limit(limit);
  }

  /**
   * Get organization transactions
   */
  async getOrganizationTransactions(
    organizationId: string,
    limit: number = 100
  ): Promise<ITransaction[]> {
    return await Transaction.find({
      organizationId,
    })
      .sort({ timestamp: -1 })
      .limit(limit);
  }

  /**
   * Get transaction statistics for employee
   */
  async getEmployeeStats(employeeId: string) {
    const employee = await Employee.findOne({ employeeId });
    if (!employee) {
      throw new Error('Employee not found');
    }

    const sent = await Transaction.aggregate([
      { $match: { fromEmployeeId: employeeId, status: 'confirmed' } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const received = await Transaction.aggregate([
      { $match: { toEmployeeId: employeeId, status: 'confirmed' } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      sent: {
        totalAmount: sent[0]?.totalAmount || 0,
        count: sent[0]?.count || 0,
      },
      received: {
        totalAmount: received[0]?.totalAmount || 0,
        count: received[0]?.count || 0,
      },
      netBalance: (received[0]?.totalAmount || 0) - (sent[0]?.totalAmount || 0),
    };
  }

  /**
   * Get organization transaction statistics
   */
  async getOrganizationStats(organizationId: string) {
    const organization = await Organization.findOne({ organizationId });
    if (!organization) {
      throw new Error('Organization not found');
    }

    const stats = await Transaction.aggregate([
      { $match: { organizationId, status: 'confirmed' } },
      {
        $group: {
          _id: null,
          totalVolume: { $sum: '$amount' },
          totalTransactions: { $sum: 1 },
          avgTransactionSize: { $avg: '$amount' },
        },
      },
    ]);

    const byType = await Transaction.aggregate([
      { $match: { organizationId, status: 'confirmed' } },
      {
        $group: {
          _id: '$transactionType',
          count: { $sum: 1 },
          volume: { $sum: '$amount' },
        },
      },
    ]);

    const recent = await Transaction.find({
      organizationId,
      status: 'confirmed',
    })
      .sort({ timestamp: -1 })
      .limit(10);

    return {
      overview: {
        totalVolume: stats[0]?.totalVolume || 0,
        totalTransactions: stats[0]?.totalTransactions || 0,
        avgTransactionSize: stats[0]?.avgTransactionSize || 0,
      },
      byType,
      recentTransactions: recent,
    };
  }

  /**
   * Mark transaction as failed
   */
  async failTransaction(transactionId: string, reason?: string): Promise<ITransaction | null> {
    const transaction = await Transaction.findOneAndUpdate(
      { transactionId },
      {
        status: 'failed',
        ...(reason && {
          'metadata.failureReason': reason,
        }),
      },
      { new: true }
    );

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    console.log(`Transaction failed: ${transactionId} - ${reason}`);
    return transaction;
  }

  /**
   * Get pending transactions for employee
   */
  async getPendingTransactions(employeeId: string): Promise<ITransaction[]> {
    return await Transaction.find({
      $or: [{ fromEmployeeId: employeeId }, { toEmployeeId: employeeId }],
      status: 'pending',
    }).sort({ timestamp: -1 });
  }
}

export default new TransactionService();
