# Contributing to HireProxy

Thanks for your interest in contributing! HireProxy is a focused project, so contributions that improve the core interview experience are most welcome.

## Getting Started

1. Fork the repo and clone it
2. Copy `.env.example` to `.env` and fill in your API keys
3. `npm install`
4. `node server.js`
5. Open `http://localhost:3000`

## What to Contribute

**Great contributions:**
- Bug fixes
- Security improvements
- Performance optimizations
- Documentation improvements
- Accessibility improvements
- New notification channels (Slack, Telegram, etc.)
- Better mobile responsiveness

**Before you build:**
- Open an issue describing what you want to add
- Wait for a response before investing significant time

## Code Style

- No build tools, no transpilers — vanilla JS on both client and server
- Keep dependencies minimal
- No frameworks on the frontend
- Standard Node.js patterns (callbacks for fs, promises for network)

## Submitting Changes

1. Create a feature branch from `main`
2. Make your changes
3. Test locally (make sure the chat works end-to-end)
4. Open a pull request with a clear description

## Security

If you find a security vulnerability, please **do not** open a public issue. Email the maintainer directly.
