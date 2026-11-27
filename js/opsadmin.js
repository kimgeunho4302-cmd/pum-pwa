/* ==========================================================================
   품 꾸미기 PWA — opsadmin.js
   운영 관리자 콘솔 (#/ops-admin) — 회원 관리 · 신고/정지 · 계정 삭제 ·
   공지/PUSH 발송 · 품스 콘텐츠 연동 · 감사/발송 로그
   ========================================================================== */
(function (global) {
  'use strict';

  var Pum = global.Pum;
  var exc = Pum.util.esc;
  var esc = exc;
  var icon = Pum.icon;
  var U = Pum.adminUtil;
  var stamp = U.stamp;
  var stampPretty = U.stampPretty;
  var num = U.num;
  var lower = U.lower;

  var tab = 'dashboard';
  var memberQuery = '';

  function S() {
    return Pum.getState();
  }
  function AD() {
    return S().admin;
  }

  var STATUS_LABEL = {
    active: { text: '정상', cls: 'adm-pill--ok' },
    reported: { text: '신고', cls: 'adm-pill--wait' },
    suspended: { text: '정지', cls: 'adm-pill--stop' },
    deleted: { text: '삭제', cls: 'adm-pill--stop' },
    withdrawn: { text: '탈퇴예정', cls: 'adm-pill--stop' }
  };
  function statusPill(status) {
    var s = STATUS_LABEL[status] || STATUS_LABEL.active;
    return '<span class="adm-pill ' + s.cls + '">' + s.text + '</span>';
  }

  /* 마케팅 정보 수신 동의(가입 시 선택 동의) — 광고성 PUSH 대상 판별
     가입 계정(auth.users)에 남은 동의 기록을 우선 보고, 없으면 회원 기록을 씁니다. */
  function consentInfo(m) {
    if (!m) return { on: false, at: '' };
    var users = S().auth.users || [];
    var email = String(m.email || '').toLowerCase();
    var loginId = String(m.loginId || '').toLowerCase();
    var digits = Pum.digits(m.phone || '');
    var u = users.filter(function (x) {
      var xEmail = String(x.email || '').toLowerCase();
      var xLogin = String(x.loginId || '').toLowerCase();
      if (email && xEmail === email) return true;
      if (loginId && xLogin === loginId) return true;
      return !!(digits && Pum.digits(x.phone) === digits);
    })[0];
    if (u && u.consents && typeof u.consents.marketing === 'boolean') {
      return { on: u.consents.marketing === true, at: u.consents.marketing ? consentAtText(u.consents.at) : '' };
    }
    return { on: m.marketingConsent === true, at: consentAtText(m.marketingConsentAt) };
  }

  /** 동의 일시 표기 — '2026. 11. 26. 15시 49분' 같은 문자열을 YYYY-MM-DD로 정리 */
  function consentAtText(v) {
    var s = String(v || '').trim();
    if (!s) return '';
    var m = s.match(/^(\d{4})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})/);
    if (m) return m[1] + '-' + pad2(m[2]) + '-' + pad2(m[3]);
    return s.slice(0, 16);
  }

  function consentOn(m) {
    return consentInfo(m).on;
  }

  function consentPill(m) {
    return consentOn(m)
      ? '<span class="adm-pill adm-pill--ok">동의</span>'
      : '<span class="adm-pill adm-pill--stop">미동의</span>';
  }

  function consentCell(m) {
    var info = consentInfo(m);
    return (
      consentPill(m) +
      (info.on && info.at ? '<div class="adm-muted" style="font-size:11px">' + esc(info.at) + '</div>' : '')
    );
  }

  var TABS = [
    { id: 'dashboard', label: '대시보드', icon: 'preview' },
    { id: 'members', label: '회원 · 품 주소', icon: 'card' },
    { id: 'notices', label: '공지 · PUSH · 배너', icon: 'image' },
    { id: 'pumss', label: '품스 콘텐츠 연동', icon: 'link' },
    { id: 'reports', label: '신고 · 감사 로그', icon: 'info' },
    { id: 'accounts', label: '관리자 계정', icon: 'users' }
  ];

  /* ------------------------------------------------------------------
     운영 관리자 로그인 · 등급(슈퍼 관리자 / 일반 관리자)
     ------------------------------------------------------------------ */
  var GRADE_LABEL = { super: '슈퍼 관리자', manager: '일반 관리자' };

  function opsList() {
    var ad = AD();
    return (ad && ad.ops) || [];
  }

  function opsSession() {
    var ad = AD();
    return (ad && ad.opsSession) || null;
  }

  function isSuper() {
    var me = opsSession();
    return !!(me && me.grade === 'super');
  }

  function opsStamp() {
    var d = new Date();
    function pad(n) {
      return (n < 10 ? '0' : '') + n;
    }
    return (
      d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
      pad(d.getHours()) + ':' + pad(d.getMinutes())
    );
  }

  function gradeBadgeHTML() {
    var me = opsSession();
    if (!me) return '';
    return (
      '<span class="adm-grade adm-grade--' + esc(me.grade) + '">' +
      (me.grade === 'super' ? icon('shield') : icon('users')) +
      esc(GRADE_LABEL[me.grade] || '관리자') + '</span>' +
      '<span class="adm-me"><b>' + esc(me.name || me.email) + '</b>' +
      '<button type="button" class="adm-me__out" data-ops-logout>로그아웃</button></span>'
    );
  }

  function opsLoginView(app) {
    var demos = [
      { grade: 'super', email: 'super@pumss.co.kr', name: '김근호', desc: '모든 기능 + 관리자 계정 승인·등급 관리' },
      { grade: 'manager', email: 'ops@pumss.co.kr', name: '김보원', desc: '일반 기능만 사용 (관리자 승인 불가)' }
    ];
    app.innerHTML =
      '<div class="ops-login">' +
      '<div class="ops-login__card">' +
      '<div class="ops-login__brand"><span class="admin__logo">품</span>' +
      '<span class="ops-login__brandtext">운영 관리자<small>PUMSS OPERATIONS</small></span></div>' +
      '<h1 class="ops-login__title">운영 관리자 로그인</h1>' +
      '<p class="ops-login__desc">품 운영 콘솔입니다. 승인된 관리자 계정으로 로그인해 주세요.</p>' +
      '<form class="ops-login__form" id="opsLoginForm" novalidate>' +
      '<div class="field"><label class="field__label" for="opsEmail">관리자 이메일 <span class="req">*</span></label>' +
      '<input class="input" id="opsEmail" type="email" inputmode="email" autocomplete="username" placeholder="name@pumss.co.kr" />' +
      '<div class="auth__error" id="opsEmailError"></div></div>' +
      '<div class="field"><label class="field__label" for="opsPw">비밀번호 <span class="req">*</span></label>' +
      '<input class="input" id="opsPw" type="password" autocomplete="current-password" placeholder="비밀번호" />' +
      '<div class="auth__error" id="opsPwError"></div></div>' +
      '<button class="btn btn--brand btn--block" type="submit">로그인</button>' +
      '</form>' +
      '<div class="ops-login__demo">' +
      '<p class="ops-login__demo-title">데모 계정 <span>비밀번호는 모두 <b>Pum!2026</b></span></p>' +
      demos
        .map(function (d) {
          return (
            '<button type="button" class="ops-demo" data-ops-demo="' + d.grade + '">' +
            '<span class="ops-demo__grade ops-demo__grade--' + d.grade + '">' + esc(GRADE_LABEL[d.grade]) + '</span>' +
            '<span class="ops-demo__body"><b>' + esc(d.email) + '</b><em>' + esc(d.desc) + '</em></span>' +
            '<span class="ops-demo__fill">채우기</span></button>'
          );
        })
        .join('') +
      '</div>' +
      '<a class="ops-login__back" href="#/">← 품 홈으로</a>' +
      '</div></div>';

    var form = app.querySelector('#opsLoginForm');
    var emailEl = app.querySelector('#opsEmail');
    var pwEl = app.querySelector('#opsPw');

    app.querySelectorAll('[data-ops-demo]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var d = demos.filter(function (x) {
          return x.grade === btn.getAttribute('data-ops-demo');
        })[0];
        if (!d) return;
        emailEl.value = d.email;
        pwEl.value = 'Pum!2026';
        app.querySelector('#opsEmailError').textContent = '';
        app.querySelector('#opsPwError').textContent = '';
        Pum.toast(GRADE_LABEL[d.grade] + ' 데모 계정을 채웠습니다');
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = emailEl.value.trim().toLowerCase();
      var pw = pwEl.value;
      var emailErr = app.querySelector('#opsEmailError');
      var pwErr = app.querySelector('#opsPwError');
      emailErr.textContent = '';
      pwErr.textContent = '';
      if (!email) {
        emailErr.textContent = '관리자 이메일을 입력해 주세요.';
        return;
      }
      if (!pw) {
        pwErr.textContent = '비밀번호를 입력해 주세요.';
        return;
      }
      var found = opsList().filter(function (o) {
        return lower(o.email) === email;
      })[0];
      if (!found) {
        emailErr.textContent = '등록되지 않은 관리자 계정입니다.';
        return;
      }
      if (found.status === 'pending') {
        pwErr.textContent = '아직 승인되지 않은 계정입니다. 슈퍼 관리자의 승인 후 로그인할 수 있어요.';
        return;
      }
      if (found.status !== 'active') {
        pwErr.textContent = '사용이 중지된 계정입니다. 슈퍼 관리자에게 문의해 주세요.';
        return;
      }
      if ((found.password || '') !== pw) {
        pwErr.textContent = '비밀번호가 올바르지 않습니다.';
        return;
      }
      Pum.update(function (st) {
        st.admin.opsSession = {
          email: found.email,
          name: found.name,
          grade: found.grade,
          at: opsStamp()
        };
      });
      if (Pum.logAudit) Pum.logAudit('운영 관리자 로그인 · ' + found.name + ' (' + GRADE_LABEL[found.grade] + ')');
      Pum.toast(GRADE_LABEL[found.grade] + '로 로그인했습니다');
      tab = 'dashboard';
      opsView(app);
    });
  }

  function opsLogout(app) {
    Pum.confirm('운영 관리자에서 로그아웃할까요?', { okLabel: '로그아웃' }).then(function (ok) {
      if (!ok) return;
      Pum.update(function (st) {
        st.admin.opsSession = null;
      });
      tab = 'dashboard';
      opsView(app);
      Pum.toast('로그아웃했습니다');
    });
  }

  function opsView(app) {
    var me = opsSession();
    if (!me) {
      opsLoginView(app);
      return;
    }
    if (!TABS.some(function (t) { return t.id === tab; })) tab = 'dashboard';
    app.innerHTML =
      '<div class="admin">' +
      '<header class="admin__bar">' +
      '<div class="admin__brand">' +
      '<span class="admin__logo">품</span>' +
      '<span class="admin__brandtext">운영 관리자<small>pumss.co.kr/#/ops-admin</small></span>' +
      '<span class="admin__tag">OPS</span>' +
      '</div>' +
      '<div class="admin__actions">' +
      gradeBadgeHTML() +
      '<button type="button" class="adm-btn adm-btn--ghost" data-nav="share">공유 페이지</button>' +
      '<button type="button" class="adm-btn adm-btn--ghost" data-nav="editor">사용자 화면</button>' +
      Pum.fontToggleHTML() +
      '</div>' +
      '</header>' +
      '<div class="admin__layout">' +
      '<nav class="admin__nav" aria-label="운영 관리자 메뉴">' +
      TABS.map(function (t) {
        return (
          '<button type="button" class="admin__navbtn' + (t.id === tab ? ' is-active' : '') + '" data-ops-tab="' + t.id + '">' +
          icon(t.icon) + '<span>' + esc(t.label) + '</span>' +
          (t.id === 'accounts' && !isSuper() ? '<em class="admin__lock">조회</em>' : '') +
          '</button>'
        );
      }).join('') +
      '</nav>' +
      '<main class="admin__main" id="adminMain"></main>' +
      '</div></div>';

    app.querySelectorAll('[data-ops-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        tab = btn.getAttribute('data-ops-tab');
        app.querySelectorAll('[data-ops-tab]').forEach(function (x) {
          x.classList.toggle('is-active', x === btn);
        });
        renderTab(app);
      });
    });

    var out = app.querySelector('[data-ops-logout]');
    if (out) out.addEventListener('click', function () { opsLogout(app); });

    renderTab(app);
  }

  function head(title, desc) {
    return (
      '<div class="adm-head"><div><h1 class="adm-title">' + esc(title) + '</h1>' +
      '<p class="adm-desc">' + esc(desc) + '</p></div>' +
      '<span class="adm-updated">최근 갱신 ' + esc(stamp()) + '</span></div>'
    );
  }

  function renderTab(app) {
    var main = app.querySelector('#adminMain');
    if (!main) return;
    if (tab === 'members') main.innerHTML = membersHTML();
    else if (tab === 'notices') main.innerHTML = noticesHTML();
    else if (tab === 'pumss') main.innerHTML = pumssHTML();
    else if (tab === 'reports') main.innerHTML = reportsHTML();
    else if (tab === 'accounts') main.innerHTML = accountsHTML();
    else main.innerHTML = dashHTML();

    if (tab === 'dashboard') bindDash(app);
    else if (tab === 'members') bindMembers(app);
    else if (tab === 'notices') bindNotices(app);
    else if (tab === 'pumss') bindPumss(app);
    else if (tab === 'reports') bindReports(app);
    else if (tab === 'accounts') bindAccounts(app);
  }

  /* ---------------------------------------------------------------- 대시보드 */
  function dashHTML() {
    var ad = AD();
    var members = ad.members || [];
    var active = members.filter(function (m) {
      return m.status === 'active';
    });
    var blocked = members.filter(function (m) {
      return m.status === 'suspended' || m.status === 'reported' || m.status === 'deleted';
    });
    var sources = ad.stats.sources || {};
    var q = lower(memberQuery);
    var rows = members.filter(function (m) {
      if (!q) return true;
      return lower(m.name).indexOf(q) >= 0 || lower(m.email).indexOf(q) >= 0 || lower(m.slug).indexOf(q) >= 0;
    });

    return (
      head('대시보드', '전체 회원 현황과 조회수를 한눈에 확인합니다. 회원을 검색해 바로 관리할 수 있어요.') +
      '<div class="adm-stats">' +
      '<div class="adm-stat"><span class="adm-stat__label">총 회원</span><strong class="adm-stat__value">' + num(members.length) + '명</strong><span class="adm-stat__sub">정상 ' + num(active.length) + ' · 제한 ' + num(blocked.length) + '</span></div>' +
      '<div class="adm-stat"><span class="adm-stat__label">품 주소 등록</span><strong class="adm-stat__value">' + num(members.filter(function (m) { return !!m.slug; }).length) + '개</strong><span class="adm-stat__sub">주소 등록 기준</span></div>' +
      '<div class="adm-stat"><span class="adm-stat__label">누적 조회</span><strong class="adm-stat__value">' + num(ad.stats.views) + '</strong><span class="adm-stat__sub">오늘 +' + num(ad.stats.todayViews) + '</span></div>' +
      '<div class="adm-stat"><span class="adm-stat__label">누적 클릭</span><strong class="adm-stat__value">' + num(ad.stats.clicks) + '</strong><span class="adm-stat__sub">오늘 +' + num(ad.stats.todayClicks) + '</span></div>' +
      '</div>' +

      '<section class="adm-card"><div class="adm-card__head"><h2>회원별 조회</h2>' +
      '<form class="adm-search" id="opsSearchForm"><input class="input" id="opsSearch" placeholder="이름·이메일·품 주소 검색" value="' + esc(memberQuery) + '" />' +
      '<button class="adm-btn adm-btn--sm" type="submit">' + icon('search') + '검색</button></form></div>' +
      '<div class="adm-table-wrap"><table class="adm-table">' +
      '<thead><tr><th>이름</th><th>품 주소</th><th>조회</th><th>오늘</th><th>상태</th><th></th></tr></thead><tbody>' +
      (rows.length
        ? rows.map(function (m) {
            return '<tr><td><b>' + esc(m.name) + '</b><div class="adm-muted" style="font-size:11.5px">' + esc(m.email) + '</div></td>' +
              '<td>' + (m.slug ? '@' + esc(m.slug) : '<span class="adm-muted">미설정</span>') + '</td>' +
              '<td>' + num(m.views) + '</td><td>' + num(m.todayViews) + '</td>' +
              '<td>' + statusPill(m.status) + '</td>' +
              '<td class="adm-right"><button type="button" class="adm-btn adm-btn--sm adm-btn--ghost" data-ops-member="' + esc(m.id) + '">상세</button></td></tr>';
          }).join('')
        : '<tr><td colspan="6" class="adm-muted">검색 결과가 없습니다.</td></tr>') +
      '</tbody></table></div></section>' +

      '<div class="adm-cols">' +
      '<section class="adm-card"><div class="adm-card__head"><h2>블록별 클릭</h2><span class="adm-count">오늘 +' + num(ad.stats.todayClicks) + '</span></div><div class="adm-card__body">' +
      (Object.keys(ad.stats.blockClicks || {}).length
        ? '<ul class="adm-kv">' + Object.keys(ad.stats.blockClicks)
            .sort(function (a, b) {
              return ad.stats.blockClicks[b] - ad.stats.blockClicks[a];
            })
            .slice(0, 8)
            .map(function (k) {
              return '<li><span>' + esc(Pum.clickLabel(k)) + '</span><b>' + num(ad.stats.blockClicks[k]) + '회</b></li>';
            })
            .join('') + '</ul>'
        : '<p class="adm-hint">아직 클릭 기록이 없습니다. 공유 페이지에서 링크·배너를 누르면 집계됩니다.</p>') +
      '</div></section>' +
      '<section class="adm-card"><div class="adm-card__head"><h2>조회 유입 경로</h2></div><div class="adm-card__body"><div class="adm-sources">' +
      Object.keys(sources).map(function (k) {
        var v = Number(sources[k] || 0);
        var total = Math.max(1, Number(ad.stats.views || 0));
        return '<div class="adm-source"><span>' + esc(Pum.sourceLabel(k)) + '</span>' +
          '<div class="adm-bar"><i style="width:' + Math.round((v / total) * 100) + '%"></i></div><b>' + num(v) + '</b></div>';
      }).join('') +
      '</div></div></section>' +
      '<section class="adm-card"><div class="adm-card__head"><h2>최근 감사 로그</h2>' +
      '<button type="button" class="adm-btn adm-btn--sm adm-btn--ghost" data-ops-goto="reports">전체</button></div>' +
      '<div class="adm-card__body"><ul class="adm-log">' +
      (ad.audit || []).slice(0, 6).map(function (a) {
        return '<li><span class="adm-log__time">' + esc(a.at) + '</span><span class="adm-log__text">' + esc(a.action) + '</span></li>';
      }).join('') +
      '</ul></div></section>' +
      '</div>'
    );
  }

  function bindDash(app) {
    var main = app.querySelector('#adminMain');
    var form = main.querySelector('#opsSearchForm');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        memberQuery = main.querySelector('#opsSearch').value.trim();
        renderTab(app);
      });
      main.querySelector('#opsSearch').addEventListener('input', function () {
        memberQuery = this.value.trim();
        /* 입력할 때마다 목록만 즉시 갱신 */
        var rows = AD().members.filter(function (m) {
          var q = lower(memberQuery);
          if (!q) return true;
          return lower(m.name).indexOf(q) >= 0 || lower(m.email).indexOf(q) >= 0 || lower(m.slug).indexOf(q) >= 0;
        });
        var tbody = main.querySelector('.adm-table tbody');
        if (tbody) {
          tbody.innerHTML = rows.length
            ? rows.map(function (m) {
                return '<tr><td><b>' + esc(m.name) + '</b><div class="adm-muted" style="font-size:11.5px">' + esc(m.email) + '</div></td>' +
                  '<td>' + (m.slug ? '@' + esc(m.slug) : '<span class="adm-muted">미설정</span>') + '</td>' +
                  '<td>' + num(m.views) + '</td><td>' + num(m.todayViews) + '</td>' +
                  '<td>' + statusPill(m.status) + '</td>' +
                  '<td class="adm-right"><button type="button" class="adm-btn adm-btn--sm adm-btn--ghost" data-ops-member="' + esc(m.id) + '">상세</button></td></tr>';
              }).join('')
            : '<tr><td colspan="6" class="adm-muted">검색 결과가 없습니다.</td></tr>';
          bindMemberButtons(app, tbody);
        }
      });
    }
    bindMemberButtons(app, main);
    main.querySelectorAll('[data-ops-goto]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        tab = btn.getAttribute('data-ops-goto');
        opsView(document.getElementById('app'));
      });
    });
  }

  /* ------------------------------------------------------------ 회원 · 품 주소 */
  function membersHTML() {
    var ad = AD();
    var members = ad.members || [];
    return (
      head('회원 · 품 주소 관리', '회원을 누르면 가입 정보·신고 이력을 볼 수 있습니다. 정지에는 사유 입력이 필요합니다.') +
      '<section class="adm-card">' +
      '<div class="adm-card__head"><h2>회원 목록</h2><span class="adm-count">' + num(members.length) + '명</span>' +
      '<button type="button" class="adm-btn adm-btn--sm adm-btn--ghost" id="opsCsv" style="margin-left:auto">' + icon('download') + 'CSV 내보내기</button></div>' +
      '<div class="adm-table-wrap"><table class="adm-table">' +
      '<thead><tr><th>이름</th><th>아이디(이메일·휴대전화)</th><th>휴대전화</th><th>품 주소</th><th>가입일</th><th>조회</th><th>마케팅 동의</th><th>상태</th><th></th></tr></thead><tbody>' +
      members.map(function (m) {
        var blocked = m.status === 'suspended' || m.status === 'reported' || m.status === 'deleted';
        return (
          '<tr data-ops-row="' + esc(m.id) + '">' +
          '<td><button type="button" class="adm-link" data-ops-member="' + esc(m.id) + '"><b>' + esc(m.name || '-') + '</b></button></td>' +
          '<td class="adm-muted">' + esc(m.email || m.loginId || '-') + '</td>' +
          '<td class="adm-muted">' + esc(m.phone || '-') + '</td>' +
          '<td>' + (m.slug ? '@' + esc(m.slug) : '<span class="adm-muted">미설정</span>') + '</td>' +
          '<td class="adm-muted">' + esc(m.joinedAt || '-') + '</td>' +
          '<td>' + num(m.views) + '</td>' +
          '<td>' + consentCell(m) + '</td>' +
          '<td>' + statusPill(m.status) + (m.suspendReason ? '<div class="adm-muted" style="font-size:11px;margin-top:2px">' + esc(m.suspendReason) + '</div>' : '') + '</td>' +
          '<td class="adm-right">' +
          (blocked
            ? '<button type="button" class="adm-btn adm-btn--sm adm-btn--ok" data-ops-unsuspend="' + esc(m.id) + '">정지해제</button> ' +
              '<button type="button" class="adm-btn adm-btn--sm adm-btn--danger" data-ops-delete="' + esc(m.id) + '">계정 삭제</button>'
            : '<button type="button" class="adm-btn adm-btn--sm adm-btn--danger" data-ops-suspend="' + esc(m.id) + '">정지</button>') +
          '</td></tr>'
        );
      }).join('') +
      '</tbody></table></div></section>' +

      '<section class="adm-card">' +
      '<div class="adm-card__head"><h2>시스템 예약어</h2><span class="adm-count">' + num((ad.reserved || []).length) + '개</span></div>' +
      '<div class="adm-card__body">' +
      '<div class="adm-chips" id="admReservedList">' +
      (ad.reserved || []).map(function (w) {
        return '<span class="adm-chip">' + esc(w) + '<button type="button" data-adm-res-del="' + esc(w) + '" aria-label="' + esc(w) + ' 삭제">×</button></span>';
      }).join('') +
      '</div>' +
      '<form class="adm-inline" id="admResForm"><input class="input" id="admResInput" maxlength="16" placeholder="예약어 (영문·숫자)" autocomplete="off" />' +
      '<button class="adm-btn adm-btn--primary" type="submit">추가</button></form>' +
      '<p class="adm-hint">예약어는 브랜드 선점·시스템 경로 보호를 위해 회원이 쓸 수 없도록 막는 주소입니다. 품 주소 입력 즉시 차단됩니다.</p>' +
      '</div></section>'
    );
  }

  function bindMembers(app) {
    var main = app.querySelector('#adminMain');
    bindMemberButtons(app, main);

    var csvBtn = main.querySelector('#opsCsv');
    if (csvBtn) {
      csvBtn.addEventListener('click', function () {
        var rows = [
          ['이름', '아이디(이메일·휴대전화)', '휴대전화', '품 주소', '가입일', '조회', '오늘조회', '클릭', '마케팅 수신 동의', '동의일', '상태', '정지사유']
        ];
        (AD().members || []).forEach(function (m) {
          rows.push([
            m.name || '',
            m.email || m.loginId || '',
            m.phone || '',
            m.slug ? '@' + m.slug : '',
            m.joinedAt || '',
            String(m.views || 0),
            String(m.todayViews || 0),
            String(m.clicks || 0),
            consentOn(m) ? '동의' : '미동의',
            consentOn(m) ? consentInfo(m).at : '',
            (STATUS_LABEL[m.status] || STATUS_LABEL.active).text,
            m.suspendReason || ''
          ]);
        });
        var csv = rows
          .map(function (r) {
            return r
              .map(function (v) {
                var t = String(v == null ? '' : v).replace(/"/g, '""');
                return '"' + t + '"';
              })
              .join(',');
          })
          .join('\r\n');
        var blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'pum-members-' + Pum.util.todayStamp() + '.csv';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
          URL.revokeObjectURL(a.href);
          a.remove();
        }, 800);
        Pum.toast('회원 목록을 CSV로 내려받았습니다');
      });
    }

    main.querySelectorAll('[data-ops-suspend]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        suspendModal(btn.getAttribute('data-ops-suspend'));
      });
    });
    main.querySelectorAll('[data-ops-unsuspend]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-ops-unsuspend');
        var m = findMember(id);
        if (!m) return;
        Pum.update(function (st) {
          var t = findMember(id, st);
          if (t) {
            t.status = 'active';
            t.suspendReason = '';
          }
          Pum.logAudit('회원 @' + (m.slug || m.email) + ' 정지 해제');
        });
        Pum.toast('정지를 해제했습니다');
        renderTab(app);
      });
    });
    main.querySelectorAll('[data-ops-delete]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        deleteModal(btn.getAttribute('data-ops-delete'), app);
      });
    });
    main.querySelectorAll('[data-adm-res-del]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var word = btn.getAttribute('data-adm-res-del');
        Pum.update(function (st) {
          st.admin.reserved = st.admin.reserved.filter(function (w) {
            return w !== word;
          });
          Pum.logAudit('예약어 삭제: ' + word);
        });
        Pum.toast('예약어를 삭제했습니다');
        renderTab(app);
      });
    });
    var form = main.querySelector('#admResForm');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var input = main.querySelector('#admResInput');
        var word = (input.value || '').trim().toLowerCase();
        if (!word) {
          Pum.toast('예약어를 입력해 주세요', 'err');
          return;
        }
        if (!/^[a-z][a-z0-9-]{1,15}$/.test(word)) {
          Pum.toast('영문 소문자로 시작하는 2~16자로 입력해 주세요', 'err');
          return;
        }
        if (AD().reserved.indexOf(word) >= 0) {
          Pum.toast('이미 등록된 예약어입니다', 'err');
          return;
        }
        Pum.update(function (st) {
          st.admin.reserved.push(word);
          Pum.logAudit('예약어 추가: ' + word);
        });
        Pum.toast('예약어 "' + word + '"를 추가했습니다');
        renderTab(app);
      });
    }
  }

  function bindMemberButtons(app, scope) {
    (scope || app).querySelectorAll('[data-ops-member]').forEach(function (btn) {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function () {
        memberDetailModal(btn.getAttribute('data-ops-member'));
      });
    });
  }

  function findMember(id, state) {
    var st = state || S();
    return (st.admin.members || []).filter(function (m) {
      return m.id === id;
    })[0];
  }

  function reportHistory(m) {
    var reports = AD().reports || [];
    return reports.filter(function (r) {
      return lower(r.email) === lower(m.email) || lower(r.target) === '@' + lower(m.slug);
    });
  }

  function memberDetailModal(id) {
    var m = findMember(id);
    if (!m) return;
    var reps = reportHistory(m);
    var body =
      '<ul class="adm-kv">' +
      '<li><span>이름</span><b>' + esc(m.name || '-') + '</b></li>' +
      '<li><span>아이디(이메일·휴대전화)</span><b>' + esc(m.email || m.loginId || '-') + '</b></li>' +
      '<li><span>휴대전화</span><b>' + esc(m.phone || '-') + '</b></li>' +
      '<li><span>품 주소</span><b>' + (m.slug ? '@' + esc(m.slug) : '미설정') + '</b></li>' +
      '<li><span>가입 정보</span><b>' + esc(m.joinedAt || '-') + ' 가입</b></li>' +
      '<li><span>마케팅 수신</span><b>' + (consentOn(m) ? '동의' + (consentInfo(m).at ? ' (' + esc(consentInfo(m).at) + ')' : '') : '미동의') + '</b></li>' +
      '<li><span>조회 / 클릭</span><b>' + num(m.views) + ' / ' + num(m.clicks || 0) + '</b></li>' +
      '<li><span>상태</span><b>' + statusPill(m.status) + '</b></li>' +
      (m.suspendReason ? '<li><span>정지 사유</span><b>' + esc(m.suspendReason) + '</b></li>' : '') +
      (m.deletedAt ? '<li><span>삭제 처리</span><b>' + esc(m.deletedAt) + ' (30일 보관)</b></li>' : '') +
      '</ul>' +
      '<h3 class="adm-subtitle">신고 받은 이력</h3>' +
      (reps.length
        ? '<ul class="adm-log adm-log--full">' + reps.map(function (r) {
            return '<li><span class="adm-log__time">' + esc(r.at) + '</span>' +
              '<span class="adm-log__text">' + esc(r.reason) + '</span>' +
              '<span class="adm-log__who">' + esc(r.status) + '</span></li>';
          }).join('') + '</ul>'
        : '<p class="adm-hint">신고 이력이 없습니다.</p>');

    var actions = [{ label: '닫기', kind: 'ghost' }];
    if (m.status === 'suspended' || m.status === 'reported') {
      actions.push({ label: '정지 해제', kind: 'primary', onClick: function () {
        Pum.update(function (st) {
          var t = findMember(id, st);
          if (t) {
            t.status = 'active';
            t.suspendReason = '';
          }
          Pum.logAudit('회원 @' + (m.slug || m.email) + ' 정지 해제 (상세)');
        });
        Pum.toast('정지를 해제했습니다');
        renderTab(document.getElementById('app'));
      } });
    } else if (m.status !== 'deleted') {
      actions.push({ label: '정지', kind: 'brand', onClick: function () {
        setTimeout(function () {
          suspendModal(id);
        }, 120);
      } });
    }
    Pum.modal({ title: m.name + ' 상세', desc: m.email, body: body, actions: actions });
  }

  function suspendModal(id) {
    var m = findMember(id);
    if (!m) return;
    var body =
      '<div class="map-note map-note--warn">' + icon('info') +
      '<span>정지하면 해당 품 공유 페이지가 즉시 차단되고 로그인이 제한됩니다. <b>정지 사유는 필수</b>이며 회원에게 이메일로 안내됩니다(더미 발송).</span></div>' +
      '<div class="field"><label class="field__label">정지 사유 <span class="req">*</span></label>' +
      '<select class="input select" id="susReason">' +
      '<option value="">사유 선택</option>' +
      '<option>허위·과장 홍보</option>' +
      '<option>저작권 침해 이미지 사용</option>' +
      '<option>스팸·반복 링크 게시</option>' +
      '<option>불법 정보 게시</option>' +
      '<option>기타 (직접 입력)</option>' +
      '</select></div>' +
      '<div class="field"><label class="field__label">상세 사유</label>' +
      '<textarea class="textarea" id="susDetail" rows="3" placeholder="회원에게 안내될 정지 사유를 적어 주세요"></textarea></div>';

    Pum.modal({
      title: '회원 정지 — ' + m.name,
      body: body,
      actions: [
        { label: '취소', kind: 'ghost' },
        {
          label: '정지 처리',
          kind: 'brand',
          onClick: function (api) {
            var sel = api.body.querySelector('#susReason').value;
            var detail = api.body.querySelector('#susDetail').value.trim();
            if (!sel && !detail) {
              Pum.toast('정지 사유를 입력해 주세요 (필수)', 'err');
              return false;
            }
            var reason = sel === '기타 (직접 입력)' || !sel ? detail : sel + (detail ? ' — ' + detail : '');
            Pum.update(function (st) {
              var t = findMember(id, st);
              if (t) {
                t.status = 'suspended';
                t.suspendReason = reason;
              }
              Pum.logAudit('회원 @' + (m.slug || m.email) + ' 정지 · 사유: ' + reason);
              st.admin.mailLog = st.admin.mailLog || [];
              st.admin.mailLog.unshift({
                id: 'ml-' + Date.now().toString(36),
                at: stamp(),
                to: m.email,
                subject: '[품] 이용 정지 안내 (데모 발송)',
                body: '정지 사유: ' + reason,
                kind: 'mail'
              });
            });
            Pum.toast('정지 처리하고 사유를 이메일로 안내했습니다 (데모)');
            renderTab(document.getElementById('app'));
          }
        }
      ]
    });
  }

  function deleteModal(id, app) {
    var m = findMember(id);
    if (!m) return;
    var body =
      '<div class="map-note map-note--warn">' + icon('info') +
      '<span>계정을 삭제하면 즉시 로그인·공유가 차단되고, <b>30일 보관 후 완전 삭제</b>됩니다. 완료 시 안내 이메일이 자동 발송됩니다(더미).</span></div>' +
      '<div class="field"><label class="field__label">삭제 안내 사유 <span class="req">*</span></label>' +
      '<textarea class="textarea" id="delReason" rows="3" placeholder="회원에게 안내할 삭제 사유를 적어 주세요"></textarea></div>' +
      '<label class="check-row"><input type="checkbox" id="delAgree" /><span>30일 보관 후 완전 삭제됨을 확인했습니다.</span></label>';

    Pum.modal({
      title: '계정 삭제 — ' + m.name,
      body: body,
      actions: [
        { label: '취소', kind: 'ghost' },
        {
          label: '삭제 처리',
          kind: 'brand',
          onClick: function (api) {
            var reason = api.body.querySelector('#delReason').value.trim();
            if (!reason) {
              Pum.toast('삭제 안내 사유를 입력해 주세요 (필수)', 'err');
              return false;
            }
            if (!api.body.querySelector('#delAgree').checked) {
              Pum.toast('확인 체크가 필요합니다', 'err');
              return false;
            }
            var now = stamp();
            Pum.update(function (st) {
              var t = findMember(id, st);
              if (t) {
                t.status = 'deleted';
                t.deletedAt = now;
                t.deleteReason = reason;
                t.suspendReason = reason;
              }
              Pum.logAudit('회원 @' + (m.slug || m.email) + ' 계정 삭제 · 사유: ' + reason);
              st.admin.mailLog = st.admin.mailLog || [];
              st.admin.mailLog.unshift({
                id: 'ml-' + Date.now().toString(36),
                at: now,
                to: m.email,
                subject: '[품] 계정 삭제 안내 (데모 발송)',
                body: '삭제 사유: ' + reason + ' / 30일 보관 후 완전 삭제됩니다.',
                kind: 'mail'
              });
            });
            Pum.toast('삭제 처리하고 안내 이메일을 발송했습니다 (30일 보관)');
            renderTab(document.getElementById('app'));
          }
        }
      ]
    });
  }

  /* ------------------------------------------------- 공지 · PUSH · 배너 */

  /* ---------- PUSH 발송 이력 — 대상·성공·실패·수신(ACK) 집계 ---------- */
  function pushStats(h) {
    var rec = (h && h.recipients) || [];
    var total = rec.length;
    var success = rec.filter(function (r) { return r.status === 'success'; }).length;
    var fail = rec.filter(function (r) { return r.status === 'fail'; }).length;
    var read = rec.filter(function (r) { return r.ack === 'read'; }).length;
    return {
      total: total,
      success: success,
      fail: fail,
      read: read,
      excluded: ((h && h.excludedList) || []).length,
      rate: total ? Math.round((read / total) * 100) : 0
    };
  }

  function pushTypeLabel(type) {
    return type === 'ad' ? '광고' : '공지';
  }

  function pushStatusPill(h) {
    if (h.status === 'scheduled') return '<span class="adm-pill adm-pill--wait">예약 대기</span>';
    if (h.status === 'canceled') return '<span class="adm-pill adm-pill--stop">예약 취소</span>';
    return '<span class="adm-pill adm-pill--ok">발송완료</span>';
  }

  function pushHistoryList() {
    return (AD().pushHistory || []).slice().sort(function (a, b) {
      var at = String(a.at || '');
      var bt = String(b.at || '');
      if (at === bt) return 0;
      return at < bt ? 1 : -1;
    });
  }

  function findPush(id) {
    return (
      (AD().pushHistory || []).filter(function (h) {
        return h.id === id;
      })[0] || null
    );
  }

  /** 발송 일시 / 예정 일시 문구 (이스케이프 포함) */
  function pushWhenText(h) {
    if (h.status === 'scheduled') return '예정 ' + esc(h.scheduledAt || '-');
    if (h.status === 'canceled') return '예정 ' + esc(h.scheduledAt || '-');
    return esc(h.sentAt || h.at || '-');
  }

  function pushHistoryHTML() {
    var list = pushHistoryList();
    var sent = list.filter(function (h) { return h.status === 'sent'; });
    var sumSuccess = 0;
    var sumFail = 0;
    var sumRead = 0;
    var allRecipients = 0;
    sent.forEach(function (h) {
      var st = pushStats(h);
      sumSuccess += st.success;
      sumFail += st.fail;
      sumRead += st.read;
      allRecipients += st.total;
    });
    var avgRate = allRecipients ? Math.round((sumRead / allRecipients) * 100) : 0;
    var waiting = list.filter(function (h) { return h.status === 'scheduled'; }).length;

    return (
      '<section class="adm-card">' +
      '<div class="adm-card__head"><h2>PUSH 발송 이력</h2>' +
      '<span class="adm-count">' + num(list.length) + '건 · 예약 대기 ' + num(waiting) + '건</span></div>' +
      '<div class="adm-card__body"><div class="adm-sum">' +
      '<span>발송 <b>' + num(sent.length) + '회</b></span>' +
      '<span>발송 건수 <b>' + num(allRecipients) + '건</b></span>' +
      '<span>성공 <b>' + num(sumSuccess) + '건</b> · 실패 <b>' + num(sumFail) + '건</b></span>' +
      '<span>수신 확인 <b>' + num(sumRead) + '건</b> · 평균 수신율 <b>' + avgRate + '%</b></span>' +
      '</div></div>' +
      '<div class="adm-table-wrap"><table class="adm-table">' +
      '<thead><tr><th>발송 일시</th><th>유형</th><th>제목 / 내용</th><th>대상</th><th>성공 / 실패</th><th>수신(율)</th><th>상태</th><th></th></tr></thead><tbody>' +
      (list.length
        ? list
            .map(function (h) {
              var st = pushStats(h);
              var wait = h.status === 'scheduled';
              var canceled = h.status === 'canceled';
              var dash = '<span class="adm-muted">-</span>';
              return (
                '<tr>' +
                '<td class="adm-muted">' + pushWhenText(h) +
                (wait ? '<div class="adm-muted" style="font-size:11px">등록 ' + esc(h.at || '') + '</div>' : '') +
                (canceled ? '<div class="adm-muted" style="font-size:11px">취소 ' + esc(h.canceledAt || '') + '</div>' : '') +
                '</td>' +
                '<td><span class="adm-pill ' + (h.type === 'ad' ? 'adm-pill--wait' : 'adm-pill--ok') + '">' + pushTypeLabel(h.type) + '</span></td>' +
                '<td><b>' + esc(h.title) + '</b><div class="adm-muted" style="font-size:11.5px">' + esc(String(h.body || '').slice(0, 40)) + '</div></td>' +
                '<td>' + esc(h.targetLabel || '전체 회원') +
                '<div class="adm-muted" style="font-size:11px">발송 ' + num(st.total) + '건' +
                (st.excluded ? ' · 제외 ' + num(st.excluded) + '건' : '') + '</div></td>' +
                '<td>' + (wait || canceled ? dash : num(st.success) + ' / ' + num(st.fail)) + '</td>' +
                '<td>' + (wait || canceled ? dash : num(st.read) + '건 <span class="adm-muted">(' + st.rate + '%)</span>') + '</td>' +
                '<td>' + pushStatusPill(h) + '</td>' +
                '<td class="adm-right">' +
                (wait
                  ? '<button type="button" class="adm-btn adm-btn--sm adm-btn--primary" data-push-run="' + esc(h.id) + '">즉시 실행</button> ' +
                    '<button type="button" class="adm-btn adm-btn--sm adm-btn--ghost" data-push-cancel="' + esc(h.id) + '">예약 취소</button>'
                  : '<button type="button" class="adm-btn adm-btn--sm adm-btn--ghost" data-push-detail="' + esc(h.id) + '">상세</button>') +
                '</td></tr>'
              );
            })
            .join('')
        : '<tr><td colspan="8" class="adm-muted">발송 이력이 없습니다.</td></tr>') +
      '</tbody></table></div>' +
      '<div class="adm-card__body"><p class="adm-hint" style="margin:0">' +
      '발송 건수·성공·실패는 서버가 발송을 요청한 결과이고, 수신 확인은 단말기·앱이 서버에 보내는 수신 ACK 기준입니다. ' +
      '이 프로토타입에서는 샘플 데이터와 <b>수신 확인 시뮬레이션</b>으로 표시합니다.</p></div>' +
      '</section>'
    );
  }

  /* ---------- 대상 계산 — 발송 유형(공지/광고)별 필터 ---------- */
  function pushAudience(type, target, memberId) {
    var members = AD().members || [];
    var scope;
    if (target === 'individual') {
      var one = findMember(memberId);
      scope = one ? [one] : [];
    } else if (target === 'new') {
      var from = Date.now() - 30 * 24 * 60 * 60 * 1000;
      scope = members.filter(function (m) {
        var raw = String(m.joinedAt || '');
        var t = new Date(raw.length === 10 ? raw + 'T00:00:00' : raw).getTime();
        return !isNaN(t) && t >= from;
      });
    } else {
      scope = members.slice();
    }
    var blocked = scope.filter(function (m) {
      return m.status !== 'active';
    });
    var alive = scope.filter(function (m) {
      return m.status === 'active';
    });
    var excluded = blocked.map(function (m) {
      var st = STATUS_LABEL[m.status] || STATUS_LABEL.active;
      return { name: m.name || '', email: m.email || m.loginId || '', reason: '발송 불가(' + st.text + ')' };
    });
    var targets = alive;
    if (type === 'ad') {
      targets = alive.filter(consentOn);
      alive.forEach(function (m) {
        if (!consentOn(m)) {
          excluded.push({ name: m.name || '', email: m.email || m.loginId || '', reason: '마케팅 수신 미동의' });
        }
      });
    }
    return { targets: targets, excluded: excluded };
  }

  function audienceHTML(aud, type) {
    var noConsent = aud.excluded.filter(function (e) {
      return e.reason.indexOf('미동의') >= 0;
    }).length;
    var blocked = aud.excluded.length - noConsent;
    var rows = aud.targets
      .map(function (m) {
        return (
          '<div class="adm-aud__row">' +
          '<span class="adm-aud__name">' + esc(m.name || '-') + '</span>' +
          '<span class="adm-aud__mail">' + esc(m.email || m.loginId || '') + '</span>' +
          consentPill(m) +
          '<span class="adm-pill adm-pill--ok">발송</span></div>'
        );
      })
      .concat(
        aud.excluded.map(function (e) {
          return (
            '<div class="adm-aud__row is-out">' +
            '<span class="adm-aud__name">' + esc(e.name || '-') + '</span>' +
            '<span class="adm-aud__mail">' + esc(e.email || '') + '</span>' +
            '<span class="adm-pill adm-pill--stop">' + esc(e.reason) + '</span>' +
            '<span class="adm-pill adm-pill--stop">제외</span></div>'
          );
        })
      )
      .join('');

    return (
      '<div class="adm-aud__counts">' +
      '<span>발송 대상 <b>' + num(aud.targets.length) + '건</b></span>' +
      (type === 'ad' ? '<span>미동의 제외 <b>' + num(noConsent) + '건</b></span>' : '') +
      '<span>발송 불가 <b>' + num(blocked) + '건</b></span>' +
      '</div>' +
      '<div class="adm-aud__list">' +
      (rows || '<p class="adm-hint" style="margin:0">발송 대상이 없습니다.</p>') +
      '</div>'
    );
  }

  function noticesHTML() {
    var ad = AD();
    var b = ad.banner;
    var list = ad.notifications || [];
    return (
      head('공지 · PUSH · 배너', '전체·신규·예약 PUSH와 상단 공지를 발송합니다. 사용자 품 화면 미리보기도 이미지로 등록할 수 있어요.') +
      '<div class="adm-cols">' +
      '<section class="adm-card"><div class="adm-card__head"><h2>상단 공지</h2>' +
      '<label class="switch switch--sm"><input type="checkbox" id="opsNoticeOn"' + (ad.notice.on ? ' checked' : '') + ' /><span class="switch__track"></span></label></div>' +
      '<div class="adm-card__body">' +
      '<textarea class="textarea" id="opsNoticeText" rows="3" placeholder="공유 페이지 상단에 노출할 공지">' + esc(ad.notice.text || '') + '</textarea>' +
      '<div class="adm-row-end"><button type="button" class="adm-btn adm-btn--primary" id="opsNoticeSave">공지 저장</button></div>' +
      '<p class="adm-hint">회원이 X로 닫으면 <b>당일 숨김</b>되고 다음날 00시에 다시 노출됩니다.</p>' +
      '</div></section>' +
      '<section class="adm-card"><div class="adm-card__head"><h2>『품 무료 만들기』 배너</h2></div>' +
      '<div class="adm-card__body">' +
      '<div class="adm-grid2">' +
      '<div><label class="field__label">상단 문구</label><input class="input" id="opsEyebrow" value="' + esc(b.eyebrow) + '" /></div>' +
      '<div><label class="field__label">버튼 문구</label><input class="input" id="opsCta" value="' + esc(b.cta) + '" /></div>' +
      '</div>' +
      '<label class="field__label">제목</label><input class="input" id="opsBannerTitle" value="' + esc(b.title) + '" />' +
      '<label class="field__label">부제</label><textarea class="textarea" id="opsBannerSub" rows="2">' + esc(b.subtitle) + '</textarea>' +
      '<div class="adm-row-end"><button type="button" class="adm-btn adm-btn--primary" id="opsBannerSave">배너 저장</button></div>' +
      '</div></section>' +
      '</div>' +

      '<section class="adm-card"><div class="adm-card__head"><h2>PUSH · 공지 발송</h2>' +
      '<button type="button" class="adm-btn adm-btn--primary adm-btn--sm" id="opsPushNew">' + icon('plus') + '발송하기</button></div>' +
      '<div class="adm-card__body">' +
      '<div class="adm-table-wrap"><table class="adm-table">' +
      '<thead><tr><th>제목</th><th>대상</th><th>채널</th><th>상태</th><th>일시</th><th></th></tr></thead><tbody>' +
      (list.length
        ? list.map(function (n) {
            return '<tr><td><b>' + esc(n.title) + '</b><div class="adm-muted" style="font-size:11.5px">' + esc(n.body).slice(0, 40) + '</div></td>' +
              '<td>' + esc(n.targetLabel || '') + '</td>' +
              '<td>' + (n.channel === 'push' ? 'PUSH' : '공지') + (n.pushType === 'ad' ? ' · 광고' : '') + '</td>' +
              '<td>' + (n.status === 'scheduled' ? '<span class="adm-pill adm-pill--wait">예약</span>' : n.status === 'canceled' ? '<span class="adm-pill adm-pill--stop">취소</span>' : '<span class="adm-pill adm-pill--ok">발송</span>') + '</td>' +
              '<td class="adm-muted">' + esc(String(n.sentAt || n.scheduledAt || n.at || '').slice(0, 16)) + '</td>' +
              '<td class="adm-right">' + (n.status === 'scheduled'
                ? '<button type="button" class="adm-btn adm-btn--sm adm-btn--primary" data-ops-sendnow="' + esc(n.id) + '">지금 발송</button>'
                : '<span class="adm-muted">-</span>') + '</td></tr>';
          }).join('')
        : '<tr><td colspan="6" class="adm-muted">발송 이력이 없습니다.</td></tr>') +
      '</tbody></table></div></div>' +
      '<p class="adm-hint" style="margin:0 16px 14px">발송 결과·수신 확인은 아래 <b>PUSH 발송 이력</b>에서 수신자별로 확인할 수 있습니다.</p>' +
      '</section>' +

      pushHistoryHTML() +

      '<section class="adm-card"><div class="adm-card__head"><h2>사용자 화면 미리보기</h2>' +
      '<span class="adm-count">이미지로도 등록할 수 있어요</span></div>' +
      '<div class="adm-card__body">' +
      '<div class="adm-preview" id="opsPreview">' + previewHTML() + '</div>' +
      '<div class="img-actions">' +
      '<button type="button" class="btn btn--xs btn--ghost" id="opsPreviewUpload">' + icon('image') + '미리보기 이미지 등록</button>' +
      '<button type="button" class="btn btn--xs btn--soft" id="opsPreviewClear">이미지 삭제</button>' +
      '</div>' +
      '<p class="adm-hint">등록한 이미지는 회원 화면의 품 미리보기에 표시되는 대표 이미지로 쓰입니다. (권장 1200×800, 300KB 이하)</p>' +
      '</div></section>'
    );
  }

  function previewHTML() {
    var ad = AD();
    if (ad.previewImage) {
      return '<div class="adm-preview__img"><img src="' + ad.previewImage + '" alt="사용자 화면 미리보기 이미지" /></div>';
    }
    var b = ad.banner;
    return (
      (ad.notice.on && ad.notice.text ? '<div class="adm-preview__notice">' + esc(ad.notice.text) + '</div>' : '') +
      '<div class="adm-preview__free">' +
      '<span class="adm-preview__eyebrow">' + esc(b.eyebrow) + '</span>' +
      '<div class="adm-preview__title">' + esc(b.title) + '</div>' +
      '<div class="adm-preview__desc">' + esc(b.subtitle) + '</div>' +
      '<span class="adm-preview__cta">' + esc(b.cta) + ' →</span>' +
      '</div>'
    );
  }

  function bindNotices(app) {
    var main = app.querySelector('#adminMain');
    var preview = main.querySelector('#opsPreview');

    main.querySelector('#opsNoticeOn').addEventListener('change', function () {
      var on = this.checked;
      Pum.update(function (st) {
        st.admin.notice.on = on;
        Pum.logAudit('상단 공지 ' + (on ? '노출 ON' : '노출 OFF'));
      });
      if (preview) preview.innerHTML = previewHTML();
      Pum.toast(on ? '상단 공지를 노출합니다' : '상단 공지를 숨겼습니다');
    });

    main.querySelector('#opsNoticeSave').addEventListener('click', function () {
      var text = main.querySelector('#opsNoticeText').value.trim();
      Pum.update(function (st) {
        st.admin.notice.text = text;
        Pum.logAudit('상단 공지 문구 수정');
      });
      if (preview) preview.innerHTML = previewHTML();
      Pum.toast('공지를 저장했습니다');
    });

    main.querySelector('#opsBannerSave').addEventListener('click', function () {
      Pum.update(function (st) {
        st.admin.banner = {
          eyebrow: main.querySelector('#opsEyebrow').value.trim(),
          title: main.querySelector('#opsBannerTitle').value.trim(),
          subtitle: main.querySelector('#opsBannerSub').value.trim(),
          cta: main.querySelector('#opsCta').value.trim()
        };
        Pum.logAudit('초대 배너 문구 수정');
      });
      if (preview) preview.innerHTML = previewHTML();
      Pum.toast('배너 문구를 저장했습니다');
    });

    main.querySelector('#opsPushNew').addEventListener('click', function () {
      pushModal(app);
    });

    main.querySelectorAll('[data-ops-sendnow]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-ops-sendnow');
        var n = (AD().notifications || []).filter(function (x) {
          return x.id === id;
        })[0];
        var hist = n && n.historyId ? findPush(n.historyId) : null;
        /* 발송 이력에 연결된 예약은 이력 쪽 기록도 함께 처리합니다. */
        if (hist && hist.status === 'scheduled') {
          executePush(hist.id, app);
          return;
        }
        Pum.update(function (st) {
          var t = st.admin.notifications.filter(function (x) {
            return x.id === id;
          })[0];
          if (t) {
            t.status = 'sent';
            t.sentAt = stamp();
            Pum.logAudit('예약 공지 즉시 발송: ' + t.title);
          }
        });
        Pum.toast('예약 공지를 지금 발송했습니다 (데모)');
        renderTab(app);
      });
    });

    /* ---- PUSH 발송 이력 — 상세 / 예약 즉시 실행 / 예약 취소 ---- */
    main.querySelectorAll('[data-push-detail]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        pushDetailModal(btn.getAttribute('data-push-detail'), app);
      });
    });
    main.querySelectorAll('[data-push-run]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        executePush(btn.getAttribute('data-push-run'), app);
      });
    });
    main.querySelectorAll('[data-push-cancel]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        cancelPush(btn.getAttribute('data-push-cancel'), app);
      });
    });

    main.querySelector('#opsPreviewUpload').addEventListener('click', function () {
      Pum.pickImage(function (file) {
        Pum.image
          .compress(file, { maxSize: 1400, quality: 0.84, targetBytes: 320 * 1024 })
          .then(function (res) {
            Pum.update(function (st) {
              st.admin.previewImage = res.dataUrl;
              Pum.logAudit('사용자 화면 미리보기 이미지 등록');
            });
            if (preview) preview.innerHTML = previewHTML();
            Pum.toast('미리보기 이미지를 등록했습니다');
          })
          .catch(function () {
            Pum.toast('이미지를 등록하지 못했습니다', 'err');
          });
      });
    });

    main.querySelector('#opsPreviewClear').addEventListener('click', function () {
      Pum.update(function (st) {
        st.admin.previewImage = '';
      });
      if (preview) preview.innerHTML = previewHTML();
      Pum.toast('미리보기 이미지를 삭제했습니다');
    });
  }

  function pad2(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function localInputValue(d) {
    return (
      d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
      'T' + pad2(d.getHours()) + ':' + pad2(d.getMinutes())
    );
  }

  function pushModal(app) {
    var members = AD().members || [];
    var body =
      '<div class="field"><label class="field__label" for="pushType">발송 유형</label>' +
      '<select class="input select" id="pushType">' +
      '<option value="notice">일반/공지 PUSH (전체)</option>' +
      '<option value="ad">광고성 PUSH (마케팅 수신 동의 회원만)</option>' +
      '</select>' +
      '<p class="field__hint" id="pushTypeHint"></p></div>' +
      '<div class="field"><label class="field__label" for="pushTarget">대상</label>' +
      '<select class="input select" id="pushTarget">' +
      '<option value="all">전체 회원</option>' +
      '<option value="new">신규 가입 회원 (최근 30일)</option>' +
      '<option value="individual">개별 회원</option>' +
      '</select></div>' +
      '<div class="field" id="pushWhoWrap" hidden><label class="field__label" for="pushWho">회원 선택</label>' +
      '<select class="input select" id="pushWho">' +
      members
        .map(function (m) {
          return (
            '<option value="' + esc(m.id) + '">' + esc(m.name) + ' · ' + esc(m.email || m.loginId || '') +
            (consentOn(m) ? ' (마케팅 동의)' : ' (미동의)') + '</option>'
          );
        })
        .join('') +
      '</select></div>' +
      '<div class="field"><label class="field__label" for="pushChannel">채널</label>' +
      '<select class="input select" id="pushChannel"><option value="notice">공지사항 (소유자 페이지)</option><option value="push">PUSH (이메일)</option></select></div>' +
      '<div class="adm-aud" id="pushAudience"></div>' +
      '<div class="field"><label class="field__label" for="pushWhen">발송 시점</label>' +
      '<select class="input select" id="pushWhen"><option value="now">즉시 발송</option><option value="later">예약 발송</option></select>' +
      '<input class="input" id="pushAt" type="datetime-local" hidden /></div>' +
      '<div class="field"><label class="field__label" for="pushTitle">제목</label><input class="input" id="pushTitle" maxlength="60" /></div>' +
      '<div class="field"><label class="field__label" for="pushBody">내용</label><textarea class="textarea" id="pushBody" rows="3" maxlength="300"></textarea></div>';

    var m = Pum.modal({
      title: 'PUSH · 공지 발송',
      body: body,
      actions: [
        { label: '취소', kind: 'ghost' },
        {
          label: '등록 · 발송',
          kind: 'primary',
          onClick: function (api) {
            var type = api.body.querySelector('#pushType').value === 'ad' ? 'ad' : 'notice';
            var target = api.body.querySelector('#pushTarget').value;
            var channelEl = api.body.querySelector('#pushChannel');
            var channel = channelEl.value === 'push' ? 'push' : 'notice';
            var when = api.body.querySelector('#pushWhen').value === 'later' ? 'later' : 'now';
            var whenValue = api.body.querySelector('#pushAt').value;
            var title = api.body.querySelector('#pushTitle').value.trim();
            var text = api.body.querySelector('#pushBody').value.trim();
            var whoId = target === 'individual' ? api.body.querySelector('#pushWho').value : '';
            var aud = pushAudience(type, target, whoId);

            if (!title || !text) {
              Pum.toast('제목과 내용을 입력해 주세요', 'err');
              return false;
            }
            if (!aud.targets.length) {
              Pum.toast(type === 'ad' ? '마케팅 수신 동의한 회원이 없습니다. 일반/공지 PUSH로 보내 주세요' : '발송 대상이 없습니다', 'err');
              return false;
            }
            if (when === 'later') {
              if (!whenValue) {
                Pum.toast('예약 발송 일시를 선택해 주세요', 'err');
                return false;
              }
              if (new Date(whenValue).getTime() <= Date.now()) {
                Pum.toast('예약 시각은 지금보다 이후로 정해 주세요', 'err');
                return false;
              }
            }
            /* 광고성 정보 표시 의무 — (광고) 표시와 수신 거부 안내를 자동으로 붙입니다. */
            if (type === 'ad') {
              if (title.indexOf('(광고)') !== 0) title = '(광고) ' + title;
              if (text.indexOf('수신 거부') < 0 && text.indexOf('수신거부') < 0) {
                text += '\n(광고) 수신을 원하지 않으시면 [설정 > 알림]에서 수신 거부할 수 있습니다.';
              }
            }

            var baseLabel =
              target === 'new'
                ? '신규 가입 회원'
                : target === 'individual'
                  ? aud.targets[0].name + ' (' + (aud.targets[0].email || '') + ')'
                  : '전체 회원';
            var targetLabel =
              type === 'ad'
                ? target === 'all'
                  ? '마케팅 수신 동의 회원'
                  : baseLabel + ' 중 마케팅 동의'
                : baseLabel;
            var now = stamp();
            var schedAt = when === 'later' ? whenValue.replace('T', ' ') : '';
            var historyId = 'ph-' + Date.now().toString(36);
            var notifId = 'n-' + Date.now().toString(36);

            Pum.update(function (st) {
              st.admin.pushHistory = st.admin.pushHistory || [];
              st.admin.pushHistory.unshift({
                id: historyId,
                at: now,
                status: when === 'later' ? 'scheduled' : 'sent',
                type: type,
                channel: channel,
                target: target,
                targetLabel: targetLabel,
                title: title,
                body: text,
                scheduledAt: schedAt,
                sentAt: when === 'later' ? '' : now,
                notifId: notifId,
                recipients: aud.targets.map(function (mm) {
                  return {
                    id: mm.id,
                    name: mm.name || '',
                    email: mm.email || mm.loginId || '',
                    consent: consentOn(mm),
                    status: when === 'later' ? 'pending' : 'success',
                    failReason: '',
                    ack: 'unread',
                    ackAt: ''
                  };
                }),
                excludedList: aud.excluded
              });
              st.admin.notifications.unshift({
                id: notifId,
                historyId: historyId,
                at: now,
                target: target,
                targetLabel: targetLabel,
                targetEmail: target === 'individual' ? aud.targets[0].email || '' : '',
                targetSlug: target === 'individual' ? aud.targets[0].slug || '' : '',
                title: title,
                body: text,
                channel: channel,
                status: when === 'later' ? 'scheduled' : 'sent',
                sentAt: when === 'later' ? '' : now,
                scheduledAt: schedAt,
                pushType: type
              });
              Pum.logAudit(
                (when === 'later' ? '예약 ' : '') + (type === 'ad' ? '광고성 ' : '') +
                (channel === 'push' ? 'PUSH' : '공지') + ' 발송: ' + title + ' → ' + targetLabel +
                ' (대상 ' + aud.targets.length + '건' + (aud.excluded.length ? ', 제외 ' + aud.excluded.length + '건' : '') + ')'
              );
              st.admin.mailLog = st.admin.mailLog || [];
              st.admin.mailLog.unshift({
                id: 'ml-' + Date.now().toString(36),
                at: now,
                to: targetLabel,
                subject: '[품 ' + (channel === 'push' ? 'PUSH' : '공지') + '] ' + title,
                body: text,
                kind: channel === 'push' ? 'push' : 'mail'
              });
            });
            Pum.toast(
              when === 'later'
                ? '예약 발송으로 등록했습니다 · ' + schedAt + ' (대상 ' + aud.targets.length + '건)'
                : '발송했습니다 (데모 · 대상 ' + aud.targets.length + '건)'
            );
            renderTab(app);
          }
        }
      ]
    });

    if (!m) return;
    var typeEl = m.body.querySelector('#pushType');
    var targetEl = m.body.querySelector('#pushTarget');
    var whoWrap = m.body.querySelector('#pushWhoWrap');
    var whoEl = m.body.querySelector('#pushWho');
    var channelEl = m.body.querySelector('#pushChannel');
    var whenEl = m.body.querySelector('#pushWhen');
    var atEl = m.body.querySelector('#pushAt');
    atEl.min = localInputValue(new Date(Date.now() + 5 * 60 * 1000));

    function refresh() {
      var type = typeEl.value === 'ad' ? 'ad' : 'notice';
      var target = targetEl.value;
      whoWrap.hidden = target !== 'individual';
      var aud = pushAudience(type, target, whoEl ? whoEl.value : '');
      m.body.querySelector('#pushAudience').innerHTML = audienceHTML(aud, type);
      m.body.querySelector('#pushTypeHint').textContent =
        type === 'ad'
          ? '광고성은 마케팅 수신 동의 회원에게만 발송됩니다. 제목에 “(광고)” 표시와 본문에 수신 거부 안내가 자동으로 붙습니다.'
          : '공지·안내는 마케팅 수신 동의와 관계없이 전체 회원에게 발송됩니다.';
      if (type === 'ad') channelEl.value = 'push';
      channelEl.disabled = type === 'ad';
      return aud;
    }

    typeEl.addEventListener('change', refresh);
    targetEl.addEventListener('change', refresh);
    if (whoEl) whoEl.addEventListener('change', refresh);
    whenEl.addEventListener('change', function () {
      var later = this.value === 'later';
      atEl.hidden = !later;
      if (later) {
        /* 예약 발송을 고르면 내일 09:00으로 채워 두고 바로 고칠 수 있게 합니다. */
        if (!atEl.value) {
          var d = new Date();
          d.setDate(d.getDate() + 1);
          d.setHours(9, 0, 0, 0);
          atEl.value = localInputValue(d);
        }
        atEl.focus();
      }
    });
    refresh();
  }

  /** 예약 PUSH 즉시 실행 — 이력과 연결된 공지사항을 함께 발송 처리 */
  function executePush(id, app) {
    var h = findPush(id);
    if (!h) return;
    if (h.status !== 'scheduled') {
      Pum.toast('이미 처리된 발송입니다');
      return;
    }
    var sendAt = stamp();
    Pum.update(function (st) {
      var t = (st.admin.pushHistory || []).filter(function (x) {
        return x.id === id;
      })[0];
      if (!t) return;
      t.status = 'sent';
      t.sentAt = sendAt;
      (t.recipients || []).forEach(function (r) {
        if (r.status === 'pending') {
          r.status = 'success';
          r.ack = 'unread';
          r.ackAt = '';
        }
      });
      (st.admin.notifications || []).forEach(function (n) {
        if (n.id === t.notifId || n.historyId === t.id) {
          n.status = 'sent';
          n.sentAt = sendAt;
        }
      });
      Pum.logAudit('예약 ' + (t.type === 'ad' ? '광고성 ' : '') + 'PUSH 즉시 발송: ' + t.title + ' (대상 ' + (t.recipients || []).length + '건)');
      st.admin.mailLog = st.admin.mailLog || [];
      st.admin.mailLog.unshift({
        id: 'ml-' + Date.now().toString(36),
        at: sendAt,
        to: t.targetLabel || '전체 회원',
        subject: '[품 PUSH] ' + t.title,
        body: '예약 발송을 즉시 실행했습니다. 대상 ' + (t.recipients || []).length + '건',
        kind: 'push'
      });
    });
    Pum.toast('예약 PUSH를 즉시 발송했습니다 (데모)');
    renderTab(app || document.getElementById('app'));
  }

  /** 예약 PUSH 취소 — 연결된 예약 공지도 함께 정리 */
  function cancelPush(id, app) {
    var h = findPush(id);
    if (!h) return;
    if (h.status !== 'scheduled') {
      Pum.toast('이미 처리된 발송입니다');
      return;
    }
    Pum.confirm('예약 발송을 취소할까요?\n' + h.title + ' · 예정 ' + (h.scheduledAt || ''), {
      okLabel: '예약 취소',
      danger: true
    }).then(function (ok) {
      if (!ok) return;
      var canceledAt = stamp();
      Pum.update(function (st) {
        var t = (st.admin.pushHistory || []).filter(function (x) {
          return x.id === id;
        })[0];
        if (!t || t.status !== 'scheduled') return;
        t.status = 'canceled';
        t.canceledAt = canceledAt;
        st.admin.notifications = (st.admin.notifications || []).filter(function (n) {
          if (n.id !== t.notifId && n.historyId !== t.id) return true;
          return n.status === 'sent';
        });
        Pum.logAudit('예약 PUSH 취소: ' + t.title + ' (예정 ' + (t.scheduledAt || '') + ')');
      });
      Pum.toast('예약 발송을 취소했습니다');
      renderTab(app || document.getElementById('app'));
    });
  }

  /** 발송 상세 — 수신자별 성공/실패·수신 확인(ACK)·확인 시각 */
  function pushDetailModal(id, app) {
    var h = findPush(id);
    if (!h) return;
    var st = pushStats(h);
    var recRows = (h.recipients || [])
      .map(function (r) {
        return (
          '<tr>' +
          '<td><b>' + esc(r.name || '-') + '</b><div class="adm-muted" style="font-size:11px">' + esc(r.email || '') + '</div></td>' +
          '<td>' + (r.consent ? '<span class="adm-pill adm-pill--ok">동의</span>' : '<span class="adm-pill adm-pill--stop">미동의</span>') + '</td>' +
          '<td>' +
          (r.status === 'success'
            ? '<span class="adm-pill adm-pill--ok">성공</span>'
            : r.status === 'fail'
              ? '<span class="adm-pill adm-pill--stop">실패</span>'
              : '<span class="adm-pill adm-pill--wait">대기</span>') +
          (r.failReason ? '<div class="adm-muted" style="font-size:11px">' + esc(r.failReason) + '</div>' : '') +
          '</td>' +
          '<td>' + (r.ack === 'read' ? '<span class="adm-pill adm-pill--ok">수신확인</span>' : '<span class="adm-muted">미확인</span>') + '</td>' +
          '<td class="adm-muted">' + esc(r.ackAt || '-') + '</td>' +
          '</tr>'
        );
      })
      .join('');
    var excludedHTML = (h.excludedList || [])
      .map(function (e) {
        return '<li><span>' + esc(e.name || '-') + '</span><b>' + esc(e.reason || '제외') + ' · ' + esc(e.email || '') + '</b></li>';
      })
      .join('');

    var body =
      '<ul class="adm-kv">' +
      '<li><span>발송 일시</span><b>' + pushWhenText(h) + '</b></li>' +
      '<li><span>유형</span><b>' + pushTypeLabel(h.type) + ' · ' + (h.channel === 'push' ? 'PUSH' : '공지') + '</b></li>' +
      '<li><span>대상</span><b>' + esc(h.targetLabel || '전체 회원') + '</b></li>' +
      '<li><span>발송 건수</span><b>' + num(st.total) + '건</b></li>' +
      '<li><span>성공 / 실패</span><b>' + num(st.success) + ' / ' + num(st.fail) + '</b></li>' +
      '<li><span>수신 확인</span><b>' + num(st.read) + '건 (수신율 ' + st.rate + '%)</b></li>' +
      (st.excluded ? '<li><span>발송 제외</span><b>' + num(st.excluded) + '건</b></li>' : '') +
      '<li><span>상태</span><b>' + pushStatusPill(h) + '</b></li>' +
      '</ul>' +
      '<h3 class="adm-subtitle">제목 · 내용</h3>' +
      '<div class="adm-inquiry"><b>' + esc(h.title) + '</b><br/>' + esc(h.body || '') + '</div>' +
      '<h3 class="adm-subtitle">수신자별 발송 · 수신 결과</h3>' +
      '<div class="adm-table-wrap adm-recip"><table class="adm-table">' +
      '<thead><tr><th>수신자</th><th>마케팅 동의</th><th>발송 결과</th><th>수신 확인</th><th>확인 시각</th></tr></thead><tbody>' +
      (recRows || '<tr><td colspan="5" class="adm-muted">수신자가 없습니다.</td></tr>') +
      '</tbody></table></div>' +
      (excludedHTML
        ? '<h3 class="adm-subtitle">발송 제외 대상</h3><ul class="adm-kv">' + excludedHTML + '</ul>' +
          '<p class="adm-hint">광고성 PUSH는 마케팅 수신 미동의 회원을 대상에서 제외합니다.</p>'
        : '');

    var actions = [{ label: '닫기', kind: 'ghost' }];
    if (h.status === 'scheduled') {
      actions.push({
        label: '예약 취소',
        kind: 'ghost',
        onClick: function () {
          setTimeout(function () {
            cancelPush(h.id, app);
          }, 80);
        }
      });
      actions.push({
        label: '즉시 실행',
        kind: 'primary',
        onClick: function () {
          setTimeout(function () {
            executePush(h.id, app);
          }, 80);
        }
      });
    } else if (h.status === 'sent' && st.read < st.success) {
      actions.push({
        label: '수신 확인 시뮬레이션 (데모)',
        kind: 'primary',
        onClick: function () {
          var when = stamp();
          Pum.update(function (state) {
            var t = (state.admin.pushHistory || []).filter(function (x) {
              return x.id === id;
            })[0];
            if (!t) return;
            (t.recipients || []).forEach(function (r) {
              if (r.status === 'success' && r.ack !== 'read') {
                r.ack = 'read';
                r.ackAt = when;
              }
            });
          });
          Pum.toast('수신 확인을 반영했습니다 (데모)');
          if (app) renderTab(app);
          setTimeout(function () {
            pushDetailModal(id, app);
          }, 80);
        }
      });
    }

    Pum.modal({
      title: 'PUSH 발송 상세',
      desc: h.status === 'scheduled' ? '예약 대기 · ' + (h.scheduledAt || '') : h.title + ' · ' + (h.at || ''),
      wide: true,
      body: body,
      actions: actions
    });
  }

  /* ------------------------------------------------------ 품스 콘텐츠 연동 */
  var APP_LABEL = ['자동차 다이렉트 견적', '개인 답례품·행사/판촉', '해외여행자 보험', '모바일 IT솔루션', '모바일 상품권', '디자인·인쇄', '자동차 리스/렌탈', '보험금 보상 상담'];

  var EXTRA1_TYPES = ['basic', 'nonlife', 'life', 'personal', 'corporate'];

  function gid(prefix) {
    return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  }

  function collapseBtn(key, collapsed) {
    return (
      '<button type="button" class="adm-collapse' + (collapsed ? ' is-collapsed' : '') + '" data-collapse="' + esc(key) + '"' +
      ' aria-expanded="' + (collapsed ? 'false' : 'true') + '" aria-label="' + (collapsed ? '펼치기' : '접기') + '">' +
      icon('chevron') + '</button>'
    );
  }

  function pumssHTML() {
    var ad = AD();
    var items = ad.pumss.items;
    var synced = ad.pumss.syncedAt;
    var api = ad.pumss.api || { collapsed: false };
    var extra1 = ad.pumss.extra1 || { on: true, collapsed: false };
    var groups = ad.pumss.customGroups || [];

    function onBadge(on) {
      return '<span class="adm-prow__state' + (on ? ' is-on' : '') + '">' + (on ? '노출' : 'OFF') + '</span>';
    }

    function rowToggle(key, label, extra) {
      var it = items[key] || { on: true };
      var on = it.on !== false;
      return (
        '<div class="adm-prow" data-prow="' + esc(key) + '">' +
        '<div class="adm-prow__top">' +
        '<div class="adm-prow__name">' + esc(label) + '</div>' +
        '<div class="adm-prow__ctrl">' +
        onBadge(on) +
        '<label class="switch switch--sm"><input type="checkbox" data-pumss-on="' + key + '"' + (on ? ' checked' : '') + ' aria-label="' + esc(label) + ' 노출" /><span class="switch__track"></span></label>' +
        '</div></div>' +
        (extra || '') +
        '</div>'
      );
    }

    /* 5개 블록의 한 줄 — 누르면 텍스트·링크를 고칠 수 있는 입력 영역이 열립니다. */
    function groupItemRow(key, i, title) {
      var gi = ((items[key] || {}).items || [])[i] || {};
      var shown = (gi.title || '').trim() || title;
      var url = (gi.url || '').trim();
      var on = gi.on !== false;
      var k = key + ':' + i;
      return (
        '<div class="adm-itemwrap">' +
        '<div class="adm-itemrow adm-itemrow--edit" role="button" tabindex="0" data-item-edit="' + k + '" aria-expanded="false">' +
        '<span class="adm-itemrow__num">' + (i + 1) + '</span>' +
        '<span class="adm-itemrow__label">' + esc(shown) +
        (url ? '<small>' + esc(url.replace(/^https?:\/\//, '')) + '</small>' : '<small class="is-empty">링크 없음</small>') +
        '</span>' +
        '<label class="switch switch--sm"><input type="checkbox" data-groupitem-on="' + k + '"' + (on ? ' checked' : '') + ' aria-label="' + esc(shown) + ' 노출" /><span class="switch__track"></span></label>' +
        '<span class="adm-itemrow__pen">' + icon('edit') + '</span>' +
        '</div>' +
        '<div class="adm-itemedit" hidden>' +
        '<div class="adm-grid2">' +
        '<div><label class="field__label">항목 텍스트</label><input class="input adm-input--sm" data-item-title="' + k + '" value="' + esc(gi.title || '') + '" placeholder="' + esc(title) + '" /></div>' +
        '<div><label class="field__label">링크(URL)</label><input class="input adm-input--sm" data-item-url="' + k + '" value="' + esc(gi.url || '') + '" placeholder="https://" inputmode="url" /></div>' +
        '</div>' +
        '<div class="adm-row-end adm-itemedit__actions">' +
        '<button type="button" class="adm-btn adm-btn--sm adm-btn--ghost" data-item-cancel="' + k + '">닫기</button>' +
        '<button type="button" class="adm-btn adm-btn--sm adm-btn--primary" data-item-save="' + k + '">저장</button>' +
        '</div></div></div>'
      );
    }

    function itemsEditor(key, sec, secItem) {
      return (
        '<label class="field__label">섹션 제목</label>' +
        '<input class="input" data-pumss-title="' + key + '" value="' + esc(secItem.title || '') + '" placeholder="기본값: ' + esc(sec.label) + '" />' +
        '<div class="adm-apps">' +
        sec.items
          .map(function (title, i) {
            return groupItemRow(key, i, title);
          })
          .join('') +
        '</div>'
      );
    }

    function customGroupHTML(g, index) {
      var key = 'cg:' + g.id;
      var on = g.on !== false;
      var list = g.items || [];
      return (
        '<section class="adm-card adm-group" data-cg="' + esc(g.id) + '">' +
        '<div class="adm-group__head">' +
        '<div class="adm-group__title"><b>' + esc(g.name || '추가 영역 ' + (index + 2)) + '</b>' +
        '<span class="adm-muted">' + list.length + '개 하위 항목</span></div>' +
        '<div class="adm-group__ctrl">' +
        onBadge(on) +
        '<label class="switch switch--sm"><input type="checkbox" data-cg-on="' + esc(g.id) + '"' + (on ? ' checked' : '') + ' aria-label="' + esc(g.name || '추가 영역') + ' 노출" /><span class="switch__track"></span></label>' +
        '<button type="button" class="adm-btn adm-btn--icon adm-btn--sm adm-btn--ghost" data-cg-del="' + esc(g.id) + '" aria-label="' + esc(g.name || '추가 영역') + ' 삭제" title="영역 삭제">' + icon('trash') + '</button>' +
        collapseBtn(key, g.collapsed) +
        '</div></div>' +
        '<div class="adm-group__body' + (g.collapsed ? ' is-collapsed' : '') + '" data-cg-body="' + esc(g.id) + '">' +
        '<div class="adm-group__bodyin">' +
        '<label class="field__label">섹션 제목</label>' +
        '<input class="input" data-cg-title="' + esc(g.id) + '" value="' + esc(g.title || '') + '" placeholder="사용자 화면에 표시될 섹션 제목" />' +
        '<div class="adm-cglist">' +
        (list.length
          ? list
              .map(function (it, i) {
                var k = g.id + '|' + it.id;
                return (
                  '<div class="adm-cgrow">' +
                  '<span class="adm-itemrow__num">' + (i + 1) + '</span>' +
                  '<div class="adm-cgrow__fields">' +
                  '<input class="input adm-input--sm" data-cg-item-title="' + esc(k) + '" value="' + esc(it.title || '') + '" placeholder="하위명" aria-label="' + (i + 1) + '번 하위명" />' +
                  '<input class="input adm-input--sm" data-cg-item-url="' + esc(k) + '" value="' + esc(it.url || '') + '" placeholder="링크 입력 (https://)" inputmode="url" aria-label="' + (i + 1) + '번 링크" />' +
                  '</div>' +
                  '<label class="switch switch--sm"><input type="checkbox" data-cg-item-on="' + esc(k) + '"' + (it.on !== false ? ' checked' : '') + ' aria-label="하위 항목 노출" /><span class="switch__track"></span></label>' +
                  '<button type="button" class="adm-btn adm-btn--icon adm-btn--sm adm-btn--ghost" data-cg-item-del="' + esc(k) + '" aria-label="하위 항목 삭제">' + icon('trash') + '</button>' +
                  '</div>'
                );
              })
              .join('')
          : '<p class="adm-hint">하위 항목이 없습니다. 아래 <b>+ 하위 추가</b>를 눌러 만드세요.</p>') +
        '</div>' +
        '<div class="adm-row-end"><button type="button" class="adm-btn adm-btn--sm adm-btn--ghost" data-cg-add-item="' + esc(g.id) + '">' + icon('plus') + '하위 추가</button></div>' +
        '</div></div></section>'
      );
    }

    return (
      head('품스 콘텐츠 연동', 'pumss.co.kr 콘텐츠의 전역 노출과 문구를 관리합니다. 변경은 사용자 품에 즉시 반영됩니다.') +

      /* ② 기본 연동상태 — 펼침/접힘 */
      '<section class="adm-card adm-group">' +
      '<div class="adm-card__head adm-card__head--wrap">' +
      '<h2 class="adm-title-sm">기본 연동 상태</h2>' +
      '<div class="adm-pumss-tools">' +
      '<button type="button" class="adm-btn adm-btn--primary adm-btn--sm" id="admPumssAdd">' + icon('plus') + '신규 연동 추가</button>' +
      '<span class="adm-pumss-updated">최근 갱신 <b id="admSyncAt">' + esc(stampPretty(synced)) + '</b></span>' +
      collapseBtn('api', api.collapsed) +
      '</div>' +
      '</div>' +
      '<div class="adm-card__body adm-prow-list' + (api.collapsed ? ' is-collapsed' : '') + '" data-body="api">' +
      '<div class="adm-sync"><span>품스 API 동기화</span>' +
      '<button type="button" class="adm-btn adm-btn--primary adm-btn--sm" id="admPumssSync">지금 동기화</button></div>' +
      rowToggle('greeting', '반갑데이',
        '<label class="field__label">섹션 제목</label><input class="input" data-pumss-title="greeting" value="' + esc(items.greeting.title || '') + '" placeholder="기본값: 반갑데이" />') +
      rowToggle('news', '일일뉴스',
        '<label class="field__label">섹션 제목</label><input class="input" data-pumss-title="news" value="' + esc(items.news.title || '') + '" placeholder="기본값: 헤드라인 NEWS" />') +
      rowToggle('quote', '오늘의 명언',
        '<div class="adm-grid2">' +
        '<div><label class="field__label">명언 문구</label><input class="input" data-pumss-text="quote" value="' + esc(items.quote.text || '') + '" placeholder="기본값: 각 품에 저장된 명언" /></div>' +
        '<div><label class="field__label">지은이</label><input class="input" data-pumss-author="quote" value="' + esc(items.quote.author || '') + '" placeholder="기본값: 각 품에 저장된 지은이" /></div>' +
        '</div>') +
      rowToggle('recs', '추천 컨텐츠',
        '<label class="field__label">섹션 제목</label><input class="input" data-pumss-title="recs" value="' + esc(items.recs.title || '') + '" placeholder="기본값: 추천 컨텐츠" />') +
      rowToggle('apptech', '앱테크 (8종)',
        '<label class="field__label">섹션 제목</label><input class="input" data-pumss-title="apptech" value="' + esc(items.apptech.title || '') + '" placeholder="기본값: 앱테크" />' +
        '<div class="adm-apps">' +
        (items.apptech.items || []).map(function (it, i) {
          return '<div class="adm-approw">' +
            '<div class="adm-approw__label">' + esc(APP_LABEL[i] || '앱테크 ' + (i + 1)) + '</div>' +
            '<label class="switch switch--sm"><input type="checkbox" data-apptech-on="' + i + '"' + (it.on !== false ? ' checked' : '') + ' aria-label="' + esc(APP_LABEL[i] || '') + ' 노출" /><span class="switch__track"></span></label>' +
            '<input class="input adm-input--sm" data-apptech-title="' + i + '" value="' + esc(it.title || '') + '" placeholder="제목 수정" />' +
            '<input class="input adm-input--sm" data-apptech-desc="' + i + '" value="' + esc(it.desc || '') + '" placeholder="문구 수정" />' +
            '</div>';
        }).join('') +
        '</div>') +
      '</div></section>' +

      /* ③ 공통 기본 ~ 법인영업 = 추가 영역 1 (품스 API 연동과 영역 분리) */
      '<section class="adm-card adm-group">' +
      '<div class="adm-group__head">' +
      '<div class="adm-group__title"><b>추가 영역 1</b><span class="adm-muted">공통 기본 · 손해보험 · 생명보험 · 개인영업 · 법인영업</span></div>' +
      '<div class="adm-group__ctrl">' +
      onBadge(extra1.on !== false) +
      '<label class="switch switch--sm"><input type="checkbox" data-extra1-on="1"' + (extra1.on !== false ? ' checked' : '') + ' aria-label="추가 영역 1 노출" /><span class="switch__track"></span></label>' +
      collapseBtn('extra1', extra1.collapsed) +
      '</div></div>' +
      '<div class="adm-group__body' + (extra1.collapsed ? ' is-collapsed' : '') + '" data-body="extra1">' +
      '<div class="adm-group__bodyin adm-prow-list">' +
      Pum.PUMSS_SECTIONS.map(function (sec) {
        var secItem = items[sec.type] || { on: true, title: '', items: [] };
        return rowToggle(sec.type, sec.label + ' (' + sec.items.length + '종)', itemsEditor(sec.type, sec, secItem));
      }).join('') +
      '</div></div></section>' +

      /* ④ 신규 연동으로 만든 추가 영역 2, 3 ... */
      (groups.length
        ? groups.map(customGroupHTML).join('')
        : '<section class="adm-card adm-empty"><div class="adm-card__body">' +
          '<p class="adm-hint" style="margin:0">아직 추가 연동 영역이 없습니다. <b>+ 신규 연동 추가</b>를 누르면 <b>추가 영역 2</b>가 만들어지고, 섹션 제목과 하위 항목(이름·링크)을 직접 채울 수 있습니다.</p>' +
          '</div></section>')
    );
  }

  function bindPumss(app) {
    var main = app.querySelector('#adminMain');

    function labelOf(key) {
      var sec = Pum.pumssSectionOf(key);
      if (sec) return sec.label;
      return { greeting: '반갑데이', news: '일일뉴스', quote: '오늘의 명언', recs: '추천 컨텐츠', apptech: '앱테크' }[key] || key;
    }
    function findGroup(state, id) {
      return (state.admin.pumss.customGroups || []).filter(function (g) {
        return g.id === id;
      })[0];
    }

    /* ---- 접기 / 펼치기 (입력값을 잃지 않도록 화면만 접습니다) ---- */
    main.querySelectorAll('[data-collapse]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-collapse');
        var collapsed = !btn.classList.contains('is-collapsed');
        btn.classList.toggle('is-collapsed', collapsed);
        btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        btn.setAttribute('aria-label', collapsed ? '펼치기' : '접기');
        var target = null;
        if (key === 'api') target = main.querySelector('[data-body="api"]');
        else if (key === 'extra1') target = main.querySelector('[data-body="extra1"]');
        else target = main.querySelector('[data-cg-body="' + key.replace(/^cg:/, '') + '"]');
        if (target) target.classList.toggle('is-collapsed', collapsed);
        Pum.update(function (st) {
          var p = st.admin.pumss;
          if (key === 'api') p.api = Object.assign({ collapsed: false }, p.api, { collapsed: collapsed });
          else if (key === 'extra1') p.extra1 = Object.assign({ on: true, collapsed: false }, p.extra1, { collapsed: collapsed });
          else {
            var g = findGroup(st, key.replace(/^cg:/, ''));
            if (g) g.collapsed = collapsed;
          }
        }, { silent: true });
      });
    });

    /* ---- 품스 API 동기화 ---- */
    var syncBtn = main.querySelector('#admPumssSync');
    if (syncBtn) {
      syncBtn.addEventListener('click', function () {
        Pum.update(function (st) {
          st.admin.pumss.syncedAt = new Date().toISOString();
          Pum.logAudit('품스 API 동기화 (' + Object.keys(st.admin.pumss.items).length + '개 콘텐츠)');
        });
        var at = main.querySelector('#admSyncAt');
        if (at) at.textContent = stampPretty(AD().pumss.syncedAt);
        Pum.toast('품스 콘텐츠를 동기화했습니다');
      });
    }

    /* ---- 신규 연동 추가 → 추가 영역 2, 3 ... ---- */
    var addBtn = main.querySelector('#admPumssAdd');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        var created = null;
        Pum.update(function (st) {
          var list = st.admin.pumss.customGroups || (st.admin.pumss.customGroups = []);
          var name = '추가 영역 ' + (list.length + 2);
          created = {
            id: gid('cg'),
            name: name,
            title: '',
            on: true,
            collapsed: false,
            items: [{ id: gid('ci'), title: '', url: '', on: true }]
          };
          list.push(created);
          Pum.logAudit('품스 콘텐츠 ' + name + ' 신규 추가');
        });
        Pum.toast((created ? created.name : '추가 영역') + '를 만들었습니다. 섹션 제목과 하위 항목을 채워 주세요.');
        renderTab(app);
        var card = main.querySelector('[data-cg="' + (created && created.id) + '"]');
        if (card) {
          card.scrollIntoView({ block: 'center', behavior: 'smooth' });
          var inp = card.querySelector('[data-cg-title]');
          if (inp) setTimeout(function () { inp.focus(); }, 120);
        }
      });
    }

    /* ---- 블록(콘텐츠) 노출 ON/OFF ---- */
    main.querySelectorAll('[data-pumss-on]').forEach(function (el) {
      el.addEventListener('change', function () {
        var key = el.getAttribute('data-pumss-on');
        var on = el.checked;
        Pum.update(function (st) {
          if (!st.admin.pumss.items[key]) st.admin.pumss.items[key] = { on: true, title: '' };
          st.admin.pumss.items[key].on = on;
          Pum.logAudit('품스 콘텐츠 ' + key + ' ' + (on ? '노출 ON' : '노출 OFF'));
        });
        var row = el.closest('.adm-prow');
        var badge = row ? row.querySelector('.adm-prow__state') : null;
        if (badge) {
          badge.textContent = on ? '노출' : 'OFF';
          badge.classList.toggle('is-on', on);
        }
        Pum.toast((on ? '노출합니다: ' : '숨겼습니다: ') + labelOf(key));
      });
    });

    /* ---- 추가 영역 1 전체 노출 ON/OFF ---- */
    var e1 = main.querySelector('[data-extra1-on]');
    if (e1) {
      e1.addEventListener('change', function () {
        var on = e1.checked;
        Pum.update(function (st) {
          st.admin.pumss.extra1 = Object.assign({ on: true, collapsed: false }, st.admin.pumss.extra1, { on: on });
          Pum.logAudit('추가 영역 1(공통 기본~법인영업) ' + (on ? '노출 ON' : '노출 OFF'));
        });
        var badge = e1.closest('.adm-group__ctrl').querySelector('.adm-prow__state');
        if (badge) {
          badge.textContent = on ? '노출' : 'OFF';
          badge.classList.toggle('is-on', on);
        }
        Pum.toast('추가 영역 1을 ' + (on ? '노출합니다' : '숨겼습니다'));
      });
    }

    /* ---- 섹션 제목 · 문구 저장 ---- */
    function saveText(field, key, prop) {
      var el = main.querySelector('[data-pumss-' + field + '="' + key + '"]');
      if (!el) return;
      var value = el.value.trim();
      Pum.update(function (st) {
        st.admin.pumss.items[key][prop] = value;
        Pum.logAudit('품스 ' + key + ' ' + prop + ' 수정');
      });
      Pum.toast('저장했습니다');
    }

    ['greeting', 'news', 'recs', 'apptech']
      .concat(
        Pum.PUMSS_SECTIONS.map(function (s) {
          return s.type;
        })
      )
      .forEach(function (key) {
        var el = main.querySelector('[data-pumss-title="' + key + '"]');
        if (el) el.addEventListener('change', function () { saveText('title', key, 'title'); });
      });
    var qt = main.querySelector('[data-pumss-text="quote"]');
    if (qt) qt.addEventListener('change', function () { saveText('text', 'quote', 'text'); });
    var qa = main.querySelector('[data-pumss-author="quote"]');
    if (qa) qa.addEventListener('change', function () { saveText('author', 'quote', 'author'); });

    /* ---- 앱테크 ---- */
    main.querySelectorAll('[data-apptech-on]').forEach(function (el) {
      el.addEventListener('change', function () {
        var i = Number(el.getAttribute('data-apptech-on'));
        var on = el.checked;
        Pum.update(function (st) {
          st.admin.pumss.items.apptech.items[i].on = on;
          Pum.logAudit('앱테크 ' + (APP_LABEL[i] || i + 1) + ' ' + (on ? '노출 ON' : '노출 OFF'));
        });
        Pum.toast((APP_LABEL[i] || '앱테크') + (on ? ' 노출' : ' 숨김'));
      });
    });

    ['title', 'desc'].forEach(function (prop) {
      main.querySelectorAll('[data-apptech-' + prop + ']').forEach(function (el) {
        el.addEventListener('change', function () {
          var i = Number(el.getAttribute('data-apptech-' + prop));
          var value = el.value.trim();
          Pum.update(function (st) {
            st.admin.pumss.items.apptech.items[i][prop] = value;
            Pum.logAudit('앱테크 ' + (APP_LABEL[i] || i + 1) + ' ' + prop + ' 수정');
          });
        });
      });
    });

    /* ---- 추가 영역 1 · 2+ 하위 항목 노출 ON/OFF ---- */
    main.querySelectorAll('[data-groupitem-on]').forEach(function (el) {
      el.addEventListener('change', function () {
        var parts = String(el.getAttribute('data-groupitem-on') || '').split(':');
        var key = parts[0];
        var i = Number(parts[1]);
        var on = el.checked;
        var sec = Pum.pumssSectionOf(key) || { items: [] };
        var title = sec.items[i] || key + ' ' + (i + 1);
        Pum.update(function (st) {
          var item = st.admin.pumss.items[key];
          if (!item) return;
          if (!Array.isArray(item.items)) item.items = [];
          if (!item.items[i]) item.items[i] = { on: true, title: '', url: '' };
          item.items[i].on = on;
          Pum.logAudit((sec.label || key) + ' ' + title + ' ' + (on ? '노출 ON' : '노출 OFF'));
        });
        Pum.toast(title + (on ? ' 노출' : ' 숨김'));
      });
    });

    /* ---- 항목 터치 → 텍스트·링크 수정 ---- */
    main.querySelectorAll('.adm-itemrow--edit').forEach(function (row) {
      function open() {
        var wrap = row.closest('.adm-itemwrap');
        var panel = wrap ? wrap.querySelector('.adm-itemedit') : null;
        if (!panel) return;
        panel.hidden = !panel.hidden;
        row.setAttribute('aria-expanded', panel.hidden ? 'false' : 'true');
        row.classList.toggle('is-open', !panel.hidden);
        if (!panel.hidden) {
          var first = panel.querySelector('[data-item-title]');
          if (first) setTimeout(function () { first.focus(); }, 60);
        }
      }
      row.addEventListener('click', function (e) {
        if (e.target.closest('.switch') || e.target.closest('input')) return;
        open();
      });
      row.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      });
    });

    main.querySelectorAll('[data-item-cancel]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var k = btn.getAttribute('data-item-cancel');
        var wrap = main.querySelector('.adm-itemrow--edit[data-item-edit="' + k + '"]');
        var panel = wrap ? wrap.closest('.adm-itemwrap').querySelector('.adm-itemedit') : null;
        if (panel) panel.hidden = true;
        if (wrap) {
          wrap.classList.remove('is-open');
          wrap.setAttribute('aria-expanded', 'false');
        }
      });
    });

    main.querySelectorAll('[data-item-save]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var k = btn.getAttribute('data-item-save');
        var parts = k.split(':');
        var key = parts[0];
        var i = Number(parts[1]);
        var tEl = main.querySelector('[data-item-title="' + k + '"]');
        var uEl = main.querySelector('[data-item-url="' + k + '"]');
        var title = (tEl ? tEl.value : '').trim();
        var url = (uEl ? uEl.value : '').trim();
        if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url.replace(/^\/+/, '');
        var sec = Pum.pumssSectionOf(key) || { items: [] };
        Pum.update(function (st) {
          var item = st.admin.pumss.items[key];
          if (!item) return;
          if (!Array.isArray(item.items)) item.items = [];
          if (!item.items[i]) item.items[i] = { on: true, title: '', url: '' };
          item.items[i].title = title;
          item.items[i].url = url;
          Pum.logAudit((sec.label || key) + ' 항목 수정: ' + (title || sec.items[i] || ''));
        });
        var row = main.querySelector('.adm-itemrow--edit[data-item-edit="' + k + '"]');
        if (row) {
          var label = row.querySelector('.adm-itemrow__label');
          if (label) {
            label.innerHTML = esc(title || (sec.items[i] || '')) +
              (url ? '<small>' + esc(url.replace(/^https?:\/\//, '')) + '</small>' : '<small class="is-empty">링크 없음</small>');
          }
          var sw = row.querySelector('input[data-groupitem-on]');
          if (sw) sw.setAttribute('aria-label', (title || (sec.items[i] || '')) + ' 노출');
          var panel = row.closest('.adm-itemwrap').querySelector('.adm-itemedit');
          if (panel) panel.hidden = true;
          row.classList.remove('is-open');
          row.setAttribute('aria-expanded', 'false');
        }
        Pum.toast('항목을 저장했습니다. 미리보기·공유 페이지에 반영됩니다.');
      });
    });

    /* ---- 추가 영역 2+ : 제목 · 하위 항목 ---- */
    main.querySelectorAll('[data-cg-on]').forEach(function (el) {
      el.addEventListener('change', function () {
        var id = el.getAttribute('data-cg-on');
        var on = el.checked;
        Pum.update(function (st) {
          var g = findGroup(st, id);
          if (g) {
            g.on = on;
            Pum.logAudit(g.name + ' ' + (on ? '노출 ON' : '노출 OFF'));
          }
        });
        var badge = el.closest('.adm-group__ctrl').querySelector('.adm-prow__state');
        if (badge) {
          badge.textContent = on ? '노출' : 'OFF';
          badge.classList.toggle('is-on', on);
        }
        Pum.toast('영역을 ' + (on ? '노출합니다' : '숨겼습니다'));
      });
    });

    main.querySelectorAll('[data-cg-title]').forEach(function (el) {
      el.addEventListener('change', function () {
        var id = el.getAttribute('data-cg-title');
        var value = el.value.trim();
        Pum.update(function (st) {
          var g = findGroup(st, id);
          if (g) {
            g.title = value;
            Pum.logAudit(g.name + ' 섹션 제목 수정: ' + (value || '(비움)'));
          }
        });
        Pum.toast('섹션 제목을 저장했습니다');
      });
    });

    main.querySelectorAll('[data-cg-item-title], [data-cg-item-url]').forEach(function (el) {
      el.addEventListener('change', function () {
        var isTitle = el.hasAttribute('data-cg-item-title');
        var k = el.getAttribute(isTitle ? 'data-cg-item-title' : 'data-cg-item-url');
        var parts = k.split('|');
        var value = el.value.trim();
        if (!isTitle && value && !/^https?:\/\//i.test(value)) value = 'https://' + value.replace(/^\/+/, '');
        Pum.update(function (st) {
          var g = findGroup(st, parts[0]);
          if (!g) return;
          var it = (g.items || []).filter(function (x) {
            return x.id === parts[1];
          })[0];
          if (!it) return;
          it[isTitle ? 'title' : 'url'] = value;
          Pum.logAudit(g.name + ' 하위 항목 ' + (isTitle ? '이름' : '링크') + ' 수정');
        });
      });
    });

    main.querySelectorAll('[data-cg-item-on]').forEach(function (el) {
      el.addEventListener('change', function () {
        var parts = String(el.getAttribute('data-cg-item-on') || '').split('|');
        var on = el.checked;
        Pum.update(function (st) {
          var g = findGroup(st, parts[0]);
          if (!g) return;
          var it = (g.items || []).filter(function (x) {
            return x.id === parts[1];
          })[0];
          if (it) it.on = on;
          Pum.logAudit(g.name + ' 하위 항목 ' + (on ? '노출 ON' : '노출 OFF'));
        });
      });
    });

    main.querySelectorAll('[data-cg-item-del]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var parts = String(btn.getAttribute('data-cg-item-del') || '').split('|');
        Pum.update(function (st) {
          var g = findGroup(st, parts[0]);
          if (!g) return;
          var it = (g.items || []).filter(function (x) {
            return x.id === parts[1];
          })[0];
          g.items = (g.items || []).filter(function (x) {
            return x.id !== parts[1];
          });
          Pum.logAudit(g.name + ' 하위 항목 삭제: ' + ((it && it.title) || parts[1]));
        });
        Pum.toast('하위 항목을 삭제했습니다');
        renderTab(app);
      });
    });

    main.querySelectorAll('[data-cg-add-item]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-cg-add-item');
        Pum.update(function (st) {
          var g = findGroup(st, id);
          if (!g) return;
          if (!Array.isArray(g.items)) g.items = [];
          g.items.push({ id: gid('ci'), title: '', url: '', on: true });
          Pum.logAudit(g.name + ' 하위 항목 추가');
        });
        renderTab(app);
        var target = main.querySelector('[data-cg="' + id + '"]');
        if (target) {
          var rows = target.querySelectorAll('[data-cg-item-title]');
          var last = rows[rows.length - 1];
          if (last) {
            last.scrollIntoView({ block: 'center', behavior: 'smooth' });
            setTimeout(function () { last.focus(); }, 120);
          }
        }
      });
    });

    main.querySelectorAll('[data-cg-del]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-cg-del');
        var g = Pum.customGroupOf(id);
        if (!g) return;
        Pum.confirm((g.name || '추가 영역') + '을(를) 삭제할까요?\n사용자 화면에서도 함께 사라집니다.', {
          okLabel: '삭제',
          danger: true
        }).then(function (ok) {
          if (!ok) return;
          Pum.update(function (st) {
            st.admin.pumss.customGroups = (st.admin.pumss.customGroups || []).filter(function (x) {
              return x.id !== id;
            });
            /* 삭제 후 번호를 다시 매깁니다 (추가 영역 2, 3 ...) */
            st.admin.pumss.customGroups.forEach(function (x, i) {
              x.name = '추가 영역 ' + (i + 2);
            });
            Pum.logAudit('품스 ' + (g.name || '추가 영역') + ' 삭제');
          });
          Pum.toast('연동 영역을 삭제했습니다');
          renderTab(app);
        });
      });
    });
  }

  /* -------------------------------------------------------- 신고 · 감사 로그 */

  /* 공유 페이지에서 접수한 신고 — 신고자 이메일·상세 내용까지 표시 */
  function shareReportsHTML() {
    var ad = AD();
    var list = (ad.reports || []).filter(function (r) {
      return r.source === 'share' || r.source === 'report-page';
    });
    return (
      '<section class="adm-card">' +
      '<div class="adm-card__head"><h2>페이지 신고 접수</h2><span class="adm-count">' + num(list.length) + '건</span></div>' +
      (list.length
        ? '<div class="adm-table-wrap"><table class="adm-table">' +
          '<thead><tr><th>접수일시</th><th>피신고 품</th><th>신고자 이메일</th><th>사유</th><th>상세 내용</th><th>상태</th><th></th></tr></thead><tbody>' +
          list
            .map(function (r) {
              var done = r.status === '처리완료';
              var processed = done || r.status === '신고';
              return (
                '<tr><td class="adm-muted">' + esc(r.at) + '</td>' +
                '<td><b>' + esc(r.target) + '</b>' +
                (r.attach ? '<br/><span class="adm-muted">첨부: ' + esc(r.attach) + '</span>' : '') +
                '</td>' +
                '<td class="adm-muted">' + esc(r.reporterEmail || r.reporter || '-') + '</td>' +
                '<td>' + esc(r.reason || '-') + '</td>' +
                '<td class="adm-detail">' + esc(r.detail || '-') + '</td>' +
                '<td><span class="adm-pill ' + (done ? 'adm-pill--ok' : processed ? 'adm-pill--stop' : 'adm-pill--wait') + '">' +
                esc(processed ? (done ? '처리완료' : '정지 처리') : r.status || '접수') + '</span></td>' +
                '<td class="adm-right">' +
                (processed
                  ? '<span class="adm-muted">' + (done ? '-' : '신고 처리됨') + '</span>'
                  : '<button type="button" class="adm-btn adm-btn--sm adm-btn--danger" data-ops-report="' + esc(r.id) + '">신고 처리(즉시 정지)</button>') +
                '</td></tr>'
              );
            })
            .join('') +
          '</tbody></table></div>'
        : '<div class="adm-card__body"><p class="adm-hint">아직 접수된 신고가 없습니다. 공유 페이지의 [신고하기] 또는 신고 페이지(#/report)로 접수되면 신고자 이메일·사유·상세 내용이 이 목록에 쌓입니다.</p></div>') +
      '</section>'
    );
  }

  function reportsHTML() {
    var ad = AD();
    var mails = ad.mailLog || [];
    return (
      head('신고 · 차단 이력 & 감사 로그', '신고를 접수하면 해당 회원은 즉시 정지되고, 정지 사유가 이메일로 안내됩니다(더미).') +
      shareReportsHTML() +
      '<section class="adm-card">' +
      '<div class="adm-card__head"><h2>신고 접수</h2><span class="adm-count">' + num((ad.reports || []).filter(function (r) { return r.source !== 'share' && r.source !== 'report-page' && r.status !== '처리완료'; }).length) + '건 미처리</span></div>' +
      '<div class="adm-table-wrap"><table class="adm-table">' +
      '<thead><tr><th>대상</th><th>사유</th><th>신고자</th><th>접수 시각</th><th>상태</th><th></th></tr></thead><tbody>' +
      (ad.reports || []).filter(function (r) { return r.source !== 'share' && r.source !== 'report-page'; }).map(function (r) {
        var done = r.status === '처리완료';
        var reported = r.status === '신고';
        return '<tr><td><b>' + esc(r.target) + '</b></td><td>' + esc(r.reason) + '</td>' +
          '<td class="adm-muted">' + esc(r.reporter) + '</td><td class="adm-muted">' + esc(r.at) + '</td>' +
          '<td><span class="adm-pill ' + (done ? 'adm-pill--ok' : reported ? 'adm-pill--stop' : 'adm-pill--wait') + '">' + esc(r.status) + '</span></td>' +
          '<td class="adm-right">' + (done ? '<span class="adm-muted">-</span>' :
            (reported ? '<span class="adm-muted">정지됨</span>' :
              '<button type="button" class="adm-btn adm-btn--sm adm-btn--danger" data-ops-report="' + esc(r.id) + '">신고 처리(즉시 정지)</button>')) + '</td></tr>';
      }).join('') +
      '</tbody></table></div></section>' +

      '<section class="adm-card"><div class="adm-card__head"><h2>이메일 · 문자 발송 로그</h2><span class="adm-count">' + num(mails.length) + '건</span></div>' +
      '<div class="adm-card__body"><ul class="adm-log adm-log--full">' +
      (mails.length
        ? mails.slice(0, 20).map(function (l) {
            return '<li><span class="adm-log__time">' + esc(l.at) + '</span>' +
              '<span class="adm-log__text">' + esc(l.subject) + ' → ' + esc(l.to) + (l.body ? ' · ' + esc(l.body) : '') + '</span>' +
              '<span class="adm-log__who">' + (l.kind === 'sms' ? '문자' : l.kind === 'push' ? 'PUSH' : '메일') + '</span></li>';
          }).join('')
        : '<li class="adm-muted">발송 로그가 없습니다.</li>') +
      '</ul></div></section>' +

      '<section class="adm-card">' +
      '<div class="adm-card__head"><h2>감사 로그</h2><span class="adm-count">' + num((ad.audit || []).length) + '건</span></div>' +
      '<div class="adm-card__body"><ul class="adm-log adm-log--full">' +
      (ad.audit || []).map(function (a) {
        return '<li><span class="adm-log__time">' + esc(a.at) + '</span><span class="adm-log__text">' + esc(a.action) + '</span><span class="adm-log__who">' + esc(a.who || '관리자') + '</span></li>';
      }).join('') +
      '</ul></div></section>'
    );
  }

  function bindReports(app) {
    var main = app.querySelector('#adminMain');
    main.querySelectorAll('[data-ops-report]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-ops-report');
        var r = (AD().reports || []).filter(function (x) {
          return x.id === id;
        })[0];
        if (!r) return;

        Pum.modal({
          title: '신고 처리 — ' + r.target,
          desc: r.reason,
          body:
            '<div class="map-note map-note--warn">' + icon('info') +
            '<span>신고를 접수하면 해당 회원 상태가 <b>신고</b>로 표기되고 <b>즉시 정지</b>됩니다. 정지 사유가 이메일로 안내됩니다(더미).</span></div>' +
            '<div class="field"><label class="field__label">정지 사유 <span class="req">*</span></label>' +
            '<input class="input" id="repReason" value="' + esc(r.reason) + '" /></div>',
          actions: [
            { label: '취소', kind: 'ghost' },
            {
              label: '신고 접수 · 즉시 정지',
              kind: 'brand',
              onClick: function (api) {
                var reason = api.body.querySelector('#repReason').value.trim();
                if (!reason) {
                  Pum.toast('정지 사유를 입력해 주세요', 'err');
                  return false;
                }
                Pum.update(function (st) {
                  var rep = st.admin.reports.filter(function (x) {
                    return x.id === id;
                  })[0];
                  if (rep) rep.status = '신고';
                  var m = (st.admin.members || []).filter(function (x) {
                    return lower(x.email) === lower(r.email) || lower(x.slug) === lower(String(r.target).replace('@', ''));
                  })[0];
                  if (m) {
                    m.status = 'reported';
                    m.suspendReason = reason;
                  }
                  Pum.logAudit('신고 접수 · 회원 ' + r.target + ' 즉시 정지 · 사유: ' + reason);
                  st.admin.mailLog = st.admin.mailLog || [];
                  st.admin.mailLog.unshift({
                    id: 'ml-' + Date.now().toString(36),
                    at: stamp(),
                    to: (m && m.email) || r.email || r.target,
                    subject: '[품] 신고 접수 및 이용 정지 안내 (데모 발송)',
                    body: '정지 사유: ' + reason,
                    kind: 'mail'
                  });
                });
                Pum.toast('신고를 접수하고 회원을 즉시 정지했습니다 (사유 메일 발송)');
                renderTab(app);
              }
            }
          ]
        });
      });
    });
  }

  /* ---------------------------------------------------------------- 관리자 계정 */
  function accountsHTML() {
    var list = opsList();
    var me = opsSession();
    var sup = isSuper();
    var pending = list.filter(function (o) {
      return o.status === 'pending';
    }).length;
    var rows = list
      .map(function (o) {
        var isMe = me && lower(me.email) === lower(o.email);
        var stText = o.status === 'active' ? '활성' : o.status === 'pending' ? '승인 대기' : '사용 중지';
        var stCls = o.status === 'active' ? 'adm-pill--ok' : o.status === 'pending' ? 'adm-pill--wait' : 'adm-pill--stop';
        var actions = '';
        if (!sup) {
          actions = '<span class="adm-muted">슈퍼 관리자 전용</span>';
        } else if (o.status === 'pending') {
          actions =
            '<button type="button" class="adm-btn adm-btn--sm adm-btn--primary" data-ops-op-approve="' + esc(o.id) + '">승인</button>' +
            '<button type="button" class="adm-btn adm-btn--sm adm-btn--danger" data-ops-op-reject="' + esc(o.id) + '">반려</button>';
        } else if (o.status === 'active') {
          if (isMe) {
            actions = '<span class="adm-muted">현재 로그인 계정</span>';
          } else {
            actions =
              (o.grade === 'manager'
                ? '<button type="button" class="adm-btn adm-btn--sm" data-ops-op-grade="' + esc(o.id) + '" data-grade="super">슈퍼로 승격</button>'
                : '<button type="button" class="adm-btn adm-btn--sm" data-ops-op-grade="' + esc(o.id) + '" data-grade="manager">일반으로 변경</button>') +
              '<button type="button" class="adm-btn adm-btn--sm adm-btn--danger" data-ops-op-stop="' + esc(o.id) + '">사용 중지</button>';
          }
        } else {
          actions = '<button type="button" class="adm-btn adm-btn--sm" data-ops-op-approve="' + esc(o.id) + '">다시 승인</button>';
        }
        return (
          '<tr><td><b>' + esc(o.name || '-') + '</b>' + (isMe ? ' <span class="adm-tag--user">나</span>' : '') + '</td>' +
          '<td class="adm-muted">' + esc(o.email) + '</td>' +
          '<td><span class="adm-grade adm-grade--' + esc(o.grade) + ' adm-grade--sm">' +
          (o.grade === 'super' ? icon('shield') : icon('users')) + esc(GRADE_LABEL[o.grade] || '-') + '</span></td>' +
          '<td><span class="adm-pill ' + stCls + '">' + stText + '</span></td>' +
          '<td class="adm-muted">' + esc(o.at || '-') + '</td>' +
          '<td class="adm-muted">' + esc(o.approvedBy || '-') + '</td>' +
          '<td class="adm-right"><div class="adm-row-btns">' + actions + '</div></td></tr>'
        );
      })
      .join('');

    return (
      head('관리자 계정 관리', '관리자 계정의 승인·반려와 등급(슈퍼 관리자 / 일반 관리자)을 관리합니다.') +
      (sup
        ? ''
        : '<div class="adm-hint adm-hint--lock">' + icon('lock') +
          '<span>관리자 계정 승인·등급 관리는 <b>슈퍼 관리자</b>만 처리할 수 있습니다. 현재 계정(' +
          esc(GRADE_LABEL[(me && me.grade) || 'manager']) + ')은 목록 조회만 가능합니다.</span></div>') +
      '<section class="adm-card">' +
      '<div class="adm-card__head"><h2>관리자 계정 ' + num(list.length) + '개</h2>' +
      '<span class="adm-count">' + (pending ? '승인 대기 ' + pending + '건' : '대기 없음') + '</span></div>' +
      '<div class="adm-table-wrap"><table class="adm-table">' +
      '<thead><tr><th>이름</th><th>이메일</th><th>등급</th><th>상태</th><th>등록·신청일</th><th>승인자</th><th></th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table></div></section>' +
      '<section class="adm-card"><div class="adm-card__head"><h2>권한 안내</h2></div>' +
      '<div class="adm-card__body"><ul class="adm-kv">' +
      '<li><span>슈퍼 관리자</span><b>회원 · 신고 · 공지 · 품스 콘텐츠 연동 + 관리자 계정 승인·등급 관리</b></li>' +
      '<li><span>일반 관리자</span><b>회원 · 신고 · 공지 · 품스 콘텐츠 연동 (관리자 계정은 조회만)</b></li>' +
      '</ul></div></section>'
    );
  }

  function bindAccounts(app) {
    var main = app.querySelector('#adminMain');
    if (!main) return;

    function guard() {
      if (isSuper()) return true;
      Pum.toast('슈퍼 관리자만 처리할 수 있습니다', 'err');
      return false;
    }

    function patch(id, fn, log) {
      if (!guard()) return;
      Pum.update(function (st) {
        var target = (st.admin.ops || []).filter(function (o) {
          return o.id === id;
        })[0];
        if (target) fn(target, st);
      });
      if (log && Pum.logAudit) Pum.logAudit(log);
      renderTab(app);
    }

    main.querySelectorAll('[data-ops-op-approve]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-ops-op-approve');
        var me = opsSession() || {};
        patch(
          id,
          function (o) {
            o.status = 'active';
            o.approvedBy = me.name || me.email || '관리자';
            o.approvedAt = opsStamp();
          },
          '관리자 계정 승인 · ' + id
        );
        Pum.toast('관리자 계정을 승인했습니다');
      });
    });

    main.querySelectorAll('[data-ops-op-reject]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-ops-op-reject');
        patch(
          id,
          function (o) {
            o.status = 'rejected';
          },
          '관리자 계정 반려 · ' + id
        );
        Pum.toast('관리자 계정 신청을 반려했습니다');
      });
    });

    main.querySelectorAll('[data-ops-op-grade]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-ops-op-grade');
        var grade = btn.getAttribute('data-grade');
        var list = opsList();
        var target = list.filter(function (o) {
          return o.id === id;
        })[0];
        if (!target) return;
        if (grade === 'manager' && target.grade === 'super') {
          var supers = list.filter(function (o) {
            return o.grade === 'super' && o.status === 'active';
          });
          if (supers.length <= 1) {
            Pum.toast('슈퍼 관리자가 최소 1명은 있어야 합니다', 'err');
            return;
          }
        }
        patch(
          id,
          function (o) {
            o.grade = grade;
          },
          '관리자 등급 변경 · ' + target.email + ' → ' + GRADE_LABEL[grade]
        );
        Pum.toast('등급을 ' + GRADE_LABEL[grade] + '(으)로 변경했습니다');
      });
    });

    main.querySelectorAll('[data-ops-op-stop]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-ops-op-stop');
        var target = opsList().filter(function (o) {
          return o.id === id;
        })[0];
        if (!target) return;
        if (!guard()) return;
        Pum.confirm(target.name + ' 님의 관리자 권한을 사용 중지할까요?', { okLabel: '사용 중지', danger: true }).then(
          function (ok) {
            if (!ok) return;
            patch(
              id,
              function (o) {
                o.status = 'stopped';
              },
              '관리자 권한 사용 중지 · ' + target.email
            );
            Pum.toast('사용 중지했습니다');
          }
        );
      });
    });
  }

  Pum.opsView = opsView;
  Pum.views = Pum.views || {};
  Pum.views.opsAdmin = opsView;
})(window);
