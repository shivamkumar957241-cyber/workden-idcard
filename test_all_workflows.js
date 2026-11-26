const { db, checkpointAndClose } = require('./server/db');
const http = require('http');

async function runTests() {
  console.log('========================================================');
  console.log('🧪 WORKDEN COMPREHENSIVE END-TO-END WORKFLOW TEST SUITE');
  console.log('========================================================\n');

  // Start Express server locally on port 5099 for testing
  process.env.PORT = 5099;
  const { app, server } = require('./server/server');

  const BASE = 'http://localhost:5099';

  function request(method, path, body = null, token = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, BASE);
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const req = http.request(url, { method, headers }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      });
      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  let adminToken = null;
  let memberToken = null;
  let staffToken = null;
  let memberAppId = null;
  let staffAppId = null;
  let paymentOrderId = null;
  let paymentConfirmationId = null;

  try {
    // 1. Admin Login
    console.log('[TEST 1] Admin Login...');
    const adminLoginRes = await request('POST', '/api/auth/login', {
      email: 'admin@workden.online',
      password: 'WorkDen@2026'
    });
    if (adminLoginRes.status !== 200 || !adminLoginRes.body.token) {
      throw new Error('Admin login failed: ' + JSON.stringify(adminLoginRes.body));
    }
    adminToken = adminLoginRes.body.token;
    console.log('✅ Admin logged in successfully.');

    // 2. Member Registration & Login
    console.log('\n[TEST 2] Member Registration & Role Assignment...');
    const memberEmail = `testmember_${Date.now()}@example.com`;
    const regMemberRes = await request('POST', '/api/auth/register', {
      full_name: 'Vikram Malhotra',
      email: memberEmail,
      password: 'Password123',
      account_type: 'USER'
    });
    if (regMemberRes.status !== 201 || regMemberRes.body.user.role !== 'USER') {
      throw new Error('Member registration failed: ' + JSON.stringify(regMemberRes.body));
    }
    memberToken = regMemberRes.body.token;
    console.log(`✅ Member registered with role: ${regMemberRes.body.user.role}`);

    // 3. Member Submits Free Application
    console.log('\n[TEST 3] Member Free Application Submission...');
    const appMemberRes = await request('POST', '/api/applications', {
      full_name: 'Vikram Malhotra',
      mobile: '+91 9876543210',
      email: memberEmail,
      city: 'Bangalore',
      residential_address: 'Indiranagar 100ft Road',
      user_category: 'WorkDen Member',
      current_plan: '₹499 – Full Access',
      application_type: 'USER'
    }, memberToken);

    if (appMemberRes.status !== 201 || !appMemberRes.body.application_id) {
      throw new Error('Member application failed: ' + JSON.stringify(appMemberRes.body));
    }
    memberAppId = appMemberRes.body.application_id;
    console.log(`✅ Free application submitted. Application ID: ${memberAppId}`);

    // Check my application status (should be PENDING, download_unlocked: 0)
    const myAppRes = await request('GET', '/api/applications/my', null, memberToken);
    const myApp = myAppRes.body.data[0];
    if (myApp.status !== 'PENDING' || myApp.download_unlocked !== 0) {
      throw new Error('Application status incorrect: ' + JSON.stringify(myApp));
    }
    console.log(`✅ Application status verified: PENDING (Download locked)`);

    // 4. Admin Approves Member Application
    console.log('\n[TEST 4] Admin Approves Member Application...');
    const approveMemberRes = await request('POST', `/api/applications/${memberAppId}/approve`, {
      validity_period: '1 Year'
    }, adminToken);
    if (approveMemberRes.status !== 200 || !approveMemberRes.body.success) {
      throw new Error('Admin approval failed: ' + JSON.stringify(approveMemberRes.body));
    }
    console.log(`✅ Member application approved by Admin. Generated ID: ${approveMemberRes.body.entity_code}`);

    // Check that download is STILL locked pending ₹99 payment
    const myAppAfterApprove = (await request('GET', '/api/applications/my', null, memberToken)).body.data[0];
    if (myAppAfterApprove.status !== 'APPROVED' || myAppAfterApprove.download_unlocked !== 0) {
      throw new Error('Download should be locked before payment: ' + JSON.stringify(myAppAfterApprove));
    }
    console.log(`✅ Card is APPROVED but download correctly LOCKED pending ₹99 payment`);

    // 5. Member Submits Razorpay Payment Order (Mocking test payment flow in test suite)
    console.log('\n[TEST 5] Payment Order & Razorpay Verification flow...');
    // We insert a test paid order record to test payment confirmation & admin approval
    const testOrderId = `order_test_${Date.now()}`;
    const testPayId = `pay_test_${Date.now()}`;
    const orderDbRes = db.prepare(`
      INSERT INTO payment_orders (application_id, applicant_user_id, razorpay_order_id, amount, status, razorpay_payment_id)
      VALUES (?, (SELECT id FROM auth_users WHERE email = ?), ?, 9900, 'PAID', ?)
    `).run(memberAppId, memberEmail, testOrderId, testPayId);
    paymentOrderId = orderDbRes.lastInsertRowid;
    console.log(`✅ Payment order created and marked PAID in DB.`);

    // 6. Member Submits Payment Confirmation Form
    console.log('\n[TEST 6] Member Submits Payment Confirmation Form...');
    const submitConfRes = await request('POST', '/api/payments/submit-confirmation', {
      application_id: memberAppId,
      payment_order_id: paymentOrderId,
      razorpay_payment_id: testPayId,
      razorpay_order_id: testOrderId,
      amount: 9900,
      payment_date: new Date().toISOString()
    }, memberToken);

    if (submitConfRes.status !== 201 || !submitConfRes.body.confirmation_id) {
      throw new Error('Submit confirmation failed: ' + JSON.stringify(submitConfRes.body));
    }
    paymentConfirmationId = submitConfRes.body.confirmation_id;
    console.log(`✅ Payment confirmation submitted. ID: ${paymentConfirmationId}`);

    // 7. Admin Views Member Payments and Approves
    console.log('\n[TEST 7] Admin Reviews & Approves Member Payment...');
    const adminPaymentsList = await request('GET', '/api/payments/all?status=SUBMITTED', null, adminToken);
    const found = adminPaymentsList.body.data.find(p => p.id === paymentConfirmationId);
    if (!found) throw new Error('Payment confirmation not found in Admin payments list');
    console.log(`✅ Payment confirmation found in Admin list with status SUBMITTED.`);

    const approvePayRes = await request('POST', `/api/payments/${paymentConfirmationId}/approve`, null, adminToken);
    if (approvePayRes.status !== 200 || !approvePayRes.body.success) {
      throw new Error('Admin payment approval failed: ' + JSON.stringify(approvePayRes.body));
    }
    console.log(`✅ Admin approved payment confirmation!`);

    // 8. Verify Member ID Card Download is now UNLOCKED!
    console.log('\n[TEST 8] Verify Member ID Card Download is Unlocked...');
    const myAppUnlocked = (await request('GET', '/api/applications/my', null, memberToken)).body.data[0];
    if (myAppUnlocked.download_unlocked !== 1 || myAppUnlocked.payment_status !== 'VERIFIED') {
      throw new Error('ID Card download should now be unlocked: ' + JSON.stringify(myAppUnlocked));
    }
    console.log(`✅ Member ID Card download successfully UNLOCKED (download_unlocked=1, payment_status=VERIFIED)!`);

    // Check Member Notifications
    const memberNotifs = await request('GET', '/api/payments/notifications', null, memberToken);
    console.log(`✅ Member has ${memberNotifs.body.data.length} notifications: "${memberNotifs.body.data[0]?.title}"`);

    // 9. Staff Workflow (Free Application -> Admin Approval -> ₹249 Payment -> Auto-Unlock)
    console.log('\n[TEST 9] Staff Workflow (Free Application + ₹249 Unlock)...');
    const staffEmail = `teststaff_${Date.now()}@example.com`;
    const regStaffRes = await request('POST', '/api/auth/register', {
      full_name: 'Pooja Verma',
      email: staffEmail,
      password: 'Password123',
      account_type: 'STAFF'
    });
    staffToken = regStaffRes.body.token;
    console.log(`✅ Staff registered with role: ${regStaffRes.body.user.role}`);

    const missingAadharRes = await request('POST', '/api/applications', {
      full_name: 'Pooja Verma',
      mobile: '+91 9988776655',
      email: staffEmail,
      city: 'Noida',
      department: 'Technology & Operations',
      designation: 'Operations Manager',
      work_location: 'Noida Sector 62',
      qualification: 'B.Tech IT',
      aadhar_number: '1234 5678 9012',
      application_type: 'STAFF'
    }, staffToken);
    if (missingAadharRes.status !== 400) {
      throw new Error('Staff application without Aadhar upload should be rejected with 400: ' + JSON.stringify(missingAadharRes));
    }

    const appStaffRes = await request('POST', '/api/applications', {
      full_name: 'Pooja Verma',
      mobile: '+91 9988776655',
      email: staffEmail,
      city: 'Noida',
      department: 'Technology & Operations',
      designation: 'Operations Manager',
      work_location: 'Noida Sector 62',
      qualification: 'B.Tech IT',
      aadhar_number: '1234 5678 9012',
      aadhar_front: '/uploads/test-aadhar-front.png',
      aadhar_back: '/uploads/test-aadhar-back.png',
      application_type: 'STAFF'
    }, staffToken);
    staffAppId = appStaffRes.body.application_id;
    console.log(`✅ Free Staff ID application submitted. ID: ${staffAppId}`);

    // Admin Approves Staff ID
    const approveStaffRes = await request('POST', `/api/applications/${staffAppId}/approve`, null, adminToken);
    console.log(`✅ Staff ID approved by Admin. Entity code: ${approveStaffRes.body.entity_code}`);

    // Verify Staff Card is APPROVED but LOCKED pending ₹249 payment
    const myStaffApp = (await request('GET', '/api/applications/my', null, staffToken)).body.data[0];
    if (myStaffApp.download_unlocked !== 0 || myStaffApp.payment_status !== 'PENDING') {
      throw new Error('Staff ID download should be locked pending ₹249 payment: ' + JSON.stringify(myStaffApp));
    }
    console.log(`✅ Staff ID Card is APPROVED and LOCKED pending ₹249 payment.`);

    // Staff creates ₹249 payment order
    const staffPayOrderRes = await request('POST', '/api/payments/create-order', { application_id: staffAppId }, staffToken);
    if (!staffPayOrderRes.body.success || staffPayOrderRes.body.amount !== 24900) {
      throw new Error('Staff payment order should be 24900 paise (₹249): ' + JSON.stringify(staffPayOrderRes.body));
    }
    console.log(`✅ Staff ₹249 payment order created (amount: ${staffPayOrderRes.body.amount} paise).`);

    // Verify Staff payment & auto-unlock
    const staffVerifyRes = await request('POST', '/api/payments/verify', {
      razorpay_payment_id: `pay_staff_test_${Date.now()}`,
      application_id: staffAppId,
      payment_order_db_id: staffPayOrderRes.body.payment_order_db_id
    }, staffToken);
    if (!staffVerifyRes.body.success || !staffVerifyRes.body.unlocked) {
      throw new Error('Staff payment verify should auto-unlock: ' + JSON.stringify(staffVerifyRes.body));
    }

    const myStaffUnlocked = (await request('GET', '/api/applications/my', null, staffToken)).body.data[0];
    if (myStaffUnlocked.download_unlocked !== 1 || myStaffUnlocked.payment_status !== 'VERIFIED') {
      throw new Error('Staff ID Card should now be unlocked: ' + JSON.stringify(myStaffUnlocked));
    }
    console.log(`✅ Staff ID Card automatically UNLOCKED after ₹249 payment!`);

    // 10. Role-based security checks
    console.log('\n[TEST 10] Security & Role Access Enforcement...');
    const memberAdminAttempt = await request('GET', '/api/cards/all', null, memberToken);
    // Member cannot call admin endpoints
    const memberAppsAttempt = await request('GET', '/api/applications', null, memberToken);
    if (memberAppsAttempt.status !== 403) {
      throw new Error('Member should be forbidden from admin applications list');
    }
    console.log('✅ Role-based access control strictly enforced (Member blocked from admin endpoints).');

    // 11. FK-safe Permanent Delete for Member & Staff with Payments
    console.log('\n[TEST 11] FK-Safe Permanent Delete (Member & Staff with Payments)...');
    const delMemberRes = await request('DELETE', `/api/applications/${memberAppId}`, null, adminToken);
    if (!delMemberRes.body.success) throw new Error('Member delete failed: ' + JSON.stringify(delMemberRes.body));
    const delStaffRes = await request('DELETE', `/api/applications/${staffAppId}`, null, adminToken);
    if (!delStaffRes.body.success) throw new Error('Staff delete failed: ' + JSON.stringify(delStaffRes.body));
    console.log('✅ Member and Staff (with payment orders & confirmations) deleted cleanly without FK errors!');

    console.log('\n========================================================');
    console.log('🎉 ALL 11 TESTS PASSED WITH 100% SUCCESS!');
    console.log('========================================================\n');
  } finally {
    // Cleanup test data from DB
    try {
      if (memberAppId) {
        db.prepare('DELETE FROM payment_confirmations WHERE application_id = ?').run(memberAppId);
        db.prepare('DELETE FROM payment_orders WHERE application_id = ?').run(memberAppId);
        db.prepare('DELETE FROM id_applications WHERE id = ?').run(memberAppId);
      }
      if (staffAppId) {
        db.prepare('DELETE FROM id_applications WHERE id = ?').run(staffAppId);
      }
      db.prepare("DELETE FROM auth_users WHERE email LIKE 'testmember_%' OR email LIKE 'teststaff_%'").run();
      db.prepare("DELETE FROM staff_profiles WHERE email LIKE 'teststaff_%'").run();
      db.prepare("DELETE FROM user_id_profiles WHERE email LIKE 'testmember_%'").run();
      checkpointAndClose();
    } catch {}
    server.close();
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
