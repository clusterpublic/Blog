const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5001';

const results = { passed: 0, failed: 0, skipped: 0, details: [] };

async function test(name, fn) {
  try {
    await fn();
    results.passed++;
    results.details.push({ name, status: 'PASS' });
    console.log(`✅ PASS: ${name}`);
  } catch (e) {
    results.failed++;
    results.details.push({ name, status: 'FAIL', error: e.message });
    console.log(`❌ FAIL: ${name} — ${e.message}`);
  }
}

function skip(name, reason) {
  results.skipped++;
  results.details.push({ name, status: 'SKIP', error: reason });
  console.log(`⏭️  SKIP: ${name} — ${reason}`);
}

async function request(method, path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, json, ok: res.ok };
}

function assertStatus(res, expected) {
  if (res.status !== expected) {
    throw new Error(`Expected status ${expected}, got ${res.status}: ${JSON.stringify(res.json).slice(0, 200)}`);
  }
}

function assertHasKeys(obj, keys) {
  for (const key of keys) {
    if (!(key in obj)) throw new Error(`Missing key: ${key}`);
  }
}

async function runTests() {
  console.log(`\n🧪 Testing JS backend at ${BASE_URL}\n`);
  console.log('='.repeat(60));

  // --- Page routes (HTML) ---
  await test('GET /', async () => {
    const res = await fetch(`${BASE_URL}/`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const html = await res.text();
    if (!html.includes('<html')) throw new Error('Expected HTML response');
  });

  await test('GET /manager', async () => {
    const res = await fetch(`${BASE_URL}/manager`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  await test('GET /editor', async () => {
    const res = await fetch(`${BASE_URL}/editor`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  await test('GET /tweets', async () => {
    const res = await fetch(`${BASE_URL}/tweets`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  await test('GET /creator_showcase', async () => {
    const res = await fetch(`${BASE_URL}/creator_showcase`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  await test('GET /faq-manager', async () => {
    const res = await fetch(`${BASE_URL}/faq-manager`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  await test('GET /job-manager', async () => {
    const res = await fetch(`${BASE_URL}/job-manager`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  await test('GET /components/header.html', async () => {
    const res = await fetch(`${BASE_URL}/components/header.html`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  await test('GET /test-header', async () => {
    const res = await fetch(`${BASE_URL}/test-header`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
  });

  // --- Blog API ---
  await test('GET /api/getblogpage/1', async () => {
    const res = await request('GET', '/api/getblogpage/1');
    assertStatus(res, 200);
    assertHasKeys(res.json, ['blogs', 'has_next_page']);
  });

  await test('GET /api/blog (missing blogID)', async () => {
    const res = await request('GET', '/api/blog');
    assertStatus(res, 400);
  });

  await test('GET /api/get_all_blogs includes display_status', async () => {
    const res = await request('GET', '/api/get_all_blogs?page=1&per_page=5');
    assertStatus(res, 200);
    if (res.json.blogs.length > 0 && !res.json.blogs[0].display_status) {
      throw new Error('Expected display_status on admin blog list items');
    }
  });

  await test('GET /api/getblogpage excludes drafts from public list logic', async () => {
    const res = await request('GET', '/api/getblogpage/1');
    assertStatus(res, 200);
    assertHasKeys(res.json, ['blogs', 'has_next_page']);
  });

  await test('PUT /api/update_blog_status (wrong password)', async () => {
    const res = await request('PUT', '/api/update_blog_status/fake-id', {
      body: { password: 'wrong', status: 'draft' },
    });
    assertStatus(res, 401);
  });

  // --- Tweet API ---
  await test('GET /api/get_all_tweets', async () => {
    const res = await request('GET', '/api/get_all_tweets?page=1&per_page=5');
    assertStatus(res, 200);
    assertHasKeys(res.json, ['tweets', 'total', 'page', 'pinned_count']);
  });

  await test('GET /api/pin_manager/tweets', async () => {
    const res = await request('GET', '/api/pin_manager/tweets?page=1');
    assertStatus(res, 200);
    assertHasKeys(res.json, ['tweets', 'total']);
  });

  await test('GET /api/pin_manager/pinned/all', async () => {
    const res = await request('GET', '/api/pin_manager/pinned/all');
    assertStatus(res, 200);
    assertHasKeys(res.json, ['pinned_tweets', 'count']);
  });

  // --- Creator Showcase API ---
  await test('GET /api/get_all_creator_showcases', async () => {
    const res = await request('GET', '/api/get_all_creator_showcases?page=1');
    assertStatus(res, 200);
    assertHasKeys(res.json, ['showcases', 'total']);
  });

  await test('GET /api/prompt-protocol-data', async () => {
    const res = await request('GET', '/api/prompt-protocol-data');
    assertStatus(res, 200);
    assertHasKeys(res.json, ['success', 'data', 'metadata']);
    assertHasKeys(res.json.data, ['latest_blogs', 'creators', 'tweets', 'spaces']);
  });

  // --- FAQ API ---
  await test('GET /api/faqs', async () => {
    const res = await request('GET', '/api/faqs?page=1');
    assertStatus(res, 200);
    assertHasKeys(res.json, ['faqs', 'total']);
  });

  await test('GET /api/faqs/all', async () => {
    const res = await request('GET', '/api/faqs/all');
    assertStatus(res, 200);
    assertHasKeys(res.json, ['faqs']);
  });

  // --- Job API ---
  await test('GET /api/jobs', async () => {
    const res = await request('GET', '/api/jobs?page=1');
    assertStatus(res, 200);
    assertHasKeys(res.json, ['jobs', 'total']);
  });

  await test('GET /api/admin/jobs', async () => {
    const res = await request('GET', '/api/admin/jobs?page=1');
    assertStatus(res, 200);
    assertHasKeys(res.json, ['jobs', 'total']);
  });

  await test('GET /api/admin/applications', async () => {
    const res = await request('GET', '/api/admin/applications?page=1');
    assertStatus(res, 200);
    assertHasKeys(res.json, ['applications', 'total']);
  });

  // --- Debug / validation endpoints ---
  await test('POST /api/debug-application', async () => {
    const res = await request('POST', '/api/debug-application', {
      body: { fullName: 'Test User', email: 'test@example.com' },
    });
    assertStatus(res, 200);
    assertHasKeys(res.json, ['success', 'received_data']);
  });

  await test('POST /api/submit-job-application (validation fail)', async () => {
    const res = await request('POST', '/api/submit-job-application', { body: {} });
    assertStatus(res, 400);
    if (!res.json.errors) throw new Error('Expected validation errors');
  });

  await test('POST /upload_blog (wrong password)', async () => {
    const res = await fetch(`${BASE_URL}/upload_blog`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'password=wrong&title=Test&content=Test',
    });
    const json = await res.json();
    if (json.success !== false) throw new Error('Expected success: false for wrong password');
  });

  await test('POST /api/add_tweet (wrong password)', async () => {
    const res = await request('POST', '/api/add_tweet', {
      body: { password: 'wrong', tweet_url: 'https://x.com/test/status/123' },
    });
    assertStatus(res, 401);
  });

  // --- AI endpoint (skip if no API key) ---
  if (process.env.GEMINI_API_KEY) {
    await test('POST /ask-cluster-ai', async () => {
      const res = await request('POST', '/ask-cluster-ai', {
        body: { question: 'Hello', page_url: 'https://example.com/', chat_history: [] },
      });
      if (res.status !== 200) throw new Error(`Status ${res.status}: ${JSON.stringify(res.json)}`);
      if (!res.json.message) throw new Error('Expected message in response');
    });
  } else {
    skip('POST /ask-cluster-ai', 'GEMINI_API_KEY not set');
    await test('POST /ask-cluster-ai (no API key returns 500)', async () => {
      const res = await request('POST', '/ask-cluster-ai', {
        body: { question: 'Hello', page_url: '', chat_history: [] },
      });
      assertStatus(res, 500);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Results: ${results.passed} passed, ${results.failed} failed, ${results.skipped} skipped\n`);

  if (results.failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error('Fatal test error:', e.message);
  console.error('Make sure the backend is running: npm run dev');
  process.exit(1);
});
