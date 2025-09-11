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

3. **TypeScript 규칙**
   - `any` 타입 사용 최소화
   - 구체적 타입 정의 권장

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

## 🚀 API 엔드포인트

### 핵심 API
- `POST /api/process-video` - URL로 비디오 처리
- `POST /api/process-video-blob` - Blob 파일 처리
- `GET /api/videos` - 비디오 목록 조회
- `GET /health` - 서버 상태 확인

### 테스트 API
- `GET /api/test-sheets` - Google Sheets 연결 테스트
- `GET /api/config/health` - 설정 상태 확인

## ⚠️ 외부 의존성
- **Gemini API**: Google API 키 필요
- **FFmpeg**: 시스템 설치 필수
- **Google Sheets API**: 서비스 계정 키 필요

---

# 🚀 채널 그룹 기반 트렌딩 수집 시스템

## 🎯 **프로젝트 목표**
**"채널 중심 트렌드 모니터링 도구"** - 선택한 채널들을 그룹으로 묶어서 조건에 맞는 트렌딩 영상을 효율적으로 수집

### 📊 **핵심 기능**
1. ✅ **채널 그룹 관리** - 채널들을 의미있는 그룹으로 묶어 관리
2. ✅ **조건별 트렌딩 수집** - 최근 n일, n만 조회수 이상, SHORT/MID/LONG 분류
3. ✅ **수집 결과 분리** - 트렌딩 수집 vs 개별 분석 영상 분리 저장
4. ✅ **웹 관리 인터페이스** - 기존 UI 확장하여 그룹 기능 추가
5. ✅ **검색 및 필터링** - 채널/영상 키워드 검색 (수동 태깅)

### 🛠️ **구현 범위 (실제 필요한 작업)**
- **✅ 활용 가능 (95%)**: BulkCollectionModal, ChannelManagementPage, HighViewCollector
- **🔧 신규 구현 (5%)**: ChannelGroup 모델, TrendingVideo 모델, Duration 분류, UI 확장

---

## 🏗️ **구현 계획**

### **1단계: 핵심 모델 구현**

#### **1.1 ChannelGroup 모델**
```javascript
// server/models/ChannelGroup.js 
const ChannelGroupSchema = {
  id: String,
  name: String,              // "영화 채널 그룹 1"
  description: String,       // "영화 리뷰 채널들"
  color: String,             // "#3B82F6" (UI 구분용)
  channels: [String],        // 채널 ID 배열 ["UC123", "UC456"]
  keywords: [String],        // 수동 태그 ["영화", "리뷰", "엔터테인먼트"]
  isActive: Boolean,         // 수집 활성화 여부
  lastCollectedAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

**API 구현:**
- `POST /api/channel-groups` - 그룹 생성
- `GET /api/channel-groups` - 그룹 목록
- `PUT /api/channel-groups/:id` - 그룹 수정
- `DELETE /api/channel-groups/:id` - 그룹 삭제
- `POST /api/channel-groups/:id/channels` - 채널 추가/제거

### **1.2 트렌딩 영상 분리 시스템**
```javascript
// server/models/TrendingVideo.js - 수집 전용 경량 모델
const TrendingVideoSchema = {
  id: String,
  title: String,             // 영상 제목  
  url: String,               // 영상 URL
  views: Number,             // 조회수
  likes: Number,             // 좋아요 (선택)
  uploadDate: Date,          // 업로드 날짜
  channelName: String,       // 채널명
  channelId: String,         // 채널 ID  
  platform: String,          // YOUTUBE, INSTAGRAM, TIKTOK
  thumbnailUrl: String,      // 썸네일 URL
  
  // 영상 분류 (필수 추가)
  duration: Number,          // 영상 길이 (초)
  durationCategory: String,  // 'shorts'(≤60초), 'midform'(61-180초), 'longform'(>180초)
  
  // 채널 키워드 태깅
  channelKeywords: [String], // 채널에서 추출한 키워드들
  
  // 수집 메타데이터
  collectionBatchId: String, // 수집 배치 ID
  collectedAt: Date,         // 수집 일시  
  channelGroupId: String,    // 속한 채널 그룹
  
  createdAt: Date,
  updatedAt: Date
}
```

**API 구현:**
- `POST /api/trending/collect` - 그룹별 트렌딩 수집 (조건 설정)
- `GET /api/trending/videos` - 수집된 영상 목록 (필터링 지원)
- `GET /api/trending/batches` - 수집 배치 목록 (최신순)
- `DELETE /api/trending/batch/:id` - 배치 삭제
- `POST /api/videos/add-url` - URL로 영상 직접 추가
- `POST /api/channels/add-url` - URL로 채널 직접 추가
- `DELETE /api/videos/:id` - 영상 삭제
- `DELETE /api/channels/:id` - 채널 삭제

### **1.3 수집 배치 시스템**
```javascript
// server/models/CollectionBatch.js
const CollectionBatchSchema = {
  id: String,
  name: String,              // "2024-09-11 영화 채널 수집"
  description: String,       // 수집 설명
  channelGroupId: String,    // 대상 채널 그룹
  
  // 수집 설정
  filters: {
    daysBack: Number,        // 최근 n일
    minViews: Number,        // 최소 조회수 (n만 회)
    maxViews: Number,        // 최대 조회수 (선택)
    includeShorts: Boolean,  // 숏폼 포함 (≤60초)
    includeMidform: Boolean, // 미드폼 포함 (61-180초) 
    includeLongForm: Boolean,// 롱폼 포함 (>180초)
    keywords: [String],      // 포함 키워드
    excludeKeywords: [String]// 제외 키워드
  },
  
  // 수집 결과
  status: String,            // collecting, completed, failed
  totalChannels: Number,     // 대상 채널 수
  processedChannels: Number, // 처리된 채널 수
  totalVideosFound: Number,  // 발견된 영상 수
  totalVideosCollected: Number, // 실제 수집된 영상 수
  apiQuotaUsed: Number,      // 사용된 API 할당량
  
  startedAt: Date,
  completedAt: Date,
  createdAt: Date
}
```

---

## ⚡ **Phase 2: UI 및 사용성 개선 (1주차)**

### **2.1 영상 길이별 자동 분류**
```javascript
// server/services/VideoCategorizer.js - 확실히 구현 가능
class VideoCategorizer {
  // YouTube API duration 파싱 (PT4M13S -> 253초)
  parseDuration(isoDuration) {
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0; 
    const seconds = parseInt(match[3]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  }
  
  // 길이별 분류
  categorizeByDuration(durationSeconds) {
    if (durationSeconds <= 60) return 'shorts';     // 1분 이하
    if (durationSeconds <= 180) return 'midform';   // 1-3분
    return 'longform';                               // 3분 이상
  }
}
```

### **2.2 수동 키워드 태깅 시스템**
```javascript
// ChannelGroup 생성/수정 시 사용자가 직접 키워드 입력
// KeywordExtractor 자동 추출은 제외 - 수동 관리가 더 정확함

// UI에서 키워드 입력 예시:
keywords: ["영화", "리뷰", "엔터테인먼트"]  // 사용자 직접 입력
```

### **2.3 UI 확장 (기존 컴포넌트 활용)**
```javascript
// ChannelManagementPage.tsx에 그룹 탭 추가
const [activeTab, setActiveTab] = useState<'channels' | 'groups'>('channels');

// BulkCollectionModal.tsx에 그룹별 수집 옵션 추가  
const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
```

### **2.4 기본 통계 대시보드**
```javascript
// 간단한 통계만 표시 (Chart.js는 나중에)
interface SimpleStats {
  totalGroups: number;           // 총 그룹 수
  totalChannels: number;         // 총 채널 수  
  todayCollected: number;        // 오늘 수집 영상
  quotaUsed: number;            // API 사용량
  
  // 영상 길이별 분포 (숫자만)
  shortVideos: number;          // ≤60초
  midVideos: number;            // 61-180초  
  longVideos: number;           // >180초
}
```

---

## ⏰ **구현 일정**

### **3-5일 완성 계획**

#### **Day 1: 핵심 모델**
- ChannelGroup 모델 생성 (30줄)
- TrendingVideo 모델 생성 (40줄)
- Duration 분류 함수 (10줄)

#### **Day 2: API 구현** 
- 채널 그룹 CRUD API (4개 엔드포인트, 각 15줄)
- 기존 HighViewCollector와 연동

#### **Day 3: UI 확장**
- ChannelManagementPage 그룹 탭 추가 (30줄)
- BulkCollectionModal 그룹 옵션 추가 (20줄)

#### **Day 4-5: 테스트 및 통합**
- 전체 플로우 테스트
- 버그 수정 및 최적화

### **총 예상 코드량**
- **신규 코드**: ~150줄
- **수정 코드**: ~50줄
- **기존 활용**: 95% (1000줄+ 재사용)

---

## 🎯 **추후 확장 가능한 기능들 (Optional)**

### **편의 기능**
- 즐겨찾기 시스템 (Bookmark 모델)
- 고급 검색/필터링 강화
- Chart.js 기반 시각화 대시보드
- 수집 결과 내보내기 (CSV/Excel)

### **자동화 기능**
- 스케줄링 시스템 (cron job)
- 알림 시스템 (수집 완료 알림)
- API 할당량 자동 최적화

**우선순위**: 핵심 기능 완성 후 필요에 따라 추가

---

## 📋 **API 엔드포인트**

### **신규 추가 예정**
- `POST /api/channel-groups` - 채널 그룹 생성
- `GET /api/channel-groups` - 채널 그룹 목록 조회
- `PUT /api/channel-groups/:id` - 채널 그룹 수정
- `DELETE /api/channel-groups/:id` - 채널 그룹 삭제
- `POST /api/collect-group/:id` - 특정 그룹 트렌딩 수집

### **기존 활용**
- `POST /api/collect-trending` - HighViewCollector (기존)
- `GET /api/videos` - 영상 목록 조회 (기존)
- `GET /api/trending-stats` - 수집 통계 (기존)

---

## 💾 **데이터 저장 구조**

### **기존 Video 컬렉션**
개별 분석된 영상들 (기존 유지)

### **신규 TrendingVideo 컬렉션**  
트렌딩 수집된 영상들 (신규 생성)

### **신규 ChannelGroup 컬렉션**
채널 그룹 정보 (신규 생성)

**분리 이유**: 트렌딩 수집과 개별 분석 구분, 대량 데이터 관리 최적화

---

**Last Updated**: 2025-09-12 (KeywordExtractor 제거, 현실적 범위로 축소)
**Maintainer**: JUNSOOCHO
