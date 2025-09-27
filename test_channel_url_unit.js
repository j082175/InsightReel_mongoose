// 채널 URL 생성 기능 단위 테스트
const VideoProcessor = require('./server/services/VideoProcessor');

// VideoProcessor 인스턴스 생성
const processor = new VideoProcessor();

console.log('🔗 채널 URL 생성 기능 단위 테스트\n');

// 테스트 케이스들
const testCases = [
    {
        name: 'Instagram 채널 URL',
        platform: 'INSTAGRAM',
        channelId: 'cristiano',
        expected: 'https://www.instagram.com/cristiano/'
    },
    {
        name: 'Instagram 채널 URL (@포함)',
        platform: 'INSTAGRAM',
        channelId: '@livejn',
        expected: 'https://www.instagram.com/livejn/'
    },
    {
        name: 'TikTok 채널 URL',
        platform: 'TIKTOK',
        channelId: 'cristiano',
        expected: 'https://www.tiktok.com/@cristiano'
    },
    {
        name: 'TikTok 채널 URL (@포함)',
        platform: 'TIKTOK',
        channelId: '@charlidamelio',
        expected: 'https://www.tiktok.com/@charlidamelio'
    },
    {
        name: 'YouTube 채널 URL (customUrl)',
        platform: 'YOUTUBE',
        channelId: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
        customUrl: '@GoogleDevelopers',
        expected: 'https://www.youtube.com/@GoogleDevelopers'
    },
    {
        name: 'YouTube 채널 URL (channelId만)',
        platform: 'YOUTUBE',
        channelId: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
        expected: 'https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw'
    }
];

// 테스트 실행
let passCount = 0;
let totalCount = testCases.length;

testCases.forEach((testCase, index) => {
    console.log(`\n${index + 1}. ${testCase.name}`);
    console.log(`   플랫폼: ${testCase.platform}`);
    console.log(`   채널ID: ${testCase.channelId}`);
    if (testCase.customUrl) {
        console.log(`   CustomURL: ${testCase.customUrl}`);
    }

    try {
        const result = processor.buildChannelUrlByPlatform(
            testCase.platform,
            testCase.channelId,
            testCase.customUrl
        );

        console.log(`   결과: ${result}`);
        console.log(`   예상: ${testCase.expected}`);

        if (result === testCase.expected) {
            console.log('   ✅ 통과');
            passCount++;
        } else {
            console.log('   ❌ 실패');
        }
    } catch (error) {
        console.log(`   ❌ 에러: ${error.message}`);
    }
});

console.log(`\n📊 테스트 결과: ${passCount}/${totalCount} 통과`);

if (passCount === totalCount) {
    console.log('✅ ✅ ✅ 모든 테스트 통과! 채널 URL 생성 기능이 정상 작동합니다 ✅ ✅ ✅');
} else {
    console.log('❌ 일부 테스트 실패');
}

console.log('\n💡 이제 비디오 메타데이터에 channelUrl 필드가 포함됩니다:');
console.log('   - Instagram: https://www.instagram.com/{username}/');
console.log('   - TikTok: https://www.tiktok.com/@{username}');
console.log('   - YouTube: https://www.youtube.com/@{customUrl} 또는 https://www.youtube.com/channel/{channelId}');