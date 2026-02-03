#[test_only]
module contracts::contracts_tests {
    use sui::test_scenario::{Self as test, next_tx, ctx};
    use sui::clock;
    use contracts::organization_registry::{Self as org_registry, Registry};

    const ADMIN: address = @0xAD;
    const EMPLOYEE1: address = @0xE1;
    const EMPLOYEE2: address = @0xE2;
    const DEPLOYER: address = @0xDE;

    // Test: Initialize registry
    #[test]
    fun test_init_registry() {
        let mut scenario = test::begin(DEPLOYER);
        
        // Initialize registry
        {
            org_registry::init_registry(ctx(&mut scenario));
        };
        
        // Verify registry was created and shared
        next_tx(&mut scenario, DEPLOYER);
        {
            assert!(test::has_most_recent_shared<Registry>(), 0);
        };
        
        test::end(scenario);
    }

    // Test: Register organization
    #[test]
    fun test_register_organization() {
        let mut scenario = test::begin(DEPLOYER);
        let mut clock = clock::create_for_testing(ctx(&mut scenario));
        
        // Initialize registry
        {
            org_registry::init_registry(ctx(&mut scenario));
        };
        
        // Register organization
        next_tx(&mut scenario, ADMIN);
        {
            let mut registry = test::take_shared<Registry>(&scenario);
            
            org_registry::register_organization(
                &mut registry,
                b"TechCorp",
                b"metadata",
                100, // employee_cap
                1000000, // spend_limit
                &clock,
                ctx(&mut scenario)
            );
            
            // Verify organization exists
            assert!(org_registry::organization_exists(&registry, ADMIN), 1);
            assert!(org_registry::get_employee_count(&registry, ADMIN) == 0, 2);
            
            test::return_shared(registry);
        };
        
        clock::destroy_for_testing(clock);
        test::end(scenario);
    }

    // Test: Add employee
    #[test]
    fun test_add_employee() {
        let mut scenario = test::begin(DEPLOYER);
        let mut clock = clock::create_for_testing(ctx(&mut scenario));
        
        // Initialize and register org
        {
            org_registry::init_registry(ctx(&mut scenario));
        };
        
        next_tx(&mut scenario, ADMIN);
        {
            let mut registry = test::take_shared<Registry>(&scenario);
            org_registry::register_organization(
                &mut registry,
                b"TechCorp",
                b"metadata",
                100,
                1000000,
                &clock,
                ctx(&mut scenario)
            );
            test::return_shared(registry);
        };
        
        // Add employee
        next_tx(&mut scenario, ADMIN);
        {
            let mut registry = test::take_shared<Registry>(&scenario);
            
            org_registry::add_employee(
                &mut registry,
                ADMIN,
                EMPLOYEE1,
                EMPLOYEE1,
                b"Engineer",
                &clock,
                ctx(&mut scenario)
            );
            
            // Verify employee was added
            assert!(org_registry::get_employee_count(&registry, ADMIN) == 1, 3);
            
            test::return_shared(registry);
        };
        
        clock::destroy_for_testing(clock);
        test::end(scenario);
    }

    // Test: Multiple employees
    #[test]
    fun test_multiple_employees() {
        let mut scenario = test::begin(DEPLOYER);
        let mut clock = clock::create_for_testing(ctx(&mut scenario));
        
        // Initialize
        {
            org_registry::init_registry(ctx(&mut scenario));
        };
        
        next_tx(&mut scenario, ADMIN);
        {
            let mut registry = test::take_shared<Registry>(&scenario);
            org_registry::register_organization(
                &mut registry,
                b"TechCorp",
                b"metadata",
                100,
                1000000,
                &clock,
                ctx(&mut scenario)
            );
            test::return_shared(registry);
        };
        
        // Add multiple employees
        next_tx(&mut scenario, ADMIN);
        {
            let mut registry = test::take_shared<Registry>(&scenario);
            
            org_registry::add_employee(
                &mut registry,
                ADMIN,
                EMPLOYEE1,
                EMPLOYEE1,
                b"Engineer",
                &clock,
                ctx(&mut scenario)
            );
            
            org_registry::add_employee(
                &mut registry,
                ADMIN,
                EMPLOYEE2,
                EMPLOYEE2,
                b"Designer",
                &clock,
                ctx(&mut scenario)
            );
            
            assert!(org_registry::get_employee_count(&registry, ADMIN) == 2, 4);
            
            test::return_shared(registry);
        };
        
        clock::destroy_for_testing(clock);
        test::end(scenario);
    }

    // Test: Update employee status
    #[test]
    fun test_update_employee_status() {
        let mut scenario = test::begin(DEPLOYER);
        let mut clock = clock::create_for_testing(ctx(&mut scenario));
        
        // Initialize and setup
        {
            org_registry::init_registry(ctx(&mut scenario));
        };
        
        next_tx(&mut scenario, ADMIN);
        {
            let mut registry = test::take_shared<Registry>(&scenario);
            org_registry::register_organization(
                &mut registry,
                b"TechCorp",
                b"metadata",
                100,
                1000000,
                &clock,
                ctx(&mut scenario)
            );
            test::return_shared(registry);
        };
        
        next_tx(&mut scenario, ADMIN);
        {
            let mut registry = test::take_shared<Registry>(&scenario);
            org_registry::add_employee(
                &mut registry,
                ADMIN,
                EMPLOYEE1,
                EMPLOYEE1,
                b"Engineer",
                &clock,
                ctx(&mut scenario)
            );
            test::return_shared(registry);
        };
        
        // Update status
        next_tx(&mut scenario, ADMIN);
        {
            let mut registry = test::take_shared<Registry>(&scenario);
            
            org_registry::update_employee_status(
                &mut registry,
                ADMIN,
                EMPLOYEE1,
                false, // deactivate
                &clock,
                ctx(&mut scenario)
            );
            
            test::return_shared(registry);
        };
        
        clock::destroy_for_testing(clock);
        test::end(scenario);
    }

    // Test: Fail when non-admin tries to add employee
    #[test]
    #[expected_failure(abort_code = org_registry::E_NOT_ADMIN)]
    fun test_unauthorized_add_employee() {
        let mut scenario = test::begin(DEPLOYER);
        let mut clock = clock::create_for_testing(ctx(&mut scenario));
        
        {
            org_registry::init_registry(ctx(&mut scenario));
        };
        
        next_tx(&mut scenario, ADMIN);
        {
            let mut registry = test::take_shared<Registry>(&scenario);
            org_registry::register_organization(
                &mut registry,
                b"TechCorp",
                b"metadata",
                100,
                1000000,
                &clock,
                ctx(&mut scenario)
            );
            test::return_shared(registry);
        };
        
        // Non-admin tries to add employee - should fail
        next_tx(&mut scenario, EMPLOYEE1);
        {
            let mut registry = test::take_shared<Registry>(&scenario);
            
            org_registry::add_employee(
                &mut registry,
                ADMIN,
                EMPLOYEE2,
                EMPLOYEE2,
                b"Hacker",
                &clock,
                ctx(&mut scenario)
            );
            
            test::return_shared(registry);
        };
        
        clock::destroy_for_testing(clock);
        test::end(scenario);
    }

    // Test: Fail when adding duplicate employee
    #[test]
    #[expected_failure(abort_code = org_registry::E_EMPLOYEE_EXISTS)]
    fun test_duplicate_employee() {
        let mut scenario = test::begin(DEPLOYER);
        let mut clock = clock::create_for_testing(ctx(&mut scenario));
        
        {
            org_registry::init_registry(ctx(&mut scenario));
        };
        
        next_tx(&mut scenario, ADMIN);
        {
            let mut registry = test::take_shared<Registry>(&scenario);
            org_registry::register_organization(
                &mut registry,
                b"TechCorp",
                b"metadata",
                100,
                1000000,
                &clock,
                ctx(&mut scenario)
            );
            test::return_shared(registry);
        };
        
        next_tx(&mut scenario, ADMIN);
        {
            let mut registry = test::take_shared<Registry>(&scenario);
            
            org_registry::add_employee(
                &mut registry,
                ADMIN,
                EMPLOYEE1,
                EMPLOYEE1,
                b"Engineer",
                &clock,
                ctx(&mut scenario)
            );
            
            // Try to add same employee again - should fail
            org_registry::add_employee(
                &mut registry,
                ADMIN,
                EMPLOYEE1,
                EMPLOYEE1,
                b"Engineer",
                &clock,
                ctx(&mut scenario)
            );
            
            test::return_shared(registry);
        };
        
        clock::destroy_for_testing(clock);
        test::end(scenario);
    }
}
