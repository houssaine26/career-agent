---
name: career-pipeline-scan
description: Find internship and student-placement openings on ATS job boards (Greenhouse, Lever, Ashby, Workable, SmartRecruiters, RemoteOK, Arbeitnow, Himalayas)
license: MIT
---

# career-pipeline-scan

Search 8 major ATS and public job-board providers for active internships and student placements. The CLI filters results by internship-oriented title keywords by default. Use `--all-roles` to include full-time and other openings from a company board. A board scan only returns openings available on that board; it does not guarantee that the employer currently has internships listed.

## Supported Providers
- `greenhouse` (e.g. Stripe, Figma, Airbnb)
- `lever` (e.g. Netlify, Spotify)
- `ashby` (e.g. OpenAI, Notion, Ramp — auto gzip/brotli decompression)
- `workable`
- `smartrecruiters`
- `remoteok`
- `arbeitnow`
- `himalayas`

## Usage

```bash
career-agents pipeline scan <companyToken> [provider] [--all-roles]

# Examples:
career-agents pipeline scan openai ashby
career-agents pipeline scan stripe greenhouse
career-agents pipeline scan netlify lever

# Include full-time and all other roles
career-agents pipeline scan stripe greenhouse --all-roles
```
