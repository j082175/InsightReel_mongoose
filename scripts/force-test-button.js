/**
 * 🚀 강제 테스트 버튼 생성 스크립트
 * YouTube 채널 페이지에서 콘솔에 붙여넣기하여 즉시 테스트
 */

console.log('🚀 강제 채널 수집 버튼 생성 시작...');

// 1. 기존 테스트 버튼 제거
const existingButtons = document.querySelectorAll('#youtube-channel-collect-btn, #force-test-btn');
existingButtons.forEach(btn => btn.remove());

// 2. 구독 버튼 찾기 (모든 가능한 선택자)
const subscribeSelectors = [
    '#subscribe-button',
    '.ytd-subscribe-button-renderer',
    '[aria-label*="구독"]',
    '[aria-label*="Subscribe"]',
    'button[class*="subscribe"]',
    '#subscribe-button-shape',
    '.ytd-button-renderer[aria-label*="Subscribe"]',
    'ytd-subscribe-button-renderer button',
    '.ytd-subscribe-button-renderer button'
];

let subscribeButton = null;
for (const selector of subscribeSelectors) {
    subscribeButton = document.querySelector(selector);
    if (subscribeButton) {
        console.log(`✅ 구독 버튼 발견! 선택자: ${selector}`);
        break;
    }
}

if (!subscribeButton) {
    console.log('❌ 구독 버튼을 찾을 수 없습니다. 모든 버튼 요소를 검색 중...');
    
    // 모든 버튼을 찾아서 "Subscribe" 또는 "구독" 텍스트가 있는지 확인
    const allButtons = document.querySelectorAll('button');
    for (const btn of allButtons) {
        const text = btn.textContent?.toLowerCase() || '';
        const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
        
        if (text.includes('subscribe') || text.includes('구독') || 
            ariaLabel.includes('subscribe') || ariaLabel.includes('구독')) {
            subscribeButton = btn;
            console.log(`✅ 텍스트로 구독 버튼 발견! 텍스트: "${btn.textContent}"`);
            break;
        }
    }
}

if (!subscribeButton) {
    console.log('❌ 구독 버튼을 찾을 수 없어 임의 위치에 버튼 생성');
    
    // 채널 헤더 영역 찾기
    const headerArea = document.querySelector([
        '.ytd-c4-tabbed-header-renderer',
        '.ytd-channel-header-renderer', 
        '#channel-header',
        '[class*="channel-header"]'
    ].join(', '));
    
    if (headerArea) {
        subscribeButton = headerArea; // 헤더 영역에 추가
        console.log('✅ 채널 헤더 영역 발견 - 여기에 버튼 추가');
    } else {
        console.log('❌ 채널 헤더도 찾을 수 없음 - body에 추가');
        subscribeButton = document.body;
    }
}

// 3. 강제 테스트 버튼 생성
const forceButton = document.createElement('button');
forceButton.id = 'force-test-btn';
forceButton.innerHTML = `
    <span>🚀 강제 테스트 버튼</span>
`;

forceButton.style.cssText = `
    background: linear-gradient(45deg, #28a745, #20c997) !important;
    color: white !important;
    border: none !important;
    border-radius: 18px !important;
    padding: 10px 16px !important;
    margin: 8px !important;
    font-weight: 500 !important;
    font-size: 14px !important;
    cursor: pointer !important;
    display: inline-flex !important;
    align-items: center !important;
    gap: 6px !important;
    transition: all 0.3s ease !important;
    box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3) !important;
    z-index: 9999 !important;
    position: fixed !important;
    top: 20px !important;
    right: 20px !important;
`;

// 4. 클릭 이벤트 추가
forceButton.addEventListener('click', () => {
    console.log('🚀 강제 테스트 버튼 클릭됨!');
    
    // 간단한 채널 정보 수집 테스트
    const channelInfo = {
        url: window.location.href,
        channelName: document.querySelector([
            '#channel-name #text',
            '#channel-name span',
            '.ytd-channel-name span',
            'h1'
        ].join(', '))?.textContent?.trim() || '알 수 없음',
        subscriberCount: document.querySelector([
            '#subscriber-count #text',
            '#subscriber-count span',
            '.ytd-subscriber-count span'
        ].join(', '))?.textContent?.trim() || '알 수 없음'
    };
    
    console.log('📊 수집된 채널 정보:', channelInfo);
    
    // 서버에 테스트 요청
    const keywords = prompt('테스트 키워드를 입력하세요 (쉼표로 구분):', '테스트, 강제실행, 디버그');
    if (keywords) {
        const keywordArray = keywords.split(',').map(k => k.trim());
        
        fetch('http://localhost:3000/api/cluster/collect-channel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                channelData: channelInfo,
                keywords: keywordArray
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('✅ 서버 응답:', data);
            alert('테스트 성공! 콘솔을 확인하세요.');
        })
        .catch(error => {
            console.error('❌ 서버 요청 실패:', error);
            alert('서버 연결 실패: ' + error.message);
        });
    }
});

// 5. 버튼 추가
if (subscribeButton === document.body) {
    document.body.appendChild(forceButton);
} else {
    const container = subscribeButton.parentElement || subscribeButton;
    container.appendChild(forceButton);
}

console.log('✅ 강제 테스트 버튼이 생성되었습니다!');
console.log('📍 위치:', subscribeButton === document.body ? '화면 우상단 고정' : '구독 버튼 근처');
console.log('🎯 버튼을 클릭하여 채널 수집 기능을 테스트하세요!');

// 6. Chrome 확장 로드 상태 확인
setTimeout(() => {
    const hasAnalyzer = window.youtubeChannelAnalyzer;
    console.log('🔍 Chrome 확장 상태:', hasAnalyzer ? '✅ 로드됨' : '❌ 로드 안됨');
    
    if (!hasAnalyzer) {
        console.log('💡 Chrome 확장이 로드되지 않았습니다. 다음을 확인하세요:');
        console.log('1. chrome://extensions/ 에서 확장이 활성화되어 있는지');
        console.log('2. 개발자 모드가 켜져 있는지');
        console.log('3. 확장을 새로고침했는지 (🔄 버튼)');
    }
}, 1000);