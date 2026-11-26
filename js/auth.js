/* ==========================================================================
   품 꾸미기 PWA — auth.js
   로그인(실패 잠금·정지 계정·세션 유지) · 회원가입(문자 인증) ·
   SNS 간편가입 · 아이디/PW 찾기(가입 여부 비노출·발송 제한) · 가입 완료(환영)
   ========================================================================== */
(function (global) {
  'use strict';

  var Pum = global.Pum;
  var esc = Pum.util.esc;
  var icon = Pum.icon;

  var PROVIDERS = {
    google: { name: '구글', color: '#1a73e8', badge: 'G', account: 'kimgeunho4302@gmail.com', holder: '김근호' },
    naver: { name: '네이버', color: '#03c75a', badge: 'N', account: 'bigused@naver.com', holder: '김근호' },
    kakao: { name: '카카오톡', color: '#fee500', badge: 'T', account: 'bigused@kakao.com', holder: '김근호' }
  };

  var CARRIERS = [
    { id: 'skt', name: 'SKT' },
    { id: 'kt', name: 'KT' },
    { id: 'lgu', name: 'LG U+' },
    { id: 'skt-mvno', name: 'SKT 알뜰폰' },
    { id: 'kt-mvno', name: 'KT 알뜰폰' },
    { id: 'lgu-mvno', name: 'LG U+ 알뜰폰' }
  ];

  var SPECIALS = '!@#$%^&*()_+-=[]{}?';

  function S() {
    return Pum.getState();
  }

  /* ----------------------------------------------------------------------
     계정 · 세션 · 발송 로그 유틸
     ---------------------------------------------------------------------- */
  function findUser(email) {
    var low = String(email || '').trim().toLowerCase();
    if (!low) return null;
    return (
      (S().auth.users || []).filter(function (u) {
        return String(u.email || '').toLowerCase() === low;
      })[0] || null
    );
  }

  function findUserByPhone(phone) {
    var d = Pum.digits(phone);
    if (!d) return null;
    return (
      (S().auth.users || []).filter(function (u) {
        return Pum.digits(u.phone) === d;
      })[0] || null
    );
  }

  function memberByEmail(email) {
    var low = String(email || '').trim().toLowerCase();
    if (!low) return null;
    var ad = S().admin;
    return (
      (ad.members || []).filter(function (m) {
        return String(m.email || '').toLowerCase() === low;
      })[0] || null
    );
  }

  function upsertUser(data) {
    var low = String(data.email || '').toLowerCase();
    Pum.update(function (st) {
      var u = (st.auth.users || []).filter(function (x) {
        return String(x.email || '').toLowerCase() === low;
      })[0];
      if (u) {
        Object.assign(u, data);
      } else {
        st.auth.users.push(data);
      }
    });
  }

  /** 더미 메일·문자 발송 로그 (운영 관리자 > 신고·감사에서 확인) */
  function addMail(entry) {
    Pum.update(function (st) {
      st.admin.mailLog = st.admin.mailLog || [];
      st.admin.mailLog.unshift(
        Object.assign(
          {
            id: 'ml-' + Math.random().toString(36).slice(2, 8),
            at: new Date().toLocaleString('ko-KR', { hour12: false }).replace(/\. /g, '-').replace('.', '')
          },
          entry
        )
      );
      if (st.admin.mailLog.length > 80) st.admin.mailLog.length = 80;
    });
  }
  Pum.addMail = addMail;

  var SESSION_REMEMBER_MS = 30 * 24 * 60 * 60 * 1000; /* 30일 */
  var SESSION_BROWSER_MS = 2 * 60 * 60 * 1000; /* 유지 미선택 = 2시간 슬라이딩 */

  var session = {
    issue: function (remember) {
      var now = Date.now();
      Pum.update(function (st) {
        st.auth.session = {
          remember: !!remember,
          issuedAt: now,
          lastSeen: now,
          expiresAt: now + (remember ? SESSION_REMEMBER_MS : SESSION_BROWSER_MS)
        };
      });
    },
    /** 활동할 때마다 만료를 뒤로 미루는 슬라이딩 만료 */
    touch: function () {
      var st = S();
      if (!st.auth.loggedIn) return;
      var se = st.auth.session || {};
      if (!se.expiresAt) return;
      var now = Date.now();
      /* 여러 탭(관리자 ↔ 사용자 화면)이 저장 이벤트로 서로를 다시 그리며
         끝없이 저장하는 일이 없도록, 1분에 한 번만 만료 시각을 갱신합니다. */
      if (se.lastSeen && now - se.lastSeen < 60000) return;
      Pum.update(
        function (s2) {
          s2.auth.session.lastSeen = now;
          s2.auth.session.expiresAt = now + (s2.auth.session.remember ? SESSION_REMEMBER_MS : SESSION_BROWSER_MS);
        },
        { silent: true }
      );
    },
    /** 만료 확인 — 만료면 로그아웃 상태로 되돌립니다. */
    enforce: function () {
      var st = S();
      if (!st.auth.loggedIn) return false;
      var se = st.auth.session || {};
      if (!se.expiresAt) return false;
      if (Date.now() < se.expiresAt) return false;
      Pum.update(function (s2) {
        s2.auth.loggedIn = false;
        s2.auth.session = { remember: false, issuedAt: 0, expiresAt: 0, lastSeen: 0 };
        s2.auth.user = { email: '', name: '', provider: '', joinedAt: '', phone: '' };
      });
      return true;
    },
    remainLabel: function () {
      var se = S().auth.session || {};
      if (!se.expiresAt) return '-';
      var ms = se.expiresAt - Date.now();
      if (ms <= 0) return '만료됨';
      if (se.remember) return '약 ' + Math.ceil(ms / 86400000) + '일 남음 (30일 자동 연장)';
      var min = Math.ceil(ms / 60000);
      return min >= 60 ? Math.floor(min / 60) + '시간 ' + (min % 60) + '분 남음' : min + '분 남음';
    },
    /** 만료 시뮬레이션 — 세션을 즉시 만료시킵니다. */
    expireNow: function () {
      Pum.update(
        function (st) {
          if (st.auth.session) st.auth.session.expiresAt = Date.now() - 1000;
        },
        { silent: true }
      );
    }
  };
  Pum.session = session;
  Pum.findUser = findUser;
  Pum.memberByEmail = memberByEmail;

  /* ----------------------------------------------------------------------
     공통 마크업
     ---------------------------------------------------------------------- */
  function googleMark() {
    return (
      '<svg viewBox="0 0 48 48" width="22" height="22" aria-hidden="true">' +
      '<path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.6 9.5 24 9.5z"/>' +
      '<path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-2.8-.4-4.1H24v8.4h12.5c-.3 2.1-1.6 5.2-4.6 7.3l7.6 5.9c4.5-4.2 6.6-10.3 6.6-17.5z"/>' +
      '<path fill="#FBBC05" d="M10.4 28.6A14.5 14.5 0 0 1 9.6 24c0-1.6.3-3.1.8-4.6l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.8-6.1z"/>' +
      '<path fill="#34A853" d="M24 48c6.5 0 12-2.1 16-5.8l-7.6-5.9c-2.1 1.4-4.8 2.4-8.4 2.4-6.4 0-11.7-3.7-13.6-9.1l-7.8 6.1C6.5 42.6 14.6 48 24 48z"/>' +
      '</svg>'
    );
  }

  function kakaoMark(color) {
    return (
      '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="' + (color || '#3c1e1e') + '">' +
      '<path d="M12 4.2c-4.6 0-8.3 2.9-8.3 6.5 0 2.3 1.5 4.3 3.8 5.6l-.9 3.3c-.1.4.3.7.7.5l3.8-2.5c.3 0 .6.1.9.1 4.6 0 8.3-2.9 8.3-6.5S16.6 4.2 12 4.2Z"/>' +
      '</svg>'
    );
  }

  function providerBadge(id) {
    if (id === 'google') return googleMark();
    if (id === 'kakao') return kakaoMark();
    return '<span>' + PROVIDERS[id].badge + '</span>';
  }

  function authHeader(title, sub, opts) {
    var o = opts || {};
    return (
      (o.back
        ? '<div class="auth__top"><button type="button" class="auth__back" data-action="back" aria-label="뒤로">' +
          icon('back') +
          '</button>' +
          '<span class="auth__step">' + esc(o.step || '') + '</span></div>'
        : '') +
      '<div class="auth__brand"><span class="auth__mark">품</span><span class="auth__wordmark" style="font-size:13px;letter-spacing:.14em;color:var(--muted);font-weight:700">PUMSS</span></div>' +
      '<h1 class="auth__title">' + title + '</h1>' +
      '<p class="auth__subtitle">' + sub + '</p>'
    );
  }

  /* ---------------------------------------------------------------------
     로그인
     --------------------------------------------------------------------- */
  function loginView(app) {
    var st = S();
    var lockedLeft = Math.max(0, Math.ceil(((st.auth.lockedUntil || 0) - Date.now()) / 1000));

    app.innerHTML =
      '<main class="auth-wrap"><div class="auth">' +
      authHeader(
        '나의 디지털 세계 <span style="color:var(--brand)">품</span>',
        '프로필과 소식을 한 페이지에 담아<br/>링크 하나로 공유하세요.'
      ) +
      '<form class="auth__form" id="loginForm" novalidate>' +
      '<div class="field">' +
      '<label class="field__label" for="loginId">아이디 <span class="req">*</span></label>' +
      '<input class="input" id="loginId" name="id" type="email" inputmode="email" autocomplete="username" placeholder="아이디는 이메일입니다" value="' +
      esc((st.auth.user && st.auth.user.email) || '') + '" />' +
      '<div class="auth__error" id="loginIdError"></div>' +
      '</div>' +
      '<div class="field">' +
      '<label class="field__label" for="loginPw">비밀번호 <span class="req">*</span></label>' +
      '<input class="input" id="loginPw" name="pw" type="password" autocomplete="current-password" placeholder="비밀번호를 입력하세요" />' +
      '<div class="auth__error" id="loginPwError"></div>' +
      '</div>' +
      '<label class="check-row check-row--compact"><input type="checkbox" id="loginRemember" />' +
      '<span>로그인 유지하기 <b style="color:var(--muted);font-weight:500">(30일)</b></span></label>' +
      '<div class="auth__notice" id="loginNotice" ' + (lockedLeft ? '' : 'hidden') + '>' +
      '<b>로그인이 잠겼습니다</b> 비밀번호를 5회 연속 틀렸습니다. ' +
      '<span id="loginLockTimer">' + lockedLeft + '초</span> 뒤에 다시 시도할 수 있어요.' +
      '</div>' +
      '<button class="btn btn--primary btn--block" type="submit" id="loginSubmit">로그인</button>' +
      '<div class="auth__links auth__links--error">' +
      '<span class="auth__links-label">로그인에 문제가 있나요?</span>' +
      '<button type="button" class="linkbtn" data-action="find">아이디 찾기</button>' +
      '<span class="dot"></span>' +
      '<button type="button" class="linkbtn" data-action="find-pw">비밀번호 찾기</button>' +
      '<span class="dot"></span>' +
      '<button type="button" class="linkbtn" data-action="signup">회원가입</button>' +
      '</div>' +
      '</form>' +
      '<div class="divider" style="margin:20px 0 12px">SNS 간편가입</div>' +
      '<div class="auth__sns">' +
      '<button type="button" class="sns-btn" data-sns="google"><span class="sns-btn__badge sns-btn__badge--google">' +
      googleMark() +
      '</span><span class="sns-btn__label">구글</span></button>' +
      '<button type="button" class="sns-btn" data-sns="naver"><span class="sns-btn__badge sns-btn__badge--naver">N</span><span class="sns-btn__label">네이버</span></button>' +
      '<button type="button" class="sns-btn" data-sns="kakao"><span class="sns-btn__badge sns-btn__badge--kakao">' +
      kakaoMark() +
      '</span><span class="sns-btn__label">카카오톡</span></button>' +
      '</div>' +
      '<p class="auth__foot">' +
      '데모 계정 <b>demo@pumss.co.kr</b> / <b>Pum!2026</b> ' +
      '<button type="button" class="linkbtn linkbtn--inline" data-action="fill-demo">채우기</button><br/>' +
      '프로토타입이라 입력한 내용은 이 브라우저에만 저장됩니다.' +
      '</p>' +
      '<div class="auth__admin">' +
      '<button type="button" class="linkbtn linkbtn--muted" data-nav="admin">회원 관리</button>' +
      '<span class="dot"></span>' +
      '<button type="button" class="linkbtn linkbtn--muted" data-nav="ops-admin">운영 관리자</button>' +
      '</div>' +
      '</div></main>';

    var form = app.querySelector('#loginForm');
    var idEl = app.querySelector('#loginId');
    var pwEl = app.querySelector('#loginPw');
    var rememberEl = app.querySelector('#loginRemember');
    var noticeEl = app.querySelector('#loginNotice');
    var timerEl = app.querySelector('#loginLockTimer');
    var lockTimer = null;

    function setError(input, target, message) {
      var box = app.querySelector(target);
      if (box) box.textContent = message || '';
      if (input) input.classList.toggle('is-error', !!message);
    }

    idEl.addEventListener('input', function () {
      setError(idEl, '#loginIdError', '');
    });
    pwEl.addEventListener('input', function () {
      setError(pwEl, '#loginPwError', '');
    });

    function tickLock() {
      clearInterval(lockTimer);
      var left = Math.max(0, Math.ceil(((S().auth.lockedUntil || 0) - Date.now()) / 1000));
      if (!left) {
        noticeEl.hidden = true;
        return;
      }
      noticeEl.hidden = false;
      if (timerEl) timerEl.textContent = left + '초';
      lockTimer = setInterval(function () {
        var l = Math.max(0, Math.ceil(((S().auth.lockedUntil || 0) - Date.now()) / 1000));
        if (l <= 0) {
          clearInterval(lockTimer);
          noticeEl.hidden = true;
          Pum.toast('잠금이 해제되었습니다. 다시 로그인할 수 있어요');
        } else if (timerEl) {
          timerEl.textContent = l + '초';
        }
      }, 1000);
    }
    tickLock();

    function failLogin(user, wrongPassword) {
      var st2 = S();
      var locked = (st2.auth.lockedUntil || 0) > Date.now();
      if (locked) {
        tickLock();
        return;
      }
      var next = (st2.auth.failCount || 0) + 1;
      Pum.update(function (s2) {
        s2.auth.failCount = next;
        if (next >= 5) {
          s2.auth.lockedUntil = Date.now() + 60 * 1000;
        }
      });
      setError(null, '#loginPwError', '아이디 또는 비밀번호가 올바르지 않습니다.');
      if (next >= 5) {
        Pum.toast('5회 연속 실패로 1분간 로그인이 잠깁니다', 'err');
        tickLock();
      } else {
        Pum.toast('아이디 또는 비밀번호가 올바르지 않습니다 (' + next + '/5)', 'err');
      }
    }

    function doLogin(id, pw, remember) {
      var st2 = S();
      if ((st2.auth.lockedUntil || 0) > Date.now()) {
        tickLock();
        Pum.toast('로그인이 잠겨 있습니다. 잠시 후 다시 시도해 주세요', 'err');
        return;
      }
      var member = memberByEmail(id);
      if (member && (member.status === 'suspended' || member.status === 'reported')) {
        Pum.modal({
          center: true,
          title: '이용이 정지된 계정입니다',
          desc:
            '운영 정책에 따라 계정이 정지되어 로그인할 수 없습니다.' +
            (member.suspendReason ? '\n\n정지 사유: ' + member.suspendReason : '') +
            '\n\n문의: support@pumss.co.kr',
          actions: [{ label: '확인', kind: 'primary' }]
        });
        return;
      }
      if (member && (member.status === 'deleted' || member.status === 'withdrawn')) {
        Pum.modal({
          center: true,
          title: '삭제 처리된 계정입니다',
          desc: '탈퇴·삭제 처리된 계정은 30일 보관 후 완전히 삭제됩니다.\n복구를 원하시면 support@pumss.co.kr 로 문의해 주세요.',
          actions: [{ label: '확인', kind: 'primary' }]
        });
        return;
      }

      var user = findUser(id);
      if (user) {
        if ((user.password || '') !== pw) {
          failLogin(user, true);
          return;
        }
      } else {
        /* 데모: 처음 보는 이메일이면 그 자리에서 계정을 만들어 로그인합니다. */
        upsertUser({
          email: id,
          name: id.split('@')[0],
          phone: '',
          password: pw,
          joinedAt: new Date().toISOString()
        });
      }

      Pum.update(function (s2) {
        s2.auth.loggedIn = true;
        s2.auth.failCount = 0;
        s2.auth.lockedUntil = 0;
        s2.auth.user = {
          email: id,
          name: (user && user.name) || id.split('@')[0],
          phone: (user && user.phone) || '',
          provider: 'email',
          joinedAt: (user && user.joinedAt) || new Date().toISOString()
        };
        if (!s2.profile.title) s2.profile.title = s2.auth.user.name;
      });
      session.issue(remember);
      if (Pum.adminSyncUser) Pum.adminSyncUser();
      Pum.toast('로그인되었습니다');

      var q = Pum.query();
      var next = q.next ? decodeURIComponent(q.next) : '';
      if (next) {
        Pum.go(next.indexOf('/') === 0 ? next : '/' + next);
      } else if (S().auth.welcomeSeenAt) {
        Pum.go('/editor');
      } else {
        Pum.go('/welcome');
      }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var id = idEl.value.trim();
      var pw = pwEl.value;
      var bad = false;
      if (!id) {
        setError(idEl, '#loginIdError', '아이디(이메일)를 입력해 주세요.');
        bad = true;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(id)) {
        setError(idEl, '#loginIdError', '이메일 형식으로 입력해 주세요.');
        bad = true;
      }
      if (!pw) {
        setError(pwEl, '#loginPwError', '비밀번호를 입력해 주세요.');
        bad = true;
      }
      if (bad) return;
      doLogin(id, pw, !!rememberEl.checked);
    });

    app.querySelector('[data-action="fill-demo"]').addEventListener('click', function () {
      idEl.value = 'demo@pumss.co.kr';
      pwEl.value = 'Pum!2026';
      rememberEl.checked = true;
      Pum.toast('데모 계정을 채웠습니다 (로그인 유지 체크)');
    });

    app.querySelectorAll('[data-sns]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        snsJoin(btn.getAttribute('data-sns'));
      });
    });

    app.querySelector('[data-action="signup"]').addEventListener('click', function () {
      Pum.go('/signup');
    });
    app.querySelectorAll('[data-action="find"], [data-action="find-pw"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mode = btn.getAttribute('data-action') === 'find-pw' ? 'pw' : 'id';
        Pum.go('/find?mode=' + mode);
      });
    });
  }

  /* ---------------------------------------------------------------------
     SNS 간편가입 (실제 OAuth 연동은 추후 구현 예정)
     --------------------------------------------------------------------- */
  function snsJoin(providerId) {
    var p = PROVIDERS[providerId];
    if (!p) return;
    var body =
      '<div style="display:flex;flex-direction:column;gap:14px">' +
      '<div style="display:flex;align-items:center;gap:12px;padding:14px;border:1px solid var(--line);border-radius:14px;background:var(--surface-2)">' +
      '<span class="sns-btn__badge" style="width:42px;height:42px;background:' +
      (providerId === 'google' ? '#fff' : p.color) +
      ';border:' +
      (providerId === 'google' ? '1px solid var(--line-strong)' : '0') +
      ';color:' +
      (providerId === 'kakao' ? '#3c1e1e' : '#fff') +
      '">' +
      providerBadge(providerId) +
      '</span>' +
      '<div style="flex:1;min-width:0">' +
      '<div style="font-size:13.5px;font-weight:700">' + esc(p.account) + '</div>' +
      '<div style="font-size:11.5px;color:var(--muted)">' + esc(p.name) + ' 계정 · ' + esc(p.holder) + '</div>' +
      '</div>' +
      '<span style="font-size:11px;color:var(--ok);font-weight:700">연결됨</span>' +
      '</div>' +
      '<label class="check-row" style="padding:0"><input type="checkbox" id="snsAgree" checked /><span>서비스 이용약관 및 개인정보 수집·이용에 동의합니다.</span></label>' +
      '<div class="map-note">' + icon('info') +
      '<span><b>실제 연동은 추후 구현 예정</b>입니다. 지금은 화면·동작 확인용 데모로, ' +
      '계정 선택 화면 없이 바로 가입 처리됩니다. 실서버에서는 OAuth 2.0 인증 후 이름·이메일만 받아 계정을 만들고 비밀번호는 저장하지 않습니다.</span></div>' +
      '</div>';

    Pum.modal({
      title: p.name + '로 간편가입',
      desc: 'pumss.co.kr 에서 계정 연동을 요청했습니다.',
      body: body,
      actions: [
        { label: '취소', kind: 'ghost' },
        {
          label: p.name + '로 계속 (데모)',
          kind: 'brand',
          onClick: function (api) {
            var agree = api.body.querySelector('#snsAgree');
            if (agree && !agree.checked) {
              Pum.toast('약관에 동의해 주세요', 'err');
              return false;
            }
            upsertUser({
              email: p.account,
              name: p.holder,
              phone: '',
              password: 'oauth:' + providerId,
              provider: providerId,
              joinedAt: new Date().toISOString()
            });
            Pum.update(function (s2) {
              s2.auth.loggedIn = true;
              s2.auth.failCount = 0;
              s2.auth.user = {
                email: p.account,
                name: p.holder,
                provider: providerId,
                joinedAt: new Date().toISOString()
              };
              if (!s2.profile.title) s2.profile.title = p.holder;
            });
            session.issue(true);
            setTimeout(function () {
              Pum.go(S().auth.welcomeSeenAt ? '/editor' : '/welcome');
              Pum.toast(p.name + ' 간편가입이 완료되었습니다');
            }, 120);
          }
        }
      ]
    });
  }

  /* ---------------------------------------------------------------------
     비밀번호 강도
     --------------------------------------------------------------------- */
  function strength(pw) {
    var v = String(pw || '');
    if (!v) return { level: 0, label: '', hint: '' };
    var hasLetter = /[A-Za-z]/.test(v);
    var hasNumber = /[0-9]/.test(v);
    var hasSpecial = /[!@#$%^&*()_+\-=\[\]{}?]/.test(v);
    var kinds = (hasLetter ? 1 : 0) + (hasNumber ? 1 : 0) + (hasSpecial ? 1 : 0);
    var score = 0;
    if (v.length >= 8) score += 1;
    if (v.length >= 12) score += 1;
    score += kinds >= 2 ? 1 : 0;
    score += kinds === 3 ? 1 : 0;
    if (v.length < 8 || kinds < 2) return { level: 1, label: '약', hint: '영문+숫자+특수문자를 섞어 8자 이상' };
    if (score >= 4) return { level: 3, label: '강', hint: '안전한 비밀번호입니다' };
    return { level: 2, label: '중', hint: '특수문자나 길이를 더하면 안전해져요' };
  }

  /* ---------------------------------------------------------------------
     회원가입
     --------------------------------------------------------------------- */
  function signupView(app) {
    app.innerHTML =
      '<main class="auth-wrap"><div class="auth">' +
      authHeader('회원가입', '기본 정보만 입력하면 바로 내 품을 만들 수 있어요.', { back: true, step: '1 / 1' }) +
      '<form class="auth__form" id="signupForm" novalidate>' +
      '<div class="field">' +
      '<label class="field__label" for="suId">아이디(이메일) <span class="req">*</span></label>' +
      '<input class="input" id="suId" type="email" inputmode="email" autocomplete="email" placeholder="example@pumss.co.kr" />' +
      '<div class="auth__error" id="suIdError"></div>' +
      '</div>' +
      '<div class="field">' +
      '<label class="field__label" for="suPw">비밀번호 <span class="req">*</span></label>' +
      '<input class="input" id="suPw" type="password" autocomplete="new-password" placeholder="영문+숫자+특수문자 조합 8자 이상" />' +
      '<div class="pw-meter" id="pwMeter" data-level="0">' +
      '<i></i><i></i><i></i><span class="pw-meter__label" id="pwMeterLabel"></span>' +
      '</div>' +
      '<div class="field__hint">사용 가능한 특수문자: <code>' + esc(SPECIALS) + '</code></div>' +
      '<div class="auth__error" id="suPwError"></div>' +
      '</div>' +
      '<div class="field">' +
      '<label class="field__label" for="suPw2">비밀번호 확인 <span class="req">*</span></label>' +
      '<input class="input" id="suPw2" type="password" autocomplete="new-password" placeholder="한 번 더 입력해 주세요" />' +
      '<div class="auth__error" id="suPw2Error"></div>' +
      '</div>' +
      '<div class="field">' +
      '<label class="field__label" for="suName">이름 <span class="req">*</span></label>' +
      '<input class="input" id="suName" type="text" autocomplete="name" placeholder="품에 표시될 이름" />' +
      '<div class="auth__error" id="suNameError"></div>' +
      '</div>' +

      '<div class="field">' +
      '<span class="field__label">휴대전화 문자 인증 <span class="req">*</span></span>' +
      '<div class="phone-row">' +
      '<select class="input select" id="suCarrier" aria-label="통신사 선택">' +
      '<option value="">통신사</option>' +
      CARRIERS.map(function (c) {
        return '<option value="' + c.id + '">' + esc(c.name) + '</option>';
      }).join('') +
      '</select>' +
      '<input class="input" id="suPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="010-0000-0000" />' +
      '</div>' +
      '<div class="phone-verify">' +
      '<button type="button" class="btn btn--sm btn--ghost" id="suSendCode" disabled>인증번호 발송</button>' +
      '<div class="phone-code" id="suCodeWrap" hidden>' +
      '<input class="input" id="suCode" type="text" inputmode="numeric" maxlength="6" placeholder="인증번호 6자리" />' +
      '<button type="button" class="btn btn--sm btn--primary" id="suVerifyCode">확인</button>' +
      '</div>' +
      '</div>' +
      '<div class="auth__error" id="suPhoneError"></div>' +
      '<div class="field__hint" id="suPhoneHint">통신사와 휴대전화번호를 입력하고 인증번호를 받아 주세요. (3분 안에 입력, 5회까지 확인)</div>' +
      '<div class="auth__error" id="suCodeError"></div>' +
      '</div>' +

      '<label class="check-row" style="padding:6px 0"><input type="checkbox" id="suAgree" />' +
      '<span style="font-size:12.5px">이용약관 및 개인정보 수집·이용에 동의합니다. <span class="req" style="color:var(--brand)">*</span></span></label>' +
      '<div class="auth__error" id="suAgreeError"></div>' +
      '<button class="btn btn--primary btn--block" type="submit">가입 완료</button>' +
      '</form>' +
      '<div class="auth__links"><span>이미 계정이 있으신가요?</span>' +
      '<button type="button" class="linkbtn" data-action="login">로그인</button></div>' +
      '</div></main>';

    var f = app.querySelector('#signupForm');
    var idEl = app.querySelector('#suId');
    var pwEl = app.querySelector('#suPw');
    var pw2El = app.querySelector('#suPw2');
    var nameEl = app.querySelector('#suName');
    var carrierEl = app.querySelector('#suCarrier');
    var phoneEl = app.querySelector('#suPhone');
    var sendBtn = app.querySelector('#suSendCode');
    var codeWrap = app.querySelector('#suCodeWrap');
    var codeEl = app.querySelector('#suCode');
    var verifyBtn = app.querySelector('#suVerifyCode');
    var hintEl = app.querySelector('#suPhoneHint');
    var meter = app.querySelector('#pwMeter');
    var meterLabel = app.querySelector('#pwMeterLabel');
    var agreeEl = app.querySelector('#suAgree');

    var verifyState = { sent: false, code: '', expiresAt: 0, tries: 0, verified: false, timer: null };

    function err(input, target, msg) {
      var box = app.querySelector(target);
      if (box) box.textContent = msg || '';
      if (input) input.classList.toggle('is-error', !!msg);
    }

    function refreshSendState() {
      var ok = !!carrierEl.value && Pum.digits(phoneEl.value).length >= 10 && !verifyState.verified;
      sendBtn.disabled = !ok;
    }

    /* 자동 하이픈 */
    phoneEl.addEventListener('input', function () {
      var formatted = Pum.formatPhone(phoneEl.value);
      if (phoneEl.value !== formatted) phoneEl.value = formatted;
      err(phoneEl, '#suPhoneError', '');
      refreshSendState();
    });
    carrierEl.addEventListener('change', function () {
      err(null, '#suPhoneError', '');
      refreshSendState();
    });

    /* 비밀번호 강도 */
    pwEl.addEventListener('input', function () {
      var s = strength(pwEl.value);
      meter.setAttribute('data-level', String(s.level));
      meterLabel.textContent = s.label ? s.label + ' (' + s.hint + ')' : '';
      err(pwEl, '#suPwError', '');
    });

    /* 인증번호 발송 */
    sendBtn.addEventListener('click', function () {
      var code = String(Math.floor(100000 + Math.random() * 900000));
      verifyState = { sent: true, code: code, expiresAt: Date.now() + 180000, tries: 0, verified: false, timer: null };
      codeWrap.hidden = false;
      sendBtn.textContent = '재발송';
      codeEl.value = '';
      codeEl.focus();
      startTimer();
      Pum.toast('인증번호 [' + code + '] 를 발송했습니다 (데모)', 'ok');
      addMail({
        to: Pum.formatPhone(phoneEl.value),
        subject: '품 회원가입 인증번호 안내 (데모 발송)',
        body: '인증번호 ' + code,
        kind: 'sms'
      });
    });

    function startTimer() {
      clearInterval(verifyState.timer);
      function paint() {
        var left = Math.max(0, Math.ceil((verifyState.expiresAt - Date.now()) / 1000));
        if (verifyState.verified) return;
        if (left <= 0) {
          clearInterval(verifyState.timer);
          hintEl.innerHTML = '<b style="color:var(--brand)">인증번호가 만료되었습니다.</b> 다시 발송해 주세요.';
          return;
        }
        var mm = String(Math.floor(left / 60)).padStart(2, '0');
        var ss = String(left % 60).padStart(2, '0');
        hintEl.innerHTML =
          '남은 시간 <b>' + mm + ':' + ss + '</b> · 남은 확인 횟수 <b>' + (5 - verifyState.tries) + '회</b>';
      }
      paint();
      verifyState.timer = setInterval(paint, 1000);
    }

    verifyBtn.addEventListener('click', function () {
      err(null, '#suCodeError', '');
      if (!verifyState.sent) {
        err(null, '#suCodeError', '인증번호를 먼저 발송해 주세요.');
        return;
      }
      if (Date.now() > verifyState.expiresAt) {
        err(null, '#suCodeError', '인증번호가 만료되었습니다. 다시 발송해 주세요.');
        return;
      }
      if (verifyState.tries >= 5) {
        err(null, '#suCodeError', '확인 횟수를 초과했습니다. 인증번호를 다시 발송해 주세요.');
        return;
      }
      if (Pum.digits(codeEl.value).length !== 6) {
        err(null, '#suCodeError', '인증번호 6자리를 입력해 주세요.');
        return;
      }
      if (Pum.digits(codeEl.value) !== verifyState.code) {
        verifyState.tries += 1;
        err(null, '#suCodeError', '인증번호가 일치하지 않습니다. (남은 횟수 ' + (5 - verifyState.tries) + '회)');
        if (verifyState.tries >= 5) {
          err(null, '#suCodeError', '확인 횟수를 초과했습니다. 인증번호를 다시 발송해 주세요.');
        }
        return;
      }
      verifyState.verified = true;
      clearInterval(verifyState.timer);
      codeWrap.hidden = true;
      sendBtn.disabled = true;
      sendBtn.textContent = '인증 완료';
      hintEl.innerHTML = '<b style="color:var(--ok)">✓ ' + esc(carrierEl.value ? carrierEl.selectedOptions[0].textContent : '') + ' ' + esc(Pum.formatPhone(phoneEl.value)) + ' 인증 완료</b>';
      Pum.toast('휴대전화 인증이 완료되었습니다');
    });

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var id = idEl.value.trim();
      var pw = pwEl.value;
      var pw2 = pw2El.value;
      var name = nameEl.value.trim();
      var phone = Pum.formatPhone(phoneEl.value);
      var bad = false;

      if (!id) {
        err(idEl, '#suIdError', '아이디(이메일)를 입력해 주세요.');
        bad = true;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(id)) {
        err(idEl, '#suIdError', '이메일 형식으로 입력해 주세요.');
        bad = true;
      } else if (findUser(id)) {
        err(idEl, '#suIdError', '이미 가입된 이메일입니다. 로그인해 주세요.');
        bad = true;
      }
      if (!pw) {
        err(pwEl, '#suPwError', '비밀번호를 입력해 주세요.');
        bad = true;
      } else if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) {
        err(pwEl, '#suPwError', '영문과 숫자를 포함해 8자 이상 입력해 주세요.');
        bad = true;
      } else if (strength(pw).level === 1 && !/[!@#$%^&*()_+\-=\[\]{}?]/.test(pw)) {
        err(pwEl, '#suPwError', '특수문자(' + SPECIALS + ')를 하나 이상 넣으면 더 안전합니다.');
        bad = true;
      }
      if (!pw2) {
        err(pw2El, '#suPw2Error', '비밀번호를 한 번 더 입력해 주세요.');
        bad = true;
      } else if (pw !== pw2) {
        err(pw2El, '#suPw2Error', '비밀번호가 일치하지 않습니다.');
        bad = true;
      }
      if (!name) {
        err(nameEl, '#suNameError', '이름을 입력해 주세요.');
        bad = true;
      }
      if (!carrierEl.value) {
        err(null, '#suPhoneError', '통신사를 선택해 주세요.');
        bad = true;
      }
      if (!phone) {
        err(phoneEl, '#suPhoneError', '휴대전화번호를 입력해 주세요.');
        bad = true;
      } else if (Pum.digits(phone).length < 10) {
        err(phoneEl, '#suPhoneError', '휴대전화번호를 정확히 입력해 주세요.');
        bad = true;
      }
      if (!verifyState.verified) {
        err(null, '#suPhoneError', '휴대전화 문자 인증을 완료해 주세요.');
        bad = true;
      }
      if (!agreeEl.checked) {
        err(null, '#suAgreeError', '약관에 동의해 주세요.');
        bad = true;
      }
      if (bad) {
        var first = app.querySelector('.input.is-error');
        if (first) first.focus();
        return;
      }

      upsertUser({
        email: id,
        name: name,
        phone: phone,
        password: pw,
        carrier: carrierEl.value,
        joinedAt: new Date().toISOString()
      });
      Pum.update(function (s2) {
        s2.auth.loggedIn = true;
        s2.auth.failCount = 0;
        s2.auth.lockedUntil = 0;
        s2.auth.user = {
          email: id,
          name: name,
          phone: phone,
          provider: 'email',
          joinedAt: new Date().toISOString()
        };
        if (!s2.profile.title) s2.profile.title = name;
      });
      session.issue(true);
      if (Pum.adminSyncUser) Pum.adminSyncUser();
      Pum.go('/welcome');
    });

    app.querySelector('[data-action="login"]').addEventListener('click', function () {
      Pum.go('/login');
    });
    app.querySelector('[data-action="back"]').addEventListener('click', function () {
      Pum.go('/login');
    });
    refreshSendState();
  }

  /* ---------------------------------------------------------------------
     아이디 / 비밀번호 찾기 — 가입 여부 비노출 · 발송 제한
     --------------------------------------------------------------------- */
  function findSentList() {
    var now = Date.now();
    var list = (S().auth.findSent || []).filter(function (t) {
      return now - t < 24 * 60 * 60 * 1000;
    });
    return list;
  }

  function rateLimitInfo() {
    var list = findSentList();
    var now = Date.now();
    var hour = list.filter(function (t) {
      return now - t < 60 * 60 * 1000;
    }).length;
    var day = list.length;
    return { hour: hour, day: day, hourLeft: Math.max(0, 3 - hour), dayLeft: Math.max(0, 5 - day) };
  }

  function tempPassword() {
    var alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    var lower = 'abcdefghijkmnpqrstuvwxyz';
    function pick(s) {
      return s.charAt(Math.floor(Math.random() * s.length));
    }
    return pick(alpha) + pick(lower) + Math.floor(Math.random() * 90 + 10) + '!' + pick(lower) + pick(alpha) + Math.floor(Math.random() * 90 + 10);
  }

  function findView(app) {
    var q = Pum.query();
    var mode = q.mode === 'pw' ? 'pw' : 'id';

    app.innerHTML =
      '<main class="auth-wrap"><div class="auth">' +
      authHeader('아이디·비밀번호 찾기', '가입할 때 등록한 휴대전화번호로 확인할 수 있어요.', {
        back: true,
        step: '본인 확인'
      }) +
      '<div class="segmented" id="findTabs" style="margin-bottom:18px">' +
      '<button type="button" class="segmented__btn' + (mode === 'id' ? ' is-active' : '') + '" data-mode="id">아이디 찾기</button>' +
      '<button type="button" class="segmented__btn' + (mode === 'pw' ? ' is-active' : '') + '" data-mode="pw">비밀번호 찾기</button>' +
      '</div>' +
      '<form class="auth__form" id="findForm" novalidate>' +
      '<div class="field" data-find-field="idOnlyPw" style="display:' + (mode === 'pw' ? '' : 'none') + '">' +
      '<label class="field__label" for="findEmail">아이디(이메일) <span class="req">*</span></label>' +
      '<input class="input" id="findEmail" type="email" inputmode="email" placeholder="example@pumss.co.kr" />' +
      '<div class="auth__error" id="findEmailError"></div>' +
      '</div>' +
      '<div class="field">' +
      '<label class="field__label" for="findPhone">휴대전화번호 <span class="req">*</span></label>' +
      '<input class="input" id="findPhone" type="tel" inputmode="tel" placeholder="010-0000-0000" />' +
      '<div class="auth__error" id="findPhoneError"></div>' +
      '</div>' +
      '<button class="btn btn--primary btn--block" type="submit" id="findSubmit">' + (mode === 'pw' ? '비밀번호 찾기' : '아이디 찾기') + '</button>' +
      '<p class="field__hint" id="findLimit">' + limitLabel() + '</p>' +
      '</form>' +
      '<div id="findResult"></div>' +
      '<div class="auth__links"><button type="button" class="linkbtn" data-action="login">로그인 화면으로</button>' +
      '<span class="dot"></span>' +
      '<button type="button" class="linkbtn" data-action="signup">회원가입</button></div>' +
      '</div></main>';

    function limitLabel() {
      var r = rateLimitInfo();
      return '안내 발송은 1시간에 3회, 하루 5회까지 가능합니다. (남은 횟수: 1시간 ' + r.hourLeft + '회 / 오늘 ' + r.dayLeft + '회)';
    }

    var tabs = app.querySelectorAll('#findTabs .segmented__btn');
    var pwField = app.querySelector('[data-find-field="idOnlyPw"]');
    var submit = app.querySelector('#findSubmit');
    var phoneEl = app.querySelector('#findPhone');
    var emailEl = app.querySelector('#findEmail');
    var result = app.querySelector('#findResult');
    var limitEl = app.querySelector('#findLimit');

    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        mode = t.getAttribute('data-mode');
        tabs.forEach(function (x) {
          x.classList.toggle('is-active', x === t);
        });
        pwField.style.display = mode === 'pw' ? '' : 'none';
        submit.textContent = mode === 'pw' ? '비밀번호 찾기' : '아이디 찾기';
        result.innerHTML = '';
      });
    });

    phoneEl.addEventListener('input', function () {
      var formatted = Pum.formatPhone(phoneEl.value);
      if (phoneEl.value !== formatted) phoneEl.value = formatted;
    });

    function showResult(title, desc, demo) {
      result.innerHTML =
        '<div class="card" style="margin-top:16px"><div class="card__body">' +
        '<div style="display:flex;gap:10px;align-items:flex-start">' +
        '<span style="width:34px;height:34px;border-radius:11px;background:var(--brand-soft);color:var(--brand);display:grid;place-items:center;flex:none">' +
        icon('info') +
        '</span>' +
        '<div style="min-width:0"><div style="font-size:14px;font-weight:700">' + esc(title) + '</div>' +
        '<div style="font-size:12.5px;color:var(--muted);line-height:1.6;margin-top:4px">' + desc + '</div></div>' +
        '</div>' +
        (demo ? '<div class="demo-note">' + demo + '</div>' : '') +
        '</div></div>';
    }

    app.querySelector('#findForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var phone = phoneEl.value.trim();
      var email = emailEl.value.trim();
      var bad = false;
      ['#findPhoneError', '#findEmailError'].forEach(function (s) {
        var box = app.querySelector(s);
        if (box) box.textContent = '';
      });
      phoneEl.classList.remove('is-error');
      emailEl.classList.remove('is-error');

      if (mode === 'pw') {
        if (!email) {
          app.querySelector('#findEmailError').textContent = '아이디(이메일)를 입력해 주세요.';
          emailEl.classList.add('is-error');
          bad = true;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
          app.querySelector('#findEmailError').textContent = '이메일 형식으로 입력해 주세요.';
          emailEl.classList.add('is-error');
          bad = true;
        }
      }
      if (!phone) {
        app.querySelector('#findPhoneError').textContent = '휴대전화번호를 입력해 주세요.';
        phoneEl.classList.add('is-error');
        bad = true;
      } else if (Pum.digits(phone).length < 10) {
        app.querySelector('#findPhoneError').textContent = '휴대전화번호를 정확히 입력해 주세요.';
        phoneEl.classList.add('is-error');
        bad = true;
      }
      if (bad) return;

      var limit = rateLimitInfo();
      if (limit.hour >= 3 || limit.day >= 5) {
        showResult(
          '발송 한도를 초과했습니다',
          '같은 번호로 너무 많이 요청하셨어요.<br/>1시간에 3회, 하루 5회까지 발송할 수 있습니다.<br/>잠시 후 다시 시도해 주세요.'
        );
        if (limitEl) limitEl.textContent = limitLabel();
        return;
      }

      Pum.update(function (st) {
        st.auth.findSent = findSentList().concat([Date.now()]).slice(-20);
      });
      if (limitEl) limitEl.textContent = limitLabel();

      var user = mode === 'id' ? findUserByPhone(phone) : null;
      var byEmail = mode === 'pw' ? findUser(email) : null;

      /* 가입 여부와 상관없이 같은 문구로 응답합니다. */
      if (mode === 'id') {
        showResult(
          '입력하신 정보로 안내를 보냈습니다',
          '등록된 휴대전화번호라면 아이디 안내 문자가 도착합니다.<br/>문자를 받지 못했다면 1~2분 뒤 다시 시도해 주세요.',
          user
            ? '프로토타입 확인용 — 등록된 아이디: <b>' + esc(maskEmail(user.email)) + '</b> (실제 앱에서는 문자로만 전달됩니다)'
            : '프로토타입 안내 — 가입 여부와 관계없이 같은 문구가 표시됩니다.'
        );
        addMail({
          to: Pum.formatPhone(phone),
          subject: '품 아이디 안내 (데모 발송)',
          body: user ? '아이디: ' + maskEmail(user.email) : '등록된 계정 없음 — 안내 문구만 동일 발송',
          kind: 'sms'
        });
        Pum.toast('안내 문자를 발송했습니다');
      } else {
        var tmp = tempPassword();
        var matched = !!(byEmail && Pum.digits(byEmail.phone) === Pum.digits(phone));
        if (matched) {
          upsertUser({ email: byEmail.email, password: tmp, tempPasswordAt: new Date().toISOString() });
        }
        showResult(
          '입력하신 정보로 안내를 보냈습니다',
          '등록된 계정이라면 임시 비밀번호 안내가 도착합니다.<br/>임시 비밀번호로 로그인한 뒤 <b>계정 관리</b>에서 새 비밀번호로 변경해 주세요.',
          '프로토타입 확인용 — 임시 비밀번호: <b>' + esc(tmp) + '</b> (가입 여부와 관계없이 같은 문구가 표시됩니다)'
        );
        addMail({
          to: Pum.formatPhone(phone),
          subject: '품 임시 비밀번호 안내 (데모 발송)',
          body: matched ? '임시 비밀번호: ' + tmp : '등록된 계정 없음 — 안내 문구만 동일 발송',
          kind: 'sms'
        });
        Pum.toast('임시 비밀번호를 발송했습니다 (데모)');
      }
    });

    app.querySelector('[data-action="login"]').addEventListener('click', function () {
      Pum.go('/login');
    });
    app.querySelector('[data-action="signup"]').addEventListener('click', function () {
      Pum.go('/signup');
    });
    app.querySelector('[data-action="back"]').addEventListener('click', function () {
      Pum.go('/login');
    });
  }

  function maskEmail(email) {
    return String(email || '').replace(/^(.)[^@]*(@.*)$/, function (m, a, rest) {
      return a + '••••' + rest;
    });
  }

  /* ---------------------------------------------------------------------
     가입 완료 · 환영 (최초 1회만)
     --------------------------------------------------------------------- */
  function welcomeArt() {
    return (
      '<svg class="welcome__art" viewBox="0 0 320 220" role="img" aria-label="품 시작하기 일러스트">' +
      '<defs>' +
      '<linearGradient id="wa" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eef4ff"/><stop offset="1" stop-color="#fff1f0"/></linearGradient>' +
      '<linearGradient id="wb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#111827"/><stop offset="1" stop-color="#374151"/></linearGradient>' +
      '</defs>' +
      '<rect x="0" y="0" width="320" height="220" rx="26" fill="url(#wa)"/>' +
      '<circle cx="262" cy="42" r="34" fill="#ffd9d6" opacity=".9"/>' +
      '<circle cx="46" cy="182" r="26" fill="#dce7ff" opacity=".9"/>' +
      '<g transform="translate(78 44)">' +
      '<rect x="0" y="0" width="164" height="132" rx="18" fill="#ffffff" stroke="#e9edf2"/>' +
      '<rect x="0" y="0" width="164" height="46" rx="18" fill="url(#wb)"/>' +
      '<rect x="0" y="30" width="164" height="16" fill="url(#wb)"/>' +
      '<circle cx="82" cy="46" r="19" fill="#ffffff"/>' +
      '<circle cx="82" cy="40" r="7" fill="#cbd5e1"/>' +
      '<path d="M70 58c2-7 6-10 12-10s10 3 12 10z" fill="#cbd5e1"/>' +
      '<rect x="30" y="76" width="104" height="9" rx="4.5" fill="#e2e8f0"/>' +
      '<rect x="46" y="93" width="72" height="7" rx="3.5" fill="#eef2f7"/>' +
      '<rect x="20" y="110" width="124" height="10" rx="5" fill="#f8fafc" stroke="#eef2f7"/>' +
      '</g>' +
      '<g transform="translate(198 150)">' +
      '<rect x="0" y="0" width="74" height="34" rx="17" fill="#ff3b30"/>' +
      '<text x="37" y="22" text-anchor="middle" font-family="Pretendard, sans-serif" font-size="13" font-weight="700" fill="#ffffff">품 함께하기</text>' +
      '</g>' +
      '<g transform="translate(38 34)">' +
      '<circle cx="0" cy="0" r="4" fill="#ff8a80"/><circle cx="18" cy="-8" r="2.6" fill="#93c5fd"/><circle cx="30" cy="6" r="3.2" fill="#fcd34d"/>' +
      '</g>' +
      '</svg>'
    );
  }

  function welcomeView(app) {
    var s = S();
    var q = Pum.query();

    /* 최초 1회만 노출 — 재열람은 ?welcome=1 */
    if (s.auth.welcomeSeenAt && q.welcome !== '1') {
      Pum.go('/editor');
      return;
    }
    if (!s.auth.welcomeSeenAt) {
      Pum.update(
        function (st) {
          st.auth.welcomeSeenAt = new Date().toISOString();
        },
        { silent: true }
      );
    }

    var user = s.auth.user || {};
    var name = user.name || '회원';
    var provider = user.provider;
    var providerLabel = provider === 'google' ? '구글' : provider === 'naver' ? '네이버' : provider === 'kakao' ? '카카오톡' : '';

    app.innerHTML =
      '<main class="welcome"><div class="welcome__inner">' +
      welcomeArt() +
      '<span class="welcome__badge">' + icon('check') + '가입이 완료되었습니다</span>' +
      '<h1 class="welcome__title"><strong>' + esc(name) + '</strong>님,<br/>나의 디지털 세계 <strong>품</strong>에 오셨습니다</h1>' +
      '<p class="welcome__desc">프로필 사진과 소개, SNS, 이벤트·지도까지<br/>한 페이지에 담아 <b>링크 하나로</b> 공유해 보세요.' +
      (providerLabel ? '<br/><span style="color:var(--muted);font-size:12px">' + esc(providerLabel) + ' 계정으로 연결되었습니다.</span>' : '') +
      '</p>' +
      '<div class="welcome__actions">' +
      '<button type="button" class="btn btn--primary btn--block" data-action="editor">품 꾸미기 바로가기 ' + icon('arrowRight') + '</button>' +
      '<button type="button" class="btn btn--ghost btn--block" data-action="guide">품 활용법</button>' +
      '</div>' +
      '<p class="welcome__meta">이 환영 화면은 다시 로그인해도 나오지 않아요. 다시 보려면 <code>#/welcome?welcome=1</code></p>' +
      '</div></main>';

    app.querySelector('[data-action="editor"]').addEventListener('click', function () {
      Pum.go('/editor');
    });
    app.querySelector('[data-action="guide"]').addEventListener('click', function () {
      guideModal();
    });
  }

  var GUIDE_STEPS = [
    {
      t: '내 프로필 꾸미기',
      d: '배경 테마 색 5종, 프로필·배경 사진, 타이틀(100자)·소개글(500자)을 넣고 표시 방식을 4가지 중에서 고릅니다.'
    },
    { t: '블록으로 채우기', d: '반갑데이·일일뉴스·명언·추천 컨텐츠·SNS·텍스트/동영상·배너·지도 블록을 개수 제한 없이 배치하세요.' },
    { t: '순서 바꾸기', d: '블록 왼쪽 손잡이를 드래그하거나 위/아래 버튼으로 순서를 바꿀 수 있어요.' },
    { t: '미리보기로 확인', d: '미리보기 화면에서 실제 공유 페이지와 똑같은 모습을 확인합니다.' },
    { t: '공유하기', d: '공유하기 버튼 하나로 링크와 QR 코드를 바로 전할 수 있어요.' }
  ];

  function guideModal() {
    Pum.modal({
      title: '품 활용법',
      desc: '5단계면 내 품이 완성됩니다.',
      body:
        '<div class="guide-list">' +
        GUIDE_STEPS.map(function (g, i) {
          return (
            '<div class="guide-item"><span class="guide-item__num">' + (i + 1) + '</span>' +
            '<div><div class="guide-item__title">' + esc(g.t) + '</div>' +
            '<div class="guide-item__desc">' + esc(g.d) + '</div></div></div>'
          );
        }).join('') +
        '</div>',
      actions: [{ label: '확인', kind: 'primary' }]
    });
  }

  Pum.auth = {
    login: loginView,
    signup: signupView,
    find: findView,
    welcome: welcomeView,
    snsJoin: snsJoin,
    guide: guideModal,
    strength: strength
  };
})(window);
