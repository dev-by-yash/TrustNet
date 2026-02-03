# Siddharth To-Do Outline

## Move Smart Contracts
- [x] Draft `organization_registry.move` for org onboarding, employee linking, treasury controls
- [x] Implement `employee_wallet.move` covering wallet lifecycle (create, deposit, withdraw, transfer)
- [x] Design `privacy_pool.move` with ZK deposit/withdraw flows and proof verification hooks
- [x] Build `payroll_distributor.move` optimized for >100 employee PTBs and batching logic
- [x] Write integration/unit tests for organization_registry (7/7 passing)
- [x] Write tests for employee_wallet, privacy_pool, payroll_distributor (tests created but need fixing)
- [x] Deploy modules to Sui testnet and document addresses

## Backend Integration
- [ ] Create `SuiBlockchainService.ts` abstraction for Move calls, PTB construction, and DeepBook swaps
- [ ] Automate deployment of org contracts + employee wallet provisioning
- [ ] Implement programmable transaction blocks for batch payroll runs
- [ ] Add sponsored transaction flow so employees transact gas-free
- [ ] Stand up Sui event indexer (ingest, persist, expose API)
- [ ] Integrate DeepBook routing for treasury/token management
- [ ] Build REST/WebSocket APIs for Sui ops (deployments, payroll triggers, indexer queries)
- [ ] Document env variables, deployment steps, and monitoring hooks
