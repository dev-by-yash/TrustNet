import express, { Router, Request, Response } from 'express';
import ensService from '../services/ENSService';
import securityMiddleware from '../middleware/SecurityMiddleware';
import logger from '../utils/logger';
import { body } from 'express-validator';

const router: Router = express.Router();

/**
 * @route   POST /api/ens/commitment/generate
 * @desc    Generate commitment for ENS registration (step 1 of commit-reveal)
 * @access  Private (authenticated admins only)
 */
router.post(
  '/commitment/generate',
  securityMiddleware.authenticate(),
  securityMiddleware.authorize('canManageOrganization'),
  securityMiddleware.validate([
    body('name').isString().notEmpty().withMessage('ENS name is required'),
    body('owner').isEthereumAddress().withMessage('Valid owner address is required'),
    body('duration').optional().isInt({ min: 31536000 }).withMessage('Duration must be at least 1 year'),
  ]),
  securityMiddleware.auditLog('generate_ens_commitment', 'ens'),
  async (req: Request, res: Response) => {
    try {
      const { name, owner, duration, secret } = req.body;

      const result = await ensService.generateCommitment(name, owner, duration, secret);

      logger.info(`Generated ENS commitment for ${name}`);

      res.json({
        success: true,
        data: {
          commitment: result.commitment,
          secret: result.secret,
          name,
          owner,
          message: 'Commitment generated. You must wait at least 60 seconds before registering.',
        },
      });
    } catch (error: any) {
      logger.error('Failed to generate ENS commitment:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate commitment',
      });
    }
  }
);

/**
 * @route   POST /api/ens/register
 * @desc    Register ENS name after commitment (step 2 of commit-reveal)
 * @access  Private (authenticated admins only)
 */
router.post(
  '/register',
  securityMiddleware.authenticate(),
  securityMiddleware.authorize('canManageOrganization'),
  securityMiddleware.validate([
    body('name').isString().notEmpty().withMessage('ENS name is required'),
    body('commitment').isString().notEmpty().withMessage('Commitment is required'),
    body('signerPrivateKey').isString().notEmpty().withMessage('Signer private key is required'),
  ]),
  securityMiddleware.auditLog('register_ens_name', 'ens'),
  async (req: Request, res: Response) => {
    try {
      const { name, commitment, signerPrivateKey } = req.body;

      // First commit
      const commitTx = await ensService.commitRegistration(commitment, signerPrivateKey);

      // Wait notification - actual registration should be done 60s later
      res.json({
        success: true,
        data: {
          commitTransactionHash: commitTx,
          name,
          message: 'Commitment transaction sent. Wait 60 seconds before calling /api/ens/register/complete',
        },
      });
    } catch (error: any) {
      logger.error('Failed to register ENS name:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to register ENS name',
      });
    }
  }
);

/**
 * @route   POST /api/ens/register/complete
 * @desc    Complete ENS registration (after 60s wait)
 * @access  Private (authenticated admins only)
 */
router.post(
  '/register/complete',
  securityMiddleware.authenticate(),
  securityMiddleware.authorize('canManageOrganization'),
  securityMiddleware.validate([
    body('name').isString().notEmpty().withMessage('ENS name is required'),
    body('commitment').isString().notEmpty().withMessage('Commitment is required'),
    body('signerPrivateKey').isString().notEmpty().withMessage('Signer private key is required'),
  ]),
  securityMiddleware.auditLog('complete_ens_registration', 'ens'),
  async (req: Request, res: Response) => {
    try {
      const { name, commitment, signerPrivateKey } = req.body;

      const registerTx = await ensService.registerName(name, commitment, signerPrivateKey);

      logger.info(`Registered ENS name: ${name}`);

      res.json({
        success: true,
        data: {
          transactionHash: registerTx,
          name,
          message: 'ENS name registered successfully',
        },
      });
    } catch (error: any) {
      logger.error('Failed to complete ENS registration:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to complete registration',
      });
    }
  }
);

/**
 * @route   POST /api/ens/subdomain
 * @desc    Create subdomain for employee
 * @access  Private (authenticated admins only)
 */
router.post(
  '/subdomain',
  securityMiddleware.authenticate(),
  securityMiddleware.authorize('canManageEmployees'),
  securityMiddleware.validate([
    body('parentName').isString().notEmpty().withMessage('Parent ENS name is required'),
    body('subdomain').isString().notEmpty().withMessage('Subdomain is required'),
    body('owner').isEthereumAddress().withMessage('Valid owner address is required'),
    body('signerPrivateKey').isString().notEmpty().withMessage('Signer private key is required'),
  ]),
  securityMiddleware.auditLog('create_ens_subdomain', 'ens'),
  async (req: Request, res: Response) => {
    try {
      const { parentName, subdomain, owner, signerPrivateKey } = req.body;

      const txHash = await ensService.setSubdomain(parentName, subdomain, owner, signerPrivateKey);

      const fullName = `${subdomain}.${parentName}`;
      logger.info(`Created ENS subdomain: ${fullName}`);

      res.json({
        success: true,
        data: {
          transactionHash: txHash,
          fullName,
          subdomain,
          parentName,
          owner,
          message: 'Subdomain created successfully',
        },
      });
    } catch (error: any) {
      logger.error('Failed to create subdomain:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create subdomain',
      });
    }
  }
);

/**
 * @route   GET /api/ens/resolve/:name
 * @desc    Resolve ENS name to address
 * @access  Public
 */
router.get(
  '/resolve/:name',
  async (req: Request, res: Response) => {
    try {
      const { name } = req.params;

      const address = await ensService.resolveNameToAddress(name);

      if (!address) {
        return res.status(404).json({
          success: false,
          error: 'ENS name not found or not configured',
        });
      }

      res.json({
        success: true,
        data: {
          name,
          address,
        },
      });
    } catch (error: any) {
      logger.error('Failed to resolve ENS name:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to resolve ENS name',
      });
    }
  }
);

/**
 * @route   GET /api/ens/reverse/:address
 * @desc    Reverse resolve address to ENS name
 * @access  Public
 */
router.get(
  '/reverse/:address',
  async (req: Request, res: Response) => {
    try {
      const { address } = req.params;

      const name = await ensService.resolveAddressToName(address);

      if (!name) {
        return res.status(404).json({
          success: false,
          error: 'No ENS name found for this address',
        });
      }

      res.json({
        success: true,
        data: {
          address,
          name,
        },
      });
    } catch (error: any) {
      logger.error('Failed to reverse resolve address:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to reverse resolve address',
      });
    }
  }
);

/**
 * @route   PUT /api/ens/text-records
 * @desc    Update text records for ENS name
 * @access  Private (authenticated users)
 */
router.put(
  '/text-records',
  securityMiddleware.authenticate(),
  securityMiddleware.validate([
    body('name').isString().notEmpty().withMessage('ENS name is required'),
    body('records').isArray().withMessage('Records must be an array'),
    body('records.*.key').isString().notEmpty().withMessage('Record key is required'),
    body('records.*.value').isString().notEmpty().withMessage('Record value is required'),
    body('signerPrivateKey').isString().notEmpty().withMessage('Signer private key is required'),
  ]),
  securityMiddleware.auditLog('update_ens_text_records', 'ens'),
  async (req: Request, res: Response) => {
    try {
      const { name, records, signerPrivateKey } = req.body;

      const txHash = await ensService.updateTextRecords(name, records, signerPrivateKey);

      logger.info(`Updated text records for ${name}`);

      res.json({
        success: true,
        data: {
          transactionHash: txHash,
          name,
          recordsUpdated: records.length,
          message: 'Text records updated successfully',
        },
      });
    } catch (error: any) {
      logger.error('Failed to update text records:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update text records',
      });
    }
  }
);

/**
 * @route   GET /api/ens/text-record/:name/:key
 * @desc    Get specific text record from ENS name
 * @access  Public
 */
router.get(
  '/text-record/:name/:key',
  async (req: Request, res: Response) => {
    try {
      const { name, key } = req.params;

      const value = await ensService.getTextRecord(name, key);

      if (!value) {
        return res.status(404).json({
          success: false,
          error: 'Text record not found',
        });
      }

      res.json({
        success: true,
        data: {
          name,
          key,
          value,
        },
      });
    } catch (error: any) {
      logger.error('Failed to get text record:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get text record',
      });
    }
  }
);

/**
 * @route   GET /api/ens/available/:name
 * @desc    Check if ENS name is available
 * @access  Public
 */
router.get(
  '/available/:name',
  async (req: Request, res: Response) => {
    try {
      const { name } = req.params;

      const available = await ensService.isNameAvailable(name);

      res.json({
        success: true,
        data: {
          name,
          available,
        },
      });
    } catch (error: any) {
      logger.error('Failed to check name availability:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to check name availability',
      });
    }
  }
);

export default router;
