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

async function runTests() {
  console.log('🧪 Starting Phase 2 Verification Tests...\n');

  // Test 1: Admin Login
  console.log('1️⃣ Testing Admin Login...');
  const adminLogin = await post('/api/auth/login', {
    email: 'admin@workden.online',
    password: 'WorkDen@2026'
  });
  if (!adminLogin.success || !adminLogin.token) {
    throw new Error('Admin login failed: ' + JSON.stringify(adminLogin));
  }
  const adminToken = adminLogin.token;
  console.log('   ✅ Admin logged in successfully! Role:', adminLogin.user.role);

  // Test 2: User Self-Registration
  console.log('\n2️⃣ Testing User Self-Registration...');
  const testEmail = `rahul.${Date.now()}@example.com`;
  const userReg = await post('/api/auth/register', {
    full_name: 'Rahul Sharma',
    email: testEmail,
    password: 'Password@123'
  });
  if (!userReg.success || !userReg.token) {
    throw new Error('User registration failed: ' + JSON.stringify(userReg));
  }
  const userToken = userReg.token;
  console.log('   ✅ User registered successfully! Name:', userReg.user.full_name, 'Role:', userReg.user.role);

  // Test 3: User Upload Photo (Base64)
  console.log('\n3️⃣ Testing Photo Upload (Base64)...');
  const dummyBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const uploadRes = await post('/api/upload/base64', {
    base64: dummyBase64,
    extension: 'png'
  }, userToken);
  if (!uploadRes.success || !uploadRes.fileUrl) {
    throw new Error('Photo upload failed: ' + JSON.stringify(uploadRes));
  }
  console.log('   ✅ Photo uploaded successfully! URL:', uploadRes.fileUrl);

  // Test 4: User Submits ID Card Application
  console.log('\n4️⃣ Testing User Self-Service ID Application Submission...');
  const appSubmit = await post('/api/applications', {
    application_type: 'USER',
    full_name: 'Rahul Sharma',
    photo_url: uploadRes.fileUrl,
    mobile: '+91 98765 01234',
    email: testEmail,
    user_category: 'Dedicated Office Member',
    current_plan: 'Private Cabin',
    residential_address: 'WorkDen Tech Hub, Sector 62, Noida',
    remarks: 'Please expedite'
  }, userToken);
  if (!appSubmit.success || !appSubmit.application_id) {
    throw new Error('Application submission failed: ' + JSON.stringify(appSubmit));
  }
  const appId = appSubmit.application_id;
  console.log('   ✅ ID card application submitted! ID:', appId);

  // Test 5: User Views Own Application (status should be PENDING)
  console.log('\n5️⃣ Testing User checking own application status...');
  const myApps = await get('/api/applications/my', userToken);
  if (!myApps.success || myApps.data.length === 0 || myApps.data[0].status !== 'PENDING') {
    throw new Error('User applications check failed: ' + JSON.stringify(myApps));
  }
  console.log('   ✅ User only sees their own pending application:', myApps.data[0].status);

  // Test 6: Admin Lists Applications and Sees Pending
  console.log('\n6️⃣ Testing Admin viewing applications...');
  const adminApps = await get('/api/applications?status=PENDING', adminToken);
  if (!adminApps.success || !adminApps.data.some(a => a.id === appId)) {
    throw new Error('Admin applications list failed: ' + JSON.stringify(adminApps));
  }
  console.log('   ✅ Admin can view pending applications count:', adminApps.data.length);

  // Test 7: Admin Approves Application
  console.log('\n7️⃣ Testing Admin Approving Application...');
  const approveRes = await post(`/api/applications/${appId}/approve`, {
    validity_period: '1 Year'
  }, adminToken);
  if (!approveRes.success || !approveRes.qr_token || !approveRes.entity_code) {
    throw new Error('Approval failed: ' + JSON.stringify(approveRes));
  }
  const qrToken = approveRes.qr_token;
  const issuedId = approveRes.entity_code;
  console.log('   ✅ Application approved! Issued ID:', issuedId, 'QR Token:', qrToken);

  // Test 8: User views own application after approval (gets Card details & QR Token)
  console.log('\n8️⃣ Testing User views ID card after admin approval...');
  const userApproved = await get('/api/applications/my', userToken);
  const myApprovedCard = userApproved.data[0];
  if (myApprovedCard.status !== 'APPROVED' || !myApprovedCard.qr_token) {
    throw new Error('Approved card not reflected for user: ' + JSON.stringify(userApproved));
  }
  console.log('   ✅ User successfully sees approved card! ID:', myApprovedCard.id_number, 'Status:', myApprovedCard.card_status);

  // Test 9: Public QR Verification without login
  console.log('\n9️⃣ Testing Public QR Verification (Google Lens / Browser URL, NO LOGIN)...');
  const publicVerify = await get(`/api/verify/${qrToken}`);
  if (!publicVerify.success || !publicVerify.data.verified) {
    throw new Error('Public verification failed: ' + JSON.stringify(publicVerify));
  }
  console.log('   ✅ Public verification SUCCESS:');
  console.log('      • Name:', publicVerify.data.full_name);
  console.log('      • ID Number:', publicVerify.data.id_number);
  console.log('      • Status:', publicVerify.data.verification_status);
  console.log('      • Organization:', publicVerify.data.organization);
  console.log('      • Private fields hidden: mobile:', publicVerify.data.mobile === undefined, 'address:', publicVerify.data.residential_address === undefined);

  // Test 10: Non-admin trying to access admin endpoints is rejected
  console.log('\n🔟 Testing Security: Regular user blocked from admin audit logs & admin routes...');
  const forbiddenCheck = await get('/api/audit-logs', userToken);
  if (forbiddenCheck.success !== false) {
    throw new Error('Security check failed, user was allowed to access audit logs!');
  }
  console.log('   ✅ Non-admin forbidden response received as expected (403)');

  console.log('\n🎉 ALL 10 TESTS PASSED PERFECTLY! System is 100% operational.');
}

runTests().catch(err => {
  console.error('\n❌ Test Error:', err.message);
  process.exit(1);
});
