# InsightReel 코딩 지침

## 🚨 **Claude Code 필독 요약 (코딩 전 필수 확인!)**

### **절대 지켜야 할 핵심 규칙들** ⚠️

1. **필드명 중복 절대 금지** 🚫
   - `videoId`, `viewCount`, `thumbnail` 같은 중복 필드 생성 금지
   - 오직 `_id`, `views`, `thumbnailUrl` 표준 필드만 사용
   - MongoDB `_id` 필드 모든 계층에서 유지 (변환 없음)

2. **상수 시스템 필수 사용** 📝
   ```bash
   server/config/api-messages.js     # HTTP 상태, 에러 코드, 플랫폼 상수
   server/config/constants.js        # 서버 설정 상수
   frontend/src/shared/config/       # 프론트엔드 상수
   ```

3. **파일 크기 제한** 📏
   - 새 파일 생성 시: 최대 1,500줄
   - Claude Code 토큰 제한 (25,000 토큰) 준수

4. **VideoStore 패턴 필수 사용** 🎯
   - 비디오 관련 상태 관리를 중앙화
   - 개별 useState 남발 금지

### **💡 코딩 전 체크리스트**
- [ ] 중복 필드 생성하지 않았나?
- [ ] 상수 대신 하드코딩 하지 않았나?
- [ ] **FSD 구조**를 따르고 있나?
- [ ] **VideoStore 패턴** 사용했나?
- [ ] **방어적 프로그래밍** 적용했나?

---

## 📝 **세부 코딩 규칙**

### **필드명 완전 통일 규칙** 🎯
```javascript
// ✅ 올바른 Video 엔티티 구조
{
  _id: "video123",         // MongoDB _id 필드 유지
  title: "영상 제목",
  views: 1000,            // 단일 조회수 필드
  thumbnailUrl: "url",    // 단일 썸네일 필드
  uploadDate: "2024-01-01"
}

// ❌ 중복 필드 생성 금지
{
  id: "123", videoId: "123",        // 중복!
  views: 1000, viewCount: 1000,     // 중복!
  thumbnailUrl: "url", thumbnail: "url"  // 중복!
}
```

### **FSD 아키텍처** 🏗️
```
frontend/src/
├── app/           # 앱 설정 (providers, routing)
├── pages/         # 페이지 컴포넌트
├── features/      # 기능별 모듈
│   ├── video-management/
│   ├── channel-management/
│   └── trending-collection/
└── shared/        # 공통 요소
    ├── components/
    ├── hooks/
    └── utils/
```

### **상수 사용 예시**
```javascript
// ❌ 하드코딩 금지
if (response.status === 200) { ... }
if (platform === 'YOUTUBE') { ... }

// ✅ 상수 사용 (올바른 방법)
import { HTTP_STATUS_CODES, PLATFORMS } from '../config/api-messages';

if (response.status === HTTP_STATUS_CODES.OK) { ... }
if (platform === PLATFORMS.YOUTUBE) { ... }
```

### **VideoStore 패턴**
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
```

### **방어적 프로그래밍**
```typescript
// ✅ Null safety 필수
const videoCount = videos?.length || 0;
const firstVideo = videos?.[0];
videos?.map(video => ...)

// ❌ 직접 접근 금지
const videoCount = videos.length;  // 크래시 위험
```

### **공통 유틸리티 사용**
```typescript
// ✅ 공통 유틸리티 함수 사용
import { formatViews, formatDate } from '../shared/utils/formatters';
import { getPlatformStyle } from '../shared/utils/platformStyles';

formatViews(1000) // "1천"
formatDate("2024-01-01") // "1월 1일"
getPlatformStyle("YOUTUBE") // 빨간색 그라데이션
```

---

## 🚨 **절대 금지 사항**

### **필드명 관련**
- ❌ `id`, `videoId`, `_id` 중복 필드 생성
- ❌ `views`, `viewCount` 중복 필드 생성
- ❌ `thumbnailUrl`, `thumbnail` 중복 필드 생성

### **아키텍처 관련**
- ❌ VideoStore 우회하여 개별 useState 사용
- ❌ FSD 레이어 규칙 위반 (하위 → 상위 import)
- ❌ 1,500줄 초과 파일 생성

### **코드 품질 관련**
- ❌ 하드코딩 (상수 대신 직접 값 사용)
- ❌ 방어적 프로그래밍 생략
- ❌ 공통 유틸리티 중복 구현

---

## ✅ **권장 개발 플로우**

1. **기획 단계**
   - [ ] 기존 컴포넌트 재사용 가능한지 확인
   - [ ] 새 기능이 VideoStore 패턴에 맞는지 검토

2. **개발 단계**
   - [ ] 상수 파일에서 필요한 값들 import
   - [ ] FSD 구조에 맞게 파일 배치
   - [ ] 방어적 프로그래밍 적용

3. **완료 단계**
   - [ ] 필드명 중복 없는지 검토
   - [ ] 파일 크기 1,500줄 이하인지 확인
   - [ ] ESLint/Prettier 통과하는지 확인

**🎯 이 지침들을 준수하면 일관성 있고 유지보수 가능한 코드를 작성할 수 있습니다!**