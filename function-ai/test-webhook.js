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
  },
  {
    name: "Test 6: Token-based matching - Acacia should NOT match Desa Jati",
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
    },
    expectedBehavior: "Should match '99 Speedmart Acacia' but NOT '99 Speedmart Desa Jati' (token 'acacia' missing in Desa Jati)"
  },
  {
    name: "Test 7: Token-based matching - Desa Jati should NOT match Acacia",
    payload: {
      queryResult: {
        intent: {
          displayName: "CheckStockAtLocation"
        },
        parameters: {
          product: "Oil Packet 1KG",
          location: "99 Speedmart Desa Jati"
        },
        queryText: "Is Oil Packet 1KG available at 99 Speedmart Desa Jati?"
      }
    },
    expectedBehavior: "Should match '99 Speedmart Desa Jati' but NOT '99 Speedmart Acacia' (token 'desa' or 'jati' missing in Acacia)"
  },
  {
    name: "Test 8: Partial location name (fallback substring matching)",
    payload: {
      queryResult: {
        intent: {
          displayName: "CheckStockAtLocation"
        },
        parameters: {
          product: "Oil Packet 1KG",
          location: "Acacia"
        },
        queryText: "Is Oil Packet 1KG available at Acacia?"
      }
    },
    expectedBehavior: "Should use fallback substring matching if strict token matching fails"
  },
  {
    name: "Test 9: Location not found scenario",
    payload: {
      queryResult: {
        intent: {
          displayName: "CheckStockAtLocation"
        },
        parameters: {
          product: "Oil Packet 1KG",
          location: "99 Speedmart Nonexistent Store"
        },
        queryText: "Is Oil Packet 1KG available at 99 Speedmart Nonexistent Store?"
      }
    },
    expectedBehavior: "Should return location_not_found error message"
  },
  {
    name: "Test 10: Product not found at location",
    payload: {
      queryResult: {
        intent: {
          displayName: "CheckStockAtLocation"
        },
        parameters: {
          product: "Nonexistent Product XYZ",
          location: "99 Speedmart Acacia"
        },
        queryText: "Is Nonexistent Product XYZ available at 99 Speedmart Acacia?"
      }
    },
    expectedBehavior: "Should return product_not_found error message"
  },
  {
    name: "Test 11: Multiple stores with shared prefix - Acacia with full name",
    payload: {
      queryResult: {
        intent: {
          displayName: "CheckStockAtLocation"
        },
        parameters: {
          product: "Oil Packet 1KG",
          location: "99 Speedmart Acacia Nilai"
        },
        queryText: "Is Oil Packet 1KG available at 99 Speedmart Acacia Nilai?"
      }
    },
    expectedBehavior: "Should match '99 Speedmart Acacia, Nilai' but NOT '99 Speedmart Desa Jati, Nilai' - all tokens (99, speedmart, acacia, nilai) must be present"
  },
  {
    name: "Test 12: Multiple stores with shared prefix - Desa Jati with full name",
    payload: {
      queryResult: {
        intent: {
          displayName: "CheckStockAtLocation"
        },
        parameters: {
          product: "Oil Packet 1KG",
          location: "99 Speedmart Desa Jati Nilai"
        },
        queryText: "Is Oil Packet 1KG available at 99 Speedmart Desa Jati Nilai?"
      }
    },
    expectedBehavior: "Should match '99 Speedmart Desa Jati, Nilai' but NOT '99 Speedmart Acacia, Nilai' - all tokens (99, speedmart, desa, jati, nilai) must be present"
  },
  {
    name: "Test 13: Multiple stores - partial location (Acacia only) should use fallback",
    payload: {
      queryResult: {
        intent: {
          displayName: "CheckStockAtLocation"
        },
        parameters: {
          product: "Oil Packet 1KG",
          location: "Acacia"
        },
        queryText: "Is Oil Packet 1KG available at Acacia?"
      }
    },
    expectedBehavior: "Should use fallback substring matching since single token 'acacia' may match multiple stores, should return first match or appropriate response"
  },
  {
    name: "Test 14: Multiple stores - verify token matching prevents false positive",
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
    },
    expectedBehavior: "Token matching: ['99', 'speedmart', 'acacia'] - should ONLY match stores containing ALL three tokens. Should NOT match stores with '99 Speedmart' but missing 'acacia' token"
  },
  {
    name: "Test 15: Multiple stores - verify common prefix doesn't cause false match",
    payload: {
      queryResult: {
        intent: {
          displayName: "CheckStockAtLocation"
        },
        parameters: {
          product: "Oil Packet 1KG",
          location: "99 Speedmart"
        },
        queryText: "Is Oil Packet 1KG available at 99 Speedmart?"
      }
    },
    expectedBehavior: "Should match any store with '99 Speedmart' in name since all tokens (99, speedmart) are common. Falls back to substring matching for broad queries"
  },
  {
    name: "Test 16: Edge case - stores with very similar names",
    payload: {
      queryResult: {
        intent: {
          displayName: "CheckStockAtLocation"
        },
        parameters: {
          product: "Oil Packet 1KG",
          location: "99 Speedmart Acacia Branch"
        },
        queryText: "Is Oil Packet 1KG available at 99 Speedmart Acacia Branch?"
      }
    },
    expectedBehavior: "Tokens: ['99', 'speedmart', 'acacia', 'branch'] - should only match stores containing ALL four tokens. Prevents matching '99 Speedmart Acacia, Nilai' (missing 'branch')"
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
    if (testCase.expectedBehavior) {
      console.log(`💡 Expected: ${testCase.expectedBehavior}`);
    }
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
            
            // For location-specific tests, verify the matched store name
            if (testCase.payload.queryResult?.parameters?.location && testCase.expectedBehavior) {
              const location = testCase.payload.queryResult.parameters.location;
              const fulfillmentLower = response.fulfillmentText.toLowerCase();
              const locationLower = location.toLowerCase();
              const locationTokens = locationLower.split(' ').filter(Boolean);
              const lastToken = locationTokens[locationTokens.length - 1] || locationLower;
              
              console.log(`\n🔍 Verification:`);
              console.log(`   Location queried: "${location}"`);
              console.log(`   Location tokens: [${locationTokens.join(', ')}]`);
              const containsLocation = fulfillmentLower.includes(locationLower) || fulfillmentLower.includes(lastToken);
              console.log(`   Response contains location info: ${containsLocation ? '✅ Yes' : '⚠️  Check manually - verify correct store matched'}`);
            }
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

