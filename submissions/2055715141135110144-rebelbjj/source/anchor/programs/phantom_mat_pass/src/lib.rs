use anchor_lang::prelude::*;

declare_id!("4KQQWk1TyeEsZSWJ98eCqPJet951Hjia1cQSFxi7DcWr");

pub const TREASURY_SEED: &[u8] = b"treasury";
pub const USER_PROFILE_SEED: &[u8] = b"user-profile";
pub const MATCH_RECORD_SEED: &[u8] = b"match-record";
pub const MEETING_ORDER_SEED: &[u8] = b"meeting-order";

#[program]
pub mod phantom_mat_pass {
    use super::*;

    pub fn initialize_platform(
        ctx: Context<InitializePlatform>,
        fee_bps: u16,
        subscription_fee_lamports: u64,
        match_fee_lamports: u64,
    ) -> Result<()> {
        require!(fee_bps <= 10_000, HackathonError::FeeBpsTooHigh);

        let now = Clock::get()?.unix_timestamp;
        let treasury = &mut ctx.accounts.treasury;
        treasury.authority = ctx.accounts.authority.key();
        treasury.fee_bps = fee_bps;
        treasury.subscription_fee_lamports = subscription_fee_lamports;
        treasury.match_fee_lamports = match_fee_lamports;
        treasury.accrued_fees = 0;
        treasury.initialized_at = now;
        treasury.updated_at = now;
        treasury.bump = ctx.bumps.treasury;

        emit!(PlatformInitialized {
            authority: treasury.authority,
            fee_bps,
            subscription_fee_lamports,
            match_fee_lamports,
            timestamp: now,
        });

        Ok(())
    }

    pub fn register_user(
        ctx: Context<RegisterUser>,
        profile_hash: [u8; 32],
        agent_pubkey: Pubkey,
        subscription_lamports: u64,
    ) -> Result<()> {
        require!(agent_pubkey != Pubkey::default(), HackathonError::InvalidAgentPubkey);
        require!(
            subscription_lamports >= ctx.accounts.treasury.subscription_fee_lamports,
            HackathonError::SubscriptionFeeTooLow
        );

        let now = Clock::get()?.unix_timestamp;
        let treasury_info = ctx.accounts.treasury.to_account_info();
        transfer_lamports(
            ctx.accounts.authority.to_account_info(),
            treasury_info,
            subscription_lamports,
            ctx.accounts.system_program.to_account_info(),
        )?;

        let user_profile = &mut ctx.accounts.user_profile;
        user_profile.authority = ctx.accounts.authority.key();
        user_profile.agent_pubkey = agent_pubkey;
        user_profile.profile_hash = profile_hash;
        user_profile.subscription_locked_lamports = subscription_lamports;
        user_profile.total_matches = 0;
        user_profile.successful_matches = 0;
        user_profile.created_at = now;
        user_profile.updated_at = now;
        user_profile.bump = ctx.bumps.user_profile;

        let treasury = &mut ctx.accounts.treasury;
        treasury.accrued_fees = treasury
            .accrued_fees
            .checked_add(subscription_lamports)
            .ok_or(HackathonError::MathOverflow)?;
        treasury.updated_at = now;

        emit!(UserRegistered {
            authority: user_profile.authority,
            agent_pubkey,
            profile_hash,
            subscription_lamports,
            timestamp: now,
        });

        Ok(())
    }

    pub fn record_match(
        ctx: Context<RecordMatch>,
        match_id: [u8; 32],
        counterparty_agent: Pubkey,
        match_value: u64,
        success: bool,
        settlement_lamports: u64,
    ) -> Result<()> {
        require!(
            counterparty_agent != Pubkey::default(),
            HackathonError::InvalidAgentPubkey
        );
        require!(match_value > 0, HackathonError::InvalidMatchValue);
        require!(
            settlement_lamports >= ctx.accounts.treasury.match_fee_lamports,
            HackathonError::SettlementTooLow
        );

        let now = Clock::get()?.unix_timestamp;
        let user_profile_key = ctx.accounts.user_profile.key();
        let agent_a = ctx.accounts.user_profile.agent_pubkey;
        let treasury_info = ctx.accounts.treasury.to_account_info();
        transfer_lamports(
            ctx.accounts.authority.to_account_info(),
            treasury_info,
            settlement_lamports,
            ctx.accounts.system_program.to_account_info(),
        )?;

        let user_profile = &mut ctx.accounts.user_profile;
        user_profile.total_matches = user_profile
            .total_matches
            .checked_add(1)
            .ok_or(HackathonError::MathOverflow)?;
        if success {
            user_profile.successful_matches = user_profile
                .successful_matches
                .checked_add(1)
                .ok_or(HackathonError::MathOverflow)?;
        }
        user_profile.updated_at = now;

        let match_record = &mut ctx.accounts.match_record;
        match_record.match_id = match_id;
        match_record.user_profile = user_profile_key;
        match_record.agent_a = agent_a;
        match_record.agent_b = counterparty_agent;
        match_record.match_value = match_value;
        match_record.settlement_lamports = settlement_lamports;
        match_record.success = success;
        match_record.recorded_at = now;
        match_record.updated_at = now;
        match_record.bump = ctx.bumps.match_record;

        let treasury = &mut ctx.accounts.treasury;
        treasury.accrued_fees = treasury
            .accrued_fees
            .checked_add(settlement_lamports)
            .ok_or(HackathonError::MathOverflow)?;
        treasury.updated_at = now;

        emit!(MatchRecorded {
            user_profile: user_profile_key,
            agent_a,
            agent_b: counterparty_agent,
            match_id,
            match_value,
            success,
            settlement_lamports,
            timestamp: now,
        });

        Ok(())
    }

    pub fn open_meeting_order(
        ctx: Context<OpenMeetingOrder>,
        order_id: [u8; 32],
        counterparty_agent: Pubkey,
        package_type: PackageType,
        payment_lamports: u64,
    ) -> Result<()> {
        require!(payment_lamports > 0, HackathonError::InvalidPaymentAmount);
        require!(
            counterparty_agent != Pubkey::default(),
            HackathonError::InvalidAgentPubkey
        );
        require!(
            counterparty_agent != ctx.accounts.initiator.key(),
            HackathonError::InvalidCounterparty
        );

        let now = Clock::get()?.unix_timestamp;
        let meeting_order = &mut ctx.accounts.meeting_order;
        meeting_order.order_id = order_id;
        meeting_order.initiator_agent = ctx.accounts.initiator.key();
        meeting_order.counterparty_agent = counterparty_agent;
        meeting_order.package_type = package_type;
        meeting_order.payment_lamports = payment_lamports;
        meeting_order.released_lamports = 0;
        meeting_order.fee_lamports = 0;
        meeting_order.initiator_confirmed = true;
        meeting_order.counterparty_confirmed = false;
        meeting_order.status = MeetingStatus::Pending;
        meeting_order.created_at = now;
        meeting_order.updated_at = now;
        meeting_order.bump = ctx.bumps.meeting_order;

        transfer_lamports(
            ctx.accounts.initiator.to_account_info(),
            ctx.accounts.meeting_order.to_account_info(),
            payment_lamports,
            ctx.accounts.system_program.to_account_info(),
        )?;

        emit!(MeetingOrderOpened {
            order_id,
            initiator_agent: meeting_order.initiator_agent,
            counterparty_agent,
            package_type,
            payment_lamports,
            timestamp: now,
        });

        Ok(())
    }

    pub fn confirm_meeting(ctx: Context<ConfirmMeeting>) -> Result<()> {
        require!(
            ctx.accounts.meeting_order.status == MeetingStatus::Pending,
            HackathonError::MeetingAlreadySettled
        );
        require!(
            ctx.accounts.counterparty.key() == ctx.accounts.meeting_order.counterparty_agent,
            HackathonError::InvalidCounterparty
        );

        let now = Clock::get()?.unix_timestamp;
        let order_id = ctx.accounts.meeting_order.order_id;
        let order_bump = ctx.accounts.meeting_order.bump;
        let meeting_order_info = ctx.accounts.meeting_order.to_account_info();
        let treasury_info = ctx.accounts.treasury.to_account_info();
        let counterparty_info = ctx.accounts.counterparty.to_account_info();

        let meeting_order = &mut ctx.accounts.meeting_order;
        meeting_order.counterparty_confirmed = true;

        let fee = meeting_order
            .payment_lamports
            .checked_mul(ctx.accounts.treasury.fee_bps as u64)
            .ok_or(HackathonError::MathOverflow)?
            / 10_000;
        let payout = meeting_order
            .payment_lamports
            .checked_sub(fee)
            .ok_or(HackathonError::MathOverflow)?;
        require!(payout > 0, HackathonError::InvalidPaymentAmount);

        let order_bump_seed = [order_bump];
        let order_seeds = [MEETING_ORDER_SEED, order_id.as_ref(), &order_bump_seed];
        let signer_seeds = &[&order_seeds[..]];

        if fee > 0 {
            transfer_lamports_signed(
                meeting_order_info.clone(),
                treasury_info,
                fee,
                ctx.accounts.system_program.to_account_info(),
                signer_seeds,
            )?;

            ctx.accounts.treasury.accrued_fees = ctx
                .accounts
                .treasury
                .accrued_fees
                .checked_add(fee)
                .ok_or(HackathonError::MathOverflow)?;
        }

        transfer_lamports_signed(
            meeting_order_info,
            counterparty_info,
            payout,
            ctx.accounts.system_program.to_account_info(),
            signer_seeds,
        )?;

        meeting_order.fee_lamports = fee;
        meeting_order.released_lamports = payout;
        meeting_order.status = MeetingStatus::Settled;
        meeting_order.updated_at = now;
        ctx.accounts.treasury.updated_at = now;

        emit!(MeetingConfirmed {
            order_id,
            initiator_agent: meeting_order.initiator_agent,
            counterparty_agent: meeting_order.counterparty_agent,
            package_type: meeting_order.package_type,
            payment_lamports: meeting_order.payment_lamports,
            fee_lamports: fee,
            released_lamports: payout,
            timestamp: now,
        });

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount_lamports: u64) -> Result<()> {
        require!(amount_lamports > 0, HackathonError::InvalidWithdrawalAmount);
        require!(
            ctx.accounts.treasury.accrued_fees >= amount_lamports,
            HackathonError::InsufficientTreasuryBalance
        );

        let now = Clock::get()?.unix_timestamp;
        let treasury_bump = ctx.accounts.treasury.bump;
        let treasury_info = ctx.accounts.treasury.to_account_info();
        let authority_info = ctx.accounts.authority.to_account_info();
        let treasury_bump_seed = [treasury_bump];
        let treasury_seeds = [TREASURY_SEED, &treasury_bump_seed];
        let signer_seeds = &[&treasury_seeds[..]];

        transfer_lamports_signed(
            treasury_info,
            authority_info,
            amount_lamports,
            ctx.accounts.system_program.to_account_info(),
            signer_seeds,
        )?;

        let treasury = &mut ctx.accounts.treasury;
        treasury.accrued_fees = treasury
            .accrued_fees
            .checked_sub(amount_lamports)
            .ok_or(HackathonError::MathOverflow)?;
        treasury.updated_at = now;

        emit!(FeesWithdrawn {
            authority: ctx.accounts.authority.key(),
            amount_lamports,
            timestamp: now,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = PlatformTreasury::SPACE,
        seeds = [TREASURY_SEED],
        bump
    )]
    pub treasury: Account<'info, PlatformTreasury>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterUser<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = UserProfile::SPACE,
        seeds = [USER_PROFILE_SEED, authority.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,
    #[account(mut, seeds = [TREASURY_SEED], bump = treasury.bump)]
    pub treasury: Account<'info, PlatformTreasury>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(match_id: [u8; 32])]
pub struct RecordMatch<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        seeds = [USER_PROFILE_SEED, authority.key().as_ref()],
        bump = user_profile.bump,
        has_one = authority
    )]
    pub user_profile: Account<'info, UserProfile>,
    #[account(
        init,
        payer = authority,
        space = MatchRecord::SPACE,
        seeds = [MATCH_RECORD_SEED, user_profile.key().as_ref(), match_id.as_ref()],
        bump
    )]
    pub match_record: Account<'info, MatchRecord>,
    #[account(mut, seeds = [TREASURY_SEED], bump = treasury.bump)]
    pub treasury: Account<'info, PlatformTreasury>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(order_id: [u8; 32])]
pub struct OpenMeetingOrder<'info> {
    #[account(mut)]
    pub initiator: Signer<'info>,
    #[account(
        init,
        payer = initiator,
        space = MeetingOrder::SPACE,
        seeds = [MEETING_ORDER_SEED, order_id.as_ref()],
        bump
    )]
    pub meeting_order: Account<'info, MeetingOrder>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ConfirmMeeting<'info> {
    #[account(
        mut,
        seeds = [MEETING_ORDER_SEED, meeting_order.order_id.as_ref()],
        bump = meeting_order.bump
    )]
    pub meeting_order: Account<'info, MeetingOrder>,
    #[account(mut, address = meeting_order.counterparty_agent)]
    pub counterparty: Signer<'info>,
    #[account(mut, seeds = [TREASURY_SEED], bump = treasury.bump)]
    pub treasury: Account<'info, PlatformTreasury>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut, seeds = [TREASURY_SEED], bump = treasury.bump, has_one = authority)]
    pub treasury: Account<'info, PlatformTreasury>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct PlatformTreasury {
    pub authority: Pubkey,
    pub fee_bps: u16,
    pub subscription_fee_lamports: u64,
    pub match_fee_lamports: u64,
    pub accrued_fees: u64,
    pub initialized_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

impl PlatformTreasury {
    pub const SPACE: usize = 8 + 128;
}

#[account]
pub struct UserProfile {
    pub authority: Pubkey,
    pub agent_pubkey: Pubkey,
    pub profile_hash: [u8; 32],
    pub subscription_locked_lamports: u64,
    pub total_matches: u64,
    pub successful_matches: u64,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

impl UserProfile {
    pub const SPACE: usize = 8 + 256;
}

#[account]
pub struct MatchRecord {
    pub match_id: [u8; 32],
    pub user_profile: Pubkey,
    pub agent_a: Pubkey,
    pub agent_b: Pubkey,
    pub match_value: u64,
    pub settlement_lamports: u64,
    pub success: bool,
    pub recorded_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

impl MatchRecord {
    pub const SPACE: usize = 8 + 256;
}

#[account]
pub struct MeetingOrder {
    pub order_id: [u8; 32],
    pub initiator_agent: Pubkey,
    pub counterparty_agent: Pubkey,
    pub package_type: PackageType,
    pub payment_lamports: u64,
    pub released_lamports: u64,
    pub fee_lamports: u64,
    pub initiator_confirmed: bool,
    pub counterparty_confirmed: bool,
    pub status: MeetingStatus,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

impl MeetingOrder {
    pub const SPACE: usize = 8 + 256;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum PackageType {
    Starter,
    Pro,
    Premium,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum MeetingStatus {
    Pending,
    Settled,
    Cancelled,
}

#[event]
pub struct PlatformInitialized {
    pub authority: Pubkey,
    pub fee_bps: u16,
    pub subscription_fee_lamports: u64,
    pub match_fee_lamports: u64,
    pub timestamp: i64,
}

#[event]
pub struct UserRegistered {
    pub authority: Pubkey,
    pub agent_pubkey: Pubkey,
    pub profile_hash: [u8; 32],
    pub subscription_lamports: u64,
    pub timestamp: i64,
}

#[event]
pub struct MatchRecorded {
    pub user_profile: Pubkey,
    pub agent_a: Pubkey,
    pub agent_b: Pubkey,
    pub match_id: [u8; 32],
    pub match_value: u64,
    pub success: bool,
    pub settlement_lamports: u64,
    pub timestamp: i64,
}

#[event]
pub struct MeetingOrderOpened {
    pub order_id: [u8; 32],
    pub initiator_agent: Pubkey,
    pub counterparty_agent: Pubkey,
    pub package_type: PackageType,
    pub payment_lamports: u64,
    pub timestamp: i64,
}

#[event]
pub struct MeetingConfirmed {
    pub order_id: [u8; 32],
    pub initiator_agent: Pubkey,
    pub counterparty_agent: Pubkey,
    pub package_type: PackageType,
    pub payment_lamports: u64,
    pub fee_lamports: u64,
    pub released_lamports: u64,
    pub timestamp: i64,
}

#[event]
pub struct FeesWithdrawn {
    pub authority: Pubkey,
    pub amount_lamports: u64,
    pub timestamp: i64,
}

#[error_code]
pub enum HackathonError {
    #[msg("fee_bps cannot exceed 10000")]
    FeeBpsTooHigh,
    #[msg("subscription fee is too low")]
    SubscriptionFeeTooLow,
    #[msg("match settlement is too low")]
    SettlementTooLow,
    #[msg("match value must be greater than zero")]
    InvalidMatchValue,
    #[msg("payment amount must be greater than zero")]
    InvalidPaymentAmount,
    #[msg("withdrawal amount must be greater than zero")]
    InvalidWithdrawalAmount,
    #[msg("counterparty agent is invalid")]
    InvalidCounterparty,
    #[msg("agent pubkey is invalid")]
    InvalidAgentPubkey,
    #[msg("treasury does not have enough withdrawable fees")]
    InsufficientTreasuryBalance,
    #[msg("meeting order already settled")]
    MeetingAlreadySettled,
    #[msg("math overflow")]
    MathOverflow,
    #[msg("unauthorized")]
    Unauthorized,
}

fn transfer_lamports<'info>(
    from: AccountInfo<'info>,
    to: AccountInfo<'info>,
    amount: u64,
    system_program: AccountInfo<'info>,
) -> Result<()> {
    let cpi_accounts = anchor_lang::system_program::Transfer { from, to };
    let cpi_ctx = CpiContext::new(system_program, cpi_accounts);
    anchor_lang::system_program::transfer(cpi_ctx, amount)
}

fn transfer_lamports_signed<'info>(
    from: AccountInfo<'info>,
    to: AccountInfo<'info>,
    amount: u64,
    system_program: AccountInfo<'info>,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    let cpi_accounts = anchor_lang::system_program::Transfer { from, to };
    let cpi_ctx = CpiContext::new_with_signer(system_program, cpi_accounts, signer_seeds);
    anchor_lang::system_program::transfer(cpi_ctx, amount)
}
