/* ==========================================================================
   품 꾸미기 PWA — base.js
   네임스페이스 · 아이콘 · 상태/저장소 · 이미지 처리 · 토스트 · 모달
   ========================================================================== */
(function (global) {
  'use strict';

  var Pum = (global.Pum = global.Pum || {});

  /* ----------------------------------------------------------------------
     상수
     ---------------------------------------------------------------------- */
  var STORAGE_KEY = 'pum.decorator.pwa.v2';
  var SCHEMA_VERSION = 2;

  var THEMES = [
    { id: 'spring', label: '봄', img: 'assets/theme/theme_1.jpg', tint: '#f1f6f1' },
    { id: 'summer', label: '여름', img: 'assets/theme/theme_2.jpg', tint: '#eff5fa' },
    { id: 'autumn', label: '가을', img: 'assets/theme/theme_3.jpg', tint: '#fbf3e9' },
    { id: 'winter', label: '겨울', img: 'assets/theme/theme_4.jpg', tint: '#f1f3f4' }
  ];

  var LAYOUTS = [
    { id: 'profile', label: '프로필', desc: '프로필(사진·이름·소개)만 보여줍니다.' },
    { id: 'full', label: '프로필 전체', desc: '테마 배경 띠 위에 프로필 전체를 보여줍니다.' },
    { id: 'bgprofile', label: '배경+프로필', desc: '배경 이미지와 겹친 프로필을 함께 보여줍니다.' },
    { id: 'bg', label: '배경', desc: '배경 이미지를 크게 깔고 프로필 글만 보여줍니다.' }
  ];

  /* pumss.co.kr PersonalEdit4.do 4-1 레이어 팝업과 동일한 13종 */
  var SNS_LIST = [
    { id: 'homepage', name: '홈페이지' },
    { id: 'phone', name: '연락처' },
    { id: 'email', name: '이메일' },
    { id: 'instagram', name: '인스타그램' },
    { id: 'youtube', name: '유튜브' },
    { id: 'facebook', name: '페이스북' },
    { id: 'x', name: 'X(구트위터)' },
    { id: 'kakaostory', name: '카카오스토리' },
    { id: 'band', name: '네이버밴드' },
    { id: 'blog', name: '네이버블로그' },
    { id: 'play', name: '구글플레이' },
    { id: 'tictoc', name: '틱톡' },
    { id: 'suno', name: 'SUNO' }
  ];

  /* PersonalEdit4.do 8번 앱테크와 동일한 8종 */
  var APPTECH = [
    {
      id: 'car',
      icon: 'assets/apptech/1.jpg',
      title: '<em>자동차</em> 다이렉트 견적',
      desc: '국내 메이저 보험사 취급 / 어차피 낼 금액 최저가는 확인하자!'
    },
    {
      id: 'gift',
      icon: 'assets/apptech/2.jpg',
      title: '개인 답례품, 기업 <em>행사/판촉</em>',
      desc: '대량만 된다고요? 여긴 1개도 OK!'
    },
    {
      id: 'travel',
      icon: 'assets/apptech/3.jpg',
      title: '<em>필수</em> 해외여행자 <em>보험</em>',
      desc: '공항에서 급하게 가입하지 마세요 / 회원가입 없음·가격 선택가능(저/중/고)'
    },
    {
      id: 'it',
      icon: 'assets/apptech/4.jpg',
      title: '모바일 웹/앱 <em>IT솔루션</em>',
      desc: '20년 이상 된 전문가들의 상담으로 당신의 아이디어에 날개를 훨훨~'
    },
    {
      id: 'voucher',
      icon: 'assets/apptech/5.jpg',
      title: '모바일 <em>상품권(기프티쇼)</em> 상담 신청',
      desc: '경조사에도 모바일상품권이 역시 최고! / 리스트 한 번 업로드로 대량 발송도 쉽게!'
    },
    {
      id: 'design',
      icon: 'assets/apptech/6.jpg',
      title: '<em>디자인부터</em> 인쇄까지',
      desc: '대기업 전문 디자이너가 당신 곁으로! 모든 디자인/인쇄 상담가능'
    },
    {
      id: 'lease',
      icon: 'assets/apptech/7.jpg',
      title: '<em>자동차</em> 리스/렌탈',
      desc: '세금·보험료·정비 걱정 끝! 국내 최상의 렌트/리스업체 비교해드립니다.'
    },
    {
      id: 'claim',
      icon: 'assets/apptech/8.jpg',
      title: '보험금 보상 <em>무료 상담</em>',
      desc: '아직도 보험사만 믿나요? 청구부터 합의까지 한번에 해결!'
    }
  ];

  /* 샘플 이미지 (프로필 아바타 · 배경 · 배너) */
  var SAMPLE_PROFILE = [
    'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#dbeafe"/><stop offset="1" stop-color="#fce7f3"/></linearGradient></defs><rect width="240" height="240" fill="url(#g)"/><circle cx="120" cy="96" r="38" fill="#fff" opacity=".92"/><path d="M56 216c6-40 31-62 64-62s58 22 64 62z" fill="#fff" opacity=".92"/></svg>'
      ),
    'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><rect width="240" height="240" fill="#0f172a"/><circle cx="120" cy="98" r="36" fill="none" stroke="#93c5fd" stroke-width="6"/><path d="M62 214c8-38 30-58 58-58s50 20 58 58" fill="none" stroke="#93c5fd" stroke-width="6" stroke-linecap="round"/></svg>'
      ),
    'data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><rect width="240" height="240" fill="#fff7ed"/><circle cx="120" cy="100" r="40" fill="#fdba74"/><circle cx="106" cy="92" r="5" fill="#7c2d12"/><circle cx="134" cy="92" r="5" fill="#7c2d12"/><path d="M104 114c8 8 24 8 32 0" stroke="#7c2d12" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M52 224c8-42 34-66 68-66s60 24 68 66z" fill="#fed7aa"/></svg>'
      )
  ];

  var SAMPLE_BANNER =
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 380"><defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#111827"/><stop offset=".55" stop-color="#25314a"/><stop offset="1" stop-color="#3f5578"/></linearGradient></defs><rect width="1000" height="380" fill="url(#b)"/><circle cx="860" cy="80" r="150" fill="#ff3b30" opacity=".22"/><circle cx="940" cy="330" r="110" fill="#60a5fa" opacity=".18"/><text x="64" y="150" fill="#ffffff" font-family="Pretendard, sans-serif" font-size="46" font-weight="700">이 모든 것을 품에서 무료로</text><text x="64" y="206" fill="#c7d2e1" font-family="Pretendard, sans-serif" font-size="24">내 프로필 · 콘텐츠 블록 · 지도까지 한 페이지에</text><rect x="64" y="248" width="196" height="56" rx="28" fill="#ffffff"/><text x="100" y="285" fill="#111827" font-family="Pretendard, sans-serif" font-size="22" font-weight="700">지금 시작하기</text></svg>'
    );

  var SAMPLE_BG =
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675"><defs><linearGradient id="s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c7d2fe"/><stop offset=".5" stop-color="#e0e7ff"/><stop offset="1" stop-color="#fde68a"/></linearGradient></defs><rect width="1200" height="675" fill="url(#s)"/><circle cx="940" cy="150" r="120" fill="#fff" opacity=".55"/><path d="M0 520c180-70 320 40 520 10s360-90 680-30v175H0z" fill="#ffffff" opacity=".55"/></svg>'
    );

  /* ----------------------------------------------------------------------
     아이콘
     ---------------------------------------------------------------------- */
  var ICONS = {
    back:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5 8 12l7 7"/></svg>',
    home:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/></svg>',
    edit:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg>',
    preview:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M10.5 5h3"/></svg>',
    gear:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 14.3a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3.9a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3.9a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.6 1.4Z"/></svg>',
    plus:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    chevron:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9.5 6 6 6-6"/></svg>',
    arrowUp:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5m0 0-6 6m6-6 6 6"/></svg>',
    arrowDown:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14m0 0 6-6m-6 6-6-6"/></svg>',
    arrowRight:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13m0 0-5-5m5 5-5 5"/></svg>',
    grip:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.7"/><circle cx="15" cy="6" r="1.7"/><circle cx="9" cy="12" r="1.7"/><circle cx="15" cy="12" r="1.7"/><circle cx="9" cy="18" r="1.7"/><circle cx="15" cy="18" r="1.7"/></svg>',
    trash:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 7h15M9.5 7V4.6h5V7M6.5 7l.9 12.1a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4L17.5 7"/></svg>',
    camera:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8.8A2.3 2.3 0 0 1 5.8 6.5h1.5l1.2-2h6.9l1.2 2h1.6a2.3 2.3 0 0 1 2.3 2.3v8.4a2.3 2.3 0 0 1-2.3 2.3H5.8a2.3 2.3 0 0 1-2.3-2.3z"/><circle cx="12" cy="13" r="3.4"/></svg>',
    image:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4.5" width="18" height="15" rx="3"/><circle cx="8.6" cy="10" r="1.6"/><path d="m4.5 17 4.7-4.3a2 2 0 0 1 2.7 0l2.3 2.1 2-1.8a2 2 0 0 1 2.6 0l1.7 1.5"/></svg>',
    close:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    check:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7"/></svg>',
    share:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4m0 0 4.2 4.2M12 4 7.8 8.2"/><path d="M5 14v4.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V14"/></svg>',
    link:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 14.5 14.5 9.5"/><path d="M11 6.8 12.8 5a4.2 4.2 0 0 1 6 6l-1.8 1.8M13 17.2 11.2 19a4.2 4.2 0 0 1-6-6l1.8-1.8"/></svg>',
    video:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.8" y="5.5" width="13.4" height="13" rx="3"/><path d="m16.2 10.5 4-2.4v7.8l-4-2.4z"/></svg>',
    card:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.8" y="5" width="18.4" height="14" rx="3"/><circle cx="8.4" cy="11" r="1.8"/><path d="M5.6 16c.5-1.3 1.5-2 2.8-2s2.3.7 2.8 2"/><path d="M14.4 10h3.6M14.4 13.6h2.6"/></svg>',
    map:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/></svg>',
    pin:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/></svg>',
    search:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="6.4"/><path d="m16 16 4 4"/></svg>',
    play:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>',
    lock:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="2.6"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg>',
    info:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.4"/><path d="M12 11v5.4M12 7.8v.2"/></svg>',
    reset:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/></svg>',
    download:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v10m0 0 4-4m-4 4-4-4"/><path d="M5 16.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-2.5"/></svg>',
    external:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-8.5 8.5"/><path d="M18 14.5V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V7.5A1.5 1.5 0 0 1 5 6h4.5"/></svg>'
  };

  Pum.icon = function (name, extraClass) {
    var svg = ICONS[name] || '';
    if (extraClass) svg = svg.replace('<svg ', '<svg class="svg-icon ' + extraClass + '" ');
    else svg = svg.replace('<svg ', '<svg class="svg-icon" ');
    return svg;
  };

  /* ----------------------------------------------------------------------
     유틸
     ---------------------------------------------------------------------- */
  function uid(prefix) {
    return (prefix || 'b') + '-' + Math.random().toString(36).slice(2, 7) + Date.now().toString(36).slice(-4);
  }

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function debounce(fn, wait) {
    var t = null;
    return function () {
      var args = arguments;
      var self = this;
      clearTimeout(t);
      t = setTimeout(function () {
        fn.apply(self, args);
      }, wait || 300);
    };
  }

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function todayStamp() {
    var d = new Date();
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + mm + '-' + dd;
  }

  function parseYouTube(url) {
    if (!url) return '';
    var m = String(url).match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/
    );
    return m ? m[1] : '';
  }

  Pum.util = {
    uid: uid,
    esc: esc,
    debounce: debounce,
    clamp: clamp,
    todayStamp: todayStamp,
    parseYouTube: parseYouTube,
    sampleProfile: SAMPLE_PROFILE,
    sampleBg: SAMPLE_BG,
    sampleBanner: SAMPLE_BANNER
  };
  Pum.SNS_LIST = SNS_LIST;
  Pum.APPTECH = APPTECH;
  Pum.THEMES = THEMES;
  Pum.LAYOUTS = LAYOUTS;

  Pum.theme = function (id) {
    return THEMES.filter(function (t) {
      return t.id === id;
    })[0] || THEMES[3];
  };

  Pum.snsMeta = function (id) {
    return SNS_LIST.filter(function (s) {
      return s.id === id;
    })[0] || { id: 'homepage', name: '홈페이지' };
  };

  /* ----------------------------------------------------------------------
     기본 상태
     ---------------------------------------------------------------------- */
  function defaultState() {
    return {
      v: SCHEMA_VERSION,
      auth: {
        loggedIn: false,
        user: { email: '', name: '', provider: '', joinedAt: '' }
      },
      profile: {
        slug: '',
        layout: 'bgprofile',
        theme: 'winter',
        imgProfile: '',
        imgBg: '',
        title: '',
        intro: ''
      },
      settings: {
        visibility: 'public',
        password: '',
        subEmail: false,
        subPhone: false,
        bizcard: 'show'
      },
      /* 운영 관리자 백엔드(#/admin) — 사용자 화면과 같은 localStorage 를 공유합니다. */
      admin: defaultAdmin(),
      blocks: [
        {
          id: 'greeting',
          type: 'greeting',
          on: true,
          data: {
            dday: 5,
            brand: '[비온뒤첫소금]',
            title: '어간장 세트 2p(어간장+함초 400g) [원산지:국산(전라남도 신안군)]',
            price: 9500,
            was: 21000,
            off: 54,
            img: ''
          }
        },
        {
          id: 'sns',
          type: 'sns',
          on: true,
          data: {
            items: [
              { icon: 'instagram', url: 'https://www.instagram.com/ncl_peoples' },
              { icon: 'youtube', url: 'https://www.youtube.com/@PUMSS_0292' },
              { icon: 'homepage', url: 'https://pumss.co.kr' }
            ]
          }
        },
        {
          id: 'textlink-1',
          type: 'textlink',
          on: true,
          data: { url: 'https://blog.naver.com/bigused', label: '애기탱의 일상 블로그' }
        },
        { id: 'freepum', type: 'freepum', on: true, locked: true, data: {} },
        {
          id: 'quote',
          type: 'quote',
          on: true,
          data: { text: '가장 좋은 순간은 아직 오지 않았다.', author: '로버트 브라우닝' }
        },
        {
          id: 'news',
          type: 'news',
          on: true,
          data: { title: '오늘의 헤드라인을 확인해 보세요', date: '' }
        },
        { id: 'recs', type: 'recs', on: true, data: {} },
        {
          id: 'video-1',
          type: 'video',
          on: false,
          data: { url: 'https://www.youtube.com/watch?v=noJh_yaoAGE' }
        },
        {
          id: 'apptech',
          type: 'apptech',
          on: true,
          data: { items: APPTECH.map(function () { return true; }) }
        },
        {
          id: 'banner-1',
          type: 'banner',
          on: false,
          data: { url: '', img: '' }
        }
      ]
    };
  }

  /* ----------------------------------------------------------------------
     운영 관리자 기본 데이터
     ---------------------------------------------------------------------- */
  function defaultAdmin() {
    return {
      members: [
        { id: 'm-ayogg', name: '아요지지', email: 'ayogg@pumss.co.kr', slug: 'AyoGG', status: 'active', joinedAt: '2026-09-15', views: 412 },
        { id: 'm-pumss', name: '품스', email: 'pumss@pumss.co.kr', slug: 'pumss', status: 'active', joinedAt: '2026-10-21', views: 1287 },
        { id: 'm-kim', name: '김근호', email: 'kimgeunho@pumss.co.kr', slug: 'kimgeunho', status: 'active', joinedAt: '2026-11-02', views: 96 },
        { id: 'm-bowon', name: '김보원', email: 'bowon@pumss.co.kr', slug: 'bowon', status: 'active', joinedAt: '2026-11-10', views: 58 }
      ],
      reserved: ['admin', 'api', 'login', 'signup', 'share', 'support', 'system'],
      notice: {
        on: false,
        text: '11월 신규 가입 회원에게 품 프로 1개월 무료 쿠폰을 드립니다.'
      },
      banner: {
        eyebrow: '품 무료 만들기',
        title: '이 모든 것을 품에서 무료로',
        subtitle: '내 프로필 · SNS · 콘텐츠 블록 · 지도까지 한 페이지에 담아 공유해 보세요.',
        cta: '초대장 받고 시작하기'
      },
      pumss: {
        syncedAt: '2026-11-25T09:00:00+09:00',
        items: {
          greeting: { on: true, title: '' },
          news: { on: true, title: '' },
          quote: { on: true, text: '', author: '' },
          recs: { on: true, title: '' },
          apptech: {
            on: true,
            title: '',
            items: APPTECH.map(function () {
              return { on: true, title: '', desc: '' };
            })
          }
        }
      },
      reports: [
        { id: 'r-1', target: '@pumss', reason: '허위 홍보 문구 신고', reporter: '@haneul', at: '2026-11-24 14:12', status: '접수' },
        { id: 'r-2', target: '@bowon', reason: '저작권 이미지 사용 신고', reporter: '@minji', at: '2026-11-23 09:40', status: '처리완료' },
        { id: 'r-3', target: '@AyoGG', reason: '스팸 링크 반복 게시', reporter: '@jun', at: '2026-11-22 18:05', status: '접수' }
      ],
      audit: [
        { id: 'a-1', at: '2026-11-25 09:00', who: 'system', action: '품스 콘텐츠 동기화 (12개 항목)' },
        { id: 'a-2', at: '2026-11-24 17:31', who: 'admin', action: '예약어 추가: event' },
        { id: 'a-3', at: '2026-11-24 11:02', who: 'admin', action: '회원 @bowon 상태 변경: 정상 → 정지' }
      ],
      stats: { views: 1853, clicks: 412, day: '', todayViews: 0, todayClicks: 0 }
    };
  }

  Pum.defaultAdmin = defaultAdmin;

  /* ----------------------------------------------------------------------
     상태 · 저장소
     ---------------------------------------------------------------------- */
  var state = null;
  var listeners = [];

  function mergeDeep(base, over) {
    var out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    if (!over || typeof over !== 'object') return out;
    Object.keys(over).forEach(function (k) {
      var bv = out[k];
      var ov = over[k];
      if (Array.isArray(ov)) {
        out[k] = ov.slice();
      } else if (ov && typeof ov === 'object' && bv && typeof bv === 'object' && !Array.isArray(bv)) {
        out[k] = mergeDeep(bv, ov);
      } else if (ov !== undefined) {
        out[k] = ov;
      }
    });
    return out;
  }

  function normalize(s) {
    var d = defaultState();
    if (!s || typeof s !== 'object') return d;
    var out = {
      v: SCHEMA_VERSION,
      auth: Object.assign({}, d.auth, s.auth || {}),
      profile: Object.assign({}, d.profile, s.profile || {}),
      settings: Object.assign({}, d.settings, s.settings || {}),
      blocks: Array.isArray(s.blocks) && s.blocks.length ? s.blocks : d.blocks,
      admin: mergeDeep(d.admin, s.admin || {})
    };
    if (!out.admin.members || !out.admin.members.length) out.admin.members = d.admin.members;
    if (!out.admin.reserved || !out.admin.reserved.length) out.admin.reserved = d.admin.reserved.slice();
    if (!out.admin.pumss || !out.admin.pumss.items) out.admin.pumss = d.admin.pumss;
    out.auth.user = Object.assign({}, d.auth.user, (s.auth && s.auth.user) || {});
    out.blocks = out.blocks.map(function (b) {
      if (!b || !b.type) return null;
      var def = d.blocks.filter(function (x) {
        return x.type === b.type;
      })[0];
      var block = {
        id: b.id || uid(b.type),
        type: b.type,
        on: b.on !== false,
        data: Object.assign({}, (def && def.data) || {}, b.data || {})
      };
      if (b.locked || (def && def.locked)) block.locked = true;
      return block;
    }).filter(Boolean);
    if (!out.blocks.length) out.blocks = d.blocks;
    return out;
  }

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      state = raw ? normalize(JSON.parse(raw)) : defaultState();
    } catch (e) {
      state = defaultState();
    }
    return state;
  }

  function bytesOf(str) {
    return new Blob([str]).size;
  }

  function persist() {
    var json = JSON.stringify(state);
    try {
      localStorage.setItem(STORAGE_KEY, json);
      return true;
    } catch (e) {
      toast('저장 공간이 부족해 저장하지 못했어요. 사진을 줄이거나 오래된 항목을 삭제해 주세요.', 'err');
      return false;
    }
  }

  function save(opts) {
    var ok = persist();
    if (!opts || opts.silent !== true) emit();
    return ok;
  }

  function emit() {
    listeners.forEach(function (fn) {
      try {
        fn(state);
      } catch (e) {
        /* ignore */
      }
    });
  }

  Pum.save = save;

  Pum.getState = function () {
    if (!state) load();
    return state;
  };

  /** 다른 탭(관리자·사용자 화면)이 저장한 내용을 다시 읽어옵니다. */
  Pum.reload = function () {
    load();
    emit();
    return state;
  };

  Pum.setState = function (next) {
    state = normalize(next);
    save();
  };

  Pum.subscribe = function (fn) {
    listeners.push(fn);
    return function () {
      listeners = listeners.filter(function (f) {
        return f !== fn;
      });
    };
  };

  Pum.update = function (mutator, opts) {
    if (!state) load();
    mutator(state);
    return save(opts);
  };

  Pum.resetState = function () {
    state = defaultState();
    save();
  };

  Pum.storageUsage = function () {
    try {
      return bytesOf(localStorage.getItem(STORAGE_KEY) || '');
    } catch (e) {
      return 0;
    }
  };

  Pum.findBlock = function (id) {
    return Pum.getState().blocks.filter(function (b) {
      return b.id === id;
    })[0];
  };

  /* ----------------------------------------------------------------------
     이미지 처리 (업로드 → 캔버스 리사이즈 → DataURL)
     ---------------------------------------------------------------------- */
  function readFileAsDataURL(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () {
        resolve(fr.result);
      };
      fr.onerror = function () {
        reject(new Error('파일을 읽지 못했습니다.'));
      };
      fr.readAsDataURL(file);
    });
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        resolve(img);
      };
      img.onerror = function () {
        reject(new Error('이미지를 해석하지 못했습니다.'));
      };
      img.src = src;
    });
  }

  /**
   * 이미지 파일을 최대 변 길이 maxSize 로 줄이고 JPEG 로 압축한 DataURL 을 돌려줍니다.
   * 투명 PNG 는 PNG 로 유지합니다.
   */
  function compressImage(file, options) {
    var opts = options || {};
    var maxSize = opts.maxSize || 1200;
    var quality = opts.quality || 0.82;
    var targetBytes = opts.targetBytes || 0;

    if (!file || !/^image\//.test(file.type || '')) {
      return Promise.reject(new Error('이미지 파일만 등록할 수 있습니다.'));
    }

    return readFileAsDataURL(file)
      .then(function (dataUrl) {
        return loadImage(dataUrl).then(function (img) {
          var w = img.naturalWidth || img.width;
          var h = img.naturalHeight || img.height;
          if (!w || !h) throw new Error('이미지 크기를 읽지 못했습니다.');
          var scale = Math.min(1, maxSize / Math.max(w, h));
          var cw = Math.max(1, Math.round(w * scale));
          var ch = Math.max(1, Math.round(h * scale));

          var canvas = document.createElement('canvas');
          canvas.width = cw;
          canvas.height = ch;
          var ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          // JPEG 는 투명 영역이 검게 나오므로 흰 배경을 깔아둡니다.
          var keepAlpha = /png|webp|svg/i.test(file.type || '') && opts.keepAlpha !== false;
          if (!keepAlpha) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, cw, ch);
          }
          ctx.drawImage(img, 0, 0, cw, ch);

          var mime = keepAlpha ? 'image/png' : 'image/jpeg';
          var out = canvas.toDataURL(mime, quality);

          // 목표 용량보다 크면 화질을 낮춰 재시도 (최대 4회)
          var q = quality;
          var tries = 0;
          while (targetBytes && bytesOf(out) > targetBytes && tries < 4) {
            q = Math.max(0.5, q - 0.1);
            out = canvas.toDataURL('image/jpeg', q);
            tries += 1;
          }
          return {
            dataUrl: out,
            width: cw,
            height: ch,
            bytes: bytesOf(out)
          };
        });
      });
  }

  Pum.image = {
    compress: compressImage,
    read: readFileAsDataURL,
    load: loadImage,
    bytes: bytesOf,
    /** 여러 장의 누적 용량이 큰지 대략 판단 */
    tooBig: function (dataUrl, limitBytes) {
      return !!dataUrl && bytesOf(dataUrl) > (limitBytes || 900 * 1024);
    }
  };

  /* 파일 선택창을 한 곳에서 관리 (모바일/데스크톱 공통) */
  var picker = null;
  Pum.pickImage = function (acceptFn) {
    picker = picker || document.getElementById('filePicker');
    if (!picker) return;
    picker.value = '';
    var handler = function () {
      var file = picker.files && picker.files[0];
      picker.removeEventListener('change', handler);
      if (file && typeof acceptFn === 'function') acceptFn(file);
    };
    picker.addEventListener('change', handler);
    picker.click();
  };

  /* ----------------------------------------------------------------------
     토스트
     ---------------------------------------------------------------------- */
  function toast(message, kind) {
    var root = document.getElementById('toastRoot');
    if (!root) return;
    var el = document.createElement('div');
    el.className = 'toast' + (kind ? ' toast--' + kind : '');
    el.innerHTML =
      (kind === 'err' ? Pum.icon('info') : Pum.icon('check')) + '<span>' + esc(message) + '</span>';
    root.appendChild(el);
    setTimeout(function () {
      el.style.transition = 'opacity .2s ease, transform .2s ease';
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px)';
      setTimeout(function () {
        el.remove();
      }, 220);
    }, kind === 'err' ? 3200 : 2000);
  }
  Pum.toast = toast;

  /* ----------------------------------------------------------------------
     모달
     ---------------------------------------------------------------------- */
  var openModal = null;

  /**
   * modal({ title, desc, body, actions=[{label, kind, onClick}], center, onClose })
   * body 는 HTML 문자열 또는 노드
   */
  Pum.modal = function (options) {
    var opts = options || {};
    var root = document.getElementById('modalRoot');
    if (!root) return null;
    if (openModal) openModal.close();

    var wrap = document.createElement('div');
    wrap.className = 'modal' + (opts.center ? ' modal--center' : '');
    wrap.innerHTML =
      '<div class="modal__scrim" data-close="1"></div>' +
      '<div class="modal__panel" role="dialog" aria-modal="true">' +
      '<div class="modal__head">' +
      '<div class="modal__headtext"><div class="modal__title"></div>' +
      (opts.desc ? '<div class="modal__desc"></div>' : '') +
      '</div>' +
      '<button type="button" class="modal__close" data-close="1" aria-label="닫기">' +
      Pum.icon('close') +
      '</button>' +
      '</div>' +
      '<div class="modal__body"></div>' +
      '<div class="modal__actions"></div>' +
      '</div>';

    wrap.querySelector('.modal__title').textContent = opts.title || '';
    if (opts.desc) wrap.querySelector('.modal__desc').textContent = opts.desc;

    var bodyNode = wrap.querySelector('.modal__body');
    if (typeof opts.body === 'string') bodyNode.innerHTML = opts.body;
    else if (opts.body) bodyNode.appendChild(opts.body);

    var actionsNode = wrap.querySelector('.modal__actions');
    var actions = opts.actions || [];
    if (!actions.length) actionsNode.remove();
    actions.forEach(function (a) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn--block ' + (a.kind === 'primary' ? 'btn--primary' : a.kind === 'brand' ? 'btn--brand' : 'btn--ghost');
      btn.textContent = a.label;
      btn.addEventListener('click', function () {
        if (typeof a.onClick === 'function') {
          var res = a.onClick(api);
          if (res === false) return;
        }
        api.close();
      });
      actionsNode.appendChild(btn);
    });

    root.appendChild(wrap);
    document.body.style.overflow = 'hidden';

    function close() {
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      openModal = null;
      if (typeof opts.onClose === 'function') opts.onClose();
    }

    function onKey(e) {
      if (e.key === 'Escape') close();
    }

    wrap.addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.getAttribute && t.getAttribute('data-close') === '1') close();
    });
    document.addEventListener('keydown', onKey);

    var api = { el: wrap, body: bodyNode, close: close, setTitle: function (t) { wrap.querySelector('.modal__title').textContent = t; } };
    openModal = api;
    var focusTarget = wrap.querySelector('input, button:not(.modal__close)');
    if (focusTarget && !opts.noFocus) {
      setTimeout(function () {
        try {
          focusTarget.focus({ preventScroll: true });
        } catch (e) {
          /* ignore */
        }
      }, 60);
    }
    return api;
  };

  Pum.confirm = function (message, opts) {
    var o = opts || {};
    return new Promise(function (resolve) {
      Pum.modal({
        center: true,
        title: o.title || '확인',
        desc: message,
        actions: [
          { label: o.cancelLabel || '취소', kind: 'ghost', onClick: function () { resolve(false); } },
          { label: o.okLabel || '확인', kind: o.danger ? 'brand' : 'primary', onClick: function () { resolve(true); } }
        ],
        onClose: function () { resolve(false); }
      });
    });
  };

  Pum.closeModal = function () {
    if (openModal) openModal.close();
  };

  /* ----------------------------------------------------------------------
     라우팅 유틸
     ---------------------------------------------------------------------- */
  Pum.go = function (path) {
    if (location.hash === '#' + path) {
      global.dispatchEvent(new HashChangeEvent('hashchange'));
      return;
    }
    location.hash = path;
  };

  Pum.route = function () {
    return (location.hash || '#/login').replace(/^#/, '');
  };

  /* 시작 */
  load();
})(window);
