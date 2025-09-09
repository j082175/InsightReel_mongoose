# CLAUDE.md - InsightReel 프로젝트 가이드

## 🎯 프로젝트 개요
이 프로젝트는 소셜미디어(Instagram, TikTok 등) 비디오를 자동으로 다운로드하고, AI를 통해 분석한 후 Google Sheets에 저장하는 시스템입니다.

## 🏗️ 프로젝트 구조
```
InsightReel/
├── server/               # 백엔드 서버 (Express)
├── extension/            # Chrome 확장 프로그램
├── prototype/            # 대시보드 (HTML & React)
├── scripts/              # 유틸리티 스크립트
├── tests/                # 테스트 코드
└── downloads/            # 비디오 저장소
```

## 💻 주요 명령어
```bash
# 개발 서버 실행 (nodemon - 자동 재시작)
npm run dev

# 프로덕션 서버 실행
npm start

# 테스트 실행
npm test               # 모든 테스트
npm run test:unit      # 단위 테스트만
npm run test:watch     # 파일 변경 감지 모드
npm run test:coverage  # 코드 커버리지 포함
```

## 🔧 개발 시 주의사항

### 1. 외부 의존성
- **Gemini API**: Google API 키 필요
- **FFmpeg**: 시스템에 설치되어 있어야 함
- **Google Sheets API**: 인증 토큰 또는 서비스 계정 키 필요

### 2. 환경 변수 (.env)
```bash
# AI 설정 (Gemini)
USE_GEMINI=true
GOOGLE_API_KEY=your-gemini-key
USE_GEMINI_FLASH_LITE=true  # Gemini 2.5 Flash Lite 모델 사용

# 동적 카테고리 시스템
USE_DYNAMIC_CATEGORIES=true

# 자가 학습 카테고리 시스템 (일관성 개선)
USE_SELF_LEARNING_CATEGORIES=true

# Google Sheets
GOOGLE_SPREADSHEET_ID=your-spreadsheet-id
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# MongoDB
MONGODB_URI=mongodb://localhost:27017/InsightReel

# YouTube API
YOUTUBE_API_KEY=your-youtube-api-key

# 서버 설정
PORT=3000
```

### 3. 플랫폼별 설정
- **YouTube**: 15개 카테고리 체계
- **TikTok/Instagram**: 12개 카테고리 체계
- **한글 처리**: 형태소 분석 지원

## 📝 코딩 컨벤션

### 1. 일반 규칙
- **주석**: 한글 사용 권장
- **에러 처리**: try-catch 블록 일관되게 사용
- **로깅**: ServerLogger 사용 (console.log 직접 사용 금지)
- **성능 측정**: PerformanceLogger 클래스 활용
- **비동기**: async/await 패턴 사용

### 2. 테스트 작성
- 새 기능 추가 시 반드시 테스트 작성
- Mock을 활용한 외부 의존성 격리
- 테스트 설명은 한글로 작성

### 3. 파일 명명
- 서비스 클래스: PascalCase (예: AIAnalyzer.js)
- 유틸리티: camelCase (예: logger.js)
- 테스트: [대상파일명].test.js

## 📡 API 엔드포인트

### 헬스 체크
- `GET /health` - 서버 상태 확인
- `GET /api/stats` - 통계 정보 조회
- `GET /api/config/health` - 설정 상태 확인

### YouTube 트렌딩 시스템
- `POST /api/collect-trending` - 채널별 트렌딩 영상 수집
- `GET /api/trending-stats` - 트렌딩 수집 통계 조회
- `GET /api/quota-status` - YouTube API 할당량 현황

### 외부 서비스 테스트
- `GET /api/test-sheets` - Google Sheets 연결 테스트

### 비디오 처리
- `POST /api/process-video` - URL로 비디오 처리
- `POST /api/process-video-blob` - Blob 파일로 비디오 처리
- `POST /api/upload` - 파일 업로드

### 데이터 조회
- `GET /api/videos` - 저장된 비디오 목록 조회
- `GET /api/self-learning/stats` - 자가 학습 카테고리 시스템 통계 조회

## 🚀 자주 사용하는 작업

### 대시보드 실행
```bash
cd prototype
npx http-server . -p 8081 --cors
# http://localhost:8081/dashboard.html
```

### 비디오 처리 흐름
1. URL 수신 → 2. 비디오 다운로드 → 3. 썸네일 생성 → 4. AI 분석 → 5. Google Sheets 저장

## 📊 성능 최적화 기준
- **다운로드**: <5초
- **AI 분석**: <15초 (일반), <30초 (복잡)
- **Sheets 저장**: <3초
- **전체 처리**: ⚡<30초, ⏳ 30-60초, 🐌 >60초

## ✅ 최근 변경사항 (2025-09-09)
- **싱글톤 패턴 적용**: UsageTracker, MultiKeyManager, UnifiedGeminiManager, UnifiedCategoryManager 중복 초기화 방지
- **서버 시작 로그 최적화**: 중복 초기화 로그 제거 및 로깅 노이즈 감소
- **메모리 사용량 최적화**: getInstance() 패턴으로 인스턴스 관리 개선
- **개발 환경 안정성 향상**: nodemon과 싱글톤 패턴 조합으로 완전한 개발 경험
- **VideoDataConverter return 문 누락 수정**: "Cannot convert undefined or null to object" 오류 해결
- **HybridDataConverter 데이터 매핑 수정**: 채널 정보 및 댓글 처리 개선

## ✅ 이전 변경사항 (2025-09-08)
- **nodemon 개발 환경 구축**: 파일 변경 시 자동 재시작
- **API 키 로드밸런싱 완전 해결**: 키별 독립적 사용량 추적 시스템
- **메모리 캐시 문제 해결**: 서버 재시작 자동화로 캐시 충돌 방지
- React + TypeScript 대시보드 마이그레이션
- MongoDB 통합 저장 시스템 (UnifiedVideoSaver)

## 🏷️ 주요 클래스
- **DynamicCategoryManager**: 플랫폼별 카테고리 관리
- **UnifiedVideoSaver**: MongoDB + Sheets 동시 저장
- **AIAnalyzer**: Gemini 2.5 Flash Lite 분석
- **VideoProcessor**: 비디오 다운로드/썸네일 생성

## 🔄 개발 환경 관리 (2025-09-08 추가)

### 서버 시작/재시작
```bash
# 개발 모드 (nodemon - 자동 재시작)
npm run dev

# 프로덕션 모드
npm start

# 수동 재시작 (nodemon 터미널에서)
rs + Enter
```

### 개발 시 체크리스트
1. [ ] **파일 변경 시 자동 재시작 확인** (nodemon 활용)
2. [ ] API 엔드포인트 응답 테스트
3. [ ] 브라우저 캐시 새로고침 (Ctrl+F5)
4. [ ] 로그 확인으로 새 코드 로드 검증

### 문제 발생 시 디버깅 순서
1. **nodemon 자동 재시작 확인** (가장 중요!)
2. 포트 충돌 확인 (`netstat -ano | grep :3000`)
3. 메모리 캐시 vs 파일 데이터 일치성 확인
4. 환경변수 로드 상태 점검

### ⚠️ 캐시 문제 방지
- **nodemon 사용**: 파일 변경 시 자동 재시작으로 메모리 캐시 문제 해결
- **개발 환경에서 실시간 파일 읽기**: `disableCache = process.env.NODE_ENV === 'development'`
- **API 키 로드밸런싱**: 키별 독립적 사용량 추적 시스템 구현완료

## 💡 개발 팁
- **개발 시 nodemon 필수**: 메모리 캐시 문제 완전 방지
- **테스트 우선**: `npm test` 후 작업
- **외부 API**: 반드시 Mock 처리
- **디버깅**: ServerLogger 레벨 활용
- **성능**: AI 분석이 대부분 병목
- **CORS**: `npx http-server . -p 8081 --cors`

## 🚨 **중요: FieldMapper 표준화 미완료 사항**

**⚠️ CRITICAL TODO: 모든 파일을 FieldMapper로 통일해야 함!**

### **현재 상황 (2025-09-09)**
- ✅ **완료**: HybridYouTubeExtractor.js, VideoDataConverter.js
- 🔄 **임시 수정**: HybridDataConverter.js (부분적 패치만 적용)
- ❌ **미완료**: 15개 파일에서 여전히 하드코딩된 필드명 사용

### **문제점**
```javascript
// 현재 혼재 상황 (3가지 표준이 공존!)
HybridYouTubeExtractor → FieldMapper.get('SUBSCRIBERS')
HybridDataConverter    → subscriberCount (임시 패치)
SheetsManager.js       → metadata.subscribers
index.js              → youtubeInfo.subscribers
models/Video.js       → metadata.likes
```

### **해결해야 할 파일 목록**
```
server/index.js (subscribers, channelVideos 등)
server/models/Video.js (likes, views, subscribers 등)
server/services/SheetsManager.js (15개 하드코딩 필드)
server/routes/channel-queue.js
server/services/ChannelAnalysisQueue.js
```

### **완전한 표준화 계획**
1. **1단계**: 모든 하드코딩된 필드명을 FieldMapper로 변경
2. **2단계**: HybridDataConverter를 완전히 FieldMapper 기반으로 재작성
3. **3단계**: 레거시 호환성 레이어 제거
4. **4단계**: 전체 테스트 및 검증

**⚠️ 이 작업을 하지 않으면 계속해서 데이터 매핑 버그가 발생할 것입니다!**

## ⚠️ **CRITICAL: 하드코딩 절대 금지 규칙**

### 🚫 **절대 하드코딩하면 안 되는 것들:**
1. **언어 정보**: `language: 'ko'` ❌ → YouTube API의 `defaultLanguage` 사용 ✅
2. **카테고리 매치율**: `categoryMatchRate: '95%'` ❌ → 실제 계산된 값 사용 ✅ 
3. **매치 타입/사유**: `matchType: 'ai-analysis'` ❌ → 실제 분석 결과 사용 ✅
4. **플레이스홀더 텍스트**: `'실제 AI 분석 내용'` ❌ → 실제 AI 분석 또는 null ✅

### ✅ **올바른 대안:**
```javascript
// ❌ 잘못된 예시 (하드코딩)
language: 'ko',
categoryMatchRate: '95%',
matchType: 'ai-analysis'

// ✅ 올바른 예시 (실제 데이터)
language: youtubeInfo?.defaultLanguage || youtubeInfo?.defaultAudioLanguage || null,
categoryMatchRate: actualMatchRate ? `${actualMatchRate}%` : null,
matchType: analysis.source === 'ai' ? 'ai-analysis' : analysis.source
```

### 🔧 **데이터가 없을 때 대처법:**
- **null 또는 undefined 사용**: 빈 값은 그대로 두기
- **실제 계산**: 가능한 경우 다른 데이터로부터 계산
- **조건부 생성**: 실제 조건에 따른 동적 생성
- **절대 임의 값 생성 금지!**

## 🔍 주요 규칙

### 코드 정리 및 리팩토링 규칙
1. **테스트 스크립트 관리**
   - 모든 테스트 및 유틸리티 스크립트는 `scripts/` 폴더로 이동
   - 루트 디렉토리에 테스트 파일 생성 금지
   - 명명 규칙: `test-*.js`, `check-*.js`, `clear-*.js` 등

2. **모델 중앙화**
   - 데이터 모델은 `server/models/` 폴더에 통합
   - UnifiedVideoSaver가 모든 저장 로직 처리
   - Google Sheets와 MongoDB 동시 저장 보장

3. **API 버전 관리**
   - Gemini API: 2.5 Flash Lite 모델 사용
   - YouTube Data API v3 사용
   - 모든 API 키는 환경 변수로 관리

4. **성능 최적화 원칙**
   - 비동기 작업은 Promise.all() 활용
   - 캐싱 적극 활용 (특히 AI 분석 결과)
   - 배치 처리 우선 (Google Sheets 업데이트)

### 대시보드 개발 규칙
1. **React 대시보드 우선**
   - 새 기능은 React 대시보드에만 추가
   - HTML 대시보드는 레거시로 유지
   - TypeScript 필수 사용

2. **컴포넌트 구조**
   - 기능별 컴포넌트 분리
   - Custom Hook 적극 활용
   - Context API로 전역 상태 관리

3. **스타일링**
   - Tailwind CSS 사용
   - 반응형 디자인 필수
   - 다크모드 지원 고려

### 테스트 작성 규칙
1. **위치**: `tests/` 폴더 사용
2. **명명**: `*.test.js` 형식
3. **커버리지**: 신규 기능은 80% 이상
4. **Mock**: 외부 API는 반드시 Mock 처리

### Git 커밋 규칙
1. **형식**: `type: description`
2. **타입**:
   - `feat`: 새 기능
   - `fix`: 버그 수정
   - `refactor`: 코드 개선
   - `docs`: 문서 업데이트
   - `test`: 테스트 추가/수정
3. **브랜치**: `working-properly-version` 사용

---

**Last Updated**: 2025-09-09 (싱글톤 패턴 적용으로 서버 초기화 최적화)
**Maintainer**: JUNSOOCHO
**License**: MIT