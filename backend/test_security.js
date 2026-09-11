const http = require('http');
const assert = require('assert');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Spin up a test server instance using server.js logic or requiring server
// Since server.js starts listening on PORT, let's make requests to the running backend or spin up mock
process.env.PORT = '5002';
process.env.JWT_SECRET = 'test_security_jwt_secret_key_2026';

// Let's create an HTTP request helper
function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5002,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = data;
        try {
          parsed = JSON.parse(data);
        } catch (e) {}
        resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runSecurityTests() {
  console.log("🔒 Starting AuraStay AI Comprehensive Security Test Suite...\n");

  // Require backend server
  const server = require('./server.js');
  await new Promise(r => setTimeout(r, 600));

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      process.stdout.write(`  Testing: ${name}... `);
      await fn();
      console.log("✅ PASSED");
      passed++;
    } catch (err) {
      console.log(`❌ FAILED\n    Error: ${err.message}`);
      failed++;
    }
  }

  // --- SECTION 1: EMAIL FORMAT VALIDATION TESTS ---
  console.log("--- 1. EMAIL FORMAT VALIDATION TESTS ---");

  const invalidEmails = [
    'student',
    'student@',
    '@gmail.com',
    'student@gmail',
    'student@@gmail.com',
    'abc gmail@gmail.com'
  ];

  for (const email of invalidEmails) {
    await test(`Reject invalid email '${email}' during signup with HTTP 400`, async () => {
      const res = await request('POST', '/api/auth/signup', {
        email: email,
        name: 'Test Name',
        password: 'Password123!'
      });
      assert.strictEqual(res.statusCode, 400, `Expected 400 for '${email}', got ${res.statusCode}`);
      assert.strictEqual(res.body.error, 'Invalid email address format');
    });

    await test(`Reject invalid email '${email}' during login with HTTP 400`, async () => {
      const res = await request('POST', '/api/auth/login', {
        email: email,
        password: 'Password123!'
      });
      assert.strictEqual(res.statusCode, 400, `Expected 400 for '${email}', got ${res.statusCode}`);
      assert.strictEqual(res.body.error, 'Invalid email address format');
    });

    await test(`Reject invalid email '${email}' during forgot-password with HTTP 400`, async () => {
      const res = await request('POST', '/api/auth/forgot-password', {
        email: email
      });
      assert.strictEqual(res.statusCode, 400, `Expected 400 for '${email}', got ${res.statusCode}`);
      assert.strictEqual(res.body.error, 'Invalid email address format');
    });
  }

  const validEmails = [
    'student@gmail.com',
    'john.doe@company.co.in',
    '  user.trimmed@example.com  ' // Check whitespace trimming
  ];

  for (const email of validEmails) {
    await test(`Accept valid email format '${email.trim()}' during signup`, async () => {
      const res = await request('POST', '/api/auth/signup', {
        email: email,
        name: 'Valid User',
        password: 'Password123!'
      });
      assert.strictEqual(res.statusCode, 211, `Expected 211 for '${email}', got ${res.statusCode}: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body.user.email, email.trim().toLowerCase());
    });
  }

  // --- SECTION 2: PRIVILEGE ESCALATION ATTEMPTS DURING SIGNUP ---
  console.log("\n--- 2. PRIVILEGE ESCALATION PREVENTION TESTS ---");

  await test("Normal signup without role must create account with role 'customer'", async () => {
    const res = await request('POST', '/api/auth/signup', {
      email: 'regular_guest@example.com',
      name: 'Regular Guest',
      password: 'Password123!'
    });
    assert.strictEqual(res.statusCode, 211);
    assert.strictEqual(res.body.user.role, 'customer', "User role in database response must be customer");
    
    // Verify JWT payload role
    const decoded = jwt.decode(res.body.token);
    assert.strictEqual(decoded.role, 'customer', "JWT token payload role must be customer");
  });

  await test("Signup with malicious 'role: admin' payload MUST be ignored and forced to 'customer'", async () => {
    const res = await request('POST', '/api/auth/signup', {
      email: 'hacker_admin@example.com',
      name: 'Malicious Attacker',
      role: 'admin',
      password: 'Password123!'
    });
    assert.strictEqual(res.statusCode, 211);
    assert.strictEqual(res.body.user.role, 'customer', "Backend must ignore role:admin and force role:customer");
    
    const decoded = jwt.decode(res.body.token);
    assert.strictEqual(decoded.role, 'customer', "JWT token must have role:customer");
  });

  await test("Signup with malicious 'role: staff' payload MUST be ignored and forced to 'customer'", async () => {
    const res = await request('POST', '/api/auth/signup', {
      email: 'hacker_staff@example.com',
      name: 'Malicious Staff Attacker',
      role: 'staff',
      password: 'Password123!'
    });
    assert.strictEqual(res.statusCode, 211);
    assert.strictEqual(res.body.user.role, 'customer', "Backend must ignore role:staff and force role:customer");
    
    const decoded = jwt.decode(res.body.token);
    assert.strictEqual(decoded.role, 'customer', "JWT token must have role:customer");
  });

  // --- SECTION 3: ROLE-BASED ACCESS CONTROL (RBAC) AUTHORIZATION TESTS ---
  console.log("\n--- 3. ROLE-BASED ACCESS CONTROL (RBAC) TESTS ---");

  // Obtain tokens for Customer, Staff, and Admin
  const customerLogin = await request('POST', '/api/auth/login', {
    email: 'guest@aurastay.com',
    password: 'guest'
  });
  const customerToken = customerLogin.body.token;

  const staffLogin = await request('POST', '/api/auth/login', {
    email: 'staff@aurastay.com',
    password: 'staff'
  });
  const staffToken = staffLogin.body.token;

  const adminLogin = await request('POST', '/api/auth/login', {
    email: 'admin@aurastay.com',
    password: 'admin'
  });
  const adminToken = adminLogin.body.token;

  await test("Customer user CANNOT access Admin endpoint GET /api/users (HTTP 403)", async () => {
    const res = await request('GET', '/api/users', null, { 'Authorization': `Bearer ${customerToken}` });
    assert.strictEqual(res.statusCode, 403, `Expected 403, got ${res.statusCode}`);
  });

  await test("Staff user CANNOT access Admin endpoint GET /api/users (HTTP 403)", async () => {
    const res = await request('GET', '/api/users', null, { 'Authorization': `Bearer ${staffToken}` });
    assert.strictEqual(res.statusCode, 403, `Expected 403, got ${res.statusCode}`);
  });

  await test("Admin user CAN access Admin endpoint GET /api/users (HTTP 200)", async () => {
    const res = await request('GET', '/api/users', null, { 'Authorization': `Bearer ${adminToken}` });
    assert.strictEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode}`);
    assert.ok(Array.isArray(res.body), "Users list should be an array");
  });

  await test("Staff user CANNOT promote anyone to Admin via PUT /api/users/:email/role (HTTP 403)", async () => {
    const res = await request('PUT', '/api/users/regular_guest@example.com/role', { role: 'admin' }, {
      'Authorization': `Bearer ${staffToken}`
    });
    assert.strictEqual(res.statusCode, 403, `Expected 403 for Staff role modification, got ${res.statusCode}`);
  });

  await test("Customer user CANNOT promote anyone via PUT /api/users/:email/role (HTTP 403)", async () => {
    const res = await request('PUT', '/api/users/regular_guest@example.com/role', { role: 'admin' }, {
      'Authorization': `Bearer ${customerToken}`
    });
    assert.strictEqual(res.statusCode, 403, `Expected 403 for Customer role modification, got ${res.statusCode}`);
  });

  await test("Admin user CAN update a user's role to 'staff' and 'admin'", async () => {
    const resStaff = await request('PUT', '/api/users/regular_guest@example.com/role', { role: 'staff' }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(resStaff.statusCode, 200);
    assert.strictEqual(resStaff.body.role, 'staff');

    const resAdmin = await request('PUT', '/api/users/regular_guest@example.com/role', { role: 'admin' }, {
      'Authorization': `Bearer ${adminToken}`
    });
    assert.strictEqual(resAdmin.statusCode, 200);
    assert.strictEqual(resAdmin.body.role, 'admin');
  });

  await test("Customer CANNOT access Staff/Admin endpoint POST /api/rooms (HTTP 403)", async () => {
    const res = await request('POST', '/api/rooms', {
      name: 'Unauthorized Suite',
      category: 'suite',
      price: 50000,
      hotel: 'Unauthorized'
    }, {
      'Authorization': `Bearer ${customerToken}`
    });
    assert.strictEqual(res.statusCode, 403, `Expected 403, got ${res.statusCode}`);
  });

  await test("Staff CAN access Staff endpoint POST /api/rooms (HTTP 201)", async () => {
    const res = await request('POST', '/api/rooms', {
      name: 'Authorized Staff Suite',
      category: 'suite',
      price: 25000,
      hotel: 'Taj Lands End, Mumbai'
    }, {
      'Authorization': `Bearer ${staffToken}`
    });
    assert.strictEqual(res.statusCode, 201, `Expected 201, got ${res.statusCode}`);
  });

  console.log(`\n📊 Test Summary: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  } else {
    console.log("🎉 ALL SECURITY AND VALIDATION TESTS PASSED PERFECTLY!\n");
    process.exit(0);
  }
}

runSecurityTests();
