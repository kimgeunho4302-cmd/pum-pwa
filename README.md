# 품 꾸미기 · PWA 프로토타입

**라이브**: https://kimgeunho4302-cmd.github.io/pum-pwa/

`pumss.co.kr` 의 **품 꾸미기(PersonalEdit4)** 화면과 **공유 페이지(@AyoGG)** 를 기획서
(`TalkFile_품꾸미기 웹 버전.pptx`, 13장) 기준으로 재구성한 정적 웹앱입니다.
빌드 도구 없이 HTML · CSS · JS 만으로 동작하며, 그대로 GitHub Pages / Cloudflare Pages 에 올릴 수 있습니다.

- **앱**: `index.html` (해시 라우터)
- **편집기**: `#/editor` — 왼쪽 편집 / 데스크톱에서는 오른쪽 실시간 휴대폰 미리보기
- **미리보기**: `#/preview` — 공유 전 화면(모바일 390 / PC 1280)
- **공유 페이지**: `#/share` — `pumss.co.kr/@주소` 와 같은 구조·스타일
- 데이터는 브라우저 `localStorage` 한 곳에 저장되어 새로고침해도 유지됩니다.

---

## 1. 바로 실행하기

```bash
cd downloads/pum-decorator-pwa
python3 -m http.server 8000     # 또는 npx serve .
# 브라우저에서 http://localhost:8000
```

> `file://` 로 열어도 화면은 보이지만, 서비스 워커(PWA)와 카카오맵은 http(s) 에서만 동작합니다.

### 화면 · 라우트

| 라우트 | 화면 | 설명 |
| --- | --- | --- |
| `#/login` | 로그인 | 아이디(이메일)·비밀번호 필수 검증, 구글·네이버·카카오톡 SNS 가입, 회원가입 / ID·PW 찾기 이동 |
| `#/signup` | 회원가입 | 이메일(필수)·비밀번호(8자, 영문+숫자)·이름·휴대전화번호(필수)·약관 동의 |
| `#/find` | ID/PW 찾기 | 휴대전화번호로 아이디 찾기 / 비밀번호 재설정 안내 (데모: 문자 발송 안내) |
| `#/welcome` | 가입 완료 | 환영 일러스트, **품 꾸미기 바로가기**, **품 활용법** 모달 |
| `#/editor` | 품 꾸미기 | 품 주소 · 내 프로필 · 콘텐츠 블록 편집 |
| `#/preview` | 미리보기 | 공유 전 화면 (모바일 390 / PC 1280 프레임) |
| `#/settings` | 설정 | 공유 설정(전체공개/비공개+비밀번호) · 구독 설정 · 전자명함 · JSON 백업 |
| `#/share` | 공유 페이지 | 편집 결과를 그대로 출력 (`비공개`면 비밀번호 잠금) |

---

## 2. 기획서 항목별 구현

### 신규 제작 (슬라이드 2~3)

- 로그인: 타이틀 **“나의 디지털 세계 품”**, 아이디는 이메일, 빈 값·형식 오류 시 필드별 오류 문구와 포커스 이동
- SNS 가입: 구글·네이버·카카오톡 각각 **간편가입 모달**(계정 확인 → 약관 동의 → 가입 완료 → 환영 화면)
- 회원가입 / ID·PW 찾기 페이지 이동, 가입 완료 → 환영 화면 → 품 꾸미기 진입

### 품 꾸미기 (슬라이드 4~10 + `PersonalEdit4.do`)

| 항목 | 구현 |
| --- | --- |
| **품 주소** | 처음엔 빈 공란. `a-z A-Z` 외 입력(타이핑·붙여넣기 모두)은 **차단 + “입력할 수 없습니다” 팝업**, 저장 시 `https://pumss.co.kr/@주소` |
| **내 프로필 · 배경/프로필 4모드** | `프로필` / `프로필 전체` / `배경+프로필` / `배경` — 선택 즉시 편집 미리보기·공유 페이지에 동일 반영 |
| **배경 테마** | 봄·여름·가을·겨울 4종 (실제 사이트의 `bg_season_1~4.jpg` 사용). 공유 페이지 뒷 배경과 프로필 영역에 적용 |
| **내 이미지** | 1번=프로필(600px), 2번=배경(1200px). **파일 선택·드래그&드롭·교체·삭제** 지원, 샘플 3종 제공 |
| **타이틀 / 소개글** | 소개글은 가운데 정렬 + 입력 높이 자동 확장(`scrollHeight`) |
| **콘텐츠 블록** | 반갑데이 · 일일뉴스 · 오늘의 명언 · 추천 컨텐츠 — 각각 **ON/OFF 토글(기본 ON)** |
| **순서 변경** | 손잡이 **드래그(마우스·터치 포인터 이벤트)** + **위/아래 버튼** |
| **SNS 블록** | 기본 접힘. 열면 인스타그램·유튜브·홈페이지 입력창. **SNS 선택 → 4-1 레이어 팝업(13종 아이콘)** 선택 시 아이콘+입력필드 생성, ON/OFF(기본 ON, OFF면 공유 페이지 미노출) |
| **품 무료 만들기** | 토글 없음. 공유 페이지에 배너로 항상 노출, 터치 시 **초대장 안내 모달 → 회원가입 페이지** |
| **텍스트 링크** | URL + 대표문구 → 공유 페이지에서 카드형 블록으로 출력, 클릭 시 이동 |
| **동영상 링크** | 유튜브 주소 → `youtube-nocookie` 임베드로 바로 재생 |
| **배너링크** | URL + 이미지 등록 → 공유 페이지에 이미지 노출, 클릭 시 URL 이동 |
| **앱테크** | 실제 사이트의 8종 아이콘·문구·강조 색을 그대로 사용, 항목별 ON/OFF |
| **꾸미기 추가 팝업** | SNS / 텍스트 링크 / 배너링크 / 동영상 + **신규 “지도 추가”** |
| **지도 블록(신규)** | 주소 입력창(카카오 주소·장소 검색 + 직접 입력) → 미리보기·공유 페이지에 **주소 + 카카오맵 + 마커 + 길찾기 링크** |

### 설정 · 미리보기 · 공유 (슬라이드 11~13)

- `PersonalEdit4_set.do`: 공유 설정(전체공개 / 비공개+비밀번호), 구독 설정(이메일·휴대폰번호), 전자명함 노출/비노출
- `PersonalEdit4_preview.do`: 공유 전 미리보기(모바일/PC 전환)
- `@AyoGG`: 공유 페이지. 미리보기와 **같은 렌더러**(`Pum.renderShare`)를 사용하므로 두 화면의 출력이 100% 동일합니다.

---

## 3. 이미지 업로드 처리

업로드한 파일은 `FileReader → Canvas` 로 즉시 축소·압축한 **DataURL** 로 저장합니다(IndexedDB 불필요).

| 대상 | 최대 변 길이 | 압축 | 목표 용량 |
| --- | --- | --- | --- |
| 프로필(1번) | 600px | JPEG q0.86 | ≤ 130KB (초과 시 화질 자동 하향) |
| 배경(2번) | 1200px | JPEG q0.82 | ≤ 280KB |
| 배너 이미지 | 1200px | JPEG q0.84 | ≤ 240KB |

- 2400~3200px 원본(180~380KB)을 올려도 프로필 **16~24KB**, 배경 **34~53KB**, 배너 **17~33KB** 로 저장되어
  `localStorage` 용량 초과 없이 즉시 편집 화면·실시간 미리보기·공유 페이지에 반영되고 새로고침 후에도 유지됩니다.
- 삭제(휴지통), 교체(다시 선택/드래그), 샘플 적용 모두 같은 경로를 사용합니다.

### 저장 키

```
localStorage["pum.decorator.pwa.v2"] = {
  auth: { loggedIn, user: { email, name, provider, joinedAt } },
  profile: { slug, layout, theme, imgProfile, imgBg, title, intro },
  settings: { visibility, password, subEmail, subPhone, bizcard },
  blocks: [ { id, type, on, data } ... ]   // 배열 순서가 곧 노출 순서
}
```

---

## 4. PWA

- `manifest.webmanifest` — 이름/아이콘(192·512·maskable)/테마 컬러, `display: standalone`
- `sw.js` — 앱 셸(HTML·CSS·JS·아이콘·테마/아이콘 이미지) **cache-first**, 외부(카카오 SDK 등) 요청은 그대로 통과.
  새 버전을 배포할 때는 `CACHE` 상수(`pum-decorator-v1` → `v2`)를 올려 주세요.
- `assets/icons/` — 홈 화면 추가용 아이콘 3종 + apple-touch-icon

---

## 5. 카카오맵

```js
// js/render.js
SDK: https://dapi.kakao.com/v2/maps/sdk.js?appkey=10068832a5a7641b35eab0a873d745c7&libraries=services&autoload=false
```

- `kakao.maps.load()` → 지도/마커/CustomOverlay, 주소 검색은 `services.Geocoder` + `services.Places` 를 함께 사용합니다.
- **도메인 제약**: 카카오 개발자 콘솔의 JavaScript 키에 등록된 도메인에서만 SDK 가 동작합니다.
  현재 로컬(`localhost`)에서는 SDK 가 실패해 **주소 카드 + 핀 + 길찾기 링크 폴백**이 표시됩니다.
  `https://kimgeunho4302-cmd.github.io` 등 등록된 도메인에서는 실제 지도 타일과 마커가 그대로 나옵니다.
- 폴백 상태에서도 **주소 저장**은 가능하며, 공유 페이지에는 입력한 주소가 그대로 노출됩니다.

---

## 6. 배포

### GitHub Pages
1. 저장소 루트에 이 폴더의 파일을 그대로 올립니다.
2. Settings → Pages → Source `Deploy from a branch` → `main` / `root`.
3. 카카오 개발자 콘솔 → 해당 앱 → 플랫폼 → Web 에 `https://<계정>.github.io` 등록.

### Cloudflare Pages
- Framework preset **None**, Build command 없음, Build output directory **`/`** (또는 이 폴더).
- 배포 후 카카오 콘솔에 `https://<프로젝트>.pages.dev` 를 등록.

---

## 7. 파일 구조

```
pum-decorator-pwa/
├─ index.html               앱 셸
├─ styles.css               디자인 토큰 · 모든 화면 스타일
├─ js/base.js               상태 스키마 · localStorage · 이미지 압축 · 토스트 · 모달
├─ js/site.js               품스 푸터 · 이용약관/개인정보처리방침 · 홈 화면에 추가 · 공유 페이지 신고
├─ js/render.js             공유 페이지 렌더러 (미리보기/공유 공용) · 카카오맵 · 주소검색
├─ js/auth.js               로그인 · 회원가입 · SNS 가입 · ID/PW 찾기 · 환영 · 활용법
├─ js/editor.js             품 꾸미기 · 설정 · 미리보기 · 공유(잠금)
├─ js/app.js                해시 라우터 · 로그인 가드 · 서비스 워커 등록
├─ manifest.webmanifest     PWA 매니페스트
├─ sw.js                    서비스 워커
├─ assets/
│  ├─ theme/theme_1~4.jpg   봄·여름·가을·겨울 테마 배경
│  ├─ sns/*.jpg             SNS 아이콘 13종
│  ├─ apptech/1~8.jpg       앱테크 아이콘 8종
│  ├─ icons/                PWA 아이콘
│  └─ fonts/                Pretendard 라틴 서브셋(Regular/SemiBold/Bold, woff2)
└─ .nojekyll                GitHub Pages Jekyll 처리 생략
```

---

## 8. 검증 결과 (Playwright · Chromium)

| 항목 | 결과 |
| --- | --- |
| 라우트 8종 × 390 / 1280 레이아웃 | 가로 오버플로 0건 (`scrollWidth == innerWidth`) |
| 콘솔 에러 / 페이지 에러 | 0건 |
| 품 주소 한글 입력 | 입력 차단 + 팝업 표시, 값 유지 안 됨 |
| 품 주소 숫자·특수문자 | 차단(허용된 영문만 남음) |
| 이미지 업로드 (2400~3200px 원본) | 프로필 16KB / 배경 34KB / 배너 17KB로 변환, 미리보기·공유 반영, 새로고침 후 유지 |
| 블록 드래그 / 위·아래 버튼 | 순서 변경 및 새로고침 후 유지 |
| SNS 아이콘 팝업 | 13종 노출, 선택 시 행 추가 |
| 지도 블록 | 주소 저장 → 공유 페이지에 주소·지도 영역·길찾기 링크 출력 |
| 비공개 설정 | 잠금 화면, 오답 거부, 정답 시 공개 |
| PWA | manifest 3개 아이콘, 서비스 워커 등록 1건, 모든 셸 자산 200 |
| 저장 용량 | 프로필·배경·배너 이미지 포함 전체 상태 약 68~108KB (localStorage, 5MB 한도 대비 충분) |

---

## 9. 참고 자료

- 기획서: `attachments/2026-11-25/TalkFile_품꾸미기 웹 버전-b2225e3d0bb345f4a4f1af72e02a5aa3.pptx`
- 실제 화면: `pumss.co.kr/Personal/PersonalEdit4.do` · `_preview.do` · `_set.do` · `/@AyoGG`
- 디자인 참고: `kimgeunho4302-cmd/profile-test` (`editor.html` / `shared.js` 의 편집-미리보기 구조)
