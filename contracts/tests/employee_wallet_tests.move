#[test_only]
module contracts::employee_wallet_tests {
    use sui::test_scenario::{Self as test, Scenario, next_tx, ctx};
    use sui::coin;
    use sui::sui::SUI;
    use sui::clock;
    use contracts::employee_wallet::{Self, WalletRegistry, EmployeeWallet};

    const DEPLOYER: address = @0x1;
    const ORG_ADMIN: address = @0x2;
    const EMPLOYEE_1: address = @0x3;
    const EMPLOYEE_2: address = @0x4;

    const TEST_ORG: address = @0x100;

    fun setup_registry(scenario: &mut Scenario) {
        next_tx(scenario, DEPLOYER);
        {
            employee_wallet::init_registry(ctx(scenario));
        };
    }

    #[test]
    fun test_init_wallet_registry() {
        let mut scenario = test::begin(DEPLOYER);
        setup_registry(&mut scenario);
        
        next_tx(&mut scenario, DEPLOYER);
        {
            let registry = test::take_shared<WalletRegistry>(&scenario);
            test::return_shared(registry);
        };
        
        test::end(scenario);
    }

    #[test]
    fun test_create_wallet() {
        let mut scenario = test::begin(DEPLOYER);
        setup_registry(&mut scenario);
        
        // Employee creates their own wallet
        next_tx(&mut scenario, EMPLOYEE_1);
        {
            let clock = clock::create_for_testing(ctx(&mut scenario));
            employee_wallet::create_wallet(
                TEST_ORG,
                clock::timestamp_ms(&clock),
                ctx(&mut scenario)
            );
            clock::destroy_for_testing(clock);
        };
        
        // Verify wallet was created and transferred to employee
        next_tx(&mut scenario, EMPLOYEE_1);
        {
            let wallet = test::take_from_sender<EmployeeWallet>(&scenario);
            assert!(employee_wallet::get_balance(&wallet) == 0, 0);
            assert!(employee_wallet::get_total_deposited(&wallet) == 0, 1);
            assert!(employee_wallet::get_total_withdrawn(&wallet) == 0, 2);
            test::return_to_sender(&scenario, wallet);
        };
        
        test::end(scenario);
    }

    #[test]
    fun test_deposit() {
        let mut scenario = test::begin(DEPLOYER);
        setup_registry(&mut scenario);
        
        // Create wallet
        next_tx(&mut scenario, EMPLOYEE_1);
        {
            let clock = clock::create_for_testing(ctx(&mut scenario));
            employee_wallet::create_wallet(TEST_ORG, clock::timestamp_ms(&clock), ctx(&mut scenario));
            clock::destroy_for_testing(clock);
        };
        
        // Deposit funds
        next_tx(&mut scenario, ORG_ADMIN);
        {
            let mut wallet = test::take_from_address<EmployeeWallet>(&scenario, EMPLOYEE_1);
            let clock = clock::create_for_testing(ctx(&mut scenario));
            let deposit_coin = coin::mint_for_testing<SUI>(1000, ctx(&mut scenario));
            
            employee_wallet::deposit(&mut wallet, deposit_coin, clock::timestamp_ms(&clock));
            
            assert!(employee_wallet::get_balance(&wallet) == 1000, 0);
            assert!(employee_wallet::get_total_deposited(&wallet) == 1000, 1);
            
            clock::destroy_for_testing(clock);
            test::return_to_address(EMPLOYEE_1, wallet);
        };
        
        test::end(scenario);
    }

    #[test]
    fun test_multiple_deposits() {
        let mut scenario = test::begin(DEPLOYER);
        setup_registry(&mut scenario);
        
        next_tx(&mut scenario, EMPLOYEE_1);
        {
            let clock = clock::create_for_testing(ctx(&mut scenario));
            employee_wallet::create_wallet(TEST_ORG, clock::timestamp_ms(&clock), ctx(&mut scenario));
            clock::destroy_for_testing(clock);
        };
        
        // First deposit
        next_tx(&mut scenario, ORG_ADMIN);
        {
            let mut wallet = test::take_from_address<EmployeeWallet>(&scenario, EMPLOYEE_1);
            let clock = clock::create_for_testing(ctx(&mut scenario));
            let coin1 = coin::mint_for_testing<SUI>(500, ctx(&mut scenario));
            employee_wallet::deposit(&mut wallet, coin1, clock::timestamp_ms(&clock));
            clock::destroy_for_testing(clock);
            test::return_to_address(EMPLOYEE_1, wallet);
        };
        
        // Second deposit
        next_tx(&mut scenario, ORG_ADMIN);
        {
            let mut wallet = test::take_from_address<EmployeeWallet>(&scenario, EMPLOYEE_1);
            let clock = clock::create_for_testing(ctx(&mut scenario));
            let coin2 = coin::mint_for_testing<SUI>(300, ctx(&mut scenario));
            employee_wallet::deposit(&mut wallet, coin2, clock::timestamp_ms(&clock));
            
            assert!(employee_wallet::get_balance(&wallet) == 800, 0);
            assert!(employee_wallet::get_total_deposited(&wallet) == 800, 1);
            
            clock::destroy_for_testing(clock);
            test::return_to_address(EMPLOYEE_1, wallet);
        };
        
        test::end(scenario);
    }

    #[test]
    fun test_withdraw() {
        let mut scenario = test::begin(DEPLOYER);
        setup_registry(&mut scenario);
        
        // Create wallet and deposit
        next_tx(&mut scenario, EMPLOYEE_1);
        {
            let clock = clock::create_for_testing(ctx(&mut scenario));
            employee_wallet::create_wallet(TEST_ORG, clock::timestamp_ms(&clock), ctx(&mut scenario));
            clock::destroy_for_testing(clock);
        };
        
        next_tx(&mut scenario, ORG_ADMIN);
        {
            let mut wallet = test::take_from_address<EmployeeWallet>(&scenario, EMPLOYEE_1);
            let clock = clock::create_for_testing(ctx(&mut scenario));
            let deposit_coin = coin::mint_for_testing<SUI>(1000, ctx(&mut scenario));
            employee_wallet::deposit(&mut wallet, deposit_coin, clock::timestamp_ms(&clock));
            clock::destroy_for_testing(clock);
            test::return_to_address(EMPLOYEE_1, wallet);
        };
        
        // Withdraw funds (transfers to EMPLOYEE_1)
        next_tx(&mut scenario, EMPLOYEE_1);
        {
            let mut wallet = test::take_from_sender<EmployeeWallet>(&scenario);
            let clock = clock::create_for_testing(ctx(&mut scenario));
            employee_wallet::withdraw(&mut wallet, 400, clock::timestamp_ms(&clock), ctx(&mut scenario));
            
            assert!(employee_wallet::get_balance(&wallet) == 600, 1);
            assert!(employee_wallet::get_total_withdrawn(&wallet) == 400, 2);
            
            clock::destroy_for_testing(clock);
            test::return_to_sender(&scenario, wallet);
        };
        
        // Verify coin was received
        next_tx(&mut scenario, EMPLOYEE_1);
        {
            let coin = test::take_from_sender<coin::Coin<SUI>>(&scenario);
            assert!(coin::value(&coin) == 400, 0);
            coin::burn_for_testing(coin);
        };
        
        test::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = employee_wallet::E_INSUFFICIENT_BALANCE)]
    fun test_withdraw_insufficient_balance() {
        let mut scenario = test::begin(DEPLOYER);
        setup_registry(&mut scenario);
        
        next_tx(&mut scenario, EMPLOYEE_1);
        {
            let clock = clock::create_for_testing(ctx(&mut scenario));
            employee_wallet::create_wallet(TEST_ORG, clock::timestamp_ms(&clock), ctx(&mut scenario));
            clock::destroy_for_testing(clock);
        };
        
        next_tx(&mut scenario, ORG_ADMIN);
        {
            let mut wallet = test::take_from_address<EmployeeWallet>(&scenario, EMPLOYEE_1);
            let clock = clock::create_for_testing(ctx(&mut scenario));
            let deposit_coin = coin::mint_for_testing<SUI>(500, ctx(&mut scenario));
            employee_wallet::deposit(&mut wallet, deposit_coin, clock::timestamp_ms(&clock));
            clock::destroy_for_testing(clock);
            test::return_to_address(EMPLOYEE_1, wallet);
        };
        
        // Try to withdraw more than balance
        next_tx(&mut scenario, EMPLOYEE_1);
        {
            let mut wallet = test::take_from_sender<EmployeeWallet>(&scenario);
            let clock = clock::create_for_testing(ctx(&mut scenario));
            employee_wallet::withdraw(&mut wallet, 1000, clock::timestamp_ms(&clock), ctx(&mut scenario));
            clock::destroy_for_testing(clock);
            test::return_to_sender(&scenario, wallet);
        };
        
        test::end(scenario);
    }

    #[test]
    fun test_transfer_funds() {
        let mut scenario = test::begin(DEPLOYER);
        setup_registry(&mut scenario);
        
        // Create wallets for two employees
        next_tx(&mut scenario, EMPLOYEE_1);
        {
            let clock = clock::create_for_testing(ctx(&mut scenario));
            employee_wallet::create_wallet(TEST_ORG, clock::timestamp_ms(&clock), ctx(&mut scenario));
            clock::destroy_for_testing(clock);
        };
        
        next_tx(&mut scenario, EMPLOYEE_2);
        {
            let clock = clock::create_for_testing(ctx(&mut scenario));
            employee_wallet::create_wallet(TEST_ORG, clock::timestamp_ms(&clock), ctx(&mut scenario));
            clock::destroy_for_testing(clock);
        };
        
        // Deposit to employee 1
        next_tx(&mut scenario, ORG_ADMIN);
        {
            let mut wallet = test::take_from_address<EmployeeWallet>(&scenario, EMPLOYEE_1);
            let clock = clock::create_for_testing(ctx(&mut scenario));
            let deposit_coin = coin::mint_for_testing<SUI>(1000, ctx(&mut scenario));
            employee_wallet::deposit(&mut wallet, deposit_coin, clock::timestamp_ms(&clock));
            clock::destroy_for_testing(clock);
            test::return_to_address(EMPLOYEE_1, wallet);
        };
        
        // Transfer from employee 1 to employee 2
        next_tx(&mut scenario, EMPLOYEE_1);
        {
            let mut from_wallet = test::take_from_sender<EmployeeWallet>(&scenario);
            let mut to_wallet = test::take_from_address<EmployeeWallet>(&scenario, EMPLOYEE_2);
            let clock = clock::create_for_testing(ctx(&mut scenario));
            
            employee_wallet::transfer_funds(
                &mut from_wallet,
                &mut to_wallet,
                300,
                clock::timestamp_ms(&clock),
                ctx(&mut scenario)
            );
            
            assert!(employee_wallet::get_balance(&from_wallet) == 700, 0);
            assert!(employee_wallet::get_balance(&to_wallet) == 300, 1);
            assert!(employee_wallet::get_total_withdrawn(&from_wallet) == 300, 2);
            assert!(employee_wallet::get_total_deposited(&to_wallet) == 300, 3);
            
            clock::destroy_for_testing(clock);
            test::return_to_sender(&scenario, from_wallet);
            test::return_to_address(EMPLOYEE_2, to_wallet);
        };
        
        test::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = employee_wallet::E_INSUFFICIENT_BALANCE)]
    fun test_transfer_insufficient_balance() {
        let mut scenario = test::begin(DEPLOYER);
        setup_registry(&mut scenario);
        
        next_tx(&mut scenario, EMPLOYEE_1);
        {
            let clock = clock::create_for_testing(ctx(&mut scenario));
            employee_wallet::create_wallet(TEST_ORG, clock::timestamp_ms(&clock), ctx(&mut scenario));
            clock::destroy_for_testing(clock);
        };
        
        next_tx(&mut scenario, EMPLOYEE_2);
        {
            let clock = clock::create_for_testing(ctx(&mut scenario));
            employee_wallet::create_wallet(TEST_ORG, clock::timestamp_ms(&clock), ctx(&mut scenario));
            clock::destroy_for_testing(clock);
        };
        
        next_tx(&mut scenario, ORG_ADMIN);
        {
            let mut wallet = test::take_from_address<EmployeeWallet>(&scenario, EMPLOYEE_1);
            let clock = clock::create_for_testing(ctx(&mut scenario));
            let deposit_coin = coin::mint_for_testing<SUI>(100, ctx(&mut scenario));
            employee_wallet::deposit(&mut wallet, deposit_coin, clock::timestamp_ms(&clock));
            clock::destroy_for_testing(clock);
            test::return_to_address(EMPLOYEE_1, wallet);
        };
        
        // Try to transfer more than balance
        next_tx(&mut scenario, EMPLOYEE_1);
        {
            let mut from_wallet = test::take_from_sender<EmployeeWallet>(&scenario);
            let mut to_wallet = test::take_from_address<EmployeeWallet>(&scenario, EMPLOYEE_2);
            let clock = clock::create_for_testing(ctx(&mut scenario));
            
            employee_wallet::transfer_funds(&mut from_wallet, &mut to_wallet, 500, clock::timestamp_ms(&clock), ctx(&mut scenario));
            
            clock::destroy_for_testing(clock);
            test::return_to_sender(&scenario, from_wallet);
            test::return_to_address(EMPLOYEE_2, to_wallet);
        };
        
        test::end(scenario);
    }
}
