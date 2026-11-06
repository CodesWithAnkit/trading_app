# Angel One SmartAPI Static IP Requirement and Solutions

**Date**: 2026-10-15  
**Topic**: How to achieve a verified static IP address for your deployed backend to satisfy Angel One SmartAPI regulatory rules.

---

## 1. The Core Problem

Under SEBI guidelines regarding algorithmic and automated trading by retail investors, Angel One enforces a mandatory static IPv4 allowlist for all SmartAPI applications.

When creating an application on the SmartAPI developer portal (`smartapi.angelone.in`), you must provide a primary static IPv4 address. You can register up to five static IP addresses per API key. Any request sent from an unregistered IP address receives an HTTP 403 Forbidden error (`IP not whitelisted`).

### Why Render Free Tier Cannot Meet This Directly

Render free web services send outbound traffic from a large pool of shared regional network ranges (CIDR blocks containing hundreds of rotating IP addresses). Render free instances do not have a single dedicated static outbound IP. Because Angel One only accepts individual IPv4 addresses (and rejects CIDR subnets), you cannot whitelist Render free tier shared IP ranges.

Dedicated static IPs on Render require a paid Pro workspace ($19 per month) plus instance fees.

---

## 2. Solutions Comparison

| Solution | Monthly Cost | Complexity | Reliability for WebSockets | Recommendation |
|---|---|---|---|---|
| **Oracle Cloud Always Free VM** | $0 (Free forever) | Medium (setup Ubuntu + Docker) | Highest (24/7 continuous running, no sleep) | **Top Pick (Best free cloud solution)** |
| **Home PC / Mini PC via Cloudflare Tunnel** | $0 (or ~₹200/mo ISP static IP) | Low | High (depends on home power / internet) | **Top Pick (Best for home setup)** |
| **Low Cost VPS (Hetzner / Lightsail / DigitalOcean)** | $3.50 to $5 / month (~₹300) | Low | Highest | **Best paid fallback** |
| **Render + Free Proxy (Fixie / QuotaGuard)** | Free tier capped at 500 requests | High (proxy routing in code) | Poor (500 requests exhausted in minutes) | **Not viable for trading** |

---

## 3. Recommended Solution 1: Oracle Cloud Always Free VM (100% Free Forever)

Oracle Cloud Infrastructure (OCI) offers an Always Free tier that includes:
- Up to 2 x86 compute instances or 1 to 4 ARM Ampere cores with up to 24 GB RAM
- Up to 6 **Reserved Public IPv4 addresses** at zero cost
- 200 GB of free block storage
- No idle sleep timeouts (runs 24 hours a day, 7 days a week)

### How It Works

Instead of deploying the backend to Render, you run the backend container on your Oracle Cloud Always Free virtual machine:

1. **Sign up for Oracle Cloud Always Free**:
   Register at `oracle.com/cloud/free` (requires a debit or credit card for identity verification; no charges are billed).
2. **Launch an Always Free Instance**:
   Create an Ubuntu 22.04 or 24.04 compute instance in your home region (such as Mumbai or Hyderabad for minimal latency to Indian stock exchanges).
3. **Assign a Reserved (Static) Public IP**:
   - In the OCI Console, go to **Compute** > **Instances** > click your instance.
   - Click **Attached VNICs** on the left menu, then click your primary VNIC.
   - Under **IPv4 Addresses**, click the three dots next to your public IP and select **Edit**.
   - Change the Public IP type from *Ephemeral* to **Reserved**.
   - Note this static IP address (for example, `129.154.42.10`).
4. **Whitelist on Angel One**:
   Enter that exact Reserved Public IP in the SmartAPI developer portal under Primary Static IP.
5. **Run the Backend via Docker**:
   Install Docker on the instance and run your backend container:
   ```bash
   git clone https://github.com/CodesWithAnkit/trading_app.git
   cd trading_app
   docker compose up -d
   ```
6. **Benefits**:
   - 100 percent free forever.
   - Permanent static IP that satisfies Angel One.
   - Solves the 15 minute Render sleep problem completely, keeping your WebSocket connection alive all day.

---

## 4. Recommended Solution 2: Local Hardware with Cloudflare Tunnel (100% Free or Low ISP Addon)

Many retail algorithmic traders in India run their trading engine locally on their laptop, a home desktop, or a low power mini PC / Raspberry Pi.

### How It Works

1. **Check Your Public IP**:
   Visit `ifconfig.me` or `whatismyip.com` from your home network.
   - If your ISP provides a static IP or changes it infrequently, enter that IP in the Angel One portal.
   - Most Indian fiber providers (Airtel Xstream, JioFiber, ACT Fibernet) offer a dedicated Static IPv4 addon for ₹150 to ₹250 per month on request.
2. **Expose Securely via Cloudflare Tunnel (Free)**:
   You do not need to open router ports. Install Cloudflare's free tunnel daemon (`cloudflared`) on your machine:
   ```bash
   brew install cloudflared
   cloudflared tunnel run trading-backend
   ```
   Cloudflare routes requests from your Vercel frontend (`https://your-domain.com/api/*`) through the secure tunnel directly to your local NestJS backend.
3. **Benefits**:
   - Your Angel One credentials and session tokens never leave your hardware.
   - Zero cloud hosting constraints.
   - Direct connection to Angel One with zero proxy overhead.

---

## 5. Alternative Solution: Low Cost Cloud VPS ($3.50 / month)

If you prefer not to register for Oracle Cloud and do not want to run hardware at home, a budget Linux VPS is the industry standard for retail algorithmic traders:

- **Hetzner Cloud (CX22)**: ~€3.50 per month (~₹320), includes 1 dedicated static IPv4, 2 vCPU, 4 GB RAM.
- **AWS Lightsail**: $3.50 per month (first 3 months free on AWS Free Tier), includes 1 static IPv4.
- **DigitalOcean Droplet**: $4 to $6 per month, includes 1 static IPv4.

Deploying on a VPS takes 5 minutes: install Docker, clone your repo, run `docker compose up -d`, and paste the server's static IP into the Angel One portal.

---

## 6. Primary Sources and References

- SEBI Guidelines on Algorithmic Trading Security Standards for Retail Clients.
- Angel One SmartAPI Static IP Policy and Portal Guide: `smartapi.angelone.in`.
- Render Outbound IP Address Documentation: `render.com/docs/troubleshooting-deploys#ip-addresses`.
- Oracle Cloud Infrastructure Always Free Resources Policy: `docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm`.
