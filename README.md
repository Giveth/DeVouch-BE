![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/Giveth/DeVouch-BE?style=flat&labelColor=black&color=%23F35D23)

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/Giveth/DeVouch-BE)

# DeVouch Backend

## 1. Project Overview

### Purpose
DeVouch is a decentralized application that allows users to attest to a project's credibility through vouches or flags. It serves as a trust layer on top of the attestation service, allowing users to vouch for projects they believe in. DeVouch is a part of Giveth's ecosystem and is used to vouch for projects in other programs like Gitcoin Grants and RetroFund.

### Key Features
- Decentralized attestation system using EAS (Ethereum Attestation Service)
- Project vouching and flagging functionality
- Multi-organization support
- GraphQL API for data querying
- Integration with multiple data sources (Giveth, Gitcoin, RetroFund 4 (RF4), RetroFund 5 (RF5))

### Live Links
- Documentation: [Giveth docs website](https://docs.giveth.io/devouch)
- GraphQL API: Available at the configured `GQL_URL` endpoint (see configuration section)

## 2. Architecture Overview

### Tech Stack
- **Backend Framework**: Subsquid
- **Database**: PostgreSQL
- **Query Language**: GraphQL
- **Runtime**: Node.js with TypeScript
- **Smart Contract Integration**: Ethereum Attestation Service (EAS), ethers.js
- **Testing**: Jest

### Data Flow
The system has three main flows:
#### 1. Importing projects
1. DeVouch periodically fetches target project data from various sources. It requests different sources for different programs. At the time of writing, it fetches data from Giveth, Gitcoin, RetroFund, and RetroList.
2. Data is processed, and if there are new projects, they are stored in the PostgreSQL database along with other projects that had been imported before.

#### 2. Import valid attestors
DeVouch does not count attestations from just any attestor. An account's attestation is valid only if a recognized organization has granted this role to the account by attesting to it.

##### **Adding an organization to the database**
This step is done manually by the organization's admin. They will make a pull request (PR) to add the organization to the database.

1. Fill the `org-config.jsonc` file with the organization's data.
2. Run `npm run add-organization` to add the organization to the database.
3. Make a PR to add the organization to the database.
4. We will review the PR and merge it if it's valid.

##### **Adding an attestor to the organization**
After the PR is merged from the previous step, the organization's admin will attest to the account by making an attestation using the account address and the organization's schema ID.
1. The organization's admin will attest to the account.
2. That attestation will be indexed by DeVouch.
3. Now the account is part of the organization and can attest to projects on its behalf.

#### 3. Attesting projects
After projects and valid attestors are imported, attestors can start attesting to projects.
1. The user attests to a project by creating an attestation using the DeVouch schema. This attestation includes the project source (e.g., Giveth), project ID, a vouch or flag indicator, an optional comment, and the UID of the attestation that grants them the right to attest on behalf of an organization. The UID is crucial for identifying which organization the user represents at this attestation, since a single account can belong to multiple organizations.
2. DeVouch processes the attestation and records it in the database.

## 3. Getting Started

### Prerequisites
- Node.js (v22 or higher)
- Docker and Docker Compose
- PostgreSQL
- Git

### Installation Steps
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy the environment template:
   ```bash
   cp .env.template .env
   ```
4. Set up the organization config:
   ```bash
   cp org-config.template.jsonc org-config.jsonc
   ```

### Configuration
Below are the required environment variables. Please refer to `.env.template` for the full list and descriptions:
- `DB_HOST`, `DB_NAME`, `DB_PORT`: PostgreSQL configuration
- `GQL_PORT`, `GQL_URL`: GraphQL server settings
- `RPC_ENDPOINT`: Ethereum node endpoint
- `SQUID_NETWORK`: Network to use for Squid (e.g., `eth-sepolia`, `optimism-mainnet`)
- `IMPORT_PROJECT_CRON_SCHEDULE`: Cron schedule for project import
- `SQD_API_KEY`: Subsquid Network Gateway API key (https://portal.sqd.dev)
- `SQD_RPC_ONLY`: set to `"true"` to skip the Subsquid Network Gateway and index
  from `RPC_ENDPOINT` only. Unset (the default) uses the gateway.
- `GIVETH_API_VERSION`: set to `"6"` to import Giveth projects through the
  keyset-paginated `devouchProjectCatalog` query. Unset (the default) uses the
  legacy `allProjects` query.
- `GIVETH_API_USERNAME` / `GIVETH_API_PASSWORD`: HTTP Basic credentials for the
  `devouchProjectCatalog` query. Required with `GIVETH_API_VERSION=6`.
- Various API endpoints for integrations (GIVETH_API_URL, RPGF3_API_URL, etc.)
- IPFS gateway configuration

## 4. Usage Instructions

### To run in development mode:
```bash
npm run run:locally
```

### To set up a fresh database:
```bash
npm run clear:run:locally
```

### To run tests with a fresh database:
```bash
npm run test
```

### To add a new organization:
```bash
# 1. Configure org-config.jsonc
# 2. Run the script
npm run add-organization
```

## 5. Deployment Process

### Environments
- Development: Local environment
- Production: Cloud deployment

### Deployment Steps
1. Build the application:
   ```bash
   npm run build
   ```
2. To deploy using Docker:
   ```bash
   docker-compose up -d
   ```

### CI/CD Integration
The project uses GitHub Actions for continuous integration. Pull requests are automatically reviewed by CodeRabbit.

## 6. Troubleshooting

### Common Issues
- Database connection issues: Check PostgreSQL container status and credentials.
- RPC endpoint errors: Verify RPC endpoint availability and API keys.
- GraphQL endpoint not responding: Check port configuration and server logs.
- `GIVETH_API_VERSION=6` does not work against the public Giveth API yet. It
  selects the keyset-paginated `devouchProjectCatalog` query, which that API does
  not expose (verified by introspecting
  `https://mainnet.serve.giveth.io/graphql`), so the import fails on the first
  page. Leave the variable unset to use the legacy `allProjects` query until the
  impact-graph release adding the query ships. `compose.local.yaml` is the
  deliberate exception: it sets `GIVETH_API_VERSION: "6"` and points
  `GIVETH_API_URL` at an impact-graph on `:4000`, so that stack needs one running
  locally or every cron cycle logs "Giveth import aborted after 0 projects".
  The catalog query is also authenticated: set `GIVETH_API_USERNAME` and
  `GIVETH_API_PASSWORD` for HTTP Basic. They are only sent when both are set and
  only on the catalog query, so the legacy `allProjects` path never transmits
  them to the public API even when the pair stays configured. An unauthenticated
  request returns HTTP 200 with an `UNAUTHENTICATED` GraphQL error rather than a
  401, so the failure surfaces from the response body and not the status code.
  One difference remains worth confirming per instance: the legacy query passes
  `includeUnlisted: true` and the catalog query has no equivalent argument, so
  the two can import different project sets. The `creationDate: createdAt` alias
  and the ascending-id ordering were checked by hand, not by the test suite: on
  2026-09-17 a full walk through `fetchGivethCatalogBatch` and
  `nextCatalogCursor` against a local impact-graph at
  `http://localhost:4000/graphql` (HTTP Basic, `devouchProjectCatalog` present)
  returned 3,942 projects over 79 pages with strictly ascending ids, no
  duplicates, and `creationDate` as an ISO timestamp such as
  `2016-01-01T01:30:00.000Z`. Nothing in CI exercises the live query -
  `src/test/givethCursor.test.ts` covers the cursor guards only - and neither
  the public API nor `https://core.v6-staging.giveth.io/graphql` exposes the
  query, so that result cannot currently be reproduced against a shared
  endpoint. Re-check both properties against whichever instance you point
  `GIVETH_API_URL` at before enabling v6 there.
- `sqd typegen` reintroduces a type error in `src/abi/abi.support.ts`: the
  generated `decodeResult` needs an `as any as Result` cast on its return to
  compile under TypeScript 5.9+. Reapply it after regenerating the ABI bindings.
- `sqd codegen` rewrites `src/model/generated/` against the newer
  `@subsquid/typeorm-codegen`, which names indexes explicitly. The live database
  uses TypeORM's auto-generated index names, so regenerating will make the next
  `sqd migration:generate` emit index renames. Treat that as a deliberate,
  separate migration rather than a side effect of codegen.

### Logs and Debugging
- Enable debug mode by setting `SQD_DEBUG=*` in the environment.
- To check Docker container logs:
  ```bash
  docker-compose logs -f
  ```
- Database logs are available in the PostgreSQL container.

For more detailed information, visit the [Giveth docs website](https://docs.giveth.io/devouch).


