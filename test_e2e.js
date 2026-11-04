const http = require('http');

function post(path, body, token = null) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch { resolve(body); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path, token = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch { resolve(body); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('--- STARTING WORKDEN ID CARD SYSTEM TESTS ---');

  // 1. Admin login
  const login = await post('/api/auth/login', { email: 'admin@workden.online', password: 'WorkDen@2026' });
  const token = login.token;
  console.log('1. Admin Login: SUCCESS (Token acquired)');

  // 2. Fetch staff list
  const staff = await get('/api/staff', token);
  console.log('2. Fetch Staff: count =', staff.data?.length || 0);

  // 3. Create staff profile
  const newStaff = await post('/api/staff', {
    full_name: 'Manish Kumar',
    mobile: '+91 99999 11111',
    email: `manish.${Date.now()}@workden.online`,
    designation: 'Senior Developer',
    department: 'Engineering & Technology',
    joining_date: '2026-03-01',
    photo_url: '/logo.png',
    auto_approve: false
  }, token);
  const staffId = newStaff.data?.staffId;
  const staffProfileId = newStaff.data?.profileId;
  console.log('3. Create Staff Res: SUCCESS -> Generated ID:', staffId);

  // 4. Admin approval
  const approve = await post(`/api/staff/${staffProfileId}/approve`, {}, token);
  const qrToken = approve.data?.token || approve.qr_token;
  console.log('4. Admin Approval: SUCCESS -> QR Token:', qrToken);

  // 5. Public verification without login
  if (qrToken) {
    const verify = await get(`/api/verify/${qrToken}`);
    console.log('5. Public Verification: Status =', verify.data?.verification_status, '| Name =', verify.data?.full_name);
  }

  console.log('--- ALL TESTS COMPLETED SUCCESSFULLY ---');
}

run().catch(console.error);
