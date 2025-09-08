require('dotenv').config();
const ChannelAnalysisQueueManager = require('../server/services/ChannelAnalysisQueue');

async function testMameeewin() {
  console.log('🧪 Testing @mameeewin channel...');
  
  try {
    const queue = ChannelAnalysisQueueManager.getInstance();
    
    // Wait for initialization
    console.log('⏳ Waiting for queue initialization...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Add mameeewin job
    const jobId = await queue.addJob('@mameeewin', [], {
      includeAnalysis: true,
      priority: 'high'
    });
    
    console.log(`✅ Job added for @mameeewin: ${jobId}`);
    console.log('🔍 Check server logs for processing details...');
    
    // Wait longer for longform analysis
    console.log('⏳ Waiting for longform analysis (60 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 60000));
    
    console.log('✅ Analysis should be complete. Check channels.json');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testMameeewin();