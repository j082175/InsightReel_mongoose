/**
 * YouTube 채널 상세 분석 테스트 스크립트
 * 요청된 6가지 정보를 포함한 상세 분석을 수행합니다.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ChannelModel = require('../server/features/cluster/ChannelModel');
const YouTubeChannelAnalyzer = require('../server/services/YouTubeChannelAnalyzer');
const { ServerLogger } = require('../server/utils/logger');
const { FieldMapper } = require('../server/types/field-mapper');

/**
 * 채널 상세 분석 테스트
 */
async function testChannelAnalysis(channelIdentifier, keywords = ['테스트']) {
  try {
    console.log(`🔍 "${channelIdentifier}" 채널 상세 분석 시작...\n`);

    // ChannelModel 초기화 대기
    const model = ChannelModel.getInstance();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const startTime = Date.now();
    
    // 상세 분석 실행
    const channel = await model.createOrUpdateWithAnalysis(
      channelIdentifier, 
      keywords, 
      true // 상세 분석 포함
    );
    
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log('='.repeat(60));
    console.log('📊 채널 상세 분석 결과');
    console.log('='.repeat(60));

    // 기본 정보
    console.log('\n📺 기본 정보:');
    console.log(`채널명: ${channel.name}`);
    console.log(`채널 ID: ${channel.id}`);
    console.log(`구독자: ${channel.subscribers?.toLocaleString() || 'N/A'}명`);
    console.log(`설명 길이: ${channel.description?.length || 0}자`);
    console.log(`썸네일: ${channel.thumbnailUrl ? '✅' : '❌'}`);
    console.log(`커스텀 URL: ${channel.customUrl || 'N/A'}`);

    // 요청된 6가지 상세 정보
    console.log('\n📊 요청된 6가지 상세 분석:');
    
    // 1. 채널 설명
    console.log(`\n1️⃣ 채널 설명:`);
    if (channel.description) {
      const preview = channel.description.length > 100 ? 
        channel.description.substring(0, 100) + '...' : 
        channel.description;
      console.log(`"${preview}"`);
      console.log(`(총 ${channel.description.length}자)`);
    } else {
      console.log('설명 없음');
    }

    // 2. 일평균 업로드
    console.log(`\n2️⃣ 일평균 업로드:`);
    if (channel.dailyUploadRate !== undefined) {
      console.log(`${channel.dailyUploadRate}개/일 (최근 30일 기준)`);
      
      if (channel.uploadFrequency?.pattern) {
        const patterns = {
          daily: '매일 업로드',
          multiple_per_week: '주 여러회',
          weekly: '주 1회',
          bi_weekly: '격주',
          monthly: '월 1회',
          irregular: '불규칙',
          no_data: '데이터 없음'
        };
        console.log(`업로드 패턴: ${patterns[channel.uploadFrequency.pattern]}`);
        if (channel.uploadFrequency.consistency !== undefined) {
          console.log(`일관성 점수: ${channel.uploadFrequency.consistency}/100점`);
        }
      }
    } else {
      console.log('분석 데이터 없음');
    }

    // 3. 최근 7일 조회수
    console.log(`\n3️⃣ 최근 7일 조회수:`);
    if (channel.last7DaysViews !== undefined) {
      console.log(`${channel.last7DaysViews?.toLocaleString() || 0}회`);
    } else {
      console.log('분석 데이터 없음');
    }

    // 4. 영상 평균시간
    console.log(`\n4️⃣ 영상 평균시간:`);
    if (channel.avgDurationFormatted) {
      console.log(`${channel.avgDurationFormatted} (${channel.avgDurationSeconds}초)`);
    } else {
      console.log('분석 데이터 없음');
    }

    // 5. 숏폼 비율
    console.log(`\n5️⃣ 숏폼 비율 (60초 이하):`);
    if (channel.shortFormRatio !== undefined) {
      console.log(`${channel.shortFormRatio}%`);
      
      const contentTypeLabels = {
        shortform: '숏폼 채널 (70% 이상)',
        longform: '롱폼 채널 (30% 미만)',
        mixed: '혼합 채널'
      };
      console.log(`채널 유형: ${contentTypeLabels[channel.contentType] || channel.contentType}`);
    } else {
      console.log('분석 데이터 없음');
    }

    // 6. 채널 일별 조회수 (기간별)
    console.log(`\n6️⃣ 채널 조회수 (기간별):`);
    if (channel.viewsByPeriod) {
      console.log(`최근 7일: ${channel.viewsByPeriod.last7Days?.toLocaleString() || 0}회`);
      console.log(`최근 30일: ${channel.viewsByPeriod.last30Days?.toLocaleString() || 0}회`);
      console.log(`최근 90일: ${channel.viewsByPeriod.last90Days?.toLocaleString() || 0}회`);
      console.log(`최근 1년: ${channel.viewsByPeriod.lastYear?.toLocaleString() || 0}회`);
    } else {
      console.log('분석 데이터 없음');
    }

    // 추가 통계 정보
    console.log('\n📈 추가 통계:');
    if (channel.totalVideos !== undefined) {
      console.log(`총 영상 수: ${channel.totalVideos?.toLocaleString() || 0}개`);
      console.log(`총 조회수: ${channel.totalViews?.toLocaleString() || 0}회`);
      console.log(`영상당 평균 조회수: ${Math.round(channel.averageViewsPerVideo || 0)?.toLocaleString() || 0}회`);
      
      if (channel.mostViewedVideo?.title) {
        console.log(`\n🔥 최고 조회수 영상:`);
        console.log(`"${channel.mostViewedVideo.title}"`);
        console.log(`조회수: ${channel.mostViewedVideo.viewCount?.toLocaleString() || 0}회`);
      }
    }

    // 향상된 분석 결과 (AI 콘텐츠 분석)
    if (channel.enhancedAnalysis) {
      console.log('\n🤖 AI 콘텐츠 분석 결과:');
      const identity = channel.enhancedAnalysis.channelIdentity;
      console.log(`주요 카테고리: ${identity.primaryCategory}`);
      console.log(`보조 카테고리: ${identity.secondaryCategories.join(', ')}`);
      console.log(`AI 생성 태그: ${identity.channelTags.join(', ')}`);
      console.log(`타겟 오디언스: ${identity.targetAudience}`);
      console.log(`콘텐츠 스타일: ${identity.contentStyle}`);
      console.log(`채널 특징: ${identity.uniqueFeatures.join(', ')}`);
      console.log(`채널 성격: "${identity.channelPersonality}"`);
      console.log(`분석된 영상 수: ${channel.enhancedAnalysis.analyzedVideos}개`);
      console.log(`분석 방법: ${channel.enhancedAnalysis.analysisMethod}`);
    }

    // 메타 정보
    console.log('\n⏱️ 분석 정보:');
    console.log(`분석 시간: ${Math.round(duration / 1000)}초`);
    console.log(`분석 일시: ${new Date().toLocaleString()}`);
    if (channel.lastAnalyzedAt) {
      console.log(`마지막 분석: ${new Date(channel.lastAnalyzedAt).toLocaleString()}`);
    }

    console.log('\n✅ 채널 상세 분석 완료!');
    
    return channel;

  } catch (error) {
    console.error('❌ 채널 분석 실패:', error.message);
    console.error('스택 트레이스:', error.stack);
  }
}

/**
 * 간단한 API 사용량 확인
 */
async function checkQuotaUsage() {
  try {
    console.log('📊 YouTube API 사용량 확인...\n');
    
    const analyzer = new YouTubeChannelAnalyzer();
    const usage = analyzer.usageTracker.getYouTubeUsage();
    
    console.log('YouTube API 사용 현황:');
    console.log(`- 영상: ${usage.videos}회`);
    console.log(`- 검색: ${usage.search}회`);
    console.log(`- 채널: ${usage.channels}회`);
    console.log(`- 댓글: ${usage.comments}회`);
    console.log(`- 총 사용: ${usage.total}회`);
    console.log(`- 남은 할당량: ${usage.remaining}회`);
    console.log(`- 사용률: ${usage.percentage}%`);

  } catch (error) {
    console.error('❌ 사용량 확인 실패:', error.message);
  }
}

/**
 * 기존 채널 분석 업데이트
 */
async function updateExistingChannelAnalysis(channelName) {
  try {
    console.log(`🔄 기존 채널 "${channelName}" 분석 업데이트...\n`);

    const model = ChannelModel.getInstance();
    await new Promise(resolve => setTimeout(resolve, 2000));

    const channels = await model.getAll();
    const channel = channels.find(ch => 
      ch.name.toLowerCase().includes(channelName.toLowerCase())
    );

    if (!channel) {
      console.log(`❌ 채널 "${channelName}"을 찾을 수 없습니다.`);
      return;
    }

    console.log(`찾은 채널: ${channel.name} (${channel.id})`);
    console.log('상세 분석 시작...');

    const updatedChannel = await model.createOrUpdateWithAnalysis(
      channel.name, 
      channel.keywords || [], 
      true
    );

    console.log('✅ 분석 업데이트 완료!');
    return updatedChannel;

  } catch (error) {
    console.error('❌ 분석 업데이트 실패:', error.message);
  }
}

// 스크립트 실행
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--quota')) {
    await checkQuotaUsage();
  } else if (args.includes('--update')) {
    const updateIndex = args.indexOf('--update');
    const channelName = args[updateIndex + 1];
    if (channelName) {
      await updateExistingChannelAnalysis(channelName);
    } else {
      console.log('❌ 채널명을 지정해주세요: --update "채널명"');
    }
  } else if (args.length > 0) {
    const channelIdentifier = args[0];
    const keywords = args.slice(1);
    await testChannelAnalysis(channelIdentifier, keywords);
  } else {
    console.log('사용법:');
    console.log('  node scripts/test-channel-analysis.js "채널명" [키워드1] [키워드2]');
    console.log('  node scripts/test-channel-analysis.js --quota');
    console.log('  node scripts/test-channel-analysis.js --update "기존채널명"');
    console.log('');
    console.log('예시:');
    console.log('  node scripts/test-channel-analysis.js "당구개론" "당구" "3쿠션"');
    console.log('  node scripts/test-channel-analysis.js --update "아이빌리"');
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  testChannelAnalysis,
  checkQuotaUsage,
  updateExistingChannelAnalysis
};