/* ==========================================================================
   품 꾸미기 PWA — admin.js
   운영 관리자 백엔드(#/admin) · 품 주소 중복/예약어 검사 · 품스 콘텐츠 연동
   관리자 화면과 사용자 품 화면은 같은 localStorage 상태를 공유합니다.
   ========================================================================== */
(function (global) {
  'use strict';

  var Pum = global.Pum;
  var esc = Pum.util.esc;
  var icon = Pum.icon;

  var tab = 'dashboard';

  function S() {
    return Pum.getState();
  }
  function AD() {
    return S().admin;
  }
  function lower(v) {
    return String(v == null ? '' : v).toLowerCase();
  }
  function pad(n) {
    return String(n).padStart(2, '0');
  }
  function stamp(d) {
    var x = d || new Date();
    return (
      x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate()) + ' ' + pad(x.getHours()) + ':' + pad(x.getMinutes())
    );
  }
  function stampPretty(value) {
    if (!value) return '동기화 기록 없음';
    var d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return stamp(d);
  }
  function num(n) {
    return Number(n || 0).toLocaleString('ko-KR');
  }

  /* ----------------------------------------------------------------------
     회원 동기화 · 조회
     ---------------------------------------------------------------------- */
  Pum.adminSyncUser = function () {
    var st = S();
    var user = st.auth.user || {};
    if (!st.auth.loggedIn || !user.email) return null;
    var email = lower(user.email);
    var list = AD().members;
    var m = list.filter(function (x) {
      return lower(x.email) === email;
    })[0];
    var changed = false;

    if (!m) {
      m = {
        id: 'm-' + Date.now().toString(36),
        name: user.name || String(user.email).split('@')[0],
        email: user.email,
        slug: st.profile.slug || '',
        status: 'active',
        joinedAt: new Date().toISOString().slice(0, 10),
        views: 0
      };
      list.push(m);
      changed = true;
    } else {
      if (user.name && m.name !== user.name) {
        m.name = user.name;
        changed = true;
      }
      if (st.profile.slug && m.slug !== st.profile.slug) {
        m.slug = st.profile.slug;
        changed = true;
      }
    }
    if (changed) {
      Pum.update(function () {}, { silent: true });
    }
    return m;
  };

  Pum.adminData = function () {
    return AD();
  };

  function memberBySlug(slug) {
    var low = lower(slug);
    if (!low) return null;
    return (
      AD().members.filter(function (m) {
        return lower(m.slug) === low;
      })[0] || null
    );
  }

  function currentMember() {
    var st = S();
    var email = lower((st.auth.user || {}).email);
    var m = email
      ? AD().members.filter(function (x) {
          return lower(x.email) === email;
        })[0]
      : null;
    if (!m && st.profile.slug) m = memberBySlug(st.profile.slug);
    return m || null;
  }

  /** 현재 품(로그인 사용자 또는 품 주소 주인)이 관리자에 의해 정지되었는지 */
  Pum.memberSuspended = function () {
    var m = currentMember();
    return !!(m && m.status === 'suspended');
  };

  /* ----------------------------------------------------------------------
     품 주소 검사 (실시간 중복 · 예약어)
     ---------------------------------------------------------------------- */
  Pum.checkSlug = function (value, ownSlug) {
    var v = String(value == null ? '' : value).trim();
    if (!v) return { state: 'empty', message: '품 주소를 입력해 주세요' };
    if (!/^[A-Za-z]+$/.test(v)) return { state: 'invalid', message: '영문자만 사용할 수 있습니다' };

    var low = lower(v);
    var own = lower(ownSlug);

    var reserved = (AD().reserved || []).map(lower);
    if (reserved.indexOf(low) >= 0) {
      return { state: 'reserved', message: '시스템 예약어로 사용할 수 없습니다' };
    }

    var clash = (AD().members || []).filter(function (m) {
      return m.slug && lower(m.slug) === low && lower(m.slug) !== own;
    })[0];
    if (clash) {
      return { state: 'taken', message: '이미 사용 중인 주소입니다', owner: clash.name };
    }
    return { state: 'ok', message: '사용 가능한 품 주소입니다' };
  };

  /* ----------------------------------------------------------------------
     품스 콘텐츠 전역 설정 조회
     ---------------------------------------------------------------------- */
  Pum.pumssItem = function (key) {
    var items = (AD().pumss && AD().pumss.items) || {};
    return items[key] || {};
  };
  Pum.pumssOn = function (key) {
    var it = Pum.pumssItem(key);
    return it.on !== false;
  };
  Pum.pumssApptech = function (idx) {
    var items = (Pum.pumssItem('apptech').items || [])[idx] || {};
    return items;
  };

  /* ----------------------------------------------------------------------
     감사 로그 · 조회/클릭 카운트
     ---------------------------------------------------------------------- */
  Pum.logAudit = function (action) {
    var st = S();
    st.admin.audit.unshift({
      id: 'a-' + Date.now().toString(36),
      at: stamp(),
      who: (st.auth.user && st.auth.user.name) || '관리자',
      action: action
    });
    if (st.admin.audit.length > 60) st.admin.audit.length = 60;
  };

  function bump(kind) {
    var st = S();
    var stats = st.admin.stats;
    var today = Pum.util.todayStamp();
    if (stats.day !== today) {
      stats.day = today;
      stats.todayViews = 0;
      stats.todayClicks = 0;
    }
    if (kind === 'view') {
      stats.views = Number(stats.views || 0) + 1;
      stats.todayViews = Number(stats.todayViews || 0) + 1;
      var m = currentMember();
      if (m) m.views = Number(m.views || 0) + 1;
    } else {
      stats.clicks = Number(stats.clicks || 0) + 1;
      stats.todayClicks = Number(stats.todayClicks || 0) + 1;
    }
    Pum.save({ silent: true });
  }
  Pum.track = { view: function () { bump('view'); }, click: function () { bump('click'); } };

  /* ----------------------------------------------------------------------
     관리자 화면
     ---------------------------------------------------------------------- */
  var TABS = [
    { id: 'dashboard', label: '대시보드', icon: 'preview' },
    { id: 'members', label: '회원 · 품 주소', icon: 'card' },
    { id: 'banner', label: '공지 · 초대 배너', icon: 'image' },
    { id: 'pumss', label: '품스 콘텐츠 연동', icon: 'link' },
    { id: 'reports', label: '신고 · 감사 로그', icon: 'info' }
  ];

  function adminView(app) {
    Pum.adminSyncUser();
    app.innerHTML =
      '<div class="admin">' +
      '<header class="admin__bar">' +
      '<div class="admin__brand">' +
      '<span class="admin__logo">품</span>' +
      '<span class="admin__brandtext">운영 관리자<small>pumss.co.kr/admin</small></span>' +
      '<span class="admin__tag">DEMO</span>' +
      '</div>' +
      '<div class="admin__actions">' +
      '<button type="button" class="adm-btn adm-btn--ghost" data-nav="share">공유 페이지</button>' +
      '<button type="button" class="adm-btn adm-btn--ghost" data-nav="editor">사용자 화면</button>' +
      '</div>' +
      '</header>' +
      '<div class="admin__layout">' +
      '<nav class="admin__nav" aria-label="관리자 메뉴">' +
      TABS.map(function (t) {
        return (
          '<button type="button" class="admin__navbtn' + (t.id === tab ? ' is-active' : '') + '" data-adm-tab="' + t.id + '">' +
          icon(t.icon) + '<span>' + esc(t.label) + '</span></button>'
        );
      }).join('') +
      '</nav>' +
      '<main class="admin__main" id="adminMain"></main>' +
      '</div></div>';

    app.querySelectorAll('[data-adm-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        tab = btn.getAttribute('data-adm-tab');
        app.querySelectorAll('[data-adm-tab]').forEach(function (x) {
          x.classList.toggle('is-active', x === btn);
        });
        renderTab(app);
      });
    });

    renderTab(app);
  }

  function renderTab(app) {
    var main = app.querySelector('#adminMain');
    if (!main) return;
    if (tab === 'members') main.innerHTML = membersHTML();
    else if (tab === 'banner') main.innerHTML = bannerHTML();
    else if (tab === 'pumss') main.innerHTML = pumssHTML();
    else if (tab === 'reports') main.innerHTML = reportsHTML();
    else main.innerHTML = dashboardHTML();

    if (tab === 'members') bindMembers(app);
    else if (tab === 'banner') bindBanner(app);
    else if (tab === 'pumss') bindPumss(app);
    else if (tab === 'reports') bindReports(app);
  }

  function headHTML(title, desc) {
    return (
      '<div class="adm-head"><div><h1 class="adm-title">' + esc(title) + '</h1>' +
      '<p class="adm-desc">' + esc(desc) + '</p></div>' +
      '<span class="adm-updated">최근 갱신 ' + esc(stamp()) + '</span></div>'
    );
  }

  /* ---------------------------------------------------------------- 대시보드 */
  function dashboardHTML() {
    var st = S();
    var ad = AD();
    var members = ad.members || [];
    var activeMembers = members.filter(function (m) {
      return m.status !== 'suspended';
    });
    var activePages = activeMembers.filter(function (m) {
      return !!m.slug;
    });
    var pumss = ad.pumss.items;
    var keys = ['greeting', 'news', 'quote', 'recs'];
    var onCount = keys.filter(function (k) {
      return pumss[k].on !== false;
    }).length;
    var apptechOn = 0;
    var apptechAll = (pumss.apptech.items || []).length;
    if (pumss.apptech.on !== false) {
      (pumss.apptech.items || []).forEach(function (it) {
        if (it.on !== false) apptechOn += 1;
      });
    }
    var total = keys.length + 1 + apptechAll;

    return (
      headHTML('대시보드', '회원, 품 페이지 조회, 품스 콘텐츠 연동 상태를 한눈에 확인합니다.') +
      '<div class="adm-stats">' +
      statCard('총 회원 수', num(members.length) + '명', '정지 ' + num(members.length - activeMembers.length) + '명') +
      statCard('활성 품 페이지', num(activePages.length) + '개', '정지 ' + num(members.length - activeMembers.length) + '개 차단') +
      statCard('누적 조회', num(ad.stats.views), '오늘 +' + num(ad.stats.todayViews)) +
      statCard('누적 클릭', num(ad.stats.clicks), '오늘 +' + num(ad.stats.todayClicks)) +
      '</div>' +
      '<div class="adm-cols">' +
      '<section class="adm-card">' +
      '<div class="adm-card__head"><h2>품스 콘텐츠 연동 상태</h2>' +
      '<button type="button" class="adm-btn adm-btn--sm adm-btn--ghost" data-adm-goto="pumss">관리</button></div>' +
      '<div class="adm-card__body">' +
      '<div class="adm-meter"><span>전역 노출</span><strong>' + num(onCount + (pumss.apptech.on !== false ? 1 + apptechOn : 0)) + ' / ' + num(total) + '</strong></div>' +
      '<div class="adm-bar"><i style="width:' + Math.round(((onCount + (pumss.apptech.on !== false ? 1 + apptechOn : 0)) / total) * 100) + '%"></i></div>' +
      '<ul class="adm-kv">' +
      '<li><span>최근 동기화</span><b>' + esc(stampPretty(ad.pumss.syncedAt)) + '</b></li>' +
      '<li><span>공지 배너</span><b>' + (ad.notice.on ? '<em class="adm-on">노출 중</em>' : '<em class="adm-off">숨김</em>') + '</b></li>' +
      '<li><span>미처리 신고</span><b>' + num((ad.reports || []).filter(function (r) { return r.status !== '처리완료'; }).length) + '건</b></li>' +
      '</ul>' +
      '</div></section>' +
      '<section class="adm-card">' +
      '<div class="adm-card__head"><h2>최근 감사 로그</h2>' +
      '<button type="button" class="adm-btn adm-btn--sm adm-btn--ghost" data-adm-goto="reports">전체</button></div>' +
      '<div class="adm-card__body">' +
      '<ul class="adm-log">' +
      (ad.audit || []).slice(0, 6).map(function (a) {
        return '<li><span class="adm-log__time">' + esc(a.at) + '</span><span class="adm-log__text">' + esc(a.action) + '</span></li>';
      }).join('') +
      '</ul></div></section>' +
      '</div>'
    );
  }

  function statCard(label, value, sub) {
    return (
      '<div class="adm-stat"><span class="adm-stat__label">' + esc(label) + '</span>' +
      '<strong class="adm-stat__value">' + esc(value) + '</strong>' +
      '<span class="adm-stat__sub">' + esc(sub) + '</span></div>'
    );
  }

  /* ------------------------------------------------------------ 회원·품 주소 */
  function membersHTML() {
    var ad = AD();
    var members = ad.members || [];
    return (
      headHTML('회원 · 품 주소 관리', '회원 상태를 바꾸면 해당 품 공유 페이지가 즉시 차단됩니다. 예약어는 품 주소 검사에 바로 반영됩니다.') +
      '<section class="adm-card">' +
      '<div class="adm-card__head"><h2>회원 목록</h2><span class="adm-count">' + num(members.length) + '명</span></div>' +
      '<div class="adm-table-wrap"><table class="adm-table">' +
      '<thead><tr><th>이름</th><th>아이디(이메일)</th><th>품 주소</th><th>가입일</th><th>조회</th><th>상태</th><th></th></tr></thead>' +
      '<tbody>' +
      members.map(function (m) {
        var suspended = m.status === 'suspended';
        return (
          '<tr data-adm-member-row="' + esc(m.id) + '">' +
          '<td><b>' + esc(m.name || '-') + '</b></td>' +
          '<td class="adm-muted">' + esc(m.email || '-') + '</td>' +
          '<td>' + (m.slug ? '@' + esc(m.slug) : '<span class="adm-muted">미설정</span>') + '</td>' +
          '<td class="adm-muted">' + esc(m.joinedAt || '-') + '</td>' +
          '<td>' + num(m.views) + '</td>' +
          '<td><span class="adm-pill ' + (suspended ? 'adm-pill--stop' : 'adm-pill--ok') + '">' + (suspended ? '정지' : '정상') + '</span></td>' +
          '<td class="adm-right"><button type="button" class="adm-btn adm-btn--sm ' + (suspended ? 'adm-btn--ok' : 'adm-btn--danger') +
          '" data-adm-member="' + esc(m.id) + '">' + (suspended ? '정지 해제' : '정지') + '</button></td>' +
          '</tr>'
        );
      }).join('') +
      '</tbody></table></div>' +
      '</section>' +
      '<section class="adm-card">' +
      '<div class="adm-card__head"><h2>시스템 예약어</h2><span class="adm-count">' + num((ad.reserved || []).length) + '개</span></div>' +
      '<div class="adm-card__body">' +
      '<div class="adm-chips" id="admReservedList">' +
      (ad.reserved || []).map(function (w) {
        return '<span class="adm-chip">' + esc(w) + '<button type="button" data-adm-res-del="' + esc(w) + '" aria-label="' + esc(w) + ' 삭제">×</button></span>';
      }).join('') +
      '</div>' +
      '<form class="adm-inline" id="admResForm">' +
      '<input class="input" id="admResInput" maxlength="16" placeholder="예약어 (영문·숫자)" autocomplete="off" />' +
      '<button class="adm-btn adm-btn--primary" type="submit">추가</button>' +
      '</form>' +
      '<p class="adm-hint">예약어는 품 주소 입력 즉시 “시스템 예약어로 사용할 수 없습니다”로 차단됩니다.</p>' +
      '</div></section>'
    );
  }

  function bindMembers(app) {
    var main = app.querySelector('#adminMain');

    main.querySelectorAll('[data-adm-member]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-adm-member');
        var m = AD().members.filter(function (x) {
          return x.id === id;
        })[0];
        if (!m) return;
        var next = m.status === 'suspended' ? 'active' : 'suspended';
        Pum.update(function (st) {
          var target = st.admin.members.filter(function (x) {
            return x.id === id;
          })[0];
          if (target) target.status = next;
          Pum.logAudit('회원 @' + (m.slug || m.email) + ' 상태 변경: ' + (next === 'suspended' ? '정지' : '정상') + ' (관리자)');
        });
        Pum.toast(next === 'suspended' ? '회원을 정지했습니다' : '정지 해제했습니다');
        renderTab(app);
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
          input.focus();
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

  /* -------------------------------------------------------- 공지·초대 배너 */
  function bannerHTML() {
    var ad = AD();
    var b = ad.banner;
    return (
      headHTML('공지 · 초대 배너', '여기서 저장한 문구가 사용자 품 공유 페이지의 상단 공지와 『품 무료 만들기』 배너에 즉시 반영됩니다.') +
      '<div class="adm-cols">' +
      '<section class="adm-card">' +
      '<div class="adm-card__head"><h2>상단 공지</h2>' +
      '<label class="switch switch--sm"><input type="checkbox" id="admNoticeOn"' + (ad.notice.on ? ' checked' : '') + ' /><span class="switch__track"></span></label></div>' +
      '<div class="adm-card__body">' +
      '<label class="field__label" for="admNoticeText">공지 문구</label>' +
      '<textarea class="textarea" id="admNoticeText" rows="3">' + esc(ad.notice.text || '') + '</textarea>' +
      '<div class="adm-row-end"><button type="button" class="adm-btn adm-btn--primary" id="admNoticeSave">공지 저장</button></div>' +
      '<p class="adm-hint">스위치를 끄면 공지가 공유 페이지에서 숨겨집니다.</p>' +
      '</div></section>' +

      '<section class="adm-card">' +
      '<div class="adm-card__head"><h2>『품 무료 만들기』 배너</h2></div>' +
      '<div class="adm-card__body">' +
      '<div class="adm-grid2">' +
      '<div><label class="field__label" for="admEyebrow">상단 문구</label>' +
      '<input class="input" id="admEyebrow" value="' + esc(b.eyebrow) + '" /></div>' +
      '<div><label class="field__label" for="admBannerCta">버튼 문구</label>' +
      '<input class="input" id="admBannerCta" value="' + esc(b.cta) + '" /></div>' +
      '</div>' +
      '<label class="field__label" for="admBannerTitle">제목</label>' +
      '<input class="input" id="admBannerTitle" value="' + esc(b.title) + '" />' +
      '<label class="field__label" for="admBannerSub">부제</label>' +
      '<textarea class="textarea" id="admBannerSub" rows="2">' + esc(b.subtitle) + '</textarea>' +
      '<div class="adm-row-end"><button type="button" class="adm-btn adm-btn--primary" id="admBannerSave">배너 저장</button></div>' +
      '</div></section>' +
      '</div>' +
      '<section class="adm-card">' +
      '<div class="adm-card__head"><h2>사용자 화면 미리보기</h2><span class="adm-count">공유 페이지 반영 예시</span></div>' +
      '<div class="adm-card__body">' +
      '<div class="adm-preview" id="admBannerPreview"></div>' +
      '</div></section>'
    );
  }

  function bannerPreviewHTML() {
    var ad = AD();
    var b = ad.banner;
    return (
      (ad.notice.on && ad.notice.text
        ? '<div class="adm-preview__notice">' + esc(ad.notice.text) + '</div>'
        : '') +
      '<div class="adm-preview__free">' +
      '<span class="adm-preview__eyebrow">' + esc(b.eyebrow) + '</span>' +
      '<div class="adm-preview__title">' + esc(b.title) + '</div>' +
      '<div class="adm-preview__desc">' + esc(b.subtitle) + '</div>' +
      '<span class="adm-preview__cta">' + esc(b.cta) + ' →</span>' +
      '</div>'
    );
  }

  function bindBanner(app) {
    var main = app.querySelector('#adminMain');
    var preview = main.querySelector('#admBannerPreview');
    if (preview) preview.innerHTML = bannerPreviewHTML();

    main.querySelector('#admNoticeOn').addEventListener('change', function () {
      var on = this.checked;
      Pum.update(function (st) {
        st.admin.notice.on = on;
        Pum.logAudit('상단 공지 ' + (on ? '노출 ON' : '노출 OFF'));
      });
      if (preview) preview.innerHTML = bannerPreviewHTML();
      Pum.toast(on ? '상단 공지를 노출합니다' : '상단 공지를 숨겼습니다');
    });

    main.querySelector('#admNoticeSave').addEventListener('click', function () {
      var text = main.querySelector('#admNoticeText').value.trim();
      Pum.update(function (st) {
        st.admin.notice.text = text;
        Pum.logAudit('상단 공지 문구 수정');
      });
      if (preview) preview.innerHTML = bannerPreviewHTML();
      Pum.toast('공지를 저장했습니다');
    });

    function saveBanner() {
      var b = {
        eyebrow: main.querySelector('#admEyebrow').value.trim(),
        title: main.querySelector('#admBannerTitle').value.trim(),
        subtitle: main.querySelector('#admBannerSub').value.trim(),
        cta: main.querySelector('#admBannerCta').value.trim()
      };
      Pum.update(function (st) {
        st.admin.banner = b;
        Pum.logAudit('초대 배너 문구 수정');
      });
      if (preview) preview.innerHTML = bannerPreviewHTML();
      Pum.toast('배너 문구를 저장했습니다');
    }
    main.querySelector('#admBannerSave').addEventListener('click', saveBanner);
    ['#admEyebrow', '#admBannerTitle', '#admBannerSub', '#admBannerCta'].forEach(function (sel) {
      var el = main.querySelector(sel);
      if (el) el.addEventListener('change', saveBanner);
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
      headHTML('품스 콘텐츠 연동', 'pumss.co.kr 콘텐츠의 전역 노출과 문구를 관리합니다. 변경은 사용자 품 꾸미기와 공유 페이지에 즉시 반영됩니다.') +
      '<section class="adm-card">' +
      '<div class="adm-card__head"><h2 class="adm-title-sm">연동 상태</h2>' +
      '<div class="adm-sync"><span>최근 동기화 <b id="admSyncAt">' + esc(stampPretty(synced)) + '</b></span>' +
      '<button type="button" class="adm-btn adm-btn--primary adm-btn--sm" id="admPumssSync">품스 API 동기화</button></div></div>' +
      '<div class="adm-card__body adm-prow-list">' +
      rowToggle(
        'greeting',
        '반갑데이',
        '<label class="field__label" for="pt-greeting">섹션 제목</label>' +
          '<input class="input" id="pt-greeting" data-pumss-title="greeting" value="' + esc(items.greeting.title || '') + '" placeholder="기본값: 반갑데이" />'
      ) +
      rowToggle(
        'news',
        '일일뉴스',
        '<label class="field__label" for="pt-news">섹션 제목</label>' +
          '<input class="input" id="pt-news" data-pumss-title="news" value="' + esc(items.news.title || '') + '" placeholder="기본값: 헤드라인 NEWS" />'
      ) +
      rowToggle(
        'quote',
        '오늘의 명언',
        '<div class="adm-grid2">' +
          '<div><label class="field__label" for="pt-quote">명언 문구</label>' +
          '<input class="input" id="pt-quote" data-pumss-text="quote" value="' + esc(items.quote.text || '') + '" placeholder="기본값: 각 품에 저장된 명언" /></div>' +
          '<div><label class="field__label" for="pa-quote">지은이</label>' +
          '<input class="input" id="pa-quote" data-pumss-author="quote" value="' + esc(items.quote.author || '') + '" placeholder="기본값: 각 품에 저장된 지은이" /></div>' +
          '</div>'
      ) +
      rowToggle(
        'recs',
        '추천 컨텐츠',
        '<label class="field__label" for="pt-recs">섹션 제목</label>' +
          '<input class="input" id="pt-recs" data-pumss-title="recs" value="' + esc(items.recs.title || '') + '" placeholder="기본값: 추천 컨텐츠" />'
      ) +
      rowToggle(
        'apptech',
        '앱테크 (8종)',
        '<label class="field__label" for="pt-apptech">섹션 제목</label>' +
          '<input class="input" id="pt-apptech" data-pumss-title="apptech" value="' + esc(items.apptech.title || '') + '" placeholder="기본값: 앱테크" />' +
          '<div class="adm-apps">' +
          (items.apptech.items || []).map(function (it, i) {
            return (
              '<div class="adm-approw">' +
              '<div class="adm-approw__label">' + esc(APP_LABEL[i] || '앱테크 ' + (i + 1)) + '</div>' +
              '<label class="switch switch--sm"><input type="checkbox" data-apptech-on="' + i + '"' + (it.on !== false ? ' checked' : '') + ' aria-label="' + esc(APP_LABEL[i] || '') + ' 노출" /><span class="switch__track"></span></label>' +
              '<input class="input adm-input--sm" data-apptech-title="' + i + '" value="' + esc(it.title || '') + '" placeholder="제목 수정" />' +
              '<input class="input adm-input--sm" data-apptech-desc="' + i + '" value="' + esc(it.desc || '') + '" placeholder="문구 수정" />' +
              '</div>'
            );
          }).join('') +
          '</div>'
      ) +
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

    function saveApp(field, prop) {
      main.querySelectorAll('[data-apptech-' + field + ']').forEach(function (el) {
        el.addEventListener('change', function () {
          var i = Number(el.getAttribute('data-apptech-' + field));
          var value = el.value.trim();
          Pum.update(function (st) {
            st.admin.pumss.items.apptech.items[i][prop] = value;
            Pum.logAudit('앱테크 ' + (APP_LABEL[i] || i + 1) + ' ' + prop + ' 수정');
          });
        });
      });
    }
    saveApp('title', 'title');
    saveApp('desc', 'desc');
  }

  /* -------------------------------------------------------- 신고·감사 로그 */
  function reportsHTML() {
    var ad = AD();
    return (
      headHTML('신고 · 차단 이력 & 감사 로그', '접수된 신고를 처리하고 관리자 변경 이력을 확인합니다.') +
      '<section class="adm-card">' +
      '<div class="adm-card__head"><h2>신고 접수</h2><span class="adm-count">' + num((ad.reports || []).filter(function (r) { return r.status !== '처리완료'; }).length) + '건 미처리</span></div>' +
      '<div class="adm-table-wrap"><table class="adm-table">' +
      '<thead><tr><th>대상</th><th>사유</th><th>신고자</th><th>접수 시각</th><th>상태</th><th></th></tr></thead><tbody>' +
      (ad.reports || []).map(function (r) {
        var done = r.status === '처리완료';
        return (
          '<tr><td><b>' + esc(r.target) + '</b></td><td>' + esc(r.reason) + '</td>' +
          '<td class="adm-muted">' + esc(r.reporter) + '</td><td class="adm-muted">' + esc(r.at) + '</td>' +
          '<td><span class="adm-pill ' + (done ? 'adm-pill--ok' : 'adm-pill--wait') + '">' + esc(r.status) + '</span></td>' +
          '<td class="adm-right">' + (done ? '<span class="adm-muted">-</span>' : '<button type="button" class="adm-btn adm-btn--sm" data-adm-report="' + esc(r.id) + '">처리 완료</button>') + '</td></tr>'
        );
      }).join('') +
      '</tbody></table></div></section>' +
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
    main.querySelectorAll('[data-adm-report]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-adm-report');
        var r = AD().reports.filter(function (x) {
          return x.id === id;
        })[0];
        Pum.update(function (st) {
          var t = st.admin.reports.filter(function (x) {
            return x.id === id;
          })[0];
          if (t) t.status = '처리완료';
          Pum.logAudit('신고 처리 완료: ' + (r ? r.target : id));
        });
        Pum.toast('신고를 처리 완료로 바꿨습니다');
        renderTab(app);
      });
    });
  }

  Pum.adminView = adminView;
  Pum.views = Pum.views || {};
  Pum.views.admin = adminView;
})(window);
