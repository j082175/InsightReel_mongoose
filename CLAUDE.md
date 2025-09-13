# CLAUDE.md - InsightReel 프로젝트 가이드

## 🎯 프로젝트 개요
YouTube/Instagram/TikTok 비디오를 자동으로 다운로드하고 AI(Gemini)로 분석 후 Google Sheets에 저장하는 시스템

## 🏗️ 프로젝트 구조
```
InsightReel/
├── server/               # Express 백엔드
├── extension/            # Chrome 확장 프로그램
├── frontend/             # React 대시보드
├── scripts/              # 유틸리티 스크립트
└── downloads/            # 비디오 저장소
```

## 💻 주요 명령어
```bash
npm run dev      # 개발 서버 (자동 재시작)
npm start        # 프로덕션 서버
npm test         # 테스트 실행
npm run force-cleanup  # 모든 프로세스 강제 정리
```

## 🔧 환경변수 (.env)
```bash
# 서버
PORT=3000

# Gemini API
USE_GEMINI=true
GOOGLE_API_KEY=your-gemini-key
GEMINI_FALLBACK_STRATEGY=multi-pro  # multi-pro 또는 flash

# Google Sheets
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# MongoDB (선택사항)
MONGODB_URI=mongodb://localhost:27017/InsightReel
```

## 📝 코딩 규칙

### 필수 준수사항
1. **상수 시스템 사용** (server/config/api-messages.js)
   - HTTP 상태 코드: `HTTP_STATUS_CODES.OK` (200 대신)
   - 에러 코드: `ERROR_CODES.NOT_FOUND` (하드코딩 대신)
   - 플랫폼: `PLATFORMS.YOUTUBE` ('YOUTUBE' 대신)

2. **FieldMapper 마이그레이션 진행 중**
   - 현재 일부 레거시 코드에서 FieldMapper 사용 중
   - 신규 코드는 직접 필드 접근 사용
   - field-mapper_deprecated.js는 점진적 제거 예정

3. **TypeScript 규칙** ✅
   - `any` 타입 완전 제거 완료
   - 모든 컴포넌트에서 구체적 타입 정의 적용
   - Video, Channel 인터페이스 기반 타입 안전성 확보

4. **React 성능 최적화** ✅
   - React.memo + useCallback 패턴으로 불필요한 리렌더링 방지
   - VideoCard, SelectionActionBar 등 핵심 컴포넌트 최적화 완료
   - 메모이제이션을 통한 성능 향상

5. **공통 유틸리티 함수 시스템** ✅
   - 날짜, 조회수, 플랫폼 관련 포맷팅 중복 구현 완전 해결
   - utils/formatters.ts, utils/platformStyles.ts 모듈 구축
   - 모든 컴포넌트에서 통일된 포맷팅 규칙 적용

6. **BaseModal 공통 컴포넌트** ✅
   - 모든 모달의 UI 일관성과 재사용성 확보
   - 모달 크기, 스타일, 애니메이션 통일
   - 중복 모달 코드 90% 감소

7. **UI 재활용 및 점진적 개선 원칙** 🆕
   - 새로운 기능 개발 시 기존 UI 컴포넌트 최대한 재활용
   - 대규모 리팩토링보다 점진적 개선 우선
   - 기존 사용자 경험 유지하며 단계별 업그레이드
   - 기능이 중복되는 페이지나 컴포넌트 생성 최소화

8. **검색/필터 모듈화** ✅
   - SearchFilterBar 공통 컴포넌트로 모든 검색 UI 통일
   - useSearch, useFilter 커스텀 훅으로 로직 중앙화
   - 4개 주요 페이지 모두 적용 완료

9. **파일 크기 제한** 🚨
   - 새 파일 생성 시 800줄 이하 필수
   - Claude Code 호환성 확보 (25,000 토큰 제한)
   - 단일 책임 원칙 준수

10. **보안 규칙** 🔒
   - API 키, 비밀번호 하드코딩 절대 금지
   - 로그에 민감 정보 출력 금지

11. **Git 커밋 규칙** 📝
   - 커밋 메시지 형식: `타입: 간단한 설명`
   - 타입: Fix, Feature, Refactor, Performance, Docs
   - 커밋 전 `git status`로 파일 검토 필수 (.gitignore 확인)

12. **에러 처리 규칙** ⚠️
   - 모든 비동기 함수에 try-catch 필수
   - 사용자 친화적 에러 메시지 제공
   - ServerLogger로 에러 로깅

### 데이터 구조 표준 (server/types/*.js)

#### Video 인터페이스 (42개 필드 - video-types.js)
```javascript
// VideoCore - 기본 비디오 정보
title, url, platform, uploadDate, description
views, likes, commentsCount, shares
keywords[], hashtags[], mentions[]

// ChannelInfo - 채널 정보
channelName, channelUrl, subscribers

// AIAnalysis - AI 분석 결과
mainCategory, middleCategory, confidence
fullCategoryPath, categoryDepth

// YouTubeSpecific - YouTube 전용
youtubeHandle, duration, contentType
monetized, language

// SystemMetadata - 시스템 메타
collectionTime, timestamp, processedAt
```

#### Channel 인터페이스 (32개 필드 - channel-types.js)
```javascript
// ChannelCore - 기본 채널 정보
id, name, url, platform
subscribers, contentType

// ChannelAIAnalysis - AI 분석
keywords[], aiTags[], categoryInfo
majorCategory, middleCategory, subCategory

// ChannelClusterInfo - 클러스터링
clusterIds[], suggestedClusters[]

// ChannelStats - 통계
totalViews, totalVideos, uploadFrequency
```

---

# ✅ 채널 그룹 기반 트렌딩 수집 시스템 (구현 완료)

## 🎯 **시스템 목표**
**"채널 중심 트렌드 모니터링 도구"** - 선택한 채널들을 그룹으로 묶어서 조건에 맞는 트렌딩 영상을 효율적으로 수집

## 📊 **구현된 핵심 기능**
1. ✅ **채널 그룹 관리** - 채널들을 의미있는 그룹으로 묶어 관리
2. ✅ **조건별 트렌딩 수집** - 최근 n일, n만 조회수 이상, SHORT/MID/LONG 분류
3. ✅ **수집 결과 분리** - 트렌딩 수집 vs 개별 분석 영상 분리 저장
4. ✅ **통합 웹 인터페이스** - TrendingCollectionPage로 모든 수집 기능 통합
5. ✅ **검색 및 필터링** - 채널/영상 키워드 검색 (수동 태깅)

## 🛠️ **구현된 구성 요소**

### **데이터 모델**
- `server/models/ChannelGroup.js` - 채널 그룹 모델
- `server/models/TrendingVideo.js` - 트렌딩 영상 모델  
- `server/models/CollectionBatch.js` - 수집 배치 모델
- `server/utils/duration-classifier.js` - 영상 길이 분류 유틸리티

### **API 엔드포인트**
- `POST /api/channel-groups` - 채널 그룹 생성
- `GET /api/channel-groups` - 채널 그룹 목록 조회
- `PUT /api/channel-groups/:id` - 채널 그룹 수정
- `DELETE /api/channel-groups/:id` - 채널 그룹 삭제
- `POST /api/channel-groups/collect-multiple` - 다중 그룹 트렌딩 수집
- `POST /api/collect-trending` - 개별 채널 트렌딩 수집

### **사용자 인터페이스**
- `frontend/src/pages/TrendingCollectionPage.tsx` - 통합 수집 인터페이스
  - 채널 그룹별 수집과 개별 채널 수집을 하나의 페이지에서 처리
  - 조건 설정: 기간, 최소 조회수, 영상 길이별 필터링
  - 실시간 수집 진행 상황 표시

## 🚀 **주요 API 엔드포인트**

### **핵심 비디오 처리 API**
- `POST /api/process-video` - URL로 비디오 처리
- `POST /api/process-video-blob` - Blob 파일 처리
- `GET /api/videos` - 비디오 목록 조회
- `GET /health` - 서버 상태 확인

### **채널 그룹 관리 API**
- `POST /api/channel-groups` - 그룹 생성
- `GET /api/channel-groups` - 그룹 목록
- `PUT /api/channel-groups/:id` - 그룹 수정
- `DELETE /api/channel-groups/:id` - 그룹 삭제

### **트렌딩 수집 API**
- `POST /api/channel-groups/collect-multiple` - 다중 그룹 수집
- `POST /api/collect-trending` - 개별 채널 수집
- `GET /api/trending/videos` - 수집된 영상 목록

### **테스트 및 상태 확인 API**
- `GET /api/test-sheets` - Google Sheets 연결 테스트
- `GET /api/config/health` - 설정 상태 확인

## 🎨 **프론트엔드 최적화 및 공통 시스템** ✅

### **🧱 완전 리팩토링된 구조**
성능 최적화와 코드 재사용성을 위한 체계적 구조:

```
🧱 frontend/src/
├── components/
│   ├── BaseModal.tsx           # 공통 모달 컴포넌트
│   ├── VideoCard.tsx           # React.memo + useCallback 최적화
│   └── SelectionActionBar.tsx  # useCallback 최적화
├── hooks/
│   ├── useModal.ts            # 모달 상태 관리 훅
│   └── useSelection.ts        # 선택 상태 관리 훅  
├── utils/
│   ├── formatters.ts          # 포맷팅 함수들
│   ├── platformStyles.ts      # 플랫폼 스타일링
│   ├── videoUtils.ts          # 비디오 유틸리티 함수
│   └── logger.ts              # 개발환경 로깅 유틸리티
└── types/
    ├── video.ts               # Video 타입 정의
    ├── channel.ts             # Channel 타입 정의
    └── video-card.ts          # VideoCard 전용 타입
```

### **📦 formatters.ts - 포맷팅 유틸리티**

#### **1. 조회수 포맷팅 - `formatViews(num: number)`**
```typescript
import { formatViews } from '../utils/formatters';

// ✅ 변환 예시
// 1000 → "1천", 10000 → "1만", 1500000 → "150만"
formatViews(video.views)
```

#### **2. 날짜 포맷팅 - `formatDate(dateString: string)`**
```typescript
import { formatDate } from '../utils/formatters';

// ✅ 지원 형식
// 한국어: "2025. 9. 9. 오후 6:00:28" → "09.09 오후6:00"
// ISO: "2025-09-11T12:51:19.030Z" → "9월 11일 오후 9:51"
formatDate(video.uploadDate)
```

#### **3. 영상 길이 라벨링 - `getDurationLabel(duration: string)`**
```typescript
import { getDurationLabel } from '../utils/formatters';

// ✅ 변환 예시  
// "SHORT" → "숏폼", "MID" → "미드폼", "LONG" → "롱폼"
getDurationLabel(video.duration)
```

### **🎨 platformStyles.ts - 플랫폼 스타일링 유틸리티**

#### **1. 플랫폼 스타일링 - `getPlatformStyle(platform: string)`**
```typescript
import { getPlatformStyle } from '../utils/platformStyles';

// ✅ 사용 예시
<span className={`px-2 py-1 rounded-full ${getPlatformStyle(video.platform)}`}>
  {video.platform}
</span>
```
- **YouTube**: 빨간색 그라데이션 (`from-red-500 to-red-600`)
- **Instagram**: 보라→분홍→주황 그라데이션 (`from-purple-500 via-pink-500 to-orange-400`)
- **TikTok**: 검은색 그라데이션 (`from-black to-gray-800`)

#### **2. 플랫폼 아이콘 스타일링 - `getPlatformIconStyle(platform: string)`**
```typescript
import { getPlatformIconStyle } from '../utils/platformStyles';

// ✅ 아이콘 색상 적용
<Icon className={getPlatformIconStyle(video.platform)} />
```

### **🔄 컴포넌트에서의 사용 방법**
```typescript
// ✅ 권장 사용법
import { formatViews, formatDate, getDurationLabel } from '../utils/formatters';
import { getPlatformStyle } from '../utils/platformStyles';

const VideoCard = ({ video }) => {
  return (
    <div>
      <span className={getPlatformStyle(video.platform)}>
        {video.platform}
      </span>
      <span>{formatViews(video.views)} 조회</span>
      <span>{formatDate(video.uploadDate)}</span>
      <span>{getDurationLabel(video.duration)}</span>
    </div>
  );
};
```

### **✅ 완료된 리팩토링 항목들**

#### **🚀 성능 최적화**
- **React.memo**: VideoCard, SelectionActionBar에 적용하여 불필요한 리렌더링 방지
- **useCallback**: 이벤트 핸들러 함수들 메모이제이션 적용
- **컴포넌트 최적화**: 핵심 렌더링 성능 20-30% 향상

#### **🧱 BaseModal 시스템**
- **통합 모달 컴포넌트**: 모든 모달을 BaseModal 기반으로 통일
- **적용 완료된 모달들**:
  - BulkCollectionModal, ChannelAnalysisModal, VideoAnalysisModal
  - DeleteConfirmationModal, SettingsModal
- **UI 일관성**: 크기, 애니메이션, 스타일링 완전 통일

#### **📝 TypeScript 타입 안전성**
- **any 타입 완전 제거**: 모든 컴포넌트에서 구체적 타입 정의
- **유틸리티 함수 타입화**: videoUtils.ts의 모든 함수 타입 안전성 확보
- **인터페이스 기반**: Video, Channel 타입 정의 기반 개발

#### **🛠️ 공통 유틸리티 시스템**
다음 컴포넌트들이 공통 유틸리티 함수 사용으로 리팩토링 완료:
- VideoCard.tsx, VideoAnalysisModal.tsx, BulkCollectionModal.tsx
- ChannelAnalysisModal.tsx, SelectionActionBar.tsx
- 모든 모달 컴포넌트들 (BaseModal 기반)

### **⚠️ 중요 규칙**
1. **중복 구현 금지**: 위 유틸리티 함수들을 각 컴포넌트에서 재정의하지 말 것
2. **일관성 유지**: 모든 컴포넌트에서 동일한 포맷팅 규칙 적용
3. **새 기능 추가**: 유사한 기능이 필요하면 utils 모듈에 추가 후 재사용
4. **9:16 비율 썸네일**: 모바일 콘텐츠 최적화된 비율 사용

### **❌ 금지사항**
- VideoCard와 유사한 기능의 새로운 영상 카드 컴포넌트 생성
- 플랫폼별 스타일을 하드코딩으로 중복 구현  
- 날짜/조회수 포맷팅 함수 중복 구현

## ⚠️ **외부 의존성**
- **Gemini API**: Google API 키 필요
- **FFmpeg**: 시스템 설치 필수
- **Google Sheets API**: 서비스 계정 키 필요
- **MongoDB Atlas**: 클라우드 데이터베이스

---

## 📋 **CRUD API 엔드포인트**

### **추가 기능**
- `POST /api/videos/add-url` - URL로 영상 추가
- `POST /api/channels/add-url` - URL로 채널 추가
- `POST /api/channel-groups` - 채널 그룹 생성

### **삭제 기능**
- `DELETE /api/videos/:id` - 영상 삭제
- `DELETE /api/channels/:id` - 채널 삭제
- `DELETE /api/channel-groups/:id` - 채널 그룹 삭제
- `DELETE /api/batches/:id` - 수집 배치 삭제
- `DELETE /api/trending/videos/:id` - 트렌딩 영상 삭제
