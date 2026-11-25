/* ==========================================================================
   품 꾸미기 PWA — auth.js
   로그인 · 회원가입 · SNS 간편가입 · ID/PW 찾기 · 가입 완료(환영)
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
    app.innerHTML =
      '<main class="auth-wrap"><div class="auth">' +
      authHeader(
        '나의 디지털 세계 <span style="color:var(--brand)">품</span>',
        '프로필과 소식을 한 페이지에 담아<br/>링크 하나로 공유하세요.'
      ) +
      '<form class="auth__form" id="loginForm" novalidate>' +
      '<div class="field">' +
      '<label class="field__label" for="loginId">아이디 <span class="req">*</span></label>' +
      '<input class="input" id="loginId" name="id" type="email" inputmode="email" autocomplete="username" placeholder="아이디는 이메일입니다" />' +
      '<div class="auth__error" id="loginIdError"></div>' +
      '</div>' +
      '<div class="field">' +
      '<label class="field__label" for="loginPw">비밀번호 <span class="req">*</span></label>' +
      '<input class="input" id="loginPw" name="pw" type="password" autocomplete="current-password" placeholder="비밀번호를 입력하세요" />' +
      '<div class="auth__error" id="loginPwError"></div>' +
      '</div>' +
      '<button class="btn btn--primary btn--block" type="submit" id="loginSubmit">로그인</button>' +
      '</form>' +
      '<div class="divider" style="margin:22px 0 14px">SNS 가입</div>' +
      '<div class="auth__sns">' +
      '<button type="button" class="sns-btn" data-sns="google"><span class="sns-btn__badge sns-btn__badge--google">' +
      googleMark() +
      '</span><span class="sns-btn__label">구글</span></button>' +
      '<button type="button" class="sns-btn" data-sns="naver"><span class="sns-btn__badge sns-btn__badge--naver">N</span><span class="sns-btn__label">네이버</span></button>' +
      '<button type="button" class="sns-btn" data-sns="kakao"><span class="sns-btn__badge sns-btn__badge--kakao">' +
      kakaoMark() +
      '</span><span class="sns-btn__label">카카오톡</span></button>' +
      '</div>' +
      '<div class="auth__links">' +
      '<button type="button" class="linkbtn" data-action="find">ID/PW 찾기</button>' +
      '<span class="dot"></span>' +
      '<button type="button" class="linkbtn" data-action="signup">회원가입</button>' +
      '</div>' +
      '<p class="auth__foot">데모 안내 · 아무 이메일과 4자 이상 비밀번호로 로그인할 수 있습니다.<br/>입력한 내용은 이 브라우저에만 저장됩니다.</p>' +
      '<div class="auth__admin"><button type="button" class="linkbtn linkbtn--muted" data-nav="admin">운영 관리자</button></div>' +
      '</div></main>';

    var form = app.querySelector('#loginForm');
    var idEl = app.querySelector('#loginId');
    var pwEl = app.querySelector('#loginPw');

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
      } else if (pw.length < 4) {
        setError(pwEl, '#loginPwError', '비밀번호는 4자 이상 입력해 주세요.');
        bad = true;
      }
      if (bad) return;

      var name = id.split('@')[0];
      Pum.update(function (s) {
        s.auth.loggedIn = true;
        s.auth.user = {
          email: id,
          name: name,
          provider: 'email',
          joinedAt: new Date().toISOString()
        };
        if (!s.profile.title) s.profile.title = name;
      });
      Pum.toast('로그인되었습니다');
      Pum.go('/welcome');
    });

    app.querySelectorAll('[data-sns]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        snsJoin(btn.getAttribute('data-sns'));
      });
    });

    app.querySelector('[data-action="signup"]').addEventListener('click', function () {
      Pum.go('/signup');
    });
    app.querySelector('[data-action="find"]').addEventListener('click', function () {
      Pum.go('/find');
    });
  }

  /* ---------------------------------------------------------------------
     SNS 간편가입
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
      '<p style="font-size:11.5px;color:var(--muted);line-height:1.6">' +
      esc(p.name) +
      ' 계정의 이름과 이메일만 가져와 품 계정을 만듭니다. 비밀번호는 저장하지 않습니다.</p>' +
      '</div>';

    Pum.modal({
      title: p.name + '로 간편가입',
      desc: 'pumss.co.kr 에서 계정 연동을 요청했습니다.',
      body: body,
      actions: [
        { label: '취소', kind: 'ghost' },
        {
          label: p.name + '로 계속',
          kind: 'brand',
          onClick: function (api) {
            var agree = api.body.querySelector('#snsAgree');
            if (agree && !agree.checked) {
              Pum.toast('약관에 동의해 주세요', 'err');
              return false;
            }
            Pum.update(function (s) {
              s.auth.loggedIn = true;
              s.auth.user = {
                email: p.account,
                name: p.holder,
                provider: providerId,
                joinedAt: new Date().toISOString()
              };
              if (!s.profile.title) s.profile.title = p.holder;
            });
            setTimeout(function () {
              Pum.go('/welcome');
              Pum.toast(p.name + ' 간편가입이 완료되었습니다');
            }, 120);
          }
        }
      ]
    });
  }

  /* ---------------------------------------------------------------------
     회원가입
     --------------------------------------------------------------------- */
  function signupView(app) {
    app.innerHTML =
      '<main class="auth-wrap"><div class="auth">' +
      authHeader(
        '회원가입',
        '기본 정보만 입력하면 바로 내 품을 만들 수 있어요.',
        { back: true, step: '1 / 1' }
      ) +
      '<form class="auth__form" id="signupForm" novalidate>' +
      '<div class="field">' +
      '<label class="field__label" for="suId">아이디(이메일) <span class="req">*</span></label>' +
      '<input class="input" id="suId" type="email" inputmode="email" autocomplete="email" placeholder="example@pumss.co.kr" />' +
      '<div class="auth__error" id="suIdError"></div>' +
      '</div>' +
      '<div class="field">' +
      '<label class="field__label" for="suPw">비밀번호 <span class="req">*</span></label>' +
      '<input class="input" id="suPw" type="password" autocomplete="new-password" placeholder="8자 이상, 영문+숫자" />' +
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
      '<label class="field__label" for="suPhone">휴대전화번호 <span class="req">*</span></label>' +
      '<input class="input" id="suPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="010-0000-0000" />' +
      '<div class="field__hint">아이디·비밀번호를 잊었을 때 본인 확인에 사용합니다.</div>' +
      '<div class="auth__error" id="suPhoneError"></div>' +
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
    var phoneEl = app.querySelector('#suPhone');
    var agreeEl = app.querySelector('#suAgree');

    function err(input, target, msg) {
      var box = app.querySelector(target);
      if (box) box.textContent = msg || '';
      if (input) input.classList.toggle('is-error', !!msg);
    }

    [idEl, pwEl, pw2El, nameEl, phoneEl].forEach(function (el, i) {
      el.addEventListener('input', function () {
        var map = ['#suIdError', '#suPwError', '#suPw2Error', '#suNameError', '#suPhoneError'];
        err(el, map[i], '');
      });
    });
    agreeEl.addEventListener('change', function () {
      err(null, '#suAgreeError', '');
    });

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var id = idEl.value.trim();
      var pw = pwEl.value;
      var pw2 = pw2El.value;
      var name = nameEl.value.trim();
      var phone = phoneEl.value.trim();
      var bad = false;

      if (!id) {
        err(idEl, '#suIdError', '아이디(이메일)를 입력해 주세요.');
        bad = true;
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(id)) {
        err(idEl, '#suIdError', '이메일 형식으로 입력해 주세요.');
        bad = true;
      }
      if (!pw) {
        err(pwEl, '#suPwError', '비밀번호를 입력해 주세요.');
        bad = true;
      } else if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) {
        err(pwEl, '#suPwError', '영문과 숫자를 포함해 8자 이상 입력해 주세요.');
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
      if (!phone) {
        err(phoneEl, '#suPhoneError', '휴대전화번호를 입력해 주세요.');
        bad = true;
      } else if (phone.replace(/[^0-9]/g, '').length < 10) {
        err(phoneEl, '#suPhoneError', '휴대전화번호를 정확히 입력해 주세요.');
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

      Pum.update(function (s) {
        s.auth.loggedIn = true;
        s.auth.user = {
          email: id,
          name: name,
          phone: phone,
          provider: 'email',
          joinedAt: new Date().toISOString()
        };
        if (!s.profile.title) s.profile.title = name;
      });
      Pum.go('/welcome');
    });

    app.querySelector('[data-action="login"]').addEventListener('click', function () {
      Pum.go('/login');
    });
    app.querySelector('[data-action="back"]').addEventListener('click', function () {
      Pum.go('/login');
    });
  }

  /* ---------------------------------------------------------------------
     ID / PW 찾기
     --------------------------------------------------------------------- */
  function findView(app) {
    app.innerHTML =
      '<main class="auth-wrap"><div class="auth">' +
      authHeader('아이디·비밀번호 찾기', '가입할 때 등록한 휴대전화번호로 확인할 수 있어요.', {
        back: true,
        step: '본인 확인'
      }) +
      '<div class="segmented" id="findTabs" style="margin-bottom:18px">' +
      '<button type="button" class="segmented__btn is-active" data-mode="id">아이디 찾기</button>' +
      '<button type="button" class="segmented__btn" data-mode="pw">비밀번호 찾기</button>' +
      '</div>' +
      '<form class="auth__form" id="findForm" novalidate>' +
      '<div class="field" data-find-field="idOnlyPw" style="display:none">' +
      '<label class="field__label" for="findEmail">아이디(이메일) <span class="req">*</span></label>' +
      '<input class="input" id="findEmail" type="email" inputmode="email" placeholder="example@pumss.co.kr" />' +
      '<div class="auth__error" id="findEmailError"></div>' +
      '</div>' +
      '<div class="field">' +
      '<label class="field__label" for="findPhone">휴대전화번호 <span class="req">*</span></label>' +
      '<input class="input" id="findPhone" type="tel" inputmode="tel" placeholder="010-0000-0000" />' +
      '<div class="auth__error" id="findPhoneError"></div>' +
      '</div>' +
      '<button class="btn btn--primary btn--block" type="submit" id="findSubmit">아이디 찾기</button>' +
      '</form>' +
      '<div id="findResult"></div>' +
      '<div class="auth__links"><button type="button" class="linkbtn" data-action="login">로그인 화면으로</button>' +
      '<span class="dot"></span>' +
      '<button type="button" class="linkbtn" data-action="signup">회원가입</button></div>' +
      '</div></main>';

    var mode = 'id';
    var tabs = app.querySelectorAll('#findTabs .segmented__btn');
    var pwField = app.querySelector('[data-find-field="idOnlyPw"]');
    var submit = app.querySelector('#findSubmit');
    var phoneEl = app.querySelector('#findPhone');
    var emailEl = app.querySelector('#findEmail');
    var result = app.querySelector('#findResult');

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

    function showResult(title, desc) {
      result.innerHTML =
        '<div class="card" style="margin-top:16px"><div class="card__body">' +
        '<div style="display:flex;gap:10px;align-items:flex-start">' +
        '<span style="width:34px;height:34px;border-radius:11px;background:var(--brand-soft);color:var(--brand);display:grid;place-items:center;flex:none">' +
        icon('info') +
        '</span>' +
        '<div><div style="font-size:14px;font-weight:700">' + esc(title) + '</div>' +
        '<div style="font-size:12.5px;color:var(--muted);line-height:1.6;margin-top:4px">' + desc + '</div></div>' +
        '</div></div></div>';
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
      } else if (phone.replace(/[^0-9]/g, '').length < 10) {
        app.querySelector('#findPhoneError').textContent = '휴대전화번호를 정확히 입력해 주세요.';
        phoneEl.classList.add('is-error');
        bad = true;
      }
      if (bad) return;

      var saved = Pum.getState().auth.user || {};
      var registered = saved.email || '';

      if (mode === 'id') {
        var masked = registered
          ? registered.replace(/^(.).*(@.*)$/, function (m, a, rest) {
              return a + '••••' + rest;
            })
          : 'big••••@n•••.com';
        showResult(
          '아이디를 찾았습니다',
          '입력하신 번호로 아이디를 문자로 보내드렸어요.<br/>가입 아이디: <b style="color:var(--ink)">' +
            esc(masked) +
            '</b>'
        );
        Pum.toast('아이디 안내 문자를 발송했습니다');
      } else {
        showResult(
          '비밀번호 재설정 안내를 보냈습니다',
          '입력하신 휴대전화번호로 임시 비밀번호를 보내드렸어요.<br/>로그인 후 마이가입 정보에서 비밀번호를 변경해 주세요.'
        );
        Pum.toast('임시 비밀번호를 발송했습니다');
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

  /* ---------------------------------------------------------------------
     가입 완료 · 환영
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
    var s = Pum.getState();
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
      '<p class="welcome__meta">내 품 주소는 꾸미기 화면에서 영문으로 정할 수 있어요.</p>' +
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
      d: '배경·프로필 사진과 타이틀, 소개글을 넣고 표시 방식을 4가지 중에서 고릅니다.'
    },
    { t: '블록으로 채우기', d: '반갑데이·일일뉴스·명언·추천 컨텐츠·SNS·텍스트/동영상·배너·지도 블록을 자유롭게 배치하세요.' },
    { t: '순서 바꾸기', d: '블록 왼쪽 손잡이를 드래그하거나 위/아래 버튼으로 순서를 바꿀 수 있어요.' },
    { t: '미리보기로 확인', d: '미리보기 화면에서 실제 공유 페이지와 똑같은 모습을 확인합니다.' },
    { t: '공유하기', d: '품 주소를 정하면 pumss.co.kr/@주소 로 공유할 수 있어요. 설정에서 공개 범위도 정할 수 있습니다.' }
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
    guide: guideModal
  };
})(window);
