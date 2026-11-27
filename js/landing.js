/* ==========================================================================
   품 꾸미기 PWA — landing.js
   품 시작 화면(#/) · 로그인 쇼케이스 · 공유하기 시트 · 페이지 신고(#/report)
   쇼케이스 카드는 실제 공유 페이지(#/share)와 같은 마크업·스타일을 축소해 보여줍니다.
   ========================================================================== */
(function (global) {
  'use strict';

  var Pum = global.Pum;
  var esc = Pum.util.esc;
  var icon = Pum.icon;

  /* 쇼케이스 카드의 기준 폭 (공유 페이지 모바일 폭) */
  var BASE_WIDTH = 390;

  /* ----------------------------------------------------------------------
     쇼케이스 데이터 — 실제 품 공유 페이지 폼(프로필·SNS·링크·배너·지도)
     ---------------------------------------------------------------------- */
  var SHOWCASE = [
    {
      id: 'cafe',
      tag: '카페 · 디저트',
      name: '오후의 라떼',
      title: '오후의 라떼',
      intro: '동네 카페 · 시즌 디저트',
      hero: 'assets/showcase/cafe-hero.jpg',
      avatar: 'assets/showcase/cafe-avatar.jpg',
      links: [
        { label: '시즌 메뉴 보기', url: 'cafe.naver.com/afternoonlatte' },
        { label: '인스타그램', url: 'instagram.com/afternoon_latte' }
      ],
      banner: { img: 'assets/showcase/cafe-hero.jpg', cap: '12월 시즌 디저트가 나왔어요' },
      map: { place: '오후의 라떼', addr: '서울 마포구 연남동 227-14' }
    },
    {
      id: 'flower',
      tag: '플라워',
      name: '봄날 플라워',
      title: '봄날 플라워',
      intro: '꽃다발 · 플라워 클래스',
      hero: 'assets/showcase/flower-hero.jpg',
      avatar: 'assets/showcase/flower-avatar.jpg',
      links: [
        { label: '꽃다발 주문하기', url: 'springflower.kr/order' },
        { label: '원데이 클래스 신청', url: 'springflower.kr/class' }
      ],
      banner: { img: 'assets/showcase/flower-hero.jpg', cap: '오늘 들어온 꽃으로 만든 꽃다발' },
      map: { place: '봄날 플라워', addr: '서울 서초구 반포동 18-3' }
    },
    {
      id: 'yoga',
      tag: '운동 · 요가',
      name: '밸런스 요가',
      title: '밸런스 요가 스튜디오',
      intro: '소규모 클래스 · 1:1 레슨',
      hero: 'assets/showcase/yoga-hero.jpg',
      avatar: 'assets/showcase/yoga-avatar.jpg',
      links: [
        { label: '수업 시간표', url: 'balanceyoga.kr/schedule' },
        { label: '체험 수업 신청', url: 'balanceyoga.kr/trial' }
      ],
      banner: { img: 'assets/showcase/yoga-hero.jpg', cap: '이번 주 오픈 클래스 안내' },
      map: { place: '밸런스 요가', addr: '서울 강남구 역삼동 736' }
    },
    {
      id: 'music',
      tag: '뮤지션',
      name: '새벽의 밴드',
      title: '새벽의 밴드',
      intro: '공연 · 음원 · 굿즈',
      hero: 'assets/showcase/music-hero.jpg',
      avatar: 'assets/showcase/music-avatar.jpg',
      links: [
        { label: '공연 일정 보기', url: 'dawnband.kr/live' },
        { label: '음원 듣기', url: 'music.apple.com/dawnband' }
      ],
      banner: { img: 'assets/showcase/music-hero.jpg', cap: '12월 단독 공연 티켓 오픈' },
      map: { place: '홍대 라이브홀', addr: '서울 마포구 서교동 332-4' }
    },
    {
      id: 'pet',
      tag: '반려동물',
      name: '멍멍이 사진관',
      title: '멍멍이 사진관',
      intro: '반려동물 스냅 · 가족사진',
      hero: 'assets/showcase/pet-hero.jpg',
      avatar: 'assets/showcase/pet-avatar.jpg',
      links: [
        { label: '촬영 예약하기', url: 'mungstudio.kr/book' },
        { label: '촬영 후기 보기', url: 'blog.naver.com/mungstudio' }
      ],
      banner: { img: 'assets/showcase/pet-hero.jpg', cap: '겨울 한정 실내 스냅 촬영' },
      map: { place: '멍멍이 사진관', addr: '경기 성남시 분당구 정자동 12' }
    },
    {
      id: 'travel',
      tag: '여행',
      name: '제주 감성여행',
      title: '제주 감성여행',
      intro: '여행 기록 · 숙소 추천',
      hero: 'assets/showcase/travel-hero.jpg',
      avatar: 'assets/showcase/travel-avatar.jpg',
      links: [
        { label: '3박 4일 코스 보기', url: 'jejutrip.kr/course' },
        { label: '숙소 리스트', url: 'jejutrip.kr/stay' }
      ],
      banner: { img: 'assets/showcase/travel-hero.jpg', cap: '노을 맛집 BEST 5' },
      map: { place: '제주 협재 해변', addr: '제주시 한림읍 협재리' }
    },
    {
      id: 'bakery',
      tag: '베이커리',
      name: '동네 빵집',
      title: '동네 빵집',
      intro: '매일 아침 굽는 빵',
      hero: 'assets/showcase/bakery-hero.jpg',
      avatar: 'assets/showcase/bakery-avatar.jpg',
      links: [
        { label: '오늘의 빵 보기', url: 'dailybread.kr/today' },
        { label: '단체 주문 문의', url: 'dailybread.kr/order' }
      ],
      banner: { img: 'assets/showcase/bakery-hero.jpg', cap: '크루아상 11시에 나옵니다' },
      map: { place: '동네 빵집', addr: '서울 송파구 방이동 45-2' }
    },
    {
      id: 'salon',
      tag: '뷰티',
      name: '헤어살롱 무드',
      title: '헤어살롱 무드',
      intro: '헤어 · 스타일링 예약',
      hero: 'assets/showcase/salon-hero.jpg',
      avatar: 'assets/showcase/salon-avatar.jpg',
      links: [
        { label: '시술 가격표', url: 'salonmood.kr/price' },
        { label: '예약하기', url: 'salonmood.kr/book' }
      ],
      banner: { img: 'assets/showcase/salon-hero.jpg', cap: '겨울 컬러 이벤트' },
      map: { place: '헤어살롱 무드', addr: '서울 강남구 청담동 78' }
    },
    {
      id: 'interior',
      tag: '인테리어',
      name: '리브인 하우스',
      title: '리브인 하우스',
      intro: '인테리어 · 원룸 투어',
      hero: 'assets/showcase/interior-hero.jpg',
      avatar: 'assets/showcase/interior-avatar.jpg',
      links: [
        { label: '매물 보기', url: 'liveinhouse.kr/list' },
        { label: '상담 신청', url: 'liveinhouse.kr/contact' }
      ],
      banner: { img: 'assets/showcase/interior-hero.jpg', cap: '채광 좋은 투룸 공개' },
      map: { place: '리브인 하우스', addr: '서울 용산구 이촌동 302' }
    }
  ];

  function snsRowHTML() {
    return (
      '<section class="s-card" aria-label="SNS"><div class="s-sns">' +
      ['instagram', 'youtube', 'homepage']
        .map(function (id) {
          return '<a class="s-sns__item" href="#/" tabindex="-1" aria-hidden="true"><img src="assets/sns/' + id + '.jpg" alt="" /></a>';
        })
        .join('') +
      '</div></section>'
    );
  }

  function linkCardHTML(link) {
    return (
      '<div class="s-card s-link">' +
      '<div class="s-link__body"><div class="s-link__label">' + esc(link.label) + '</div>' +
      '<div class="s-link__url">' + esc(link.url) + '</div></div>' +
      '<span class="s-link__arrow">' + icon('arrowRight') + '</span></div>'
    );
  }

  function bannerHTML(b) {
    return (
      '<figure class="s-banner s-banner--large">' +
      '<span class="s-banner__media"><img src="' + b.img + '" alt="" loading="lazy" /></span>' +
      '<span class="s-banner__cap">' + esc(b.cap) + '</span></figure>'
    );
  }

  function mapHTML(m) {
    return (
      '<section class="s-card" aria-label="지도">' +
      '<div class="s-head"><h3>오시는 길</h3></div>' +
      '<div class="s-map">' +
      '<div class="s-map__addr">' + icon('pin') +
      '<div><strong>' + esc(m.place) + '</strong><span>' + esc(m.addr) + '</span></div></div>' +
      '<div class="s-map__canvas"><div class="s-map__fallback"><span class="pin"><i></i></span>' +
      '<strong>' + esc(m.addr) + '</strong><span>지도에서 위치를 확인하세요</span></div></div>' +
      '</div></section>'
    );
  }

  /** 공유 페이지(#/share)와 같은 마크업으로 만든 축소 페이지 */
  function pageMock(item, opts) {
    var o = opts || {};
    var heroStyle =
      '--hero-base:#ffffff;--hero-fg:#16191d;--hero-muted:#6b7480;--hero-line:#e7e9ee;' +
      "--hero-photo:url('" + item.hero + "');";
    var body =
      '<div class="share" data-theme="winter" data-scheme="light" data-layout="bgprofile" ' +
      'style="--share-base:#f1f3f4;--share-surface:#ffffff;--share-surface-2:#f7f9fb;--share-fg:#16191d;' +
      '--share-ink:#16191d;--share-muted:#6b7480;--share-line:#e7e9ee;--share-chip:#f4f6f9">' +
      '<div class="share__inner">' +
      '<section class="hero hero--bgprofile hero--photo" style="' + heroStyle + '" aria-label="프로필">' +
      '<div class="hero__bg" aria-hidden="true"></div><div class="hero__scrim" aria-hidden="true"></div>' +
      '<div class="hero__avatar"><img src="' + item.avatar + '" alt="" /></div>' +
      '<div class="hero__body"><div class="hero__title">' + esc(item.title) + '</div>' +
      '<div class="hero__intro">' + esc(item.intro) + '</div></div></section>' +
      snsRowHTML() +
      linkCardHTML(item.links[0]) +
      (o.short ? '' : bannerHTML(item.banner)) +
      (o.short ? '' : linkCardHTML(item.links[1])) +
      (o.short ? '' : mapHTML(item.map)) +
      '<div class="share__brand">' + icon('check') + '<span>made by <strong>품</strong></span></div>' +
      '</div></div>';
    return body;
  }

  /** 축소 카드 한 장 */
  function showcaseCard(item, opts) {
    var o = opts || {};
    return (
      '<article class="sc-card' + (o.className ? ' ' + o.className : '') + '">' +
      '<div class="sc-frame">' +
      '<div class="sc-zoom" data-sc-zoom>' + pageMock(item, o) + '</div>' +
      '</div>' +
      (o.caption === false
        ? ''
        : '<p class="sc-card__cap"><span class="sc-card__tag">' + esc(item.tag) + '</span>' +
          '<b>' + esc(item.name) + '</b></p>') +
      '</article>'
    );
  }

  /** 프레임 폭에 맞춰 축소 배율을 다시 계산 (화면 크기 변경 시에도 호출) */
  function fitPreviews(root) {
    var scope = root || document;
    var nodes = scope.querySelectorAll('[data-sc-zoom]');
    Array.prototype.forEach.call(nodes, function (zoom) {
      var frame = zoom.parentElement;
      if (!frame) return;
      var w = frame.clientWidth;
      if (!w) return;
      zoom.style.transformOrigin = 'top left';
      zoom.style.transform = 'scale(' + (w / BASE_WIDTH) + ')';
    });
  }

  var fitTimer = null;
  function scheduleFit(scope) {
    clearTimeout(fitTimer);
    fitTimer = setTimeout(function () {
      fitPreviews(scope);
    }, 60);
  }
  global.addEventListener('resize', function () {
    scheduleFit(document);
  });

  /* ----------------------------------------------------------------------
     시작 화면(#/)
     ---------------------------------------------------------------------- */
  var LOGO_HTML =
    '<span class="lp-brand__mark">품</span><span class="lp-brand__word">PUMSS</span>';

  function landingView(app) {
    var st = Pum.getState();
    var logged = !!(st.auth && st.auth.loggedIn);

    var cards = SHOWCASE.map(function (item) {
      return showcaseCard(item);
    }).join('');

    var features = [
      { icon: 'card', title: '프로필 · SNS · 링크', desc: '사진과 소개, SNS 채널, 링크를 한 페이지에 모아 보여줍니다.' },
      { icon: 'image', title: '콘텐츠 블록 10종', desc: '반갑데이·뉴스·명언·추천 콘텐츠·앱테크·동영상·배너·지도까지 블록으로 담습니다.' },
      { icon: 'share', title: '링크 · QR로 공유', desc: '공유하기 한 번으로 링크 복사, QR 저장, SNS 공유까지 끝냅니다.' },
      { icon: 'link', title: '품스 콘텐츠 연동', desc: '품스(PUMSS)의 보험·영업 콘텐츠를 내 품에 그대로 연결합니다.' },
      { icon: 'preview', title: '모바일 · PC 반응형', desc: '휴대폰에서 보기 좋게, PC에서는 넓게. 홈 화면에 추가하면 앱처럼 열립니다.' },
      { icon: 'shield', title: '안전한 운영 정책', desc: '신고 접수와 운영 관리자 검수를 통해 불법·유해 페이지를 관리합니다.' }
    ]
      .map(function (f) {
        return (
          '<article class="lp-feat"><span class="lp-feat__icon">' + icon(f.icon) + '</span>' +
          '<h3>' + esc(f.title) + '</h3><p>' + esc(f.desc) + '</p></article>'
        );
      })
      .join('');

    var steps = [
      { n: '1', title: '품 주소 정하기', desc: '영문으로 나만의 주소(@아이디)를 정합니다.' },
      { n: '2', title: '프로필과 블록 꾸미기', desc: '사진·소개·링크·콘텐츠 블록을 골라 배치합니다.' },
      { n: '3', title: '링크 하나로 공유', desc: '공유하기와 QR로 어디서든 내 품을 전합니다.' }
    ]
      .map(function (s) {
        return (
          '<li class="lp-step"><span class="lp-step__num">' + s.n + '</span>' +
          '<b>' + esc(s.title) + '</b><p>' + esc(s.desc) + '</p></li>'
        );
      })
      .join('');

    app.innerHTML =
      '<div class="landing">' +
      /* 헤더 */
      '<header class="lp-head">' +
      '<a class="lp-brand" href="#/" aria-label="품 홈">' + LOGO_HTML + '</a>' +
      '<nav class="lp-nav" aria-label="품 안내">' +
      '<button type="button" data-lp-scroll="lp-showcase">사례</button>' +
      '<button type="button" data-lp-scroll="lp-features">기능</button>' +
      '<button type="button" data-lp-scroll="lp-flow">만들기</button>' +
      '<button type="button" data-nav="terms">이용약관</button>' +
      '</nav>' +
      '<div class="lp-head__actions">' +
      (logged
        ? '<button type="button" class="btn btn--ghost btn--sm" data-nav="editor">내 품 꾸미기</button>'
        : '<button type="button" class="btn btn--ghost btn--sm" data-nav="login">로그인</button>') +
      '<button type="button" class="btn btn--brand btn--sm" data-nav="' + (logged ? 'share' : 'signup') + '">' +
      (logged ? '내 품 보기' : '무료로 시작하기') +
      '</button>' +
      '</div></header>' +

      /* 히어로 */
      '<section class="lp-hero">' +
      '<div class="lp-hero__copy">' +
      '<p class="lp-hero__eyebrow">나의 디지털 세계, 품</p>' +
      '<h1 class="lp-hero__title">프로필부터 콘텐츠까지<br/>링크 하나로, <em>품</em>나게</h1>' +
      '<p class="lp-hero__sub">사진·소개·SNS·링크·콘텐츠 블록을 한 페이지에 담아 공유하세요. ' +
      '코딩도 디자인도 없이 5분이면 내 품이 완성됩니다.</p>' +
      '<div class="lp-hero__cta">' +
      '<button type="button" class="btn btn--brand" data-nav="' + (logged ? 'editor' : 'signup') + '">' +
      (logged ? '내 품 꾸미러 가기' : '무료로 시작하기') + '</button>' +
      (logged
        ? ''
        : '<button type="button" class="btn btn--ghost" data-nav="login">로그인</button>') +
      '</div>' +
      '<ul class="lp-hero__meta">' +
      '<li>가입비 0원</li><li>5분 완성</li><li>모바일 · PC</li></ul>' +
      '</div>' +
      '<div class="lp-hero__art">' +
      '<div class="lp-hero__card lp-hero__card--back" aria-hidden="true">' +
      '<div class="sc-zoom" data-sc-zoom>' + pageMock(SHOWCASE[1], { short: true }) + '</div>' +
      '</div>' +
      '<div class="lp-hero__card lp-hero__card--front">' +
      '<div class="sc-zoom" data-sc-zoom>' + pageMock(SHOWCASE[0]) + '</div>' +
      '</div>' +
      '<span class="lp-hero__chip">' + icon('share') + '링크 · QR 공유</span>' +
      '</div></section>' +

      /* 쇼케이스 */
      '<section class="lp-showcase" id="lp-showcase">' +
      '<div class="lp-sec__head">' +
      '<h2>품으로 만든 페이지들</h2>' +
      '<p>카페부터 클래스, 공연, 스튜디오까지 — 실제 품 공유 페이지와 같은 폼으로 만든 예시입니다.</p>' +
      '</div>' +
      '<div class="lp-showcase__rail">' + cards + '</div>' +
      '</section>' +

      /* 기능 */
      '<section class="lp-features" id="lp-features">' +
      '<div class="lp-sec__head"><h2>품 하나면 충분해요</h2>' +
      '<p>프로필 링크부터 콘텐츠 연동, 공유와 운영까지 한 곳에서.</p></div>' +
      '<div class="lp-features__grid">' + features + '</div>' +
      '</section>' +

      /* 3단계 */
      '<section class="lp-flow" id="lp-flow">' +
      '<div class="lp-sec__head"><h2>만드는 방법은 3단계</h2>' +
      '<p>주소를 정하고, 꾸미고, 공유하면 끝입니다.</p></div>' +
      '<ol class="lp-steps">' + steps + '</ol>' +
      '</section>' +

      /* 마지막 CTA */
      '<section class="lp-cta">' +
      '<h2>지금, 내 품을 만들어 보세요</h2>' +
      '<p>무료로 시작하고 링크 하나로 나를 소개하세요.</p>' +
      '<div class="lp-cta__actions">' +
      '<button type="button" class="btn btn--brand" data-nav="' + (logged ? 'editor' : 'signup') + '">' +
      (logged ? '내 품 꾸미기' : '무료로 시작하기') + '</button>' +
      '<button type="button" class="btn btn--ghost" data-nav="login">로그인</button>' +
      '</div></section>' +
      '</div>';

    app.querySelectorAll('[data-lp-scroll]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var target = app.querySelector('#' + btn.getAttribute('data-lp-scroll'));
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    fitPreviews(app);
    document.title = '품(PUMSS) · 나의 디지털 세계, 링크 하나로';
  }

  /* ----------------------------------------------------------------------
     로그인 · 회원가입 좌측 쇼케이스
     ---------------------------------------------------------------------- */
  function authShowcaseHTML() {
    var colA = [SHOWCASE[0], SHOWCASE[3], SHOWCASE[6]].map(function (i) {
      return showcaseCard(i, { caption: false, short: true });
    });
    var colB = [SHOWCASE[1], SHOWCASE[4], SHOWCASE[7]].map(function (i) {
      return showcaseCard(i, { caption: false, short: true });
    });
    function marquee(inner, cls) {
      return '<div class="auth-show__col ' + cls + '"><div class="auth-show__track">' + inner + inner + '</div></div>';
    }
    return (
      '<aside class="auth-show" aria-hidden="true">' +
      '<div class="auth-show__head">' +
      '<span class="auth-show__eyebrow">나의 디지털 세계, 품</span>' +
      '<h2>내 프로필과 소식을<br/>한 페이지에 담아 공유하세요</h2>' +
      '<p>품스(PUMSS)가 만든 무료 프로필 링크 서비스</p>' +
      '</div>' +
      '<div class="auth-show__rail">' +
      marquee(colA.join(''), 'auth-show__col--a') +
      marquee(colB.join(''), 'auth-show__col--b') +
      '</div>' +
      '<p class="auth-show__foot">' + icon('shield') + '신고 접수 · 운영 정책으로 안전하게 관리됩니다</p>' +
      '</aside>'
    );
  }

  /* ----------------------------------------------------------------------
     공유하기 시트
     ---------------------------------------------------------------------- */
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(
        function () {
          return true;
        },
        function () {
          return legacyCopy(text);
        }
      );
    }
    return Promise.resolve(legacyCopy(text));
  }

  function legacyCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-1000px;left:0;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      return false;
    }
  }

  function shareSnsHTML(url, title) {
    var u = encodeURIComponent(url);
    var t = encodeURIComponent(title + ' · 품');
    var items = [
      { id: 'kakao', label: '카카오톡', img: 'assets/sns/kakaostory.jpg', href: '' },
      { id: 'x', label: 'X', img: 'assets/sns/x.jpg', href: 'https://twitter.com/intent/tweet?text=' + t + '&url=' + u },
      { id: 'facebook', label: '페이스북', img: 'assets/sns/facebook.jpg', href: 'https://www.facebook.com/sharer/sharer.php?u=' + u },
      { id: 'band', label: '밴드', img: 'assets/sns/band.jpg', href: 'https://band.us/plugin/share?body=' + encodeURIComponent(title + ' ' + url) },
      { id: 'blog', label: '블로그', img: 'assets/sns/blog.jpg', href: '' }
    ];
    return items
      .map(function (it) {
        var inner =
          '<span class="sh__sns-icon"><img src="' + it.img + '" alt="" /></span><span>' + it.label + '</span>';
        return it.href
          ? '<a class="sh__sns-btn" href="' + it.href + '" target="_blank" rel="noopener">' + inner + '</a>'
          : '<button type="button" class="sh__sns-btn" data-sh-native="' + it.id + '">' + inner + '</button>';
      })
      .join('');
  }

  function shareSheet(url, opts) {
    var o = opts || {};
    var st = Pum.getState();
    var title = o.title || st.profile.title || '내 품';
    var avatar = st.profile.imgProfile || 'assets/icons/icon-192.png';
    var target = o.slug || st.profile.slug || '';
    var display = url.replace(/^https?:\/\//, '');

    var body =
      '<div class="sh">' +
      '<div class="sh__head">' +
      '<img class="sh__thumb" src="' + esc(avatar) + '" alt="" />' +
      '<div class="sh__meta"><b>' + esc(title) + '</b><span>' + esc(display) + '</span></div>' +
      '</div>' +
      '<div class="sh__link">' +
      '<input class="input" id="shUrl" readonly value="' + esc(url) + '" aria-label="공유 주소" />' +
      '<button type="button" class="btn btn--sm btn--primary" data-sh-copy>' + icon('copy') + '복사</button>' +
      '</div>' +
      '<div class="sh__qr"><div class="sh__qr-canvas"><canvas id="shQr" width="220" height="220"></canvas></div>' +
      '<p class="sh__qr-hint">QR을 스캔하면 이 품 페이지로 이동합니다.</p>' +
      '<div class="sh__qr-actions">' +
      '<button type="button" class="btn btn--sm btn--ghost" data-sh-qr>' + icon('download') + 'QR 저장</button>' +
      '<button type="button" class="btn btn--sm btn--ghost" data-sh-native="share">' + icon('share') + '기기로 공유</button>' +
      '</div></div>' +
      '<div class="sh__sns">' + shareSnsHTML(url, title) + '</div>' +
      '<div class="sh__more">' +
      '<a class="sh__more-row" href="#/signup" data-sh-signup>' +
      '<span><b>이런 페이지를 만들고 싶다면?</b><em>품은 무료로 만들 수 있어요</em></span>' +
      '<b class="sh__more-cta">무료 개설</b></a>' +
      '<button type="button" class="sh__more-row sh__more-row--report" data-sh-report>' +
      '<span><b>페이지 신고</b><em>권리 침해 · 사칭 · 스팸 · 불법 게시물</em></span>' +
      '<b class="sh__more-cta">신고하기</b></button>' +
      '</div></div>';

    var m = Pum.modal({
      title: '공유하기',
      desc: '링크 복사, QR 저장, SNS 공유 중 편한 방법을 선택하세요.',
      body: body,
      actions: [{ label: '닫기', kind: 'ghost' }]
    });
    if (!m) return;
    m.el.classList.add('modal--share');

    var canvas = m.body.querySelector('#shQr');
    if (canvas) Pum.qr.draw(canvas, url, 200);

    function toastCopied(ok) {
      Pum.toast(ok ? '공유 링크를 복사했습니다' : '주소를 길게 눌러 복사해 주세요', ok ? 'ok' : 'err');
    }

    m.body.querySelector('[data-sh-copy]').addEventListener('click', function () {
      copyText(url).then(toastCopied);
    });

    var qrBtn = m.body.querySelector('[data-sh-qr]');
    if (qrBtn) {
      qrBtn.addEventListener('click', function () {
        Pum.qr.download(canvas, 'pum-qr-' + (target || 'pum') + '.png');
        Pum.toast('QR 이미지를 저장했습니다');
      });
    }

    m.body.querySelectorAll('[data-sh-native]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var kind = btn.getAttribute('data-sh-native');
        if (navigator.share) {
          navigator.share({ title: title + ' · 품', url: url }).catch(function () {});
          return;
        }
        copyText(url).then(function (ok) {
          toastCopied(ok);
          if (ok && kind === 'kakao') Pum.toast('카카오톡에 붙여넣어 공유해 보세요');
        });
      });
    });

    var signup = m.body.querySelector('[data-sh-signup]');
    if (signup) {
      signup.addEventListener('click', function (e) {
        e.preventDefault();
        m.close();
        Pum.go('/signup');
      });
    }

    var report = m.body.querySelector('[data-sh-report]');
    if (report) {
      report.addEventListener('click', function () {
        m.close();
        Pum.go('/report' + (target ? '?target=' + encodeURIComponent(target) : ''));
      });
    }
  }

  /* ----------------------------------------------------------------------
     페이지 신고(#/report) — 리틀리 신고 안내(Tally) 구조를 품에 맞게 다듬음
     ---------------------------------------------------------------------- */
  var REPORT_REASONS = [
    { v: '타인의 정보 도용(사칭)', d: '실명·상호·연락처를 도용하거나 타인을 사칭한 페이지' },
    { v: '지식재산권 침해', d: '저작권·초상권·상표권 등 회사 또는 제3자의 권리 침해' },
    { v: '명예훼손 · 업무방해', d: '허위 사실로 개인·기업의 명예를 훼손하거나 업무를 방해' },
    { v: '음란 · 공서양속 위반', d: '음란물, 폭력적·유해한 정보의 게시' },
    { v: '스팸 · 사기 · 피싱', d: '반복 광고, 사기 링크, 개인정보·금전 요구' },
    { v: '기타 불법 · 부당 행위', d: '그 밖에 품 이용약관과 운영정책에 어긋나는 행위' }
  ];

  function stampNow() {
    var d = new Date();
    function pad(n) {
      return (n < 10 ? '0' : '') + n;
    }
    return (
      d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
      pad(d.getHours()) + ':' + pad(d.getMinutes())
    );
  }

  function ownerEmailOf(slug) {
    var ad = (Pum.adminData && Pum.adminData()) || null;
    if (!ad || !ad.members) return '';
    var found = ad.members.filter(function (m) {
      return String(m.slug || '').toLowerCase() === String(slug || '').toLowerCase();
    })[0];
    return (found && found.email) || '';
  }

  function reportView(app) {
    var q = Pum.query() || {};
    var raw = String(q.target || q.url || '').trim();
    var slug = raw.replace(/^.*@/, '').replace(/^@/, '').split('/')[0].trim();
    var defaultUrl = raw && /^https?:\/\//.test(raw) ? raw : slug ? 'https://pumss.co.kr/@' + slug : '';
    var st = Pum.getState();
    if (!slug && st.profile && st.profile.slug) {
      slug = st.profile.slug;
      defaultUrl = 'https://pumss.co.kr/@' + slug;
    }

    app.innerHTML =
      '<header class="appbar">' +
      '<button type="button" class="appbar__icon" data-nav="back" aria-label="뒤로">' + icon('back') + '</button>' +
      '<div class="appbar__title">페이지 신고</div><div class="appbar__right"></div></header>' +
      '<div class="shell report-page">' +
      '<section class="report-head">' +
      '<span class="report-head__badge">신고 접수</span>' +
      '<h1>페이지 신고</h1>' +
      '<p>품의 <button type="button" class="linkbtn linkbtn--inline" data-site-policy="terms">이용약관</button>과 ' +
      '운영정책에 따르지 않는 페이지나 저작권 침해 등 부적절한 콘텐츠를 신고해 주세요. ' +
      '접수된 내용은 운영 관리자가 검토 후 처리합니다.</p>' +
      '</section>' +

      '<div class="map-note">' + icon('info') +
      '<span><b>안내</b><br/>이 창구는 <b>페이지 신고</b> 전용입니다. 서비스 이용 문의·계정 문의는 ' +
      '<a href="mailto:support@pumss.co.kr">support@pumss.co.kr</a>로 보내 주세요. ' +
      '허위 신고를 반복하면 이용이 제한될 수 있습니다.</span></div>' +

      '<form class="card is-open report-form" id="reportForm" novalidate>' +
      '<div class="card__head"><h2 class="card__title">신고 내용</h2>' +
      '<span class="card__sub" style="margin-left:auto">필수 항목 *</span></div>' +
      '<div class="card__body">' +
      '<div class="field"><label class="field__label" for="rpTarget">신고할 페이지 주소 <span class="req">*</span></label>' +
      '<input class="input" id="rpTarget" type="url" inputmode="url" placeholder="https://pumss.co.kr/@아이디" value="' + esc(defaultUrl) + '" />' +
      '<div class="field__hint">신고 대상 품 주소를 정확히 적어 주세요.</div>' +
      '<div class="auth__error" id="rpTargetError"></div></div>' +

      '<div class="field"><label class="field__label" for="rpEmail">신고자 이메일 <span class="req">*</span></label>' +
      '<input class="input" id="rpEmail" type="email" inputmode="email" autocomplete="email" placeholder="example@email.com" />' +
      '<div class="field__hint">처리 결과를 회신받을 이메일입니다. 페이지에 공개되지 않습니다.</div>' +
      '<div class="auth__error" id="rpEmailError"></div></div>' +

      '<div class="field"><span class="field__label">신고 사유 <span class="req">*</span></span>' +
      '<div class="report-reasons">' +
      REPORT_REASONS.map(function (r, i) {
        return (
          '<label class="report-reason"><input type="radio" name="rpReason" value="' + esc(r.v) + '"' + (i === 0 ? '' : '') + '/>' +
          '<span><b>' + esc(r.v) + '</b><em>' + esc(r.d) + '</em></span></label>'
        );
      }).join('') +
      '</div><div class="auth__error" id="rpReasonError"></div></div>' +

      '<div class="field"><label class="field__label" for="rpDetail">신고 이유 · 상세 내용 <span class="req">*</span></label>' +
      '<textarea class="textarea" id="rpDetail" rows="5" maxlength="1000" ' +
      'placeholder="어떤 부분이 문제인지 구체적으로 적어 주세요. (예: 3번째 배너의 사진이 제 사진을 무단 사용했습니다)"></textarea>' +
      '<div class="field__hint"><span id="rpCount">0</span>/1000자</div>' +
      '<div class="auth__error" id="rpDetailError"></div></div>' +

      '<div class="field"><label class="field__label" for="rpFile">참고 자료 <span class="card__sub">(선택)</span></label>' +
      '<input class="input report-file" id="rpFile" type="file" />' +
      '<div class="field__hint" id="rpFileHint">권리 침해를 확인할 수 있는 캡처·문서가 있다면 첨부해 주세요. (데모에서는 파일 이름만 접수됩니다)</div></div>' +

      '<label class="check-row check-row--compact"><input type="checkbox" id="rpAgree" />' +
      '<span style="font-size:12px">허위 신고 시 이용이 제한될 수 있으며, 개인정보 수집·이용에 동의합니다. <span class="req">*</span></span></label>' +
      '<div class="auth__error" id="rpAgreeError"></div>' +

      '<button type="submit" class="btn btn--brand btn--block">신고 접수하기</button>' +
      '</div></form>' +

      '<section class="report-flow">' +
      '<h2>처리 절차</h2>' +
      '<ol>' +
      '<li><b>접수</b><span>신고 내용과 대상 페이지를 확인합니다.</span></li>' +
      '<li><b>검토</b><span>운영 관리자가 약관·운영정책 위반 여부를 검토합니다.</span></li>' +
      '<li><b>조치 · 회신</b><span>게시중단·비공개·이용 정지 등 조치 후 이메일로 안내합니다.</span></li>' +
      '</ol></section>' +
      '</div>';

    document.title = '페이지 신고 · 품';

    var form = app.querySelector('#reportForm');
    var detail = app.querySelector('#rpDetail');
    var count = app.querySelector('#rpCount');
    var fileEl = app.querySelector('#rpFile');

    detail.addEventListener('input', function () {
      count.textContent = String(detail.value.length);
    });

    if (fileEl) {
      fileEl.addEventListener('change', function () {
        var f = fileEl.files && fileEl.files[0];
        app.querySelector('#rpFileHint').textContent = f
          ? '첨부: ' + f.name
          : '권리 침해를 확인할 수 있는 캡처·문서가 있다면 첨부해 주세요. (데모에서는 파일 이름만 접수됩니다)';
      });
    }

    function setErr(id, msg) {
      var box = app.querySelector(id);
      if (box) box.textContent = msg || '';
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var targetUrl = app.querySelector('#rpTarget').value.trim();
      var email = app.querySelector('#rpEmail').value.trim();
      var reasonEl = form.querySelector('input[name="rpReason"]:checked');
      var detailText = detail.value.trim();
      var agree = app.querySelector('#rpAgree').checked;
      var reason = reasonEl ? reasonEl.value : '';
      var bad = false;

      setErr('#rpTargetError', '');
      setErr('#rpEmailError', '');
      setErr('#rpReasonError', '');
      setErr('#rpDetailError', '');
      setErr('#rpAgreeError', '');

      if (!targetUrl) {
        setErr('#rpTargetError', '신고할 페이지 주소를 입력해 주세요.');
        bad = true;
      } else if (!/^https?:\/\/.+/.test(targetUrl)) {
        setErr('#rpTargetError', 'http:// 또는 https:// 로 시작하는 주소를 입력해 주세요.');
        bad = true;
      }
      if (!email) {
        setErr('#rpEmailError', '신고자 이메일을 입력해 주세요.');
        bad = true;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        setErr('#rpEmailError', '이메일 형식으로 입력해 주세요.');
        bad = true;
      }
      if (!reason) {
        setErr('#rpReasonError', '신고 사유를 선택해 주세요.');
        bad = true;
      }
      if (detailText.length < 5) {
        setErr('#rpDetailError', '상세 내용을 5자 이상 적어 주세요.');
        bad = true;
      }
      if (!agree) {
        setErr('#rpAgreeError', '확인 항목에 체크해 주세요.');
        bad = true;
      }
      if (bad) {
        var first = app.querySelector('.auth__error:not(:empty)');
        if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      var targetSlug = (targetUrl.match(/@([A-Za-z0-9._-]+)/) || [])[1] || slug || '';
      var id = 'r-' + Date.now().toString(36);
      var at = stampNow();
      var file = fileEl && fileEl.files && fileEl.files[0];

      Pum.update(function (s) {
        s.admin = s.admin || {};
        s.admin.reports = s.admin.reports || [];
        s.admin.reports.unshift({
          id: id,
          target: targetSlug ? '@' + targetSlug : targetUrl,
          slug: targetSlug,
          url: targetUrl,
          email: ownerEmailOf(targetSlug),
          reason: reason,
          detail: detailText,
          reporter: email,
          reporterEmail: email,
          attach: file ? file.name : '',
          at: at,
          status: '접수',
          source: 'report-page'
        });
        if (s.admin.reports.length > 100) s.admin.reports.length = 100;
      });
      if (Pum.logAudit) Pum.logAudit('페이지 신고 접수 · ' + (targetSlug ? '@' + targetSlug : targetUrl) + ' · 신고자 ' + email);

      app.innerHTML =
        '<header class="appbar"><button type="button" class="appbar__icon" data-nav="back" aria-label="뒤로">' +
        icon('back') + '</button><div class="appbar__title">페이지 신고</div><div class="appbar__right"></div></header>' +
        '<div class="shell report-page">' +
        '<section class="report-done">' +
        '<span class="report-done__icon">' + icon('check') + '</span>' +
        '<h1>신고가 접수되었습니다</h1>' +
        '<p>접수번호 <b>' + esc(id.toUpperCase().replace('R-', 'PUM-')) + '</b></p>' +
        '<p class="report-done__desc">운영 관리자가 내용을 검토한 뒤 <b>' + esc(email) + '</b>로 처리 결과를 안내합니다. ' +
        '허위 신고로 확인되면 이용이 제한될 수 있습니다.</p>' +
        '<dl class="report-done__kv">' +
        '<div><dt>신고 대상</dt><dd>' + esc(targetSlug ? '@' + targetSlug : targetUrl) + '</dd></div>' +
        '<div><dt>신고 사유</dt><dd>' + esc(reason) + '</dd></div>' +
        '<div><dt>접수 시각</dt><dd>' + esc(at) + '</dd></div>' +
        '</dl>' +
        '<div class="report-done__actions">' +
        '<a class="btn btn--ghost" href="#/">품 홈으로</a>' +
        '<a class="btn btn--brand" href="#/signup">나도 품 만들기</a>' +
        '</div></section></div>';

      Pum.toast('신고가 접수되었습니다. 처리 결과는 이메일로 안내됩니다');
      window.scrollTo(0, 0);
    });
  }

  Pum.landing = {
    showcases: SHOWCASE,
    pageMock: pageMock,
    showcaseCard: showcaseCard,
    fit: fitPreviews,
    authShowcaseHTML: authShowcaseHTML,
    shareSheet: shareSheet,
    copyText: copyText,
    reportReasons: REPORT_REASONS
  };

  Pum.views = Pum.views || {};
  Pum.views.landing = landingView;
  Pum.views.report = reportView;
})(window);
