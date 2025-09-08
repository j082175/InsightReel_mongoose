require('dotenv').config();
const ChannelAnalysisQueueManager = require('../server/services/ChannelAnalysisQueue');

async function testRobertElderSoftware() {
  console.log('🧪 Testing @RobertElderSoftware channel...');
  
  try {
    const queue = ChannelAnalysisQueueManager.getInstance();
    
    // Wait for initialization
    console.log('⏳ Waiting for queue initialization...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Add Robert Elder Software job
    const jobId = await queue.addJob('@RobertElderSoftware', [], {
      includeAnalysis: true,
      priority: 'high'
    });
    
    console.log(`✅ Job added for @RobertElderSoftware: ${jobId}`);
    console.log('🔍 Check server logs for processing details...');
    
    // Wait for analysis to complete
    console.log('⏳ Waiting for analysis (60 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 60000));
    
    console.log('✅ Analysis should be complete. Check channels.json');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testRobertElderSoftware();