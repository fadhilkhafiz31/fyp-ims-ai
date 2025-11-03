// Test script for webhook functionality
// Run this after starting the Firebase emulator: npm run serve
// Then in another terminal: node test-webhook.js

const http = require('http');

// Firebase Functions v2 emulator URL format
// Update this if your emulator shows a different URL
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:5001/ims-ai-821f0/asia-southeast1/webhook';

// Test cases
const testCases = [
  {
    name: "Test 1: CheckStockAtLocation with both product and location",
    payload: {
      queryResult: {
        intent: {
          displayName: "CheckStockAtLocation"
        },
        parameters: {
          product: "Oil Packet 1KG",
          location: "99 Speedmart Acacia"
        },
        queryText: "Is Oil Packet 1KG available at 99 Speedmart Acacia?"
      }
    }
  },
  {
    name: "Test 2: CheckStockAtLocation with product only",
    payload: {
      queryResult: {
        intent: {
          displayName: "CheckStockAtLocation"
        },
        parameters: {
          product: "Oil Packet 1KG",
          location: ""
        },
        queryText: "Do you have Oil Packet 1KG?"
      }
    }
  },
  {
    name: "Test 3: CheckStockAtLocation with location only",
    payload: {
      queryResult: {
        intent: {
          displayName: "CheckStockAtLocation"
        },
        parameters: {
          product: "",
          location: "99 Speedmart Acacia"
        },
        queryText: "What about at 99 Speedmart Acacia?"
      }
    }
  },
  {
    name: "Test 4: Product and location entities without intent name",
    payload: {
      queryResult: {
        intent: {
          displayName: "CheckStock"
        },
        parameters: {
          product: "Oil Packet 1KG",
          location: "99 Speedmart Desa Jati"
        },
        queryText: "Is Oil Packet 1KG available at 99 Speedmart Desa Jati?"
      }
    }
  },
  {
    name: "Test 5: Generic CheckStock (no location)",
    payload: {
      queryResult: {
        intent: {
          displayName: "CheckStock"
        },
        parameters: {
          product: "Oil Packet 1KG",
          any: "Oil Packet 1KG"
        },
        queryText: "Do you have Oil Packet 1KG?"
      }
    }
  }
];

function sendTest(testCase) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(testCase.payload);
    
    const url = new URL(WEBHOOK_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 ${testCase.name}`);
    console.log(`${'='.repeat(60)}`);
    console.log('📤 Request:', JSON.stringify(testCase.payload, null, 2));
    console.log('\n⏳ Waiting for response...\n');

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(responseData);
          console.log('📥 Response Status:', res.statusCode);
          console.log('📥 Response Body:', JSON.stringify(response, null, 2));
          
          if (response.fulfillmentText) {
            console.log(`\n✅ Fulfillment Text: "${response.fulfillmentText}"`);
          }
          
          resolve({ testCase, response, statusCode: res.statusCode });
        } catch (e) {
          console.log('📥 Raw Response:', responseData);
          reject(e);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request Error:', error.message);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Starting Webhook Tests');
  console.log('📡 Webhook URL:', WEBHOOK_URL);
  console.log('\n⚠️  Make sure the Firebase emulator is running!');
  console.log('   Run: cd function-ai && npm run serve');
  console.log('   The emulator will show the exact URL to use.\n');
  console.log('   If the URL is different, set WEBHOOK_URL environment variable:');
  console.log('   Windows: $env:WEBHOOK_URL="http://localhost:5001/..."');
  console.log('   Linux/Mac: export WEBHOOK_URL="http://localhost:5001/..."\n');

  const results = [];

  for (const testCase of testCases) {
    try {
      const result = await sendTest(testCase);
      results.push({ ...result, success: true });
      
      // Wait 1 second between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      results.push({ testCase, success: false, error: error.message });
    }
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Test Summary');
  console.log(`${'='.repeat(60)}`);
  const passed = results.filter(r => r.success).length;
  const failed = results.length - passed;
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total:  ${results.length}`);
}

// Run tests
runTests().catch(console.error);

