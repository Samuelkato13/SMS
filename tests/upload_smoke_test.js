// Simple smoke script to exercise exam creation and upload preview endpoints.
// Usage: node tests/upload_smoke_test.js

const fetch = require('node-fetch');

async function run() {
  const base = 'http://localhost:5000';
  try {
    console.log('Testing exams POST (name->title mapping)');
    const examRes = await fetch(base + '/api/exams', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Smoke Test Exam', schoolId: 1 })
    });
    const examText = await examRes.text();
    console.log('exams POST status', examRes.status, examText.slice(0,200));

    console.log('Upload preview: requires a file - please run manual test using the UI');

  } catch (e) { console.error('Test failed', e); process.exit(2); }
}

run();
