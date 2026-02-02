#[allow(lint(public_entry))]
module contracts::employee_wallet {
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::event;
    use sui::object::{Self, UID};
    use sui::sui::SUI;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    const E_WALLET_EXISTS: u64 = 0;
    const E_WALLET_MISSING: u64 = 1;
    const E_INSUFFICIENT_BALANCE: u64 = 2;
    const E_UNAUTHORIZED: u64 = 3;
    const E_INVALID_AMOUNT: u64 = 4;

    /// Shared wallet registry that tracks all employee wallets
    public struct WalletRegistry has key {
        id: UID,
    }

    /// Employee wallet owned by individual employees
    public struct EmployeeWallet has key, store {
        id: UID,
        owner: address,
        organization: address,
        balance: Balance<SUI>,
        total_deposited: u64,
        total_withdrawn: u64,
        created_at_ms: u64,
    }

    /// Event emitted when a wallet is created
    public struct WalletCreated has copy, drop {
        wallet_id: address,
        owner: address,
        organization: address,
        timestamp_ms: u64,
    }

    /// Event emitted when funds are deposited
    public struct FundsDeposited has copy, drop {
        wallet_id: address,
        owner: address,
        amount: u64,
        new_balance: u64,
        timestamp_ms: u64,
    }

    /// Event emitted when funds are withdrawn
    public struct FundsWithdrawn has copy, drop {
        wallet_id: address,
        owner: address,
        amount: u64,
        new_balance: u64,
        timestamp_ms: u64,
    }

    /// Event emitted when funds are transferred between wallets
    public struct FundsTransferred has copy, drop {
        from_wallet: address,
        to_wallet: address,
        amount: u64,
        timestamp_ms: u64,
    }

    /// Initialize the wallet registry (called once during deployment)
    public entry fun init_registry(ctx: &mut TxContext) {
        let registry = WalletRegistry {
            id: object::new(ctx),
        };
        transfer::share_object(registry);
    }

    /// Create a new employee wallet
    public entry fun create_wallet(
        organization: address,
        clock_ms: u64,
        ctx: &mut TxContext,
    ) {
        let owner = tx_context::sender(ctx);
        let wallet_id = object::new(ctx);
        let wallet_addr = object::uid_to_address(&wallet_id);

        let wallet = EmployeeWallet {
            id: wallet_id,
            owner,
            organization,
            balance: balance::zero<SUI>(),
            total_deposited: 0,
            total_withdrawn: 0,
            created_at_ms: clock_ms,
        };

        event::emit(WalletCreated {
            wallet_id: wallet_addr,
            owner,
            organization,
            timestamp_ms: clock_ms,
        });

        transfer::transfer(wallet, owner);
    }

    /// Deposit SUI into an employee wallet
    public entry fun deposit(
        wallet: &mut EmployeeWallet,
        coin: Coin<SUI>,
        clock_ms: u64,
    ) {
        let amount = coin::value(&coin);
        assert!(amount > 0, E_INVALID_AMOUNT);

        let coin_balance = coin::into_balance(coin);
        balance::join(&mut wallet.balance, coin_balance);

        wallet.total_deposited = wallet.total_deposited + amount;
        let new_balance = balance::value(&wallet.balance);

        event::emit(FundsDeposited {
            wallet_id: object::uid_to_address(&wallet.id),
            owner: wallet.owner,
            amount,
            new_balance,
            timestamp_ms: clock_ms,
        });
    }

    /// Withdraw SUI from an employee wallet
    public entry fun withdraw(
        wallet: &mut EmployeeWallet,
        amount: u64,
        clock_ms: u64,
        ctx: &mut TxContext,
    ) {
        let caller = tx_context::sender(ctx);
        assert!(caller == wallet.owner, E_UNAUTHORIZED);
        assert!(amount > 0, E_INVALID_AMOUNT);

        let wallet_balance = balance::value(&wallet.balance);
        assert!(wallet_balance >= amount, E_INSUFFICIENT_BALANCE);

        let withdrawn = balance::split(&mut wallet.balance, amount);
        let coin = coin::from_balance(withdrawn, ctx);

        wallet.total_withdrawn = wallet.total_withdrawn + amount;
        let new_balance = balance::value(&wallet.balance);

        event::emit(FundsWithdrawn {
            wallet_id: object::uid_to_address(&wallet.id),
            owner: wallet.owner,
            amount,
            new_balance,
            timestamp_ms: clock_ms,
        });

        transfer::public_transfer(coin, caller);
    }

    /// Transfer SUI from one employee wallet to another
    public entry fun transfer_funds(
        from_wallet: &mut EmployeeWallet,
        to_wallet: &mut EmployeeWallet,
        amount: u64,
        clock_ms: u64,
        ctx: &mut TxContext,
    ) {
        let caller = tx_context::sender(ctx);
        assert!(caller == from_wallet.owner, E_UNAUTHORIZED);
        assert!(amount > 0, E_INVALID_AMOUNT);

        let from_balance = balance::value(&from_wallet.balance);
        assert!(from_balance >= amount, E_INSUFFICIENT_BALANCE);

        let transferred = balance::split(&mut from_wallet.balance, amount);
        balance::join(&mut to_wallet.balance, transferred);

        from_wallet.total_withdrawn = from_wallet.total_withdrawn + amount;
        to_wallet.total_deposited = to_wallet.total_deposited + amount;

        event::emit(FundsTransferred {
            from_wallet: object::uid_to_address(&from_wallet.id),
            to_wallet: object::uid_to_address(&to_wallet.id),
            amount,
            timestamp_ms: clock_ms,
        });
    }

    /// Get wallet balance
    public fun get_balance(wallet: &EmployeeWallet): u64 {
        balance::value(&wallet.balance)
    }

    /// Get wallet owner
    public fun get_owner(wallet: &EmployeeWallet): address {
        wallet.owner
    }

    /// Get wallet organization
    public fun get_organization(wallet: &EmployeeWallet): address {
        wallet.organization
    }

    /// Get total deposited amount
    public fun get_total_deposited(wallet: &EmployeeWallet): u64 {
        wallet.total_deposited
    }

    /// Get total withdrawn amount
    public fun get_total_withdrawn(wallet: &EmployeeWallet): u64 {
        wallet.total_withdrawn
    }
}
