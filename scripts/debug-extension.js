/**
 * 🔍 Chrome 확장 디버깅 스크립트
 * 브라우저 콘솔에서 실행하여 확장 상태 확인
 */

console.log('🔍 Chrome 확장 디버깅 시작...');

// 1. 기본 환경 확인
console.log('📍 현재 URL:', window.location.href);
console.log('📍 호스트:', window.location.hostname);
console.log('📍 패스:', window.location.pathname);

// 2. YouTube 페이지 확인
function checkYouTubePage() {
    const isYouTube = window.location.hostname === 'www.youtube.com';
    const isChannelPage = window.location.pathname.includes('/channel/') || 
                         window.location.pathname.includes('/@') || 
                         window.location.pathname.includes('/c/') ||
                         window.location.pathname.includes('/user/');
    
    console.log('📺 YouTube 페이지:', isYouTube ? '✅' : '❌');
    console.log('📺 채널 페이지:', isChannelPage ? '✅' : '❌');
    
    return isYouTube && isChannelPage;
}

// 3. DOM 요소 확인
function checkDOMElements() {
    console.log('\n🔍 DOM 요소 확인:');
    
    // 채널 정보 요소들
    const channelName = document.querySelector('#channel-name, .ytd-channel-name, #text-container h1, #channel-name #text');
    const subscriberCount = document.querySelector('#subscriber-count, .ytd-subscriber-count, #subscriber-count #text');
    const subscribeButton = document.querySelector('#subscribe-button, .ytd-subscribe-button-renderer');
    
    console.log('📺 채널 이름 요소:', channelName ? '✅' : '❌', channelName);
    console.log('👥 구독자 수 요소:', subscriberCount ? '✅' : '❌', subscriberCount);
    console.log('🔔 구독 버튼 요소:', subscribeButton ? '✅' : '❌', subscribeButton);
    
    return { channelName, subscriberCount, subscribeButton };
}

// 4. 확장 스크립트 로드 확인
function checkExtensionScripts() {
    console.log('\n🔍 확장 스크립트 확인:');
    
    // 글로벌 변수 확인
    const hasAnalyzer = window.youtubeChannelAnalyzer;
    const hasCollector = window.youtubeChannelCollector;
    
    console.log('📊 youtubeChannelAnalyzer:', hasAnalyzer ? '✅' : '❌');
    console.log('📊 youtubeChannelCollector:', hasCollector ? '✅' : '❌');
    
    // 기존 버튼 확인
    const existingButton = document.getElementById('youtube-channel-collect-btn');
    console.log('🔘 채널 수집 버튼:', existingButton ? '✅' : '❌', existingButton);
    
    return { hasAnalyzer, hasCollector, existingButton };
}

// 5. 수동으로 버튼 생성 시도
function createTestButton() {
    console.log('\n🧪 테스트 버튼 생성 시도...');
    
    const subscribeButton = document.querySelector('#subscribe-button, .ytd-subscribe-button-renderer');
    if (!subscribeButton) {
        console.log('❌ 구독 버튼을 찾을 수 없어 테스트 버튼 생성 실패');
        return;
    }
    
    // 기존 테스트 버튼 제거
    const existingTest = document.getElementById('test-collect-btn');
    if (existingTest) {
        existingTest.remove();
    }
    
    // 테스트 버튼 생성
    const testButton = document.createElement('button');
    testButton.id = 'test-collect-btn';
    testButton.innerHTML = '🧪 테스트 수집';
    testButton.style.cssText = `
        background: linear-gradient(45deg, #28a745, #20c997);
        color: white;
        border: none;
        border-radius: 18px;
        padding: 10px 16px;
        margin-left: 8px;
        font-weight: 500;
        font-size: 14px;
        cursor: pointer;
        z-index: 9999;
    `;
    
    testButton.addEventListener('click', () => {
        alert('테스트 버튼이 작동합니다!');
        console.log('🧪 테스트 버튼 클릭됨');
    });
    
    const buttonContainer = subscribeButton.parentElement;
    if (buttonContainer) {
        buttonContainer.appendChild(testButton);
        console.log('✅ 테스트 버튼 생성 성공');
    } else {
        console.log('❌ 버튼 컨테이너를 찾을 수 없음');
    }
}

// 6. 전체 디버깅 실행
function runFullDebug() {
    console.log('🔍 전체 디버깅 실행...\n');
    
    const isValidPage = checkYouTubePage();
    const domElements = checkDOMElements();
    const scripts = checkExtensionScripts();
    
    if (isValidPage) {
        console.log('\n✅ YouTube 채널 페이지 확인됨');
        
        if (!scripts.existingButton) {
            console.log('\n🧪 기존 버튼이 없으므로 테스트 버튼 생성');
            createTestButton();
        }
    } else {
        console.log('\n❌ YouTube 채널 페이지가 아님');
    }
    
    return {
        isValidPage,
        domElements,
        scripts
    };
}

// 자동 실행
const debugResult = runFullDebug();

// 결과 요약
console.log('\n📊 디버깅 결과 요약:');
console.log('페이지 유효:', debugResult.isValidPage ? '✅' : '❌');
console.log('DOM 준비:', debugResult.domElements.subscribeButton ? '✅' : '❌');
console.log('확장 로드:', debugResult.scripts.hasAnalyzer || debugResult.scripts.hasCollector ? '✅' : '❌');
console.log('버튼 존재:', debugResult.scripts.existingButton ? '✅' : '❌');

// 글로벌로 함수들 노출 (콘솔에서 재실행 가능)
window.debugExtension = {
    checkYouTubePage,
    checkDOMElements,
    checkExtensionScripts,
    createTestButton,
    runFullDebug
};

console.log('\n💡 콘솔에서 추가 디버깅:');
console.log('- debugExtension.runFullDebug() - 전체 다시 실행');
console.log('- debugExtension.createTestButton() - 테스트 버튼 생성');
console.log('- debugExtension.checkDOMElements() - DOM 요소 확인');