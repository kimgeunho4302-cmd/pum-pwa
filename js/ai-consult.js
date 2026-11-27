/* ==========================================================================
   품 꾸미기 PWA — ai-consult.js
   공유 페이지(#/share · #/p/@아이디) 전용 '🤖 AI 상담' 챗봇 위젯.
   - Cloudflare Agents Worker(/api/chat)가 설정되어 있으면 실제 AI 답변
   - 미설정·실패 시 페이지 정보 기반 '데모 응답' 으로 똑똑하게 답변
   - 챗봇 안에서 Worker URL 저장 · 연결 테스트(/api/health) 가능
   다른 화면(#/editor, #/admin, #/ops-admin …)에는 표시되지 않습니다.
   ========================================================================== */
(function (global) {
  'use strict';

  var Pum = global.Pum;
  if (!Pum) return;

  var WORKER_KEY = 'pum.ai.worker.v1';
  var SESSION_KEY = 'pum.ai.session.v1';
  var MAX_INPUT = 300;
  var API_TIMEOUT = 20000;

  var ui = {
    root: null,
    panel: null,
    feed: null,
    input: null,
    status: null,
    badge: null,
    settings: null,
    sending: false,
    greeted: false,
    messages: []
  };

  /* ---------------------------------------------------------------- 저장소 */
  function readWorkerUrl() {
    try {
      return (localStorage.getItem(WORKER_KEY) || '').trim();
    } catch (e) {
      return '';
    }
  }

  function writeWorkerUrl(url) {
    try {
      if (url) localStorage.setItem(WORKER_KEY, url);
      else localStorage.removeItem(WORKER_KEY);
    } catch (e) {
      /* 저장 실패는 무시 — 이번 세션 동안만 동작 */
    }
  }

  function normalizeUrl(raw) {
    var url = String(raw || '').trim();
    if (!url) return '';
    if (!/^https?:\/\//i.test(url)) {
      if (/^[\w.-]+\.[a-z]{2,}/i.test(url)) url = 'https://' + url;
      else return '';
    }
    return url.replace(/\/+$/, '');
  }

  function sessionId() {
    var id = '';
    try {
      id = localStorage.getItem(SESSION_KEY) || '';
    } catch (e) {
      id = '';
    }
    if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
      id = 'pum' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
      try {
        localStorage.setItem(SESSION_KEY, id);
      } catch (e) {
        /* ignore */
      }
    }
    return id;
  }

  /* ------------------------------------------------------- 페이지 정보 수집 */
  function isShareRoute() {
    var path = String(location.hash || '').replace(/^#/, '').split('?')[0];
    return path === '/share' || path.indexOf('/p/') === 0;
  }

  function shareTarget() {
    var path = String(location.hash || '').replace(/^#/, '').split('?')[0];
    if (path.indexOf('/p/') === 0) {
      try {
        return decodeURIComponent(path.slice(3)).replace(/^@/, '');
      } catch (e) {
        return path.slice(3);
      }
    }
    return '';
  }

  function snsName(icon) {
    try {
      var meta = Pum.snsMeta ? Pum.snsMeta(icon) : null;
      if (meta && meta.name) return meta.name;
    } catch (e) {
      /* ignore */
    }
    return String(icon || '링크');
  }

  function gatherContext() {
    var s = (Pum.getState && Pum.getState()) || {};
    var p = s.profile || {};

    /* 다른 회원의 품(#/p/@다른주소)을 보고 있을 때는 그 회원 정보만 사용합니다. */
    var target = shareTarget();
    var own = String(p.slug || '');
    if (target && (!own || target.toLowerCase() !== own.toLowerCase())) {
      var member = null;
      try {
        member = Pum.memberBySlug ? Pum.memberBySlug(target) : null;
      } catch (e) {
        member = null;
      }
      var memberName = (member && member.name) || '@' + target;
      return {
        profile: {
          title: memberName,
          intro: '',
          ownerName: memberName,
          slug: target,
          links: [],
          map: null
        },
        settings: s.settings || {}
      };
    }
    var links = [];
    var map = null;
    var seen = {};

    function pushLink(title, url, kind) {
      var u = String(url || '').trim();
      if (!u || seen[u]) return;
      if (!/^(https?:|mailto:|tel:)/i.test(u)) {
        if (u.indexOf('//') === 0) u = 'https:' + u;
        else if (/^[\w.-]+\.[a-z]{2,}/i.test(u)) u = 'https://' + u;
        else return;
      }
      seen[u] = 1;
      links.push({ title: String(title || u).slice(0, 60), url: u, kind: kind || '' });
    }

    (s.blocks || []).forEach(function (b) {
      if (!b || b.on === false) return;
      var d = b.data || {};
      if (b.type === 'sns') {
        (d.items || []).forEach(function (it) {
          if (!it || !it.url) return;
          var raw = String(it.url).trim();
          var url = raw;
          if (it.icon === 'phone') {
            url = 'tel:' + raw.replace(/^(tel:|phone:)/i, '').replace(/[^0-9+]/g, '');
          } else if (it.icon === 'email') {
            url = 'mailto:' + raw.replace(/^mailto:/i, '');
          }
          pushLink(snsName(it.icon), url, 'SNS');
        });
      } else if (b.type === 'textlink') {
        if (d.url) pushLink(d.label || d.url, d.url, '링크');
      } else if (['basic', 'nonlife', 'life', 'personal', 'corporate'].indexOf(b.type) >= 0) {
        var sec = Pum.pumssSectionOf ? Pum.pumssSectionOf(b.type) : null;
        var glob = (Pum.pumssItem && Pum.pumssItem(b.type)) || {};
        var flags = d.items || [];
        (sec ? sec.items : []).forEach(function (baseTitle, i) {
          if (flags[i] === false) return;
          var item = (glob.items || [])[i] || {};
          if (item.on === false) return;
          if (!item.url) return;
          pushLink(item.title || baseTitle, item.url, glob.title || sec.label || '서비스');
        });
      } else if (b.type === 'map') {
        var hasPoint = d.lat && d.lng;
        if (d.address || d.place || hasPoint) {
          map = {
            place: String(d.place || d.address || '').slice(0, 120),
            address: String(d.address || '').slice(0, 120)
          };
          if (hasPoint) {
            map.lat = Number(d.lat);
            map.lng = Number(d.lng);
          }
        }
      }
    });

    if (Pum.customGroups) {
      (Pum.customGroups() || []).forEach(function (g) {
        if (!g || g.on === false) return;
        (g.items || []).forEach(function (it) {
          if (it && it.on !== false && it.url) pushLink(it.title, it.url, g.title || g.name || '추가 영역');
        });
      });
    }

    var owner = String(p.title || '').trim();
    if (!owner && s.auth && s.auth.user) owner = String(s.auth.user.name || '').trim();

    return {
      profile: {
        title: String(p.title || '').trim(),
        intro: String(p.intro || '').trim(),
        ownerName: owner,
        slug: String(p.slug || shareTarget() || '').trim(),
        links: links.slice(0, 12),
        map: map
      },
      settings: s.settings || {}
    };
  }

  /* ------------------------------------------------------------ 데모 응답 */
  function firstName(ctx) {
    var t = ctx.profile.title || ctx.profile.ownerName || '';
    return t ? t : '이 페이지 주인';
  }

  function displayUrl(url) {
    return String(url || '').replace(/^tel:/i, '').replace(/^mailto:/i, '');
  }

  function linkLines(list, max) {
    return list
      .slice(0, max)
      .map(function (l, i) {
        return i + 1 + '. ' + l.title + ' — ' + displayUrl(l.url);
      })
      .join('\n');
  }

  function findContactLinks(ctx) {
    return ctx.profile.links.filter(function (l) {
      return /^mailto:/i.test(l.url) || /^tel:/i.test(l.url) || /전화|연락|이메일|메일|카톡|문자/i.test(l.title);
    });
  }

  function demoReply(message, ctx) {
    var q = String(message || '').toLowerCase();
    var p = ctx.profile;
    var links = p.links || [];
    var contact = findContactLinks(ctx);
    var has = function (re) {
      return re.test(q);
    };

    if (has(/문의|상담|예약|견적|가격|비용|얼마|요금|영업시간|언제|가능한가|신청/)) {
      var tail = '';
      if (contact.length) tail = '\n연락처: ' + contact[0].title + ' — ' + displayUrl(contact[0].url);
      else if (links.length) tail = '\n페이지 링크: ' + links[0].title + ' — ' + links[0].url;
      return (
        '자세한 상담·예약은 페이지 주인에게 직접 1:1 문의로 남겨 주세요. 아래 ‘1:1 문의 남기기’ 버튼을 누르면 바로 보낼 수 있어요.' +
        tail
      );
    }

    if (has(/연락|전화|번호|이메일|메일|카톡|문자|sms|연락처/)) {
      if (contact.length) {
        return '연락 방법은 아래와 같아요.\n' + linkLines(contact, 4) + '\n페이지의 전화·메일 버튼을 누르면 바로 연결됩니다.';
      }
      if (links.length) {
        return (
          '페이지에 등록된 연락 링크는 아직 없어요. 대신 아래 링크를 이용하시거나 ‘1:1 문의 남기기’로 메시지를 남겨 주세요.\n' +
          linkLines(links, 3)
        );
      }
      return '페이지에 등록된 연락처가 없습니다. ‘1:1 문의 남기기’ 버튼으로 페이지 주인에게 직접 남겨 주세요.';
    }

    if (has(/위치|주소|오시는|찾아|지도|어디|주차|길찾기/)) {
      if (p.map && (p.map.place || p.map.address)) {
        var where = p.map.place || p.map.address;
        var extra = p.map.address && p.map.address !== where ? ' (' + p.map.address + ')' : '';
        return '위치는 ' + where + extra + ' 입니다. 페이지의 지도 블록에서 ‘길찾기’를 누르면 카카오맵 길찾기로 이동해요.';
      }
      return '아직 페이지에 위치(지도) 정보가 등록되어 있지 않아요. 정확한 위치는 ‘1:1 문의 남기기’로 문의해 주세요.';
    }

    if (has(/링크|사이트|홈페이지|인스타|유튜브|블로그|sns|채널|구독|바로가기/)) {
      if (links.length) {
        return '이 페이지에 연결된 링크는 ' + links.length + '개예요.\n' + linkLines(links, 5) + (links.length > 5 ? '\n… 외 ' + (links.length - 5) + '개' : '');
      }
      return '아직 등록된 링크가 없어요. 페이지 주인에게 ‘1:1 문의 남기기’로 물어보시면 안내받을 수 있습니다.';
    }

    if (has(/공유|qr|명함|전화번호 저장/)) {
      var shareUrl = '';
      if (p.slug) {
        shareUrl = location.origin + String(location.pathname || '/').replace(/index\.html$/, '') + '#/p/@' + encodeURIComponent(p.slug);
      }
      return '페이지 위쪽의 ‘공유하기’ 버튼으로 이 품을 공유할 수 있어요.' + (shareUrl ? '\n공유 주소: ' + shareUrl : '');
    }

    if (has(/누구|소개|뭐하는|무슨|어떤|소속|전문|잘하|업체|회사|가게/)) {
      var intro = p.intro || '아직 소개글이 등록되지 않았어요.';
      var titles = links
        .slice(0, 3)
        .map(function (l) {
          return l.title;
        })
        .join(', ');
      return (
        firstName(ctx) + ' 페이지입니다.\n' + intro +
        (titles ? '\n주요 링크: ' + titles : '') +
        '\n더 궁금한 점은 ‘1:1 문의 남기기’로 남겨 주세요.'
      );
    }

    if (has(/안녕|반가|하이|헬로|hello|hi|ㅎㅇ|시작/)) {
      return greetingText(ctx);
    }

    /* 기본 답변 — 페이지 요약 + 연결 안내 */
    var bits = [];
    if (p.intro) bits.push(p.intro);
    if (links.length) bits.push('등록된 링크 ' + links.length + '개: ' + links.slice(0, 3).map(function (l) { return l.title; }).join(', '));
    if (p.map && (p.map.place || p.map.address)) bits.push('위치: ' + (p.map.place || p.map.address));
    return (
      '질문을 정확히 이해하지 못했어요. ' + (bits.length ? bits.join(' / ') : '아직 페이지 안내가 적어요.') +
      '\n‘소개’, ‘연락 방법’, ‘위치’, ‘링크’ 로 다시 물어보시거나 ‘1:1 문의 남기기’를 이용해 주세요.'
    );
  }

  function greetingText(ctx) {
    var p = ctx.profile;
    var extra = p.intro ? ' ' + p.intro : '';
    var hint = [];
    if (p.links && p.links.length) hint.push('링크 안내');
    if (p.map) hint.push('위치 안내');
    hint.push('1:1 문의 연결');
    return (
      '안녕하세요! ' + firstName(ctx) + ' 페이지의 AI 안내 도우미예요.' + extra +
      '\n이런 걸 도와드려요: ' + hint.join(' · ') + '. 궁금한 점을 편하게 물어봐 주세요.'
    );
  }

  /* ------------------------------------------------------------- DOM 구성 */
  var ICON = {
    bot: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="7" width="16" height="12" rx="4"/><path d="M12 3v4M9 13h.01M15 13h.01"/></svg>',
    gear: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    send: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21.5 2.5 10.9 13.1"/><path d="M21.5 2.5 14.7 21.5l-3.8-8.4-8.4-3.8z"/></svg>'
  };

  function esc(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function richText(text) {
    var safe = esc(text).replace(/\n/g, '<br>');
    return safe.replace(/(https?:\/\/[^\s<]+)/g, function (url) {
      return '<a href="' + url + '" target="_blank" rel="noopener">' + url + '</a>';
    });
  }

  function buildRoot() {
    var root = document.createElement('div');
    root.className = 'pai-root';
    root.setAttribute('data-pai-root', '1');
    root.innerHTML =
      '<button type="button" class="pai-fab" data-pai="open" aria-label="AI 상담 열기">' +
      '<span class="pai-fab__icon" aria-hidden="true">🤖</span>' +
      '<span class="pai-fab__label">AI 상담</span>' +
      '</button>' +
      '<section class="pai-panel" data-pai="panel" aria-label="AI 상담" aria-hidden="true">' +
      '<header class="pai-head">' +
      '<div class="pai-head__who"><span class="pai-head__avatar" aria-hidden="true">🤖</span>' +
      '<div class="pai-head__text"><strong>AI 상담</strong>' +
      '<span class="pai-badge" data-pai="badge" data-mode="demo">데모 응답</span></div></div>' +
      '<div class="pai-head__actions">' +
      '<button type="button" class="pai-iconbtn" data-pai="settings" aria-label="AI 연결 설정" title="AI 연결 설정">' + ICON.gear + '</button>' +
      '<button type="button" class="pai-iconbtn" data-pai="close" aria-label="AI 상담 닫기">' + ICON.close + '</button>' +
      '</div></header>' +
      '<div class="pai-body" data-pai="feed" role="log" aria-live="polite"></div>' +
      '<div class="pai-quick" data-pai="quick">' +
      '<button type="button" class="pai-chip" data-pai="ask" data-q="소개해 주세요">소개</button>' +
      '<button type="button" class="pai-chip" data-pai="ask" data-q="연락 방법 알려주세요">연락 방법</button>' +
      '<button type="button" class="pai-chip" data-pai="ask" data-q="위치가 어디예요?">위치</button>' +
      '<button type="button" class="pai-chip" data-pai="ask" data-q="링크 알려주세요">링크</button>' +
      '<button type="button" class="pai-chip pai-chip--brand" data-pai="inquiry">1:1 문의 남기기</button>' +
      '</div>' +
      '<form class="pai-inputbar" data-pai="form">' +
      '<input class="pai-input" data-pai="input" type="text" maxlength="' + MAX_INPUT + '" ' +
      'placeholder="궁금한 것을 물어보세요" aria-label="질문 입력" autocomplete="off" />' +
      '<button type="submit" class="pai-send" data-pai="send" aria-label="보내기">' + ICON.send + '</button>' +
      '</form>' +
      '<div class="pai-settings" data-pai="settingsPanel" hidden>' +
      '<div class="pai-settings__head"><strong>Cloudflare Worker 연결</strong>' +
      '<button type="button" class="pai-iconbtn pai-iconbtn--sm" data-pai="settingsClose" aria-label="설정 닫기">' + ICON.close + '</button></div>' +
      '<p class="pai-settings__desc">품 AI 상담 Worker 주소를 넣으면 실제 AI가 답합니다. 비워 두면 데모 응답으로 답해요.</p>' +
      '<input class="pai-input pai-settings__input" data-pai="workerUrl" type="url" inputmode="url" ' +
      'placeholder="https://pum-agent-worker.____.workers.dev" aria-label="Worker URL" />' +
      '<div class="pai-settings__row">' +
      '<button type="button" class="pai-btn pai-btn--brand" data-pai="save">저장</button>' +
      '<button type="button" class="pai-btn" data-pai="test">연결 테스트</button>' +
      '<button type="button" class="pai-btn pai-btn--ghost" data-pai="clear">데모로 되돌리기</button>' +
      '</div>' +
      '<p class="pai-settings__status" data-pai="status"></p>' +
      '<p class="pai-settings__hint">Worker: <code>POST /api/chat</code> · 확인: <code>GET /api/health</code></p>' +
      '</div>' +
      '</section>';
    return root;
  }

  function mount(root) {
    ui.root = root;
    document.body.appendChild(root);
    ui.panel = root.querySelector('[data-pai="panel"]');
    ui.feed = root.querySelector('[data-pai="feed"]');
    ui.input = root.querySelector('[data-pai="input"]');
    ui.badge = root.querySelector('[data-pai="badge"]');
    ui.settings = root.querySelector('[data-pai="settingsPanel"]');
    ui.status = root.querySelector('[data-pai="status"]');

    root.addEventListener('click', onClick);
    root.querySelector('[data-pai="form"]').addEventListener('submit', function (e) {
      e.preventDefault();
      send(ui.input.value);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && ui.panel && ui.panel.classList.contains('is-open')) close();
    });
    refreshBadge();
  }

  function onClick(e) {
    var t = e.target.closest('[data-pai]');
    if (!t) return;
    var act = t.getAttribute('data-pai');
    if (act === 'open') {
      open();
    } else if (act === 'close') {
      close();
    } else if (act === 'settings') {
      toggleSettings();
    } else if (act === 'settingsClose') {
      toggleSettings(false);
    } else if (act === 'ask') {
      send(t.getAttribute('data-q') || '');
    } else if (act === 'inquiry') {
      openInquiry();
    } else if (act === 'save') {
      var url = normalizeUrl(ui.root.querySelector('[data-pai="workerUrl"]').value);
      if (!url) {
        setStatus('주소 형식이 올바르지 않아요. https://…workers.dev 형태로 넣어 주세요.', 'err');
        return;
      }
      writeWorkerUrl(url);
      setStatus('저장했습니다. ‘연결 테스트’로 확인해 보세요.', 'ok');
      refreshBadge();
    } else if (act === 'test') {
      testConnection();
    } else if (act === 'clear') {
      writeWorkerUrl('');
      ui.root.querySelector('[data-pai="workerUrl"]').value = '';
      setStatus('데모 응답 모드로 되돌렸습니다.', 'ok');
      refreshBadge();
    }
  }

  function setStatus(text, kind) {
    if (!ui.status) return;
    ui.status.textContent = text;
    ui.status.setAttribute('data-kind', kind || '');
  }

  function toggleSettings(force) {
    if (!ui.settings) return;
    var open = typeof force === 'boolean' ? force : ui.settings.hasAttribute('hidden');
    if (open) {
      ui.panel.classList.add('is-settings');
      ui.settings.removeAttribute('hidden');
      var field = ui.root.querySelector('[data-pai="workerUrl"]');
      field.value = readWorkerUrl();
      setStatus(readWorkerUrl() ? '저장된 Worker 주소가 있습니다.' : '아직 Worker를 연결하지 않았습니다 (데모 응답 모드).', '');
      setTimeout(function () {
        field.focus();
      }, 40);
    } else {
      ui.settings.setAttribute('hidden', '');
      ui.panel.classList.remove('is-settings');
      if (ui.input) ui.input.focus();
    }
  }

  function refreshBadge() {
    if (!ui.badge) return;
    var url = readWorkerUrl();
    ui.badge.setAttribute('data-mode', url ? 'live' : 'demo');
    ui.badge.textContent = url ? 'AI 연결' : '데모 응답';
  }

  /* ------------------------------------------------------------ 대화 그리기 */
  function addMessage(role, text, meta) {
    ui.messages.push({ role: role, text: text, meta: meta || '' });
    var el = document.createElement('div');
    el.className = 'pai-msg pai-msg--' + (role === 'user' ? 'me' : 'bot');
    if (role === 'note') el.className = 'pai-msg pai-note';
    var bubble = document.createElement('div');
    bubble.className = 'pai-bubble';
    bubble.innerHTML = richText(text);
    el.appendChild(bubble);
    if (meta) {
      var tag = document.createElement('span');
      tag.className = 'pai-msg__meta';
      tag.textContent = meta;
      el.appendChild(tag);
    }
    ui.feed.appendChild(el);
    ui.feed.scrollTop = ui.feed.scrollHeight;
    return el;
  }

  function showTyping() {
    var el = document.createElement('div');
    el.className = 'pai-msg pai-msg--bot pai-typing';
    el.innerHTML = '<div class="pai-bubble"><span></span><span></span><span></span></div>';
    ui.feed.appendChild(el);
    ui.feed.scrollTop = ui.feed.scrollHeight;
    return el;
  }

  function open() {
    if (!ui.panel) return;
    ui.panel.classList.add('is-open');
    ui.panel.setAttribute('aria-hidden', 'false');
    ui.root.classList.add('is-open');
    if (!ui.greeted) {
      ui.greeted = true;
      addMessage('bot', greetingText(gatherContext()));
      if (!readWorkerUrl()) {
        addMessage('note', '지금은 데모 응답 모드예요. ⚙ 에서 Cloudflare Worker 주소를 넣으면 실제 AI가 답합니다.');
      }
    }
    setTimeout(function () {
      if (ui.input && !ui.settings.hasAttribute('hidden')) return;
      if (ui.input) ui.input.focus();
    }, 60);
  }

  function close() {
    if (!ui.panel) return;
    ui.panel.classList.remove('is-open');
    ui.panel.setAttribute('aria-hidden', 'true');
    ui.root.classList.remove('is-open');
  }

  function openInquiry() {
    var btn = document.querySelector('#app [data-action="inquiry"]');
    if (!btn) {
      Pum.toast('이 페이지에서는 1:1 문의를 열 수 없어요', 'err');
      return;
    }
    close();
    setTimeout(function () {
      btn.click();
    }, 120);
  }

  /* ---------------------------------------------------------------- 전송 */
  function send(text) {
    var message = String(text || '').trim();
    if (!message || ui.sending) return;
    if (message.length > MAX_INPUT) message = message.slice(0, MAX_INPUT);
    if (ui.input) ui.input.value = '';
    addMessage('user', message);
    ui.sending = true;

    var ctx = gatherContext();
    var typing = showTyping();
    var worker = readWorkerUrl();

    if (!worker) {
      setTimeout(function () {
        typing.remove();
        ui.sending = false;
        addMessage('bot', demoReply(message, ctx), '데모 응답');
      }, 420);
      return;
    }

    askWorker(worker, message, ctx)
      .then(function (reply) {
        typing.remove();
        addMessage('bot', reply, 'AI');
      })
      .catch(function (err) {
        typing.remove();
        var hint = err && err.message ? err.message : '연결 실패';
        addMessage('note', 'AI 연결이 되지 않아 데모 응답으로 답합니다. (' + hint + ')');
        addMessage('bot', demoReply(message, ctx), '데모 응답');
      })
      .then(function () {
        ui.sending = false;
      });
  }

  function askWorker(worker, message, ctx) {
    var controller = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = controller
      ? setTimeout(function () {
          controller.abort();
        }, API_TIMEOUT)
      : null;

    return fetch(worker + '/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        sessionId: sessionId(),
        message: message,
        profile: ctx.profile
      }),
      signal: controller ? controller.signal : undefined
    })
      .then(function (res) {
        return res.json().catch(function () {
          return {};
        }).then(function (data) {
          if (!res.ok || !data || data.ok === false) {
            var reason = (data && (data.error || data.message)) || 'HTTP ' + res.status;
            throw new Error(String(reason).slice(0, 120));
          }
          if (!data.reply) throw new Error('빈 응답');
          return data.reply;
        });
      })
      .finally(function () {
        if (timer) clearTimeout(timer);
      });
  }

  function testConnection() {
    var input = ui.root.querySelector('[data-pai="workerUrl"]');
    var url = normalizeUrl(input.value) || readWorkerUrl();
    if (!url) {
      setStatus('먼저 Worker 주소를 넣어 주세요.', 'err');
      return;
    }
    setStatus('연결 확인 중…', '');
    var timer = setTimeout(function () {
      setStatus('응답이 없습니다. 주소와 배포 상태를 확인해 주세요.', 'err');
    }, 12000);

    fetch(url + '/api/health', { method: 'GET' })
      .then(function (res) {
        clearTimeout(timer);
        if (!res.ok) {
          setStatus('연결 실패 (HTTP ' + res.status + ')', 'err');
          return;
        }
        return res.json().then(function (data) {
          if (data && data.ok) {
            writeWorkerUrl(url);
            input.value = url;
            refreshBadge();
            setStatus('연결됨 · ' + (data.model || 'AI') + ' · ' + (data.service || 'pum-agent-worker'), 'ok');
          } else {
            setStatus('응답이 올바르지 않습니다. 품 AI Worker가 맞는지 확인해 주세요.', 'err');
          }
        });
      })
      .catch(function () {
        clearTimeout(timer);
        setStatus('연결 실패 — 주소·네트워크를 확인해 주세요.', 'err');
      });
  }

  /* ------------------------------------------------------- 화면 표시 동기화 */
  function shouldShow() {
    if (!isShareRoute()) return false;
    var app = document.getElementById('app');
    if (!app) return false;
    if (app.querySelector('.lock')) return false;
    return !!app.querySelector('.share');
  }

  function unmount() {
    if (!ui.root) return;
    close();
    if (ui.root.parentNode) ui.root.parentNode.removeChild(ui.root);
    ui.root = null;
    ui.panel = null;
    ui.feed = null;
    ui.input = null;
    ui.settings = null;
    ui.greeted = false;
    ui.messages = [];
  }

  function sync() {
    if (!shouldShow()) {
      unmount();
      return;
    }
    var key = String(location.hash || '');
    if (!ui.root || !ui.root.isConnected || ui.routeKey !== key) {
      unmount();
      mount(buildRoot());
      ui.routeKey = key;
    }
  }

  /* 화면이 계속 다시 그려져도 예약이 밀리지 않도록 '한 번만' 예약합니다. */
  var syncQueued = 0;
  function scheduleSync() {
    if (syncQueued) return;
    syncQueued = setTimeout(function () {
      syncQueued = 0;
      sync();
    }, 40);
  }

  window.addEventListener('hashchange', scheduleSync);
  window.addEventListener('load', scheduleSync);
  if (document.body) {
    var obs = new MutationObserver(scheduleSync);
    var appEl = document.getElementById('app');
    if (appEl) obs.observe(appEl, { childList: true });
  }
  scheduleSync();

  Pum.aiConsult = {
    open: open,
    close: close,
    sync: sync,
    demoReply: demoReply,
    gatherContext: gatherContext,
    sessionId: sessionId
  };
})(window);
