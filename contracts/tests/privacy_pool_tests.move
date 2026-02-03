#[test_only]
module contracts::privacy_pool_tests {
    use sui::test_scenario::{Self as test, Scenario, next_tx, ctx};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::clock::{Self, Clock};
    use contracts::privacy_pool::{Self, PrivacyPool};

    const DEPLOYER: address = @0x1;
    const USER_1: address = @0x2;
    const USER_2: address = @0x3;
    const ADMIN: address = @0x4;

    const DENOMINATION: u64 = 1000;
    const COMMITMENT_1: vector<u8> = b"commitment_hash_1";
    const COMMITMENT_2: vector<u8> = b"commitment_hash_2";
    const NULLIFIER_1: vector<u8> = b"nullifier_hash_1";
    const NULLIFIER_2: vector<u8> = b"nullifier_hash_2";
    const PROOF_1: vector<u8> = b"mock_zk_proof_1";
    const PROOF_2: vector<u8> = b"mock_zk_proof_2";

    fun setup_pool(scenario: &mut Scenario) {
        next_tx(scenario, DEPLOYER);
        {
            let clock = clock::create_for_testing(ctx(scenario));
            privacy_pool::init_pool(DENOMINATION, clock::timestamp_ms(&clock), ctx(scenario));
            clock::destroy_for_testing(clock);
        };
    }

    #[test]
    fun test_init_privacy_pool() {
        let mut scenario = test::begin(DEPLOYER);
        setup_pool(&mut scenario);
        
        next_tx(&mut scenario, DEPLOYER);
        {
            let pool = test::take_shared<PrivacyPool>(&scenario);
            assert!(privacy_pool::get_denomination(&pool) == DENOMINATION, 0);
            assert!(privacy_pool::get_total_deposits(&pool) == 0, 1);
            assert!(privacy_pool::get_total_withdrawals(&pool) == 0, 2);
            test::return_shared(pool);
        };
        
        test::end(scenario);
    }

    #[test]
    fun test_anonymous_deposit() {
        let mut scenario = test::begin(DEPLOYER);
        setup_pool(&mut scenario);
        
        next_tx(&mut scenario, USER_1);
        {
            let mut pool = test::take_shared<PrivacyPool>(&scenario);
            let clock = clock::create_for_testing(ctx(&mut scenario));
            let deposit_coin = coin::mint_for_testing<SUI>(DENOMINATION, ctx(&mut scenario));
            
            privacy_pool::deposit(
                &mut pool,
                deposit_coin,
                COMMITMENT_1,
                clock::timestamp_ms(&clock)
            );
            
            assert!(privacy_pool::get_total_deposits(&pool) == DENOMINATION, 0);
            
            clock::destroy_for_testing(clock);
            test::return_shared(pool);
        };
        
        test::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = privacy_pool::E_COMMITMENT_EXISTS)]
    fun test_duplicate_commitment() {
        let mut scenario = test::begin(DEPLOYER);
        setup_pool(&mut scenario);
        
        // First deposit
        next_tx(&mut scenario, USER_1);
        {
            let mut pool = test::take_shared<PrivacyPool>(&scenario);
            let clock = clock::create_for_testing(ctx(&mut scenario));
            let deposit_coin = coin::mint_for_testing<SUI>(DENOMINATION, ctx(&mut scenario));
            
            privacy_pool::deposit(&mut pool, deposit_coin, COMMITMENT_1, clock::timestamp_ms(&clock));
            
            clock::destroy_for_testing(clock);
            test::return_shared(pool);
        };
        
        // Try to use same commitment again (should fail)
        next_tx(&mut scenario, USER_2);
        {
            let mut pool = test::take_shared<PrivacyPool>(&scenario);
            let clock = clock::create_for_testing(ctx(&mut scenario));
            let deposit_coin = coin::mint_for_testing<SUI>(DENOMINATION, ctx(&mut scenario));
            
            privacy_pool::deposit(&mut pool, deposit_coin, COMMITMENT_1, clock::timestamp_ms(&clock));
            
            clock::destroy_for_testing(clock);
            test::return_shared(pool);
        };
        
        test::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = privacy_pool::E_INVALID_AMOUNT)]
    fun test_deposit_invalid_amount() {
        let mut scenario = test::begin(DEPLOYER);
        setup_pool(&mut scenario);
        
        next_tx(&mut scenario, USER_1);
        {
            let mut pool = test::take_shared<PrivacyPool>(&scenario);
            let clock = clock::create_for_testing(ctx(&mut scenario));
            let deposit_coin = coin::mint_for_testing<SUI>(500, ctx(&mut scenario)); // Wrong amount
            
            privacy_pool::deposit(&mut pool, deposit_coin, COMMITMENT_1, clock::timestamp_ms(&clock));
            
            clock::destroy_for_testing(clock);
            test::return_shared(pool);
        };
        
        test::end(scenario);
    }

    #[test]
    fun test_anonymous_withdrawal() {
        let mut scenario = test::begin(DEPLOYER);
        setup_pool(&mut scenario);
        
        // First deposit
        next_tx(&mut scenario, USER_1);
        {
            let mut pool = test::take_shared<PrivacyPool>(&scenario);
            let clock = clock::create_for_testing(ctx(&mut scenario));
            let deposit_coin = coin::mint_for_testing<SUI>(DENOMINATION, ctx(&mut scenario));
            
            privacy_pool::deposit(&mut pool, deposit_coin, COMMITMENT_1, clock::timestamp_ms(&clock));
            
            clock::destroy_for_testing(clock);
            test::return_shared(pool);
        };
        
        // Update merkle root
        next_tx(&mut scenario, ADMIN);
        {
            let mut pool = test::take_shared<PrivacyPool>(&scenario);
            let clock = clock::create_for_testing(ctx(&mut scenario));
            let merkle_root = b"mock_merkle_root";
            
            privacy_pool::update_merkle_root(&mut pool, merkle_root, clock::timestamp_ms(&clock), ctx(&mut scenario));
            
            clock::destroy_for_testing(clock);
            test::return_shared(pool);
        };
        
        // Withdraw with nullifier and proof (transfers directly to USER_2)
        next_tx(&mut scenario, USER_2);
        {
            let mut pool = test::take_shared<PrivacyPool>(&scenario);
            let clock = clock::create_for_testing(ctx(&mut scenario));
            let merkle_root = b"mock_merkle_root";
            
            privacy_pool::withdraw(
                &mut pool,
                NULLIFIER_1,
                USER_2,
                PROOF_1,
                merkle_root,
                clock::timestamp_ms(&clock),
                ctx(&mut scenario)
            );
            
            assert!(privacy_pool::get_total_withdrawals(&pool) == DENOMINATION, 0);
            
            clock::destroy_for_testing(clock);
            test::return_shared(pool);
        };
        
        // Verify USER_2 received the coin
        next_tx(&mut scenario, USER_2);
        {
            let coin = test::take_from_sender<Coin<SUI>>(&scenario);
            assert!(coin::value(&coin) == DENOMINATION, 0);
            test::return_to_sender(&scenario, coin);
        };
        
        test::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = privacy_pool::E_NULLIFIER_SPENT)]
    fun test_duplicate_nullifier() {
        let mut scenario = test::begin(DEPLOYER);
        setup_pool(&mut scenario);
        
        // Deposit twice
        next_tx(&mut scenario, USER_1);
        {
            let mut pool = test::take_shared<PrivacyPool>(&scenario);
            let clock = clock::create_for_testing(ctx(&mut scenario));
            
            let coin1 = coin::mint_for_testing<SUI>(DENOMINATION, ctx(&mut scenario));
            privacy_pool::deposit(&mut pool, coin1, COMMITMENT_1, clock::timestamp_ms(&clock));
            
            let coin2 = coin::mint_for_testing<SUI>(DENOMINATION, ctx(&mut scenario));
            privacy_pool::deposit(&mut pool, coin2, COMMITMENT_2, clock::timestamp_ms(&clock));
            
            clock::destroy_for_testing(clock);
            test::return_shared(pool);
        };
        
        // Update merkle root
        next_tx(&mut scenario, ADMIN);
        {
            let mut pool = test::take_shared<PrivacyPool>(&scenario);
            let clock = clock::create_for_testing(ctx(&mut scenario));
            let merkle_root = b"mock_merkle_root";
            
            privacy_pool::update_merkle_root(&mut pool, merkle_root, clock::timestamp_ms(&clock), ctx(&mut scenario));
            
            clock::destroy_for_testing(clock);
            test::return_shared(pool);
        };
        
        // First withdrawal
        next_tx(&mut scenario, USER_2);
        {
            let mut pool = test::take_shared<PrivacyPool>(&scenario);
            let clock = clock::create_for_testing(ctx(&mut scenario));
            let merkle_root = b"mock_merkle_root";
            
            privacy_pool::withdraw(&mut pool, NULLIFIER_1, USER_2, PROOF_1, merkle_root, clock::timestamp_ms(&clock), ctx(&mut scenario));
            
            clock::destroy_for_testing(clock);
            test::return_shared(pool);
        };
        
        // Try to use same nullifier again (should fail)
        next_tx(&mut scenario, USER_2);
        {
            let mut pool = test::take_shared<PrivacyPool>(&scenario);
            let clock = clock::create_for_testing(ctx(&mut scenario));
            let merkle_root = b"mock_merkle_root";
            
            privacy_pool::withdraw(&mut pool, NULLIFIER_1, USER_2, PROOF_2, merkle_root, clock::timestamp_ms(&clock), ctx(&mut scenario));
            
            clock::destroy_for_testing(clock);
            test::return_shared(pool);
        };
        
        test::end(scenario);
    }

    #[test]
    fun test_multiple_deposits_and_withdrawals() {
        let mut scenario = test::begin(DEPLOYER);
        setup_pool(&mut scenario);
        
        // Multiple deposits
        next_tx(&mut scenario, USER_1);
        {
            let mut pool = test::take_shared<PrivacyPool>(&scenario);
            let clock = clock::create_for_testing(ctx(&mut scenario));
            
            let coin1 = coin::mint_for_testing<SUI>(DENOMINATION, ctx(&mut scenario));
            privacy_pool::deposit(&mut pool, coin1, COMMITMENT_1, clock::timestamp_ms(&clock));
            
            let coin2 = coin::mint_for_testing<SUI>(DENOMINATION, ctx(&mut scenario));
            privacy_pool::deposit(&mut pool, coin2, COMMITMENT_2, clock::timestamp_ms(&clock));
            
            assert!(privacy_pool::get_total_deposits(&pool) == 2 * DENOMINATION, 0);
            
            clock::destroy_for_testing(clock);
            test::return_shared(pool);
        };
        
        // Update merkle root
        next_tx(&mut scenario, ADMIN);
        {
            let mut pool = test::take_shared<PrivacyPool>(&scenario);
            let clock = clock::create_for_testing(ctx(&mut scenario));
            let merkle_root = b"mock_merkle_root";
            
            privacy_pool::update_merkle_root(&mut pool, merkle_root, clock::timestamp_ms(&clock), ctx(&mut scenario));
            
            clock::destroy_for_testing(clock);
            test::return_shared(pool);
        };
        
        // First withdrawal
        next_tx(&mut scenario, USER_2);
        {
            let mut pool = test::take_shared<PrivacyPool>(&scenario);
            let clock = clock::create_for_testing(ctx(&mut scenario));
            let merkle_root = b"mock_merkle_root";
            
            privacy_pool::withdraw(&mut pool, NULLIFIER_1, USER_2, PROOF_1, merkle_root, clock::timestamp_ms(&clock), ctx(&mut scenario));
            
            assert!(privacy_pool::get_total_withdrawals(&pool) == DENOMINATION, 0);
            
            clock::destroy_for_testing(clock);
            test::return_shared(pool);
        };
        
        // Second withdrawal
        next_tx(&mut scenario, USER_2);
        {
            let mut pool = test::take_shared<PrivacyPool>(&scenario);
            let clock = clock::create_for_testing(ctx(&mut scenario));
            let merkle_root = b"mock_merkle_root";
            
            privacy_pool::withdraw(&mut pool, NULLIFIER_2, USER_2, PROOF_2, merkle_root, clock::timestamp_ms(&clock), ctx(&mut scenario));
            
            assert!(privacy_pool::get_total_withdrawals(&pool) == 2 * DENOMINATION, 0);
            
            clock::destroy_for_testing(clock);
            test::return_shared(pool);
        };
        
        test::end(scenario);
    }

    #[test]
    fun test_update_merkle_root() {
        let mut scenario = test::begin(DEPLOYER);
        setup_pool(&mut scenario);
        
        next_tx(&mut scenario, ADMIN);
        {
            let mut pool = test::take_shared<PrivacyPool>(&scenario);
            let clock = clock::create_for_testing(ctx(&mut scenario));
            let new_root = b"new_merkle_root_hash";
            
            privacy_pool::update_merkle_root(&mut pool, new_root, clock::timestamp_ms(&clock), ctx(&mut scenario));
            
            clock::destroy_for_testing(clock);
            test::return_shared(pool);
        };
        
        test::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = privacy_pool::E_INSUFFICIENT_POOL_BALANCE)]
    fun test_withdraw_insufficient_pool_balance() {
        let mut scenario = test::begin(DEPLOYER);
        setup_pool(&mut scenario);
        
        // Try to withdraw without any deposits (use empty merkle_root to match pool's initial state)
        next_tx(&mut scenario, USER_1);
        {
            let mut pool = test::take_shared<PrivacyPool>(&scenario);
            let clock = clock::create_for_testing(ctx(&mut scenario));
            let merkle_root = vector::empty<u8>();
            
            privacy_pool::withdraw(&mut pool, NULLIFIER_1, USER_1, PROOF_1, merkle_root, clock::timestamp_ms(&clock), ctx(&mut scenario));
            
            clock::destroy_for_testing(clock);
            test::return_shared(pool);
        };
        
        test::end(scenario);
    }
}
