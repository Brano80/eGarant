# eGarant Platform & Services (Monorepo)

This repository contains the source code for the eGarant trusted services platform and its related microservices, including the MandateCheck API.

## Repository Structure

* `/server`: The main Node.js/Express/Drizzle backend server that runs *both* the eGarant platform and the MandateCheck API endpoints.
* `/apps/client`: The frontend application for the main eGarant platform (virtual offices, document signing).
* `/apps/eudi-verifier-test`: A dedicated test frontend used for prototyping and testing the MandateCheck API flow.
* `/packages`: Shared code (e.g., database schema) used by multiple services.

---

## 1. MandateCheck API (Prototype)

A B2B SaaS API for verifying corporate mandates (e.g., "is this person a CEO?") in real-time using the EUDI Wallet ecosystem.

➡️ **[Click here for the full MandateCheck API documentation and prototype guide](./MandateCheck_README.md)**

Notes (current prototype state):
- The endpoint `POST /api/v1/verify-mandate` now performs a real HTTP POST to the official EUDI Verifier Sandbox.
- For the wallet callback to work when using a public tunnel/Codespace, set `PUBLIC_CODESPACE_URL` in your `.env` (or export it in the shell) to your public URL (e.g., `https://your-name.trycloudflare.com`).

Environment setup:
- Copy the sample environment file and adjust values as needed:

```bash
cp .env.sample .env
# then edit .env and set PUBLIC_CODESPACE_URL to your public URL
```

---

## 2. eGarant Platform (Core)

The main platform for trusted digital transactions, including:
* Virtual Offices for secure collaboration.
* Digital contract management.
* QES (Qualified Electronic Signature) validation.
* (Future) Escrow services.

*(Documentation for this platform is under development.)*