_______

# MandateCheck API

MandateCheck API is a B2B SaaS solution designed for the new eIDAS 2.0 ecosystem. It provides a simple, high-trust API endpoint for businesses (like banks, financial institutions, and enterprises) to instantly verify if an individual (authenticated via their EUDI Wallet) has a valid legal mandate (e.g., "CEO", "Board Member") to act on behalf of a specific company.

This project integrates with the EUDI Wallet infrastructure (using OpenID4VP) and connects to official company registries to provide a real-time, automated, and legally-sound verification service.

## The Problem

In B2B transactions, such as approving corporate loans, signing contracts, or onboarding business partners, verifying that an individual has the legal authority to represent their company is a critical compliance and risk-management step.

Currently, this process is often:

  * **Manual:** Requiring representatives to upload PDF excerpts from a company register, articles of association, or signed Power of Attorney documents.
  * **Slow:** Manual review of these documents creates bottlenecks in digital processes.
  * **Insecure:** Paper documents and PDFs are easily forged, leading to a high risk of fraud.
  * **Costly:** Manual verification requires significant human resources.
  * **Complex (Cross-Border):** Verifying a mandate from a company in another EU member state is even more difficult.

## The Solution

MandateCheck API acts as a specialized intermediary (an "eIDAS-as-a-Service" provider). We abstract all the complexity away from our customers.

Our customers (e.g., a bank's onboarding system) simply need to:

1.  Call a single API endpoint with the company's identifier (e.g., `companyIco`).
2.  Present a QR code or link to their user.

MandateCheck API handles the rest:

1.  **EUDI Wallet Interaction:** Orchestrates the entire OpenID4VP flow to request the user's identity (PID) from their secure EUDI Wallet, ensuring user consent.
2.  **Registry Lookup:** Performs a live, real-time lookup against the official national company registry for the specified company.
3.  **Verification:** Cross-references the verified identity from the wallet with the list of legal representatives from the registry.
4.  **Simple Response:** Returns a clear, trusted, and auditable answer: `{"status": "verified"}` or `{"status": "not_verified"}`.

## ⚠️ Current Status: Functional Prototype (real verifier call, simulated wallet)

This repository contains a **functional end-to-end prototype (MVP)**.

It successfully implements the full asynchronous API flow as described in the EUDI Wallet reference implementations (including the use of `OpenID4VP`, `dcql_query`, `request_uri`, `state`, and `vp_token`).

External integrations status:

  * **EUDI Sandbox/Verifier:** The initiation call in `/api/v1/verify-mandate` now performs a **real HTTP POST** to the EUDI Verifier endpoint (`https://verifier-backend.eudiw.dev/ui/presentations`).
  * **EUDI Wallet:** The wallet callback is still **simulated** using a NodeJS test script (`test_callback.js`) that mimics the wallet sending data to our public tunnel.

The system is ready for the next phase: validating the flow with the official EUDI reference wallet application.

## Architecture & Tech Stack

  * **Backend:** Node.js, Express, TypeScript
  * **Database:** PostgreSQL (using Drizzle ORM). *Currently prototyped using in-memory storage (`server/storage.ts`)*.
  * **API Protocol:** OpenID4VP (aligned with EUDI reference implementation)
  * **Test Frontend:** React, Vite
  * **Public Tunnel:** Cloudflare Tunnel (`cloudflared.exe`)
  * **Build Process:** `esbuild` for the backend, `Vite` for the frontend.

## How to Run the Prototype

This prototype requires 3 terminals running simultaneously:

1.  **Terminal 1:** Backend Server
2.  **Terminal 2:** Test Frontend
3.  **Terminal 3:** Public Tunnel

### Prerequisites

  * Node.js (v20+ recommended)
  * NPM
  * `cloudflared.exe` (downloaded from Cloudflare)

### Step 1: Run the Backend (Terminal 1)

The backend must be manually re-compiled (`npm run build`) and re-started (`node ...`) *every time* you make a change to a server-side file (e.g., `server/routes.ts`).

```powershell
# In the project root (PS C:\Users\Brano\Projects\DN>)

# 1. Install dependencies (only once)
npm install

# 2. Build the project
npm run build

# 3. Run the compiled server
node -r dotenv/config dist/index.js

# Expected Output:
# [express] serving on http://localhost:3000
```

### Step 2: Run the Test Frontend (Terminal 2)

```powershell
# In a new terminal

# 1. Navigate to the test app directory
cd apps/eudi-verifier-test

# 2. Install dependencies (only once)
npm install

# 3. Run the dev server
npm run dev

# Expected Output:
# ➜  Local:   http://localhost:5173/
```

### Step 3: Run the Public Tunnel (Terminal 3)

```powershell
# In a new terminal (in the project root)

# 1. Run cloudflared to create a public tunnel to your backend
.\cloudflared.exe tunnel --url http://localhost:3000

# 2. Find and copy the public URL from the output:
# |  https://[YOUR-UNIQUE-NAME].trycloudflare.com   |
```

### Step 4: Configure the Backend

Set the public base URL for callbacks via environment variable. No code edits are needed.

1. Copy the public URL from your tunnel (e.g., `https://[YOUR-UNIQUE-NAME].trycloudflare.com`).
2. Export it as `PUBLIC_CODESPACE_URL` before starting the server (or put it into `.env`).

Examples:

```bash
export PUBLIC_CODESPACE_URL="https://[YOUR-UNIQUE-NAME].trycloudflare.com"
npm run build
node -r dotenv/config dist/index.js
```

### Step 5: Re-Build and Re-Start the Backend

Since you changed a server file, you must **repeat Step 1** for the changes to take effect:

```powershell
# In Terminal 1

# 1. Stop the server (Ctrl+C)

# 2. Re-build the project
npm run build

# 3. Re-run the compiled server
node -r dotenv/config dist/index.js
```

### Step 6: Test the Flow (two options)

Option A: Manual end-to-end

1.  **Open the Frontend:** Go to `http://localhost:5173/` in your browser.
2.  **Start Verification:** Enter an IČO (e.g., `54321098` for a "Verified" test, `12345678` for a "Not\_Verified" test) and click "Spustiť overenie mandátu".
3.  **Copy Transaction ID:** A QR code and a Transaction ID (e.g., `txn_...`) will appear. **Copy this Transaction ID.**
4.  **Run Test Script:**
      * Open the file `test_callback.js`.
      * Paste the **new Transaction ID** into the `transactionId` constant.
      * Save the file.
      * Run the script:
        ```bash
        node test_callback.js
        ```
5.  **Observe Result:** The browser should automatically update to show a **VERIFIED** or **NOT\_VERIFIED** status.

Option B: Automated health-check (no browser)

1. Run the backend on http://localhost:3000 (with `PUBLIC_CODESPACE_URL` set).
2. Execute the health-check script to exercise all endpoints:

```bash
npm run mc:health
```

The script will:
- POST `/api/v1/verify-mandate` (with `X-API-Key`) and parse the `transactionId` and `requestUri`.
- GET `/api/v1/request-object/:id`.
- POST `/api/v1/verify-callback` with a simulated `vp_token`.
- Poll GET `/api/v1/verify-status/:id` until it returns a final status or times out.

## API Flow & Endpoints

This prototype implements the full asynchronous OpenID4VP flow:

1.  **`POST /api/v1/verify-mandate`** (Called by Frontend)

      * **Body:** `{ "companyIco": "..." }`
      * **Action:** Creates a new `VerificationTransaction` in storage. Simulates a call to the EUDI Sandbox.
      * **Returns:** `{ "transactionId": "...", "requestUri": "...", "requestUriMethod": "post" }`

2.  **`GET /api/v1/request-object/:id`** (Called by Wallet)

      * **Action:** Simulates the EUDI Verifier returning the Authorization Request details.
      * **Returns:** A mock JSON payload containing the crucial `state` field (which matches the `:id`).

3.  **`GET /api/v1/verify-status/:id`** (Polled by Frontend)

      * **Action:** Checks the status of the `VerificationTransaction` in storage.
      * **Returns:** `{ "status": "pending" | "verified" | "not_verified" | "error", "result": { ... } }`

4.  **`POST /api/v1/verify-callback`** (Called by Wallet)

      * **Content-Type:** `application/x-www-form-urlencoded`
      * **Body:** `state=...&vp_token=...`
      * **Action:** Receives the (simulated) data from the wallet. Uses the `state` to find the transaction, parses the `vp_token` to get the user's name, performs the live lookup against the mock registry, and updates the transaction status to `verified` or `not_verified`.

## Roadmap & Future Work

  * **Step 1 (Real Initiation):** DONE — `/verify-mandate` already calls the official EUDI Verifier Sandbox.
  * **Step 2 (Authentication):** Implement JAR (JWT Secured Authorization Request) signing using a Relying Party certificate/keystore to authenticate our backend against the Sandbox.
  * **Step 3 (Real Callback):** Update `/verify-callback` to parse and cryptographically validate the *real* `vp_token` (Verifiable Presentation / JWT) received from the official EUDI reference wallet.
  * **Step 4 (Registry Connectors):** Replace the mock registry in `server/storage.ts` with a real API client for the Slovak Business Register (OR SR).
  * **Step 5 (Expansion):** Develop connectors for other national registries (CZ, AT, DE, etc.).
  * **Step 6 (Platform Integration):** Integrate this API as a core service within the broader eGarant platform.

## License

This project is licensed under the MIT License.