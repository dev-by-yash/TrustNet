# TrustNet Move Smart Contracts

Enterprise-grade payroll and privacy infrastructure built on Sui blockchain.

## Overview

TrustNet provides a comprehensive suite of Move smart contracts for managing organizational payroll, employee wallets, privacy-preserving transactions, and batch payment distribution on the Sui blockchain. The system is designed to handle 100+ employees efficiently using Programmable Transaction Blocks (PTBs).

## Architecture

### Core Modules

#### 1. **Organization Registry** (`organization_registry_clean.move`)
Central registry for managing organizations and their employees.

**Key Features:**
- Organization onboarding and management
- Employee registration and linking
- Treasury controls and permissions
- Employee status management (active/inactive)

**Main Functions:**
- `init_registry()` - Initialize the global organization registry
- `register_organization()` - Register a new organization
- `add_employee()` - Add an employee to an organization
- `update_employee_status()` - Toggle employee active/inactive status

#### 2. **Employee Wallet** (`employee_wallet.move`)
Individual wallet management for employees with full lifecycle support.

**Key Features:**
- Wallet creation and initialization
- Deposit and withdrawal operations
- Peer-to-peer transfers
- Balance tracking and history

**Main Functions:**
- `init_registry()` - Initialize wallet registry
- `create_wallet()` - Create new employee wallet
- `deposit()` - Deposit SUI tokens
- `withdraw()` - Withdraw SUI tokens
- `transfer_funds()` - Transfer between employee wallets

#### 3. **Privacy Pool** (`privacy_pool.move`)
Zero-knowledge privacy layer for anonymous transactions.

**Key Features:**
- Anonymous deposits with commitments
- Zero-knowledge proof verification (hooks ready)
- Merkle root management for proof trees
- Nullifier tracking to prevent double-spending
- Configurable minimum deposit amounts

**Main Functions:**
- `init_privacy_pool()` - Initialize privacy pool
- `anonymous_deposit()` - Deposit with commitment
- `anonymous_withdraw()` - Withdraw with ZK proof
- `update_merkle_root()` - Update proof tree root

#### 4. **Payroll Distributor** (`payroll_distributor.move`)
Optimized batch payroll processing for large organizations.

**Key Features:**
- Batch creation with funding
- Supports up to 500 employees per batch
- Efficient PTB execution
- Single and batch execution modes
- Balance tracking and validation

**Main Functions:**
- `init_registry()` - Initialize payroll registry
- `create_payroll_batch()` - Create funded payroll batch
- `add_to_batch()` - Add employee to batch
- `execute_payroll_single()` - Execute single payment
- `batch_execute_payroll()` - Execute batch payment
- `close_payroll_batch()` - Close and cleanup batch

## Getting Started

### Prerequisites

- **Sui CLI** (v1.0.0+)
- **Move Compiler** (included with Sui)
- Sui wallet with testnet tokens

### Installation

```bash
# Navigate to contracts directory
cd contracts

# Build the contracts
sui move build

# Run tests
sui move test
```

### Running Tests

```bash
# Run all tests
sui move test

# Run specific test module
sui move test employee_wallet_tests

# Run specific test function
sui move test test_create_wallet

# Verbose output
sui move test -v
```

### Test Coverage

**All 33 tests passing ✅**

- **Organization Registry**: 7 tests
  - Initialization, registration, employee management, status updates
- **Employee Wallet**: 8 tests  
  - Wallet lifecycle, deposits, withdrawals, transfers, balance validation
- **Privacy Pool**: 10 tests
  - Anonymous deposits/withdrawals, merkle roots, commitment/nullifier tracking
- **Payroll Distributor**: 8 tests
  - Batch creation, employee addition, execution modes, balance tracking

## Deployment

### Deploy to Sui Testnet

```bash
# Ensure you're on testnet
sui client active-env
# Should show: testnet

# Deploy contracts
sui client publish --gas-budget 100000000

# Save the output - you'll need:
# - Package ID
# - Registry object IDs (OrganizationRegistry, EmployeeWalletRegistry, etc.)
```

### Post-Deployment

After deployment, save these values:

```bash
PACKAGE_ID=0x...
ORG_REGISTRY_ID=0x...
WALLET_REGISTRY_ID=0x...
PAYROLL_REGISTRY_ID=0x...
PRIVACY_POOL_ID=0x...
```

## Usage Examples

### 1. Register an Organization

```bash
sui client call \
  --package $PACKAGE_ID \
  --module organization_registry \
  --function register_organization \
  --args $ORG_REGISTRY_ID "Acme Corp" \
  --gas-budget 10000000
```

### 2. Create Employee Wallet

```bash
sui client call \
  --package $PACKAGE_ID \
  --module employee_wallet \
  --function create_wallet \
  --args $ORG_ADDRESS $(date +%s)000 \
  --gas-budget 10000000
```

### 3. Create Payroll Batch

```bash
# First split SUI for funding
sui client split-coin --coin-id $COIN_ID --amounts 10000000 --gas-budget 10000000

# Create batch with funding
sui client call \
  --package $PACKAGE_ID \
  --module payroll_distributor \
  --function create_payroll_batch \
  --args $ORG_ADDRESS "[COIN_ID]" $(date +%s)000 \
  --gas-budget 10000000
```

### 4. Execute Batch Payroll

```bash
sui client call \
  --package $PACKAGE_ID \
  --module payroll_distributor \
  --function batch_execute_payroll \
  --args $BATCH_ID $EMPLOYEE_WALLET_ID \
  --gas-budget 10000000
```

## Contract Specifications

### Batch Size Limits

- **Max employees per payroll batch**: 500
- Enforced in `payroll_distributor.move` via `MAX_BATCH_SIZE` constant
- Optimized for Sui's PTB gas limits

### Privacy Pool Configuration

- **Minimum deposit**: 1000 MIST (configurable)
- ZK proof verification hooks ready for integration
- Merkle tree root updates for proof validation

### Security Features

- Authorization checks on all admin functions
- Balance validation before withdrawals/transfers
- Double-spend prevention via nullifier tracking
- Duplicate commitment detection

## Integration Guide

### For Backend Developers

The contracts emit events that can be indexed:

1. **OrganizationRegistered** - New org created
2. **EmployeeAdded** - Employee linked to org
3. **EmployeeStatusUpdated** - Status changed
4. **WalletCreated** - New employee wallet
5. **PayrollBatchCreated** - New batch created
6. **PayrollExecuted** - Payment processed

### Recommended Backend Stack

```typescript
// Install Sui TypeScript SDK
npm install @mysten/sui.js

// Create service layer
import { SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io' });
```

### PTB Construction Example

```typescript
const txb = new TransactionBlock();

// Add multiple employees to batch in single transaction
employees.forEach(emp => {
  txb.moveCall({
    target: `${PACKAGE_ID}::payroll_distributor::add_to_batch`,
    arguments: [
      txb.object(BATCH_ID),
      txb.pure(emp.address),
      txb.pure(emp.amount)
    ]
  });
});

await client.signAndExecuteTransactionBlock({ transactionBlock: txb });
```

## Development Workflow

### Adding New Features

1. Modify source contracts in `sources/`
2. Update/add tests in `tests/`
3. Run `sui move build` to compile
4. Run `sui move test` to verify
5. Deploy to testnet for integration testing

### Code Style

- Follow Move best practices
- Use meaningful variable names
- Add comments for complex logic
- Keep functions focused and small
- Validate inputs at entry points

## Troubleshooting

### Common Issues

**Build Errors:**
```bash
# Clean and rebuild
rm -rf build/
sui move build
```

**Test Failures:**
```bash
# Run specific test with verbose output
sui move test test_name -v
```

**Gas Issues:**
```bash
# Get testnet tokens
curl --location --request POST 'https://faucet.testnet.sui.io/gas' \
  --header 'Content-Type: application/json' \
  --data-raw '{ "FixedAmountRequest": { "recipient": "YOUR_ADDRESS" } }'
```

## Performance Considerations

- Batch operations reduce gas costs significantly
- PTBs enable atomic multi-employee payments
- VecMap for O(n) operations on small datasets (< 500)
- Consider splitting large payrolls across multiple batches

## Security Auditing

Before mainnet deployment:

1. ✅ All tests passing
2. ⏳ External security audit
3. ⏳ Gas optimization review  
4. ⏳ Upgrade strategy implementation
5. ⏳ Emergency pause mechanisms

## Contributing

1. Create feature branch
2. Add comprehensive tests
3. Ensure all tests pass
4. Update documentation
5. Submit PR with clear description

## License

MIT License - see LICENSE file for details

## Contact & Support

- **GitHub Issues**: Report bugs and feature requests
- **Documentation**: See main project README
- **Team**: TrustNet Core Contributors

## Roadmap

- [x] Core contract implementation
- [x] Comprehensive test suite
- [ ] Testnet deployment
- [ ] ZK proof integration (circuit development)
- [ ] DeepBook integration for multi-token payroll
- [ ] Sponsored transaction support
- [ ] Event indexer service
- [ ] Mainnet deployment

---

**Last Updated**: February 2026  
**Contract Version**: 1.0.0  
**Sui Version**: Compatible with Sui testnet
