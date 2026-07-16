const API_URL = 'http://localhost:3001/api/daily-records';
const email = 'rishav@navgurukul.org';
const date = '2026-07-15';

async function testApi() {
  console.log('--- Testing POST ---');
  const postPayload = {
    email: email,
    date: date,
    goals: [
      {
        goalId: "test_update_15th",
        description: "Testing the update logic: appending a new goal to July 15th!"
      }
    ]
  };

  try {
    const postRes = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(postPayload)
    });
    
    if (!postRes.ok) {
      console.error('POST failed with status:', postRes.status);
      console.error(await postRes.text());
    } else {
      console.log('POST succeeded:', await postRes.json());
    }
  } catch (e) {
    console.error('POST exception:', e);
  }

  console.log('\n--- Testing GET (Daily) ---');
  try {
    const url = `${API_URL}?date=${date}&email=${encodeURIComponent(email)}`;
    console.log(`GET URL: ${url}`);
    const getRes = await fetch(url);
    if (!getRes.ok) {
      console.error('GET failed with status:', getRes.status);
      console.error(await getRes.text());
    } else {
      const getJson = await getRes.json();
      console.log('GET succeeded:', JSON.stringify(getJson, null, 2));
      
      // Simulate frontend unwrap logic
      let unwrap = null;
      if (Array.isArray(getJson)) unwrap = getJson[0] ?? null;
      else if (getJson?.data && Array.isArray(getJson.data)) unwrap = getJson.data[0] ?? null;
      else if (getJson?.data) unwrap = getJson.data;
      else if (getJson?.record) unwrap = getJson.record;
      else unwrap = getJson;
      
      console.log('Frontend unwrapped record:', JSON.stringify(unwrap, null, 2));
    }
  } catch (e) {
    console.error('GET exception:', e);
  }

  console.log('\n--- Testing GET (Monthly) ---');
  try {
    const url = `${API_URL}?email=${encodeURIComponent(email)}`;
    console.log(`GET Monthly URL: ${url}`);
    const getRes = await fetch(url);
    if (!getRes.ok) {
      console.error('GET Monthly failed with status:', getRes.status);
      console.error(await getRes.text());
    } else {
      const getJson = await getRes.json();
      console.log('GET Monthly succeeded:', JSON.stringify(getJson, null, 2));
    }
  } catch (e) {
    console.error('GET Monthly exception:', e);
  }
}

testApi();
