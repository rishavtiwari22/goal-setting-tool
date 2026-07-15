const fetch = require('node-fetch');

async function test() {
  console.log("1. Fetching existing records for rishav@navgurukul.org...");
  let res = await fetch("https://smart-track-4b7p.onrender.com/api/daily-records?email=rishav@navgurukul.org");
  let data = await res.json();
  console.log("GET Response Count:", data.count);

  console.log("\n2. Posting a test goal with email...");
  let payload = {
    email: 'rishav@navgurukul.org',
    date: '2026-07-15',
    goals: [
      {
        goalId: 'test-uuid-9999',
        description: 'Master Node.js Streams and advanced APIs'
      },
      {
        goalId: 'test-uuid-8888',
        description: 'Build an AI-powered UI system'
      }
    ]
  };
  
  res = await fetch("https://smart-track-4b7p.onrender.com/api/daily-records", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  console.log(`POST Status: ${res.status}`);
  console.log(`POST Response Body: ${await res.text()}`);
}

test();