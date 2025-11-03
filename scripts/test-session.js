// Simple session-switching tester using global fetch (Node 18+)
// Usage: node scripts/test-session.js
const base = 'http://localhost:3000';

async function req(path, cookie) {
  const headers = {};
  if (cookie) headers['cookie'] = cookie;
  const res = await fetch(base + path, { method: 'GET', headers });
  const setCookie = res.headers.get('set-cookie');
  const body = await res.text();
  const status = res.status;
  let parsed = body;
  try { parsed = JSON.parse(body); } catch (e) {}
  return { status, body: parsed, setCookie };
}

function mergeCookie(current, setCookieHeader) {
  if (!setCookieHeader) return current || '';
  // take first part before semicolon
  const newCookie = setCookieHeader.split(';')[0];
  // replace cookie with same name or append
  if (!current) return newCookie;
  const parts = current.split(';').map(s => s.trim()).filter(Boolean);
  const name = newCookie.split('=')[0];
  const filtered = parts.filter(p => !p.startsWith(name + '='));
  filtered.push(newCookie);
  return filtered.join('; ');
}

(async () => {
  try {
    let cookie = '';

    console.log('1) Logging in as Ján -> GET /auth/mock-login');
    const r1 = await req('/auth/mock-login', cookie);
    console.log('Status:', r1.status);
    console.log('Body:', r1.body);
    cookie = mergeCookie(cookie, r1.setCookie);
    console.log('Cookie after Ján login:', cookie);

    console.log('\n2) Logging in as Petra -> GET /auth/mock-login-petra');
    const r2 = await req('/auth/mock-login-petra', cookie);
    console.log('Status:', r2.status);
    console.log('Body:', r2.body);
    cookie = mergeCookie(cookie, r2.setCookie);
    console.log('Cookie after Petra login:', cookie);

    console.log('\n3) Query current user -> GET /api/current-user');
    const r3 = await req('/api/current-user', cookie);
    console.log('Status:', r3.status);
    console.log('Body:', r3.body);

    if (r3.status === 200) {
      console.log('\nResult: /api/current-user returned user with id/name:');
      console.log(r3.body.user || r3.body);
    } else {
      console.log('\nResult: /api/current-user returned error or non-200 status');
    }
  } catch (err) {
    console.error('Error running test:', err);
    process.exit(1);
  }
})();
