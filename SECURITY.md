# Security Policy

## Supported versions

Security fixes are applied to the latest release on the default branch. Older tags may not receive backports until a formal release cadence is established.

| Version | Supported |
| --- | --- |
| `0.x` (main / default branch) | ✅ |
| Older tags | ❌ |

## Reporting a vulnerability

**Do not** open a public GitHub issue for security vulnerabilities.

Please report security issues privately so we can investigate and fix them before public disclosure.

### How to report

1. Email the maintainers at **security@arcinvoice.pro** (replace with your project contact if different), **or**
2. Use GitHub **Private vulnerability reporting** on this repository if enabled (Security → Report a vulnerability).

Include as much of the following as possible:

- Description of the vulnerability and its impact
- Steps to reproduce or a proof of concept
- Affected component, file paths, or endpoints
- Suggested remediation if you have one
- Your preferred contact method and any disclosure timeline constraints

### What to expect

- **Acknowledgement** within **5 business days**
- **Status update** within **10 business days** of acknowledgement
- A coordinated fix and disclosure plan when the report is confirmed

We may ask for clarification or additional details during triage.

## Safe harbor

We will not pursue legal action against researchers who:

- Make a good-faith effort to avoid privacy violations, data destruction, and service disruption
- Do not exploit the issue beyond what is needed to demonstrate it
- Report findings promptly and keep them confidential until a fix is released (or an agreed disclosure date)
- Do not access or modify data that is not their own

## Security practices for contributors

- Never commit secrets, keys, tokens, or production credentials
- Use `.env.local` for local secrets; keep `.env.example` free of real values
- Prefer least-privilege credentials in development and CI
- Review dependency updates for known CVEs before merging
- Run `pnpm audit` periodically and address high/critical findings

## Scope notes

This project is currently a scaffold. As features (auth, payments, multi-tenancy, file uploads, etc.) are added, this policy may be updated with additional contacts, SLAs, and out-of-scope guidance.
