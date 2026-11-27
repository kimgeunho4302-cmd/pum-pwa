/* ==========================================================================
   품 꾸미기 PWA — admin.js
   · 공통 관리 데이터 계층 (품 주소 검사 · 품스 콘텐츠 · 통계 · 감사 로그)
   · 회원용 관리(#/admin): 본인 품 대시보드 · 구독 목록(PUSH) · 소유자 공지사항
   운영 관리자 화면은 ops-admin.js (#/ops-admin)
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
    if (!value) return '기록 없음';
    var d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return stamp(d);
  }
  function num(n) {
    return Number(n || 0).toLocaleString('ko-KR');
  }
  Pum.adminUtil = { stamp: stamp, stampPretty: stampPretty, num: num, lower: lower };

  /* ----------------------------------------------------------------------
     회원 동기화 · 조회
     ---------------------------------------------------------------------- */
  Pum.adminSyncUser = function () {
    var st = S();
    var user = st.auth.user || {};
    if (!st.auth.loggedIn) return null;
    /* 아이디가 이메일이 아닌(휴대전화번호) 회원도 관리자 목록에 연결합니다. */
    var loginId = String(user.loginId || user.email || user.phone || '').trim();
    if (!loginId) return null;
    var email = lower(user.email);
    var phoneDigits = Pum.digits(user.phone);
    var list = AD().members;
    var m = list.filter(function (x) {
      if (email && lower(x.email) === email) return true;
      if (lower(x.loginId) === lower(loginId)) return true;
      return !!(phoneDigits && Pum.digits(x.phone) === phoneDigits);
    })[0];
    var changed = false;

    /* 가입 계정에 저장된 마케팅 정보 수신 동의(선택) 기록 */
    var account = null;
    try {
      account = Pum.findAccount ? Pum.findAccount(user.loginId || user.email || user.phone) : null;
    } catch (e) {
      account = null;
    }
    var consent = account && account.consents ? account.consents.marketing === true : null;
    var consentAt = (account && account.consents && account.consents.at) || '';

    if (!m) {
      m = {
        id: 'm-' + Date.now().toString(36),
        name: user.name || loginId.split('@')[0],
        email: user.email || '',
        loginId: loginId,
        phone: user.phone || '',
        slug: st.profile.slug || '',
        status: 'active',
        joinedAt: new Date().toISOString().slice(0, 10),
        views: 0,
        todayViews: 0,
        suspendReason: '',
        deletedAt: '',
        marketingConsent: consent === true,
        marketingConsentAt: consent === true ? consentAt : ''
      };
      list.push(m);
      changed = true;
    } else {
      if (user.name && m.name !== user.name) {
        m.name = user.name;
        changed = true;
      }
      if (user.phone && m.phone !== user.phone) {
        m.phone = user.phone;
        changed = true;
      }
      if (!m.loginId && loginId) {
        m.loginId = loginId;
        changed = true;
      }
      if (st.profile.slug && m.slug !== st.profile.slug) {
        m.slug = st.profile.slug;
        changed = true;
      }
      if (consent !== null && m.marketingConsent !== consent) {
        m.marketingConsent = consent;
        m.marketingConsentAt = consent ? consentAt : '';
        changed = true;
      } else if (consent === true && consentAt && !m.marketingConsentAt) {
        m.marketingConsentAt = consentAt;
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
  Pum.memberBySlug = memberBySlug;

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
  Pum.currentMember = currentMember;

  /** 현재 품(로그인 사용자 또는 품 주소 주인)이 관리자에 의해 정지되었는지 */
  Pum.memberSuspended = function () {
    var m = currentMember();
    return !!(m && (m.status === 'suspended' || m.status === 'reported' || m.status === 'deleted'));
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

    /* 내 계정이 이미 쓰고 있는 주소는 '사용 중'으로 보지 않습니다. */
    var me = lower(((S().auth || {}).user || {}).email);
    var clash = (AD().members || []).filter(function (m) {
      return (
        m.slug &&
        lower(m.slug) === low &&
        lower(m.slug) !== own &&
        lower(m.email) !== me
      );
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
     감사 로그 · 조회/클릭 통계 (진입 경로 포함)
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

  var SOURCE_LABEL = {
    google: '구글',
    kakao: '카카오톡',
    naver: '네이버',
    instagram: '인스타그램',
    direct: '직접 유입',
    internal: '내부 이동'
  };
  Pum.sourceLabel = function (key) {
    return SOURCE_LABEL[key] || '기타';
  };

  var CLICK_LABEL = {
    share: '공유하기 버튼',
    qr: 'QR 버튼',
    inquiry: '1:1문의 버튼',
    bizcard: '전자명함 버튼',
    'dismiss-notice': '공지 닫기',
    banner: '배너 링크',
    link: '본문 링크'
  };
  Pum.clickLabel = function (key) {
    return CLICK_LABEL[key] || key;
  };

  function detectSource() {
    var ref = '';
    try {
      ref = document.referrer || '';
    } catch (e) {
      ref = '';
    }
    var ua = navigator.userAgent || '';
    if (/kakaotalk|kakao/i.test(ua) || /kakao\.com|kakaocorp/i.test(ref)) return 'kakao';
    if (/instagram/i.test(ref) || /instagram/i.test(ua)) return 'instagram';
    if (/google\./i.test(ref)) return 'google';
    if (/naver\./i.test(ref)) return 'naver';
    if (!ref) return 'direct';
    try {
      if (ref.indexOf(location.origin) === 0) return 'internal';
    } catch (e) {
      /* ignore */
    }
    return 'direct';
  }

  function bump(kind, type) {
    var st = S();
    var stats = st.admin.stats;
    var today = Pum.util.todayStamp();
    if (stats.day !== today) {
      stats.day = today;
      stats.todayViews = 0;
      stats.todayClicks = 0;
      (st.admin.members || []).forEach(function (m) {
        m.todayViews = 0;
      });
    }
    var m = currentMember();
    if (kind === 'view') {
      stats.views = Number(stats.views || 0) + 1;
      stats.todayViews = Number(stats.todayViews || 0) + 1;
      var src = detectSource();
      stats.sources = stats.sources || {};
      stats.sources[src] = Number(stats.sources[src] || 0) + 1;
      if (m) {
        m.views = Number(m.views || 0) + 1;
        m.todayViews = Number(m.todayViews || 0) + 1;
        m.lastSource = src;
      }
    } else {
      stats.clicks = Number(stats.clicks || 0) + 1;
      stats.todayClicks = Number(stats.todayClicks || 0) + 1;
      var key = type || 'etc';
      stats.blockClicks = stats.blockClicks || {};
      stats.blockClicks[key] = Number(stats.blockClicks[key] || 0) + 1;
      if (m) m.clicks = Number(m.clicks || 0) + 1;
    }
    Pum.save({ silent: true });
  }

  Pum.track = {
    view: function () {
      bump('view');
    },
    click: function (type) {
      bump('click', type);
    },
    source: detectSource
  };

  /* ----------------------------------------------------------------------
     회원용 관리 화면 (#/admin)
     ---------------------------------------------------------------------- */
  var MEMBER_TABS = [
    { id: 'dashboard', label: '대시보드', icon: 'preview' },
    { id: 'inquiries', label: '1:1 문의', icon: 'info' },
    { id: 'subscribers', label: '구독 목록', icon: 'card' },
    { id: 'notices', label: '공지사항', icon: 'info' }
  ];

  function adminView(app) {
    var m = Pum.adminSyncUser();
    if (!m) {
      app.innerHTML = '<main class="lock"><div class="lock__card"><h1 class="lock__title">로그인이 필요합니다</h1></div></main>';
      return;
    }
    if (m.status === 'suspended' || m.status === 'deleted') {
      app.innerHTML =
        '<main class="lock"><div class="lock__card">' +
        '<div class="lock__icon lock__icon--stop">' + icon('lock') + '</div>' +
        '<h1 class="lock__title">이용이 제한된 계정입니다</h1>' +
        '<p class="lock__desc">' +
        (m.status === 'deleted' ? '삭제 처리된 계정입니다.' : '운영 정책에 따라 정지된 계정입니다.') +
        (m.suspendReason ? '<br/>사유: ' + esc(m.suspendReason) : '') +
        '<br/>문의: support@pumss.co.kr</p>' +
        '</div></main>';
      return;
    }

    app.innerHTML =
      '<div class="admin">' +
      '<header class="admin__bar">' +
      '<div class="admin__brand">' +
      '<span class="admin__logo">품</span>' +
      '<span class="admin__brandtext">내 품 관리<small>@' + esc(S().profile.slug || '주소 미설정') + '</small></span>' +
      '<span class="admin__tag admin__tag--user">MEMBER</span>' +
      '</div>' +
      '<div class="admin__actions">' +
      '<button type="button" class="adm-btn adm-btn--icon" data-nav="home" aria-label="품 꾸미기 홈으로" title="품 꾸미기">' + icon('home') + '</button>' +
      Pum.fontToggleHTML() +
      '</div>' +
      '</header>' +
      '<div class="admin__layout">' +
      '<nav class="admin__nav" aria-label="내 품 관리 메뉴">' +
      MEMBER_TABS.map(function (t) {
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

  function headHTML(title, desc) {
    return (
      '<div class="adm-head"><div><h1 class="adm-title">' + esc(title) + '</h1>' +
      '<p class="adm-desc">' + esc(desc) + '</p></div>' +
      '<span class="adm-updated">최근 갱신 ' + esc(stamp()) + '</span></div>'
    );
  }

  function renderTab(app) {
    var main = app.querySelector('#adminMain');
    if (!main) return;
    if (tab === 'subscribers') main.innerHTML = subscribersHTML();
    else if (tab === 'notices') main.innerHTML = noticesHTML();
    else if (tab === 'inquiries') main.innerHTML = inquiriesHTML();
    else main.innerHTML = memberDashHTML();

    if (tab === 'subscribers') bindSubscribers(app);
    else if (tab === 'notices') bindNotices(app);
    else if (tab === 'inquiries') bindInquiries(app);
  }

  /* --------------------------------------------------- 회원 대시보드 (본인 품만) */
  function memberDashHTML() {
    var st = S();
    var m = currentMember() || {};
    var p = st.profile;
    var subs = (st.admin.subscribers || []).filter(function (s) {
      return s.status !== 'unsub';
    });
    var myNotices = myNotifications().slice(0, 4);
    var sourceRows = Object.keys(st.admin.stats.sources || {});
    var inqList = myInquiries();
    var inqNew = inqList.filter(function (q) {
      return inqStatus(q) === 'new';
    }).length;
    var inqDone = inqList.filter(function (q) {
      return inqStatus(q) === 'answered';
    }).length;

    return (
      headHTML('대시보드', '내 품의 조회·구독 현황을 확인합니다.') +
      '<div class="adm-stats">' +
      statCard('누적 조회', num(m.views), '오늘 +' + num(m.todayViews)) +
      statCard('누적 클릭', num(m.clicks), '블록 링크 클릭') +
      statCard('구독자', num(subs.length) + '명', '전체 ' + num((st.admin.subscribers || []).length) + '명') +
      statCard('1:1 문의', num(inqList.length) + '건', '신규 ' + num(inqNew) + ' · 답변완료 ' + num(inqDone)) +
      statCard('공지사항', num(myNotifications().length) + '건', '운영관리자 발송') +
      '</div>' +
      '<div class="adm-cols">' +
      '<section class="adm-card"><div class="adm-card__head"><h2>내 품 정보</h2>' +
      '<button type="button" class="adm-btn adm-btn--sm adm-btn--ghost" data-nav="editor">수정</button></div>' +
      '<div class="adm-card__body"><ul class="adm-kv">' +
      '<li><span>품 주소</span><b>' + (p.slug ? '@' + esc(p.slug) : '미설정') + '</b></li>' +
      '<li><span>공개 설정</span><b>' +
      (st.settings.visibility === 'private' ? '비공개(비밀번호)' : st.settings.visibility === 'unlisted' ? '미공개(링크 공유)' : '전체공개') +
      '</b></li>' +
      '<li><span>블록</span><b>' + num((st.blocks || []).filter(function (b) { return b.on !== false; }).length) + '개 노출</b></li>' +
      '<li><span>최근 유입</span><b>' + esc(Pum.sourceLabel(m.lastSource || st.admin.stats.day ? (m.lastSource || 'direct') : 'direct')) + '</b></li>' +
      '</ul>' +
      '</div></section>' +

      '<section class="adm-card"><div class="adm-card__head"><h2>최근 공지 · PUSH</h2>' +
      '<button type="button" class="adm-btn adm-btn--sm adm-btn--ghost" data-adm-goto="notices">전체</button></div>' +
      '<div class="adm-card__body">' +
      (myNotices.length
        ? '<ul class="adm-log">' + myNotices.map(function (n) {
            return '<li><span class="adm-log__time">' + esc((n.sentAt || n.scheduledAt || n.at || '').slice(0, 10)) + '</span>' +
              '<span class="adm-log__text">' + esc(n.title) + '</span></li>';
          }).join('') + '</ul>'
        : '<p class="adm-hint">아직 받은 공지가 없습니다.</p>') +
      '</div></section>' +
      '</div>' +

      '<section class="adm-card"><div class="adm-card__head"><h2>조회 유입 경로</h2><span class="adm-count">누적 ' + num(st.admin.stats.views) + '회</span></div>' +
      '<div class="adm-card__body"><div class="adm-sources">' +
      sourceRows.map(function (k) {
        var v = Number(st.admin.stats.sources[k] || 0);
        var total = Math.max(1, Number(st.admin.stats.views || 0));
        return '<div class="adm-source"><span>' + esc(Pum.sourceLabel(k)) + '</span>' +
          '<div class="adm-bar"><i style="width:' + Math.round((v / total) * 100) + '%"></i></div>' +
          '<b>' + num(v) + '</b></div>';
      }).join('') +
      '</div></div></section>'
    );
  }

  function statCard(label, value, sub) {
    return (
      '<div class="adm-stat"><span class="adm-stat__label">' + esc(label) + '</span>' +
      '<strong class="adm-stat__value">' + esc(value == null ? '0' : value) + '</strong>' +
      '<span class="adm-stat__sub">' + esc(sub || '') + '</span></div>'
    );
  }

  /** 내가 대상인 공지 (전체 / 신규 / 나) */
  function myNotifications() {
    var st = S();
    var m = currentMember() || {};
    var slug = lower(st.profile.slug || m.slug || '');
    var email = lower((st.auth.user || {}).email || '');
    return (st.admin.notifications || []).filter(function (n) {
      if (n.channel === 'push' && n.target === 'individual') {
        return lower(n.targetEmail || '') === email || lower(n.targetSlug || '') === slug;
      }
      return n.target === 'all' || n.target === 'new';
    });
  }

  /* ------------------------------------------------- 1:1 문의 (공유 페이지 접수) */
  var INQ_STATUS = {
    new: { text: '신규', cls: 'adm-pill--wait' },
    read: { text: '확인', cls: 'adm-pill--ok' },
    answered: { text: '답변완료', cls: 'adm-pill--ok' }
  };

  function inqStatus(q) {
    return q && INQ_STATUS[q.status] ? q.status : 'new';
  }

  function inqPill(q) {
    var st = INQ_STATUS[inqStatus(q)];
    return '<span class="adm-pill ' + st.cls + '">' + st.text + '</span>';
  }

  /** 내 품 주소로 접수된 문의 — 주소가 비어 있는 예전 기록도 함께 보여줍니다. */
  function myInquiries() {
    var st = S();
    var mine = currentMember() || {};
    var mySlug = lower(st.profile.slug || mine.slug || '');
    return (st.inquiries || [])
      .filter(function (q) {
        var qs = lower(q.slug || '');
        if (!mySlug) return true;
        return !qs || qs === mySlug;
      })
      .slice()
      .sort(function (a, b) {
        return new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime();
      });
  }

  function inquiriesHTML() {
    var list = myInquiries();
    var news = list.filter(function (q) {
      return inqStatus(q) === 'new';
    }).length;
    var reads = list.filter(function (q) {
      return inqStatus(q) === 'read';
    }).length;
    var done = list.filter(function (q) {
      return inqStatus(q) === 'answered';
    }).length;

    return (
      headHTML('1:1 문의', '공유 페이지에서 접수된 문의입니다. 확인 후 답변 상태를 관리할 수 있습니다.') +
      '<div class="adm-stats">' +
      statCard('전체 문의', num(list.length) + '건', '최근 접수 순') +
      statCard('신규', num(news) + '건', '아직 확인 전') +
      statCard('확인', num(reads) + '건', '확인 표시') +
      statCard('답변완료', num(done) + '건', '처리 완료') +
      '</div>' +
      '<section class="adm-card">' +
      '<div class="adm-card__head"><h2>문의 목록</h2><span class="adm-count">' + num(list.length) + '건</span></div>' +
      (list.length
        ? '<div class="adm-table-wrap"><table class="adm-table">' +
          '<thead><tr><th>접수 일시</th><th>보낸 사람</th><th>연락처</th><th>문의 내용</th><th>상태</th><th></th></tr></thead><tbody>' +
          list
            .map(function (q) {
              var text = String(q.body || '');
              var short = text.length > 46 ? text.slice(0, 46) + '…' : text;
              return (
                '<tr>' +
                '<td class="adm-muted">' + esc(Pum.util.dateLabel(q.at) || '-') + '</td>' +
                '<td><b>' + esc(q.name || '-') + '</b>' +
                (q.slug ? '<div class="adm-muted" style="font-size:11px">@' + esc(q.slug) + '</div>' : '') +
                '</td>' +
                '<td class="adm-muted">' + esc(q.contact || '-') + '</td>' +
                '<td>' + esc(short) + '</td>' +
                '<td>' + inqPill(q) + '</td>' +
                '<td class="adm-right">' +
                (inqStatus(q) === 'new'
                  ? '<button type="button" class="adm-btn adm-btn--sm adm-btn--ghost" data-inq-read="' + esc(q.id) + '">확인</button> '
                  : '') +
                '<button type="button" class="adm-btn adm-btn--sm" data-inq-open="' + esc(q.id) + '">상세 · 답변</button>' +
                '</td></tr>'
              );
            })
            .join('') +
          '</tbody></table></div>'
        : '<div class="adm-card__body"><p class="adm-hint">아직 접수된 문의가 없습니다. 내 품 공유 페이지의 <b>1:1문의</b> 버튼으로 접수되면 이 목록에 바로 표시됩니다.</p></div>') +
      '</section>'
    );
  }

  function bindInquiries(app) {
    var main = app.querySelector('#adminMain');
    if (!main) return;
    main.querySelectorAll('[data-inq-open]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        inquiryModal(btn.getAttribute('data-inq-open'));
      });
    });
    main.querySelectorAll('[data-inq-read]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-inq-read');
        Pum.update(function (st) {
          var q = (st.inquiries || []).filter(function (x) {
            return x.id === id;
          })[0];
          if (q) {
            q.status = 'read';
            q.readAt = stamp();
          }
        });
        Pum.toast('문의를 확인 처리했습니다');
        renderTab(app);
      });
    });
  }

  function inquiryModal(id) {
    var q = (S().inquiries || []).filter(function (x) {
      return x.id === id;
    })[0];
    if (!q) return;
    var status = inqStatus(q);
    var body =
      '<ul class="adm-kv">' +
      '<li><span>보낸 사람</span><b>' + esc(q.name || '-') + '</b></li>' +
      '<li><span>연락처</span><b>' + esc(q.contact || '-') + '</b></li>' +
      '<li><span>품 주소</span><b>' + (q.slug ? '@' + esc(q.slug) : '미지정') + '</b></li>' +
      '<li><span>접수 일시</span><b>' + esc(Pum.util.dateLabel(q.at) || '-') + '</b></li>' +
      '<li><span>상태</span><b>' + inqPill(q) + '</b></li>' +
      '</ul>' +
      '<h3 class="adm-subtitle">문의 내용</h3>' +
      '<div class="adm-inquiry">' + esc(q.body || '') + '</div>' +
      '<div class="field"><label class="field__label" for="inqReply">답변 메모 (선택)</label>' +
      '<textarea class="textarea" id="inqReply" rows="3" placeholder="답변 내용을 기록해 두세요">' + esc(q.reply || '') + '</textarea></div>' +
      (q.answeredAt ? '<p class="adm-hint">답변 완료 · ' + esc(q.answeredAt) + '</p>' : '');

    Pum.modal({
      title: '1:1 문의 상세',
      desc: (q.name || '보낸 사람') + ' · ' + (Pum.util.dateLabel(q.at) || ''),
      body: body,
      actions: [
        { label: '닫기', kind: 'ghost' },
        {
          label: status === 'new' ? '확인 표시' : '신규로 되돌리기',
          kind: 'ghost',
          onClick: function (api) {
            var reply = api.body.querySelector('#inqReply').value.trim();
            var next = status === 'new' ? 'read' : 'new';
            Pum.update(function (st) {
              var t = (st.inquiries || []).filter(function (x) {
                return x.id === id;
              })[0];
              if (!t) return;
              t.status = next;
              t.readAt = next === 'read' ? stamp() : '';
              t.reply = reply;
            });
            Pum.toast(next === 'read' ? '확인 처리했습니다' : '신규 상태로 되돌렸습니다');
            renderTab(document.getElementById('app'));
          }
        },
        {
          label: '답변 완료',
          kind: 'primary',
          onClick: function (api) {
            var reply = api.body.querySelector('#inqReply').value.trim();
            Pum.update(function (st) {
              var t = (st.inquiries || []).filter(function (x) {
                return x.id === id;
              })[0];
              if (!t) return;
              t.status = 'answered';
              t.reply = reply;
              t.readAt = t.readAt || stamp();
              t.answeredAt = stamp();
            });
            Pum.toast('답변 완료로 처리했습니다');
            renderTab(document.getElementById('app'));
          }
        }
      ]
    });
  }

  /* ------------------------------------------------------------- 구독 목록 */
  function subscribersHTML() {
    var subs = S().admin.subscribers || [];
    var pushLog = S().admin.pushLog || [];
    return (
      headHTML('구독 목록', '내 품을 구독한 사람입니다. 전체 또는 개별로 PUSH를 보낼 수 있습니다.') +
      '<section class="adm-card">' +
      '<div class="adm-card__head"><h2>구독자</h2><span class="adm-count">' + num(subs.filter(function (s) { return s.status !== 'unsub'; }).length) + '명</span>' +
      '<button type="button" class="adm-btn adm-btn--primary adm-btn--sm" id="admPushAll" style="margin-left:auto">' + icon('share') + '전체 PUSH</button></div>' +
      '<div class="adm-table-wrap"><table class="adm-table">' +
      '<thead><tr><th>이름</th><th>이메일</th><th>구독일</th><th>상태</th><th></th></tr></thead><tbody>' +
      (subs.length
        ? subs.map(function (s) {
            var off = s.status === 'unsub';
            return '<tr><td><b>' + esc(s.name) + '</b></td>' +
              '<td class="adm-muted">' + esc(s.email) + '</td>' +
              '<td class="adm-muted">' + esc(s.joinedAt) + '</td>' +
              '<td><span class="adm-pill ' + (off ? 'adm-pill--stop' : 'adm-pill--ok') + '">' + (off ? '수신거부' : '구독중') + '</span></td>' +
              '<td class="adm-right"><button type="button" class="adm-btn adm-btn--sm" data-push-one="' + esc(s.id) + '"' + (off ? ' disabled' : '') + '>개별 PUSH</button></td></tr>';
          }).join('')
        : '<tr><td colspan="5" class="adm-muted">구독자가 없습니다.</td></tr>') +
      '</tbody></table></div>' +
      '<p class="adm-hint">PUSH는 해당 구독자의 이메일로 발송되는 데모 시뮬레이션입니다. 실제 발송은 메일·푸시 서버 연동 후 동작합니다.</p>' +
      '</section>' +
      '<section class="adm-card">' +
      '<div class="adm-card__head"><h2>PUSH 발송 이력</h2><span class="adm-count">' + num(pushLog.length) + '건</span></div>' +
      '<div class="adm-card__body"><ul class="adm-log adm-log--full">' +
      (pushLog.length
        ? pushLog.map(function (p) {
            return '<li><span class="adm-log__time">' + esc(p.at) + '</span>' +
              '<span class="adm-log__text"><b>' + esc(p.title) + '</b> · ' + esc(p.body) + '</span>' +
              '<span class="adm-log__who">' + esc(p.to) + '</span></li>';
          }).join('')
        : '<li class="adm-muted">발송 이력이 없습니다.</li>') +
      '</ul></div></section>'
    );
  }

  function bindSubscribers(app) {
    var main = app.querySelector('#adminMain');

    main.querySelector('#admPushAll').addEventListener('click', function () {
      var subs = (S().admin.subscribers || []).filter(function (s) {
        return s.status !== 'unsub';
      });
      if (!subs.length) {
        Pum.toast('구독자가 없습니다', 'err');
        return;
      }
      pushComposer('전체 구독자 ' + subs.length + '명', subs);
    });

    main.querySelectorAll('[data-push-one]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-push-one');
        var sub = (S().admin.subscribers || []).filter(function (s) {
          return s.id === id;
        })[0];
        if (!sub) return;
        pushComposer(sub.name + ' (' + sub.email + ')', [sub]);
      });
    });
  }

  function pushComposer(label, targets) {
    var body =
      '<div class="map-note">' + icon('info') +
      '<span>받는 사람: <b>' + esc(label) + '</b><br/>' +
      targets
        .slice(0, 3)
        .map(function (t) {
          return esc(t.email);
        })
        .join(', ') +
      (targets.length > 3 ? ' 외 ' + (targets.length - 3) + '명' : '') +
      '</span></div>' +
      '<div class="field"><label class="field__label">제목</label><input class="input" id="pushTitle" maxlength="60" placeholder="예) 이번 주 반갑데이 특가 안내" /></div>' +
      '<div class="field"><label class="field__label">내용</label><textarea class="textarea" id="pushBody" rows="4" maxlength="300" placeholder="구독자에게 보낼 내용을 입력하세요"></textarea></div>';

    Pum.modal({
      title: 'PUSH 보내기',
      body: body,
      actions: [
        { label: '취소', kind: 'ghost' },
        {
          label: '발송',
          kind: 'primary',
          onClick: function (api) {
            var title = api.body.querySelector('#pushTitle').value.trim();
            var text = api.body.querySelector('#pushBody').value.trim();
            if (!title || !text) {
              Pum.toast('제목과 내용을 입력해 주세요', 'err');
              return false;
            }
            Pum.update(function (st) {
              st.admin.pushLog.unshift({
                id: 'p-' + Date.now().toString(36),
                at: stamp(),
                to: label,
                title: title,
                body: text
              });
              if (st.admin.pushLog.length > 30) st.admin.pushLog.length = 30;
              st.admin.mailLog = st.admin.mailLog || [];
              targets.forEach(function (t) {
                st.admin.mailLog.unshift({
                  id: 'ml-' + Math.random().toString(36).slice(2, 8),
                  at: stamp(),
                  to: t.email,
                  subject: '[품 PUSH] ' + title,
                  body: text,
                  kind: 'push'
                });
              });
            });
            Pum.toast('PUSH를 발송했습니다 (데모)');
            renderTab(document.getElementById('app'));
          }
        }
      ]
    });
  }

  /* --------------------------------------------------- 소유자 공지사항 페이지 */
  function noticesHTML() {
    var list = myNotifications();
    return (
      headHTML('공지사항', '운영관리자가 보낸 공지와 PUSH를 확인합니다. (품 소유자만 볼 수 있습니다)') +
      '<section class="adm-card"><div class="adm-card__head"><h2>받은 공지</h2><span class="adm-count">' + num(list.length) + '건</span></div>' +
      '<div class="adm-card__body">' +
      (list.length
        ? '<div class="notice-list">' + list.map(function (n) {
            var when = n.sentAt || n.scheduledAt || n.at || '';
            return '<article class="notice-item">' +
              '<div class="notice-item__top">' +
              '<span class="adm-pill ' + (n.channel === 'push' ? 'adm-pill--wait' : 'adm-pill--ok') + '">' + (n.channel === 'push' ? 'PUSH' : '공지') + '</span>' +
              '<b>' + esc(n.title) + '</b>' +
              '<span class="notice-item__time">' + esc(String(when).slice(0, 16)) + '</span>' +
              '</div>' +
              '<p class="notice-item__body">' + esc(n.body) + '</p>' +
              (n.status === 'scheduled' ? '<span class="notice-item__sched">예약 발송 · ' + esc(n.scheduledAt || '') + '</span>' : '') +
              '</article>';
          }).join('') + '</div>'
        : '<p class="adm-hint">받은 공지가 없습니다.</p>') +
      '</div></section>' +
      '<section class="adm-card"><div class="adm-card__head"><h2>알림 설정</h2></div><div class="adm-card__body">' +
      '<label class="check-row"><input type="checkbox" id="admNoticeOptPush" checked /><span>PUSH 수신 (이메일)</span></label>' +
      '<label class="check-row"><input type="checkbox" id="admNoticeOptMail" checked /><span>공지 메일 수신</span></label>' +
      '<p class="adm-hint">수신 설정은 프로토타입 화면 확인용입니다.</p>' +
      '</div></section>'
    );
  }

  function bindNotices(app) {
    var main = app.querySelector('#adminMain');
    main.querySelectorAll('input[type="checkbox"].check-row, #admNoticeOptPush, #admNoticeOptMail').forEach(function (el) {
      el.addEventListener('change', function () {
        Pum.toast('알림 설정을 저장했습니다');
      });
    });
  }

  Pum.adminView = adminView;
  Pum.views = Pum.views || {};
  Pum.views.admin = adminView;
})(window);
