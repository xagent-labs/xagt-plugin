# Production Deployment Guide - v0.7.8

## Pre-Deployment Checklist

✅ PR #106 merged to master
✅ Release v0.7.8 created on GitHub
✅ All CI checks passing
✅ All Bugbot reviews resolved

## Deployment Instructions

### Option 1: Direct Deployment (Recommended for VPS/Bare Metal)

```bash
# SSH into your production server
ssh user@your-production-server

# Navigate to sandboxed.sh directory
cd /path/to/sandboxed.sh

# Pull latest changes
git fetch origin
git checkout v0.7.8

# Build release version
cargo build --release

# Stop current instance (if running)
pkill -f sandboxed_sh

# Start with nohup
nohup ./target/release/sandboxed_sh > logs/sandboxed_$(date +%Y%m%d_%H%M%S).log 2>&1 &

# Save PID for later management
echo $! > sandboxed.pid

# Verify it's running
ps -p $(cat sandboxed.pid)
tail -f logs/sandboxed_*.log
```

### Option 2: Systemd Service (Recommended for Production)

Create `/etc/systemd/system/sandboxed-sh.service`:

```ini
[Unit]
Description=Sandboxed.sh Agent Orchestrator
After=network.target

[Service]
Type=simple
User=sandboxed
WorkingDirectory=/path/to/sandboxed.sh
ExecStart=/path/to/sandboxed.sh/target/release/sandboxed_sh
Restart=always
RestartSec=10
StandardOutput=append:/var/log/sandboxed-sh/output.log
StandardError=append:/var/log/sandboxed-sh/error.log

[Install]
WantedBy=multi-user.target
```

Deploy:

```bash
# Pull and build
git fetch origin
git checkout v0.7.8
cargo build --release

# Reload systemd and restart
sudo systemctl daemon-reload
sudo systemctl restart sandboxed-sh
sudo systemctl status sandboxed-sh

# Check logs
sudo journalctl -u sandboxed-sh -f
```

### Option 3: Docker Deployment

```bash
# Pull latest image
docker pull ghcr.io/th0rgal/sandboxed-sh:v0.7.8

# Stop and remove old container
docker stop sandboxed-sh
docker rm sandboxed-sh

# Run new version
docker run -d \
  --name sandboxed-sh \
  --restart unless-stopped \
  -p 3000:3000 \
  -v /path/to/data:/data \
  -v /path/to/config:/config \
  ghcr.io/th0rgal/sandboxed-sh:v0.7.8

# Check logs
docker logs -f sandboxed-sh
```

## Post-Deployment Verification

```bash
# 1. Check process is running
ps aux | grep sandboxed_sh

# 2. Check port is listening
netstat -tulpn | grep 3000

# 3. Health check endpoint
curl http://localhost:3000/health

# 4. Check logs for errors
tail -n 100 logs/sandboxed_*.log

# 5. Verify version
curl http://localhost:3000/api/version
```

## Rollback Instructions

If issues are encountered:

```bash
# Stop current version
pkill -f sandboxed_sh
# OR
sudo systemctl stop sandboxed-sh

# Checkout previous version
git checkout v0.7.7

# Rebuild
cargo build --release

# Restart
nohup ./target/release/sandboxed_sh > logs/sandboxed_rollback_$(date +%Y%m%d_%H%M%S).log 2>&1 &
# OR
sudo systemctl start sandboxed-sh
```

## Key Changes in v0.7.8

1. **Event Sequencing Fix**: Per-mission atomic counters eliminate race conditions
2. **OAuth Refresh Lock**: Prevents concurrent token rotation conflicts
3. **Model Override Support**: New backend-aware model selection
4. **UX Improvements**: iOS layout, thinking panel toggle, automation fixes

## Monitoring

After deployment, monitor:

- Memory usage: `scripts/check-memory.sh`
- CPU usage: `top -p $(cat sandboxed.pid)`
- Disk I/O: `iostat -x 5`
- Logs: `tail -f logs/sandboxed_*.log`
- OAuth token refresh: Look for "OAuth token refresher" in logs
- Event sequencing: Check mission event order is chronological

## Support

- GitHub Issues: https://github.com/Th0rgal/sandboxed.sh/issues
- Release Notes: https://github.com/Th0rgal/sandboxed.sh/releases/tag/v0.7.8
- Documentation: https://github.com/Th0rgal/sandboxed.sh/blob/master/docs/

---

**Deployed by**: Claude Sonnet 4.5
**Deployment Date**: 2026-02-14
**Version**: v0.7.8
