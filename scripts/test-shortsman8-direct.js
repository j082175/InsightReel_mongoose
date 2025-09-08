const https = require('https');

async function testShortsman8Direct() {
  console.log('🧪 Testing @shortsman8 via direct server API...');
  
  const postData = JSON.stringify({
    channels: ['shortsman8'],
    contentType: 'shortform'
  });
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/collect-trending',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  
  try {
    const req = require('http').request(options, (res) => {
      console.log(`✅ Status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log('📊 Response:', data);
        console.log('🔍 Check server logs and channels.json');
      });
    });
    
    req.on('error', (err) => {
      console.error('❌ Request failed:', err);
    });
    
    req.write(postData);
    req.end();
    
    console.log('📡 Request sent to server...');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testShortsman8Direct();