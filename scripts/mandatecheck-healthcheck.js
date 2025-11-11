#!/usr/bin/env node
/*
  MandateCheck Health-Check Script
  - POST /api/v1/verify-mandate (with X-API-Key)
  - GET /api/v1/request-object/:id
  - POST /api/v1/verify-callback (simulated vp_token)
  - Poll GET /api/v1/verify-status/:id until final
*/

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.MC_API_KEY || 'test-key-12345';
const COMPANY_ICO = process.env.MC_TEST_ICO || '54321098'; // verified path in seed

async function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

async function main(){
  console.log(`[HC] Using BASE=${BASE}, ICO=${COMPANY_ICO}`);

  // 1) Initiate verification
  console.log('[HC] 1) POST /api/v1/verify-mandate');
  const initRes = await fetch(`${BASE}/api/v1/verify-mandate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
    body: JSON.stringify({ companyIco: COMPANY_ICO })
  });
  if (!initRes.ok) {
    const t = await initRes.text();
    throw new Error(`verify-mandate failed: ${initRes.status} ${t}`);
  }
  const initData = await initRes.json();
  const txnId = initData.transactionId || initData.localTransactionId;
  const requestUri = initData.requestUri;
  if (!txnId || !requestUri) throw new Error('Missing transactionId/requestUri in response');
  console.log(`[HC]   -> transactionId=${txnId}`);
  console.log(`[HC]   -> requestUri=${requestUri}`);

  // 2) Request object (mock)
  console.log('[HC] 2) GET /api/v1/request-object/:id');
  const reqObjRes = await fetch(`${BASE}/api/v1/request-object/${encodeURIComponent(txnId)}`);
  if (!reqObjRes.ok) {
    const t = await reqObjRes.text();
    throw new Error(`request-object failed: ${reqObjRes.status} ${t}`);
  }
  const reqObj = await reqObjRes.json();
  if (!reqObj || reqObj.state !== txnId) {
    console.warn('[HC]   -> Warning: mock request object does not reflect expected state');
  } else {
    console.log('[HC]   -> request object OK');
  }

  // 3) Simulate wallet callback
  console.log('[HC] 3) POST /api/v1/verify-callback');
  const walletData = { given_name: 'Jan', family_name: 'Novacek' };
  const form = new URLSearchParams({ state: txnId, vp_token: JSON.stringify(walletData) });
  const cbRes = await fetch(`${BASE}/api/v1/verify-callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString()
  });
  if (!cbRes.ok) {
    const t = await cbRes.text();
    throw new Error(`verify-callback failed: ${cbRes.status} ${t}`);
  }
  const cbData = await cbRes.json();
  console.log(`[HC]   -> callback response:`, cbData);

  // 4) Poll status
  console.log('[HC] 4) GET /api/v1/verify-status/:id (poll)');
  const timeoutMs = 15000;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const stRes = await fetch(`${BASE}/api/v1/verify-status/${encodeURIComponent(txnId)}`, {
      headers: { 'X-API-Key': API_KEY }
    });
    if (!stRes.ok) {
      const t = await stRes.text();
      throw new Error(`verify-status failed: ${stRes.status} ${t}`);
    }
    const st = await stRes.json();
    console.log(`[HC]   -> status=${st.status}`);
    if (st.status !== 'pending') {
      console.log('[HC] RESULT:', st);
      console.log('[HC] PASS');
      return;
    }
    await sleep(1000);
  }
  throw new Error('Timeout waiting for final status');
}

main().catch(err => {
  console.error('[HC] FAIL:', err.message);
  process.exit(1);
});
