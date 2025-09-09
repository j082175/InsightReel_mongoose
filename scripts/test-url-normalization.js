const SheetsManager = require('../server/services/SheetsManager');

/**
 * 🧪 URL 정규화 함수 테스트
 * 다양한 URL 패턴으로 일관성 확인
 */
function testUrlNormalization() {
  console.log('🧪 URL 정규화 테스트 시작...\n');
  
  const sheetsManager = new SheetsManager();
  
  // 테스트 케이스들
  const testCases = [
    // Instagram 케이스
    {
      platform: 'Instagram',
      cases: [
        'https://www.instagram.com/reels/DOWFdokjhMb/',
        'https://instagram.com/reels/DOWFdokjhMb/',
        'https://www.instagram.com/reels/DOWFdokjhMb',
        'https://instagram.com/reels/DOWFdokjhMb',
        'https://instagram.com/reels/dowfdokjhmb/',
        'https://instagram.com/reels/dowfdokjhmb',
        'https://www.instagram.com/p/ABC123/?utm_source=ig_web_copy_link',
        'http://instagram.com/reels/DOWFdokjhMb/'
      ]
    },
    
    // YouTube 케이스
    {
      platform: 'YouTube',
      cases: [
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ?t=10',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s&ab_channel=Test',
        'https://youtube.com/shorts/dQw4w9WgXcQ',
        'http://www.youtube.com/watch?v=dQw4w9WgXcQ'
      ]
    },
    
    // TikTok 케이스
    {
      platform: 'TikTok',
      cases: [
        'https://www.tiktok.com/@user/video/1234567890',
        'https://tiktok.com/@user/video/1234567890',
        'https://tiktok.com/@user/video/1234567890/',
        'https://www.tiktok.com/@user/video/1234567890?is_from_webapp=1',
        'http://tiktok.com/@user/video/1234567890'
      ]
    }
  ];
  
  // 각 플랫폼별 테스트 실행
  testCases.forEach(({ platform, cases }) => {
    console.log(`📱 ${platform} URL 정규화 테스트:`);
    
    const normalizedResults = cases.map(url => {
      const normalized = sheetsManager.normalizeVideoUrl(url);
      return { original: url, normalized };
    });
    
    // 결과 출력
    normalizedResults.forEach(({ original, normalized }, index) => {
      console.log(`  ${index + 1}. ${original}`);
      console.log(`     → ${normalized}`);
    });
    
    // 일관성 검사 - 같은 비디오를 가리키는 URL들이 같은 결과를 만드는지 확인
    const uniqueResults = [...new Set(normalizedResults.map(r => r.normalized))];
    
    if (platform === 'Instagram') {
      // Instagram: DOWFdokjhMb 관련 URL들은 모두 같은 결과여야 함
      const dowfRelated = normalizedResults.filter(r => 
        r.original.toLowerCase().includes('dowfdokjhmb') || 
        r.original.toLowerCase().includes('dowfdokjhmb')
      );
      const dowfNormalized = [...new Set(dowfRelated.map(r => r.normalized))];
      
      console.log(`     ✨ DOWFdokjhMb 관련 URL 일관성: ${dowfNormalized.length === 1 ? '✅ 통과' : '❌ 실패'}`);
      if (dowfNormalized.length === 1) {
        console.log(`     🎯 통일된 결과: ${dowfNormalized[0]}`);
      } else {
        console.log(`     ❌ 서로 다른 결과: ${dowfNormalized.join(' | ')}`);
      }
    }
    
    console.log(`     📊 고유 결과 수: ${uniqueResults.length}개`);
    console.log('');
  });
  
  console.log('🎉 URL 정규화 테스트 완료!');
}

if (require.main === module) {
  testUrlNormalization();
}

module.exports = { testUrlNormalization };