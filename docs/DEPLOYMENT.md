# Deployment Guide

Step-by-step guide to deploy HireProxy on a fresh Ubuntu server.

## 1. Server Setup

Any VPS with a public IP works. DigitalOcean, Linode, Vultr, AWS Lightsail, etc.

```bash
# Create a droplet / instance with Ubuntu 24.04
# SSH in as root

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Verify
node --version  # v18.x+
npm --version
```

## 2. Deploy the Code

```bash
# Clone the repo
cd /opt
git clone https://github.com/PureGrain/hireproxy.git interview-bot
cd interview-bot

# Install dependencies
npm install

# Create your environment file
cp .env.example .env
nano .env
# Fill in at minimum: ANTHROPIC_API_KEY
# Set PASSPHRASE, ADMIN_KEY, and other values as needed
```

## 3. Customize the System Prompt

Edit `server.js` and replace the `SYSTEM_PROMPT` template with your actual professional background. This is the most important step — the AI will use this to answer questions about you.

## 4. Update the Frontend Passphrase

If you set a `PASSPHRASE` in `.env`, update the matching value in `public/index.html`:

```javascript
// Near the top of the <script> section
const PASSPHRASE = 'your-passphrase-here';
```

## 5. systemd Service

```bash
cat > /etc/systemd/system/interview-bot.service << 'EOF'
[Unit]
Description=HireProxy Interview Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/interview-bot
EnvironmentFile=/opt/interview-bot/.env
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable interview-bot
systemctl start interview-bot

# Check it's running
systemctl status interview-bot
journalctl -u interview-bot -f
```

## 6. Nginx Reverse Proxy

```bash
apt-get install -y nginx

cat > /etc/nginx/sites-available/interview-bot << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # SSE support — disable buffering
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 300s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/interview-bot /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

## 7. SSL with Let's Encrypt

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d your-domain.com

# Auto-renewal is set up automatically by certbot
# Test it:
certbot renew --dry-run
```

## 8. DNS

Point your domain to the server's IP:

```
Type: A
Name: hi (or @ for root domain)
Value: YOUR_SERVER_IP
TTL: 300
```

## 9. Email Channel (Optional)

To enable email interviews via Mailgun:

### Mailgun Setup

1. Create a Mailgun account at [mailgun.com](https://www.mailgun.com)
2. Add and verify your sending domain (e.g., `mail.yourdomain.com`)
3. Add the required DNS records (MX, TXT/SPF, DKIM)

### DNS Records for Mailgun

```
Type: MX    Name: mail    Value: mxa.mailgun.org       Priority: 10
Type: MX    Name: mail    Value: mxb.mailgun.org       Priority: 10
Type: TXT   Name: mail    Value: v=spf1 include:mailgun.org ~all
Type: TXT   Name: mail._domainkey    Value: (provided by Mailgun)
```

### Mailgun Webhook

In the Mailgun dashboard:
1. Go to Receiving → Create Route
2. Match: `match_recipient("interview@mail.yourdomain.com")`
3. Action: Forward to `https://your-domain.com/api/email-webhook`

### .env Configuration

```
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=mail.yourdomain.com
```

## 10. Discord Notifications (Optional)

1. In your Discord server, go to a channel's settings
2. Integrations → Webhooks → New Webhook
3. Copy the webhook URL
4. Add to `.env`:

```
DISCORD_WEBHOOK=https://discord.com/api/webhooks/YOUR_WEBHOOK_URL
```

You'll get a notification for every web chat message and email interaction, showing the question, answer, token usage, and cost.

## 11. Verify

```bash
# Health check
curl http://localhost:3000/health

# From outside
curl https://your-domain.com/health

# Check logs
journalctl -u interview-bot -f

# Check admin stats
curl "https://your-domain.com/admin/stats?key=YOUR_ADMIN_KEY"
```

## Updating

```bash
cd /opt/interview-bot
git pull
npm install
systemctl restart interview-bot
```

## Troubleshooting

**Bot won't start:** Check `journalctl -u interview-bot -f` for errors. Most common: missing `ANTHROPIC_API_KEY`.

**SSE not streaming:** Make sure the Nginx config includes `proxy_buffering off;` — without this, Nginx buffers the SSE stream and delivers it all at once.

**Email not working:** Verify Mailgun DNS records are propagated (`dig MX mail.yourdomain.com`). Check the Mailgun dashboard for delivery logs.

**Rate limited:** Default is 20 messages per minute per IP. Adjust `RATE_LIMIT_MAX` in `server.js` if needed.
