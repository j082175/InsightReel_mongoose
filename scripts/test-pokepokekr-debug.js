require('dotenv').config();
const ChannelAnalysisQueueManager = require('../server/services/ChannelAnalysisQueue');

async function testPokepokekrAnalysis() {
  console.log('🧪 Testing @pokepokekr channel analysis...');
  
  try {
    const queue = ChannelAnalysisQueueManager.getInstance();
    
    // Wait for initialization
    console.log('⏳ Waiting for queue initialization...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Add job with explicit analysis enabled
    const jobId = await queue.addJob('@pokepokekr', [], {
      includeAnalysis: true,
      priority: 'high'
    });
    
    console.log(`✅ Job added: ${jobId}`);
    console.log('🔍 Check server logs for debug messages...');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testPokepokekrAnalysis();