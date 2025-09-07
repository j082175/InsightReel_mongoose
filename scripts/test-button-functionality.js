/**
 * 📊 채널 수집 버튼 기능 테스트 스크립트
 * YouTube 채널 페이지 콘솔에서 실행하여 전체 워크플로우 테스트
 */

console.log('📊 채널 수집 버튼 기능 테스트 시작...');

// 1. 서버 연결 테스트
async function testServerConnection() {
    console.log('🔗 서버 연결 테스트...');
    
    try {
        const healthResponse = await fetch('http://localhost:3000/api/cluster/health');
        const healthData = await healthResponse.json();
        
        if (healthData.success) {
            console.log('✅ 서버 연결 성공!', healthData);
            return true;
        } else {
            console.log('❌ 서버 연결 실패:', healthData);
            return false;
        }
    } catch (error) {
        console.log('❌ 서버 연결 오류:', error.message);
        return false;
    }
}

// 2. 채널 정보 수집 테스트
function collectChannelInfo() {
    console.log('📺 채널 정보 수집 중...');
    
    // 채널명 추출
    const channelNameSelectors = [
        '#channel-name #text',
        '#channel-name span',
        '.ytd-channel-name #text', 
        '.ytd-channel-name span',
        '#text-container h1',
        '[class*="channel-name"] span',
        'h1[class*="channel"]',
        '.ytd-c4-tabbed-header-renderer h1'
    ];
    
    let channelName = '';
    for (const selector of channelNameSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
            channelName = element.textContent.trim();
            console.log(`✅ 채널명 발견: "${channelName}" (선택자: ${selector})`);
            break;
        }
    }
    
    // 구독자 수 추출
    const subscriberSelectors = [
        '#subscriber-count #text',
        '#subscriber-count span',
        '.ytd-subscriber-count #text',
        '.ytd-subscriber-count span',
        '[class*="subscriber"] span'
    ];
    
    let subscriberCount = '';
    for (const selector of subscriberSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent.trim()) {
            subscriberCount = element.textContent.trim();
            console.log(`✅ 구독자 수 발견: "${subscriberCount}" (선택자: ${selector})`);
            break;
        }
    }
    
    const channelInfo = {
        channelName,
        subscriberCount,
        url: window.location.href,
        channelId: extractChannelId(window.location.href)
    };
    
    console.log('📊 수집된 채널 정보:', channelInfo);
    return channelInfo;
}

// 3. 채널 ID 추출
function extractChannelId(url) {
    if (url.includes('/@')) {
        const match = url.match(/@([^/]+)/);
        return match ? match[1] : null;
    } else if (url.includes('/channel/')) {
        const match = url.match(/channel\/([^/]+)/);
        return match ? match[1] : null;
    } else if (url.includes('/c/')) {
        const match = url.match(/\/c\/([^/]+)/);
        return match ? match[1] : null;
    }
    return null;
}

// 4. 채널 수집 API 테스트
async function testChannelCollection(channelInfo, keywords) {
    console.log('📡 채널 수집 API 테스트...');
    
    const requestData = {
        channelData: channelInfo,
        keywords: keywords || ['테스트', '자동수집', '기능테스트']
    };
    
    console.log('📤 전송 데이터:', requestData);
    
    try {
        const response = await fetch('http://localhost:3000/api/cluster/collect-channel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ 채널 수집 성공!', result);
            if (result.suggestions && result.suggestions.length > 0) {
                console.log('💡 클러스터 제안:', result.suggestions);
            }
            return true;
        } else {
            console.log('❌ 채널 수집 실패:', result);
            return false;
        }
    } catch (error) {
        console.log('❌ API 호출 오류:', error.message);
        return false;
    }
}

// 5. 기존 버튼 찾기 및 테스트
function findExistingButton() {
    console.log('🔍 기존 채널 수집 버튼 찾기...');
    
    const existingButton = document.getElementById('youtube-channel-collect-btn');
    if (existingButton) {
        console.log('✅ 기존 버튼 발견!', existingButton);
        
        // 버튼 클릭 시뮬레이션
        console.log('🖱️ 버튼 클릭 시뮬레이션...');
        existingButton.click();
        
        setTimeout(() => {
            console.log('⏰ 클릭 후 3초 경과 - 모달이나 프롬프트가 나타났나요?');
        }, 3000);
        
        return true;
    } else {
        console.log('❌ 기존 버튼을 찾을 수 없음');
        return false;
    }
}

// 6. 전체 테스트 실행
async function runFullTest() {
    console.log('\n🧪 === 전체 기능 테스트 시작 ===\n');
    
    // Step 1: 서버 연결 테스트
    const serverOk = await testServerConnection();
    if (!serverOk) {
        console.log('❌ 서버 연결 실패로 테스트 중단');
        return;
    }
    
    // Step 2: 채널 정보 수집
    const channelInfo = collectChannelInfo();
    if (!channelInfo.channelName) {
        console.log('❌ 채널 정보를 수집할 수 없어 테스트 중단');
        return;
    }
    
    // Step 3: 기존 버튼 찾기
    const buttonExists = findExistingButton();
    
    // Step 4: API 직접 테스트
    console.log('\n📡 API 직접 테스트 실행...');
    const keywords = prompt('테스트용 키워드를 입력하세요 (쉼표로 구분, 엔터 = 기본값):', '테스트,자동수집,기능검증');
    const keywordArray = keywords ? keywords.split(',').map(k => k.trim()) : ['테스트', '자동수집', '기능검증'];
    
    const apiSuccess = await testChannelCollection(channelInfo, keywordArray);
    
    // 결과 요약
    console.log('\n📊 === 테스트 결과 요약 ===');
    console.log('서버 연결:', serverOk ? '✅' : '❌');
    console.log('채널 정보 수집:', channelInfo.channelName ? '✅' : '❌');
    console.log('기존 버튼 존재:', buttonExists ? '✅' : '❌');
    console.log('API 기능:', apiSuccess ? '✅' : '❌');
    
    if (serverOk && channelInfo.channelName && apiSuccess) {
        console.log('\n🎉 모든 테스트 통과! 채널 수집 시스템이 정상 작동합니다.');
        
        if (!buttonExists) {
            console.log('\n💡 기존 버튼이 없으므로 Chrome 확장 프로그램을 확인하세요:');
            console.log('1. chrome://extensions/ 에서 확장이 활성화되어 있는지');
            console.log('2. 페이지를 새로고침해보세요');
            console.log('3. scripts/debug-extension.js를 실행해보세요');
        }
    } else {
        console.log('\n❌ 일부 테스트 실패 - 위의 오류 메시지를 확인하세요');
    }
}

// 개별 함수들을 전역으로 노출 (콘솔에서 개별 실행 가능)
window.channelCollectionTest = {
    testServerConnection,
    collectChannelInfo,
    testChannelCollection,
    findExistingButton,
    runFullTest
};

console.log('\n💡 사용법:');
console.log('- channelCollectionTest.runFullTest() - 전체 테스트 실행');
console.log('- channelCollectionTest.testServerConnection() - 서버 연결만 테스트');
console.log('- channelCollectionTest.collectChannelInfo() - 채널 정보만 수집');
console.log('- channelCollectionTest.findExistingButton() - 버튼 찾기 및 클릭');

// 자동 실행
console.log('\n🚀 3초 후 전체 테스트를 자동 실행합니다...');
console.log('취소하려면 콘솔을 닫거나 페이지를 새로고침하세요.');

setTimeout(() => {
    runFullTest();
}, 3000);