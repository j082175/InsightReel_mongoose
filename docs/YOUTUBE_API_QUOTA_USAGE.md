# YouTube Data API v3 할당량 사용 가이드

## 📊 **전체 기능별 할당량 사용량**

### **1. 채널 분석 기능**

#### **YouTubeChannelDataCollector.js** ✅ 최적화 완료
- **기능**: 채널 상세 분석 (영상 목록, 통계, AI 분석)
- **할당량**: **5 units** (채널 1개당)
- **API 호출**:
  - `channels.list` (1) - 채널 기본 정보
  - `channels.list` (1-2) - 채널 ID 확정 (@handle, username)
  - `playlistItems.list` (1) - 최근 영상 목록
  - `videos.list` (1) - 영상 상세 정보
- **주요 함수**: `collectChannelData()`, `getChannelData()`

#### **YouTubeChannelService.js** ✅ 최적화 완료
- **기능**: 채널 정보 수집
- **할당량**: **1 unit** (채널 ID 직접 조회만 사용)
- **API 호출**:
  - `channels.list` (1) - 채널 ID로 직접 조회
- **주요 함수**: `getChannelInfo()`, `getChannelById()`
- **참고**: 채널명 검색 기능 제거됨 (search.list 최적화로)

#### **YouTubeChannelAnalyzer.js**
- **기능**: 채널 심화 분석 (통계 분석 + 댓글 옵션)
- **할당량**: **3-200+ units** (영상 수에 따라 가변)
  - **빠른 모드** (200개 영상): **9 units**
    - channels.list (1) + playlistItems.list (4페이지) + videos.list (4배치) = 9
  - **향상된 분석** (댓글 포함): **9 + 영상 수**
    - 기본 9 units + commentThreads.list (1 × 영상 수)
- **API 호출**:
  - `channels.list` (1) - 채널 정보
  - `playlistItems.list` (영상수÷50) - 영상 목록 (페이지네이션)
  - `videos.list` (영상수÷50) - 영상 상세 정보 (배치 처리)
  - `commentThreads.list` (영상수) - 댓글 수집 (향상된 분석만)
- **주요 함수**: `analyzeChannel()`, `analyzeChannelEnhanced()`
- **분석 항목**: 조회수 통계, 영상 길이 분석, 업로드 패턴, 숏폼 비율

---

### **2. 영상 수집 기능**

#### **HighViewCollector.js** ✅ 최적화 완료
- **기능**: 채널별 고조회수 영상 수집
- **할당량**: **3 units** (채널 1개당)
- **API 호출**:
  - `channels.list` (1) - uploads 플레이리스트 ID
  - `playlistItems.list` (1) - 최신 영상 목록
  - `videos.list` (1) - 영상 상세 정보
- **주요 함수**: `collectFromChannels()`, `collectChannelTrending()`

#### **GroupTrendingCollector.js**
- **기능**: 채널 그룹별 트렌딩 수집
- **할당량**: **3 units × 채널 수**
- **의존성**: HighViewCollector 사용
- **주요 함수**: `collectFromGroups()`, `collectFromSingleGroup()`

---

### **3. 개별 영상 처리**

#### **VideoProcessor.js**
- **기능**: YouTube 비디오 정보 수집 및 댓글 수집
- **할당량**: **3-100+ units** (영상 1개당)
  - 기본 모드: **3 units**
  - 댓글 수집 모드: **100+ units**
- **API 호출**:
  - `videos.list` (1) - 기본 비디오 정보
  - `channels.list` (1) - 채널 정보
  - `commentThreads.list` (1+) - 댓글 수집 (최대 100개)
- **주요 함수**: `getYouTubeVideoInfo()`, `fetchYouTubeComments()`

#### **HybridYouTubeExtractor.js**
- **기능**: 하이브리드 YouTube 데이터 추출 (ytdl-core + API)
- **할당량**: **3 units** (영상 1개당)
- **API 호출**:
  - `videos.list` (1) - 비디오 정보
  - `channels.list` (1) - 채널 통계
  - `commentThreads.list` (1) - 상위 3개 댓글
- **주요 함수**: `extractWithYouTubeAPI()`

---

### **4. 배치 처리 (고효율)**

#### **YouTubeBatchProcessor.js** ⭐ 최고 효율
- **기능**: YouTube 영상 배치 처리 (50개씩 묶어서)
- **할당량**: **2 units** (50개 영상 처리 시)
- **API 호출**:
  - `videos.list` (1) - 최대 50개 비디오 한 번에
  - `channels.list` (1) - 중복 제거된 채널 한 번에
- **효율성**: 개별 처리 대비 **99% 할당량 절약**
- **주요 함수**: `processBatch()`, `processChunk()`

---

### **5. 유틸리티**

#### **migrate-mongodb-youtube.js**
- **기능**: MongoDB YouTube 데이터 마이그레이션
- **할당량**: **2 units** (비디오 1개당)
- **API 호출**:
  - `videos.list` (1) - 채널 ID 조회
  - `channels.list` (1) - 핸들명 조회
- **주요 함수**: `migrate()`

---

## 🎯 **할당량 최적화 가이드**

### **✅ 최적화 완료 (search.list 제거)**
- ✅ **YouTubeChannelDataCollector.js**: 302 → 5 units (98.3% 절약)
- ✅ **HighViewCollector.js**: 101 → 3 units (97% 절약)
- ✅ **migrate-channel-published-dates.js**: 100 → 1 unit (99% 절약)

### **🎉 최적화 100% 완료**
- ✅ **모든 파일에서 search.list(100 할당량) 완전 제거**
- ✅ **전체 프로젝트 할당량 효율성 극대화 달성**

### **💡 권장사항**

1. **배치 처리 우선 사용**
   ```javascript
   // ❌ 개별 처리: 400 units
   for (video of videos) {
     await processVideo(video); // 3 units × 100 = 300
     await processChannel(video.channelId); // 1 unit × 100 = 100
   }

   // ✅ 배치 처리: 2 units
   await YouTubeBatchProcessor.processBatch(videos); // 2 units
   ```

2. **채널 ID 직접 사용**
   ```javascript
   // ❌ 검색: 101 units
   const channel = await searchChannelByName("채널명"); // 100 + 1

   // ✅ 직접 조회: 1 unit
   const channel = await getChannelById("UC123abc"); // 1
   ```

3. **댓글 수집 최소화**
   ```javascript
   // 기본 분석만: 4 units
   analyzeChannel(channelId, { includeComments: false });

   // 댓글 포함: 50+ units
   analyzeChannelEnhanced(channelId, { includeComments: true });
   ```

---

## 📈 **일일 할당량 10,000 units 기준 처리량**

| 기능 | 할당량/건 | 일일 처리량 | 권장 사용 |
|------|----------|------------|----------|
| **배치 영상 처리** | 2 units/50개 | **250,000개** | ⭐ 최우선 |
| **채널 기본 분석** | 5 units | **2,000개** | 👍 권장 |
| **채널 심화 분석** | 9 units/200개 영상 | **1,111개** | 🔄 보통 |
| **고조회수 수집** | 3 units | **3,333개** | 👍 권장 |
| **개별 영상 처리** | 3 units | **3,333개** | 🔄 보통 |
| **하이브리드 추출** | 3 units | **3,333개** | 🔄 보통 |

---

## 🚨 **주의사항**

### **고비용 API (피해야 할 것들)**
- ❌ `search.list`: **100 units** - 가능한 한 사용 금지
- ❌ `commentThreads.list` 남용: 1+ units - 필요시에만 사용

### **저비용 API (권장)**
- ✅ `channels.list`: **1 unit** - 자유롭게 사용
- ✅ `videos.list`: **1 unit** - 배치 처리 권장
- ✅ `playlistItems.list`: **1 unit** - search 대신 사용

---

## 🔄 **MultiKeyManager 활용**

3개 API 키 사용 시 **일일 30,000 units** 가능:
- **배치 처리**: 750,000개 영상/일
- **채널 분석**: 6,000개 채널/일
- **고조회수 수집**: 10,000개 채널/일

---

*마지막 업데이트: 2025-09-16*
*최적화 상태: search.list API 98% 제거 완료*