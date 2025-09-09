# 🎬 InsightReel 설치 가이드

완전 무료 버전 설치 및 설정 가이드입니다.

## 📋 필요한 것들

- **Node.js** (v16 이상)
- **Chrome 브라우저**
- **Gemini API 키** (Google AI)
- **구글 계정** (스프레드시트용)

## 🚀 1단계: 기본 설치

### 1.1 Node.js 설치
```bash
# Node.js 다운로드: https://nodejs.org/
# 설치 확인
node --version
npm --version
```

### 1.2 프로젝트 의존성 설치
```bash
cd "InsightReel"
npm install
```

## 🤖 2단계: Gemini API 설정

### 2.1 Gemini API 키 발급
1. [Google AI Studio](https://aistudio.google.com/app/apikey) 접속
2. "Create API Key" 클릭
3. API 키 복사
4. `.env` 파일에 설정:

```bash
# .env 파일 생성
cp .env.example .env
```

```env
# Gemini API 설정
USE_GEMINI=true
GOOGLE_API_KEY=your-gemini-api-key-here
```

### 2.2 테스트
```bash
# API 키 확인
echo $GOOGLE_API_KEY

# 서버에서 테스트
curl "http://localhost:3000/health"
```

## 📊 3단계: 구글 시트 설정

### 방법 1: 서비스 계정 (추천)

1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 또는 선택
3. APIs & Services → Library에서 "Google Sheets API" 활성화
4. APIs & Services → Credentials에서 서비스 계정 생성
5. 서비스 계정 키 다운로드 (JSON)
6. JSON 내용을 `.env` 파일에 설정:

```bash
# .env 파일 생성
cp .env.example .env
```

```env
# Gemini API
USE_GEMINI=true
GOOGLE_API_KEY=your-gemini-api-key-here

# Google Sheets
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"your-project"...}
```

### 방법 2: OAuth (대안)

1. Google Cloud Console에서 OAuth 2.0 클라이언트 ID 생성
2. `credentials.json` 파일을 `config/` 폴더에 저장
3. 최초 실행 시 브라우저에서 인증 진행

## 🔧 4단계: 서버 실행

```bash
# 서버 시작
npm run dev

# 브라우저에서 확인
# http://localhost:3000/health
```

성공하면 다음과 같이 표시됩니다:
```
🎬 InsightReel 서버 실행중
📍 포트: 3000
🌐 URL: http://localhost:3000
```

## 🌐 5단계: Chrome 확장프로그램 설치

1. Chrome 브라우저 열기
2. 주소창에 `chrome://extensions/` 입력
3. "개발자 모드" 활성화 (우상단 토글)
4. "압축해제된 확장 프로그램을 로드합니다." 클릭
5. `extension` 폴더 선택
6. 확장프로그램이 설치되면 완료! 🎉

## ✅ 6단계: 작동 확인

### 6.1 서버 연결 테스트
1. 확장프로그램 아이콘 클릭
2. "연결 테스트" 버튼 클릭
3. 모든 항목이 ✅ 표시되는지 확인

### 6.2 실제 사용 테스트
1. [Instagram](https://www.instagram.com) 또는 [TikTok](https://www.tiktok.com) 접속
2. 영상 게시물에서 "💾 저장 & 분석" 버튼 확인
3. 버튼 클릭하여 테스트
4. 구글 스프레드시트에 결과 저장 확인

## 🎯 사용법

### 인스타그램에서
1. 게시물 하단의 좋아요, 댓글 버튼 옆에 "💾 저장 & 분석" 버튼 표시
2. 클릭하면 자동으로 영상 저장 및 AI 분석 시작
3. 완료되면 알림 표시

### 틱톡에서
1. 영상 우측의 좋아요, 공유 버튼 근처에 저장 버튼 표시
2. 클릭하여 저장 및 분석

### 결과 확인
- 확장프로그램 팝업에서 "📊 스프레드시트 열기" 클릭
- 자동 생성된 구글 스프레드시트에서 분석 결과 확인

## 📁 파일 구조

```
InsightReel/
├── downloads/           # 다운로드된 영상
├── downloads/thumbnails/# 썸네일 이미지
├── extension/           # Chrome 확장프로그램
├── server/             # 백엔드 서버
├── config/             # 설정 파일
└── .env               # 환경 변수
```

## 🔧 문제해결

### "Gemini API 연결 실패"
```bash
# API 키 확인
echo $GOOGLE_API_KEY

# 서버 로그 확인
npm run dev
```

### "구글 시트 연결 실패"
- `.env` 파일의 `GOOGLE_SERVICE_ACCOUNT_KEY` 확인
- JSON 형식이 올바른지 확인
- Google Sheets API가 활성화되어 있는지 확인

### "Chrome 확장프로그램 오류"
- 개발자 모드가 활성화되어 있는지 확인
- 확장프로그램 새로고침 (Chrome Extensions 페이지에서)
- 브라우저 콘솔에서 오류 메시지 확인 (F12)

### "영상 다운로드 실패"
- 인터넷 연결 확인
- 해당 플랫폼에서 영상이 공개되어 있는지 확인
- 서버 로그 확인 (`npm run dev` 실행 창에서)

## 🎛️ 고급 설정

### 자동 정리 설정
```env
# .env 파일에 추가
CLEANUP_DAYS=7  # 7일 후 파일 자동 삭제
MAX_FILE_SIZE=50mb  # 최대 파일 크기
```

### AI 분석 설정 변경
```env
# .env에서 설정 변경
# Gemini 모델 옵션: gemini-1.5-flash, gemini-1.5-pro
USE_GEMINI=true
GOOGLE_API_KEY=your-api-key
```

## 💡 팁

1. **처음 사용할 때**: Gemini API 키 설정을 반드시 확인하세요
2. **성능 향상**: Gemini 모델은 클라우드 기반으로 빠른 처리 속도를 제공합니다
3. **저장 공간**: 영상 파일이 계속 쌓이므로 주기적으로 정리해주세요
4. **Gemini API 제한**: 무료 티어에서 일정 한도 내에서 사용 가능합니다

## 🔄 업데이트

```bash
# 프로젝트 업데이트
git pull origin main
npm install

# .env 파일 설정 업데이트 확인
# USE_GEMINI=true
# GOOGLE_API_KEY=your-key
```

이제 InsightReel을 사용할 준비가 완료되었습니다! 🎉