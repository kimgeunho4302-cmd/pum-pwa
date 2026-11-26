/* ==========================================================================
   품 꾸미기 PWA — app.js
   해시 라우터 · 로그인/세션 가드 · 전역 내비게이션 · 서비스 워커 등록
   ========================================================================== */
(function (global) {
  'use strict';

  var Pum = global.Pum;

  var PUBLIC_ROUTES = ['/login', '/signup', '/find', '/welcome', '/ops-admin', '/terms', '/privacy', '/marketing'];

  function currentPath() {
    var raw = location.hash.replace(/^#/, '');
    if (!raw) return '';
    return raw.split('?')[0];
  }

  function route() {
    var app = document.getElementById('app');
    if (!app) return;
    var s = Pum.getState();
    var path = currentPath();

    if (!path || path === '/') {
      path = s.auth.loggedIn ? '/' + (s.auth.welcomeSeenAt ? 'editor' : 'welcome') : '/login';
      location.replace('#' + path);
      return;
    }

    /* 초대 링크(#/invite/@아이디) → 회원가입으로. 가입을 마치면 바로 내 품 꾸미기로 이동합니다. */
    if (path.indexOf('/invite/') === 0) {
      var rawInvite = path.slice('/invite/'.length);
      try {
        rawInvite = decodeURIComponent(rawInvite);
      } catch (err) {
        /* 잘못된 인코딩은 그대로 씁니다 */
      }
      rawInvite = rawInvite.replace(/^@/, '').replace(/[?#].*$/, '').trim();
      location.replace('#/signup' + (rawInvite ? '?invite=' + encodeURIComponent(rawInvite) : ''));
      return;
    }

    var isPumAddress = path.indexOf('/p/') === 0;
    var needsAuth = !isPumAddress && PUBLIC_ROUTES.indexOf(path) < 0;

    /* 세션 만료 처리 — 만료됐다면 로그인으로 돌려보내고 next 를 남깁니다 */
    if (Pum.session && Pum.session.enforce()) {
      if (needsAuth) {
        Pum.toast('세션이 만료되었습니다. 다시 로그인해 주세요', 'err');
        location.replace('#/login?next=' + encodeURIComponent(path));
        return;
      }
    }
    s = Pum.getState();
    if (needsAuth && !s.auth.loggedIn) {
      Pum.toast('로그인이 필요합니다');
      location.replace('#/login?next=' + encodeURIComponent(path));
      return;
    }
    if (s.auth.loggedIn) Pum.session.touch();

    /* 스크롤 · 모달 초기화 */
    Pum.closeModal();
    window.scrollTo(0, 0);
    app.innerHTML = '';

    if (path === '/admin') Pum.adminSyncUser();

    if (path === '/login') Pum.auth.login(app);
    else if (path === '/signup') Pum.auth.signup(app);
    else if (path === '/find') Pum.auth.find(app);
    else if (path === '/welcome') Pum.auth.welcome(app);
    else if (path === '/ops-admin') Pum.views.opsAdmin(app);
    else if (path === '/admin') Pum.views.admin(app);
    else if (path === '/editor') Pum.views.editor(app);
    else if (path === '/settings') Pum.views.settings(app);
    else if (path === '/account') Pum.views.account(app);
    else if (path === '/preview') Pum.views.preview(app);
    else if (path === '/share') Pum.views.share(app);
    else if (path === '/terms') Pum.views.terms(app);
    else if (path === '/privacy') Pum.views.privacy(app);
    else if (path === '/marketing') Pum.views.marketing(app);
    else if (isPumAddress) Pum.views.pum(app, decodeURIComponent(path.slice(3)));
    else Pum.views.notFound(app, path.replace(/^\//, ''));

    /* 품스 공통 푸터 · 설치 안내 · 공유 페이지 신고 버튼 */
    if (Pum.site && Pum.site.mount) Pum.site.mount(app, path);

    document.body.dataset.route = path;
    if (!isPumAddress) document.title = titleFor(path, s);
  }

  function titleFor(path, s) {
    var map = {
      '/login': '로그인 · 품',
      '/signup': '회원가입 · 품',
      '/find': '아이디·비밀번호 찾기 · 품',
      '/welcome': '가입 완료 · 품',
      '/editor': '품 꾸미기 · 품',
      '/settings': '설정 · 품',
      '/account': '계정 관리 · 품',
      '/preview': '미리보기 · 품',
      '/share': (s.profile.title || '품') + ' · 품',
      '/admin': '내 품 관리 · 품',
      '/ops-admin': '운영 관리자 · 품',
      '/terms': '이용약관 · 품',
      '/privacy': '개인정보처리방침 · 품',
      '/marketing': '마케팅 정보 수신 동의 · 품'
    };
    return map[path] || '품 꾸미기 · 품';
  }

  /* 전역 내비게이션 (data-nav) */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-nav]');
    if (!t) return;
    var nav = t.getAttribute('data-nav');
    if (nav === 'back') {
      if (history.length > 1) history.back();
      else Pum.go('/editor');
      return;
    }
    if (nav === 'home') {
      Pum.go('/editor');
      return;
    }
    if (nav === 'logout') {
      Pum.confirm('로그아웃할까요?', { okLabel: '로그아웃' }).then(function (ok) {
        if (!ok) return;
        Pum.update(function (s) {
          s.auth.loggedIn = false;
          s.auth.session = { remember: false, issuedAt: 0, expiresAt: 0, lastSeen: 0 };
          s.auth.user = { email: '', name: '', provider: '', joinedAt: '', phone: '' };
        });
        Pum.go('/login');
      });
      return;
    }
    if (nav === 'share') {
      Pum.go('/share');
      return;
    }
    Pum.go('/' + nav);
  });

  window.addEventListener('hashchange', route);

  /* 다른 탭(관리자 ↔ 사용자 화면)의 저장 내용을 실시간 반영 */
  window.addEventListener('storage', function (e) {
    if (e.key !== 'pum.decorator.pwa.v2') return;
    Pum.reload();
    var p = currentPath();
    if (
      p === '/share' ||
      p === '/preview' ||
      p === '/admin' ||
      p === '/ops-admin' ||
      p === '/welcome' ||
      p === '/editor'
    ) {
      Pum.closeModal();
      route();
    }
  });

  /* 서비스 워커 */
  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {
        /* 오프라인 캐시는 없어도 앱은 동작합니다 */
      });
    });
  }

  route();
  registerSW();

  Pum.ready = true;
})(window);
