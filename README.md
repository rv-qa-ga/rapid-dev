# RapidDev — E2E Automation POC

Isolated proof-of-concept copy of the Playwright + Cucumber + TypeScript E2E automation framework.

**Remote:** [rv-qa-ga/rapid-dev](https://github.com/rv-qa-ga/rapid-dev)  
This repo is separate from the upstream [accelins/bsg-e2e-tests](https://github.com/accelins/bsg-e2e-tests) project.

## Prerequisites

- Node.js 18+
- npm

## Setup

```bash
git clone https://github.com/rv-qa-ga/rapid-dev.git
cd rapid-dev
npm ci
```

Copy environment configuration from the sample and fill in secrets locally (never commit `.env` files):

```bash
cp src/config/env/env.sample src/config/env/.env.qa
# Edit src/config/env/.env.qa with your credentials
```

See [docs/setup/TEAM_SECRETS_AND_ONBOARDING.md](docs/setup/TEAM_SECRETS_AND_ONBOARDING.md) for credential guidance.

## Run tests

```bash
# All tests (uses ENV from src/config/env)
npm test

# UI tests only
npm run test:ui

# API tests only
npm run test:api

# Specific environment
npm run test:env:qa
```

## Project structure

| Path | Purpose |
|------|---------|
| `src/features/` | Cucumber feature files (UI, API, integration) |
| `src/step-definitions/` | Step definitions and common steps |
| `src/page-objects/` | Playwright page objects |
| `src/api-clients/` | REST API clients (Salesforce, Dynamics, etc.) |
| `src/config/env/` | Per-environment JSON config + local `.env.*` (gitignored) |
| `scripts/` | Test runners, data seeders, CI helpers |
| `postman-collections/` | Postman collections |

## Cursor / AI workflow

See [.cursorrules](.cursorrules) for QA architect guidelines and the requirement-to-implementation workflow used in this POC sandbox.

## Contributing

- Pull from `origin` (`rv-qa-ga/rapid-dev`), not upstream, unless you intentionally sync from the parent framework.
- See [docs/process/CODE_REVIEW_AND_CONTRIBUTION.md](docs/process/CODE_REVIEW_AND_CONTRIBUTION.md) for review workflow.
