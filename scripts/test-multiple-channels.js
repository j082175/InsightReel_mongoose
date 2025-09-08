require('dotenv').config();
const ChannelAnalysisQueueManager = require('../server/services/ChannelAnalysisQueue');

async function testMultipleChannels() {
  console.log('🧪 Testing multiple channels simultaneously...');
  
  try {
    const queue = ChannelAnalysisQueueManager.getInstance();
    
    // Wait for initialization
    console.log('⏳ Waiting for queue initialization...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Add multiple jobs simultaneously
    const channels = [
      '@Timofey41',
      '@mameeewin', 
      '@tapo4k1'
    ];
    
    const jobIds = [];
    
    console.log('🚀 Adding multiple channels to queue...');
    for (const channel of channels) {
      const jobId = await queue.addJob(channel, [], {
        includeAnalysis: true,
        priority: 'high'
      });
      jobIds.push(jobId);
      console.log(`✅ Job added for ${channel}: ${jobId}`);
    }
    
    console.log('📋 Queue Status:');
    console.log(`- Total jobs added: ${jobIds.length}`);
    console.log(`- Job IDs: ${jobIds.join(', ')}`);
    console.log('🔍 Check server logs for processing details...');
    
    // Wait for processing to complete
    console.log('⏳ Waiting for analysis to complete (90 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 90000));
    
    console.log('✅ Test completed. Check channels.json for results.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testMultipleChannels();