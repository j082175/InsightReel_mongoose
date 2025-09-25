/**
 * Instagram vs TikTok 데이터 추출 비교 분석
 * Playwright Browser Automation 방식으로 추출 가능한 데이터 상세 분석
 */

function analyzeInstagramData() {
    console.log('📊 Instagram 브라우저 자동화로 추출 가능한 데이터:\n');

    const instagramProfileData = {
        "기본 메타데이터": {
            title: "페이지 제목",
            ogTitle: "Instagram(@instagram) • Instagram 사진 및 동영상",
            ogDescription: "팔로워 695M명, 팔로잉 243명, 게시물 8,161개 - Instagram(@instagram)님의 Instagram 사진 및 동영상 보기",
            ogImage: "프로필 이미지 URL (고화질)",
            ogUrl: "정규화된 프로필 URL"
        },
        "추출 가능한 정보": {
            "팔로워 수": "Meta description에서 파싱 가능 (예: 695M명)",
            "팔로잉 수": "Meta description에서 파싱 가능 (예: 243명)",
            "게시물 수": "Meta description에서 파싱 가능 (예: 8,161개)",
            "사용자명": "@instagram",
            "프로필 이미지": "고해상도 이미지 URL",
            "JSON 스크립트": "35개의 JSON 스크립트 태그 (추가 파싱 가능)"
        },
        "제한사항": {
            "실시간 인게이지먼트": "로그인 필요",
            "상세 통계": "브라우저 자동화로도 제한적",
            "비공개 계정": "접근 불가"
        }
    };

    const instagramPostData = {
        "기본 메타데이터": {
            title: "Instagram",
            ogTitle: "Instagram의 Carl Pei님 : \"Nothing to see here… 🤖\"",
            ogDescription: "5,628 likes, 87 comments - getpeid - December 16, 2021: \"Nothing to see here… 🤖\"",
            ogImage: "포스트 이미지 URL (고화질)",
            ogUrl: "정규화된 포스트 URL"
        },
        "추출 가능한 정보": {
            "좋아요 수": "Meta description에서 파싱 (5,628 likes)",
            "댓글 수": "Meta description에서 파싱 (87 comments)",
            "작성자": "@getpeid",
            "업로드 날짜": "December 16, 2021",
            "포스트 내용": "Nothing to see here… 🤖",
            "이미지 URL": "고해상도 이미지 URL",
            "JSON 스크립트": "44개의 JSON 스크립트 태그",
            "DOM 구조": "전체 HTML 구조 접근 가능"
        }
    };

    console.log('1️⃣ Instagram 프로필 데이터:');
    console.log(JSON.stringify(instagramProfileData, null, 2));
    console.log('\n2️⃣ Instagram 포스트 데이터:');
    console.log(JSON.stringify(instagramPostData, null, 2));
}

function analyzeTikTokData() {
    console.log('\n📊 TikTok 브라우저 자동화로 추출 가능한 데이터:\n');

    const tiktokProfileData = {
        "기본 메타데이터": {
            title: "charli d'amelio (@charlidamelio) | TikTok",
            ogTitle: "charli d'amelio (@charlidamelio) | TikTok",
            ogDescription: "TikTok (틱톡) 의 charli d'amelio (@charlidamelio) |좋아요 11.9B개.팔로워 156.3M명.charli d'...",
            ogImage: "프로필 이미지 URL",
            ogUrl: "정규화된 프로필 URL"
        },
        "추출 가능한 정보": {
            "좋아요 총합": "Meta description에서 파싱 (11.9B개)",
            "팔로워 수": "Meta description에서 파싱 (156.3M명)",
            "사용자명": "@charlidamelio",
            "닉네임": "charli d'amelio",
            "플랫폼 특화 선택자": "TikTok DOM 구조 접근 가능"
        },
        "TikTok API 대비 제한사항": {
            "비디오 다운로드 URL": "브라우저 자동화로는 추출 어려움",
            "상세 통계": "API 대비 제한적",
            "실시간 데이터": "페이지 로딩 시점 데이터만"
        }
    };

    const tiktokVideoData = {
        "기본 메타데이터": {
            title: "TikTok - Make Your Day",
            ogTitle: "비디오 제목 (DOM에서 추출)",
            ogDescription: "비디오 설명 (제한적)",
            ogImage: "비디오 썸네일 URL"
        },
        "DOM에서 추출 가능한 데이터": {
            "작성자": "[data-e2e=\"browse-video-desc-username\"]",
            "설명": "[data-e2e=\"browse-video-desc\"]",
            "좋아요 수": "[data-e2e=\"browse-like-count\"]",
            "댓글 수": "[data-e2e=\"browse-comment-count\"]",
            "공유 수": "[data-e2e=\"browse-share-count\"]",
            "음악 정보": "[data-e2e=\"browse-sound\"]",
            "비디오 요소": "video 태그 접근"
        },
        "숨겨진 데이터": {
            "__UNIVERSAL_DATA": "스크립트 태그에서 발견 가능",
            "추가 JSON": "여러 스크립트 태그의 구조화된 데이터"
        }
    };

    console.log('1️⃣ TikTok 프로필 데이터:');
    console.log(JSON.stringify(tiktokProfileData, null, 2));
    console.log('\n2️⃣ TikTok 비디오 데이터:');
    console.log(JSON.stringify(tiktokVideoData, null, 2));
}

function compareDataQuality() {
    console.log('\n🔍 데이터 품질 비교 분석:\n');

    const comparison = {
        "Instagram 장점": [
            "Meta 태그에서 풍부한 정보 (팔로워, 좋아요, 댓글 수)",
            "고품질 이미지 URL",
            "구조화된 JSON 스크립트 (35-44개)",
            "정확한 날짜 정보",
            "사용자 정보 상세"
        ],
        "Instagram 한계": [
            "로그인 없이는 제한적",
            "실시간 인게이지먼트 데이터 부족",
            "비공개 계정 접근 불가",
            "API 대비 데이터 신선도 떨어짐"
        ],
        "TikTok 장점": [
            "공개 데이터 접근 용이",
            "플랫폼 특화 선택자 존재",
            "__UNIVERSAL_DATA 접근 가능",
            "브라우저 자동화 친화적"
        ],
        "TikTok 한계": [
            "비디오 다운로드 URL 추출 어려움",
            "TikTok API만큼 풍부하지 않음",
            "Anti-bot 시스템 우회 필요",
            "데이터 구조 변경 위험"
        ],
        "전반적 결론": {
            "Instagram": "메타데이터 품질 높음, API 제한적",
            "TikTok": "API 우수, 브라우저 자동화는 보완적",
            "권장사항": "TikTok은 API 우선, Instagram은 브라우저 자동화"
        }
    };

    console.log(JSON.stringify(comparison, null, 2));
}

function main() {
    console.log('🚀 Instagram vs TikTok 데이터 추출 상세 분석\n');
    console.log('='.repeat(80));

    analyzeInstagramData();
    analyzeTikTokData();
    compareDataQuality();

    console.log('\n' + '='.repeat(80));
    console.log('✅ 분석 완료!');
}

// 스크립트 실행
if (require.main === module) {
    main();
}

module.exports = { analyzeInstagramData, analyzeTikTokData, compareDataQuality };