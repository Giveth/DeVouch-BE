![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/Giveth/DeVouch-BE?style=flat&labelColor=black&color=%23F35D23)

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/Giveth/DeVouch-BE)
[![Open in Codeanywhere](https://codeanywhere.com/img/open-in-codeanywhere-btn.svg)](https://app.codeanywhere.com/#https://github.com/Giveth/DeVouch-BE)

# Introduction

Devouch is a decentralized application that allows users to attest to project's credibility by their vouches or flags. The backend is built on Subsquid and uses a Postgres database.

## Add new organisation

```bash
# 0. Copy the org-config.template.json to org-config.json
cp org-config.template.jsonc org-config.jsonc

# 1. Fill the config with your organisation data
# 2. Run the script to add your organisation data to migrations
npm run add-organization
```
Then create a PR to the main branch to be reviewed and merged.

## Further Documentation

More information can be found on the [Giveth docs website](https://docs.giveth.io/devouch).
