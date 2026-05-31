# Phantom Mat Pass Anchor Program

This folder contains the Rust Solana program required by the hackathon prompt.

## What it does

- `initialize_platform`: creates the treasury PDA and fee settings
- `register_user`: stores a user profile hash and agent pubkey, then locks the subscription fee
- `record_match`: writes an on-chain match settlement record and collects a small settlement
- `open_meeting_order`: opens an escrowed order, which also records the initiator side as confirmed
- `confirm_meeting`: finalizes the counterparty side and releases escrow
- `withdraw`: lets the platform authority withdraw accrued fees from the treasury PDA

## Accounts

- `PlatformTreasury`
- `UserProfile`
- `MatchRecord`
- `MeetingOrder`

## Local workflow

```bash
cd anchor
anchor build
anchor test
```

## Devnet deploy

```bash
cd anchor
anchor deploy --provider.cluster devnet
```

If you regenerate the program keypair, keep `programs/phantom_mat_pass/src/lib.rs` and `Anchor.toml` on the same program id before the final deploy.
