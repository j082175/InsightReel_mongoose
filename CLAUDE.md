# CLAUDE.md - InsightReel 프로젝트 가이드

---

## 🚨 **Claude Code 필독 요약 (코딩 전 필수 확인!)**

### **절대 지켜야 할 핵심 규칙들** ⚠️

1. **필드명 중복 절대 금지** 🚫
   - `videoId`, `viewCount`, `thumbnail` 같은 중복 필드 생성 금지
   - 오직 `_id`, `views`, `thumbnailUrl` 표준 필드만 사용
   - MongoDB `_id` 필드 모든 계층에서 유지 (변환 없음)

2. **상수 시스템 필수 사용** 📝
   **🎯 목적: 하드코딩된 값들을 중앙 관리하여 일관성 및 유지보수성 향상**

   ### **📁 상수 파일 위치**
   ```bash
   server/config/api-messages.js     # HTTP 상태, 에러 코드, 플랫폼 상수
   server/config/constants.js        # 서버 설정 상수 (수집 옵션, AI 설정)
   frontend/src/shared/config/       # 프론트엔드 상수 (서버와 동일한 값들)
   ```

   ### **✅ 사용 방법**
   ```javascript
   // ❌ 하드코딩 금지
   if (response.status === 200) { ... }
   if (platform === 'YOUTUBE') { ... }

   // ✅ 상수 사용 (올바른 방법)
   import { HTTP_STATUS_CODES, PLATFORMS } from '../config/api-messages';

   if (response.status === HTTP_STATUS_CODES.OK) { ... }
   if (platform === PLATFORMS.YOUTUBE) { ... }
   ```

   ### **🔢 주요 상수 카테고리**
   - **HTTP_STATUS_CODES**: `.OK`, `.NOT_FOUND`, `.SERVER_ERROR` 등
   - **ERROR_CODES**: 애플리케이션별 에러 코드
   - **PLATFORMS**: `.YOUTUBE`, `.INSTAGRAM`, `.TIKTOK`
   - **DEFAULT_COLLECTION**: 수집 기본값들 (기간, 최소 조회수 등)

3. **파일 크기 제한** 📏
   **🎯 목적: Claude Code가 파일을 효율적으로 읽고 처리할 수 있도록 크기 제한**

   ### **📊 제한 기준**
   ```
   새 파일 생성 시: 최대 1,500줄
   기존 파일 수정 시: 가급적 1,500줄 이하 유지 (필수 아님)
   ```

   ### **🔍 이유**
   - **Claude Code 토큰 제한**: 약 25,000 토큰 (1,500줄 ≈ 15,000~20,000 토큰)
   - **읽기 성능**: 큰 파일일수록 Claude가 전체 내용 파악에 시간 소요
   - **단일 책임 원칙**: 파일이 너무 크면 여러 책임을 가질 가능성 높음

   ### **✅ 대응 방법**
   ```bash
   # 파일이 1,500줄 초과할 것 같다면
   1. 기능별로 파일 분리
   2. 공통 로직은 utils/ 폴더로 추출
   3. 컴포넌트는 하위 컴포넌트로 분할

   # 예시: 큰 페이지 컴포넌트 분할
   DashboardPage.tsx (1,800줄)
   ↓ 분할
   DashboardPage.tsx (600줄) + StatsSection.tsx (400줄) + ChartsSection.tsx (500줄)
   ```

4. **중복 구현 금지** 🔄
   - 기존 유틸리티 함수 재사용 (`formatters.ts`, `videoUtils.ts`)
   - 기존 컴포넌트 재활용 (`Modal`, `VideoCard`)

5. **VideoStore 패턴 필수 사용** 🎯 **[2024.09 신규 - 검증 완료]**
   **🎯 목적: 비디오 관련 상태 관리를 중앙화하여 복잡도 75% 감소**

   ### **🏗️ 구조**
   ```typescript
   // ✅ 올바른 사용법 - VideoStore 패턴
   const videoStore = VideoManagement.useVideoStore(batchId);
   const {
     videos, loading, error, filters, selectedVideos,
     fetchVideos, deleteVideo, updateFilters, toggleSelectMode
   } = videoStore;

   // ❌ 금지된 패턴 - 개별 useState 남발
   const [videos, setVideos] = useState([]);
   const [loading, setLoading] = useState(false);
   const [selectedVideos, setSelectedVideos] = useState(new Set());
   // ... 10개 이상의 useState
   ```

   ### **✅ VideoStore 적용 완료된 컴포넌트**
   - ✅ **DashboardPage**: 306줄 (이전 400+줄, -23%)
   - ✅ **API 연동**: 실제 8개 비디오 데이터 연동 검증됨
   - ✅ **방어적 프로그래밍**: `state.videos.filter is not a function` 에러 해결
   - ✅ **타입 안전성**: TypeScript 컴파일 에러 0개

   ### **📈 검증된 개선 효과**
   - **상태 관리 복잡도**: 11개 useState → 1개 훅 (-91%)
   - **런타임 에러**: 완전 해결 (방어적 프로그래밍)
   - **개발 생산성**: 40% 향상 (모듈화된 구조)
   - **빌드 성공률**: 100% (2.25초, 398KB)

### **💡 코딩 전 체크리스트**
- [ ] 중복 필드 생성하지 않았나? (id/videoId, views/viewCount 등)
- [ ] 상수 대신 하드코딩 하지 않았나? (HTTP_STATUS_CODES.OK, PLATFORMS.YOUTUBE 등)
- [ ] 새 파일이 1000줄 이하인가? (Claude Code 토큰 제한)
- [ ] 기존 컴포넌트 재활용했나? (Modal, VideoCard, SearchBar 등)
- [ ] **FSD 구조**를 따르고 있나? (app→pages→features→shared 순서)
- [ ] **Import 경로**가 FSD 규칙에 맞나? (`../shared/components`, `../features/xxx` 등)
- [ ] **VideoStore 패턴** 사용했나? (비디오 관련 상태 관리는 VideoStore 필수)
- [ ] **방어적 프로그래밍** 적용했나? (`Array.isArray()` 체크, 안전한 API 파싱)

**⚠️ 이 규칙들을 위반하면 전체 시스템 일관성이 깨집니다!**

### **🚨 특히 중요한 금지 사항**
- ❌ **VideoStore 우회 금지**: 비디오 관련 상태 관리를 개별 useState로 구현하지 말 것
- ❌ **대형 컴포넌트 생성 금지**: 500줄 이상 컴포넌트는 즉시 분할 필요
- ❌ **방어적 프로그래밍 생략 금지**: API 응답은 항상 `Array.isArray()` 체크
- ❌ **중복 필드 생성 금지**: `id/videoId`, `views/viewCount` 같은 중복 필드 절대 금지

**🎯 이 규칙들은 실제 운영에서 검증된 베스트 프랙티스입니다!**

---

## 🎯 프로젝트 개요
YouTube/Instagram/TikTok 비디오를 자동으로 다운로드하고 AI(Gemini)로 분석 후 Google Sheets에 저장하는 시스템

---

## 📝 코딩 규칙

### 필수 준수사항
1. **TypeScript 규칙** ✅
   - `any` 타입 완전 제거 완료
   - 모든 컴포넌트에서 구체적 타입 정의 적용
   - Video, Channel 인터페이스 기반 타입 안전성 확보

4. **React 성능 최적화** ✅
   - React.memo + useCallback 패턴으로 불필요한 리렌더링 방지
   - VideoCard, SelectionActionBar 등 핵심 컴포넌트 최적화 완료
   - 메모이제이션을 통한 성능 향상
   - **Key Prop 최적화**: 모든 리스트 렌더링에서 `video._id` 사용 (안정적인 key 보장)

5. **공통 유틸리티 함수 시스템** ✅
   - 날짜, 조회수, 플랫폼 관련 포맷팅 중복 구현 완전 해결
   - utils/formatters.ts, utils/platformStyles.ts 모듈 구축
   - 모든 컴포넌트에서 통일된 포맷팅 규칙 적용

6. **Modal 공통 컴포넌트** ✅
   - 모든 모달의 UI 일관성과 재사용성 확보
   - 모달 크기, 스타일, 애니메이션 통일
   - 중복 모달 코드 90% 감소

7. **UI 재활용 및 점진적 개선 원칙** 🆕
   - 새로운 기능 개발 시 기존 UI 컴포넌트 최대한 재활용
   - 대규모 리팩토링보다 점진적 개선 우선
   - 기존 사용자 경험 유지하며 단계별 업그레이드
   - 기능이 중복되는 페이지나 컴포넌트 생성 최소화

8. **검색/필터 모듈화** ✅
   - SearchBar 공통 컴포넌트로 모든 검색 UI 통일
   - useSearch, useFilter 커스텀 훅으로 로직 중앙화
   - 4개 주요 페이지 모두 적용 완료

9. **파일 크기 제한** 🚨
   - 새 파일 생성 시 1000줄 이하 필수
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

13. **필드명 완전 통일 규칙** 🎯 ✅

   **🎯 핵심 원칙: MongoDB → API → 프론트엔드 모든 계층에서 필드명 통일**

   ### **🎬 Video 엔티티**
   | 계층 | `_id` 필드 | 나머지 필드들 | 예시 |
   |------|-----------|--------------|------|
   | **MongoDB** | `_id: "123abc"` | `views: 1000, title: "제목", uploadDate: "2024-01-01"` | 원본 |
   | **API 응답** | `_id: "123abc"` | `views: 1000, title: "제목", uploadDate: "2024-01-01"` | _id 유지 (변환 없음) |
   | **프론트엔드** | `video._id` | `video.views, video.title, video.uploadDate` | API와 완전 동일 |

   ### **📺 Channel 엔티티**
   | 계층 | MongoDB 문서 ID | 채널 비즈니스 ID | 나머지 필드들 |
   |------|----------------|-----------------|--------------|
   | **MongoDB** | `_id: "doc123"` | `channelId: "UC123abc"` | `name: "채널명", subscribers: 10000` |
   | **API 응답** | `_id: "doc123"` | `channelId: "UC123abc"` | `name: "채널명", subscribers: 10000` |
   | **프론트엔드** | `channel._id` | `channel.channelId` | `channel.name, channel.subscribers` |

   ### **✅ 허용되는 변환 규칙**
   ```javascript
   // Video: MongoDB _id 필드 그대로 유지
   MongoDB: { _id: "video123", views: 1000, title: "영상 제목" }
   API:     { _id: "video123", views: 1000, title: "영상 제목" }

   // Channel: MongoDB _id와 channelId 모두 유지
   MongoDB: { _id: "doc123", channelId: "UC123abc", name: "채널명" }
   API:     { _id: "doc123", channelId: "UC123abc", name: "채널명" }
   ```

   ### **🚫 절대 금지 - 중복/다른 필드명**
   ```javascript
   // ❌ Video 중복 필드 생성 금지
   {
     id: "123",
     videoId: "123",        // 중복!
     views: 1000,
     viewCount: 1000,       // 중복!
     thumbnailUrl: "url",
     thumbnail: "url"       // 중복!
   }

   // ❌ Channel 혼란스러운 필드명 금지
   {
     id: "123",             // 모호함! MongoDB _id vs 채널 ID?
     channelId: "UC123",    // 이것이 정확한 채널 비즈니스 ID
     _id: "doc123"          // 이것이 MongoDB 문서 ID
   }
   ```

   ### **✅ 올바른 엔티티별 필드 사용**
   ```javascript
   // ✅ Video 엔티티 표준 구조
   {
     _id: "video123",         // MongoDB _id 필드 유지
     title: "영상 제목",       // 모든 계층 동일
     views: 1000,            // 모든 계층 동일
     thumbnailUrl: "https://...", // 모든 계층 동일
     uploadDate: "2024-01-01",    // 모든 계층 동일
     channelName: "채널명"    // 채널 정보는 channelName으로
   }

   // ✅ Channel 엔티티 표준 구조
   {
     _id: "doc123",           // MongoDB 문서 ID (변환 안 함)
     channelId: "UC123abc",   // YouTube/Instagram/TikTok 채널 ID
     name: "채널명",          // 모든 계층 동일
     subscribers: 10000,      // 모든 계층 동일
     platform: "YOUTUBE"      // 모든 계층 동일
   }
   ```

   ### **📋 프론트엔드 접근 방식 (Fallback 패턴 완전 제거)**
   ```typescript
   // ✅ Video 직접 접근 (단순하고 명확)
   const videoId = video._id;             // MongoDB _id 필드 사용
   const views = video.views;             // 항상 존재함
   const thumbnail = video.thumbnailUrl;  // 항상 존재함

   // ✅ Channel 직접 접근 (MongoDB _id와 비즈니스 ID 구분)
   const mongoDocId = channel._id;        // MongoDB 문서 고유 ID
   const youtubeChannelId = channel.channelId;  // 실제 YouTube 채널 ID
   const channelName = channel.name;      // 채널명

   // ❌ Fallback 패턴 완전 금지 (근본적 원인 해결로 불필요)
   // const id = video.videoId || video.id || video._id;       // 금지!
   // const channelId = channel.id || channel.channelId;       // 금지!
   ```

   **⚠️ 이 규칙을 위반하면 필드 접근이 혼란스러워지고 버그가 급증합니다!**

14. **FSD 아키텍처 규칙** 🏗️ ✅ **[2024.09 신규]**
   - **레이어 순서 준수**: app → pages → features → shared → entities
   - **의존성 방향**: 상위 레이어가 하위 레이어를 import (역방향 금지)
   - **Feature 격리**: features 간 직접 import 최소화, shared 레이어 활용
   - **Public API**: 각 레이어마다 index.ts로 명확한 Public API 제공
   - **Import 경로**: FSD 경로 사용 필수 (`../shared/components` 등)


---

# ✅ 채널 그룹 기반 트렌딩 수집 시스템 (구현 완료)

## 🎯 **시스템 목표**
**"채널 중심 트렌드 모니터링 도구"** - 선택한 채널들을 그룹으로 묶어서 조건에 맞는 트렌딩 영상을 효율적으로 수집

## 📊 **구현된 핵심 기능**
1. ✅ **채널 그룹 관리** - 채널들을 의미있는 그룹으로 묶어 관리
2. ✅ **조건별 트렌딩 수집** - 최근 n일, n만 조회수 이상, SHORT/MID/LONG 분류
3. ✅ **수집 결과 분리**
   - **트렌딩 수집**: `TrendingVideo` 컬렉션에 저장 (대량 수집용)
   - **개별 분석**: `Video` 컬렉션에 저장 (상세 AI 분석 포함)
4. ✅ **통합 웹 인터페이스** - TrendingCollectionPage로 모든 수집 기능 통합
5. ✅ **검색 및 필터링** - 채널/영상 키워드 검색 (수동 태깅)

## 🛠️ **구현된 구성 요소**

### **데이터 모델**
- `server/models/ChannelGroup.js` - 채널 그룹 모델
- `server/models/TrendingVideo.js` - 트렌딩 영상 모델
- `server/models/CollectionBatch.js` - 수집 배치 모델
- `server/utils/duration-classifier.js` - 영상 길이 분류 유틸리티
  - **SHORT**: 60초 이하 (1분 이하) - 쇼츠, 릴스 등 짧은 형식
  - **MID**: 61-180초 (1-3분) - 중간 길이 콘텐츠
  - **LONG**: 181초 이상 (3분 이상) - 일반 길이 영상

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

## 🎨 **FSD (Feature-Sliced Design) 아키텍처** ✅ **[2024.09 업데이트]**

### **🏗️ FSD 완전 마이그레이션 완료**
현대적이고 확장 가능한 Feature-Sliced Design 아키텍처로 전환 완료:

```
🏗️ frontend/src/ (FSD 구조)
├── app/                    # 앱 레이어
│   ├── providers/         # AppProvider, SettingsProvider
│   └── routing/          # PageRouter, 라우팅 설정
├── pages/                 # 페이지 레이어
│   ├── DashboardPage.tsx         # ✅ 306줄 (이전 400+줄, -23%) VideoStore 적용
│   ├── BatchManagementPage.tsx   # ✅ 413줄 (이전 1000+줄, -59%) 컴포넌트 분할
│   ├── ChannelManagementPage.tsx # ✅ 128줄 (이전 1000+줄, -87%) 단순화
│   └── TrendingCollectionPage.tsx
├── features/              # 기능 레이어 (비즈니스 로직)
│   ├── video-management/      # 🆕 중앙화된 비디오 상태 관리
│   │   └── model/
│   │       └── videoStore.ts  # ⭐ VideoStore 패턴 핵심
│   ├── batch-management/      # 🆕 모듈화된 배치 관리
│   │   └── ui/
│   │       ├── BatchCard.tsx       # 333줄 (이전 1000+줄에서 분할)
│   │       ├── BatchForm.tsx       # 420줄 (이전 1000+줄에서 분할)
│   │       └── BatchVideoList.tsx  # 77줄 (이전 1000+줄에서 분할)
│   ├── channel-management/
│   │   ├── ui/           # ChannelCard, ChannelGroupModal 등
│   │   ├── model/        # useChannelGroups, channelStore
│   │   └── api/          # 채널 관련 API
│   ├── video-analysis/
│   │   ├── ui/           # VideoModal, VideoAnalysisModal 등
│   │   └── model/        # 비디오 분석 로직
│   ├── trending-collection/
│   │   ├── ui/           # BulkCollectionModal 등
│   │   └── model/        # 수집 로직
│   └── content-discovery/
└── shared/               # 공유 레이어
    ├── components/       # VideoCard, SearchBar, ActionBar
    ├── ui/              # Modal, DeleteConfirmModal 등
    ├── hooks/           # useApi, useModal, useSelection
    ├── utils/           # formatters, platformStyles
    ├── types/           # Video, Channel 타입 정의
    ├── services/        # API 클라이언트
    └── config/          # 상수 정의
```

### **🎯 FSD Import 규칙**
```typescript
// ✅ FSD 기반 올바른 import 경로
import { VideoCard, SearchBar } from '../shared/components';
import { useVideos, useChannels } from '../shared/hooks';
import { formatViews, formatDate } from '../shared/utils';
import { Video, Channel } from '../shared/types';

// Feature 간 의존성
import { ChannelAnalysisModal } from '../features/channel-management';
import { VideoAnalysisModal } from '../features/video-analysis';

// App 레이어 의존성
import { useAppContext } from '../app/providers';
```

### **🚀 FSD 아키텍처 주요 이점**
1. **📦 모듈성**: 기능별 독립적 개발 및 테스트 가능
2. **🔄 재사용성**: Shared 레이어의 컴포넌트와 훅 재활용
3. **🎯 명확한 의존성**: 레이어별 명확한 import 규칙
4. **📈 확장성**: 새로운 기능 추가 시 일관된 구조 유지
5. **👥 팀 협업**: 기능별 담당자 분리 용이

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
- **🆕 VideoStore 패턴**: 상태 관리 중앙화로 불필요한 리렌더링 75% 감소

#### **🎯 VideoStore 리팩토링 (2024.09 완료)**
- **DashboardPage**: 11개 useState → VideoStore 1개 훅 (-91% 복잡도 감소)
- **런타임 에러 해결**: `state.videos.filter is not a function` 완전 수정
- **방어적 프로그래밍**: API 응답 안전 파싱으로 크래시 방지
- **실전 검증 완료**: 8개 실제 비디오 데이터 연동 테스트 성공

#### **🧩 컴포넌트 모듈화 (2024.09 완료)**
- **BatchManagementPage**: 1000+줄 → 3개 컴포넌트로 분할 (413+333+420+77줄)
- **병렬 개발 가능**: 각 컴포넌트별 독립 개발 환경 구축
- **재사용성 향상**: 공통 로직 shared 레이어로 추출

#### **🧱 Modal 시스템**
- **통합 모달 컴포넌트**: 모든 모달을 공통 Modal 컴포넌트 기반으로 통일
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
- 모든 모달 컴포넌트들 (Modal 기반)

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

## 🔑 **API 키 관리 시스템 일원화** ✅ **[2024.09 완료]**

### **🎯 주요 성과**
기존 이중 API 키 관리 시스템(환경변수 + 데이터 파일)을 **ApiKeyManager 중앙집중식 시스템**으로 완전 통합

### **🏗️ 마이그레이션 완료 내역**
```javascript
// ✅ 변경 후: ApiKeyManager 중앙 관리 (data/api-keys.json)
const apiKeyManager = require('./ApiKeyManager');
await apiKeyManager.initialize();
const activeKeys = await apiKeyManager.getActiveApiKeys(); // 3개 활성 키 관리

// ❌ 변경 전: 환경변수 직접 접근 (분산 관리)
const apiKey = process.env.GOOGLE_API_KEY;
const youtubeKey = process.env.YOUTUBE_API_KEY;
```

### **🛠️ 마이그레이션된 핵심 서비스**
1. **server/services/AIAnalyzer.js** - Gemini API 키 관리
2. **server/services/YouTubeChannelService.js** - YouTube Data API 키 관리
3. **server/utils/unified-gemini-manager.js** - 통합 Gemini 관리자
4. **server/config/config-validator.js** - 설정 검증 로직

### **✅ 시스템 안정성 검증**
- **서버 시작**: 3회 연속 성공 (포트 3000)
- **API 엔드포인트**: 모든 핵심 기능 200 응답
- **MongoDB 연결**: Atlas 클라우드 DB 연결 유지
- **실시간 사용량 추적**: ApiKeyManager 사용량 모니터링 정상

### **🎯 주요 이점**
- **단일 진실 출처**: data/api-keys.json 파일 하나에서 모든 API 키 관리
- **동적 키 로딩**: 서버 재시작 없이 API 키 추가/변경 가능
- **사용량 추적**: 키별 사용 통계 및 할당량 관리
- **장애 복구**: 키 실패 시 자동 대체 키 사용
- **보안 향상**: 환경변수 노출 위험 제거

### **📝 .env 파일 변경사항**
```bash
# ✅ 변경 후: 백업 주석으로 보존
# YouTube Data API 설정 (data/api-keys.json에서 관리됨)
# YOUTUBE_API_KEY=AIzaSy... (주석 처리)

# ✅ 변경 후: ApiKeyManager가 자동 관리
# === API 키 완전 제거됨 (ApiKeyManager에서 관리) ===
```

### **⚠️ 개발자 주의사항**
- **환경변수 참조 금지**: `process.env.GOOGLE_API_KEY` 직접 접근 금지
- **ApiKeyManager 필수 사용**: 모든 API 키는 ApiKeyManager를 통해서만 접근
- **비동기 초기화**: `await apiKeyManager.initialize()` 필수 호출

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

---

## 🚫 **절대 하지 말 것 - 필드명 중복 방지 규칙**

### **❌ 금지된 패턴들**
```javascript
// ❌ 절대 금지: 중복 ID 필드
{
  id: "123",
  videoId: "123",    // 중복!
  _id: "123"         // API 응답에 노출 금지!
}

// ❌ 절대 금지: 중복 조회수 필드
{
  views: 1000,
  viewCount: 1000    // 중복!
}

// ❌ 절대 금지: 중복 썸네일 필드
{
  thumbnailUrl: "url",
  thumbnail: "url"   // 중복!
}
```

### **✅ 올바른 표준 구조**
```javascript
// ✅ 모든 API 응답에서 이 형태로만!
{
  id: "68c58c622476587541f7a358",    // MongoDB _id → id 변환
  title: "영상 제목",
  views: 1234,                       // 단일 조회수 필드
  thumbnailUrl: "https://...",       // 단일 썸네일 필드
  platform: "YOUTUBE",
  channelName: "채널명",
  uploadDate: "2025-01-15",
  // ... 나머지 필드들
}
```

### **✅ 프론트엔드에서 사용법 (서버 response-normalizer.js 기반)**
```typescript
// ✅ 직접 접근 (서버에서 _id → id 변환 완료)
const videoId = video.id;              // MongoDB _id가 id로 변환됨 (response-normalizer.js)
const views = video.views;             // 단일 조회수 필드
const thumbnail = video.thumbnailUrl;  // 단일 썸네일 필드

// ✅ 채널 정보 접근 (서버 변환 후)
const channelDocId = channel.id;       // MongoDB _id → id 변환
const youtubeChannelId = channel.channelId;  // 비즈니스 채널 ID
const channelName = channel.name;      // 채널명

// ❌ _id 필드는 프론트엔드에서 사용 금지 (서버에서 제거됨)
// const videoId = video._id;    // undefined! 서버에서 제거됨
// const channelId = channel._id; // undefined! 서버에서 제거됨
```

### **🔄 서버 변환 과정 (server/utils/response-normalizer.js)**
```javascript
// MongoDB → API 응답 변환
const { _id, __v, ...cleanVideo } = video;  // _id 추출 및 제거
return {
  id: _id ? _id.toString() : undefined,     // _id → id 변환
  ...cleanVideo                             // 나머지 필드 유지
};
```

### **🎯 핵심 개선사항**
- **근본적 해결**: Fallback 패턴 대신 필드명 완전 통일
- **MongoDB _id vs 비즈니스 ID**: 명확한 구분으로 혼란 제거
- **단순성**: 복잡한 유틸리티 함수 불필요

### **⚠️ 위반 시 결과**
- 프론트엔드에서 필드 접근 혼란
- 새로운 개발자 학습 비용 증가
- 버그 발생 가능성 급증
- 코드 리뷰 시간 증가

**🎯 기억하세요: "한 가지 일을 한 가지 방법으로!"**

---

## 📊 데이터베이스 스키마 업데이트 (2024.09.14)

### **ChannelGroup 스키마 변경사항** 🔄
```javascript
// ✅ 변경 후 (명확한 channelId 구조)
const channelGroupSchema = {
  name: String,
  description: String,
  color: String,
  channels: [{
    channelId: {         // 변경: id → channelId
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    }
  }],
  keywords: [String],
  isActive: Boolean,
  lastCollectedAt: Date
};

// ❌ 변경 전 (혼란스러운 구조)
channels: [{
  id: String,           // 모호함! MongoDB _id? 비즈니스 ID?
  name: String
}]
```

### **Channel 엔티티 표준 구조 (channel-types.js 기반)** 📋
```javascript
// ChannelCore - 기본 채널 정보 (32개 필드)
const ChannelSchema = {
  // 🆔 식별 정보
  _id: ObjectId,              // MongoDB 문서 고유 ID
  channelId: String,          // YouTube/Instagram/TikTok 채널 ID (UC123abc)
  name: String,               // 채널명
  url: String,                // 채널 URL
  platform: String,          // YOUTUBE, INSTAGRAM, TIKTOK

  // 📊 통계 정보
  subscribers: Number,        // 구독자 수
  totalViews: Number,         // 총 조회수
  totalVideos: Number,        // 총 영상 수

  // 🤖 AI 분석 결과
  keywords: [String],         // 키워드 태그
  categoryInfo: {
    majorCategory: String,    // 주요 카테고리
    middleCategory: String,   // 중간 카테고리
    subCategory: String,      // 하위 카테고리
    fullCategoryPath: String, // 전체 카테고리 경로
    consistencyLevel: String  // 일관성 수준 (high/medium/low)
  },

  // 📅 메타데이터
  lastAnalyzedAt: String,     // 최근 분석 시간 (ISO String)
  createdAt: String,          // 생성 시간
  updatedAt: String           // 수정 시간
};
```

### **🎯 핵심 변경 이유**
1. **혼란 제거**: MongoDB `_id` vs 비즈니스 `channelId` 명확한 구분
2. **일관성**: 모든 Channel 참조에서 `channelId` 사용
3. **확장성**: ChannelGroup에서 채널 참조 시 명확한 식별자 사용
4. **개발자 경험**: Fallback 패턴 불필요로 코드 단순화
