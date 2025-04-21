![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/Giveth/DeVouch-BE?style=flat&labelColor=black&color=%23F35D23)

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/Giveth/DeVouch-BE)

# DeVouch Backend

## 1. Project Overview

### Purpose
DeVouch is a decentralized application that allows users to attest to project's credibility through vouches or flags. It serves as a trust layer within the Giveth ecosystem, enabling transparent project verification.

### Key Features
- Decentralized attestation system using EAS (Ethereum Attestation Service)
- Project vouching and flagging functionality
- Multi-organization support
- GraphQL API for data querying
- Integration with multiple data sources (Giveth, RPGF3, Gitcoin, RF4)
- IPFS integration for decentralized storage

### Live Links
- Documentation: [Giveth docs website](https://docs.giveth.io/devouch)
- GraphQL API: Available at configured `GQL_URL` endpoint

## 2. Architecture Overview

### Tech Stack
- **Backend Framework**: Subsquid
- **Database**: PostgreSQL
- **Query Language**: GraphQL
- **Runtime**: Node.js with TypeScript
- **Smart Contract Integration**: Ethereum Attestation Service (EAS)
- **Testing**: Jest

### Data Flow
The system processes data through the following flow:
1. Smart contract events are indexed from the blockchain
2. Data is processed and stored in PostgreSQL database
3. GraphQL API exposes the processed data
4. External integrations fetch project data from various sources

## 3. Getting Started

### Prerequisites
- Node.js
- Docker and Docker Compose
- PostgreSQL
- Git

### Installation Steps
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment template:
   ```bash
   cp .env.template .env
   ```
4. Set up organization config:
   ```bash
   cp org-config.template.jsonc org-config.jsonc
   ```

### Configuration
Required environment variables:
- `DB_HOST`, `DB_NAME`, `DB_PORT`: PostgreSQL configuration
- `GQL_PORT`, `GQL_URL`: GraphQL server settings
- `RPC_ENDPOINT`: Ethereum node endpoint
- Various API endpoints for integrations (GIVETH_API_URL, RPGF3_API_URL, etc.)
- IPFS gateway configuration

## 4. Usage Instructions

### Running the Application
Development mode:
```bash
npm run run:locally
```

Fresh database setup:
```bash
npm run clear:run:locally
```

### Testing
Run tests with a fresh database:
```bash
npm run test
```

### Common Tasks
Add new organization:
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
2. Apply database migrations:
   ```bash
   squid-typeorm-migration apply
   ```
3. Deploy using Docker:
   ```bash
   docker-compose up -d
   ```

### CI/CD Integration
The project uses GitHub Actions for continuous integration. Pull requests are automatically reviewed by CodeRabbit.

## 6. Troubleshooting

### Common Issues
- Database connection issues: Check PostgreSQL container status and credentials
- RPC endpoint errors: Verify RPC endpoint availability and API keys
- GraphQL endpoint not responding: Check port configuration and server logs

### Logs and Debugging
- Enable debug mode by setting `SQD_DEBUG=*` in environment
- Check Docker container logs:
  ```bash
  docker-compose logs -f
  ```
- Database logs available in PostgreSQL container

For more detailed information, visit the [Giveth docs website](https://docs.giveth.io/devouch).
