#[allow(lint(public_entry))]
module contracts::privacy_pool {
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::event;
    use sui::object::{Self, UID};
    use sui::sui::SUI;
    use sui::table::{Self, Table};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    const E_INVALID_PROOF: u64 = 0;
    const E_NULLIFIER_SPENT: u64 = 1;
    const E_COMMITMENT_EXISTS: u64 = 2;
    const E_INVALID_AMOUNT: u64 = 3;
    const E_INSUFFICIENT_POOL_BALANCE: u64 = 4;
    const E_MERKLE_ROOT_MISMATCH: u64 = 5;

    /// Shared privacy pool that holds anonymous deposits
    public struct PrivacyPool has key {
        id: UID,
        balance: Balance<SUI>,
        commitments: Table<vector<u8>, bool>,
        nullifiers: Table<vector<u8>, bool>,
        merkle_root: vector<u8>,
        total_deposits: u64,
        total_withdrawals: u64,
        denomination: u64,
    }

    /// Event emitted when anonymous deposit occurs
    public struct AnonymousDeposit has copy, drop {
        commitment: vector<u8>,
        amount: u64,
        timestamp_ms: u64,
    }

    /// Event emitted when anonymous withdrawal occurs
    public struct AnonymousWithdrawal has copy, drop {
        nullifier: vector<u8>,
        amount: u64,
        timestamp_ms: u64,
    }

    /// Event emitted when Merkle root is updated
    public struct MerkleRootUpdated has copy, drop {
        old_root: vector<u8>,
        new_root: vector<u8>,
        timestamp_ms: u64,
    }

    /// Initialize privacy pool with fixed denomination
    public entry fun init_pool(
        denomination: u64,
        clock_ms: u64,
        ctx: &mut TxContext,
    ) {
        assert!(denomination > 0, E_INVALID_AMOUNT);

        let pool = PrivacyPool {
            id: object::new(ctx),
            balance: balance::zero<SUI>(),
            commitments: table::new<vector<u8>, bool>(ctx),
            nullifiers: table::new<vector<u8>, bool>(ctx),
            merkle_root: vector::empty<u8>(),
            total_deposits: 0,
            total_withdrawals: 0,
            denomination,
        };

        transfer::share_object(pool);
    }

    /// Deposit funds anonymously using a commitment
    public entry fun deposit(
        pool: &mut PrivacyPool,
        coin: Coin<SUI>,
        commitment: vector<u8>,
        clock_ms: u64,
    ) {
        let amount = coin::value(&coin);
        assert!(amount == pool.denomination, E_INVALID_AMOUNT);
        assert!(!table::contains(&pool.commitments, commitment), E_COMMITMENT_EXISTS);

        let coin_balance = coin::into_balance(coin);
        balance::join(&mut pool.balance, coin_balance);

        table::add(&mut pool.commitments, commitment, true);
        pool.total_deposits = pool.total_deposits + amount;

        event::emit(AnonymousDeposit {
            commitment,
            amount,
            timestamp_ms: clock_ms,
        });
    }

    /// Withdraw funds anonymously using a ZK proof
    public entry fun withdraw(
        pool: &mut PrivacyPool,
        nullifier: vector<u8>,
        recipient: address,
        proof: vector<u8>,
        merkle_root: vector<u8>,
        clock_ms: u64,
        ctx: &mut TxContext,
    ) {
        // Verify nullifier hasn't been used
        assert!(!table::contains(&pool.nullifiers, nullifier), E_NULLIFIER_SPENT);
        
        // Verify Merkle root matches
        assert!(merkle_root == pool.merkle_root, E_MERKLE_ROOT_MISMATCH);
        
        // In production, verify ZK proof here
        verify_proof(proof, nullifier, merkle_root);

        let pool_balance = balance::value(&pool.balance);
        assert!(pool_balance >= pool.denomination, E_INSUFFICIENT_POOL_BALANCE);

        // Mark nullifier as spent
        table::add(&mut pool.nullifiers, nullifier, true);

        // Withdraw funds
        let withdrawn = balance::split(&mut pool.balance, pool.denomination);
        let coin = coin::from_balance(withdrawn, ctx);
        pool.total_withdrawals = pool.total_withdrawals + pool.denomination;

        event::emit(AnonymousWithdrawal {
            nullifier,
            amount: pool.denomination,
            timestamp_ms: clock_ms,
        });

        transfer::public_transfer(coin, recipient);
    }

    /// Update Merkle root (called by backend indexer)
    public entry fun update_merkle_root(
        pool: &mut PrivacyPool,
        new_root: vector<u8>,
        clock_ms: u64,
        _ctx: &mut TxContext,
    ) {
        let old_root = pool.merkle_root;
        pool.merkle_root = new_root;

        event::emit(MerkleRootUpdated {
            old_root,
            new_root,
            timestamp_ms: clock_ms,
        });
    }

    /// Verify ZK proof (placeholder - real verification would use groth16/plonk)
    fun verify_proof(
        _proof: vector<u8>,
        _nullifier: vector<u8>,
        _merkle_root: vector<u8>,
    ) {
        // TODO: Integrate with ZK proof verifier contract
        // For now, we trust the backend to submit valid proofs
        // In production, this would call a verifier contract or native function
    }

    /// Check if commitment exists in pool
    public fun commitment_exists(pool: &PrivacyPool, commitment: vector<u8>): bool {
        table::contains(&pool.commitments, commitment)
    }

    /// Check if nullifier has been spent
    public fun nullifier_spent(pool: &PrivacyPool, nullifier: vector<u8>): bool {
        table::contains(&pool.nullifiers, nullifier)
    }

    /// Get current Merkle root
    public fun get_merkle_root(pool: &PrivacyPool): vector<u8> {
        pool.merkle_root
    }

    /// Get pool balance
    public fun get_pool_balance(pool: &PrivacyPool): u64 {
        balance::value(&pool.balance)
    }

    /// Get denomination
    public fun get_denomination(pool: &PrivacyPool): u64 {
        pool.denomination
    }

    /// Get total deposits
    public fun get_total_deposits(pool: &PrivacyPool): u64 {
        pool.total_deposits
    }

    /// Get total withdrawals
    public fun get_total_withdrawals(pool: &PrivacyPool): u64 {
        pool.total_withdrawals
    }
}
