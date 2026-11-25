/* ==========================================================================
   품 꾸미기 PWA — crop.js
   이미지 크롭(자르기) 모달: 드래그 이동 + 1.0x~3.0x 확대 + 가이드 프레임
   선택 영역만 Canvas 로 추출·압축해 DataURL 로 돌려줍니다.
   ========================================================================== */
(function (global) {
  'use strict';

  var Pum = global.Pum;
  var esc = Pum.util.esc;

  var RATIOS = {
    profile: { ratio: 1, w: 600, h: 600, label: '프로필 1:1 원형 가이드', targetBytes: 130 * 1024, title: '프로필 사진 자르기' },
    bg: { ratio: 16 / 9, w: 1280, h: 720, label: '배경 16:9 가이드', targetBytes: 280 * 1024, title: '배경 사진 자르기' },
    banner: { ratio: 1000 / 380, w: 1200, h: 456, label: '배너 1000:380 가이드', targetBytes: 240 * 1024, title: '배너 이미지 자르기' }
  };

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

  /**
   * Pum.crop.open({ file, kind, onDone })
   * kind: 'profile' | 'bg' | 'banner'
   */
  function openCrop(opts) {
    var o = opts || {};
    var conf = RATIOS[o.kind] || RATIOS.bg;
    var view = { zoom: 1, x: 0, y: 0, fw: 0, fh: 0, iw: 0, ih: 0, cover: 1, ready: false, applied: false, dragging: false };

    var bodyHTML =
      '<div class="crop crop--' + esc(o.kind || 'bg') + '" style="--crop-ratio:' + conf.ratio + '">' +
      '<div class="crop__stage" id="cropStage">' +
      '<img class="crop__img" id="cropImg" alt="자르기 미리보기" draggable="false" />' +
      '<div class="crop__mask" aria-hidden="true"></div>' +
      '<div class="crop__frame" aria-hidden="true"><span></span><span></span><span></span><span></span></div>' +
      '<div class="crop__loading" id="cropLoading">이미지를 불러오는 중…</div>' +
      '</div>' +
      '<div class="crop__zoom">' +
      '<span class="crop__zoom-label">확대</span>' +
      '<input type="range" id="cropZoom" min="1" max="3" step="0.05" value="1" aria-label="확대 비율" />' +
      '<b class="crop__zoom-val" id="cropZoomVal">1.0x</b>' +
      '</div>' +
      '<div class="crop__meta"><span class="crop__guide">' + esc(conf.label) + '</span><span class="crop__size" id="cropSize"></span></div>' +
      '<p class="crop__hint">사진을 끌어 위치를 맞추고, 슬라이더로 1.0x~3.0x 확대하세요. 가이드 프레임 안쪽만 저장됩니다.</p>' +
      '</div>';

    var api = Pum.modal({
      title: conf.title,
      desc: '자르기 적용을 누르면 가이드 프레임 안쪽 영역만 저장됩니다.',
      body: bodyHTML,
      actions: [
        { label: '취소', kind: 'ghost' },
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
    var img = api.body.querySelector('#cropImg');
    var zoomEl = api.body.querySelector('#cropZoom');
    var zoomVal = api.body.querySelector('#cropZoomVal');
    var sizeEl = api.body.querySelector('#cropSize');
    var loading = api.body.querySelector('#cropLoading');

    function measure() {
      var rect = stage.getBoundingClientRect();
      view.fw = Math.round(rect.width);
      view.fh = Math.round(rect.height);
      if (!view.fw || !view.fh) {
        // 시트 애니메이션 중이면 다음 프레임에 다시
        requestAnimationFrame(measure);
        return;
      }
      if (view.iw) initImage();
    }

    function initImage() {
      view.cover = Math.max(view.fw / view.iw, view.fh / view.ih);
      view.zoom = 1;
      view.x = 0;
      view.y = 0;
      view.ready = true;
      if (loading) loading.style.display = 'none';
      applyTransform();
    }

    function applyTransform() {
      if (!view.ready || !view.fw) return;
      var s = view.cover * view.zoom;
      var w = view.iw * s;
      var h = view.ih * s;
      var maxX = Math.max(0, (w - view.fw) / 2);
      var maxY = Math.max(0, (h - view.fh) / 2);
      view.x = clamp(view.x, -maxX, maxX);
      view.y = clamp(view.y, -maxY, maxY);

      img.style.width = w + 'px';
      img.style.height = h + 'px';
      img.style.transform = 'translate(-50%, -50%) translate(' + view.x.toFixed(2) + 'px,' + view.y.toFixed(2) + 'px)';

      if (zoomVal) zoomVal.textContent = view.zoom.toFixed(1) + 'x';
      if (sizeEl) {
        var sw = view.fw / s;
        var sh = view.fh / s;
        sizeEl.textContent = '선택 영역 ' + Math.round(sw) + '×' + Math.round(sh) + 'px';
      }
    }

    /* 드래그 이동 (마우스 · 터치 공통) */
    var start = null;
    stage.addEventListener('pointerdown', function (e) {
      if (!view.ready) return;
      e.preventDefault();
      view.dragging = true;
      start = { px: e.clientX, py: e.clientY, x: view.x, y: view.y };
      if (stage.setPointerCapture) {
        try {
          stage.setPointerCapture(e.pointerId);
        } catch (err) {
          /* ignore */
        }
      }
    });
    stage.addEventListener('pointermove', function (e) {
      if (!view.dragging || !start) return;
      view.x = start.x + (e.clientX - start.px);
      view.y = start.y + (e.clientY - start.py);
      applyTransform();
    });
    function endDrag(e) {
      if (!view.dragging) return;
      view.dragging = false;
      start = null;
      if (stage.releasePointerCapture && e && e.pointerId != null) {
        try {
          stage.releasePointerCapture(e.pointerId);
        } catch (err) {
          /* ignore */
        }
      }
    }
    stage.addEventListener('pointerup', endDrag);
    stage.addEventListener('pointercancel', endDrag);
    stage.addEventListener('pointerleave', endDrag);

    zoomEl.addEventListener('input', function () {
      view.zoom = Number(zoomEl.value);
      applyTransform();
    });

    /* 이미지 읽기 */
    Pum.image
      .read(o.file)
      .then(function (dataUrl) {
        return Pum.image.load(dataUrl).then(function (image) {
          view.iw = image.naturalWidth || image.width;
          view.ih = image.naturalHeight || image.height;
          img.src = dataUrl;
          requestAnimationFrame(measure);
        });
      })
      .catch(function () {
        Pum.toast('이미지를 불러오지 못했습니다', 'err');
        api.close();
      });

    function drawCrop() {
      var s = view.cover * view.zoom;
      if (!s || !view.fw) return null;

      var imgLeft = view.fw / 2 - (view.iw * s) / 2 + view.x;
      var imgTop = view.fh / 2 - (view.ih * s) / 2 + view.y;
      var sx = (0 - imgLeft) / s;
      var sy = (0 - imgTop) / s;
      var sw = view.fw / s;
      var sh = view.fh / s;

      // 경계 보정
      sx = clamp(sx, 0, Math.max(0, view.iw - 1));
      sy = clamp(sy, 0, Math.max(0, view.ih - 1));
      sw = Math.min(sw, view.iw - sx);
      sh = Math.min(sh, view.ih - sy, view.ih);

      var canvas = document.createElement('canvas');
      canvas.width = conf.w;
      canvas.height = conf.h;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, conf.w, conf.h);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      var source = img;
      try {
        ctx.drawImage(source, sx, sy, sw, sh, 0, 0, conf.w, conf.h);
      } catch (e) {
        Pum.toast('선택 영역을 추출하지 못했습니다', 'err');
        return null;
      }

      var quality = 0.88;
      var out = canvas.toDataURL('image/jpeg', quality);
      var tries = 0;
      while (bytesOf(out) > conf.targetBytes && tries < 4 && quality > 0.5) {
        quality = Math.max(0.5, quality - 0.1);
        out = canvas.toDataURL('image/jpeg', quality);
        tries += 1;
      }
      return { dataUrl: out, width: conf.w, height: conf.h, bytes: bytesOf(out) };
    }
  }

  Pum.crop = { open: openCrop, ratios: RATIOS };
})(window);
