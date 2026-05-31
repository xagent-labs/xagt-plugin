# Pre-flight: ensure the `onchainos` engine is present and trustworthy

Run once per session before the first `onchainos` command. Do not echo routine
output; only give a brief status line on install / update / failure.

## 1. Is the binary present?

```
onchainos --version        # macOS/Linux
# Windows: & "$env:USERPROFILE\.local\bin\onchainos.exe" --version
```

- Present and prints a version → go to step 3.
- Missing → step 2.

## 2. Install (checksum-verified — never run an unverified binary)

Resolve the latest release tag:

```
curl -sSL "https://api.github.com/repos/okx/onchainos-skills/releases/latest"
```

Take `tag_name` → `LATEST_TAG`. Then download the platform binary **and** the
release's `checksums.txt`, and verify SHA256 **before** executing:

- **macOS/Linux**

  ```
  curl -sSL "https://github.com/okx/onchainos-skills/releases/download/${LATEST_TAG}/onchainos-<target>" -o ~/.local/bin/onchainos
  curl -sSL "https://github.com/okx/onchainos-skills/releases/download/${LATEST_TAG}/checksums.txt" -o /tmp/oco-sums.txt
  shasum -a 256 ~/.local/bin/onchainos    # compare to the matching line in oco-sums.txt
  chmod +x ~/.local/bin/onchainos
  ```

- **Windows (PowerShell)**

  ```powershell
  $d="$env:USERPROFILE\.local\bin"; New-Item -ItemType Directory -Force $d | Out-Null
  Invoke-WebRequest "https://github.com/okx/onchainos-skills/releases/download/${LATEST_TAG}/onchainos-x86_64-pc-windows-msvc.exe" -OutFile "$d\onchainos.exe" -UseBasicParsing
  Invoke-WebRequest "https://github.com/okx/onchainos-skills/releases/download/${LATEST_TAG}/checksums.txt" -OutFile "$env:TEMP\oco-sums.txt" -UseBasicParsing
  (Get-FileHash "$d\onchainos.exe" -Algorithm SHA256).Hash.ToLower()   # must equal the matching line
  ```

Platform targets — macOS: `aarch64-apple-darwin`, `x86_64-apple-darwin`;
Linux: `x86_64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu`;
Windows: `x86_64-pc-windows-msvc`, `i686-pc-windows-msvc`, `aarch64-pc-windows-msvc`.

**On SHA256 mismatch: delete the file and STOP. Do not run it.** A mismatch means a
corrupted or tampered download.

If the network is unreachable and a previously-verified binary already exists, a stale
binary is acceptable — continue. If it is missing and cannot be fetched, **stop** and
tell the user to install manually from https://github.com/okx/onchainos-skills.

## 3. Version-drift note

Run `onchainos --version`; compare to this plugin's `metadata.version`. If the CLI is
newer, mention once: "onchainos CLI is newer than this skill — features may have moved;
re-install skills for the latest." Then continue.

## 4. Quota / auth

The hackathon shared key is rate-limited. If a command returns `Invalid Authority` or
an over-quota notification, tell the user to create a personal key at the
[OKX Developer Portal](https://web3.okx.com/onchain-os/dev-portal) and place it in a
`.env` file — and to add `.env` to `.gitignore`. Never fabricate analysis to paper over
a failed call; mark the stage as skipped instead.
