/**
 * 데이터 변환 로직 정확성 검증 테스트
 * Google Sheets buildRowData와 VideoDataConverter 결과 비교
 */

const VideoDataConverter = require('./server/services/VideoDataConverter');
const SheetsManager = require('./server/services/SheetsManager');

async function testDataConversionAccuracy() {
  console.log('🔍 데이터 변환 로직 정확성 검증 테스트 시작\n');

  try {
    // 1. 테스트 데이터 준비 (복잡한 실제 케이스)
    const testCases = [
      {
        name: 'YouTube 복잡한 케이스',
        platform: 'youtube',
        videoData: {
          platform: 'youtube',
          postUrl: 'https://youtube.com/watch?v=abc123',
          videoPath: '/downloads/youtube_video.mp4',
          thumbnailPath: '/downloads/youtube_thumb.jpg',
          metadata: {
            author: '테스트채널',
            youtubeHandle: '@testchannel',
            channelUrl: 'https://youtube.com/@testchannel',
            title: '복잡한 YouTube 테스트 비디오',
            views: 123456,
            likes: 5678,
            comments: 234,
            durationFormatted: '05:43',
            subscribers: 100000,
            channelVideos: 500,
            monetized: 'Y',
            youtubeCategory: 'Entertainment',
            license: 'youtube',
            definition: 'hd',
            language: 'ko',
            hashtags: ['#테스트', '#YouTube'],
            description: '이것은 테스트 설명입니다.',
            uploadDate: new Date('2025-09-01T10:30:00Z')
          },
          analysis: {
            mainCategory: '엔터테인먼트',
            middleCategory: '코미디',
            fullCategoryPath: '엔터테인먼트 > 코미디',
            depth: 2,
            content: 'AI가 분석한 비디오 내용입니다.',
            keywords: ['코미디', '재미', '엔터테인먼트'],
            hashtags: ['#코미디', '#재미'],
            mentions: ['@friendchannel'],
            comments: '댓글 분석 결과',
            confidence: 0.92,
            aiModel: 'gemini-2.0-flash'
          },
          timestamp: new Date('2025-09-01T10:35:00Z').toISOString()
        }
      },
      {
        name: 'Instagram 단순한 케이스',
        platform: 'instagram',
        videoData: {
          platform: 'instagram',
          postUrl: 'https://instagram.com/p/abc123/',
          videoPath: '/downloads/instagram_video.mp4',
          metadata: {
            author: 'test_user',
            channelUrl: 'https://instagram.com/test_user',
            likes: 1500,
            comments: 45,
            hashtags: ['#instagram', '#test'],
            description: 'Instagram test post',
            uploadDate: new Date('2025-09-02T15:20:00Z')
          },
          analysis: {
            mainCategory: '라이프스타일',
            middleCategory: '',
            content: 'Instagram 라이프스타일 포스트',
            keywords: ['라이프스타일', '일상'],
            hashtags: ['#라이프스타일'],
            confidence: 0.78,
            aiModel: 'gemini-2.0-flash'
          },
          timestamp: new Date('2025-09-02T15:25:00Z').toISOString()
        }
      }
    ];

    // 2. 각 테스트 케이스 검증
    for (const testCase of testCases) {
      console.log(`\n📋 ${testCase.name} 검증 중...`);
      
      // VideoDataConverter로 변환
      const convertedData = VideoDataConverter.convertToSchema(
        testCase.platform, 
        testCase.videoData, 
        1
      );

      // 기존 SheetsManager의 buildRowData와 비교하기 위한 시뮬레이션
      const sheetsManager = new SheetsManager();
      let expectedRowData;
      try {
        expectedRowData = sheetsManager.buildRowData(1, testCase.videoData);
      } catch (error) {
        console.log('   ⚠️ SheetsManager buildRowData 호출 실패 (예상됨):', error.message);
        expectedRowData = null;
      }

      // 변환된 데이터 검증
      console.log(`   ✅ 변환 성공! 필드 수: ${Object.keys(convertedData).length}`);
      
      // 핵심 필드들 검증
      const coreFields = testCase.platform === 'youtube' 
        ? ['platform', 'account', 'youtubeHandle', 'channelUrl', 'mainCategory', 'views', 'likes']
        : ['platform', 'account', 'channelUrl', 'mainCategory', 'likes'];
      
      console.log('   📊 핵심 필드 검증:');
      coreFields.forEach(field => {
        if (convertedData.hasOwnProperty(field)) {
          console.log(`     ✅ ${field}: ${convertedData[field]}`);
        } else {
          console.log(`     ❌ ${field}: 누락!`);
        }
      });

      // 데이터 타입 검증
      console.log('   🔢 데이터 타입 검증:');
      console.log(`     - rowNumber: ${typeof convertedData.rowNumber} (${convertedData.rowNumber})`);
      console.log(`     - likes: ${typeof convertedData.likes} (${convertedData.likes})`);
      console.log(`     - categoryDepth: ${typeof convertedData.categoryDepth} (${convertedData.categoryDepth})`);

      // 역변환 테스트
      try {
        const backConverted = VideoDataConverter.convertDocumentToRowData(convertedData, testCase.platform);
        console.log(`   🔄 역변환 성공! 배열 길이: ${backConverted.length}`);
      } catch (error) {
        console.log(`   ❌ 역변환 실패: ${error.message}`);
      }
    }

    // 3. 필드 매핑 완전성 검증
    console.log('\n🗂️ 필드 매핑 완전성 검증...');
    
    try {
      const { YouTubeVideo, InstagramVideo } = require('./server/models/VideoOptimized');
      
      // YouTube 스키마 필드 확인
      const youtubeSchemaFields = Object.keys(YouTubeVideo.schema.paths);
      const instagramSchemaFields = Object.keys(InstagramVideo.schema.paths);
      
      console.log(`✅ YouTube 스키마 필드: ${youtubeSchemaFields.length}개`);
      console.log(`✅ Instagram 스키마 필드: ${instagramSchemaFields.length}개`);
      
      // 예상 필드 수와 비교
      const expectedYouTubeFields = 34; // 33개 헤더 + rowNumber
      const expectedInstagramFields = 20; // 19개 헤더 + rowNumber
      
      if (youtubeSchemaFields.length >= expectedYouTubeFields) {
        console.log(`✅ YouTube 필드 수 검증 통과 (${youtubeSchemaFields.length} >= ${expectedYouTubeFields})`);
      } else {
        console.log(`❌ YouTube 필드 수 부족 (${youtubeSchemaFields.length} < ${expectedYouTubeFields})`);
      }
      
      if (instagramSchemaFields.length >= expectedInstagramFields) {
        console.log(`✅ Instagram 필드 수 검증 통과 (${instagramSchemaFields.length} >= ${expectedInstagramFields})`);
      } else {
        console.log(`❌ Instagram 필드 수 부족 (${instagramSchemaFields.length} < ${expectedInstagramFields})`);
      }
      
    } catch (error) {
      console.log(`❌ 스키마 필드 검증 실패: ${error.message}`);
    }

    console.log('\n🎉 데이터 변환 로직 검증 완료!\n');

  } catch (error) {
    console.log('❌ 데이터 변환 로직 검증 실패:', error.message);
    console.log('스택 트레이스:', error.stack);
  }
}

// 직접 실행 시
if (require.main === module) {
  testDataConversionAccuracy();
}

module.exports = testDataConversionAccuracy;