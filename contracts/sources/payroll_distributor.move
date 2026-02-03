#[allow(lint(public_entry))]
module contracts::payroll_distributor {
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::event;
    use sui::object::{Self, UID};
    use sui::sui::SUI;
    use sui::table::{Self, Table};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::vec_map::{Self, VecMap};
    use contracts::employee_wallet::{Self, EmployeeWallet};

    const E_UNAUTHORIZED: u64 = 0;
    const E_INSUFFICIENT_BALANCE: u64 = 1;
    const E_INVALID_AMOUNT: u64 = 2;
    const E_EMPTY_BATCH: u64 = 3;
    const E_BATCH_TOO_LARGE: u64 = 4;
    const E_PAYROLL_NOT_FOUND: u64 = 5;

    const MAX_BATCH_SIZE: u64 = 500;

    /// Shared payroll registry that tracks all payroll runs
    public struct PayrollRegistry has key {
        id: UID,
        payroll_runs: Table<u64, PayrollRun>,
        next_run_id: u64,
    }

    /// Details of a payroll run
    public struct PayrollRun has store {
        run_id: u64,
        organization: address,
        executor: address,
        total_amount: u64,
        employee_count: u64,
        executed_at_ms: u64,
        status: u8, // 0 = pending, 1 = completed, 2 = failed
    }

    /// Payroll batch for PTB execution
    public struct PayrollBatch has key {
        id: UID,
        organization: address,
        balance: Balance<SUI>,
        recipients: VecMap<address, u64>,
        total_amount: u64,
        created_at_ms: u64,
    }

    /// Event emitted when payroll batch is created
    public struct PayrollBatchCreated has copy, drop {
        batch_id: address,
        organization: address,
        employee_count: u64,
        total_amount: u64,
        timestamp_ms: u64,
    }

    /// Event emitted when payroll is distributed to an employee
    public struct PayrollDistributed has copy, drop {
        run_id: u64,
        organization: address,
        employee: address,
        amount: u64,
        timestamp_ms: u64,
    }

    /// Event emitted when payroll run completes
    public struct PayrollRunCompleted has copy, drop {
        run_id: u64,
        organization: address,
        total_amount: u64,
        employee_count: u64,
        timestamp_ms: u64,
    }

    /// Initialize payroll registry
    public entry fun init_registry(ctx: &mut TxContext) {
        let registry = PayrollRegistry {
            id: object::new(ctx),
            payroll_runs: table::new<u64, PayrollRun>(ctx),
            next_run_id: 0,
        };
        transfer::share_object(registry);
    }

    /// Create a payroll batch for PTB execution
    public entry fun create_payroll_batch(
        organization: address,
        coin: Coin<SUI>,
        clock_ms: u64,
        ctx: &mut TxContext,
    ) {
        let caller = tx_context::sender(ctx);
        let amount = coin::value(&coin);
        assert!(amount > 0, E_INVALID_AMOUNT);

        let batch_id = object::new(ctx);
        let batch_addr = object::uid_to_address(&batch_id);

        let batch = PayrollBatch {
            id: batch_id,
            organization,
            balance: coin::into_balance(coin),
            recipients: vec_map::empty<address, u64>(),
            total_amount: 0,
            created_at_ms: clock_ms,
        };

        event::emit(PayrollBatchCreated {
            batch_id: batch_addr,
            organization,
            employee_count: 0,
            total_amount: amount,
            timestamp_ms: clock_ms,
        });

        transfer::transfer(batch, caller);
    }

    /// Add employee to payroll batch
    public entry fun add_to_batch(
        batch: &mut PayrollBatch,
        employee: address,
        amount: u64,
    ) {
        assert!(amount > 0, E_INVALID_AMOUNT);
        assert!(vec_map::size(&batch.recipients) < MAX_BATCH_SIZE, E_BATCH_TOO_LARGE);

        if (!vec_map::contains(&batch.recipients, &employee)) {
            vec_map::insert(&mut batch.recipients, employee, amount);
            batch.total_amount = batch.total_amount + amount;
        };
    }

    /// Execute payroll batch - distribute to single employee
    public entry fun execute_payroll_single(
        registry: &mut PayrollRegistry,
        batch: &mut PayrollBatch,
        wallet: &mut EmployeeWallet,
        clock_ms: u64,
        ctx: &mut TxContext,
    ) {
        let employee = employee_wallet::get_owner(wallet);
        assert!(vec_map::contains(&batch.recipients, &employee), E_PAYROLL_NOT_FOUND);

        let (_, amount) = vec_map::remove(&mut batch.recipients, &employee);
        let available = balance::value(&batch.balance);
        assert!(available >= amount, E_INSUFFICIENT_BALANCE);

        // Transfer to employee wallet
        let payment = balance::split(&mut batch.balance, amount);
        let coin = coin::from_balance(payment, ctx);
        employee_wallet::deposit(wallet, coin, clock_ms);

        // Record payroll run
        let run_id = registry.next_run_id;
        registry.next_run_id = run_id + 1;

        let run = PayrollRun {
            run_id,
            organization: batch.organization,
            executor: tx_context::sender(ctx),
            total_amount: amount,
            employee_count: 1,
            executed_at_ms: clock_ms,
            status: 1,
        };

        table::add(&mut registry.payroll_runs, run_id, run);

        event::emit(PayrollDistributed {
            run_id,
            organization: batch.organization,
            employee,
            amount,
            timestamp_ms: clock_ms,
        });

        event::emit(PayrollRunCompleted {
            run_id,
            organization: batch.organization,
            total_amount: amount,
            employee_count: 1,
            timestamp_ms: clock_ms,
        });
    }

    /// Batch execute payroll - can be called multiple times in PTB for 100+ employees
    public fun batch_execute_payroll(
        batch: &mut PayrollBatch,
        wallet: &mut EmployeeWallet,
        ctx: &mut TxContext,
    ): Coin<SUI> {
        let employee = employee_wallet::get_owner(wallet);
        assert!(vec_map::contains(&batch.recipients, &employee), E_PAYROLL_NOT_FOUND);

        let (_, amount) = vec_map::remove(&mut batch.recipients, &employee);
        let available = balance::value(&batch.balance);
        assert!(available >= amount, E_INSUFFICIENT_BALANCE);

        let payment = balance::split(&mut batch.balance, amount);
        coin::from_balance(payment, ctx)
    }

    /// Close payroll batch and return remaining funds
    public entry fun close_payroll_batch(
        batch: PayrollBatch,
        ctx: &mut TxContext,
    ) {
        let PayrollBatch {
            id,
            organization: _,
            balance,
            recipients: _,
            total_amount: _,
            created_at_ms: _,
        } = batch;

        let remaining = balance::value(&balance);
        if (remaining > 0) {
            let coin = coin::from_balance(balance, ctx);
            transfer::public_transfer(coin, tx_context::sender(ctx));
        } else {
            balance::destroy_zero(balance);
        };

        object::delete(id);
    }

    /// Get payroll run details
    public fun get_payroll_run(registry: &PayrollRegistry, run_id: u64): &PayrollRun {
        assert!(table::contains(&registry.payroll_runs, run_id), E_PAYROLL_NOT_FOUND);
        table::borrow(&registry.payroll_runs, run_id)
    }

    /// Get batch remaining balance
    public fun get_batch_balance(batch: &PayrollBatch): u64 {
        balance::value(&batch.balance)
    }

    /// Get batch recipient count
    public fun get_batch_recipient_count(batch: &PayrollBatch): u64 {
        vec_map::size(&batch.recipients)
    }

    /// Check if employee is in batch
    public fun is_employee_in_batch(batch: &PayrollBatch, employee: address): bool {
        vec_map::contains(&batch.recipients, &employee)
    }

    /// Get employee amount from batch
    public fun get_employee_amount(batch: &PayrollBatch, employee: address): u64 {
        if (vec_map::contains(&batch.recipients, &employee)) {
            *vec_map::get(&batch.recipients, &employee)
        } else {
            0
        }
    }
}
