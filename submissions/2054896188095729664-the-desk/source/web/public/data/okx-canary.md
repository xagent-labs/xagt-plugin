# OKX Live Canary Evidence

Generated at: 2026-05-14T13:21:51.667Z

This canary uses safe read-only commands only. It records command availability and sanitized status, but deterministic fixtures remain the reliable review path for the demo.

## Installed Skills

- aave-v3-plugin
- meme-trench-scanner
- morpho-plugin
- okx-a2a-payment
- okx-agent-payments-protocol
- okx-agentic-wallet
- okx-audit-log
- okx-dapp-discovery
- okx-defi-invest
- okx-defi-portfolio
- okx-dex-bridge
- okx-dex-market
- okx-dex-signal
- okx-dex-strategy
- okx-dex-swap
- okx-dex-token
- okx-dex-trenches
- okx-dex-ws
- okx-growth-competition
- okx-how-to-play
- okx-onchain-gateway
- okx-security
- okx-wallet-portfolio
- okx-x402-payment
- plugin-store
- smart-money-signal-copy-trade

## Checks

### Wallet status

- Status: pass
- Exit code: 0
- Command: `onchainos wallet status`

```text
{
  "ok": true,
  "data": {
    "accountCount": 0,
    "currentAccountId": "",
    "currentAccountName": "",
    "email": "",
    "loggedIn": false
  }
}
```

### Signal chains

- Status: pass
- Exit code: 0
- Command: `onchainos signal chains`

```text
{
  "ok": true,
  "data": [
    {
      "chainIndex": "1",
      "chainLogo": "https://static.coinall.ltd/cdn/wallet/logo/ETH-20220328.png",
      "chainName": "Ethereum"
    },
    {
      "chainIndex": "196",
      "chainLogo": "https://static.coinall.ltd/cdn/wallet/logo/okb_22400.png",
      "chainName": "X Layer"
    },
    {
      "chainIndex": "501",
      "chainLogo": "https://static.coinall.ltd/cdn/wallet/logo/SOL-20220525.png",
      "chainName": "Solana"
    },
    {
      "chainIndex": "8453",
      "chainLogo": "https://static.coinall.ltd/cdn/web3/dex/market/base_v2.png",
      "chainName": "Base"
    },
    {
      "chainIndex": "56",
      "chainLogo": "https://static.coinall.ltd/cdn/web3/oklinkadmin/picture/new_bsc_chain_color.png",
      "chainName": "BNB Chain"
    }
  ]
}
```

### Meme trenches chains

- Status: pass
- Exit code: 0
- Command: `onchainos memepump chains`

```text
{
  "ok": true,
  "data": [
    {
      "chainIndex": "501",
      "chainName": "Solana",
      "protocolList": [
        {
          "protocolId": "120596",
          "protocolName": "pumpfun"
        },
        {
          "protocolId": "136266",
          "protocolName": "bonk"
        },
        {
          "protocolId": "139661",
          "protocolName": "bonkers"
        },
        {
          "protocolId": "137346",
          "protocolName": "jupStudio"
        },
        {
          "protocolId": "134788",
          "protocolName": "believe"
        },
        {
          "protocolId": "129813",
          "protocolName": "bags"
        },
        {
          "protocolId": "133933",
          "protocolName": "moonshotMoney"
        },
        {
          "protocolId": "136137",
          "protocolName": "launchlab"
        },
        {
          "protocolId": "121201",
          "protocolName": "moonshot"
        },
        {
          "protocolId": "136460",
          "protocolName": "meteoradbc"
        },
        {
          "protocolId": "139048",
          "protocolName": "mayhem"
        }
      ]
    },
    {
      "chainIndex": "56",
      "chainName": "BNB Chain",
      "protocolList": [
        {
          "protocolId": "135086",
          "protocolName": "fourmeme"
        },
        {
          "protocolId": "129826",
          "protocolName": "flap"
        }
      ]
    },
    {
      "chainIndex": "8453",
      "chainName": "Base",
      "protocolList": [
        {
          "protocolId": "130981",
          "protocolName": "clanker"
        },
        {
          "protocolId": "134522",
          "protocolName": "bankr"
        }
      ]
    },
    {
      "chainIndex": "196",
      "chainName": "X Layer",
      "protocolList": [
        {
      
```

### X Layer USDC token scan

- Status: pass
- Exit code: 0
- Command: `onchainos security token-scan --chain xlayer --address 0x74b7f16337b8972027f6196a17a631ac6de26d22`

```text
{
  "ok": true,
  "data": []
}
```

## Fallback Policy

If a command is blocked by region, quota, missing wallet login, or local CLI availability, The Desk keeps running in fixture mode and records the fallback mode in the Black Box event payload.
