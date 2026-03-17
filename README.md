# HireProxy

**An AI that interviews on your behalf.**

A hiring manager told me: *"Don't apply through LinkedIn — email me an AI endpoint I can interview."* So I built one. In a single session.

HireProxy lets you deploy a personal AI interview assistant that hiring managers can chat with to learn about your qualifications, experience, and technical thinking. You fill in your background once, and the AI handles the rest — answering questions naturally, staying on-topic, and giving hiring managers a real sense of who you are.

---

## Features

- **Web chat with SSE streaming** — real-time typing effect, not wait-for-full-response
- **Email channel** — hiring managers can email your bot and get threaded AI responses (via Mailgun)
- **Discord notifications** — get pinged every time someone interacts, with the question, answer, and cost
- **Conversation persistence** — sessions resume across page refreshes via localStorage + server-side SQLite
- **Passphrase gate** — control who can access the bot with a simple access code
- **Rate limiting** — per-IP throttling + global message cap to control costs
- **Cost tracking** — every message logs input/output tokens and estimated cost
- **Public stats page** — `/stats` shows live metrics (message count, token usage, API cost)
- **Admin endpoint** — full conversation history, visitor sessions, event log (key-protected)
- **Prompt injection defense** — system prompt includes explicit boundaries against jailbreaks
- **Session message limit** — configurable per-visitor cap to prevent runaway conversations
- **Zero dependencies on the frontend** — vanilla HTML/CSS/JS, no build step

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Nginx (SSL)                         │
│               Let's Encrypt + Certbot                   │
└──────────────────────┬──────────────────────────────────┘
                       │ reverse proxy :443 → :3000
┌──────────────────────▼──────────────────────────────────┐
│                  Node.js HTTP Server                     │
│                                                          │
│  ┌──────────┐  ┌──────────┐  ┌─────────────────────┐   │
│  │ /api/chat │  │ /api/    │  │ /admin/stats        │   │
│  │ (SSE)    │  │ email-   │  │ (key-protected)     │   │
│  │          │  │ webhook  │  │                     │   │
│  └────┬─────┘  └────┬─────┘  └─────────────────────┘   │
│       │              │                                   │
│  ┌────▼──────────────▼──────┐  ┌────────────────────┐   │
│  │   Claude API (Sonnet 4)  │  │  SQLite Database    │   │
│  │   System Prompt = Resume │  │  chat_log, sessions │   │
│  └──────────────────────────┘  │  conversations,     │   │
│                                │  email_conversations│   │
│  ┌──────────────────────────┐  │  events             │   │
│  │  Mailgun API (replies)   │  └────────────────────┘   │
│  └──────────────────────────┘                           │
│  ┌──────────────────────────┐                           │
│  │  Discord Webhook (alerts)│                           │
│  └──────────────────────────┘                           │
└─────────────────────────────────────────────────────────┘
```

## Tech Stack

| Component | Choice | Why |
|-----------|--------|-----|
| Runtime | Node.js | Fast, single-threaded, perfect for I/O-bound chat |
| AI | Claude Sonnet 4 (Anthropic API) | Best quality-to-cost ratio for conversational AI |
| Database | SQLite (better-sqlite3) | Zero-config, single-file, no external service |
| Frontend | Vanilla HTML/CSS/JS | No build step, no framework overhead, deploys instantly |
| Email | Mailgun | Reliable inbound/outbound with webhook support |
| Notifications | Discord webhooks | Free, real-time, already where developers hang out |
| SSL | Let's Encrypt + Certbot | Free, automated certificate renewal |
| Proxy | Nginx | Battle-tested reverse proxy, handles SSL termination |
| Process | systemd | Native Linux service management, auto-restart |

## Quick Start

### Prerequisites
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)
- A server with a public IP (DigitalOcean, AWS, etc.) — or run locally for testing

### Local Development

```bash
git clone https://github.com/PureGrain/hireproxy.git
cd hireproxy
cp .env.example .env
# Edit .env — at minimum set ANTHROPIC_API_KEY
npm install
node server.js
# Open http://localhost:3000
```

### Production Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full step-by-step guide covering:
- Server setup (Ubuntu 24.04)
- Nginx reverse proxy + SSL
- systemd service
- Mailgun email channel
- Domain configuration

## Configuration

All configuration is via environment variables (`.env` file):

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |
| `PASSPHRASE` | No | Access code for the chat gate (empty = no gate) |
| `ADMIN_KEY` | No | Key for `/admin/stats` endpoint |
| `MAILGUN_API_KEY` | No | Mailgun API key for email channel |
| `MAILGUN_DOMAIN` | No | Your Mailgun sending domain |
| `DISCORD_WEBHOOK` | No | Discord webhook URL for notifications |
| `BOT_NAME` | No | Display name (default: "AI Interview Assistant") |
| `CONTACT_EMAIL` | No | Fallback contact email shown when message cap is reached |
| `MESSAGE_CAP` | No | Global message limit (default: 150) |
| `PORT` | No | Server port (default: 3000) |

## Customization

### Your Resume / Background

Edit the `SYSTEM_PROMPT` in `server.js`. This is where you put your professional background, skills, salary expectations, and personality guidelines. The template shows the structure — replace the `[PLACEHOLDERS]` with your real information.

### The Chat UI

Edit `public/index.html`. It's vanilla HTML/CSS/JS — no build step needed. Change colors, branding, suggestion buttons, and the gate message to match your style.

### Passphrase Gate

Set `PASSPHRASE` in `.env` and update the matching value in `public/index.html` (the `PASSPHRASE` constant near the top of the script). Leave both empty to disable the gate entirely.

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/chat` | Passphrase | Send a message, get SSE stream back |
| POST | `/api/email-webhook` | None (Mailgun) | Inbound email webhook |
| POST | `/api/conversation` | None | Save conversation state |
| GET | `/api/conversation/:id` | None | Load conversation state |
| GET | `/api/public-stats` | None | Public usage metrics |
| GET | `/admin/stats?key=...` | Admin key | Full admin dashboard data |
| GET | `/health` | None | Health check |
| GET | `/stats` | None | Public stats page |

## Why This Exists

A hiring manager's job posting said they wanted someone with a "hacker mindset" who could build AI-powered automation fast. Instead of sending a resume, I sent a link to an AI they could interview.

The bot itself *is* the portfolio piece:
- **AI integration** — Claude API with streaming, system prompts, conversation management
- **Full-stack deployment** — server, domain, SSL, monitoring — all in one session
- **Engineering judgment** — chose the simplest tools that solve the problem (vanilla JS, SQLite, raw HTTP)
- **Cost awareness** — token tracking, rate limiting, message caps — production-grade cost controls from day one
- **Security thinking** — passphrase gate, prompt injection defenses, input validation, rate limiting

The story is the point. Anyone can send a resume. This sends a working product.

## License

MIT — see [LICENSE](LICENSE)
