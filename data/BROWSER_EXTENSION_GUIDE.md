# 🍪 브라우저 확장프로그램으로 Instagram 쿠키 추출

## 📋 **정확한 단계별 안내**

### 1️⃣ **확장프로그램 설치**
1. Chrome 웹스토어에서 **"Get cookies.txt LOCALLY"** 검색
2. 설치 (무료)
3. 확장프로그램이 툴바에 나타남

### 2️⃣ **Instagram 로그인**
1. **새 탭**에서 `instagram.com`으로 이동
2. 평소처럼 로그인
3. 홈페이지 또는 아무 페이지나 이동 (로그인 상태 확인)

### 3️⃣ **쿠키 추출 (중요!)**
**Instagram 탭에서 (중요!):**

1. **확장프로그램 아이콘 클릭** 🔧
2. **설정 선택:**
   ```
   ✅ Current site only (현재 사이트만)
   ❌ All sites (모든 사이트 아님!)

   ✅ Format: Netscape
   ❌ Format: JSON (이거 아님!)
   ```

3. **"Export" 버튼 클릭** (Export All 아님!)

### 4️⃣ **파일 저장**
1. `instagram.com_cookies.txt` 파일 다운로드됨
2. 이 파일을 **복사**
3. 프로젝트 폴더의 `data/instagram_cookies.txt`로 **이름 변경해서 저장**

---

## 🎯 **올바른 설정 요약**

| 설정 항목 | 선택할 값 | ❌ 선택 안 할 값 |
|-----------|-----------|------------------|
| **범위** | Current site only | All sites |
| **포맷** | Netscape | JSON |
| **버튼** | Export | Export All |

---

## 📂 **파일 저장 위치**

### Windows:
```
다운로드 폴더의 instagram.com_cookies.txt
↓ (복사 후 이름 변경)
C:\Users\j0821\Documents\___JUNSOOCHO___\InsightReel_mongoose\data\instagram_cookies.txt
```

---

## ✅ **성공 확인 방법**

생성된 파일이 이런 형식이면 성공:
```
# Netscape HTTP Cookie File
.instagram.com	TRUE	/	TRUE	1234567890	sessionid	ABC123...
.instagram.com	TRUE	/	TRUE	1234567890	csrftoken	XYZ789...
.instagram.com	TRUE	/	TRUE	1234567890	mid	DEF456...
```

### 테스트:
```bash
node test-processVideo-instagram.js
```

---

## 🚨 **일반적인 실수들**

### ❌ **잘못된 선택:**
- "Export All Cookies" 선택 → 파일이 너무 커짐
- JSON 포맷 선택 → yt-dlp가 읽지 못함
- 다른 사이트에서 실행 → Instagram 쿠키가 없음

### ✅ **올바른 방법:**
- Instagram 탭에서 확장프로그램 실행
- Current site only + Netscape 포맷
- Export 버튼 (All 아님)

---

## 🔄 **문제 해결**

### 파일이 비어있거나 작다면:
1. Instagram에 제대로 로그인되었는지 확인
2. Instagram 탭에서 확장프로그램을 실행했는지 확인
3. "Current site only" 선택했는지 확인

### 여전히 안 된다면:
```bash
node create-manual-cookies.js  # 수동 방법 사용
```

---

**💡 핵심**: Instagram 탭에서 → Current site only + Netscape → Export