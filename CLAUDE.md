# CLAUDE.md - InsightReel 프로젝트 가이드

## 🚨 **CRITICAL: 코드 표준화 및 상수 시스템 사용 규칙**

### **🎯 현재 문제 상황**
프로젝트에 3가지 다른 패턴이 혼재되어 있음:

1. **✅ 올바른 상수 사용**: `ERROR_CODES.FILE_NOT_FOUND`, `HTTP_STATUS_CODES.NOT_FOUND`
2. **❌ 하드코딩**: `res.status(500)`, `409`, `403` 등
3. **❌ 과도한 FieldMapper**: `[FieldMapper.get('STATUS')]`, `[FieldMapper.get('ERROR')]`

### **📋 기존 상수 시스템 (이미 구축됨)**
- `server/config/api-messages.js`: `HTTP_STATUS_CODES`, `ERROR_CODES`, `API_MESSAGES`
- `server/config/constants.js`: `PLATFORMS`, `TIMEOUTS`, `LIMITS` 등

### **🚨 절대 규칙 (위반 시 시스템 오류 발생)**

#### **1. 상수 시스템 사용 범위**
**✅ 상수 시스템 사용 대상:**
- **HTTP 상태 코드**: `HTTP_STATUS_CODES.FORBIDDEN` (403 대신)
- **에러 코드**: `ERROR_CODES.FILE_NOT_FOUND` (하드코딩 대신)
- **플랫폼**: `PLATFORMS.YOUTUBE` ('YOUTUBE' 대신)
- **시스템 상수**: `TIMEOUTS.API_REQUEST` (30000 대신)

**❌ 직접 사용 대상 (상수 없이):**
- **비즈니스 데이터**: title, views, likes, channelName 등
- **API 응답 기본 필드**: status, data, error, message 등

#### **2. 금지된 패턴들**

**❌ 절대 금지:**
```javascript
// 하드코딩된 상태 코드
res.status(500).json(...)
res.status(403).json(...)

// 과도한 FieldMapper (시스템 필드용)
[FieldMapper.get('STATUS')]: 'error'
[FieldMapper.get('ERROR')]: error.message
[FieldMapper.get('TIMESTAMP')]: new Date()
[FieldMapper.get('ID')]: Date.now()

// 하드코딩된 에러 코드
{ error: 'FILE_NOT_FOUND' }
{ error: 'INTERNAL_SERVER_ERROR' }
```

#### **3. 올바른 표준 패턴**

**✅ HTTP 응답:**
```javascript
const { HTTP_STATUS_CODES, ERROR_CODES } = require('./config/api-messages');

// HTTP 상태 코드
res.status(HTTP_STATUS_CODES.FORBIDDEN).json({
  success: false,
  error: ERROR_CODES.UNAUTHORIZED,
  message: API_MESSAGES.AUTH.FORBIDDEN
});

// 성공 응답
res.status(HTTP_STATUS_CODES.OK).json({
  success: true,
  data: videoData,
  timestamp: new Date()
});
```

**✅ 비즈니스 데이터 (직접 필드명):**
```javascript
// 비디오 데이터
const videoData = {
  title: title,
  channelName: channelName, 
  views: views,
  likes: likes,
  platform: platform
};

// 직접 필드 접근
console.log(video.title);
console.log(video.channelName);
```

**✅ 플랫폼 상수:**
```javascript
const { PLATFORMS } = require('./config/constants');

// 플랫폼 비교
if (video.platform === PLATFORMS.YOUTUBE) {
  // YouTube 처리
}
```

### **🔧 마이그레이션 체크리스트**

#### **1. 즉시 수정 필요한 패턴들:**
- [ ] `res.status(숫자)` → `res.status(HTTP_STATUS_CODES.상수)`
- [ ] `[FieldMapper.get('STATUS')]` → `status` (직접 사용)
- [ ] `[FieldMapper.get('ERROR')]` → `error` (직접 사용) 
- [ ] `[FieldMapper.get('TIMESTAMP')]` → `timestamp` (직접 사용)
- [ ] `[FieldMapper.get('ID')]` → `id` (직접 사용)
- [ ] 하드코딩 에러 → `ERROR_CODES.상수`

#### **2. 파일별 우선순위:**
1. **긴급**: `server/index.js` (가장 많은 혼재)
2. **높음**: `frontend/` 파일들 (과도한 FieldMapper)
3. **높음**: `extension/` 파일들 (과도한 FieldMapper)
4. **보통**: 나머지 서비스 파일들

### **📊 데이터 구조 시스템 (기존 유지)**

**Video 인터페이스 (42개 필드):**
- `VideoCore`: 기본 비디오 정보 (rowNumber, uploadDate, platform, keywords 등)
- `ChannelInfo`: 채널 정보 (channelName, channelUrl, subscribers 등)  
- `AIAnalysis`: AI 분석 결과 (mainCategory, middleCategory, confidence 등)
- `YouTubeSpecific`: YouTube 전용 필드 (youtubeHandle, duration, views 등)
- `SystemMetadata`: 시스템 메타데이터 (collectionTime, timestamp, processedAt 등)

**Channel 인터페이스 (32개 필드):**
- `ChannelCore`: 기본 채널 정보 (id, name, platform, subscribers 등)
- `ChannelAIAnalysis`: AI 분석 결과 (keywords, aiTags, categoryInfo 등)
- `ChannelClusterInfo`: 클러스터링 정보 (clusterIds, suggestedClusters)
- `ChannelStats`: 성과 통계 (totalViews, uploadFrequency, mostViewedVideo 등)
- `ChannelMetadata`: 시스템 정보 (lastAnalyzedAt, analysisVersion 등)
};
```

**프론트엔드 (TypeScript):**
```typescript
// ✅ 타입 안전한 직접 접근
interface VideoData {
  title: string;
  channelName: string;
  views: number;
  likes: number;
  platform: string;
}

const video: VideoData = await fetchVideo();
const channelName = video.channelName;
const views = video.views || 0;

// ✅ UI에서 직접 사용
{video.channelName}
{video.platform}
{video.views}
```

---

## 📋 **필드명 통일 가이드라인 (2025-09-11)**

### **🎯 목표: 모든 필드를 새 인터페이스 표준으로 통일**

**완전 변환 대상**: 31개 파일에서 FieldMapper 및 기존 비표준 필드명 제거

### **📊 비디오 필드 표준 매핑**

#### **🎬 비디오 핵심 정보**
```javascript
title            // 제목
url              // 비디오 URL  
platform         // 플랫폼 ('YOUTUBE', 'INSTAGRAM', 'TIKTOK') - enum 값
uploadDate       // 업로드 날짜
duration         // 영상 길이
description      // 설명
mainCategory     // AI 분석 메인 카테고리
middleCategory   // AI 분석 중간 카테고리
```

#### **📊 통계 정보** 
```javascript
views            // 조회수
likes            // 좋아요  
commentsCount    // 댓글수 (실제 필드명)
shares          // 공유수 (Instagram)
saves           // 저장수 (Instagram)
```

#### **👤 채널 정보**
```javascript
channelName     // 채널명
channelUrl      // 채널 URL
youtubeHandle   // YouTube 핸들 (@username)
subscribers     // 구독자수
```

#### **🏷️ 메타데이터**
```javascript
keywords        // 키워드 배열
hashtags        // 해시태그 배열  
thumbnailUrl    // 썸네일 URL
language        // 언어
```

#### **🔄 시스템 필드**
```javascript
createdAt       // Mongoose 자동 생성 (timestamps: true)
updatedAt       // Mongoose 자동 생성 (timestamps: true)
timestamp       // SystemMetadata - 별도 타임스탬프 필드
collectionTime  // SystemMetadata - 수집 일시
processedAt     // SystemMetadata - 처리 일시
rowNumber       // VideoCore - 시트 행번호
```

### **🗂️ 채널 필드 표준 매핑**

#### **📺 채널 핵심**
```javascript  
id              // 채널 ID
channelName     // 채널명 (실제 필드명)
channelUrl      // 채널 URL (실제 필드명)
platform        // 플랫폼 ('YOUTUBE', 'INSTAGRAM', 'TIKTOK')
description     // 채널 설명
```

#### **📈 채널 통계**
```javascript
subscribers     // 구독자수  
totalViews      // 총 조회수
totalVideos     // 총 영상수
```

### **🔄 변환 규칙**

#### **❌ → ✅ 변환 예시:**
```javascript
// FieldMapper 패턴
video[FieldMapper.get('TITLE')] → video.title
video[FieldMapper.get('CHANNEL_NAME')] → video.channelName
video[FieldMapper.get('VIEWS')] → video.views

// 기존 다른 필드명들  
video.videoTitle → video.title
video.videoUrl → video.url
video.uploadedDate → video.uploadDate
video.channelHandle → video.youtubeHandle
channel.subscriberCount → channel.subscribers
```

### **🚀 작업 우선순위**

#### **🔥 1순위: 핵심 런타임 파일**
- `index.js` - 메인 서버
- `AIAnalyzer.js` - AI 분석
- `VideoProcessor.js` - 비디오 처리
- `SheetsManager.js` - 구글 시트

#### **⚡ 2순위: 서비스 파일들**
- `ChannelAnalysisService.js`
- `YouTubeChannelService.js`
- `VideoDataConverter.js`

#### **📝 3순위: 도구 파일들**
- `scripts/` 폴더 전체 (check-mongodb.js ✅ 완료)
- `utils/` 폴더

### **⚙️ 작업 방법**

1. **150줄씩 나누어 처리**
2. **변환 전후 Grep으로 `FieldMapper` 검색하여 0개 확인**  
3. **서버 재시작하여 동작 확인**
4. **한 파일 완료 후 다음 파일 진행**

### **✅ 완료 현황 (2025-09-11)**
- ✅ **scripts/check-mongodb.js**: FieldMapper 완전 제거 완료

---

### **🎉 현재 상태:**
- ✅ **백엔드**: 새 인터페이스 기반 모델 완료 (VideoModel.js, ChannelAnalysisService.js)
- ⏳ **서비스 레이어**: 31개 파일 필드명 통일 작업 진행 중 (1/31 완료)
- ⏳ **프론트엔드**: FieldMapper 제거 및 직접 필드 접근으로 전환 필요
- ⏳ **Chrome 확장**: 새 구조 적용 필요

### **💡 아키텍처 원칙**
```typescript
// ✅ 새로운 단순한 아키텍처
API Data → TypeScript Interface → UI 직접 사용

// ❌ 기존 복잡한 아키텍처 (제거됨)
API Data → FieldMapper → UI
```

**장점**: 
- 단순성: 복잡한 FieldMapper 제거
- 타입 안전성: TypeScript 네이티브 지원
- 유지보수성: 인터페이스 기반 모듈화
- 성능: 중간 변환 레이어 제거

---

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

### 🚨 **TypeScript 필수 준수 규칙 (절대 금지 사항)**

#### **❌ 절대 사용 금지**
0. as 패턴 사용하지 말 것! (꼭 보고 실천하거라 클로드코드야)

1. **`any` 타입 사용**: 타입 안전성 완전 포기
   ```typescript
   // ❌ 절대 금지
   const data: any = fetchData();
   
   // ✅ 구체적 타입 정의
   interface ApiData { id: number; name: string; }
   const data: ApiData = fetchData();
   ```

2. **`@ts-ignore` 사용**: 타입 에러 숨기기
   ```typescript
   // ❌ 절대 금지
   // @ts-ignore
   const result = someFunction();
   
   // ✅ 타입 단언 또는 가드 사용
   const result = someFunction() as ExpectedType;
   ```

3. **Non-null assertion (`!`) 남용**: undefined/null 에러 위험
   ```typescript
   // ❌ 위험한 사용
   const user = getUser()!.name!;
   
   // ✅ 안전한 체크
   const user = getUser();
   const name = user?.name ?? 'Unknown';
   ```

4. **빈 인터페이스나 `Function` 타입**: 너무 광범위한 타입
   ```typescript
   // ❌ 의미 없는 타입
   interface EmptyInterface {}
   const callback: Function = () => {};
   
   // ✅ 구체적 타입
   interface UserData { id: number; name: string; }
   const callback: (id: number) => string = (id) => `User ${id}`;
   ```

#### **✅ 필수 사용 패턴**
1. **구체적 타입 정의**: 모든 데이터에 명확한 타입
2. **타입 가드 활용**: Union 타입 안전 처리
3. **적절한 타입 단언**: `as unknown as TargetType` 패턴
4. **제네릭 활용**: 재사용 가능한 타입 안전 코드

#### **🎯 프로젝트 특수 사항**
- **새 인터페이스 시스템**: video-types.js, channel-types.js 기반
- **타입 안전성**: TypeScript 네이티브 인터페이스 활용
- **API 응답 타입 정의**: 백엔드 응답 구조 명시적 타입화
- **직접 필드 접근**: 중간 변환층 없이 UI에서 바로 필드 접근

#### **💡 아키텍처 원칙**
```typescript
// ✅ 새로운 단순한 아키텍처
API Data → TypeScript Interface → UI 직접 사용

// ❌ 기존 복잡한 아키텍처 (제거됨)
API Data → FieldMapper → UI
```

**이유**: 
- 단순성: 복잡한 중간 레이어 제거
- 유지보수성 향상 (인터페이스 기반 모듈화)
- 타입 안전성 보장 (컴파일 타임 체크)
- 성능: 런타임 변환 오버헤드 제거

### 2. TypeScript 컴파일러 설정
```json
// tsconfig.json 필수 설정
{
  "compilerOptions": {
    "strict": true,              // 모든 strict 검사 활성화
    "noImplicitAny": true,      // any 추론 금지
    "strictNullChecks": true,   // null/undefined 엄격 체크
    "noImplicitReturns": true,  // 모든 경로에서 return 필수
    "noUnusedLocals": true,     // 사용하지 않는 변수 금지
    "noUnusedParameters": true  // 사용하지 않는 매개변수 경고
  }
}
```

### 3. 필수 구현 패턴

#### **에러 처리 표준**
```javascript
// ✅ 올바른 에러 처리
try {
    await processVideo(videoData);
} catch (error) {
    ServerLogger.error('비디오 처리 실패', {
        videoId: videoData.id,
        platform: videoData.platform,
        error: error.message
    });
    throw new Error(`비디오 처리 실패: ${error.message}`);
}
```

#### **성능 측정 필수**
```javascript
// ✅ 핵심 작업 시 성능 측정
const startTime = performance.now();
const result = await heavyOperation();
PerformanceLogger.log('operation_name', performance.now() - startTime);
```

#### **보안 검증 필수**
```javascript
// ✅ 파일 업로드 시
const allowedTypes = ['video/mp4', 'image/jpeg'];
if (!allowedTypes.includes(file.mimetype)) {
    throw new Error('허용되지 않은 파일 형식');
}

// ✅ URL 검증 시  
const allowedHosts = ['youtube.com', 'instagram.com', 'tiktok.com'];
if (!allowedHosts.some(host => url.includes(host))) {
    throw new Error('허용되지 않은 도메인');
}
```

### 3. 테스트 작성
- 새 기능 추가 시 반드시 테스트 작성
- Mock을 활용한 외부 의존성 격리
- 테스트 설명은 한글로 작성
- `tests/` 폴더 사용, `*.test.js` 형식

### 4. 파일 명명
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

## 🚀 배포 및 운영 가이드

### 배포 전 필수 체크리스트
- [ ] `npm test` 모든 테스트 통과
- [ ] 환경 변수(.env) 설정 확인
- [ ] Google Sheets API 연결 테스트
- [ ] MongoDB 연결 상태 확인
- [ ] FFmpeg 설치 및 경로 확인

### 모니터링 대시보드
```bash
# 시스템 상태 실시간 확인
curl http://localhost:3000/api/stats
curl http://localhost:3000/api/config/health
```

### 문제 해결 가이드
- **비디오 다운로드 실패**: FFmpeg 경로 및 권한 확인
- **AI 분석 오류**: Gemini API 키 및 할당량 확인  
- **Sheets 저장 실패**: 서비스 계정 권한 확인
- **메모리 부족**: 대용량 파일 스트림 처리 확인

---
**Last Updated**: 2025-09-11 (FieldMapper 제거 + 새 인터페이스 시스템 도입)
**Maintainer**: JUNSOOCHO