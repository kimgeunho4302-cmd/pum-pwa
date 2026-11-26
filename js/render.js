/* ==========================================================================
   품 꾸미기 PWA — render.js
   공유 페이지 렌더러 (미리보기와 @주소 페이지가 같은 함수를 사용)
   미리보기(#/preview)·공유(#/share)·편집기 실시간 미리보기가 모두 이 렌더러를 씁니다.
   ========================================================================== */
(function (global) {
  'use strict';

  var Pum = global.Pum;
  var esc = Pum.util.esc;
  var icon = Pum.icon;

  function themeOf(id) {
    return Pum.theme(id);
  }

  function safeUrl(url) {
    var u = String(url || '').trim();
    if (!u) return '';
    if (/^(javascript|data):/i.test(u)) return '';
    if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return u;
    if (u.indexOf('//') === 0) return 'https:' + u;
    return 'https://' + u;
  }

  function displayUrl(url) {
    return String(url || '')
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '');
  }

  function hrefForSns(item) {
    var raw = String(item.url || '').trim();
    if (!raw) return '#';
    switch (item.icon) {
      case 'email':
        return 'mailto:' + raw.replace(/^mailto:/, '');
      case 'phone':
        return 'tel:' + raw.replace(/^(tel:|phone:)/, '').replace(/[^0-9+]/g, '');
      default:
        return safeUrl(raw);
    }
  }

  /* ---------------------------------------------------------------------
     프로필 영역
     --------------------------------------------------------------------- */
  function heroHTML(p, opts) {
    var layout = p.layout || 'bgprofile';
    var t = themeOf(p.theme);
    var avatar = p.imgProfile;
    var bgImg = p.imgBg;
    var placeholder = !!opts.placeholder;

    var titleText = p.title && p.title.trim();
    var introText = p.intro && p.intro.trim();

    var titleHTML = titleText
      ? esc(titleText)
      : placeholder
      ? '<span class="hero__placeholder">이름 또는 회사명</span>'
      : '';
    var introHTML = introText
      ? esc(introText)
      : placeholder
      ? '<span class="hero__placeholder">소개글을 입력해 보세요</span>'
      : '';

    if (!titleText && !introText && !avatar && !placeholder) return '';

    var avatarHTML = avatar
      ? '<div class="hero__avatar"><img src="' + avatar + '" alt="프로필 사진" /></div>'
      : '<div class="hero__avatar hero__avatar--empty"><span>품</span></div>';

    var body =
      '<div class="hero__body">' +
      (titleHTML ? '<div class="hero__title">' + titleHTML + '</div>' : '') +
      (introHTML ? '<div class="hero__intro">' + introHTML + '</div>' : '') +
      '</div>';

    var style =
      '--hero-base:' + t.base + ';--hero-fg:' + t.fg + ';--hero-muted:' + t.muted + ';--hero-line:' + t.line + ';';

    /* 프로필 전체 = 프로필 사진만 배경 전체에 깔린 풀 배경형 (배경 사진은 사용하지 않음) */
    if (layout === 'full') {
      var fullSrc = avatar || '';
      var fullStyle =
        style + (fullSrc ? '--hero-photo:url(\'' + fullSrc.replace(/'/g, '%27') + '\');' : '');
      return (
        '<section class="hero hero--full' + (fullSrc ? ' hero--photo' : '') + '" style="' + fullStyle + '" aria-label="프로필">' +
        '<div class="hero__fullbg" aria-hidden="true"></div>' +
        '<div class="hero__scrim" aria-hidden="true"></div>' +
        body +
        '</section>'
      );
    }

    if (layout === 'bg' || layout === 'bgprofile') {
      var bgSrc = bgImg || '';
      var bgStyle = style + (bgSrc ? '--hero-photo:url(\'' + bgSrc.replace(/'/g, '%27') + '\');' : '');
      return (
        '<section class="hero hero--' + layout + (bgSrc ? ' hero--photo' : '') + '" style="' + bgStyle + '" aria-label="프로필">' +
        '<div class="hero__bg" aria-hidden="true"></div>' +
        '<div class="hero__scrim" aria-hidden="true"></div>' +
        (layout === 'bg' ? '' : avatarHTML) +
        body +
        '</section>'
      );
    }

    /* 프로필 모드 — 사진과 긼만 */
    return (
      '<section class="hero hero--profile" style="' + style + '" aria-label="프로필">' +
      avatarHTML +
      body +
      '</section>'
    );
  }

  /* ---------------------------------------------------------------------
     블록
     --------------------------------------------------------------------- */
  function recSample() {
    return [
      {
        tag: '이코노미',
        title: '알아두면 쓸모 있는 ‘주주환원’ 이야기',
        desc: '배당과 자사주, 무엇이 다를까',
        c1: '#1f2937',
        c2: '#4b5563'
      },
      {
        tag: '라이프',
        title: '독성을 가진 의외의 약초!',
        desc: '잘못 먹으면 탈이 나요',
        c1: '#3f6212',
        c2: '#84cc16'
      },
      {
        tag: '우먼',
        title: '믿거나 말거나! 결혼 속설',
        desc: '결혼식 날 비가 오면?',
        c1: '#9d174d',
        c2: '#f472b6'
      },
      {
        tag: '헬스',
        title: '생활 속에서 찾는 의외의 장수습관',
        desc: '하루 10분이면 충분해요',
        c1: '#0e7490',
        c2: '#67e8f9'
      }
    ];
  }

  function recThumb(c1, c2) {
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 200">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient></defs>' +
      '<rect width="320" height="200" fill="url(#g)"/>' +
      '<circle cx="262" cy="46" r="58" fill="#ffffff" opacity=".12"/>' +
      '<path d="M0 160c60-30 110 10 170-10s90-40 150-24v74H0z" fill="#ffffff" opacity=".16"/>' +
      '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function productPlaceholder() {
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600">' +
      '<defs>' +
      '<linearGradient id="pg" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#fbfaf7"/><stop offset="1" stop-color="#eeefea"/></linearGradient>' +
      '<linearGradient id="bt" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0" stop-color="#3b2a1c"/><stop offset=".55" stop-color="#6b4a2f"/><stop offset="1" stop-color="#2f2115"/></linearGradient>' +
      '</defs>' +
      '<rect width="600" height="600" fill="url(#pg)"/>' +
      '<ellipse cx="300" cy="470" rx="190" ry="26" fill="#dfe2da" opacity=".7"/>' +
      '<rect x="188" y="262" width="224" height="200" rx="10" fill="#f7f4ee" stroke="#dcd8cd"/>' +
      '<rect x="188" y="262" width="224" height="34" rx="10" fill="#e9e4d9"/>' +
      '<path d="M188 296h224" stroke="#d7d1c4"/>' +
      '<rect x="252" y="186" width="34" height="118" rx="14" fill="url(#bt)"/>' +
      '<rect x="258" y="160" width="22" height="30" rx="5" fill="#2b1c11"/>' +
      '<rect x="288" y="214" width="30" height="90" rx="12" fill="#dfd4c2"/>' +
      '<rect x="293" y="196" width="20" height="22" rx="4" fill="#b9ab93"/>' +
      '<rect x="318" y="228" width="52" height="74" rx="8" fill="#fbfaf7" stroke="#e3ded3"/>' +
      '<rect x="330" y="250" width="28" height="6" rx="3" fill="#b9b3a6"/>' +
      '<rect x="334" y="264" width="20" height="4" rx="2" fill="#d6d1c6"/>' +
      '<rect x="212" y="330" width="176" height="6" rx="3" fill="#cfcabe"/>' +
      '<rect x="232" y="350" width="136" height="5" rx="2.5" fill="#e2ded5"/>' +
      '<rect x="246" y="376" width="108" height="26" rx="13" fill="#ffffff" stroke="#e4dfd4"/>' +
      '<text x="300" y="394" text-anchor="middle" font-family="Pretendard, sans-serif" font-size="14" font-weight="700" fill="#8b8578">AD몰 특가</text>' +
      '</svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function blockGreeting(b) {
    var d = b.data || {};
    var img = d.img || productPlaceholder();
    var price = Number(d.price || 0).toLocaleString('ko-KR');
    var was = Number(d.was || 0).toLocaleString('ko-KR');
    var headTitle = (Pum.pumssItem && Pum.pumssItem('greeting').title) || '반갑데이';
    return (
      '<section class="s-card" aria-label="반갑데이">' +
      '<div class="s-head"><h3>' + esc(headTitle) + '</h3><span class="s-head__more">AD몰</span></div>' +
      '<div class="greet"><div class="greet__item">' +
      '<div class="greet__img">' +
      '<img src="' + img + '" alt="' + esc(d.title || '') + '" />' +
      (d.dday ? '<span class="greet__dday">D-' + Number(d.dday) + '</span>' : '') +
      '</div>' +
      '<div class="greet__meta"><span>' + esc(d.brand || '') + '</span><span class="dot"></span><span>오늘의 특가</span></div>' +
      '<div class="greet__title">' + esc(d.title || '') + '</div>' +
      '<div class="greet__price">' +
      (d.off ? '<span class="greet__off">' + Number(d.off) + '%</span>' : '') +
      '<span class="greet__now">' + price + '원</span>' +
      (d.was ? '<span class="greet__was">' + was + '원</span>' : '') +
      '</div></div></div></section>'
    );
  }

  function blockSns(b) {
    var items = (b.data && b.data.items) || [];
    if (!items.length) return '';
    return (
      '<section class="s-card" aria-label="SNS"><div class="s-sns">' +
      items
        .map(function (it) {
          var meta = Pum.snsMeta(it.icon);
          return (
            '<a class="s-sns__item" href="' + esc(hrefForSns(it)) + '" target="_blank" rel="noopener" aria-label="' +
            esc(meta.name) + '"><img src="assets/sns/' + meta.id + '.jpg" alt="' + esc(meta.name) + '" /></a>'
          );
        })
        .join('') +
      '</div></section>'
    );
  }

  function blockTextlink(b) {
    var d = b.data || {};
    var url = safeUrl(d.url);
    if (!d.label && !url) return '';
    return (
      '<a class="s-card s-link" href="' + esc(url || '#') + '" target="_blank" rel="noopener">' +
      '<div class="s-link__body"><div class="s-link__label">' + esc(d.label || displayUrl(d.url)) + '</div>' +
      '<div class="s-link__url">' + esc(displayUrl(d.url)) + '</div></div>' +
      '<span class="s-link__arrow">' + icon('arrowRight') + '</span></a>'
    );
  }

  function blockFreePum() {
    var ad = (Pum.adminData && Pum.adminData()) || null;
    var b = (ad && ad.banner) || {
      eyebrow: '품 무료 만들기',
      title: '이 모든 것을 품에서 무료로',
      subtitle: '내 프로필 · SNS · 콘텐츠 블록 · 지도까지 한 페이지에 담아 공유해 보세요.',
      cta: '초대장 받고 시작하기'
    };
    var title = esc(b.title || '').replace(/무료/g, '<em>무료</em>');
    return (
      '<button type="button" class="s-free" data-action="open-signup">' +
      '<span class="s-free__eyebrow">' + esc(b.eyebrow || '') + '</span>' +
      '<div class="s-free__title">' + title + '</div>' +
      '<div class="s-free__desc">' + esc(b.subtitle || '') + '</div>' +
      '<span class="s-free__cta">' + esc(b.cta || '') + ' ' + icon('arrowRight') + '</span>' +
      '</button>'
    );
  }

  function blockQuote(b) {
    var d = b.data || {};
    var g = (Pum.pumssItem && Pum.pumssItem('quote')) || {};
    var text = g.text ? g.text : d.text || '';
    var author = g.author ? g.author : d.author || '';
    return (
      '<section class="s-card s-quote" aria-label="오늘의 명언">' +
      '<div class="s-quote__mark">“</div>' +
      '<div class="s-quote__text">' + esc(text) + '</div>' +
      (author ? '<div class="s-quote__author">- ' + esc(author) + ' -</div>' : '') +
      '<div class="s-quote__actions"><span class="s-chip">공감</span><span class="s-chip">댓글쓰기</span></div>' +
      '</section>'
    );
  }

  function blockNews(b) {
    var d = b.data || {};
    var date = d.date || Pum.util.todayStamp();
    var headTitle = (Pum.pumssItem && Pum.pumssItem('news').title) || '헤드라인 NEWS';
    return (
      '<section class="s-card" aria-label="일일뉴스">' +
      '<div class="s-head"><h3>' + esc(headTitle) + '</h3><span class="s-head__more">' + esc(date) + '</span></div>' +
      '<div class="s-news"><a class="s-news__card" href="https://www.pumss.co.kr/" target="_blank" rel="noopener">' +
      '<span class="s-news__tag">오늘의 이슈</span>' +
      '<div class="s-news__title">' + esc(d.title || '오늘의 헤드라인을 확인해 보세요') + '</div>' +
      '<div class="s-news__date">' + esc(date) + ' 업데이트</div>' +
      '<div class="s-news__wave"><i style="height:10px"></i><i style="height:20px"></i><i style="height:14px"></i><i style="height:24px"></i></div>' +
      '</a></div></section>'
    );
  }

  function blockRecs() {
    var list = recSample();
    var headTitle = (Pum.pumssItem && Pum.pumssItem('recs').title) || '추천 컨텐츠';
    return (
      '<section class="s-card" aria-label="추천 컨텐츠">' +
      '<div class="s-head"><h3>' + esc(headTitle) + '</h3></div>' +
      '<div class="s-recs">' +
      list
        .map(function (r) {
          return (
            '<a class="s-rec" href="https://www.pumss.co.kr/" target="_blank" rel="noopener">' +
            '<div class="s-rec__thumb" style="background-image:url(\'' + recThumb(r.c1, r.c2) + '\')">' +
            '<span class="s-rec__tag">' + esc(r.tag) + '</span></div>' +
            '<div class="s-rec__body"><div class="s-rec__title">' + esc(r.title) + '</div>' +
            '<div class="s-rec__desc">' + esc(r.desc) + '</div></div></a>'
          );
        })
        .join('') +
      '</div></section>'
    );
  }

  function blockVideo(b) {
    var d = b.data || {};
    var id = Pum.util.parseYouTube(d.url);
    if (!d.url) return '';
    var body = id
      ? '<div class="s-video__frame"><iframe src="https://www.youtube-nocookie.com/embed/' +
        esc(id) +
        '?rel=0" title="동영상" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; clipboard-write" allowfullscreen></iframe></div>'
      : '<div class="s-video__thumb"><span class="s-video__play">' + icon('play') + '</span></div>';
    return (
      '<section class="s-card" aria-label="동영상">' +
      '<div class="s-head"><h3>동영상</h3><span class="s-head__more">YouTube</span></div>' +
      '<div class="s-video">' + body + '</div></section>'
    );
  }

  function blockBanner(b) {
    var d = b.data || {};
    var size = d.size || 'large';
    var slots = Pum.bannerSlots(d).filter(function (s) {
      return !!s.img;
    });
    if (!slots.length) return '';
    /* 슬롯은 각각 하나의 배너로 그립니다. 중배너 2×1은 2열, 2×2는 2×2, 소배너 3×1은 3열로 그리드에 배치됩니다. */
    return slots
      .map(function (s) {
        var inner =
          '<span class="s-banner__media"><img src="' + s.img + '" alt="' + esc(s.caption || '배너') + '" loading="lazy" /></span>' +
          (s.caption ? '<span class="s-banner__cap">' + esc(s.caption) + '</span>' : '');
        return s.url
          ? '<a class="s-banner s-banner--' + esc(size) + '" data-track="banner" href="' + esc(safeUrl(s.url)) + '" target="_blank" rel="noopener">' + inner + '</a>'
          : '<figure class="s-banner s-banner--' + esc(size) + '">' + inner + '</figure>';
      })
      .join('');
  }

  /* 품스 콘텐츠 연동 — 보험·영업 영역 5개 블록 (블록·항목별 ON/OFF · 항목별 텍스트·링크 반영) */
  function blockPumssGroup(b) {
    var sec = Pum.pumssSectionOf ? Pum.pumssSectionOf(b.type) : null;
    if (!sec) return '';
    if (Pum.pumssExtra1On && !Pum.pumssExtra1On()) return '';
    var flags = (b.data && b.data.items) || [];
    var globalItems = (Pum.pumssItem && Pum.pumssItem(b.type).items) || [];
    var rows = [];
    sec.items.forEach(function (title, i) {
      if (flags[i] === false) return;
      var item = globalItems[i] || {};
      if (item.on === false) return;
      rows.push({ title: item.title ? item.title : title, url: item.url || '' });
    });
    if (!rows.length) return '';
    var headTitle = (Pum.pumssItem && Pum.pumssItem(b.type).title) || sec.label;
    return (
      '<section class="s-card s-pumss" aria-label="' + esc(sec.label) + '">' +
      '<div class="s-head"><h3>' + esc(headTitle) + '</h3></div>' +
      '<div class="s-pumss__list">' +
      rows
        .map(function (row, i) {
          return (
            '<a class="s-pumss__item" href="' + esc(safeUrl(row.url) || 'https://www.pumss.co.kr/') + '" target="_blank" rel="noopener">' +
            '<span class="s-pumss__num">' + (i + 1) + '</span>' +
            '<span class="s-pumss__title">' + esc(row.title) + '</span>' +
            '<span class="s-pumss__arrow">' + icon('arrowRight') + '</span></a>'
          );
        })
        .join('') +
      '</div></section>'
    );
  }

  /* 운영 관리자가 추가한 연동 영역(추가 영역 2, 3 …) — 저장 즉시 공유·미리보기에 노출 */
  function customGroupsHTML() {
    var groups = Pum.customGroups ? Pum.customGroups() : [];
    return groups
      .map(function (g) {
        if (g.on === false) return '';
        var items = (g.items || []).filter(function (it) {
          return it && it.on !== false && (it.title || '').trim();
        });
        if (!items.length) return '';
        var headTitle = (g.title || '').trim() || g.name || '추가 영역';
        return (
          '<section class="s-card s-pumss" aria-label="' + esc(headTitle) + '">' +
          '<div class="s-head"><h3>' + esc(headTitle) + '</h3></div>' +
          '<div class="s-pumss__list">' +
          items
            .map(function (it, i) {
              return (
                '<a class="s-pumss__item" href="' + esc(safeUrl(it.url) || '#') + '" target="_blank" rel="noopener">' +
                '<span class="s-pumss__num">' + (i + 1) + '</span>' +
                '<span class="s-pumss__title">' + esc(it.title) + '</span>' +
                '<span class="s-pumss__arrow">' + icon('arrowRight') + '</span></a>'
              );
            })
            .join('') +
          '</div></section>'
        );
      })
      .join('');
  }
  Pum.customGroupsHTML = customGroupsHTML;

  function blockApptech(b) {
    var flags = (b.data && b.data.items) || [];
    var rows = Pum.APPTECH.map(function (item, i) {
      return { item: item, i: i };
    }).filter(function (row) {
      if (flags[row.i] === false) return false;
      var g = Pum.pumssApptech ? Pum.pumssApptech(row.i) : {};
      return g.on !== false;
    });
    if (!rows.length) return '';
    var headTitle = (Pum.pumssItem && Pum.pumssItem('apptech').title) || '앱테크';
    return (
      '<section class="s-card" aria-label="앱테크">' +
      '<div class="s-head"><h3>' + esc(headTitle) + '</h3><span class="s-head__more">AD포인트 적립</span></div>' +
      '<div class="s-apptech">' +
      rows
        .map(function (row) {
          var item = row.item;
          var g = Pum.pumssApptech ? Pum.pumssApptech(row.i) : {};
          var title = g.title ? esc(g.title) : item.title;
          var desc = g.desc ? esc(g.desc) : esc(item.desc);
          return (
            '<a class="s-apptech__item" href="https://www.pumss.co.kr/" target="_blank" rel="noopener">' +
            '<img src="' + item.icon + '" alt="" />' +
            '<div class="s-apptech__body"><div class="s-apptech__title">' + title + '</div>' +
            '<div class="s-apptech__desc">' + desc + '</div></div></a>'
          );
        })
        .join('') +
      '</div></section>'
    );
  }

  function blockMap(b) {
    var d = b.data || {};
    var hasPoint = d.lat && d.lng;
    var addr = (d.address || '').trim();
    if (!addr && !hasPoint) return '';
    var detail = d.road || d.place || '';
    return (
      '<section class="s-card" aria-label="지도">' +
      '<div class="s-head"><h3>오시는 길</h3></div>' +
      '<div class="s-map">' +
      '<div class="s-map__addr">' + icon('pin') +
      '<div><strong>' + esc(d.place || addr) + '</strong>' +
      (d.place && addr !== d.place ? '<span>' + esc(addr) + '</span>' : detail ? '<span>' + esc(detail) + '</span>' : '') +
      '</div></div>' +
      '<div class="s-map__canvas" data-map-for="' + esc(b.id) + '">' +
      '<div class="s-map__fallback"><span class="pin"><i></i></span>' +
      '<strong>' + esc(addr || d.place || '') + '</strong>' +
      '<span>지도에서 위치를 확인하세요</span></div>' +
      '</div>' +
      '<div class="s-map__actions">' +
      '<a href="' + esc(mapLink(d)) + '" target="_blank" rel="noopener">' + icon('map') + '길찾기</a>' +
      '<a href="' + esc(telSearchLink(d)) + '" target="_blank" rel="noopener">' + icon('search') + '지도 검색</a>' +
      '</div>' +
      '</div></section>'
    );
  }

  function mapLink(d) {
    if (d.lat && d.lng) {
      var name = encodeURIComponent(d.place || d.address || '위치');
      return 'https://map.kakao.com/link/to/' + name + ',' + d.lat + ',' + d.lng;
    }
    return 'https://map.kakao.com/link/search/' + encodeURIComponent(d.address || d.place || '');
  }

  function telSearchLink(d) {
    return 'https://map.kakao.com/link/search/' + encodeURIComponent(d.address || d.place || '');
  }

  var RENDERERS = {
    greeting: blockGreeting,
    sns: blockSns,
    textlink: blockTextlink,
    freepum: blockFreePum,
    quote: blockQuote,
    news: blockNews,
    recs: blockRecs,
    video: blockVideo,
    banner: blockBanner,
    apptech: blockApptech,
    basic: blockPumssGroup,
    nonlife: blockPumssGroup,
    life: blockPumssGroup,
    personal: blockPumssGroup,
    corporate: blockPumssGroup,
    map: blockMap
  };

  /* ---------------------------------------------------------------------
     상단 공지(마퀴) · 관리자 배너
     --------------------------------------------------------------------- */
  function ownerNoticeHTML(p) {
    var n = p.notice || {};
    var text = String(n.text || '').trim();
    if (n.on === false || !text) return '';
    var marquee = text.length > 22;
    return (
      '<div class="share__owner-notice' + (marquee ? ' is-marquee' : '') + '" aria-label="상단 공지">' +
      '<div class="share__owner-notice__track">' +
      '<span>' + esc(text) + '</span>' +
      (marquee ? '<span aria-hidden="true">' + esc(text) + '</span>' : '') +
      '</div></div>'
    );
  }

  function adminNoticeHTML(ad) {
    if (!ad || !ad.notice || !ad.notice.on) return '';
    var text = String(ad.notice.text || '').trim();
    if (!text) return '';
    if (Pum.noticeDismissed && Pum.noticeDismissed()) return '';
    return (
      '<div class="share__notice"><span class="share__notice-dot"></span>' +
      '<span class="share__notice-text">' + esc(text) + '</span>' +
      '<button type="button" class="share__notice-close" data-action="dismiss-notice" aria-label="오늘 하루 보지 않기">' +
      icon('close') +
      '</button></div>'
    );
  }

  /* ---------------------------------------------------------------------
     전체 페이지
     --------------------------------------------------------------------- */
  Pum.renderShare = function (state, opts) {
    var o = opts || {};
    var p = state.profile;
    var t = themeOf(p.theme);
    var GLOBAL = { greeting: 1, news: 1, quote: 1, recs: 1, apptech: 1, basic: 1, nonlife: 1, life: 1, personal: 1, corporate: 1 };
    var blocks = state.blocks.filter(function (b) {
      if (b.on === false) return false;
      if (GLOBAL[b.type] && Pum.pumssOn && !Pum.pumssOn(b.type)) return false;
      return true;
    });

    /* 연속한 배너는 하나의 그리드에 묶어 대(1) · 중(2) · 소(3) 컬럼으로 배치 */
    var body = '';
    var bannerBuf = [];
    function flushBanners() {
      if (!bannerBuf.length) return;
      body +=
        '<div class="s-banner-grid" role="group" aria-label="배너">' +
        bannerBuf.map(function (b) {
          return blockBanner(b);
        }).join('') +
        '</div>';
      bannerBuf = [];
    }
    blocks.forEach(function (b) {
      var fn = RENDERERS[b.type];
      var html = fn ? fn(b) : '';
      if (!html) return;
      if (b.type === 'banner') {
        bannerBuf.push(b);
        return;
      }
      flushBanners();
      body += html;
    });
    flushBanners();

    var hero = heroHTML(p, o);
    var ad = (Pum.adminData && Pum.adminData()) || null;
    var showShare = !o.mini;

    var html =
      '<div class="share" data-theme="' + esc(t.id) + '" data-scheme="' + esc(t.scheme) + '" data-layout="' + esc(p.layout) + '" ' +
      'style="--share-base:' + t.base + ';--share-surface:' + (t.surface || '#ffffff') + ';--share-surface-2:' + (t.surface2 || '#f7f9fb') + ';--share-fg:' + t.fg + ';--share-ink:' + t.fg + ';--share-muted:' + t.muted + ';--share-line:' + t.line + ';--share-chip:' + t.chip + '">' +
      ownerNoticeHTML(p) +
      '<div class="share__inner">' +
      '<div class="share__topbar">' +
      (showShare
        ? '<button type="button" class="share__share" data-action="share">' + icon('share') + '공유하기</button>'
        : '<span></span>') +
      '<div class="share__quick">' +
      '<button type="button" data-action="qr">QR</button>' +
      '<button type="button" data-action="inquiry">1:1문의</button>' +
      (state.settings.bizcard === 'show'
        ? '<button type="button" data-action="bizcard">전자명함</button>'
        : '') +
      '</div></div>' +
      adminNoticeHTML(ad) +
      hero +
      body +
      customGroupsHTML() +
      '<div class="share__brand">' + icon('check') + '<span>made by <strong>품</strong></span></div>' +
      '</div></div>';

    return html;
  };

  /* 관리자 공지 닫기 — 당일 숨김, 다음날 00시 재노촜 */
  function dismissKey() {
    return 'pum.notice.dismiss';
  }
  Pum.noticeDismissed = function () {
    try {
      return localStorage.getItem(dismissKey()) === Pum.util.todayStamp();
    } catch (e) {
      return false;
    }
  };
  Pum.dismissNoticeToday = function () {
    try {
      localStorage.setItem(dismissKey(), Pum.util.todayStamp());
      return true;
    } catch (e) {
      return false;
    }
  };

  /* ---------------------------------------------------------------------
     카카오맵
     --------------------------------------------------------------------- */
  var KAKAO_KEY = '10068832a5a7641b35eab0a873d745c7';
  var sdkPromise = null;
  var sdkState = 'idle'; // idle | loading | ready | failed

  function loadKakao() {
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise(function (resolve, reject) {
      if (global.kakao && global.kakao.maps && global.kakao.maps.Map) return resolve(global.kakao);
      sdkState = 'loading';
      var s = document.createElement('script');
      s.src =
        'https://dapi.kakao.com/v2/maps/sdk.js?appkey=' +
        KAKAO_KEY +
        '&libraries=services&autoload=false';
      s.async = true;
      var settled = false;
      function fail() {
        if (settled) return;
        settled = true;
        sdkState = 'failed';
        reject(new Error('kakao sdk unavailable'));
      }
      s.onload = function () {
        if (!global.kakao || !global.kakao.maps) return fail();
        try {
          global.kakao.maps.load(function () {
            if (settled) return;
            settled = true;
            sdkState = 'ready';
            resolve(global.kakao);
          });
        } catch (e) {
          fail();
        }
      };
      s.onerror = fail;
      document.head.appendChild(s);
      setTimeout(fail, 8000);
    });
    return sdkPromise;
  }

  Pum.kakaoStatus = function () {
    return sdkState;
  };

  function mapFallbackHTML(data) {
    return (
      '<div class="s-map__fallback"><span class="pin"><i></i></span>' +
      '<strong>' + esc(data.address || data.place || '주소를 입력해 주세요') + '</strong>' +
      '<span>지도에서 위치를 확인하세요</span></div>'
    );
  }

  /**
   * 지도 컨테이너를 채웁니다.
   * 카카오 SDK 가 준비되면 실제 지도 + 마커, 아니면 주소 카드 폴백을 유지합니다.
   */
  function renderMap(el, data) {
    if (!el) return;
    el.innerHTML = mapFallbackHTML(data);
    if (!data || (!data.address && !(data.lat && data.lng))) return;

    loadKakao()
      .then(function (kakao) {
        if (!document.body.contains(el)) return;
        var center;
        if (data.lat && data.lng) {
          center = new kakao.maps.LatLng(Number(data.lat), Number(data.lng));
          draw();
        } else {
          // 주소만 있는 경우 지오코딩
          var geocoder = new kakao.maps.services.Geocoder();
          geocoder.addressSearch(data.address, function (result, status) {
            if (status === kakao.maps.services.Status.OK && result && result[0]) {
              center = new kakao.maps.LatLng(Number(result[0].y), Number(result[0].x));
              draw();
            }
          });
        }

        function draw() {
          el.innerHTML = '<div class="kakao-map"></div>';
          var holder = el.querySelector('.kakao-map');
          var map = new kakao.maps.Map(holder, { center: center, level: 3 });
          new kakao.maps.Marker({ map: map, position: center });
          var label = document.createElement('div');
          label.style.cssText =
            'background:#fff;border-radius:10px;padding:6px 10px;font-size:11px;font-weight:600;color:#16191d;box-shadow:0 4px 12px rgba(0,0,0,.16);white-space:nowrap;';
          label.textContent = data.place || data.address;
          var overlay = new kakao.maps.CustomOverlay({
            position: center,
            content: label,
            yAnchor: 1.9
          });
          overlay.setMap(map);
        }
      })
      .catch(function () {
        /* 폴백 유지 */
      });
  }

  Pum.map = {
    render: renderMap,
    load: loadKakao,
    link: mapLink,
    isReady: function () {
      return sdkState === 'ready';
    }
  };

  /** 렌더된 공유 화면 안의 지도들을 초기화 */
  Pum.mountMaps = function (root) {
    if (!root) return;
    var nodes = root.querySelectorAll('[data-map-for]');
    Array.prototype.forEach.call(nodes, function (el) {
      var id = el.getAttribute('data-map-for');
      var b = Pum.findBlock(id);
      if (b) renderMap(el, b.data);
    });
  };

  /* 주소/장소 검색 (카카오 services) */
  Pum.searchPlaces = function (query) {
    return loadKakao().then(function (kakao) {
      return new Promise(function (resolve, reject) {
        var q = String(query || '').trim();
        if (!q) return resolve([]);
        var results = [];
        var places = new kakao.maps.services.Places();
        var geocoder = new kakao.maps.services.Geocoder();
        var pending = 2;

        function done() {
          pending -= 1;
          if (pending > 0) return;
          resolve(results);
        }

        places.keywordSearch(
          q,
          function (data, status) {
            if (status === kakao.maps.services.Status.OK) {
              data.forEach(function (d) {
                results.push({
                  name: d.place_name,
                  address: d.road_address_name || d.address_name,
                  road: d.road_address_name || '',
                  lat: Number(d.y),
                  lng: Number(d.x)
                });
              });
            }
            done();
          },
          { size: 8 }
        );

        geocoder.addressSearch(q, function (data, status) {
          if (status === kakao.maps.services.Status.OK) {
            data.forEach(function (d) {
              var addr = d.road_address ? d.road_address.address_name : d.address_name;
              if (
                !results.some(function (r) {
                  return r.address === addr;
                })
              ) {
                results.push({
                  name: d.address_name,
                  address: addr,
                  road: d.road_address ? d.road_address.address_name : '',
                  lat: Number(d.y),
                  lng: Number(d.x)
                });
              }
            });
          }
          done();
        });

        setTimeout(function () {
          if (pending > 0) {
            pending = 0;
            resolve(results);
          }
        }, 7000);
      });
    });
  };
})(window);
