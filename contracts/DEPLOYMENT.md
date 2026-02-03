# TrustNet Contracts - Testnet Deployment

**Deployment Date:** February 3, 2026  
**Network:** Sui Testnet  
**Deployer Address:** `0x085d1762b64b2fcf184cf47d82681bde2934ead8b42362eabc8bc4d4382bd9a9`

## 📦 Package Information

**Package ID:** `0xaea2bdfbdab9d4f0ae173214c078e86f3e50d04a5ed8195192dec53729e3dfef`

**Transaction Digest:** `6emDbkuADbUVC2R7U7aPkSotKyKsMU6shJYD9CWkaMHD`

**Upgrade Cap:** `0x086899ac4d9f4ee70711fe9ee8a26f6fc405bb974e4f4102a6eed60368997a66`

### Deployed Modules
- ✅ `employee_wallet`
- ✅ `organization_registry`
- ✅ `payroll_distributor`
- ✅ `privacy_pool`

## 🔗 Explorer Links

**Package:** https://testnet.suivision.xyz/package/0xaea2bdfbdab9d4f0ae173214c078e86f3e50d04a5ed8195192dec53729e3dfef

**Transaction:** https://testnet.suivision.xyz/txblock/6emDbkuADbUVC2R7U7aPkSotKyKsMU6shJYD9CWkaMHD

## 💰 Deployment Costs

- **Storage Cost:** 78.4016 MIST (0.0784016 SUI)
- **Computation Cost:** 1.0 MIST (0.001 SUI)
- **Storage Rebate:** 0.97812 MIST
- **Total Cost:** 78.423480 MIST (≈ 0.078 SUI)

## 🚀 Next Steps

### 1. Initialize Registries

You need to call the init functions to create the shared registries. These will be done automatically on first use, or you can explicitly initialize them:

```bash
# Set environment variables
export PACKAGE_ID=0xaea2bdfbdab9d4f0ae173214c078e86f3e50d04a5ed8195192dec53729e3dfef

# Note: Init functions are auto-called on module publish
# The registries will be created when first functions are called
```

### 2. Test Basic Operations

#### Register an Organization

```bash
sui client call \
  --package $PACKAGE_ID \
  --module organization_registry \
  --function register_organization \
  --args [REGISTRY_ID] "Your Company Name" \
  --gas-budget 10000000
```

#### Create Employee Wallet

```bash
sui client call \
  --package $PACKAGE_ID \
  --module employee_wallet \
  --function create_wallet \
  --args [ORG_ADDRESS] $(date +%s)000 \
  --gas-budget 10000000
```

### 3. Backend Integration

Update your backend `.env` file:

```env
SUI_NETWORK=testnet
SUI_PACKAGE_ID=0xaea2bdfbdab9d4f0ae173214c078e86f3e50d04a5ed8195192dec53729e3dfef
DEPLOYER_ADDRESS=0x085d1762b64b2fcf184cf47d82681bde2934ead8b42362eabc8bc4d4382bd9a9
```

### 4. TypeScript Integration Example

```typescript
import { SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io' });
const packageId = '0xaea2bdfbdab9d4f0ae173214c078e86f3e50d04a5ed8195192dec53729e3dfef';

// Example: Register organization
const txb = new TransactionBlock();
txb.moveCall({
  target: `${packageId}::organization_registry::register_organization`,
  arguments: [
    txb.object(registryId),
    txb.pure('Acme Corp')
  ]
});

const result = await client.signAndExecuteTransactionBlock({
  transactionBlock: txb,
  signer: keypair
});
```

## 🔍 Verification

Verify the deployment:

```bash
# View package info
sui client object $PACKAGE_ID

# View upgrade cap (you own this)
sui client object 0x086899ac4d9f4ee70711fe9ee8a26f6fc405bb974e4f4102a6eed60368997a66
```

## 📝 Important Notes

1. **Save the Package ID** - You'll need this for all contract interactions
2. **Upgrade Cap** - Stored at the address above, allows you to upgrade the package
3. **Registry Initialization** - Init functions create shared objects on first call
4. **Gas Management** - Keep some SUI in your wallet for transactions

## 🐛 Troubleshooting

### Get More Testnet Tokens

```bash
curl --location --request POST 'https://faucet.testnet.sui.io/gas' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "FixedAmountRequest": {
      "recipient": "0x085d1762b64b2fcf184cf47d82681bde2934ead8b42362eabc8bc4d4382bd9a9"
    }
  }'
```

### View Transaction Details

```bash
sui client transaction-block 6emDbkuADbUVC2R7U7aPkSotKyKsMU6shJYD9CWkaMHD
```

## 📚 Documentation

- [Contract README](./README.md) - Full contract documentation
- [Sui Testnet Explorer](https://testnet.suivision.xyz/)
- [Sui Documentation](https://docs.sui.io/)

---

**Status:** ✅ Deployed and Ready for Integration  
**Version:** 1.0.0
