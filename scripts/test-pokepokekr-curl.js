// Test script to trigger pokepokekr analysis via curl
const { spawn } = require('child_process');

function testPokepokekrAnalysis() {
  console.log('🧪 Testing @pokepokekr channel analysis via curl...');
  
  const curl = spawn('curl', [
    '-X', 'POST',
    'http://localhost:3000/api/channel-queue/add',
    '-H', 'Content-Type: application/json',
    '-d', JSON.stringify({
      channelIdentifier: '@pokepokekr',
      options: {
        includeAnalysis: true,
        priority: 'high'
      }
    })
  ]);

  curl.stdout.on('data', (data) => {
    console.log('✅ Response:', data.toString());
  });

  curl.stderr.on('data', (data) => {
    console.error('❌ Error:', data.toString());
  });

  curl.on('close', (code) => {
    console.log(`🏁 Curl process exited with code ${code}`);
    console.log('🔍 Check server logs for debug messages...');
  });
}

testPokepokekrAnalysis();