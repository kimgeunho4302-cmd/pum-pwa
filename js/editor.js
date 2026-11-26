/* ==========================================================================
   품 꾸미기 PWA — editor.js
   품 꾸미기(편집) · 설정 · 미리보기 · 공유(@주소) 화면
   ========================================================================== */
(function (global) {
  'use strict';

  var Pum = global.Pum;
  var U = Pum.util;
  var esc = U.esc;
  var icon = Pum.icon;

  var openIds = null; // 편집 화면에서 펼쳐진 블록 (세션 상태)
  var draftSlug = null;

  /* 배너 사이즈 — 대(1×1) · 중(2×1단 / 2×2단) · 소(3×1단) */
  var BANNER_SIZES = [
    { id: 'large', label: '대배너', spec: '1×1 한 줄 전체', crop: 'banner-large', w: 1280, h: 720, kb: 260 },
    { id: 'medium', label: '중배너', spec: '2×1단 (2개 한 줄)', crop: 'banner-medium', w: 800, h: 800, kb: 170 },
    { id: 'medium2', label: '중배너', spec: '2×2단 (세로형)', crop: 'banner-medium2', w: 640, h: 1280, kb: 190 },
    { id: 'small', label: '소배너', spec: '3×1단 (3개 한 줄)', crop: 'banner-small', w: 600, h: 600, kb: 90 }
  ];

  function state() {
    return Pum.getState();
  }

  function profile() {
    return state().profile;
  }

  /* ---------------------------------------------------------------------
     상단 공통 (앱바 · 탭)
     --------------------------------------------------------------------- */
  function appbar(title, opts) {
    var o = opts || {};
    return (
      '<header class="appbar">' +
      '<button type="button" class="appbar__icon" data-nav="back" aria-label="뒤로">' + icon('back') + '</button>' +
      '<div class="appbar__title">' + esc(title) + '</div>' +
      (o.action
        ? '<button type="button" class="appbar__text" data-nav="' + o.action.id + '">' + esc(o.action.label) + '</button>'
        : '<button type="button" class="appbar__icon" data-nav="home" aria-label="홈">' + icon('home') + '</button>') +
      '</header>'
    );
  }

  function tabs(active) {
    var items = [
      { id: 'editor', label: '품 꾸미기', icon: 'edit' },
      { id: 'preview', label: '미리보기', icon: 'preview' },
      { id: 'settings', label: '설정', icon: 'gear' }
    ];
    return (
      '<nav class="tabs" aria-label="품 메뉴">' +
      items
        .map(function (it) {
          return (
            '<button type="button" class="tabs__btn' + (it.id === active ? ' is-active' : '') +
            '" data-nav="' + it.id + '">' + icon(it.icon) + '<span>' + it.label + '</span></button>'
          );
        })
        .join('') +
      '</nav>'
    );
  }

  /* ---------------------------------------------------------------------
     품 꾸미기 화면
     --------------------------------------------------------------------- */
  function editorView(app) {
    var s = state();
    var p = s.profile;
    if (!openIds) {
      openIds = new Set();
      if (s.blocks.length) openIds.add(s.blocks[0].id);
    }
    draftSlug = p.slug || '';

    app.innerHTML =
      appbar('품 꾸미기', { action: { id: 'preview', label: '미리보기' } }) +
      tabs('editor') +
      '<div class="admin-entry">' +
      '<button type="button" class="btn btn--xs btn--ghost" data-nav="admin">' + icon('gear') + '내 품 관리</button>' +
      '<button type="button" class="btn btn--xs btn--ghost" data-nav="account">계정 관리</button>' +
      (p.slug
        ? '<button type="button" class="btn btn--xs btn--soft" data-action="open-pum">' + icon('external') + '내 품 열기 @' + esc(p.slug) + '</button>'
        : '') +
      '</div>' +
      publishBar(p) +
      '<div class="editor-grid">' +
      '<div class="editor-main">' +
      slugCard(p) +
      profileCard(p) +
      noticeCard(p) +
      '<section class="card card--flat" style="background:transparent;border:0;box-shadow:none;padding:0">' +
      '<div style="display:flex;align-items:center;gap:8px;padding:6px 4px 10px">' +
      '<h2 style="font-size:14.5px;font-weight:700;letter-spacing:-.02em">콘텐츠 영역</h2>' +
      '<span style="font-size:11.5px;color:var(--muted)">드래그하거나 화살표로 순서를 바꿔보세요</span>' +
      '</div>' +
      '<div class="block-list" id="blockList"></div>' +
      '<div class="add-block"><button type="button" data-action="add-block">' + icon('plus') + '꾸미기 추가</button></div>' +
      '<p class="editor-note">모든 변경은 이 브라우저에 자동 저장되고, 미리보기·공유 페이지에 바로 반영됩니다.</p>' +
      '</section>' +
      '</div>' +
      '<aside class="editor-aside" aria-label="실시간 미리보기">' +
      '<div class="editor-aside__label"><i></i>실시간 미리보기</div>' +
      '<div class="mini-phone"><div class="mini-phone__screen" id="miniPreview"></div></div>' +
      '<p class="editor-aside__hint">입력하는 즉시 공유 페이지와 같은 모습으로 반영됩니다.</p>' +
      '</aside>' +
      '</div>';

    renderBlockList(app);
    bindEditor(app);
    refreshPreview();
  }

  /* ------------------------------------------------------------ 발행 상태 바 */
  function publishBar(p) {
    if (p.published) {
      return (
        '<div class="publish-bar is-published">' +
        '<div class="publish-bar__text"><b>' + icon('check') + '발행되었습니다</b>' +
        '<span>' + esc(Pum.util.dateLabel(p.publishedAt)) + ' · 공유 링크와 QR 코드가 열려 있어요</span></div>' +
        '<button type="button" class="btn btn--sm btn--ghost" data-nav="share">공유 페이지</button>' +
        '</div>'
      );
    }
    return (
      '<div class="publish-bar">' +
      '<div class="publish-bar__text"><b>발행되지 않았습니다</b>' +
      '<span>발행해야 공유 링크·QR 코드가 열립니다. 발행 전에는 공유하기가 숨겨져요.</span></div>' +
      '<button type="button" class="btn btn--sm btn--primary" data-action="publish">발행하기</button>' +
      '</div>'
    );
  }

  /* ------------------------------------------------------------ 상단 공지 작성 */
  function noticeCard(p) {
    var n = p.notice || {};
    return (
      '<section class="card" id="noticeCard">' +
      '<div class="card__head"><h2 class="card__title">상단 공지</h2>' +
      '<label class="switch switch--sm" style="margin-left:auto" title="공유 페이지 상단 노출">' +
      '<input type="checkbox" id="noticeOn"' + (n.on === false ? '' : ' checked') + ' aria-label="상단 공지 노출" />' +
      '<span class="switch__track"></span></label></div>' +
      '<div class="card__body">' +
      '<div class="field">' +
      '<label class="field__label" for="noticeInput">공지 문구</label>' +
      '<input class="input" id="noticeInput" maxlength="100" placeholder="예) 12월 1일 반갑데이 특가 오픈!" value="' +
      esc(n.text || '') + '" /></div>' +
      '<p class="field__hint">공유·미리보기 화면 <b>상단에 1줄</b>로 표시되고, 길면 왼쪽으로 계속 흘러갑니다. ' +
      '공지는 손님의 터치·클릭에 반응하지 않습니다.</p>' +
      '<div class="notice-preview' + (n.on === false ? ' is-off' : '') + '" id="noticePreview">' +
      '<div class="share__owner-notice' + ((n.text || '').length > 22 ? ' is-marquee' : '') + '"><div class="share__owner-notice__track">' +
      '<span>' + esc(n.text || '공지 문구가 여기에 표시됩니다') + '</span>' +
      ((n.text || '').length > 22 ? '<span aria-hidden="true">' + esc(n.text) + '</span>' : '') +
      '</div></div></div>' +
      '</div></section>'
    );
  }

  /* ---------------------------------------------------------------- 품 주소 */
  function slugCard(p) {
    return (
      '<section class="card" id="slugCard">' +
      '<div class="card__head"><h2 class="card__title">품 주소</h2>' +
      '<span class="card__sub" style="margin-left:auto;font-size:11.5px">영문자만 입력</span></div>' +
      '<div class="card__body">' +
      '<div class="input-prefix" id="slugWrap">' +
      '<span class="input-prefix__label">https://pumss.co.kr/@</span>' +
      '<input class="input" id="slugInput" name="slug" type="text" inputmode="latin" spellcheck="false" autocomplete="off" placeholder="예: AyoGG" aria-label="품 주소" maxlength="20" data-own="' +
      esc(p.slug || '') + '" value="' +
      esc(p.slug || '') + '" />' +
      '<button class="input-prefix__btn" type="button" id="slugSave">저장</button>' +
      '</div>' +
      '<div class="slug-check" id="slugStatus" data-state="empty" aria-live="polite">' +
      '<span class="slug-check__dot"></span><span class="slug-check__text">영문 주소를 입력하면 사용 가능 여부를 확인합니다.</span>' +
      '</div>' +
      '<p class="field__hint">처음에는 비어 있습니다. 영문 대·소문자만 사용할 수 있어요. (한글·숫자·특수문자·공백 불가)</p>' +
      '</div></section>'
    );
  }

  /* ------------------------------------------------------------ 내 프로필 */
  function profileCard(p) {
    var theme = Pum.theme(p.theme);
    return (
      '<section class="card is-open" id="profileCard">' +
      '<div class="card__head"><h2 class="card__title">내 프로필</h2>' +
      '<span class="card__sub" style="margin-left:auto">' + esc(theme.label) + ' 테마</span></div>' +
      '<div class="card__body">' +
      '<div class="field">' +
      '<span class="field__label">배경+프로필 설정</span>' +
      '<div class="profile-modes" id="modeRow">' +
      Pum.LAYOUTS.map(function (l) {
        return (
          '<button type="button" class="mode-btn' + (p.layout === l.id ? ' is-active' : '') + '" data-layout="' + l.id + '" title="' +
          esc(l.desc) + '"><span class="mode-btn__thumb"><i class="t-strip"></i><i class="t-avatar"></i><i class="t-line"></i><i class="t-line2"></i></span>' +
          esc(l.label) + '</button>'
        );
      }).join('') +
      '</div>' +
      '<p class="field__hint" id="layoutHint">' + esc(layoutDesc(p.layout)) + '</p>' +
      '</div>' +

      '<div class="field">' +
      '<span class="field__label">배경 테마 색상 <span style="color:var(--muted);font-weight:500">(택1)</span></span>' +
      '<div class="theme-row" id="themeRow">' +
      Pum.THEMES.map(function (t) {
        return (
          '<button type="button" class="theme-btn' + (p.theme === t.id ? ' is-active' : '') + '" data-theme="' + t.id + '" title="' + esc(t.label) + '">' +
          '<span class="theme-btn__chip" style="background:' + t.base + ';border-color:' + (t.scheme === 'dark' ? '#3a3f48' : t.line) + '">' +
          '<i style="background:' + t.fg + '"></i><i style="background:' + t.fg + ';opacity:.35"></i></span>' +
          '<span class="theme-btn__name">' + esc(t.label) + '</span></button>'
        );
      }).join('') +
      '</div>' +
      '<p class="field__hint">모바일에서 보기 편한 단색 5종입니다. 프로필 영역 배경과 공유 페이지 텍스트 색에 적용됩니다.</p>' +
      '</div>' +

      '<div class="field">' +
      '<span class="field__label">내 이미지</span>' +
      '<div class="img-slots">' +
      imageSlot('profile', p.imgProfile) +
      imageSlot('bg', p.imgBg) +
      '</div>' +
      '<div class="img-actions">' +
      '<button type="button" class="btn btn--xs btn--ghost" data-img-action="profile-upload">' + icon('camera') + '1번 · 프로필 등록</button>' +
      '<button type="button" class="btn btn--xs btn--ghost" data-img-action="bg-upload">' + icon('image') + '2번 · 배경 등록</button>' +
      '<button type="button" class="btn btn--xs btn--soft" data-img-action="profile-sample">프로필 샘플</button>' +
      '<button type="button" class="btn btn--xs btn--soft" data-img-action="bg-sample">배경 샘플</button>' +
      '</div>' +
      '<p class="field__hint">1번 이미지는 프로필에, 2번 이미지는 배경에 사용됩니다. 등록하면 각도·위치·확대를 조절하는 크롭 창이 열립니다.</p>' +
      '</div>' +

      '<div class="field">' +
      '<label class="field__label" for="titleInput">타이틀 <span class="field__count" id="titleCount">0/100</span></label>' +
      '<textarea class="textarea textarea--auto" id="titleInput" rows="1" maxlength="100" placeholder="품 이름을 입력해주세요 (이름 또는 회사명)">' + esc(p.title || '') + '</textarea>' +
      '<p class="field__hint">최대 100자 · 엔터로 줄을 바꿀 수 있고 입력한 줄바꿈 그대로 표시됩니다.</p>' +
      '</div>' +

      '<div class="field">' +
      '<label class="field__label" for="introInput">소개글 <span class="field__count" id="introCount">0/500</span></label>' +
      '<textarea class="textarea textarea--auto" id="introInput" rows="3" maxlength="500" placeholder="페이지를 소개해보세요" style="text-align:center">' + esc(p.intro || '') + '</textarea>' +
      '<p class="field__hint">가운데 정렬로 표시되고, 최대 500자까지 글자 양에 맞춰 입력창 높이가 자동으로 늘어납니다.</p>' +
      '</div>' +
      '</div></section>'
    );
  }

  function layoutDesc(id) {
    var l = Pum.LAYOUTS.filter(function (x) {
      return x.id === id;
    })[0];
    return l ? l.desc : '';
  }

  function imageSlot(kind, value) {
    var isProfile = kind === 'profile';
    return (
      '<div class="islot-wrap' + (isProfile ? ' islot-wrap--avatar' : '') + '">' +
      '<div class="islot islot--' + (isProfile ? 'avatar' : 'bg') + '" data-slot="' + kind + '" role="button" tabindex="0" aria-label="' +
      (isProfile ? '프로필 사진 등록' : '배경 사진 등록') + '">' +
      (value
        ? '<img src="' + value + '" alt="" /><span class="islot__tools"><button type="button" class="islot__tool" data-img-del="' +
          kind + '" aria-label="사진 삭제">' + icon('trash') + '</button></span>'
        : '<span class="islot__empty">' + icon(isProfile ? 'camera' : 'image') + (isProfile ? '프로필 사진' : '배경 사진') + '</span>') +
      '</div>' +
      '<span class="islot__cap">' + (isProfile ? '1번 · 프로필' : '2번 · 배경') + '</span>' +
      '</div>'
    );
  }

  /* ---------------------------------------------------------------- 블록 */
  function blockTitle(b) {
    switch (b.type) {
      case 'textlink':
        return '텍스트 링크';
      case 'video':
        return '동영상';
      case 'banner':
        return '배너 링크';
      case 'map':
        return '지도';
      case 'freepum':
        return '품 무료 만들기';
      case 'apptech':
        return '앱테크';
      default:
        return {
          greeting: '반갑데이',
          sns: 'SNS',
          quote: '오늘의 명언',
          news: '일일뉴스',
          recs: '추천 컨텐츠'
        }[b.type] || b.type;
    }
  }

  function deletable(type) {
    return ['textlink', 'video', 'banner', 'map'].indexOf(type) >= 0;
  }

  function blockHTML(b, i, total) {
    var open = openIds.has(b.id);
    var on = b.on !== false;
    var hasToggle = b.type !== 'freepum';
    var globalOff = ['greeting', 'news', 'quote', 'recs', 'apptech'].indexOf(b.type) >= 0 && Pum.pumssOn && !Pum.pumssOn(b.type);
    return (
      '<article class="blk' + (open ? ' is-open' : '') + (on ? '' : ' is-off') + '" data-id="' + b.id + '" data-type="' + b.type + '">' +
      '<div class="blk__head">' +
      '<button type="button" class="blk__handle" aria-label="순서 변경 손잡이" title="드래그해서 순서 변경">' + icon('grip') + '</button>' +
      '<button type="button" class="blk__name" data-toggle-open="' + b.id + '"><span>' + esc(blockTitle(b)) + '</span>' +
      (b.type === 'sns' ? '<span class="blk__tag">아이콘</span>' : '') +
      (b.type === 'map' ? '<span class="blk__tag">신규</span>' : '') +
      (globalOff ? '<span class="blk__tag blk__tag--off" title="관리자가 서비스 전역에서 숨김 처리했습니다">서비스 OFF</span>' : '') +
      '</button>' +
      '<div class="blk__tools">' +
      (deletable(b.type)
        ? '<button type="button" class="blk__move" data-del="' + b.id + '" aria-label="블록 삭제" title="블록 삭제">' + icon('trash') + '</button>'
        : '') +
      '<button type="button" class="blk__move" data-move="up" data-id="' + b.id + '" aria-label="위로 이동"' + (i === 0 ? ' disabled' : '') + '>' + icon('arrowUp') + '</button>' +
      '<button type="button" class="blk__move" data-move="down" data-id="' + b.id + '" aria-label="아래로 이동"' + (i === total - 1 ? ' disabled' : '') + '>' + icon('arrowDown') + '</button>' +
      (hasToggle
        ? '<label class="switch switch--sm" title="노출 여부"><input type="checkbox" data-toggle-on="' + b.id + '"' + (on ? ' checked' : '') +
          ' aria-label="' + esc(blockTitle(b)) + ' 노출" /><span class="switch__track"></span></label>'
        : '') +
      '<button type="button" class="blk__chev" data-toggle-open="' + b.id + '" aria-label="' + (open ? '접기' : '펼치기') + '">' + icon('chevron') + '</button>' +
      '</div></div>' +
      '<div class="blk__body">' + blockBody(b) + '</div>' +
      '</article>'
    );
  }

  function blockBody(b) {
    var d = b.data || {};
    switch (b.type) {
      case 'greeting':
        return (
          '<div class="field"><label class="field__label">상품명</label>' +
          '<input class="input" data-field="title" data-id="' + b.id + '" value="' + esc(d.title || '') + '" placeholder="반갑데이 상품명" /></div>' +
          '<div class="field"><label class="field__label">브랜드 / 문구</label>' +
          '<input class="input" data-field="brand" data-id="' + b.id + '" value="' + esc(d.brand || '') + '" /></div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">' +
          numberField(b.id, 'off', '할인율 %', d.off) +
          numberField(b.id, 'price', '판매가', d.price) +
          numberField(b.id, 'was', '정가', d.was) +
          '</div>' +
          '<div class="field"><label class="field__label">남은 일수 (D-day)</label>' +
          '<input class="input" type="number" min="0" max="99" data-field="dday" data-id="' + b.id + '" value="' + esc(d.dday || 0) + '" /></div>'
        );
      case 'sns':
        var items = d.items || [];
        return (
          '<div class="field"><span class="field__label">등록하실 SNS를 추가하세요</span>' +
          '<div id="snsRows" data-id="' + b.id + '" style="display:flex;flex-direction:column;gap:8px">' +
          (items.length
            ? items
                .map(function (it, idx) {
                  var meta = Pum.snsMeta(it.icon);
                  return (
                    '<div class="sns-row" data-sns-row="' + idx + '">' +
                    '<img class="sns-row__icon" src="assets/sns/' + meta.id + '.jpg" alt="' + esc(meta.name) + '" />' +
                    '<input class="input" data-sns-url="' + idx + '" data-id="' + b.id + '" value="' + esc(it.url || '') + '" placeholder="' + esc(meta.name) + ' 주소" />' +
                    '<button type="button" class="icon-btn" data-sns-del="' + idx + '" data-id="' + b.id + '" aria-label="삭제">' + icon('trash') + '</button>' +
                    '</div>'
                  );
                })
                .join('')
            : '<div class="blk__empty">등록된 SNS가 없습니다</div>') +
          '</div>' +
          '<button type="button" class="btn btn--sm btn--ghost" data-sns-pick="' + b.id + '" style="align-self:flex-start;margin-top:2px">' + icon('plus') + 'SNS 선택</button>' +
          '</div>'
        );
      case 'textlink':
        return (
          '<div class="field"><label class="field__label">URL을 입력하세요</label>' +
          '<input class="input" data-field="url" data-id="' + b.id + '" value="' + esc(d.url || '') + '" placeholder="https://" inputmode="url" /></div>' +
          '<div class="field"><label class="field__label">대표문구</label>' +
          '<input class="input" data-field="label" data-id="' + b.id + '" value="' + esc(d.label || '') + '" placeholder="공유 페이지에 표시될 문구" /></div>'
        );
      case 'video':
        return (
          '<div class="field"><label class="field__label">동영상 주소를 입력하세요</label>' +
          '<input class="input" data-field="url" data-id="' + b.id + '" value="' + esc(d.url || '') + '" placeholder="https://www.youtube.com/watch?v=..." inputmode="url" /></div>' +
          '<p class="field__hint">유튜브 주소를 넣으면 공유 페이지에서 바로 재생됩니다.</p>'
        );
      case 'banner':
        var bsize = d.size || 'large';
        return (
          '<div class="field"><span class="field__label">배너 사이즈</span>' +
          '<div class="size-row">' +
          BANNER_SIZES.map(function (s) {
            return (
              '<button type="button" class="size-btn' + (bsize === s.id ? ' is-active' : '') + '" data-banner-size="' + s.id + '" data-id="' + b.id + '">' +
              '<span class="size-btn__box size-btn__box--' + s.id + '"></span>' +
              '<b>' + esc(s.label) + '</b><em>' + esc(s.spec) + '</em></button>'
            );
          }).join('') +
          '</div>' +
          '<p class="field__hint">' + esc(bannerSizeOf(bsize).spec) + ' · 권장 ' + bannerSizeOf(bsize).w + '×' + bannerSizeOf(bsize).h +
          'px · ' + bannerSizeOf(bsize).kb + 'KB 이하로 자동 리사이징됩니다.</p>' +
          '</div>' +
          '<div class="field"><label class="field__label">URL을 입력하세요</label>' +
          '<input class="input" data-field="url" data-id="' + b.id + '" value="' + esc(d.url || '') + '" placeholder="https://" inputmode="url" /></div>' +
          '<div class="field"><span class="field__label">이미지를 등록하세요</span>' +
          bannerSlot(b) +
          '<div class="img-actions">' +
          '<button type="button" class="btn btn--xs btn--ghost" data-banner-upload="' + b.id + '">' + icon('image') + '이미지 등록</button>' +
          '<button type="button" class="btn btn--xs btn--soft" data-banner-sample="' + b.id + '">샘플 이미지</button>' +
          '</div></div>' +
          '<div class="field"><label class="field__label">배너 하단 문구</label>' +
          '<input class="input" data-field="caption" data-id="' + b.id + '" maxlength="60" value="' + esc(d.caption || '') + '" placeholder="예) 12월 반갑데이 특가 보기" />' +
          '<p class="field__hint">공유 페이지에서 배너 아래 1줄로 표시되고, 길면 말줄임표(…)로 잘립니다.</p></div>'
        );
      case 'freepum':
        return (
          '<p class="field__hint" style="margin:0">On/Off 토글 없이 공유 페이지에 배너로 항상 노출됩니다. 배너를 누르면 초대장 안내와 함께 회원가입 페이지가 열립니다.</p>' +
          '<div class="map-note">' + icon('info') + '<span>품 무료 만들기 배너는 품스 홍보 영역이며, 편집할 수 없습니다.</span></div>'
        );
      case 'quote':
        return (
          '<div class="field"><label class="field__label">오늘의 명언</label>' +
          '<textarea class="textarea" rows="2" data-field="text" data-id="' + b.id + '" placeholder="명언을 입력하세요">' + esc(d.text || '') + '</textarea></div>' +
          '<div class="field"><label class="field__label">출처</label>' +
          '<input class="input" data-field="author" data-id="' + b.id + '" value="' + esc(d.author || '') + '" placeholder="작성자" /></div>'
        );
      case 'news':
        return (
          '<div class="field"><label class="field__label">헤드라인 문구</label>' +
          '<input class="input" data-field="title" data-id="' + b.id + '" value="' + esc(d.title || '') + '" placeholder="오늘의 헤드라인" /></div>' +
          '<p class="field__hint">날짜와 뉴스는 매일 자동으로 갱신됩니다. (프로토타입에서는 오늘 날짜 표시)</p>'
        );
      case 'recs':
        return (
          '<div class="map-note">' + icon('info') + '<span>추천 컨텐츠는 품스에서 매일 자동으로 채워집니다. 노출 여부만 설정할 수 있어요.</span></div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">' +
          ['이코노미', '라이프', '우먼', '헬스']
            .map(function (t) {
              return '<div style="border:1px solid var(--line);border-radius:10px;padding:9px 10px;font-size:12px;color:var(--ink-2);background:var(--surface-2)">' + t + '</div>';
            })
            .join('') +
          '</div>'
        );
      case 'apptech':
        var flags = d.items || [];
        return (
          '<p class="field__hint" style="margin:0">앱테크 8종의 노출을 각각 설정합니다. (기본값 ON)</p>' +
          Pum.APPTECH.map(function (item, idx) {
            var on = flags[idx] !== false;
            return (
              '<div class="apptech-item">' +
              '<img src="' + item.icon + '" alt="" />' +
              '<div class="apptech-item__body"><div class="apptech-item__title">' + item.title + '</div>' +
              '<div class="apptech-item__desc">' + esc(item.desc) + '</div></div>' +
              '<label class="switch switch--sm"><input type="checkbox" data-apptech="' + idx + '" data-id="' + b.id + '"' + (on ? ' checked' : '') +
              ' aria-label="' + esc(item.title.replace(/<[^>]*>/g, '')) + ' 노출" /><span class="switch__track"></span></label>' +
              '</div>'
            );
          }).join('')
        );
      case 'map':
        return (
          '<div class="field"><label class="field__label">주소 또는 장소명</label>' +
          '<div class="map-search-row">' +
          '<input class="input" id="mapInput-' + b.id + '" data-map-input="' + b.id + '" value="' + esc(d.address || '') + '" placeholder="예) 서울 서초구 동산로 67" />' +
          '<button type="button" class="btn btn--primary" data-map-search="' + b.id + '">' + icon('search') + '검색</button>' +
          '</div>' +
          '<div class="field__hint">카카오 주소·장소 검색과 직접 입력을 모두 지원합니다. 검색 결과가 없어도 입력한 주소로 저장할 수 있어요.</div>' +
          '<div class="map-results" id="mapResults-' + b.id + '"></div>' +
          '</div>' +
          '<div class="editor-map-preview" data-editor-map="' + b.id + '"></div>' +
          '<div class="coord">' +
          '<span>위도 ' + (d.lat ? Number(d.lat).toFixed(5) : '-') + '</span>' +
          '<span>경도 ' + (d.lng ? Number(d.lng).toFixed(5) : '-') + '</span>' +
          '<span>' + (d.place ? '장소: ' + esc(d.place) : '') + '</span>' +
          '</div>' +
          '<div class="img-actions">' +
          '<button type="button" class="btn btn--xs btn--ghost" data-map-save="' + b.id + '">' + icon('check') + '이 주소로 저장</button>' +
          '<button type="button" class="btn btn--xs btn--soft" data-map-clear="' + b.id + '">주소 지우기</button>' +
          '</div>'
        );
      default:
        return '<div class="blk__empty">설정할 항목이 없습니다</div>';
    }
  }

  function numberField(id, field, label, value) {
    return (
      '<div class="field"><label class="field__label" style="font-size:11.5px">' + label + '</label>' +
      '<input class="input" style="min-height:42px;font-size:13px" type="number" min="0" data-field="' + field + '" data-id="' + id + '" value="' +
      esc(value == null ? '' : value) + '" /></div>'
    );
  }

  function bannerSizeOf(id) {
    return (
      BANNER_SIZES.filter(function (s) {
        return s.id === id;
      })[0] || BANNER_SIZES[0]
    );
  }

  function bannerSlot(b) {
    var img = b.data && b.data.img;
    var size = (b.data && b.data.size) || 'large';
    return (
      '<div class="islot islot--bg banner-slot banner-slot--' + esc(size) + '" data-banner-slot="' + b.id + '">' +
      (img
        ? '<img src="' + img + '" alt="배너 이미지" /><span class="islot__tools"><button type="button" class="islot__tool" data-banner-del="' + b.id + '" aria-label="이미지 삭제">' + icon('trash') + '</button></span>'
        : '<span class="islot__empty">' + icon('image') + '이미지를 선택하거나 끌어다 놓으세요</span>') +
      '</div>'
    );
  }

  /* ------------------------------------------------------- 블록 목록 렌더 */
  function renderBlockList(app) {
    var list = app.querySelector('#blockList');
    if (!list) return;
    var blocks = state().blocks;
    list.innerHTML = blocks
      .map(function (b, i) {
        return blockHTML(b, i, blocks.length);
      })
      .join('');
    bindImageSlots(app);
    mountEditorMaps(app);
  }

  function mountEditorMaps(app) {
    var nodes = app.querySelectorAll('[data-editor-map]');
    Array.prototype.forEach.call(nodes, function (el) {
      var id = el.getAttribute('data-editor-map');
      var b = Pum.findBlock(id);
      if (b) Pum.map.render(el, b.data);
    });
  }

  /* -------------------------------------------------------------- 미리보기 */
  var refreshTimer = null;
  function refreshPreview(app) {
    var root = app || document.getElementById('app');
    if (!root) return;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function () {
      var shot = root.querySelector('#miniPreview');
      if (shot) {
        shot.innerHTML = Pum.renderShare(state(), { placeholder: true, mini: true });
        Pum.mountMaps(shot);
      }
    }, 120);
  }

  /* ------------------------------------------------------------------ 이벤트 */
  function bindEditor(app) {
    var s = state();
    var p = s.profile;

    /* ---- 품 주소 (영문만 허용) ---- */
    var slugInput = app.querySelector('#slugInput');
    var slugWrap = app.querySelector('#slugWrap');
    var slugSave = app.querySelector('#slugSave');
    var lastWarn = 0;

    function warnSlug() {
      var now = Date.now();
      slugWrap.classList.add('is-error');
      setTimeout(function () {
        slugWrap.classList.remove('is-error');
      }, 700);
      if (now - lastWarn < 1200) return;
      lastWarn = now;
      Pum.modal({
        center: true,
        title: '입력할 수 없습니다',
        desc: '품 주소는 영문자(a-z, A-Z)만 입력할 수 있습니다.\n한글·숫자·특수문자·공백은 사용할 수 없어요.',
        actions: [{ label: '확인', kind: 'primary' }]
      });
    }

    slugInput.addEventListener('keydown', function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        saveSlug();
        return;
      }
      if (e.key && e.key.length === 1 && !/^[a-zA-Z]$/.test(e.key)) {
        e.preventDefault();
        warnSlug();
      }
    });

    slugInput.addEventListener('paste', function (e) {
      var text = (e.clipboardData || window.clipboardData).getData('text') || '';
      if (!text) return;
      e.preventDefault();
      var cleaned = text.replace(/[^a-zA-Z]/g, '');
      if (cleaned.length !== text.length) warnSlug();
      if (cleaned) {
        var start = slugInput.selectionStart || 0;
        var end = slugInput.selectionEnd || 0;
        var v = slugInput.value;
        slugInput.value = v.slice(0, start) + cleaned + v.slice(end);
        var pos = start + cleaned.length;
        slugInput.setSelectionRange(pos, pos);
        draftSlug = slugInput.value;
      }
    });

    slugInput.addEventListener('input', function () {
      var v = slugInput.value;
      var cleaned = v.replace(/[^a-zA-Z]/g, '');
      if (v !== cleaned) {
        warnSlug();
        slugInput.value = cleaned;
      }
      draftSlug = slugInput.value;
      if (cleaned) checkSlugSoon();
      else paintSlug({ state: 'empty', message: '' });
    });

    function saveSlug() {
      var value = (slugInput.value || '').trim();
      if (!value) {
        Pum.toast('품 주소를 입력해 주세요', 'err');
        slugInput.focus();
        return;
      }
      var res = runSlugCheck();
      if (res.state === 'taken') {
        Pum.toast('이미 사용 중인 주소입니다', 'err');
        slugInput.focus();
        return;
      }
      if (res.state === 'reserved') {
        Pum.toast('시스템 예약어로 사용할 수 없습니다', 'err');
        slugInput.focus();
        return;
      }
      if (res.state !== 'ok') {
        Pum.toast('품 주소는 영문자만 사용할 수 있습니다', 'err');
        slugInput.focus();
        return;
      }
      Pum.update(function (st) {
        st.profile.slug = value;
      });
      slugInput.setAttribute('data-own', value);
      if (Pum.adminSyncUser) Pum.adminSyncUser();
      Pum.toast('품 주소를 저장했습니다');
      refreshPreview(app);
    }
    slugSave.addEventListener('click', saveSlug);

    /* ---- 품 주소 실시간 중복 · 예약어 검사 (250ms 디바운스) ---- */
    var slugStatus = app.querySelector('#slugStatus');

    function paintSlug(res) {
      if (!slugStatus) return;
      slugStatus.setAttribute('data-state', res.state || 'empty');
      var text = slugStatus.querySelector('.slug-check__text');
      if (text) {
        if (res.state === 'taken' && res.owner) text.textContent = res.message + ' (' + res.owner + ' 님 사용 중)';
        else if (res.state === 'ok') text.textContent = res.message;
        else if (res.state === 'empty') text.textContent = '영문 주소를 입력하면 사용 가능 여부를 확인합니다.';
        else text.textContent = res.message;
      }
      if (slugWrap) slugWrap.classList.toggle('is-blocked', res.state === 'taken' || res.state === 'reserved');
    }

    function runSlugCheck() {
      var res = Pum.checkSlug(slugInput.value, slugInput.getAttribute('data-own') || '');
      paintSlug(res);
      return res;
    }
    var checkSlugSoon = U.debounce(function () {
      runSlugCheck();
    }, 250);

    (function initSlugStatus() {
      var v = (slugInput.value || '').trim();
      if (!v) {
        paintSlug({ state: 'empty', message: '' });
      } else {
        runSlugCheck();
      }
    })();

    /* ---- 프로필 모드 / 테마 ---- */
    app.querySelectorAll('#modeRow .mode-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var layout = btn.getAttribute('data-layout');
        app.querySelectorAll('#modeRow .mode-btn').forEach(function (x) {
          x.classList.toggle('is-active', x === btn);
        });
        var hint = app.querySelector('#layoutHint');
        if (hint) hint.textContent = layoutDesc(layout);
        Pum.update(function (st) {
          st.profile.layout = layout;
        });
        refreshPreview(app);
      });
    });

    app.querySelectorAll('#themeRow .theme-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var th = btn.getAttribute('data-theme');
        app.querySelectorAll('#themeRow .theme-btn').forEach(function (x) {
          x.classList.toggle('is-active', x === btn);
        });
        var sub = app.querySelector('#profileCard .card__sub');
        if (sub) sub.textContent = Pum.theme(th).label + ' 테마';
        Pum.update(function (st) {
          st.profile.theme = th;
        });
        refreshPreview(app);
      });
    });

    /* ---- 이미지 업로드 ---- */
    bindImageSlots(app);

    app.querySelectorAll('[data-img-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var act = btn.getAttribute('data-img-action');
        if (act === 'profile-upload') {
          Pum.pickImage(function (file) {
            uploadImage(app, 'profile', file);
          });
        } else if (act === 'bg-upload') {
          Pum.pickImage(function (file) {
            uploadImage(app, 'bg', file);
          });
        } else if (act === 'profile-sample') {
          var idx = Math.floor(Math.random() * U.sampleProfile.length);
          applyImage(app, 'profile', U.sampleProfile[idx]);
          Pum.toast('프로필 샘플을 적용했습니다');
        } else if (act === 'bg-sample') {
          applyImage(app, 'bg', U.sampleBg);
          Pum.toast('배경 샘플을 적용했습니다');
        }
      });
    });

    /* ---- 타이틀 / 소개글 (엔터·자동 높이) ---- */
    var titleInput = app.querySelector('#titleInput');
    var introInput = app.querySelector('#introInput');
    var titleCount = app.querySelector('#titleCount');
    var introCount = app.querySelector('#introCount');

    function grow(el, min) {
      el.style.height = 'auto';
      el.style.height = Math.max(min, el.scrollHeight) + 'px';
    }
    function paintCounts() {
      if (titleCount) titleCount.textContent = titleInput.value.length + '/100';
      if (introCount) introCount.textContent = introInput.value.length + '/500';
    }
    grow(titleInput, 46);
    grow(introInput, 96);
    paintCounts();

    titleInput.addEventListener('input', function () {
      grow(titleInput, 46);
      paintCounts();
    });
    introInput.addEventListener('input', function () {
      grow(introInput, 96);
      paintCounts();
    });

    var saveText = U.debounce(function () {
      Pum.update(
        function (st) {
          st.profile.title = titleInput.value;
          st.profile.intro = introInput.value;
        },
        { silent: true }
      );
      refreshPreview(app);
    }, 260);

    titleInput.addEventListener('input', saveText);
    introInput.addEventListener('input', saveText);

    /* ---- 상단 공지 ---- */
    var noticeInput = app.querySelector('#noticeInput');
    var noticeOn = app.querySelector('#noticeOn');
    var noticePreview = app.querySelector('#noticePreview');

    function paintNoticePreview() {
      if (!noticePreview) return;
      var text = (noticeInput.value || '').trim();
      var marquee = text.length > 22;
      noticePreview.classList.toggle('is-off', !noticeOn.checked);
      noticePreview.innerHTML =
        '<div class="share__owner-notice' + (marquee ? ' is-marquee' : '') + '"><div class="share__owner-notice__track">' +
        '<span>' + esc(text || '공지 문구가 여기에 표시됩니다') + '</span>' +
        (marquee ? '<span aria-hidden="true">' + esc(text) + '</span>' : '') +
        '</div></div>';
    }

    var saveNotice = U.debounce(function () {
      Pum.update(
        function (st) {
          st.profile.notice = { text: noticeInput.value, on: noticeOn.checked };
        },
        { silent: true }
      );
      refreshPreview(app);
    }, 220);

    if (noticeInput) {
      noticeInput.addEventListener('input', function () {
        paintNoticePreview();
        saveNotice();
      });
      noticeOn.addEventListener('change', function () {
        paintNoticePreview();
        saveNotice();
      });
    }

    /* ---- 발행 / 내 품 열기 ---- */
    var publishBtn = app.querySelector('[data-action="publish"]');
    if (publishBtn) {
      publishBtn.addEventListener('click', function () {
        if (!state().profile.slug) {
          Pum.toast('품 주소를 먼저 정해 주세요', 'err');
          var input = app.querySelector('#slugInput');
          if (input) input.focus();
          return;
        }
        Pum.update(function (st) {
          st.profile.published = true;
          st.profile.publishedAt = new Date().toISOString();
        });
        if (Pum.logAudit) Pum.logAudit('품 발행 @' + state().profile.slug);
        Pum.toast('품을 발행했습니다. 이제 공유 링크와 QR 코드를 쓸 수 있어요');
        editorView(app);
      });
    }
    var openPum = app.querySelector('[data-action="open-pum"]');
    if (openPum) {
      openPum.addEventListener('click', function () {
        Pum.go('/p/' + state().profile.slug);
      });
    }

    /* ---- 블록 목록 이벤트 ---- */
    bindBlockEvents(app);

    /* ---- 꾸미기 추가 ---- */
    app.querySelector('[data-action="add-block"]').addEventListener('click', function () {
      addBlockModal(app);
    });

    /* ---- 드래그 ---- */
    initDrag(app);
  }

  /* -------------------------------------------------------- 이미지 슬롯 바인딩 */
  function bindImageSlots(app) {
    app.querySelectorAll('[data-slot]').forEach(function (slot) {
      if (slot.dataset.slotBound) return;
      slot.dataset.slotBound = '1';
      var kind = slot.getAttribute('data-slot');
      slot.addEventListener('click', function (e) {
        var del = e.target.closest('[data-img-del]');
        if (del) {
          e.stopPropagation();
          applyImage(app, kind, '');
          Pum.toast('사진을 삭제했습니다');
          return;
        }
        Pum.pickImage(function (file) {
          uploadImage(app, kind, file);
        });
      });
      slot.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          Pum.pickImage(function (file) {
            uploadImage(app, kind, file);
          });
        }
      });
      addDropHandlers(slot, function (file) {
        uploadImage(app, kind, file);
      });
    });

    app.querySelectorAll('[data-banner-upload]').forEach(function (btn) {
      if (btn.dataset.slotBound) return;
      btn.dataset.slotBound = '1';
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-banner-upload');
        Pum.pickImage(function (file) {
          uploadBanner(app, id, file);
        });
      });
    });

    app.querySelectorAll('[data-banner-slot]').forEach(function (slot) {
      if (slot.dataset.slotBound) return;
      slot.dataset.slotBound = '1';
      var id = slot.getAttribute('data-banner-slot');
      slot.addEventListener('click', function (e) {
        var del = e.target.closest('[data-banner-del]');
        if (del) {
          e.stopPropagation();
          Pum.update(function (st) {
            var b = st.blocks.filter(function (x) {
              return x.id === id;
            })[0];
            if (b) b.data.img = '';
          });
          renderBlockList(app);
          Pum.toast('배너 이미지를 삭제했습니다');
          return;
        }
        Pum.pickImage(function (file) {
          uploadBanner(app, id, file);
        });
      });
      addDropHandlers(slot, function (file) {
        uploadBanner(app, id, file);
      });
    });

    app.querySelectorAll('[data-banner-sample]').forEach(function (btn) {
      if (btn.dataset.slotBound) return;
      btn.dataset.slotBound = '1';
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-banner-sample');
        Pum.update(function (st) {
          var b = st.blocks.filter(function (x) {
            return x.id === id;
          })[0];
          if (b) b.data.img = U.sampleBanner;
        });
        renderBlockList(app);
        Pum.toast('샘플 배너를 적용했습니다');
      });
    });
  }

  function addDropHandlers(el, onFile) {
    ['dragenter', 'dragover'].forEach(function (ev) {
      el.addEventListener(ev, function (e) {
        e.preventDefault();
        e.stopPropagation();
        el.classList.add('is-dragover');
      });
    });
    ['dragleave', 'dragend'].forEach(function (ev) {
      el.addEventListener(ev, function (e) {
        e.preventDefault();
        el.classList.remove('is-dragover');
      });
    });
    el.addEventListener('drop', function (e) {
      e.preventDefault();
      e.stopPropagation();
      el.classList.remove('is-dragover');
      var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) onFile(file);
    });
  }

  var IMG_CONF = {
    profile: { maxSize: 600, quality: 0.86, targetBytes: 130 * 1024, keepAlpha: false },
    bg: { maxSize: 1200, quality: 0.82, targetBytes: 280 * 1024, keepAlpha: false },
    banner: { maxSize: 1200, quality: 0.84, targetBytes: 240 * 1024, keepAlpha: false }
  };

  function uploadImage(app, kind, file) {
    if (!file) return;
    if (!/^image\//.test(file.type || '')) {
      Pum.toast('이미지 파일만 등록할 수 있습니다', 'err');
      return;
    }
    Pum.crop.open({
      file: file,
      kind: kind,
      onDone: function (res) {
        applyImage(app, kind, res.dataUrl);
        Pum.toast(
          (kind === 'profile' ? '프로필' : '배경') + ' 사진을 등록했습니다 (' + res.width + '×' + res.height + ')'
        );
      }
    });
  }

  function uploadBanner(app, id, file) {
    if (!file) return;
    if (!/^image\//.test(file.type || '')) {
      Pum.toast('이미지 파일만 등록할 수 있습니다', 'err');
      return;
    }
    var b = Pum.findBlock(id);
    var size = (b && b.data && b.data.size) || 'large';
    var conf = bannerSizeOf(size);
    Pum.crop.open({
      file: file,
      kind: conf.crop,
      onDone: function (res) {
        Pum.update(function (st) {
          var target = st.blocks.filter(function (x) {
            return x.id === id;
          })[0];
          if (target) target.data.img = res.dataUrl;
        });
        renderBlockList(app);
        refreshPreview(app);
        Pum.toast(conf.label + ' 이미지를 등록했습니다 (' + res.width + '×' + res.height + ')');
      }
    });
  }

  function applyImage(app, kind, dataUrl) {
    Pum.update(
      function (st) {
        if (kind === 'profile') st.profile.imgProfile = dataUrl;
        else st.profile.imgBg = dataUrl;
      },
      { silent: true }
    );
    // 슬롯 DOM 갱신
    var slot = app.querySelector('[data-slot="' + kind + '"]');
    if (slot) {
      var badge = slot.querySelector('.islot__badge');
      slot.innerHTML =
        (badge ? badge.outerHTML : '') +
        (dataUrl
          ? '<img src="' + dataUrl + '" alt="" /><span class="islot__tools"><button type="button" class="islot__tool" data-img-del="' +
            kind + '" aria-label="사진 삭제">' + icon('trash') + '</button></span>'
          : '<span class="islot__empty">' + icon(kind === 'profile' ? 'camera' : 'image') +
            (kind === 'profile' ? '프로필 사진' : '배경 사진') + '</span>');
      bindImageSlots(app);
    }
    refreshPreview(app);
  }

  /* ------------------------------------------------------------- 블록 이벤트 */
  function bindBlockEvents(app) {
    var list = app.querySelector('#blockList');
    if (!list) return;

    list.addEventListener('click', function (e) {
      var t = e.target;

      var sizeBtn = t.closest('[data-banner-size]');
      if (sizeBtn) {
        var szId = sizeBtn.getAttribute('data-banner-size');
        var szBid = sizeBtn.getAttribute('data-id');
        Pum.update(function (st) {
          var b = st.blocks.filter(function (x) {
            return x.id === szBid;
          })[0];
          if (b) b.data.size = szId;
        });
        openIds.add(szBid);
        renderBlockList(app);
        var szEl = app.querySelector('.blk[data-id="' + szBid + '"]');
        if (szEl) szEl.classList.add('is-open');
        refreshPreview(app);
        Pum.toast(bannerSizeOf(szId).label + ' · ' + bannerSizeOf(szId).spec + ' 로 변경했습니다');
        return;
      }

      var openBtn = t.closest('[data-toggle-open]');
      if (openBtn) {
        var id = openBtn.getAttribute('data-toggle-open');
        var item = list.querySelector('.blk[data-id="' + id + '"]');
        if (!item) return;
        var willOpen = !item.classList.contains('is-open');
        item.classList.toggle('is-open', willOpen);
        if (willOpen) openIds.add(id);
        else openIds.delete(id);
        return;
      }

      var delBtn = t.closest('[data-del]');
      if (delBtn) {
        var did = delBtn.getAttribute('data-del');
        Pum.confirm('이 블록을 삭제할까요?', { okLabel: '삭제', danger: true }).then(function (ok) {
          if (!ok) return;
          Pum.update(function (st) {
            st.blocks = st.blocks.filter(function (b) {
              return b.id !== did;
            });
          });
          openIds.delete(did);
          renderBlockList(app);
          refreshPreview(app);
          Pum.toast('블록을 삭제했습니다');
        });
        return;
      }

      var moveBtn = t.closest('[data-move]');
      if (moveBtn) {
        var mid = moveBtn.getAttribute('data-id');
        var dir = moveBtn.getAttribute('data-move');
        moveBlock(mid, dir === 'up' ? -1 : 1);
        renderBlockList(app);
        refreshPreview(app);
        return;
      }

      var snsPick = t.closest('[data-sns-pick]');
      if (snsPick) {
        snsPicker(snsPick.getAttribute('data-sns-pick'), app);
        return;
      }

      var snsDel = t.closest('[data-sns-del]');
      if (snsDel) {
        var sid = snsDel.getAttribute('data-id');
        var idx = Number(snsDel.getAttribute('data-sns-del'));
        Pum.update(function (st) {
          var b = st.blocks.filter(function (x) {
            return x.id === sid;
          })[0];
          if (b) b.data.items.splice(idx, 1);
        });
        renderBlockList(app);
        refreshPreview(app);
        return;
      }

      var mapSearch = t.closest('[data-map-search]');
      if (mapSearch) {
        runMapSearch(mapSearch.getAttribute('data-map-search'), app);
        return;
      }
      var mapSave = t.closest('[data-map-save]');
      if (mapSave) {
        saveMapAddress(mapSave.getAttribute('data-map-save'), app);
        return;
      }
      var mapClear = t.closest('[data-map-clear]');
      if (mapClear) {
        var clid = mapClear.getAttribute('data-map-clear');
        Pum.update(function (st) {
          var b = st.blocks.filter(function (x) {
            return x.id === clid;
          })[0];
          if (b) b.data = { address: '', road: '', place: '', lat: '', lng: '' };
        });
        renderBlockList(app);
        refreshPreview(app);
        Pum.toast('주소를 지웠습니다');
        return;
      }

      var result = t.closest('[data-map-result]');
      if (result) {
        var rid = result.getAttribute('data-map-result');
        var rIdx = Number(result.getAttribute('data-idx'));
        if (rIdx < 0) saveMapAddress(rid, app);
        else pickMapResult(rid, rIdx, app);
        return;
      }
    });

    list.addEventListener('change', function (e) {
      var t = e.target;
      if (t.matches('[data-toggle-on]')) {
        var id = t.getAttribute('data-toggle-on');
        var on = t.checked;
        Pum.update(function (st) {
          var b = st.blocks.filter(function (x) {
            return x.id === id;
          })[0];
          if (b) b.on = on;
        });
        var item = list.querySelector('.blk[data-id="' + id + '"]');
        if (item) item.classList.toggle('is-off', !on);
        refreshPreview(app);
        return;
      }
      if (t.matches('[data-apptech]')) {
        var bid = t.getAttribute('data-id');
        var ai = Number(t.getAttribute('data-apptech'));
        Pum.update(function (st) {
          var b = st.blocks.filter(function (x) {
            return x.id === bid;
          })[0];
          if (b) {
            if (!Array.isArray(b.data.items)) b.data.items = Pum.APPTECH.map(function () { return true; });
            b.data.items[ai] = t.checked;
          }
        });
        refreshPreview(app);
      }
    });

    var fieldTimer = null;
    var persistSoon = U.debounce(function () {
      Pum.save({ silent: true });
    }, 400);

    list.addEventListener('input', function (e) {
      var t = e.target;
      if (t.matches('[data-field]')) {
        var id = t.getAttribute('data-id');
        var field = t.getAttribute('data-field');
        var raw = t.value;
        var value = t.type === 'number' ? (raw === '' ? '' : Number(raw)) : raw;
        var b = Pum.findBlock(id);
        if (b) b.data[field] = value;
        persistSoon();
        refreshPreview(app);
        return;
      }
      if (t.matches('[data-sns-url]')) {
        var sid = t.getAttribute('data-id');
        var idx = Number(t.getAttribute('data-sns-url'));
        var block = Pum.findBlock(sid);
        if (block && block.data.items[idx]) block.data.items[idx].url = t.value;
        persistSoon();
        refreshPreview(app);
      }
    });

    list.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var t = e.target;
      if (t.matches('[data-map-input]')) {
        e.preventDefault();
        runMapSearch(t.getAttribute('data-map-input'), app);
      }
    });
  }

  function moveBlock(id, delta) {
    Pum.update(function (st) {
      var i = st.blocks.findIndex(function (b) {
        return b.id === id;
      });
      var j = i + delta;
      if (i < 0 || j < 0 || j >= st.blocks.length) return;
      var tmp = st.blocks[i];
      st.blocks[i] = st.blocks[j];
      st.blocks[j] = tmp;
    });
  }

  /* --------------------------------------------------------------- 드래그 */
  function initDrag(app) {
    var list = app.querySelector('#blockList');
    if (!list || list.dataset.dragBound) return;
    list.dataset.dragBound = '1';

    var dragEl = null;
    var startY = 0;
    var moved = false;

    list.addEventListener('pointerdown', function (e) {
      var handle = e.target.closest('.blk__handle');
      if (!handle) return;
      dragEl = handle.closest('.blk');
      if (!dragEl) return;
      e.preventDefault();
      startY = e.clientY;
      moved = false;
      dragEl.classList.add('is-dragging');
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
    });

    function onMove(e) {
      if (!dragEl) return;
      if (Math.abs(e.clientY - startY) > 4) moved = true;
      var y = e.clientY;
      var siblings = Array.prototype.slice.call(list.children).filter(function (el) {
        return el !== dragEl;
      });
      var placed = false;
      for (var i = 0; i < siblings.length; i++) {
        var r = siblings[i].getBoundingClientRect();
        if (y < r.top + r.height / 2) {
          if (dragEl.nextElementSibling !== siblings[i]) list.insertBefore(dragEl, siblings[i]);
          placed = true;
          break;
        }
      }
      if (!placed && list.lastElementChild !== dragEl) list.appendChild(dragEl);
      // 가장자리 자동 스크롤
      var vh = window.innerHeight;
      if (y < 70) window.scrollBy(0, -12);
      else if (y > vh - 70) window.scrollBy(0, 12);
    }

    function onUp() {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      if (!dragEl) return;
      dragEl.classList.remove('is-dragging');
      dragEl = null;
      if (!moved) return;
      var order = Array.prototype.map.call(list.children, function (el) {
        return el.getAttribute('data-id');
      });
      Pum.update(function (st) {
        var map = {};
        st.blocks.forEach(function (b) {
          map[b.id] = b;
        });
        var next = order
          .map(function (id) {
            return map[id];
          })
          .filter(Boolean);
        if (next.length === st.blocks.length) st.blocks = next;
      });
      // 화살표 버튼 상태를 다시 그리기 위해 목록 재렌더
      renderBlockList(app);
      refreshPreview(app);
      Pum.toast('순서를 변경했습니다');
    }
  }

  /* -------------------------------------------------------- 꾸미기 추가 팝업 */
  function addBlockModal(app) {
    var items = [
      { type: 'sns', title: 'SNS 추가', desc: '인스타그램·유튜브 등 아이콘과 링크', ic: 'link', multi: false },
      { type: 'textlink', title: '텍스트 링크 추가', desc: 'URL과 대표문구', ic: 'link', multi: true },
      { type: 'banner', title: '배너링크 추가', desc: 'URL + 이미지 등록', ic: 'image', multi: true },
      { type: 'video', title: '동영상 추가', desc: '유튜브 동영상 바로 재생', ic: 'video', multi: true },
      { type: 'map', title: '지도 추가', desc: '주소를 넣으면 카카오맵으로 표시', ic: 'map', multi: true, isNew: true }
    ];

    var body =
      '<div class="add-list">' +
      items
        .map(function (it, i) {
          return (
            '<button type="button" class="add-item' + (it.isNew ? ' add-item--new' : '') + '" data-add="' + it.type + '" data-idx="' + i + '">' +
            '<span class="add-item__icon">' + icon(it.ic) + '</span>' +
            '<span style="flex:1"><span class="add-item__title">' + esc(it.title) +
            (it.isNew ? '<span class="pill-new">NEW</span>' : '') + '</span>' +
            '<span class="add-item__desc">' + esc(it.desc) + '</span></span>' +
            '<span style="color:var(--muted)">' + icon('arrowRight') + '</span>' +
            '</button>'
          );
        })
        .join('') +
      '</div>';

    var m = Pum.modal({
      title: '꾸미기 추가',
      desc: '원하시는 링크를 선택 후 추가해보세요.',
      body: body
    });

    m.body.querySelectorAll('[data-add]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var type = btn.getAttribute('data-add');
        addBlock(type, app);
        m.close();
      });
    });
  }

  function addBlock(type, app) {
    var b = {
      id: U.uid(type),
      type: type,
      on: true,
      data:
        type === 'textlink'
          ? { url: '', label: '' }
          : type === 'video'
          ? { url: '' }
          : type === 'banner'
          ? { url: '', img: '', size: 'large', caption: '' }
          : type === 'map'
          ? { address: '', road: '', place: '', lat: '', lng: '' }
          : type === 'sns'
          ? { items: [{ icon: 'instagram', url: 'https://www.instagram.com/' }] }
          : {}
    };
    Pum.update(function (st) {
      st.blocks.push(b);
    });
    openIds.add(b.id);
    renderBlockList(app);
    refreshPreview(app);
    Pum.toast(blockTitle(b) + ' 블록을 추가했습니다');
    var el = app.querySelector('.blk[data-id="' + b.id + '"]');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ------------------------------------------------------------- SNS 선택 */
  function snsPicker(blockId, app) {
    var body =
      '<div class="sns-grid">' +
      Pum.SNS_LIST.map(function (s) {
        return (
          '<button type="button" class="sns-pick" data-pick="' + s.id + '">' +
          '<img src="assets/sns/' + s.id + '.jpg" alt="' + esc(s.name) + '" />' +
          '<span>' + esc(s.name) + '</span></button>'
        );
      }).join('') +
      '</div>';

    var m = Pum.modal({
      title: 'SNS icon 등록',
      desc: 'icon을 눌러 SNS를 추가하세요!',
      body: body
    });

    m.body.querySelectorAll('[data-pick]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var sid = btn.getAttribute('data-pick');
        Pum.update(function (st) {
          var b = st.blocks.filter(function (x) {
            return x.id === blockId;
          })[0];
          if (!b) return;
          if (!Array.isArray(b.data.items)) b.data.items = [];
          var exists = b.data.items.some(function (i) {
            return i.icon === sid;
          });
          if (exists) {
            Pum.toast('이미 추가된 SNS입니다', 'err');
            return;
          }
          b.data.items.push({ icon: sid, url: '' });
        });
        renderBlockList(app);
        openIds.add(blockId);
        var el = app.querySelector('.blk[data-id="' + blockId + '"]');
        if (el) el.classList.add('is-open');
        refreshPreview(app);
        m.close();
        Pum.toast(Pum.snsMeta(sid).name + '을(를) 추가했습니다');
      });
    });
  }

  /* ------------------------------------------------------------------ 지도 */
  var mapResults = {};

  function runMapSearch(id, app) {
    var input = app.querySelector('[data-map-input="' + id + '"]');
    var box = app.querySelector('#mapResults-' + id);
    if (!input || !box) return;
    var q = input.value.trim();
    if (!q) {
      Pum.toast('주소나 장소명을 입력해 주세요', 'err');
      input.focus();
      return;
    }
    box.innerHTML = '<div class="map-result"><strong>검색 중…</strong><span>카카오 주소·장소 검색</span></div>';
    Pum.searchPlaces(q)
      .then(function (list) {
        if (!list.length) {
          mapResults[id] = [];
          box.innerHTML =
            '<div class="map-result" data-map-result="' + id + '" data-idx="-1"><strong>검색 결과가 없습니다</strong>' +
            '<span>‘이 주소로 저장’을 눌러 직접 입력한 주소로 등록할 수 있어요.</span></div>';
          return;
        }
        mapResults[id] = list;
        box.innerHTML = list
          .map(function (r, i) {
            return (
              '<button type="button" class="map-result" data-map-result="' + id + '" data-idx="' + i + '">' +
              '<strong>' + esc(r.name) + '</strong><span>' + esc(r.address) + '</span></button>'
            );
          })
          .join('');
      })
      .catch(function () {
        box.innerHTML =
          '<div class="map-result"><strong>지도 검색을 사용할 수 없습니다</strong>' +
          '<span>주소를 직접 입력하고 ‘이 주소로 저장’을 눌러 주세요. (등록된 도메인에서 카카오맵이 표시됩니다)</span></div>';
      });
  }

  function pickMapResult(id, idx, app) {
    var list = mapResults[id] || [];
    if (idx < 0 || !list[idx]) return;
    var r = list[idx];
    Pum.update(function (st) {
      var b = st.blocks.filter(function (x) {
        return x.id === id;
      })[0];
      if (!b) return;
      b.data.address = r.address;
      b.data.road = r.road;
      b.data.place = r.name;
      b.data.lat = r.lat;
      b.data.lng = r.lng;
    });
    renderBlockList(app);
    openIds.add(id);
    var el = app.querySelector('.blk[data-id="' + id + '"]');
    if (el) el.classList.add('is-open');
    refreshPreview(app);
    Pum.toast('주소를 선택했습니다');
  }

  function saveMapAddress(id, app) {
    var input = app.querySelector('[data-map-input="' + id + '"]');
    if (!input) return;
    var value = input.value.trim();
    if (!value) {
      Pum.toast('주소를 입력해 주세요', 'err');
      return;
    }
    var picked = null;
    Pum.update(function (st) {
      var b = st.blocks.filter(function (x) {
        return x.id === id;
      })[0];
      if (!b) return;
      b.data.address = value;
      if (!b.data.lat && picked) {
        b.data.lat = picked.lat;
        b.data.lng = picked.lng;
        b.data.place = picked.name;
      }
    });
    renderBlockList(app);
    openIds.add(id);
    var el = app.querySelector('.blk[data-id="' + id + '"]');
    if (el) el.classList.add('is-open');
    refreshPreview(app);
    Pum.toast('주소를 저장했습니다');
  }

  /* ---------------------------------------------------------------------
     설정 화면 (PersonalEdit4_set.do)
     --------------------------------------------------------------------- */
  function settingsView(app) {
    var s = state();
    var st = s.settings;
    app.innerHTML =
      appbar('설정') +
      tabs('settings') +
      '<div class="shell">' +
      '<section class="card is-open">' +
      '<div class="card__head"><h2 class="card__title">공유 설정</h2></div>' +
      '<div class="card__body">' +
      '<label class="radio-row"><input type="radio" name="visibility" value="public"' + (st.visibility === 'public' ? ' checked' : '') + ' />' +
      '<span class="radio-row__body"><span class="radio-row__title">전체공개</span>' +
      '<span class="radio-row__desc">누구나 페이지를 볼 수 있고 검색에도 노출됩니다</span></span></label>' +
      '<label class="radio-row"><input type="radio" name="visibility" value="unlisted"' + (st.visibility === 'unlisted' ? ' checked' : '') + ' />' +
      '<span class="radio-row__body"><span class="radio-row__title">미공개 <span class="pill-new">링크 공유</span></span>' +
      '<span class="radio-row__desc">링크를 아는 사람만 볼 수 있고 검색에는 노출되지 않습니다(noindex)</span></span></label>' +
      '<label class="radio-row"><input type="radio" name="visibility" value="private"' + (st.visibility === 'private' ? ' checked' : '') + ' />' +
      '<span class="radio-row__body"><span class="radio-row__title">비공개</span>' +
      '<span class="radio-row__desc">비밀번호를 입력한 사람만 페이지를 볼 수 있어요</span></span></label>' +
      '<div class="field" id="pwFieldWrap" style="' + (st.visibility === 'private' ? '' : 'display:none') + '">' +
      '<label class="field__label" for="sharePw">비공개 비밀번호</label>' +
      '<input class="input" id="sharePw" type="text" inputmode="numeric" maxlength="12" placeholder="숫자 4~12자리" value="' + esc(st.password || '') + '" />' +
      '<button type="button" class="linkbtn" id="pwForget" style="align-self:flex-start;margin-top:6px">비밀번호를 잊어버렸나요?</button>' +
      '<p class="field__hint">본인 확인 후 비밀번호를 <b>초기화하고 새로 설정</b>할 수 있습니다.</p>' +
      '</div>' +
      '<button class="btn btn--primary btn--block" type="button" id="settingsSave">저장</button>' +
      '</div></section>' +

      '<section class="card is-open">' +
      '<div class="card__head"><h2 class="card__title">구독 설정</h2></div>' +
      '<div class="card__body">' +
      '<label class="check-row"><input type="checkbox" id="subEmail"' + (st.subEmail ? ' checked' : '') + ' /><span>이메일</span></label>' +
      '<label class="check-row"><input type="checkbox" id="subPhone"' + (st.subPhone ? ' checked' : '') + ' /><span>휴대폰번호</span></label>' +
      '<p class="field__hint">이메일이나 휴대폰번호를 통해 고객 정보를 수집할 수 있어요.</p>' +
      '</div></section>' +

      '<section class="card is-open">' +
      '<div class="card__head"><h2 class="card__title">전자명함 추가</h2></div>' +
      '<div class="card__body">' +
      '<label class="radio-row"><input type="radio" name="bizcard" value="show"' + (st.bizcard !== 'hide' ? ' checked' : '') + ' />' +
      '<span class="radio-row__body"><span class="radio-row__title">노출</span>' +
      '<span class="radio-row__desc">공유 페이지 상단에 전자명함 버튼을 표시합니다</span></span></label>' +
      '<label class="radio-row"><input type="radio" name="bizcard" value="hide"' + (st.bizcard === 'hide' ? ' checked' : '') + ' />' +
      '<span class="radio-row__body"><span class="radio-row__title">비노출</span>' +
      '<span class="radio-row__desc">전자명함 버튼을 숨깁니다</span></span></label>' +
      '<p class="field__hint">품스의 전자명함을 추가할 수 있어요.</p>' +
      '</div></section>' +

      '<section class="card">' +
      '<div class="card__head"><h2 class="card__title">계정 관리</h2></div>' +
      '<div class="card__body">' +
      '<p class="field__hint" style="margin-top:0">로그인 세션 (' + esc(Pum.session.remainLabel()) + ') · 비밀번호 변경 · 회원 탈퇴는 계정 관리에서 해요.</p>' +
      '<button class="btn btn--sm btn--ghost" type="button" data-nav="account">' + icon('gear') + '계정 관리로 이동</button>' +
      '</div></section>' +

      '<section class="card">' +
      '<div class="card__head"><h2 class="card__title">내 데이터</h2></div>' +
      '<div class="card__body">' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn btn--sm btn--ghost" type="button" id="exportJson">' + icon('download') + 'JSON 내보내기</button>' +
      '<button class="btn btn--sm btn--ghost" type="button" id="resetAll">' + icon('reset') + '기본값으로</button>' +
      '<button class="btn btn--sm btn--soft" type="button" data-nav="logout">로그아웃</button>' +
      '</div>' +
      '<p class="field__hint">현재 저장 용량: <span id="storageSize">-</span></p>' +
      '</div></section>' +

      '<p class="editor-note">설정은 저장 즉시 공유 페이지에 반영됩니다.</p>' +
      '</div>';

    var pwWrap = app.querySelector('#pwFieldWrap');
    app.querySelectorAll('input[name="visibility"]').forEach(function (r) {
      r.addEventListener('change', function () {
        pwWrap.style.display = r.value === 'private' && r.checked ? '' : 'none';
      });
    });
    var pwForget = app.querySelector('#pwForget');
    if (pwForget) {
      pwForget.addEventListener('click', function () {
        if (Pum.account && Pum.account.sharePasswordReset) Pum.account.sharePasswordReset();
      });
    }

    app.querySelector('#settingsSave').addEventListener('click', function () {
      var vis = app.querySelector('input[name="visibility"]:checked').value;
      var pw = app.querySelector('#sharePw').value.trim();
      if (vis === 'private' && (!pw || pw.length < 4)) {
        Pum.toast('비공개 비밀번호를 4자리 이상 입력해 주세요', 'err');
        app.querySelector('#sharePw').focus();
        return;
      }
      var biz = app.querySelector('input[name="bizcard"]:checked').value;
      Pum.update(function (s2) {
        s2.settings.visibility = vis;
        s2.settings.password = vis === 'private' ? pw : s2.settings.password;
        s2.settings.subEmail = app.querySelector('#subEmail').checked;
        s2.settings.subPhone = app.querySelector('#subPhone').checked;
        s2.settings.bizcard = biz;
      });
      Pum.toast('설정을 저장했습니다');
    });

    var size = Pum.storageUsage();
    var sizeEl = app.querySelector('#storageSize');
    if (sizeEl) sizeEl.textContent = (size / 1024).toFixed(0) + ' KB';

    app.querySelector('#exportJson').addEventListener('click', function () {
      var blob = new Blob([JSON.stringify(state(), null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'pum-' + (state().profile.slug || 'my') + '.json';
      a.click();
      setTimeout(function () {
        URL.revokeObjectURL(a.href);
      }, 1000);
      Pum.toast('JSON 파일로 내보냈습니다');
    });

    app.querySelector('#resetAll').addEventListener('click', function () {
      Pum.confirm('모든 편집 내용을 처음 상태로 되돌릴까요?', { okLabel: '되돌리기', danger: true }).then(function (ok) {
        if (!ok) return;
        Pum.resetState();
        Pum.toast('기본값으로 되돌렸습니다');
        Pum.go('/editor');
      });
    });
  }

  /* ---------------------------------------------------------------------
     미리보기 (PersonalEdit4_preview.do) — 기기 프레임 없이 화면만
     --------------------------------------------------------------------- */
  function previewView(app) {
    var p = state().profile;
    app.innerHTML =
      appbar('미리보기', { action: { id: 'share', label: '공유 페이지' } }) +
      tabs('preview') +
      (p.published ? '' : publishBar(p)) +
      '<div class="preview-screen">' +
      '<div class="preview-bar">' +
      '<span class="preview-bar__label">공유 전 미리보기</span>' +
      '<div class="segmented" style="width:190px" id="deviceToggle">' +
      '<button type="button" class="segmented__btn is-active" data-mode="mobile">모바일 390</button>' +
      '<button type="button" class="segmented__btn" data-mode="pc">PC 1280</button>' +
      '</div>' +
      (p.published
        ? '<button type="button" class="btn btn--sm btn--primary" data-nav="share">' + icon('share') + '공유하기</button>'
        : '<button type="button" class="btn btn--sm btn--primary" data-action="publish">발행하기</button>') +
      '</div>' +
      '<div class="preview-stage" id="previewStage">' +
      '<div class="preview-frame" id="previewFrame"><div class="preview-frame__screen" id="previewScreen"></div></div>' +
      '</div></div>' +
      qrCard() +
      '<p class="editor-note" style="text-align:center">미리보기에서 보이는 그대로 공유 페이지에 반영됩니다.</p>';

    var screen = app.querySelector('#previewScreen');
    screen.innerHTML = Pum.renderShare(state(), { placeholder: true, preview: true });
    Pum.mountMaps(screen);
    bindShareActions(screen);
    mountQr(app);
    bindPublish(app, function () {
      previewView(app);
    });

    app.querySelectorAll('#deviceToggle .segmented__btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        app.querySelectorAll('#deviceToggle .segmented__btn').forEach(function (x) {
          x.classList.toggle('is-active', x === btn);
        });
        var pc = btn.getAttribute('data-mode') === 'pc';
        app.querySelector('#previewFrame').classList.toggle('preview-frame--pc', pc);
        app.querySelector('#previewStage').classList.toggle('preview-stage--pc', pc);
        screen.innerHTML = Pum.renderShare(state(), { placeholder: true, preview: true });
        Pum.mountMaps(screen);
        bindShareActions(screen);
      });
    });
  }

  /** 발행 버튼 공통 처리 */
  function bindPublish(app, after) {
    app.querySelectorAll('[data-action="publish"]').forEach(function (btn) {
      if (btn.dataset.publishBound) return;
      btn.dataset.publishBound = '1';
      btn.addEventListener('click', function () {
        var st = state();
        if (!st.profile.slug) {
          Pum.toast('품 주소를 먼저 정해 주세요', 'err');
          Pum.go('/editor');
          return;
        }
        var vis = st.settings.visibility;
        Pum.modal({
          center: true,
          title: '품을 발행할까요?',
          desc:
            '발행하면 공유 링크와 QR 코드가 열립니다.\n공개 설정: ' +
            (vis === 'private' ? '비공개 (비밀번호)' : vis === 'unlisted' ? '미공개 (링크 아는 사람만)' : '전체공개'),
          actions: [
            { label: '취소', kind: 'ghost' },
            {
              label: '발행하기',
              kind: 'primary',
              onClick: function () {
                Pum.update(function (s2) {
                  s2.profile.published = true;
                  s2.profile.publishedAt = new Date().toISOString();
                });
                if (Pum.logAudit) Pum.logAudit('품 발행 @' + state().profile.slug);
                Pum.toast('발행되었습니다. 공유 링크와 QR 코드를 사용할 수 있어요');
                setTimeout(function () {
                  if (typeof after === 'function') after();
                }, 120);
              }
            }
          ]
        });
      });
    });
  }

  /* ---------------------------------------------------------------- QR 코드 */
  function shareUrl() {
    return 'https://pumss.co.kr/@' + (state().profile.slug || 'AyoGG');
  }

  function qrCard() {
    return (
      '<section class="card qr-card">' +
      '<div class="card__head"><h2 class="card__title">공유 QR 코드</h2>' +
      '<span class="card__sub" style="margin-left:auto">' + esc(shareUrl()) + '</span></div>' +
      '<div class="card__body qr-card__body">' +
      '<div class="qr-card__canvas"><canvas id="qrCanvas" width="220" height="220" aria-label="공유 QR 코드"></canvas></div>' +
      '<div class="qr-card__actions">' +
      '<button type="button" class="btn btn--sm btn--primary" id="qrSave">' + icon('download') + 'QR 이미지 저장</button>' +
      '<p class="field__hint" style="margin:0">인쇄·명함·매장에 붙여 바로 스캔되게 할 수 있어요. (PNG 저장)</p>' +
      '</div></div></section>'
    );
  }

  function mountQr(app) {
    var canvas = app.querySelector('#qrCanvas');
    if (!canvas) return;
    Pum.qr.draw(canvas, shareUrl(), 220);
    var save = app.querySelector('#qrSave');
    if (save) {
      save.addEventListener('click', function () {
        Pum.qr.download(canvas, 'pum-qr-' + (state().profile.slug || 'pum') + '.png');
        Pum.toast('QR 이미지를 저장했습니다');
      });
    }
  }

  /* ---------------------------------------------------------------------
     공유 페이지 (@주소) — 발행 여부·공개 범위·정지 상태 확인
     --------------------------------------------------------------------- */
  function shareView(app) {
    var s = state();
    if (Pum.memberSuspended && Pum.memberSuspended()) {
      renderBlocked(app);
      return;
    }
    if (!s.profile.published) {
      renderUnpublished(app);
      return;
    }
    if (s.settings.visibility === 'private') {
      renderLock(app);
      return;
    }
    renderSharePage(app);
  }

  /** 존재하지 않는 품 주소 */
  function notFoundView(app, slug) {
    app.innerHTML =
      '<main class="lock"><div class="lock__card lock__card--404">' +
      '<div class="lock__code">404</div>' +
      '<h1 class="lock__title">품을 찾을 수 없습니다</h1>' +
      '<p class="lock__desc">' + (slug ? '<b>@' + esc(slug) + '</b> 주소의 품이 없거나 주소가 바뀌었습니다.<br/>' : '') +
      '주소를 다시 확인해 주세요.</p>' +
      '<div class="welcome__actions" style="margin-top:18px">' +
      '<button type="button" class="btn btn--primary btn--block" data-action="make-pum">나도 무료로 품 만들기 ' + icon('arrowRight') + '</button>' +
      '<button type="button" class="btn btn--ghost btn--block" data-nav="editor">내 품으로 돌아가기</button>' +
      '</div>' +
      '</div></main>';
    document.title = '품을 찾을 수 없습니다 · 품';
    app.querySelector('[data-action="make-pum"]').addEventListener('click', function () {
      Pum.go('/signup');
    });
  }

  function renderBlocked(app, slug) {
    var ad = (Pum.adminData && Pum.adminData()) || { members: [] };
    var target = slug || state().profile.slug || '';
    var owner =
      ad.members.filter(function (m) {
        return target && m.slug && m.slug.toLowerCase() === String(target).toLowerCase();
      })[0] || null;
    var reason = owner && owner.suspendReason ? owner.suspendReason : '';
    app.innerHTML =
      '<main class="lock"><div class="lock__card lock__card--suspended">' +
      '<div class="lock__icon lock__icon--stop">' + icon('lock') + '</div>' +
      '<h1 class="lock__title">이용이 제한된 페이지입니다</h1>' +
      '<p class="lock__desc">운영 정책에 따라 이 품의 공개가 제한되었습니다.' +
      (reason ? '<br/>사유: <b>' + esc(reason) + '</b>' : '') +
      '<br/><br/>문의: <a href="mailto:support@pumss.co.kr" style="color:var(--brand);font-weight:700">support@pumss.co.kr</a></p>' +
      '<div class="lock__meta">대상 품 주소 @' + esc(target) + '</div>' +
      '<div style="margin-top:14px"><button type="button" class="linkbtn" data-nav="editor">품 꾸미기로 돌아가기</button></div>' +
      '</div></main>';
    document.title = '이용이 제한된 페이지 · 품';
  }

  function renderUnpublished(app) {
    app.innerHTML =
      '<div class="share-page">' +
      '<div class="unpublished-bar">' +
      '<b>발행되지 않았습니다</b>' +
      '<span>발행하면 공유 링크·QR 코드가 열리고 손님에게 보입니다.</span>' +
      '<button type="button" class="btn btn--xs btn--primary" data-action="publish">발행하기</button>' +
      '</div>' +
      '<div id="shareRoot"></div></div>';
    var root = app.querySelector('#shareRoot');
    root.innerHTML = Pum.renderShare(state(), {});
    Pum.mountMaps(root);
    bindShareActions(root);
    bindPublish(app, function () {
      shareView(app);
    });
    document.title = '발행 전 · 품';
  }

  function renderSharePage(app) {
    var s = state();
    var vis = s.settings.visibility;
    app.innerHTML =
      '<div class="share-page" style="min-height:100dvh;display:flex;flex-direction:column">' +
      '<div style="flex:1" id="shareRoot"></div>' +
      '</div>';
    var root = app.querySelector('#shareRoot');
    root.innerHTML = Pum.renderShare(state(), {});
    Pum.mountMaps(root);
    bindShareActions(root);
    applyRobots(vis);
    applyMeta(s);
    if (Pum.track) Pum.track.view();
  }

  /** OG·SEO 메타 — 품 제목/소개/대표 이미지로 자동 생성 */
  function applyMeta(s) {
    var p = s.profile;
    var title = (p.title || '나의 디지털 세계').replace(/\s+/g, ' ').trim() + ' · 품';
    var desc = (p.intro || '내 프로필과 콘텐츠를 한 페이지에 담은 품입니다.').replace(/\s+/g, ' ').trim().slice(0, 140);
    function meta(selector, attr, name, content) {
      var el = document.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    }
    document.title = title;
    meta('meta[name="description"]', 'name', 'description', desc);
    meta('meta[property="og:title"]', 'property', 'og:title', title);
    meta('meta[property="og:description"]', 'property', 'og:description', desc);
    meta('meta[property="og:type"]', 'property', 'og:type', 'profile');
    meta('meta[property="og:url"]', 'property', 'og:url', 'https://pumss.co.kr/@' + (p.slug || ''));
    meta('meta[property="og:site_name"]', 'property', 'og:site_name', '품');
    if (p.imgBg || p.imgProfile) {
      meta('meta[property="og:image"]', 'property', 'og:image', p.imgBg || p.imgProfile);
    }
    var link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', 'https://pumss.co.kr/@' + (p.slug || ''));
  }

  /** 미공개(unlisted)·비공개는 검색 비노출(noindex) */
  function applyRobots(vis) {
    var meta = document.querySelector('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', vis === 'public' ? 'index,follow' : 'noindex,nofollow');
  }

  /* /p/@주소 — 공유 링크로 들어오는 입구 */
  function pumView(app, slug) {
    var s = state();
    var own = String(s.profile.slug || '').toLowerCase();
    var target = String(slug || '').toLowerCase();
    if (!target) {
      notFoundView(app, slug);
      return;
    }
    var member = Pum.memberBySlug ? Pum.memberBySlug(slug) : null;
    if (!member && (!own || target !== own)) {
      notFoundView(app, slug);
      return;
    }
    if (member && (member.status === 'suspended' || member.status === 'reported' || member.status === 'deleted')) {
      renderBlocked(app, slug);
      return;
    }
    if (own && target === own) {
      shareView(app);
      return;
    }
    /* 다른 회원의 품 — 프로토타입에서는 저장된 콘텐츠가 없어 개요만 표시 */
    ourMemberPreview(app, member);
  }

  function ourMemberPreview(app, member) {
    app.innerHTML =
      '<div class="share-page" style="min-height:100dvh;display:flex;flex-direction:column">' +
      '<div style="flex:1" id="shareRoot"></div></div>';
    var root = app.querySelector('#shareRoot');
    root.innerHTML =
      '<div class="share" data-scheme="light" style="--share-base:#ffffff;--share-fg:#16191d;--share-muted:#6b7280;--share-line:#e7e9ee;--share-chip:#f4f6f9">' +
      '<div class="share__inner">' +
      '<section class="hero hero--profile" style="--hero-base:#ffffff;--hero-fg:#16191d;--hero-muted:#6b7280;--hero-line:#e7e9ee">' +
      '<div class="hero__avatar hero__avatar--empty"><span>품</span></div>' +
      '<div class="hero__body"><div class="hero__title">' + esc(member.name) + '</div>' +
      '<div class="hero__intro">@' + esc(member.slug) + '</div></div></section>' +
      '<div class="s-card" style="padding:18px">' +
      '<p class="editor-note" style="margin:0">이 품은 다른 회원이 만든 페이지입니다. 프로토타입에서는 다른 계정의 품 내용을 불러오지 않아 이름과 주소만 보입니다.</p>' +
      '</div>' +
      '<div class="share__brand">made by <strong>품</strong></div>' +
      '</div></div>';
    if (Pum.track) Pum.track.view();
    document.title = member.name + ' · 품';
  }

  function renderLock(app) {
    app.innerHTML =
      '<main class="lock"><div class="lock__card">' +
      '<div class="lock__icon">' + icon('lock') + '</div>' +
      '<h1 class="lock__title">비공개 품입니다</h1>' +
      '<p class="lock__desc">비밀번호를 입력하면 페이지를 볼 수 있어요.</p>' +
      '<form class="lock__form" id="lockForm">' +
      '<input class="input" id="lockPw" type="password" inputmode="numeric" placeholder="비밀번호" />' +
      '<button class="btn btn--primary btn--block" type="submit">열기</button>' +
      '</form>' +
      '<div style="margin-top:14px"><button type="button" class="linkbtn" data-nav="editor">품 꾸미기로 돌아가기</button></div>' +
      '</div></main>';

    app.querySelector('#lockForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var pw = app.querySelector('#lockPw').value.trim();
      var saved = state().settings.password;
      if (!saved || pw === saved) {
        renderSharePage(app);
      } else {
        Pum.toast('비밀번호가 일치하지 않습니다', 'err');
        app.querySelector('#lockPw').classList.add('is-error');
      }
    });
  }

  function bindShareActions(root) {
    if (!root || root.dataset.bound) return;
    root.dataset.bound = '1';
    root.addEventListener('click', function (e) {
      var link = e.target.closest('a[href]');
      if (link && Pum.track) Pum.track.click(link.getAttribute('data-track') || 'link');

      var t = e.target.closest('[data-action]');
      if (!t) return;
      var action = t.getAttribute('data-action');
      if (Pum.track) Pum.track.click(t.getAttribute('data-track') || action);

      if (action === 'share') {
        var url = shareUrl();
        if (navigator.share) {
          navigator.share({ title: state().profile.title || '품', url: url }).catch(function () {});
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard
            .writeText(url)
            .then(function () {
              Pum.toast('링크를 복사했습니다: ' + url);
            })
            .catch(function () {
              Pum.toast('공유 주소: ' + url);
            });
        } else {
          Pum.toast('공유 주소: ' + url);
        }
      } else if (action === 'qr') {
        openQrModal();
      } else if (action === 'dismiss-notice') {
        Pum.dismissNoticeToday();
        var notice = root.querySelector('.share__notice');
        if (notice) notice.remove();
        Pum.toast('오늘 하루 이 공지를 보지 않습니다');
      } else if (action === 'publish') {
        var appRoot = document.getElementById('app');
        bindPublish(appRoot, function () {
          shareView(appRoot);
        });
        var pbtn = appRoot.querySelector('[data-action="publish"]');
        if (pbtn) pbtn.click();
      } else if (action === 'open-signup') {
        Pum.modal({
          title: '품 무료 만들기 초대장',
          desc: '지금 초대하면 내 품을 무료로 만들 수 있어요.',
          body:
            '<div class="guide-list">' +
            '<div class="guide-item"><span class="guide-item__num">1</span><div><div class="guide-item__title">품스 회원가입</div><div class="guide-item__desc">이메일 또는 SNS 계정으로 30초 만에 가입합니다.</div></div></div>' +
            '<div class="guide-item"><span class="guide-item__num">2</span><div><div class="guide-item__title">내 품 주소 정하기</div><div class="guide-item__desc">영문으로 나만의 주소를 만들고 프로필을 꾸밉니다.</div></div></div>' +
            '<div class="guide-item"><span class="guide-item__num">3</span><div><div class="guide-item__title">발행하고 공유하기</div><div class="guide-item__desc">링크와 QR 하나로 명함·소식·이벤트를 전합니다.</div></div></div>' +
            '</div>',
          actions: [
            { label: '나중에', kind: 'ghost' },
            {
              label: '무료로 시작하기',
              kind: 'brand',
              onClick: function () {
                setTimeout(function () {
                  Pum.go('/signup');
                }, 100);
              }
            }
          ]
        });
      } else if (action === 'inquiry') {
        openInquiry();
      } else if (action === 'bizcard') {
        Pum.modal({
          title: '전자명함',
          desc: state().profile.title || '내 전자명함',
          body:
            '<div class="map-note">' + icon('info') +
            '<span>명함 QR과 연락처 저장은 품스 앱에서 제공됩니다. 공유 페이지의 QR 버튼으로 같은 주소의 QR을 확인할 수 있어요.</span></div>',
          actions: [{ label: '확인', kind: 'primary' }]
        });
      }
    });
  }

  function openQrModal() {
    var m = Pum.modal({
      title: '공유 QR 코드',
      desc: shareUrl(),
      body:
        '<div class="qr-modal"><canvas id="qrModalCanvas" width="240" height="240"></canvas></div>' +
        '<p class="field__hint" style="text-align:center">QR을 스캔하면 이 품 페이지로 이동합니다.</p>',
      actions: [
        { label: '닫기', kind: 'ghost' },
        {
          label: 'QR 이미지 저장',
          kind: 'primary',
          onClick: function (api) {
            var c = api.body.querySelector('#qrModalCanvas');
            Pum.qr.download(c, 'pum-qr-' + (state().profile.slug || 'pum') + '.png');
            Pum.toast('QR 이미지를 저장했습니다');
            return false;
          }
        }
      ]
    });
    if (m) Pum.qr.draw(m.body.querySelector('#qrModalCanvas'), shareUrl(), 240);
  }

  /* ------------------------------------------------ 1:1 문의 (캡차·시간당 제한) */
  var INQUIRY_LIMIT_PER_HOUR = 3;

  function recentInquiries() {
    var now = Date.now();
    return (state().inquiries || []).filter(function (q) {
      return now - new Date(q.at).getTime() < 60 * 60 * 1000;
    });
  }

  function openInquiry() {
    var used = recentInquiries().length;
    if (used >= INQUIRY_LIMIT_PER_HOUR) {
      Pum.modal({
        center: true,
        title: '문의 제한',
        desc: '같은 시간에 문의를 ' + INQUIRY_LIMIT_PER_HOUR + '회까지 보낼 수 있어요.\n잠시 후 다시 시도해 주세요.',
        actions: [{ label: '확인', kind: 'primary' }]
      });
      return;
    }
    var a = Math.floor(Math.random() * 8) + 2;
    var b = Math.floor(Math.random() * 8) + 1;
    var answer = String(a + b);

    var m = Pum.modal({
      title: '1:1 문의',
      desc: '품 주인에게 문의를 남깁니다. (' + used + '/' + INQUIRY_LIMIT_PER_HOUR + '회 사용)',
      body:
        '<div class="field" style="gap:10px">' +
        '<input class="input" id="inqName" placeholder="이름" />' +
        '<input class="input" id="inqContact" type="tel" inputmode="tel" placeholder="연락처 (이메일 또는 전화번호)" />' +
        '<textarea class="textarea" id="inqBody" rows="3" maxlength="500" placeholder="문의 내용을 입력하세요"></textarea>' +
        '<div class="captcha"><span>스팸 방지 · ' + a + ' + ' + b + ' = ?</span>' +
        '<input class="input" id="inqCaptcha" inputmode="numeric" maxlength="2" placeholder="정답" /></div>' +
        '<p class="field__hint" style="margin:0">문의는 1시간에 ' + INQUIRY_LIMIT_PER_HOUR + '회까지 보낼 수 있습니다.</p>' +
        '</div>',
      actions: [
        { label: '취소', kind: 'ghost' },
        {
          label: '보내기',
          kind: 'primary',
          onClick: function (api) {
            var name = api.body.querySelector('#inqName').value.trim();
            var contact = api.body.querySelector('#inqContact').value.trim();
            var text = api.body.querySelector('#inqBody').value.trim();
            var cap = api.body.querySelector('#inqCaptcha').value.trim();
            if (!name || !contact || !text) {
              Pum.toast('이름·연락처·문의 내용을 모두 입력해 주세요', 'err');
              return false;
            }
            if (cap !== answer) {
              Pum.toast('자동 가입 방지 정답이 틀렸습니다', 'err');
              return false;
            }
            if (recentInquiries().length >= INQUIRY_LIMIT_PER_HOUR) {
              Pum.toast('문의 횟수를 초과했습니다', 'err');
              return false;
            }
            Pum.update(function (st) {
              st.inquiries = st.inquiries || [];
              st.inquiries.unshift({
                id: 'q-' + Date.now().toString(36),
                name: name,
                contact: contact,
                body: text,
                at: new Date().toISOString(),
                slug: st.profile.slug
              });
              if (st.inquiries.length > 50) st.inquiries.length = 50;
            });
            Pum.toast('문의가 접수되었습니다');
          }
        }
      ]
    });
    if (m) {
      m.body.querySelector('#inqContact').addEventListener('input', function () {
        if (/^[0-9-]+$/.test(this.value)) {
          var f = Pum.formatPhone(this.value);
          if (this.value !== f) this.value = f;
        }
      });
    }
  }

  Pum.views = Object.assign(Pum.views || {}, {
    editor: editorView,
    settings: settingsView,
    preview: previewView,
    share: shareView,
    pum: pumView,
    notFound: notFoundView
  });

  function render() {
    var app = document.getElementById('app');
    var path = Pum.route().split('?')[0];
    if (path === '/editor') editorView(app);
    else if (path === '/settings') settingsView(app);
    else if (path === '/preview') previewView(app);
    else if (path === '/share') shareView(app);
  }
  Pum.render = render;
})(window);
