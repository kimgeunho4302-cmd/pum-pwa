/* ==========================================================================
   품 꾸미기 PWA — app.js
   해시 라우터 · 로그인 가드 · 전역 내비게이션 · 서비스 워커 등록
   ========================================================================== */
(function (global) {
  'use strict';

  var Pum = global.Pum;

  var PUBLIC_ROUTES = ['/login', '/signup', '/find', '/welcome', '/admin'];

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
      path = s.auth.loggedIn ? '/welcome' : '/login';
      location.replace('#' + path);
      return;
    }

    var needsAuth = PUBLIC_ROUTES.indexOf(path) < 0;
    if (needsAuth && !s.auth.loggedIn) {
      Pum.toast('로그인이 필요합니다');
      location.replace('#/login');
      return;
    }

    // 스크롤 · 모달 초기화
    Pum.closeModal();
    window.scrollTo(0, 0);
    app.innerHTML = '';

    if (path === '/admin') Pum.adminSyncUser();

    if (path === '/login') Pum.auth.login(app);
    else if (path === '/signup') Pum.auth.signup(app);
    else if (path === '/find') Pum.auth.find(app);
    else if (path === '/welcome') Pum.auth.welcome(app);
    else if (path === '/admin') Pum.views.admin(app);
    else if (path === '/editor') Pum.views.editor(app);
    else if (path === '/settings') Pum.views.settings(app);
    else if (path === '/preview') Pum.views.preview(app);
    else if (path === '/share') Pum.views.share(app);
    else location.replace('#/login');

    document.body.dataset.route = path;
    document.title =
      path === '/login'
        ? '로그인 · 품'
        : path === '/signup'
        ? '회원가입 · 품'
        : path === '/find'
        ? '아이디·비밀번호 찾기 · 품'
        : path === '/welcome'
        ? '가입 완료 · 품'
        : path === '/settings'
        ? '설정 · 품'
        : path === '/preview'
        ? '미리보기 · 품'
        : path === '/share'
        ? (s.profile.title || '품') + ' · 품'
        : path === '/admin'
        ? '운영 관리자 · 품'
        : '품 꾸미기 · 품';
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
          s.auth.user = { email: '', name: '', provider: '', joinedAt: '' };
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
    if (p === '/share' || p === '/preview' || p === '/admin' || p === '/welcome' || p === '/editor') {
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
