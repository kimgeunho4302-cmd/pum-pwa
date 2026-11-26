/* ==========================================================================
   품 꾸미기 PWA — account.js
   계정 관리(#/account): 비밀번호 변경 · 세션 · 공유 비밀번호 초기화 · 회원 탈퇴
   ========================================================================== */
(function (global) {
  'use strict';

  var Pum = global.Pum;
  var esc = Pum.util.esc;
  var icon = Pum.icon;

  function S() {
    return Pum.getState();
  }

  function appbar(title) {
    return (
      '<header class="appbar">' +
      '<button type="button" class="appbar__icon" data-nav="back" aria-label="뒤로">' + icon('back') + '</button>' +
      '<div class="appbar__title">' + esc(title) + '</div>' +
      '<div class="appbar__right">' + Pum.fontToggleHTML() + '</div>' +
      '</header>'
    );
  }

  function strengthHtml() {
    return (
      '<div class="pw-meter" id="acMeter" data-level="0"><i></i><i></i><i></i>' +
      '<span class="pw-meter__label" id="acMeterLabel"></span></div>'
    );
  }

  function accountView(app) {
    var s = S();
    var user = s.auth.user || {};
    var se = s.auth.session || {};
    var accountId = user.loginId || user.email || Pum.formatPhone(user.phone || '');
    var member =
      (Pum.memberByEmail && Pum.memberByEmail(user.email)) ||
      (Pum.memberByPhone && Pum.memberByPhone(user.phone)) ||
      null;
    var withdrawn = s.auth.withdrawnAt || (member && member.withdrawAt) || '';

    app.innerHTML =
      appbar('계정 관리') +
      '<div class="shell">' +

      '<section class="card is-open">' +
      '<div class="card__head"><h2 class="card__title">계정 정보</h2>' +
      '<span class="card__sub" style="margin-left:auto">' + esc(user.provider === 'email' ? '이메일 가입' : (user.provider || '') + ' 연결') + '</span></div>' +
      '<div class="card__body">' +
      '<div class="field"><label class="field__label">아이디(이메일 또는 휴대전화번호)</label>' +
      '<input class="input" value="' + esc(accountId) + '" readonly /></div>' +
      '<div class="field"><label class="field__label" for="acName">이름</label>' +
      '<input class="input" id="acName" value="' + esc(user.name || '') + '" placeholder="이름" /></div>' +
      '<div class="field"><label class="field__label" for="acPhone">휴대전화번호</label>' +
      '<input class="input" id="acPhone" type="tel" inputmode="tel" value="' + esc(Pum.formatPhone(user.phone || '')) + '" placeholder="010-0000-0000" /></div>' +
      '<div class="adm-row-end"><button type="button" class="btn btn--sm btn--primary" id="acSave">저장</button></div>' +
      '</div></section>' +

      '<section class="card is-open">' +
      '<div class="card__head"><h2 class="card__title">로그인 세션</h2></div>' +
      '<div class="card__body">' +
      '<ul class="adm-kv">' +
      '<li><span>로그인 유지</span><b>' + (se.remember ? '30일 유지 중' : '브라우저 세션 (2시간)') + '</b></li>' +
      '<li><span>만료까지</span><b id="acSessionLeft">' + esc(Pum.session.remainLabel()) + '</b></li>' +
      '</ul>' +
      '<p class="field__hint">로그인 유지(30일)를 켜두면 활동할 때마다 만료가 30일씩 늘어납니다. 만료되면 <code>/login?next=</code> 로 돌아와 다시 로그인하게 됩니다.</p>' +
      '<div class="img-actions">' +
      '<button type="button" class="btn btn--xs btn--ghost" id="acExtend">30일 유지 켜기</button>' +
      '<button type="button" class="btn btn--xs btn--soft" id="acExpire">세션 만료 시뮬레이션</button>' +
      '</div>' +
      '</div></section>' +

      '<section class="card is-open">' +
      '<div class="card__head"><h2 class="card__title">비밀번호 변경</h2></div>' +
      '<div class="card__body">' +
      '<div class="field"><label class="field__label" for="acPwNow">현재 비밀번호</label>' +
      '<input class="input" id="acPwNow" type="password" placeholder="현재 비밀번호" /></div>' +
      '<div class="field"><label class="field__label" for="acPwNew">새 비밀번호</label>' +
      '<input class="input" id="acPwNew" type="password" placeholder="영문+숫자+특수문자 조합 8자 이상" />' +
      strengthHtml() +
      '<div class="field__hint">사용 가능한 특수문자: <code>!@#$%^&amp;*()_+-=[]{}?</code></div>' +
      '<div class="auth__error" id="acPwError"></div></div>' +
      '<div class="field"><label class="field__label" for="acPwNew2">새 비밀번호 확인</label>' +
      '<input class="input" id="acPwNew2" type="password" placeholder="한 번 더 입력" /></div>' +
      '<div class="adm-row-end"><button type="button" class="btn btn--sm btn--primary" id="acPwSave">비밀번호 변경</button></div>' +
      '</div></section>' +

      '<section class="card is-open">' +
      '<div class="card__head"><h2 class="card__title">공유(비공개) 비밀번호</h2></div>' +
      '<div class="card__body">' +
      '<p class="field__hint" style="margin-top:0">' +
      (s.settings.visibility === 'private'
        ? '현재 <b>비공개</b>로 설정되어 있고 비밀번호가 등록되어 있습니다.'
        : '현재 공개 설정입니다. 설정에서 <b>비공개</b>를 고르면 비밀번호를 정할 수 있어요.') +
      '</p>' +
      '<button type="button" class="btn btn--sm btn--ghost" id="acSharePwReset">' + icon('reset') + '비공개 비밀번호 초기화 · 재설정</button>' +
      '</div></section>' +

      '<section class="card is-open">' +
      '<div class="card__head"><h2 class="card__title">회원 탈퇴</h2></div>' +
      '<div class="card__body">' +
      (withdrawn
        ? '<div class="map-note map-note--warn">' + icon('info') +
          '<span>탈퇴 신청됨 (' + esc(String(withdrawn).slice(0, 10)) + '). <b>30일 보관 후 완전 삭제</b>됩니다. ' +
          '그동안은 로그인이 제한되며, 30일 안에는 철회할 수 있습니다.</span></div>' +
          '<button type="button" class="btn btn--sm btn--ghost" id="acWithdrawCancel">탈퇴 철회</button>'
        : '<p class="field__hint" style="margin-top:0">탈퇴하면 내 품 페이지가 즉시 비공개로 전환되고, 계정은 <b>30일 보관 후 완전 삭제</b>됩니다. ' +
          '보관 기간에는 고객문의를 통해 복구를 요청할 수 있습니다.</p>' +
          '<button type="button" class="btn btn--sm btn--soft btn--danger" id="acWithdraw">회원 탈퇴</button>') +
      '</div></section>' +

      '<p class="editor-note">이 프로토타입의 계정 정보는 이 브라우저에만 저장됩니다.</p>' +
      '</div>';

    /* ---- 계정 정보 저장 ---- */
    app.querySelector('#acSave').addEventListener('click', function () {
      var name = app.querySelector('#acName').value.trim();
      var phone = Pum.formatPhone(app.querySelector('#acPhone').value);
      Pum.update(function (st) {
        st.auth.user.name = name;
        st.auth.user.phone = phone;
        var key = Pum.accountKey ? Pum.accountKey(st.auth.user) : String(st.auth.user.email || '').toLowerCase();
        var u = (st.auth.users || []).filter(function (x) {
          return (Pum.accountKey ? Pum.accountKey(x) : String(x.email || '').toLowerCase()) === key;
        })[0];
        if (u) {
          u.name = name;
          u.phone = phone;
        }
        if (!st.profile.title) st.profile.title = name;
      });
      if (Pum.adminSyncUser) Pum.adminSyncUser();
      Pum.toast('계정 정보를 저장했습니다');
    });

    /* ---- 세션 ---- */
    app.querySelector('#acExtend').addEventListener('click', function () {
      Pum.update(function (st) {
        st.auth.session.remember = true;
        st.auth.session.expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
      });
      app.querySelector('#acSessionLeft').textContent = Pum.session.remainLabel();
      Pum.toast('30일 로그인 유지를 켰습니다');
    });
    app.querySelector('#acExpire').addEventListener('click', function () {
      Pum.session.expireNow();
      Pum.toast('세션을 만료시켰습니다. 로그인 화면으로 이동합니다');
      setTimeout(function () {
        Pum.session.enforce();
        var back = '/account';
        Pum.go('/login?next=' + encodeURIComponent(back));
      }, 320);
    });

    /* ---- 비밀번호 변경 ---- */
    var newEl = app.querySelector('#acPwNew');
    var meter = app.querySelector('#acMeter');
    var meterLabel = app.querySelector('#acMeterLabel');
    newEl.addEventListener('input', function () {
      var r = Pum.auth.strength(newEl.value);
      meter.setAttribute('data-level', String(r.level));
      meterLabel.textContent = r.label ? r.label + ' (' + r.hint + ')' : '';
      app.querySelector('#acPwError').textContent = '';
    });

    app.querySelector('#acPwSave').addEventListener('click', function () {
      var now = app.querySelector('#acPwNow').value;
      var pw = newEl.value;
      var pw2 = app.querySelector('#acPwNew2').value;
      var box = app.querySelector('#acPwError');
      var user2 = S().auth.user || {};
      var u = Pum.findAccount ? Pum.findAccount(user2.loginId || user2.email || user2.phone) : Pum.findUser(user2.email);

      if (u && !/^oauth:/.test(u.password || '') && u.password !== now) {
        box.textContent = '현재 비밀번호가 일치하지 않습니다.';
        return;
      }
      if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) {
        box.textContent = '영문과 숫자를 포함해 8자 이상 입력해 주세요.';
        return;
      }
      if (pw !== pw2) {
        box.textContent = '새 비밀번호가 일치하지 않습니다.';
        return;
      }
      Pum.update(function (st) {
        var key = Pum.accountKey ? Pum.accountKey(user2) : String(user2.email || '').toLowerCase();
        var target = (st.auth.users || []).filter(function (x) {
          return (Pum.accountKey ? Pum.accountKey(x) : String(x.email || '').toLowerCase()) === key;
        })[0];
        if (target) target.password = pw;
      });
      app.querySelector('#acPwNow').value = '';
      newEl.value = '';
      app.querySelector('#acPwNew2').value = '';
      meter.setAttribute('data-level', '0');
      meterLabel.textContent = '';
      Pum.toast('비밀번호를 변경했습니다');
    });

    /* ---- 공유 비밀번호 초기화 ---- */
    app.querySelector('#acSharePwReset').addEventListener('click', function () {
      sharePasswordResetModal();
    });

    /* ---- 회원 탈퇴 (2단계) ---- */
    var wd = app.querySelector('#acWithdraw');
    if (wd) {
      wd.addEventListener('click', function () {
        Pum.modal({
          center: true,
          title: '회원 탈퇴 (1/2)',
          desc: '탈퇴하면 내 품 페이지가 즉시 비공개로 전환됩니다.\n계속하시겠어요?',
          actions: [
            { label: '취소', kind: 'ghost' },
            {
              label: '계속',
              kind: 'brand',
              onClick: function () {
                setTimeout(step2, 120);
              }
            }
          ]
        });
      });
    }

    function step2() {
      var body =
        '<div class="field"><label class="field__label">탈퇴 사유 (선택)</label>' +
        '<select class="input select" id="wdReason">' +
        '<option>서비스를 더 이상 쓰지 않아서</option>' +
        '<option>다른 서비스로 옮겨서</option>' +
        '<option>원하는 기능이 없어서</option>' +
        '<option>개인정보가 걱정되어서</option>' +
        '<option>기타</option>' +
        '</select></div>' +
        '<div class="map-note map-note--warn">' + icon('info') +
        '<span>탈퇴 후 <b>30일 동안 보관</b>된 뒤 완전히 삭제됩니다. 보관 기간에는 고객문의로 복구를 요청할 수 있습니다. ' +
        '작성한 품 콘텐츠와 사진도 함께 삭제됩니다.</span></div>' +
        '<label class="check-row"><input type="checkbox" id="wdAgree" /><span>위 내용을 확인했고 탈퇴에 동의합니다.</span></label>';
      Pum.modal({
        title: '회원 탈퇴 (2/2)',
        body: body,
        actions: [
          { label: '취소', kind: 'ghost' },
          {
            label: '탈퇴 신청',
            kind: 'brand',
            onClick: function (api) {
              if (!api.body.querySelector('#wdAgree').checked) {
                Pum.toast('동의 체크가 필요합니다', 'err');
                return false;
              }
              var reason = api.body.querySelector('#wdReason').value;
              var now = new Date().toISOString();
              Pum.update(function (st) {
                st.auth.withdrawnAt = now;
                st.auth.loggedIn = false;
                st.auth.session = { remember: false, issuedAt: 0, expiresAt: 0, lastSeen: 0 };
                var email = String(st.auth.user.email || '').toLowerCase();
                var phoneDigits = Pum.digits(st.auth.user.phone || '');
                var m = st.admin.members.filter(function (x) {
                  if (email && String(x.email || '').toLowerCase() === email) return true;
                  return !!(phoneDigits && Pum.digits(x.phone) === phoneDigits);
                })[0];
                if (m) {
                  m.status = 'withdrawn';
                  m.withdrawAt = now;
                  m.withdrawReason = reason;
                }
                st.admin.mailLog = st.admin.mailLog || [];
                st.admin.mailLog.unshift({
                  id: 'ml-' + Date.now().toString(36),
                  at: new Date().toISOString().slice(0, 16).replace('T', ' '),
                  to: st.auth.user.email || st.auth.user.loginId || '',
                  subject: '품 탈퇴 접수 안내 (데모 발송)',
                  body: '탈퇴 사유: ' + reason + ' / 30일 보관 후 완전 삭제',
                  kind: 'mail'
                });
              });
              setTimeout(function () {
                Pum.go('/login');
                Pum.toast('탈퇴가 접수되었습니다. 30일 후 완전히 삭제됩니다');
              }, 120);
            }
          }
        ]
      });
    }

    var wc = app.querySelector('#acWithdrawCancel');
    if (wc) {
      wc.addEventListener('click', function () {
        Pum.update(function (st) {
          st.auth.withdrawnAt = '';
          var email = String(st.auth.user.email || '').toLowerCase();
          var phoneDigits = Pum.digits(st.auth.user.phone || '');
          var m = st.admin.members.filter(function (x) {
            if (email && String(x.email || '').toLowerCase() === email) return true;
            return !!(phoneDigits && Pum.digits(x.phone) === phoneDigits);
          })[0];
          if (m && m.status === 'withdrawn') {
            m.status = 'active';
            m.withdrawAt = '';
          }
        });
        Pum.toast('탈퇴 신청을 철회했습니다');
        Pum.go('/account');
      });
    }
  }

  /** 비공개 품 비밀번호 초기화·재설정 (본인 확인 후) */
  function sharePasswordResetModal() {
    var body =
      '<div class="map-note">' + icon('info') +
      '<span>비공개 품 비밀번호를 잊었다면 <b>가입할 때 등록한 휴대전화번호</b>로 본인 확인 후 새 비밀번호를 정할 수 있습니다.</span></div>' +
      '<div class="field"><label class="field__label">아이디(이메일 또는 휴대전화번호)</label>' +
      '<input class="input" id="sprEmail" value="' + esc((S().auth.user || {}).loginId || (S().auth.user || {}).email || '') + '" /></div>' +
      '<div class="field"><label class="field__label">휴대전화번호</label>' +
      '<input class="input" id="sprPhone" type="tel" inputmode="tel" placeholder="010-0000-0000" /></div>' +
      '<button type="button" class="btn btn--sm btn--ghost" id="sprVerify">본인 확인 · 인증번호 받기</button>' +
      '<div class="field" id="sprCodeWrap" hidden><label class="field__label">인증번호 6자리</label>' +
      '<input class="input" id="sprCode" inputmode="numeric" maxlength="6" placeholder="인증번호" /></div>' +
      '<div class="field" id="sprNewWrap" hidden><label class="field__label">새 비공개 비밀번호</label>' +
      '<input class="input" id="sprNew" type="text" inputmode="numeric" maxlength="12" placeholder="숫자 4~12자리" /></div>';

    var m = Pum.modal({
      title: '비공개 비밀번호 재설정',
      body: body,
      actions: [
        { label: '닫기', kind: 'ghost' },
        {
          label: '재설정 저장',
          kind: 'primary',
          onClick: function (api) {
            var codeWrap = api.body.querySelector('#sprCodeWrap');
            var newWrap = api.body.querySelector('#sprNewWrap');
            if (newWrap.hidden) {
              Pum.toast('본인 확인을 먼저 완료해 주세요', 'err');
              return false;
            }
            var pw = api.body.querySelector('#sprNew').value.trim();
            if (pw.length < 4) {
              Pum.toast('숫자 4자리 이상 입력해 주세요', 'err');
              return false;
            }
            Pum.update(function (st) {
              st.settings.password = pw;
              st.settings.visibility = 'private';
            });
            Pum.toast('비공개 비밀번호를 새로 설정했습니다');
          }
        }
      ]
    });

    var code = '';
    m.body.querySelector('#sprPhone').addEventListener('input', function () {
      var f = Pum.formatPhone(this.value);
      if (this.value !== f) this.value = f;
    });
    m.body.querySelector('#sprVerify').addEventListener('click', function () {
      code = String(Math.floor(100000 + Math.random() * 900000));
      m.body.querySelector('#sprCodeWrap').hidden = false;
      m.body.querySelector('#sprCode').focus();
      Pum.toast('인증번호 [' + code + '] 발송 (데모)');
    });
    m.body.querySelector('#sprCode').addEventListener('input', function () {
      if (Pum.digits(this.value) === code) {
        m.body.querySelector('#sprNewWrap').hidden = false;
        m.body.querySelector('#sprNew').focus();
      }
    });
  }

  Pum.views = Pum.views || {};
  Pum.views.account = accountView;
  Pum.account = { sharePasswordReset: sharePasswordResetModal };
})(window);
