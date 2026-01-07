import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadEnv() {
  try {
    const envFile = readFileSync(join(__dirname, '.env'), 'utf-8');
    const env = {};
    envFile.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
        }
      }
    });
    return env;
  } catch (error) {
    return {};
  }
}

const env = loadEnv();
const LAMBDA_API_URL = process.env.VITE_LAMBDA_API_URL || env.VITE_LAMBDA_API_URL || 'https://bwjksxvas67vpqp2ir3vysnkrm0xiswb.lambda-url.ap-south-1.on.aws/';
const HUGGINGFACE_MODEL = process.env.VITE_HUGGINGFACE_MODEL || env.VITE_HUGGINGFACE_MODEL || 'deepseek-ai/DeepSeek-V3.2-Exp:novita';

console.log('Testing Lambda Function Integration');
console.log('='.repeat(60));
console.log(`Lambda URL: ${LAMBDA_API_URL}`);
console.log(`Model: ${HUGGINGFACE_MODEL}\n`);

async function testNonStreaming() {
  console.log('Test 1: Non-Streaming Request (makeDecision)');
  console.log('-'.repeat(60));
  
  try {
    const startTime = Date.now();
    
    const response = await fetch(LAMBDA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: HUGGINGFACE_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant.',
          },
          {
            role: 'user',
            content: 'Say "test" and nothing else.',
          },
        ],
        stream: false,
        temperature: 0.1,
        max_tokens: 10,
      }),
    });

    const endTime = Date.now();
    const latency = endTime - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ FAILED: HTTP ${response.status}`);
      console.error(`Error: ${errorText}`);
      return false;
    }

    const responseText = await response.text();
    let data;
    try {
      const lines = responseText.split('\n');
      let jsonLine = lines.find(line => line.trim().startsWith('{') && !line.includes('statusCode'));
      if (!jsonLine) {
        jsonLine = responseText;
      }
      data = JSON.parse(jsonLine.trim());
    } catch (e) {
      console.error('Failed to parse response:', responseText.substring(0, 200));
      return false;
    }
    
    const content = data.choices?.[0]?.message?.content || '';
    
    if (data.error) {
      console.log(`⚠️  WARNING: Lambda returned error: ${data.error.message || JSON.stringify(data.error)}`);
      console.log(`Full response:`, JSON.stringify(data, null, 2));
      return false;
    }
    
    console.log(`✅ SUCCESS: ${latency}ms`);
    console.log(`Response: ${content.substring(0, 100)}`);
    console.log(`Full response structure:`, {
      hasChoices: !!data.choices,
      hasMessage: !!data.choices?.[0]?.message,
      contentLength: content.length,
    });
    return content.length > 0;
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
    return false;
  }
}

async function testStreaming() {
  console.log('\nTest 2: Streaming Request (createQuestion)');
  console.log('-'.repeat(60));
  
  try {
    const startTime = Date.now();
    let firstChunkTime = null;
    let chunkCount = 0;
    let fullContent = '';

    const response = await fetch(LAMBDA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: HUGGINGFACE_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant.',
          },
          {
            role: 'user',
            content: 'Count from 1 to 5, one number per line.',
          },
        ],
        stream: true,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ FAILED: HTTP ${response.status}`);
      console.error(`Error: ${errorText}`);
      return false;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      console.error('❌ FAILED: Response body is not readable');
      return false;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    console.log('Streaming response...');
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (!firstChunkTime) {
        firstChunkTime = Date.now();
        console.log(`✅ First chunk received: ${firstChunkTime - startTime}ms`);
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        if (trimmedLine.startsWith('{') && trimmedLine.includes('statusCode')) {
          continue;
        }

        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6).trim();
          if (data === '[DONE]') {
            break;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              chunkCount++;
              fullContent += content;
              process.stdout.write(content);
            }
          } catch (e) {
            if (data !== '[DONE]') {
              console.error('\nFailed to parse SSE data:', e, 'Data:', data.substring(0, 100));
            }
          }
        } else if (trimmedLine.startsWith('{') && !trimmedLine.includes('statusCode')) {
          try {
            const parsed = JSON.parse(trimmedLine);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              chunkCount++;
              fullContent += content;
              process.stdout.write(content);
            }
          } catch (e) {
          }
        }
      }
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const timeToFirstChunk = firstChunkTime ? firstChunkTime - startTime : null;

    console.log('\n');
    console.log(`✅ SUCCESS: ${totalTime}ms total`);
    console.log(`   First chunk: ${timeToFirstChunk}ms`);
    console.log(`   Chunks received: ${chunkCount}`);
    console.log(`   Total content length: ${fullContent.length} chars`);
    return true;
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
    return false;
  }
}

async function testErrorHandling() {
  console.log('\nTest 3: Error Handling (Invalid Request)');
  console.log('-'.repeat(60));
  
  try {
    const response = await fetch(LAMBDA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [],
      }),
    });

    const responseText = await response.text();
    let errorData;
    try {
      const lines = responseText.split('\n');
      const jsonLine = lines.find(line => line.trim().startsWith('{')) || responseText;
      errorData = JSON.parse(jsonLine.trim());
    } catch (e) {
      errorData = { error: { message: responseText } };
    }

    const statusCode = errorData.statusCode || response.status;
    if (statusCode === 400) {
      console.log(`✅ SUCCESS: Correctly returned 400 error`);
      console.log(`Error message: ${errorData.error?.message || 'Unknown error'}`);
      return true;
    } else {
      console.error(`❌ FAILED: Expected 400, got ${statusCode}`);
      console.error(`Response: ${responseText.substring(0, 200)}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('Starting Lambda Function Tests\n');
  
  const results = {
    nonStreaming: await testNonStreaming(),
    streaming: await testStreaming(),
    errorHandling: await testErrorHandling(),
  };

  console.log('\n' + '='.repeat(60));
  console.log('Test Summary');
  console.log('='.repeat(60));
  console.log(`Non-Streaming: ${results.nonStreaming ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Streaming: ${results.streaming ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Error Handling: ${results.errorHandling ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(r => r);
  console.log(`\nOverall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  process.exit(allPassed ? 0 : 1);
}

runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

