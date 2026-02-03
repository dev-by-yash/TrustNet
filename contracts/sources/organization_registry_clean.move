#[allow(lint(public_entry))]
module contracts::organization_registry {
    use sui::clock as clock_mod;
    use sui::clock::Clock;
    use sui::event;
    use sui::object as object_mod;
    use sui::table as table_mod;
    use sui::tx_context::TxContext;

    const E_ORG_EXISTS: u64 = 0;
    const E_ORG_MISSING: u64 = 1;
    const E_NOT_ADMIN: u64 = 2;
    const E_EMPLOYEE_EXISTS: u64 = 3;
    const E_EMPLOYEE_MISSING: u64 = 4;
    const E_EMPLOYEE_CAP: u64 = 5;
    const E_INVALID_SPEND_LIMIT: u64 = 6;
    const E_INVALID_EMPLOYEE_CAP: u64 = 7;
    const E_TREASURY_LIMIT: u64 = 8;
    const E_TREASURY_INSUFFICIENT: u64 = 9;

    public struct Registry has key {
        id: object_mod::UID,
        organizations: table_mod::Table<address, OrganizationRecord>,
    }

    public struct OrganizationRecord has store {
        name: vector<u8>,
        metadata: vector<u8>,
        admin: address,
        employees: table_mod::Table<address, EmployeeProfile>,
        employee_cap: u64,
        employee_count: u64,
        treasury: TreasuryStats,
        created_at_ms: u64,
    }

    public struct EmployeeProfile has store {
        wallet: address,
        role: vector<u8>,
        active: bool,
        last_updated_ms: u64,
    }

    public struct TreasuryStats has store {
        total_deposited: u64,
        total_withdrawn: u64,
        spend_limit: u64,
    }

    public struct OrganizationRegistered has copy, drop {
        admin: address,
        employee_cap: u64,
        spend_limit: u64,
        timestamp_ms: u64,
    }

    public struct EmployeeAdded has copy, drop {
        admin: address,
        employee: address,
        wallet: address,
        active: bool,
        timestamp_ms: u64,
    }

    public struct TreasuryUpdated has copy, drop {
        admin: address,
        total_deposited: u64,
        total_withdrawn: u64,
        timestamp_ms: u64,
    }

    /// Initializes and shares the registry object that the backend mutates.
    public entry fun init_registry(ctx: &mut TxContext) {
        let registry = Registry {
            id: object_mod::new(ctx),
            organizations: table_mod::new<address, OrganizationRecord>(ctx),
        };
        sui::transfer::share_object(registry);
    }

    public entry fun register_organization(
        registry: &mut Registry,
        name: vector<u8>,
        metadata: vector<u8>,
        employee_cap: u64,
        spend_limit: u64,
        clock_obj: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(employee_cap > 0, E_INVALID_EMPLOYEE_CAP);
        assert!(spend_limit > 0, E_INVALID_SPEND_LIMIT);

        let admin_addr = sui::tx_context::sender(ctx);
        assert!(!table_mod::contains(&registry.organizations, admin_addr), E_ORG_EXISTS);

        let ts = clock_mod::timestamp_ms(clock_obj);
        let org = OrganizationRecord {
            name,
            metadata,
            admin: admin_addr,
            employees: table_mod::new<address, EmployeeProfile>(ctx),
            employee_cap,
            employee_count: 0,
            treasury: TreasuryStats {
                total_deposited: 0,
                total_withdrawn: 0,
                spend_limit,
            },
            created_at_ms: ts,
        };
        table_mod::add(&mut registry.organizations, admin_addr, org);
        event::emit(OrganizationRegistered {
            admin: admin_addr,
            employee_cap,
            spend_limit,
            timestamp_ms: ts,
        });
    }

    public entry fun add_employee(
        registry: &mut Registry,
        org_admin: address,
        employee: address,
        wallet: address,
        role: vector<u8>,
        clock_obj: &Clock,
        ctx: &mut TxContext,
    ) {
        let org = borrow_org_mut(registry, org_admin);
        assert_admin(ctx, org);

        assert!(org.employee_count < org.employee_cap, E_EMPLOYEE_CAP);
        assert!(!table_mod::contains(&org.employees, employee), E_EMPLOYEE_EXISTS);

        let ts = clock_mod::timestamp_ms(clock_obj);
        table_mod::add(
            &mut org.employees,
            employee,
            EmployeeProfile {
                wallet,
                role,
                active: true,
                last_updated_ms: ts,
            },
        );
        org.employee_count = org.employee_count + 1;
        event::emit(EmployeeAdded {
            admin: org_admin,
            employee,
            wallet,
            active: true,
            timestamp_ms: ts,
        });
    }

    public entry fun update_employee_status(
        registry: &mut Registry,
        org_admin: address,
        employee: address,
        active: bool,
        clock_obj: &Clock,
        ctx: &mut TxContext,
    ) {
        let org = borrow_org_mut(registry, org_admin);
        assert_admin(ctx, org);

        assert!(table_mod::contains(&org.employees, employee), E_EMPLOYEE_MISSING);

        let ts = clock_mod::timestamp_ms(clock_obj);
        let profile = table_mod::borrow_mut(&mut org.employees, employee);
        profile.active = active;
        profile.last_updated_ms = ts;
        event::emit(EmployeeAdded {
            admin: org_admin,
            employee,
            wallet: profile.wallet,
            active,
            timestamp_ms: ts,
        });
    }

    public entry fun record_deposit(
        registry: &mut Registry,
        org_admin: address,
        amount: u64,
        clock_obj: &Clock,
        ctx: &mut TxContext,
    ) {
        let org = borrow_org_mut(registry, org_admin);
        assert_admin(ctx, org);

        org.treasury.total_deposited = org.treasury.total_deposited + amount;
        assert_within_limit(&org.treasury);
        emit_treasury_event(org_admin, &org.treasury, clock_obj);
    }

    public entry fun record_withdrawal(
        registry: &mut Registry,
        org_admin: address,
        amount: u64,
        clock_obj: &Clock,
        ctx: &mut TxContext,
    ) {
        let org = borrow_org_mut(registry, org_admin);
        assert_admin(ctx, org);

        let available = org.treasury.total_deposited - org.treasury.total_withdrawn;
        assert!(available >= amount, E_TREASURY_INSUFFICIENT);

        org.treasury.total_withdrawn = org.treasury.total_withdrawn + amount;
        emit_treasury_event(org_admin, &org.treasury, clock_obj);
    }

    public fun organization_exists(registry: &Registry, org_admin: address): bool {
        table_mod::contains(&registry.organizations, org_admin)
    }

    public fun get_employee_count(registry: &Registry, org_admin: address): u64 {
        let org = borrow_org(registry, org_admin);
        org.employee_count
    }

    public fun get_treasury_snapshot(registry: &Registry, org_admin: address): &TreasuryStats {
        let org = borrow_org(registry, org_admin);
        &org.treasury
    }

    fun assert_admin(ctx: &TxContext, org: &OrganizationRecord) {
        let caller_addr = sui::tx_context::sender(ctx);
        assert!(caller_addr == org.admin, E_NOT_ADMIN);
    }

    fun borrow_org_mut(registry: &mut Registry, org_admin: address): &mut OrganizationRecord {
        assert!(table_mod::contains(&registry.organizations, org_admin), E_ORG_MISSING);
        table_mod::borrow_mut(&mut registry.organizations, org_admin)
    }

    fun borrow_org(registry: &Registry, org_admin: address): &OrganizationRecord {
        assert!(table_mod::contains(&registry.organizations, org_admin), E_ORG_MISSING);
        table_mod::borrow(&registry.organizations, org_admin)
    }

    fun assert_within_limit(treasury: &TreasuryStats) {
        let available = treasury.total_deposited - treasury.total_withdrawn;
        assert!(available <= treasury.spend_limit, E_TREASURY_LIMIT);
    }

    fun emit_treasury_event(org_admin: address, treasury: &TreasuryStats, clock_obj: &Clock) {
        let ts = clock_mod::timestamp_ms(clock_obj);
        event::emit(TreasuryUpdated {
            admin: org_admin,
            total_deposited: treasury.total_deposited,
            total_withdrawn: treasury.total_withdrawn,
            timestamp_ms: ts,
        });
    }
}
