/* ==========================================================================
   품 꾸미기 PWA — crop.js
   이미지 크롭(자르기) 모달
   · 좌/우 각도(회전) 조절, 상/하/좌/우 이동, 모바일 터치·핀치
   · 확대/축소 슬라이더 기본값 0 (좌 = 축소, 우 = 확대)
   · 모바일 세이프존 가이드, 원본 그대로 사용 옵션
   · 선택 영역만 Canvas 로 추출·압축해 DataURL 로 돌려줍니다.
   ========================================================================== */
(function (global) {
  'use strict';

  var Pum = global.Pum;
  var esc = Pum.util.esc;
  var icon = Pum.icon;

  var CONF = {
    profile: {
      ratio: 1,
      outW: 720,
      outH: 720,
      targetBytes: 130 * 1024,
      title: '프로필 사진 자르기',
      label: '프로필 1:1 · 원형 가이드',
      guide: 'circle',
      hint: '프로필은 1:1 정사각으로 저장되어 원형으로 표시됩니다.'
    },
    bg: {
      ratio: 16 / 9,
      outW: 1280,
      outH: 720,
      targetBytes: 280 * 1024,
      title: '배경 사진 자르기',
      label: '배경 16:9 · 모바일 세이프존',
      guide: 'safe',
      hint: '가로 1280×720 을 권장합니다. 아래 점선 안쪽이 모바일에서 잘리지 않는 영역입니다.'
    },
    banner: {
      ratio: 1000 / 380,
      outW: 1200,
      outH: 456,
      targetBytes: 240 * 1024,
      title: '배너 이미지 자르기',
      label: '배너 1000:380',
      guide: 'safe',
      hint: '공유 페이지 그리드에 맞춰 리사이징됩니다.'
    },
    'banner-large': {
      ratio: 16 / 9,
      outW: 1280,
      outH: 720,
      targetBytes: 260 * 1024,
      title: '대배너(1×1) 이미지 자르기',
      label: '대배너 16:9 · 권장 1280×720',
      guide: 'safe',
      hint: '대배너는 한 줄 전체를 차지합니다. 권장 용량 260KB 이하.'
    },
    'banner-medium': {
      ratio: 1,
      outW: 800,
      outH: 800,
      targetBytes: 170 * 1024,
      title: '중배너(2×1단) 이미지 자르기',
      label: '중배너 1:1 · 권장 800×800',
      guide: 'safe',
      hint: '중배너는 2개가 한 줄에 놓입니다. 권장 용량 170KB 이하.'
    },
    'banner-medium2': {
      ratio: 1 / 2,
      outW: 640,
      outH: 1280,
      targetBytes: 190 * 1024,
      title: '중배너(2×2단) 이미지 자르기',
      label: '중배너 1:2 · 권장 640×1280',
      guide: 'safe',
      hint: '중배너 2×2단은 세로로 긴 형태입니다. 권장 용량 190KB 이하.'
    },
    'banner-small': {
      ratio: 1,
      outW: 600,
      outH: 600,
      targetBytes: 90 * 1024,
      title: '소배너(3×1단) 이미지 자르기',
      label: '소배너 1:1 · 권장 600×600',
      guide: 'safe',
      hint: '소배너는 3개가 한 줄에 놓입니다. 권장 용량 90KB 이하.'
    }
  };

  var MAX_SRC = 1600;

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }
  function bytesOf(str) {
    try {
      return new Blob([str]).size;
    } catch (e) {
      return 0;
    }
  }
  /** 슬라이더 값(-100~100) → 배율 (0 = 1.0x, 좌 = 축소, 우 = 확대) */
  function zoomFactor(v) {
    return v >= 0 ? 1 + v / 50 : 1 + v / 200;
  }

  /** 원본을 작업용 캔버스로 축소 (메모리·속도) */
  function toWorkCanvas(image) {
    var w = image.naturalWidth || image.width;
    var h = image.naturalHeight || image.height;
    var scale = Math.min(1, MAX_SRC / Math.max(w, h));
    var cw = Math.max(1, Math.round(w * scale));
    var ch = Math.max(1, Math.round(h * scale));
    var canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, cw, ch);
    return canvas;
  }

  /**
   * Pum.crop.open({ file, kind, onDone })
   * kind: profile | bg | banner | banner-large | banner-medium | banner-medium2 | banner-small
   */
  function openCrop(opts) {
    var o = opts || {};
    var conf = CONF[o.kind] || CONF.bg;
    var view = {
      angle: 0,
      zoom: 0,
      x: 0,
      y: 0,
      base: 1,
      fw: 0,
      fh: 0,
      iw: 0,
      ih: 0,
      ready: false,
      applied: false,
      guide: true
    };

    var bodyHTML =
      '<div class="crop crop--' + esc(o.kind || 'bg') + '">' +
      '<div class="crop__stage" id="cropStage" style="aspect-ratio:' + conf.ratio + '">' +
      '<canvas class="crop__canvas" id="cropCanvas" aria-label="자르기 미리보기"></canvas>' +
      '<div class="crop__guides" id="cropGuides" aria-hidden="true">' +
      (conf.guide === 'circle' ? '<div class="crop__guide-circle"></div>' : '') +
      '<div class="crop__guide-safe"></div>' +
      '<div class="crop__guide-label">' + esc(conf.label) + '</div>' +
      '</div>' +
      '<div class="crop__loading" id="cropLoading">이미지를 불러오는 중…</div>' +
      '</div>' +

      '<div class="crop__ctl">' +
      '<div class="crop__ctl-row">' +
      '<span class="crop__ctl-label">좌/우 각도</span>' +
      '<button type="button" class="crop__step" data-rot="-90" aria-label="왼쪽으로 90도">↺↺</button>' +
      '<button type="button" class="crop__step" data-rot="-15" aria-label="왼쪽으로 15도">↺</button>' +
      '<input type="range" id="cropAngle" min="-180" max="180" step="1" value="0" aria-label="회전 각도" />' +
      '<button type="button" class="crop__step" data-rot="15" aria-label="오른쪽으로 15도">↻</button>' +
      '<button type="button" class="crop__step" data-rot="90" aria-label="오른쪽으로 90도">↻↻</button>' +
      '<b class="crop__val" id="cropAngleVal">0°</b>' +
      '</div>' +
      '<div class="crop__ctl-row">' +
      '<span class="crop__ctl-label">확대 / 축소</span>' +
      '<span class="crop__edge">축소</span>' +
      '<input type="range" id="cropZoom" min="-100" max="100" step="1" value="0" aria-label="확대 축소" />' +
      '<span class="crop__edge">확대</span>' +
      '<b class="crop__val" id="cropZoomVal">1.0x</b>' +
      '</div>' +
      '<div class="crop__ctl-row crop__ctl-row--misc">' +
      '<label class="check-row"><input type="checkbox" id="cropGuideOn" checked /><span>가이드선 보기</span></label>' +
      '<button type="button" class="btn btn--xs btn--ghost" id="cropCenter">' + icon('reset') + '가운데 정렬</button>' +
      '<span class="crop__size" id="cropSize"></span>' +
      '</div>' +
      '</div>' +

      '<p class="crop__hint">' +
      '<b>사진을 끌어</b> 상/하/좌/우로 옮기고, 두 손가락으로 벌려 확대할 수 있어요. 슬라이더 가운데(0)가 기본 크기입니다.' +
      (conf.hint ? '<br/>' + esc(conf.hint) : '') +
      '</p>' +
      '</div>';

    var api = Pum.modal({
      title: conf.title,
      desc: '가이드 프레임 안쪽 영역만 저장됩니다.',
      body: bodyHTML,
      actions: [
        { label: '취소', kind: 'ghost' },
        {
          label: '원본 그대로 사용',
          kind: 'ghost',
          onClick: function () {
            useOriginal();
            return true;
          }
        },
        {
          label: '자르기 적용',
          kind: 'primary',
          onClick: function () {
            if (!view.ready) {
              Pum.toast('이미지를 아직 불러오지 못했습니다', 'err');
              return false;
            }
            var out = drawCrop();
            if (!out) return false;
            view.applied = true;
            if (typeof o.onDone === 'function') o.onDone(out);
            return true;
          }
        }
      ],
      onClose: function () {
        if (!view.applied && typeof o.onCancel === 'function') o.onCancel();
      }
    });
    if (!api) return;

    var stage = api.body.querySelector('#cropStage');
    var canvas = api.body.querySelector('#cropCanvas');
    var ctx = canvas.getContext('2d');
    var angleEl = api.body.querySelector('#cropAngle');
    var angleVal = api.body.querySelector('#cropAngleVal');
    var zoomEl = api.body.querySelector('#cropZoom');
    var zoomVal = api.body.querySelector('#cropZoomVal');
    var sizeEl = api.body.querySelector('#cropSize');
    var loading = api.body.querySelector('#cropLoading');
    var guides = api.body.querySelector('#cropGuides');
    var src = null;

    function measure() {
      var rect = stage.getBoundingClientRect();
      if (!rect.width || !rect.height) {
        requestAnimationFrame(measure);
        return;
      }
      var changed = Math.round(rect.width) !== view.fw || Math.round(rect.height) !== view.fh;
      view.fw = Math.round(rect.width);
      view.fh = Math.round(rect.height);
      if (src && (changed || !view.ready)) {
        recomputeBase();
        view.ready = true;
        if (loading) loading.style.display = 'none';
        draw();
      }
    }

    /** 회전 각도가 바뀌면 프레임을 덮는 최소 배율을 다시 계산 (2% 여유로 상하 이동 확보) */
    function recomputeBase() {
      var rad = (view.angle * Math.PI) / 180;
      var c = Math.abs(Math.cos(rad));
      var s = Math.abs(Math.sin(rad));
      var bw = view.iw * c + view.ih * s;
      var bh = view.iw * s + view.ih * c;
      view.base = Math.max(view.fw / bw, view.fh / bh) * 1.02;
    }

    function currentScale() {
      return view.base * zoomFactor(view.zoom);
    }

    function clampPan() {
      var rad = (view.angle * Math.PI) / 180;
      var c = Math.abs(Math.cos(rad));
      var s = Math.abs(Math.sin(rad));
      var scale = currentScale();
      var bw = (view.iw * c + view.ih * s) * scale;
      var bh = (view.iw * s + view.ih * c) * scale;
      var maxX = Math.max(0, (bw - view.fw) / 2);
      var maxY = Math.max(0, (bh - view.fh) / 2);
      view.x = clamp(view.x, -maxX, maxX);
      view.y = clamp(view.y, -maxY, maxY);
    }

    function draw() {
      if (!view.ready || !src) return;
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(view.fw * dpr);
      canvas.height = Math.round(view.fh * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, view.fw, view.fh);

      clampPan();
      var scale = currentScale();
      ctx.save();
      ctx.translate(view.fw / 2 + view.x, view.fh / 2 + view.y);
      ctx.rotate((view.angle * Math.PI) / 180);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(src, (-view.iw * scale) / 2, (-view.ih * scale) / 2, view.iw * scale, view.ih * scale);
      ctx.restore();

      if (angleVal) angleVal.textContent = Math.round(view.angle) + '°';
      if (zoomVal) zoomVal.textContent = zoomFactor(view.zoom).toFixed(2) + 'x';
      if (sizeEl) {
        sizeEl.textContent = '저장 ' + conf.outW + '×' + conf.outH + 'px';
      }
    }

    /* ---- 포인터: 드래그 이동 + 두 손가락 핀치 ---- */
    var pointers = {};
    var pinchStart = null;

    function pointerList() {
      return Object.keys(pointers).map(function (k) {
        return pointers[k];
      });
    }
    function pinchMetrics() {
      var p = pointerList();
      var dx = p[0].x - p[1].x;
      var dy = p[0].y - p[1].y;
      return {
        dist: Math.sqrt(dx * dx + dy * dy) || 1,
        mx: (p[0].x + p[1].x) / 2,
        my: (p[0].y + p[1].y) / 2
      };
    }

    stage.addEventListener('pointerdown', function (e) {
      if (!view.ready) return;
      e.preventDefault();
      stage.classList.add('is-dragging');
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
      if (stage.setPointerCapture) {
        try {
          stage.setPointerCapture(e.pointerId);
        } catch (err) {
          /* ignore */
        }
      }
      if (pointerList().length === 2) {
        var m = pinchMetrics();
        pinchStart = { dist: m.dist, zoom: view.zoom };
      }
      stage.dataset.dragX = String(view.x);
      stage.dataset.dragY = String(view.y);
      stage.dataset.startX = String(e.clientX);
      stage.dataset.startY = String(e.clientY);
      stage.dataset.lastX = String(e.clientX);
      stage.dataset.lastY = String(e.clientY);
    });

    stage.addEventListener('pointermove', function (e) {
      if (!pointers[e.pointerId] || !view.ready) return;
      e.preventDefault();
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY };

      if (pointerList().length >= 2 && pinchStart) {
        var m = pinchMetrics();
        var ratio = m.dist / pinchStart.dist;
        var target = pinchStart.zoom + (ratio - 1) * 60;
        view.zoom = clamp(Math.round(target), -100, 100);
        if (zoomEl) zoomEl.value = String(view.zoom);
        draw();
        return;
      }

      var lastX = Number(stage.dataset.lastX || e.clientX);
      var lastY = Number(stage.dataset.lastY || e.clientY);
      view.x += e.clientX - lastX;
      view.y += e.clientY - lastY;
      stage.dataset.lastX = String(e.clientX);
      stage.dataset.lastY = String(e.clientY);
      draw();
    });

    function endPointer(e) {
      if (!pointers[e.pointerId]) return;
      delete pointers[e.pointerId];
      if (stage.releasePointerCapture) {
        try {
          stage.releasePointerCapture(e.pointerId);
        } catch (err) {
          /* ignore */
        }
      }
      if (pointerList().length < 2) pinchStart = null;
      if (!pointerList().length) stage.classList.remove('is-dragging');
      var rest = pointerList()[0];
      if (rest) {
        stage.dataset.lastX = String(rest.x);
        stage.dataset.lastY = String(rest.y);
      }
    }
    stage.addEventListener('pointerup', endPointer);
    stage.addEventListener('pointercancel', endPointer);
    stage.addEventListener('pointerleave', endPointer);

    /* 데스크톱 휠 확대 */
    stage.addEventListener(
      'wheel',
      function (e) {
        if (!view.ready) return;
        e.preventDefault();
        view.zoom = clamp(Math.round(view.zoom + (e.deltaY > 0 ? -5 : 5)), -100, 100);
        if (zoomEl) zoomEl.value = String(view.zoom);
        draw();
      },
      { passive: false }
    );

    angleEl.addEventListener('input', function () {
      view.angle = Number(angleEl.value);
      recomputeBase();
      draw();
    });
    zoomEl.addEventListener('input', function () {
      view.zoom = Number(zoomEl.value);
      draw();
    });
    api.body.querySelectorAll('[data-rot]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var delta = Number(btn.getAttribute('data-rot'));
        view.angle = ((view.angle + delta + 540) % 360) - 180;
        angleEl.value = String(view.angle);
        recomputeBase();
        draw();
      });
    });
    api.body.querySelector('#cropCenter').addEventListener('click', function () {
      view.x = 0;
      view.y = 0;
      view.angle = 0;
      view.zoom = 0;
      angleEl.value = '0';
      zoomEl.value = '0';
      recomputeBase();
      draw();
      Pum.toast('가운데로 정렬했습니다');
    });
    api.body.querySelector('#cropGuideOn').addEventListener('change', function () {
      guides.style.display = this.checked ? '' : 'none';
    });

    /* ---- 이미지 읽기 ---- */
    Pum.image
      .read(o.file)
      .then(function (dataUrl) {
        return Pum.image.load(dataUrl).then(function (image) {
          src = toWorkCanvas(image);
          view.iw = src.width;
          view.ih = src.height;
          requestAnimationFrame(measure);
          setTimeout(measure, 260);
        });
      })
      .catch(function () {
        Pum.toast('이미지를 불러오지 못했습니다', 'err');
        api.close();
      });

    /* ---- 원본 그대로 사용 ---- */
    function useOriginal() {
      Pum.image
        .compress(o.file, { maxSize: Math.max(conf.outW, conf.outH), quality: 0.86, targetBytes: conf.targetBytes })
        .then(function (res) {
          view.applied = true;
          if (typeof o.onDone === 'function') {
            o.onDone({ dataUrl: res.dataUrl, width: res.width, height: res.height, bytes: res.bytes, original: true });
          }
          Pum.toast('원본 비율 그대로 등록했습니다 (' + res.width + '×' + res.height + ')');
        })
        .catch(function () {
          Pum.toast('이미지를 처리하지 못했습니다', 'err');
        });
    }

    /* ---- 자르기 결과 추출 ---- */
    function drawCrop() {
      if (!src) return null;
      var out = document.createElement('canvas');
      out.width = conf.outW;
      out.height = conf.outH;
      var oc = out.getContext('2d');
      oc.fillStyle = '#ffffff';
      oc.fillRect(0, 0, conf.outW, conf.outH);
      var k = conf.outW / view.fw;
      var scale = currentScale();

      oc.save();
      oc.scale(k, k);
      oc.beginPath();
      oc.rect(0, 0, view.fw, view.fh);
      oc.clip();
      oc.translate(view.fw / 2 + view.x, view.fh / 2 + view.y);
      oc.rotate((view.angle * Math.PI) / 180);
      oc.scale(scale, scale);
      oc.imageSmoothingEnabled = true;
      oc.imageSmoothingQuality = 'high';
      oc.drawImage(src, -view.iw / 2, -view.ih / 2, view.iw, view.ih);
      oc.restore();

      var quality = 0.88;
      var data = out.toDataURL('image/jpeg', quality);
      var tries = 0;
      while (bytesOf(data) > conf.targetBytes && tries < 5 && quality > 0.45) {
        quality = Math.max(0.45, quality - 0.1);
        data = out.toDataURL('image/jpeg', quality);
        tries += 1;
      }
      return { dataUrl: data, width: conf.outW, height: conf.outH, bytes: bytesOf(data) };
    }

    window.addEventListener('resize', measure);
  }

  Pum.crop = { open: openCrop, ratios: CONF };
})(window);
