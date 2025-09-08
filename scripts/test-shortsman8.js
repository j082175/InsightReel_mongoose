require('dotenv').config();
const ChannelAnalysisQueueManager = require('../server/services/ChannelAnalysisQueue');

async function testShortsman8Channel() {
  console.log('🧪 Testing @shortsman8 channel (5-video limit test)...');
  
  try {
    const queue = ChannelAnalysisQueueManager.getInstance();
    
    // Wait for initialization
    console.log('⏳ Waiting for queue initialization...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('🎯 Expected behavior: Analyze only 5 videos (shortform limit)');
    console.log('📊 Watch for "최신 5개 영상 선택" in logs');
    
    // Add shortsman8 job
    const jobId = await queue.addJob('@shortsman8', [], {
      includeAnalysis: true,
      priority: 'high'
    });
    
    console.log(`✅ Job added for @shortsman8: ${jobId}`);
    console.log('🔍 Check server logs for processing details...');
    console.log('⚠️  Should stop after analyzing 5 videos');
    
    // Wait for analysis to complete (shorter time since only 5 videos)
    console.log('⏳ Waiting for shortform analysis (30 seconds)...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    console.log('✅ Analysis should be complete. Check channels.json');
    console.log('🔍 Verify only 5 videos were analyzed in logs');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testShortsman8Channel();