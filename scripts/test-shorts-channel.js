require('dotenv').config();
const ChannelAnalysisQueueManager = require('../server/services/ChannelAnalysisQueue');

async function testShortsChannel() {
  console.log('🧪 Testing channel from shorts video...');
  
  try {
    const queue = ChannelAnalysisQueueManager.getInstance();
    
    // Wait for initialization
    console.log('⏳ Waiting for queue initialization...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Try to analyze using video ID (the system should extract channel from it)
    // If that doesn't work, we'll need to find the channel manually
    console.log('🔍 Attempting to analyze channel from shorts video...');
    
    // First, let's try a common approach - most shorts channels have identifiable patterns
    // Since we can't directly get channel from video ID here, let's wait for manual input
    console.log('❓ Please provide the channel handle or @username from the shorts video');
    console.log('   Example: @channelname or UCxxxxxxxxxx');
    
  } catch (error) {
    console.error('❌ Test setup failed:', error);
  }
}

testShortsChannel();