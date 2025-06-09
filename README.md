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
- Node.js (v20 or higher)
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

### Logs and Debugging
- Enable debug mode by setting `SQD_DEBUG=*` in the environment.
- To check Docker container logs:
  ```bash
  docker-compose logs -f
  ```
- Database logs are available in the PostgreSQL container.

For more detailed information, visit the [Giveth docs website](https://docs.giveth.io/devouch).


