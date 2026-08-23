# Public repository data safety

This repository and its Git history are public. Never commit credentials, personal/customer/applicant records, filled contracts, database exports, or other private operational data. Backend secrets belong in the provider's secret manager, not in source files.

Demo data must use RFC-reserved `.example` email domains and obviously placeholder phone numbers such as `+370 6XX XXXXX`. Run `node scripts/check-public-repo.mjs` before every push.

If sensitive data is exposed, rotate or revoke the affected credential first, then remove the data from the repository and its history. Do not assume deleting the latest copy makes earlier commits private.

Changes to `security/public-data-allowlist.json` require explicit confirmation that every listed contact or hash-locked file is intentionally public. New or modified public documents and executables must be reviewed and approved by SHA-256 before they are committed.
