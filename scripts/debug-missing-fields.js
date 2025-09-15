const dotenv = require('dotenv');
const path = require('path');

// .env 파일 로드
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function debugMissingFields() {
    try {
        console.log('🔍 === 누락된 필드 디버깅 시작 ===\n');

        // YouTubeChannelAnalyzer 모의 실행
        const YouTubeChannelAnalyzer = require('../server/services/YouTubeChannelAnalyzer');
        const channelAnalyzer = new YouTubeChannelAnalyzer();

        console.log('📊 YouTubeChannelAnalyzer.analyzeChannelEnhanced 실행...');

        // 실제 채널로 테스트 (API 호출하지 않고 목 데이터 사용)
        try {
            const mockResult = {
                analysis: {
                    dailyUploadRate: 1.5,
                    last7DaysViews: 150000,
                    avgDurationSeconds: 180,
                    avgDurationFormatted: '3분',
                    shortFormRatio: 85,
                    viewsByPeriod: {
                        last7Days: 150000,
                        last30Days: 500000,
                        last90Days: 1200000,
                        lastYear: 5000000
                    },
                    totalVideos: 50,
                    totalViews: 5000000,
                    averageViewsPerVideo: 100000,
                    uploadFrequency: { pattern: 'daily' },
                    mostViewedVideo: { videoId: 'abc123', title: '테스트 영상' }
                },
                enhancedAnalysis: {
                    channelIdentity: {
                        channelTags: ['테스트', '채널'],
                        category: '엔터테인먼트',
                        consistencyLevel: 'high'
                    }
                },
                videosCount: 50
            };

            console.log('✅ 모의 YouTubeChannelAnalyzer 결과:');
            console.log('   - dailyUploadRate:', mockResult.analysis.dailyUploadRate);
            console.log('   - last7DaysViews:', mockResult.analysis.last7DaysViews);
            console.log('   - shortFormRatio:', mockResult.analysis.shortFormRatio);
            console.log('   - viewsByPeriod:', !!mockResult.analysis.viewsByPeriod);

            // routes/channels.js 로직 시뮬레이션
            console.log('\n📋 === routes/channels.js 로직 시뮬레이션 ===');

            const channelData = {
                channelId: 'UC123test',
                name: '테스트 채널',
                url: 'https://youtube.com/@test',
                platform: 'YOUTUBE',
                subscribers: 100000,
                description: '테스트 채널입니다',
                thumbnailUrl: 'https://example.com/thumb.jpg'
            };

            console.log('🔍 초기 channelData 필드:', Object.keys(channelData));

            const contentType = 'shortform';
            const aiResult = mockResult;

            if (contentType === 'shortform' && aiResult.enhancedAnalysis) {
                const { channelIdentity } = aiResult.enhancedAnalysis;

                if (channelIdentity) {
                    channelData.aiTags = channelIdentity.channelTags || [];
                    channelData.keywords = [
                        ...(channelData.keywords || []),
                        ...(channelIdentity.channelTags || [])
                    ];

                    if (channelIdentity.category) {
                        channelData.categoryInfo = {
                            majorCategory: channelIdentity.category,
                            consistencyLevel: channelIdentity.consistencyLevel || 'medium'
                        };
                    }
                }
            }

            // 🔧 수정된 로직: aiResult.analysis 데이터 매핑
            if (aiResult.analysis) {
                console.log('📊 통계 데이터 매핑 시작...');

                channelData.last7DaysViews = aiResult.analysis.last7DaysViews || 0;
                channelData.viewsByPeriod = aiResult.analysis.viewsByPeriod || {};
                channelData.dailyUploadRate = aiResult.analysis.dailyUploadRate || 0;
                channelData.avgDurationSeconds = aiResult.analysis.avgDurationSeconds || 0;
                channelData.shortFormRatio = aiResult.analysis.shortFormRatio || 0;

                const shortFormRatio = aiResult.analysis.shortFormRatio || 0;
                channelData.contentType = shortFormRatio > 70 ? 'shortform' :
                                        shortFormRatio < 30 ? 'longform' : 'mixed';

                console.log('✅ 통계 데이터 매핑 완료');
            }

            console.log('\n🔍 AI 분석 후 channelData 필드:', Object.keys(channelData));
            console.log('❌ 누락된 필드들:');
            console.log('   - last7DaysViews:', channelData.last7DaysViews || '누락');
            console.log('   - viewsByPeriod:', channelData.viewsByPeriod || '누락');
            console.log('   - contentType:', channelData.contentType || '누락');
            console.log('   - dailyUploadRate:', channelData.dailyUploadRate || '누락');

            console.log('\n💡 === 해결 방안 ===');
            console.log('routes/channels.js에서 aiResult.analysis 데이터를 channelData에 병합해야 함:');
            console.log('channelData.last7DaysViews = aiResult.analysis.last7DaysViews;');
            console.log('channelData.viewsByPeriod = aiResult.analysis.viewsByPeriod;');
            console.log('channelData.contentType = aiResult.analysis.shortFormRatio > 70 ? "shortform" : "mixed";');

        } catch (error) {
            console.error('❌ 테스트 실행 실패:', error.message);
        }

    } catch (error) {
        console.error('❌ 디버깅 실패:', error.message);
    }
}

debugMissingFields();