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

  var TABS = [
    { id: 'dashboard', label: '대시보드', icon: 'preview' },
    { id: 'members', label: '회원 · 품 주소', icon: 'card' },
    { id: 'notices', label: '공지 · PUSH · 배너', icon: 'image' },
    { id: 'pumss', label: '품스 콘텐츠 연동', icon: 'link' },
    { id: 'reports', label: '신고 · 감사 로그', icon: 'info' }
  ];

  function opsView(app) {
    app.innerHTML =
      '<div class="admin">' +
      '<header class="admin__bar">' +
      '<div class="admin__brand">' +
      '<span class="admin__logo">품</span>' +
      '<span class="admin__brandtext">운영 관리자<small>pumss.co.kr/#/ops-admin</small></span>' +
      '<span class="admin__tag">OPS</span>' +
      '</div>' +
      '<div class="admin__actions">' +
      '<button type="button" class="adm-btn adm-btn--ghost" data-nav="share">공유 페이지</button>' +
      '<button type="button" class="adm-btn adm-btn--ghost" data-nav="editor">사용자 화면</button>' +
      '</div>' +
      '</header>' +
      '<div class="admin__layout">' +
      '<nav class="admin__nav" aria-label="운영 관리자 메뉴">' +
      TABS.map(function (t) {
        return (
          '<button type="button" class="admin__navbtn' + (t.id === tab ? ' is-active' : '') + '" data-ops-tab="' + t.id + '">' +
          icon(t.icon) + '<span>' + esc(t.label) + '</span></button>'
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
    else main.innerHTML = dashHTML();

    if (tab === 'dashboard') bindDash(app);
    else if (tab === 'members') bindMembers(app);
    else if (tab === 'notices') bindNotices(app);
    else if (tab === 'pumss') bindPumss(app);
    else if (tab === 'reports') bindReports(app);
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
      '<div class="adm-stat"><span class="adm-stat__label">발행된 품</span><strong class="adm-stat__value">' + num(members.filter(function (m) { return !!m.slug; }).length) + '개</strong><span class="adm-stat__sub">주소 등록 기준</span></div>' +
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
      '<div class="adm-card__head"><h2>회원 목록</h2><span class="adm-count">' + num(members.length) + '명</span></div>' +
      '<div class="adm-table-wrap"><table class="adm-table">' +
      '<thead><tr><th>이름</th><th>아이디(이메일)</th><th>휴대전화</th><th>품 주소</th><th>가입일</th><th>조회</th><th>상태</th><th></th></tr></thead><tbody>' +
      members.map(function (m) {
        var blocked = m.status === 'suspended' || m.status === 'reported' || m.status === 'deleted';
        return (
          '<tr data-ops-row="' + esc(m.id) + '">' +
          '<td><button type="button" class="adm-link" data-ops-member="' + esc(m.id) + '"><b>' + esc(m.name || '-') + '</b></button></td>' +
          '<td class="adm-muted">' + esc(m.email || '-') + '</td>' +
          '<td class="adm-muted">' + esc(m.phone || '-') + '</td>' +
          '<td>' + (m.slug ? '@' + esc(m.slug) : '<span class="adm-muted">미설정</span>') + '</td>' +
          '<td class="adm-muted">' + esc(m.joinedAt || '-') + '</td>' +
          '<td>' + num(m.views) + '</td>' +
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
      '<li><span>아이디(이메일)</span><b>' + esc(m.email || '-') + '</b></li>' +
      '<li><span>휴대전화</span><b>' + esc(m.phone || '-') + '</b></li>' +
      '<li><span>품 주소</span><b>' + (m.slug ? '@' + esc(m.slug) : '미설정') + '</b></li>' +
      '<li><span>가입 정보</span><b>' + esc(m.joinedAt || '-') + ' 가입</b></li>' +
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
              '<td>' + (n.channel === 'push' ? 'PUSH' : '공지') + '</td>' +
              '<td>' + (n.status === 'scheduled' ? '<span class="adm-pill adm-pill--wait">예약</span>' : '<span class="adm-pill adm-pill--ok">발송</span>') + '</td>' +
              '<td class="adm-muted">' + esc(String(n.sentAt || n.scheduledAt || n.at || '').slice(0, 16)) + '</td>' +
              '<td class="adm-right">' + (n.status === 'scheduled'
                ? '<button type="button" class="adm-btn adm-btn--sm adm-btn--primary" data-ops-sendnow="' + esc(n.id) + '">지금 발송</button>'
                : '<span class="adm-muted">-</span>') + '</td></tr>';
          }).join('')
        : '<tr><td colspan="6" class="adm-muted">발송 이력이 없습니다.</td></tr>') +
      '</tbody></table></div>' +
      '</div></section>' +

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
        Pum.update(function (st) {
          var n = st.admin.notifications.filter(function (x) {
            return x.id === id;
          })[0];
          if (n) {
            n.status = 'sent';
            n.sentAt = stamp();
            Pum.logAudit('예약 공지 즉시 발송: ' + n.title);
          }
        });
        Pum.toast('예약 공지를 지금 발송했습니다 (데모)');
        renderTab(app);
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

  function pushModal(app) {
    var members = AD().members || [];
    var body =
      '<div class="field"><label class="field__label">대상</label>' +
      '<select class="input select" id="pushTarget">' +
      '<option value="all">전체 회원 (' + members.length + '명)</option>' +
      '<option value="new">신규 가입 회원 (최근 30일)</option>' +
      '<option value="individual">개별 회원</option>' +
      '</select></div>' +
      '<div class="field" id="pushWhoWrap" hidden><label class="field__label">회원 선택</label>' +
      '<select class="input select" id="pushWho">' +
      members.map(function (m) {
        return '<option value="' + esc(m.id) + '">' + esc(m.name) + ' · ' + esc(m.email) + '</option>';
      }).join('') +
      '</select></div>' +
      '<div class="field"><label class="field__label">채널</label>' +
      '<select class="input select" id="pushChannel"><option value="notice">공지사항 (소유자 페이지)</option><option value="push">PUSH (이메일)</option></select></div>' +
      '<div class="field"><label class="field__label">제목</label><input class="input" id="pushTitle" maxlength="60" /></div>' +
      '<div class="field"><label class="field__label">내용</label><textarea class="textarea" id="pushBody" rows="3" maxlength="300"></textarea></div>' +
      '<div class="field"><label class="check-row"><input type="checkbox" id="pushSchedule" /><span>예약 발송</span></label>' +
      '<input class="input" id="pushAt" type="datetime-local" hidden /></div>';

    var m = Pum.modal({
      title: 'PUSH · 공지 발송',
      body: body,
      actions: [
        { label: '취소', kind: 'ghost' },
        {
          label: '발송',
          kind: 'primary',
          onClick: function (api) {
            var target = api.body.querySelector('#pushTarget').value;
            var channel = api.body.querySelector('#pushChannel').value;
            var title = api.body.querySelector('#pushTitle').value.trim();
            var text = api.body.querySelector('#pushBody').value.trim();
            var scheduled = api.body.querySelector('#pushSchedule').checked;
            var at = api.body.querySelector('#pushAt').value;
            if (!title || !text) {
              Pum.toast('제목과 내용을 입력해 주세요', 'err');
              return false;
            }
            if (scheduled && !at) {
              Pum.toast('예약 일시를 선택해 주세요', 'err');
              return false;
            }
            var who = null;
            var targetLabel = '전체 회원';
            var targetEmail = '';
            var targetSlug = '';
            if (target === 'new') targetLabel = '신규 가입 회원';
            if (target === 'individual') {
              var id = api.body.querySelector('#pushWho').value;
              who = findMember(id);
              if (who) {
                targetLabel = who.name + ' (' + who.email + ')';
                targetEmail = who.email;
                targetSlug = who.slug;
              }
            }
            Pum.update(function (st) {
              st.admin.notifications.unshift({
                id: 'n-' + Date.now().toString(36),
                at: stamp(),
                target: target,
                targetLabel: targetLabel,
                targetEmail: targetEmail,
                targetSlug: targetSlug,
                title: title,
                body: text,
                channel: channel,
                status: scheduled ? 'scheduled' : 'sent',
                sentAt: scheduled ? '' : stamp(),
                scheduledAt: scheduled ? at.replace('T', ' ') : ''
              });
              Pum.logAudit((scheduled ? '예약 ' : '') + (channel === 'push' ? 'PUSH' : '공지') + ' 발송: ' + title + ' → ' + targetLabel);
              st.admin.mailLog = st.admin.mailLog || [];
              st.admin.mailLog.unshift({
                id: 'ml-' + Date.now().toString(36),
                at: stamp(),
                to: targetEmail || targetLabel,
                subject: '[품 ' + (channel === 'push' ? 'PUSH' : '공지') + '] ' + title,
                body: text,
                kind: channel === 'push' ? 'push' : 'mail'
              });
            });
            Pum.toast(scheduled ? '예약 발송으로 등록했습니다' : '발송했습니다 (데모)');
            renderTab(app);
          }
        }
      ]
    });

    m.body.querySelector('#pushTarget').addEventListener('change', function () {
      m.body.querySelector('#pushWhoWrap').hidden = this.value !== 'individual';
    });
    m.body.querySelector('#pushSchedule').addEventListener('change', function () {
      m.body.querySelector('#pushAt').hidden = !this.checked;
      if (this.checked) m.body.querySelector('#pushAt').focus();
    });
  }

  /* ------------------------------------------------------ 품스 콘텐츠 연동 */
  var APP_LABEL = ['자동차 다이렉트 견적', '개인 답례품·행사/판촉', '해외여행자 보험', '모바일 IT솔루션', '모바일 상품권', '디자인·인쇄', '자동차 리스/렌탈', '보험금 보상 상담'];

  function pumssHTML() {
    var items = AD().pumss.items;
    var synced = AD().pumss.syncedAt;

    function rowToggle(key, label, extra) {
      var it = items[key];
      return (
        '<div class="adm-prow">' +
        '<div class="adm-prow__top">' +
        '<div class="adm-prow__name">' + esc(label) + '</div>' +
        '<div class="adm-prow__ctrl">' +
        '<span class="adm-prow__state' + (it.on !== false ? ' is-on' : '') + '">' + (it.on !== false ? '노출' : 'OFF') + '</span>' +
        '<label class="switch switch--sm"><input type="checkbox" data-pumss-on="' + key + '"' + (it.on !== false ? ' checked' : '') + ' aria-label="' + esc(label) + ' 노출" /><span class="switch__track"></span></label>' +
        '</div></div>' +
        (extra || '') +
        '</div>'
      );
    }

    return (
      head('품스 콘텐츠 연동', 'pumss.co.kr 콘텐츠의 전역 노출과 문구를 관리합니다. 변경은 사용자 품에 즉시 반영됩니다.') +
      '<section class="adm-card">' +
      '<div class="adm-card__head"><h2 class="adm-title-sm">연동 상태</h2>' +
      '<div class="adm-sync"><span>최근 동기화 <b id="admSyncAt">' + esc(stampPretty(synced)) + '</b></span>' +
      '<button type="button" class="adm-btn adm-btn--primary adm-btn--sm" id="admPumssSync">품스 API 동기화</button></div></div>' +
      '<div class="adm-card__body adm-prow-list">' +
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
      '</div></section>'
    );
  }

  function bindPumss(app) {
    var main = app.querySelector('#adminMain');

    main.querySelector('#admPumssSync').addEventListener('click', function () {
      Pum.update(function (st) {
        st.admin.pumss.syncedAt = new Date().toISOString();
        Pum.logAudit('품스 API 동기화 (13개 콘텐츠)');
      });
      var at = main.querySelector('#admSyncAt');
      if (at) at.textContent = stampPretty(AD().pumss.syncedAt);
      Pum.toast('품스 콘텐츠를 동기화했습니다');
    });

    main.querySelectorAll('[data-pumss-on]').forEach(function (el) {
      el.addEventListener('change', function () {
        var key = el.getAttribute('data-pumss-on');
        var on = el.checked;
        Pum.update(function (st) {
          st.admin.pumss.items[key].on = on;
          Pum.logAudit('품스 콘텐츠 ' + key + ' ' + (on ? '노출 ON' : '노출 OFF'));
        });
        var badge = el.closest('.adm-prow').querySelector('.adm-prow__state');
        if (badge) {
          badge.textContent = on ? '노출' : 'OFF';
          badge.classList.toggle('is-on', on);
        }
        Pum.toast((on ? '노출합니다: ' : '숨겼습니다: ') + key);
      });
    });

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

    ['greeting', 'news', 'recs', 'apptech'].forEach(function (key) {
      var el = main.querySelector('[data-pumss-title="' + key + '"]');
      if (el) el.addEventListener('change', function () { saveText('title', key, 'title'); });
    });
    var qt = main.querySelector('[data-pumss-text="quote"]');
    if (qt) qt.addEventListener('change', function () { saveText('text', 'quote', 'text'); });
    var qa = main.querySelector('[data-pumss-author="quote"]');
    if (qa) qa.addEventListener('change', function () { saveText('author', 'quote', 'author'); });

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
  }

  /* -------------------------------------------------------- 신고 · 감사 로그 */
  function reportsHTML() {
    var ad = AD();
    var mails = ad.mailLog || [];
    return (
      head('신고 · 차단 이력 & 감사 로그', '신고를 접수하면 해당 회원은 즉시 정지되고, 정지 사유가 이메일로 안내됩니다(더미).') +
      '<section class="adm-card">' +
      '<div class="adm-card__head"><h2>신고 접수</h2><span class="adm-count">' + num((ad.reports || []).filter(function (r) { return r.status !== '처리완료'; }).length) + '건 미처리</span></div>' +
      '<div class="adm-table-wrap"><table class="adm-table">' +
      '<thead><tr><th>대상</th><th>사유</th><th>신고자</th><th>접수 시각</th><th>상태</th><th></th></tr></thead><tbody>' +
      (ad.reports || []).map(function (r) {
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

  Pum.opsView = opsView;
  Pum.views = Pum.views || {};
  Pum.views.opsAdmin = opsView;
})(window);
