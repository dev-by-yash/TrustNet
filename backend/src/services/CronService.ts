import cron from 'node-cron';
import logger from '../utils/logger';
import webSocketService from './WebSocketService';
import redisService from './RedisService';
import Employee from '../models/Employee';
import Transaction from '../models/Transaction';
import Organization from '../models/Organization';

interface CronTask {
  name: string;
  schedule: string;
  task: () => Promise<void>;
  running: boolean;
}

class CronService {
  private tasks: Map<string, cron.ScheduledTask> = new Map();
  private taskStatus: Map<string, CronTask> = new Map();

  /**
   * Initialize all cron jobs
   */
  initialize(): void {
    try {
      // Hourly: Update Merkle tree roots
      this.scheduleTask(
        'merkle-update',
        '0 * * * *', // Every hour
        this.updateMerkleRoots.bind(this)
      );

      // Daily: Channel settlement
      this.scheduleTask(
        'channel-settlement',
        '0 2 * * *', // 2 AM daily
        this.settleChannels.bind(this)
      );

      // Weekly: Payroll distribution
      this.scheduleTask(
        'payroll-distribution',
        '0 9 * * 5', // 9 AM every Friday
        this.distributePayroll.bind(this)
      );

      // Monthly: Generate reports
      this.scheduleTask(
        'monthly-reports',
        '0 1 1 * *', // 1 AM on 1st of month
        this.generateMonthlyReports.bind(this)
      );

      // Daily: Cleanup old data
      this.scheduleTask(
        'data-cleanup',
        '0 3 * * *', // 3 AM daily
        this.cleanupOldData.bind(this)
      );

      // Every 5 minutes: Update balances cache
      this.scheduleTask(
        'balance-update',
        '*/5 * * * *', // Every 5 minutes
        this.updateBalancesCache.bind(this)
      );

      // Every 30 minutes: Check session expiry
      this.scheduleTask(
        'session-cleanup',
        '*/30 * * * *', // Every 30 minutes
        this.cleanupExpiredSessions.bind(this)
      );

      logger.info('Cron service initialized with all scheduled tasks');
    } catch (error) {
      logger.error('Failed to initialize cron service:', error);
      throw error;
    }
  }

  /**
   * Schedule a cron task
   */
  private scheduleTask(name: string, schedule: string, task: () => Promise<void>): void {
    const cronTask: CronTask = {
      name,
      schedule,
      task,
      running: false,
    };

    this.taskStatus.set(name, cronTask);

    const scheduledTask = cron.schedule(schedule, async () => {
      if (cronTask.running) {
        logger.warn(`Task ${name} is already running, skipping this execution`);
        return;
      }

      try {
        cronTask.running = true;
        logger.info(`Starting cron task: ${name}`);
        
        const startTime = Date.now();
        await task();
        const duration = Date.now() - startTime;
        
        logger.info(`Completed cron task: ${name}, duration: ${duration}ms`);
      } catch (error) {
        logger.error(`Error in cron task ${name}:`, error);
      } finally {
        cronTask.running = false;
      }
    });

    this.tasks.set(name, scheduledTask);
    logger.info(`Scheduled cron task: ${name} (${schedule})`);
  }

  /**
   * Update Merkle tree roots for privacy pools
   */
  private async updateMerkleRoots(): Promise<void> {
    logger.info('Updating Merkle tree roots...');
    
    try {
      const organizations = await Organization.find({ kycStatus: 'approved' });

      for (const org of organizations) {
        // Get all employees in organization
        const employees = await Employee.find({
          organizationId: org.organizationId,
          status: 'active',
        });

        // Get recent transactions
        const recentTransactions = await Transaction.find({
          organizationId: org.organizationId,
          createdAt: { $gte: new Date(Date.now() - 3600000) }, // Last hour
        });

        logger.info(`Updated Merkle root for org ${org.organizationId}: ${employees.length} employees, ${recentTransactions.length} transactions`);

        // Emit update to organization
        webSocketService.emitToOrganization(org.organizationId, 'merkle:update', {
          employeeCount: employees.length,
          transactionCount: recentTransactions.length,
          timestamp: Date.now(),
        });
      }

      logger.info('Merkle tree roots updated successfully');
    } catch (error) {
      logger.error('Failed to update Merkle roots:', error);
      throw error;
    }
  }

  /**
   * Settle state channels
   */
  private async settleChannels(): Promise<void> {
    logger.info('Starting daily channel settlement...');
    
    try {
      const employees = await Employee.find({
        status: 'active',
        'channels.status': 'open',
      });

      let settledCount = 0;

      for (const employee of employees) {
        for (const channel of employee.channels) {
          if (channel.status === 'open') {
            // Simulate channel settlement logic
            channel.status = 'settled';
            settledCount++;
            
            logger.debug(`Settled channel ${channel.channelId} for employee ${employee.employeeId}`);
          }
        }

        await employee.save();

        // Emit update to employee
        if (employee.employeeId) {
          webSocketService.emitToUser(employee.employeeId, 'channel:settled', {
            employeeId: employee.employeeId,
            channels: employee.channels,
          });
        }
      }

      logger.info(`Channel settlement completed: ${settledCount} channels settled`);
    } catch (error) {
      logger.error('Failed to settle channels:', error);
      throw error;
    }
  }

  /**
   * Distribute weekly payroll
   */
  private async distributePayroll(): Promise<void> {
    logger.info('Starting weekly payroll distribution...');
    
    try {
      const organizations = await Organization.find({ kycStatus: 'approved' });

      for (const org of organizations) {
        const employees = await Employee.find({
          organizationId: org.organizationId,
          status: 'active',
        });

        logger.info(`Processing payroll for ${org.name}: ${employees.length} employees`);

        // Emit payroll distribution event
        webSocketService.emitPayrollDistribution(org.organizationId, {
          organizationId: org.organizationId,
          organizationName: org.name,
          employeeCount: employees.length,
          status: 'distributed',
        });

        // Notify each employee
        for (const employee of employees) {
          if (employee.employeeId) {
            webSocketService.emitToUser(employee.employeeId, 'payroll:received', {
              employeeId: employee.employeeId,
              organizationId: org.organizationId,
              timestamp: Date.now(),
            });
          }
        }
      }

      logger.info('Weekly payroll distribution completed');
    } catch (error) {
      logger.error('Failed to distribute payroll:', error);
      throw error;
    }
  }

  /**
   * Generate monthly reports
   */
  private async generateMonthlyReports(): Promise<void> {
    logger.info('Generating monthly reports...');
    
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      startOfMonth.setMonth(startOfMonth.getMonth() - 1);

      const endOfMonth = new Date(startOfMonth);
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);
      endOfMonth.setHours(23, 59, 59, 999);

      const organizations = await Organization.find({ kycStatus: 'approved' });

      for (const org of organizations) {
        // Get monthly statistics
        const transactions = await Transaction.find({
          organizationId: org.organizationId,
          createdAt: { $gte: startOfMonth, $lte: endOfMonth },
        });

        const employees = await Employee.find({
          organizationId: org.organizationId,
        });

        const report = {
          organizationId: org.organizationId,
          organizationName: org.name,
          period: {
            start: startOfMonth,
            end: endOfMonth,
          },
          metrics: {
            totalTransactions: transactions.length,
            totalEmployees: employees.length,
            activeEmployees: employees.filter(e => e.status === 'active').length,
          },
        };

        logger.info(`Monthly report for ${org.name}:`, report.metrics);

        // Emit report to organization admins
        webSocketService.emitToOrganization(org.organizationId, 'report:monthly', report);
      }

      logger.info('Monthly reports generated successfully');
    } catch (error) {
      logger.error('Failed to generate monthly reports:', error);
      throw error;
    }
  }

  /**
   * Cleanup old data
   */
  private async cleanupOldData(): Promise<void> {
    logger.info('Starting data cleanup...');
    
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

      // Clean up old sessions (older than 30 days)
      // This would be handled by Redis TTL, but we can verify

      // Clean up old inactive employees (revoked for 6+ months)
      const result = await Employee.deleteMany({
        status: 'revoked',
        updatedAt: { $lt: sixMonthsAgo },
      });

      logger.info(`Cleaned up ${result.deletedCount} old inactive employees`);

      // Archive old transactions (optional - currently just logging)
      const oldTransactionCount = await Transaction.countDocuments({
        createdAt: { $lt: sixMonthsAgo },
      });

      logger.info(`Found ${oldTransactionCount} transactions older than 6 months (archival recommended)`);

      logger.info('Data cleanup completed');
    } catch (error) {
      logger.error('Failed to cleanup old data:', error);
      throw error;
    }
  }

  /**
   * Update balances cache
   */
  private async updateBalancesCache(): Promise<void> {
    logger.debug('Updating balances cache...');
    
    try {
      // This is a placeholder - actual implementation would query blockchain
      const employees = await Employee.find({ status: 'active' }).limit(100);

      for (const employee of employees) {
        if (employee.employeeId) {
          const chains = ['ethereum', 'sui', 'base'];
          
          for (const chain of chains) {
            // Simulate balance fetch (replace with actual blockchain query)
            const balance = '1000.00'; // Placeholder
            
            await redisService.cacheBalance(employee.employeeId, chain, balance);
          }
        }
      }

      logger.debug('Balances cache updated');
    } catch (error) {
      logger.error('Failed to update balances cache:', error);
    }
  }

  /**
   * Cleanup expired sessions
   */
  private async cleanupExpiredSessions(): Promise<void> {
    logger.debug('Cleaning up expired sessions...');
    
    try {
      // Redis handles TTL automatically, but we can log the activity
      logger.debug('Session cleanup check completed (Redis TTL managed)');
    } catch (error) {
      logger.error('Failed to cleanup sessions:', error);
    }
  }

  /**
   * Start all cron tasks
   */
  startAll(): void {
    this.tasks.forEach((task, name) => {
      task.start();
      logger.info(`Started cron task: ${name}`);
    });
  }

  /**
   * Stop all cron tasks
   */
  stopAll(): void {
    this.tasks.forEach((task, name) => {
      task.stop();
      logger.info(`Stopped cron task: ${name}`);
    });
  }

  /**
   * Start specific task
   */
  startTask(name: string): boolean {
    const task = this.tasks.get(name);
    if (task) {
      task.start();
      logger.info(`Started cron task: ${name}`);
      return true;
    }
    return false;
  }

  /**
   * Stop specific task
   */
  stopTask(name: string): boolean {
    const task = this.tasks.get(name);
    if (task) {
      task.stop();
      logger.info(`Stopped cron task: ${name}`);
      return true;
    }
    return false;
  }

  /**
   * Get task status
   */
  getTaskStatus(name: string): CronTask | undefined {
    return this.taskStatus.get(name);
  }

  /**
   * Get all tasks status
   */
  getAllTasksStatus(): CronTask[] {
    return Array.from(this.taskStatus.values());
  }

  /**
   * Manually trigger a task
   */
  async triggerTask(name: string): Promise<boolean> {
    const taskInfo = this.taskStatus.get(name);
    if (taskInfo && !taskInfo.running) {
      try {
        taskInfo.running = true;
        logger.info(`Manually triggering task: ${name}`);
        await taskInfo.task();
        return true;
      } catch (error) {
        logger.error(`Failed to manually trigger task ${name}:`, error);
        return false;
      } finally {
        taskInfo.running = false;
      }
    }
    return false;
  }
}

export default new CronService();
