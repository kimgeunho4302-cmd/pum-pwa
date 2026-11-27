/* ==========================================================================
   품 꾸미기 PWA — site.js
   품스 공통 푸터 · 이용약관/개인정보처리방침/마케팅 수신동의 ·
   홈 화면에 추가(설치) 안내 · 공유 페이지 신고 접수
   ========================================================================== */
(function (global) {
  'use strict';

  var Pum = global.Pum;
  var esc = Pum.util.esc;
  var icon = Pum.icon;

  /* ----------------------------------------------------------------------
     사업자 정보 — 품스(pumss.co.kr) 푸터와 동일한 값
     ---------------------------------------------------------------------- */
  var COMPANY = {
    name: '주식회사 품스',
    service: '품스(PUMSS)',
    ceo: '김용성',
    privacyOfficer: '김근호',
    privacyOfficerDept: 'Planning & Marketing Div.',
    privacyOfficerTitle: '차장',
    bizNo: '219-81-33384',
    mailOrderNo: '2024-서울강남-01243',
    host: '㈜비아웹',
    address: '서울시 서초구 동산로 67, 3층(양재동)',
    tel: '02-557-6961',
    email: 'bigused01@pumss.co.kr',
    support: 'support@pumss.co.kr'
  };

  var POLICY_DATE = '2026. 11. 27.';

  /* 품스(pumss.co.kr) · 품 공식 앱 아이콘 */
  var PUMSS_URL = 'https://www.pumss.co.kr/';
  var APP_ICON = 'assets/icons/icon-192.png';

  function isMember() {
    try {
      return !!(Pum.getState && Pum.getState().auth && Pum.getState().auth.loggedIn);
    } catch (e) {
      return false;
    }
  }

  /** 초대 링크에 쓸 내 품 주소(@아이디) — 아직 정하지 않았으면 로그인 아이디 앞부분 */
  function memberSlug() {
    var st = Pum.getState();
    var slug = String((st.profile && st.profile.slug) || '').trim();
    if (slug) return slug;
    var user = (st.auth && st.auth.user) || {};
    var id = String(user.loginId || user.email || '').split('@')[0];
    return id ? id.replace(/[^A-Za-z0-9._-]/g, '') : '';
  }

  /** 초대 링크 — #/signup?invite=@아이디 (가입 후 바로 내 품 꾸미기로 이동) */
  function inviteUrl() {
    var slug = memberSlug();
    var base = location.origin + String(location.pathname || '/').replace(/index\.html$/, '');
    if (base.charAt(base.length - 1) !== '/') base += '/';
    return base + '#/signup' + (slug ? '?invite=' + encodeURIComponent(slug) : '');
  }

  /* ----------------------------------------------------------------------
     약관 · 정책 문서
     ---------------------------------------------------------------------- */
  var POLICIES = {
    terms: {
      id: 'terms',
      title: '이용약관',
      summary: COMPANY.name + '가 제공하는 품(PUMSS) 서비스 이용에 관한 약관입니다.',
      effective: POLICY_DATE,
      sections: [
        {
          h: '제1조 (목적)',
          p: [
            '본 약관은 ' + COMPANY.name + '(이하 "회사")가 제공하는 품(PUMSS) 서비스(이하 "서비스")의 이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임 사항, 기타 필요한 사항을 규정함을 목적으로 합니다.'
          ]
        },
        {
          h: '제2조 (용어의 정의)',
          p: ['이 약관에서 사용하는 용어의 정의는 다음과 같습니다.'],
          list: [
            '"서비스"란 구현되는 단말기(PC, 휴대형 단말기 등 각종 유무선 장치)와 상관없이 회원이 이용할 수 있는 품(PUMSS) 서비스 일체를 말합니다.',
            '"회원"이란 서비스에 접속하여 이 약관에 따라 회사와 이용계약을 체결하고 서비스를 이용하는 고객을 말합니다.',
            '"아이디"란 회원의 식별과 서비스 이용을 위하여 회원이 등록한 이메일 주소 또는 휴대전화번호를 말합니다.',
            '"비밀번호"란 회원이 선정한 문자·숫자·특수문자의 조합으로, 회원 본인임을 확인하기 위하여 사용됩니다.',
            '"품"이란 회원이 프로필, SNS, 콘텐츠 블록 등을 담아 만든 개인 페이지와 그 주소(@아이디)를 말합니다.',
            '"게시물"이란 회원이 서비스에 게시한 부호·문자·음성·화상·동영상 등의 정보 형태의 글, 사진, 동영상, 파일, 링크 일체를 말합니다.'
          ]
        },
        {
          h: '제3조 (약관의 효력과 변경)',
          p: [
            '① 본 약관은 서비스를 이용하고자 하는 모든 회원에게 그 효력이 발생합니다. 회사는 본 약관의 내용과 상호, 대표자 성명, 사업자등록번호, 연락처 등을 서비스 초기 화면에 게시합니다.',
            '② 회사는 「약관의 규제에 관한 법률」, 「전자상거래 등에서의 소비자보호에 관한 법률」, 「개인정보 보호법」 등 관련 법령을 위반하지 않는 범위에서 본 약관을 개정할 수 있습니다.',
            '③ 회사가 약관을 개정하는 경우 적용일자와 개정 사유를 명시하여 적용일자 7일 전(회원의 권리·의무에 중대한 변경은 30일 전)부터 공지합니다.',
            '④ 회원이 개정 약관의 적용일까지 거부 의사를 표시하지 않고 서비스를 이용하는 경우 개정 약관에 동의한 것으로 봅니다.'
          ]
        },
        {
          h: '제4조 (이용계약의 성립)',
          p: [
            '① 이용계약은 서비스를 이용하고자 하는 자가 본 약관과 개인정보 수집·이용 동의 내용을 확인하고 회원가입 신청을 하여 회사가 이를 승낙함으로써 성립합니다.',
            '② 회원은 가입 시 이메일 주소 또는 휴대전화번호를 아이디로 등록할 수 있으며, 휴대전화번호를 아이디로 등록하거나 휴대전화 인증이 필요한 경우 회사가 발송한 인증번호로 본인 확인을 하여야 합니다.',
            '③ 회사는 다음 각 호에 해당하는 신청에 대하여 승낙을 거절하거나 사후에 이용계약을 해지할 수 있습니다. 14세 미만 아동이 법정대리인의 동의 없이 신청한 경우, 실명이 아니거나 타인의 명의·연락처를 이용한 경우, 허위 정보를 기재한 경우, 이미 가입된 휴대전화번호로 중복 가입을 신청한 경우, 관계 법령 또는 본 약관을 위반한 이력이 있는 경우'
          ]
        },
        {
          h: '제5조 (아이디 및 비밀번호의 관리)',
          p: [
            '① 아이디와 비밀번호에 대한 관리 책임은 회원에게 있습니다. 회원은 자신의 아이디와 비밀번호를 제3자에게 이용하게 하여서는 안 됩니다.',
            '② 회원은 비밀번호를 영문·숫자·특수문자를 조합하여 8자 이상으로 설정할 것을 권장하며, 비밀번호가 유출되었거나 제3자가 사용하고 있음을 인지한 경우 즉시 변경하고 회사에 알려야 합니다.',
            '③ 회원이 관리 의무를 소홀히 하여 발생한 손해에 대하여 회사는 책임을 지지 않습니다.'
          ]
        },
        {
          h: '제6조 (개인정보의 보호)',
          p: [
            '회사는 「개인정보 보호법」 등 관련 법령에 따라 회원의 개인정보를 보호하며, 개인정보의 수집·이용·제공 등에 관한 자세한 사항은 개인정보처리방침에서 정합니다.'
          ]
        },
        {
          h: '제7조 (회원의 의무)',
          p: ['회원은 다음 행위를 하여서는 안 됩니다.'],
          list: [
            '신청 또는 변경 시 허위 내용을 등록하거나 타인의 정보를 도용하는 행위',
            '타인을 사칭하거나 타인의 명예·신용을 훼손하는 행위',
            '회사 또는 제3자의 저작권 등 지식재산권을 침해하는 행위',
            '외설·폭력·불법 정보, 스팸·광고성 게시물을 게시하거나 전송하는 행위',
            '서비스의 정상적인 운영을 방해하거나 비정상적인 방법으로 접근하는 행위',
            '회사의 동의 없이 서비스를 영리 목적으로 이용하는 행위',
            '기타 법령 또는 본 약관이 금지하는 행위'
          ]
        },
        {
          h: '제8조 (게시물의 관리 및 신고)',
          p: [
            '① 회원이 서비스에 게시한 게시물의 저작권은 해당 게시물의 작성자에게 귀속됩니다.',
            '② 회사는 게시물이 관련 법령 또는 본 약관을 위반한다고 판단되는 경우 사전 통지 후 해당 게시물을 삭제하거나 비공개 처리할 수 있습니다. 다만 긴급한 경우(불법 촬영물, 명의 도용 등)에는 사후에 통지할 수 있습니다.',
            '③ 회원 또는 제3자는 권리 침해, 사칭, 스팸·광고, 불법·유해 정보 등을 이유로 품 또는 게시물을 신고할 수 있습니다. 신고는 해당 품 페이지 최하단의 [신고하기]에서 접수하며, 신고자 이메일과 신고 사유·내용이 함께 접수됩니다.',
            '④ 회사는 접수된 신고를 확인하여 게시중단·비공개·이용 정지 등 필요한 조치를 할 수 있으며, 처리 결과를 신고자 이메일로 안내할 수 있습니다. 허위 신고를 반복하는 경우 서비스 이용이 제한될 수 있습니다.'
          ]
        },
        {
          h: '제9조 (서비스의 제공 및 변경·중단)',
          p: [
            '① 서비스는 연중무휴 1일 24시간 제공함을 원칙으로 합니다.',
            '② 회사는 설비의 점검·교체, 통신 장애, 운영상 상당한 이유가 있는 경우 서비스의 전부 또는 일부를 일시 중단할 수 있으며, 사전에 공지합니다. 부득이한 경우 사후에 통지할 수 있습니다.',
            '③ 회사는 서비스의 내용을 변경할 수 있으며, 중요한 변경은 적용 7일 전부터 서비스 내에 공지합니다.',
            '④ 무료로 제공되는 서비스의 전부 또는 일부는 회사의 정책에 따라 변경되거나 중단될 수 있습니다.'
          ]
        },
        {
          h: '제10조 (지식재산권)',
          p: [
            '서비스와 관련된 저작권 및 지식재산권은 회사에 귀속됩니다. 다만 회원의 게시물과 제휴 계약에 따라 제공된 저작물은 제외합니다. 회원은 서비스를 이용하여 얻은 정보를 회사의 사전 승낙 없이 복제·배포·판매하거나 제3자에게 이용하게 할 수 없습니다.'
          ]
        },
        {
          h: '제11조 (유료서비스 및 결제·환불)',
          p: [
            '① 회사는 일부 기능을 유료로 제공할 수 있으며, 이 경우 이용 요금·기간·결제 방법을 서비스 화면에 명확히 표시합니다.',
            '② 회원이 유료서비스를 해지하는 경우 잔여 기간에 대한 환불은 「전자상거래 등에서의 소비자보호에 관한 법률」 및 회사의 환불 정책에 따릅니다.',
            '③ 회사의 귀책 사유로 유료서비스를 제공하지 못한 경우 회사는 이용 대금을 환불합니다.'
          ]
        },
        {
          h: '제12조 (계약 해지 및 이용 제한)',
          p: [
            '① 회원은 언제든지 서비스 내 [계정 관리]에서 회원 탈퇴를 신청할 수 있으며, 회사는 관련 법령에 따라 지체 없이 처리합니다.',
            '② 탈퇴 시 회원의 품은 즉시 비공개로 전환되며, 계정과 게시물은 30일간 보관된 후 복구할 수 없는 방법으로 삭제됩니다. 다만 관계 법령에 따라 보존이 필요한 정보는 해당 기간 동안 보관합니다.',
            '③ 회사는 회원이 본 약관을 위반한 경우 경고, 일시 정지, 이용계약 해지의 단계로 서비스 이용을 제한할 수 있으며, 이 경우 그 사유를 회원에게 통지합니다.',
            '④ 회원은 이용 제한에 대하여 회사가 정한 절차에 따라 이의를 신청할 수 있습니다.'
          ]
        },
        {
          h: '제13조 (책임의 제한)',
          p: [
            '① 회사는 천재지변, 불가항력, 통신사업자의 장애 등 회사의 통제를 벗어난 사유로 서비스를 제공하지 못한 경우 책임을 지지 않습니다.',
            '② 회사는 회원이 게시한 정보의 정확성·신뢰성에 대하여 책임을 지지 않으며, 회원과 제3자 사이에 서비스를 매개로 이루어진 거래에 대하여는 책임을 지지 않습니다.',
            '③ 회사는 무료로 제공되는 서비스 이용과 관련하여 관련 법령에 특별한 규정이 없는 한 책임을 지지 않습니다.'
          ]
        },
        {
          h: '제14조 (준거법 및 재판관할)',
          p: [
            '본 약관과 서비스 이용에 관한 분쟁에는 대한민국 법을 적용하며, 회사와 회원 간의 소송은 민사소송법상 관할 법원에 제기합니다.'
          ]
        },
        {
          h: '제15조 (청소년 보호)',
          p: [
            '① 회사는 만 14세 미만 아동이 법정대리인의 동의 없이 회원가입을 할 수 없도록 확인 절차를 둡니다.',
            '② 회사는 청소년에게 유해한 정보(음란물, 폭력·자해 조장, 불법 도박·약물 등)가 게시되지 않도록 모니터링하며, 발견 시 즉시 비공개 또는 삭제 조치합니다.',
            '③ 청소년 유해 정보의 신고는 품 페이지 최하단 [신고하기] 또는 고객문의(' + COMPANY.support + ')로 접수할 수 있습니다.'
          ]
        },
        {
          h: '제16조 (손해배상)',
          p: [
            '① 회원이 본 약관 또는 관련 법령을 위반하여 회사 또는 제3자에게 손해를 입힌 경우 그 손해를 배상할 책임이 있습니다.',
            '② 회사가 고의 또는 중대한 과실 없이 회원에게 입힌 손해에 대해서는 회사는 통상손해의 범위에서 배상합니다. 다만 무료로 제공되는 서비스에 대해서는 관련 법령에 특별한 규정이 없는 한 책임을 지지 않습니다.'
          ]
        },
        {
          h: '제17조 (운영정책 및 고지)',
          p: [
            '① 회사는 본 약관에서 정하지 않은 세부 사항(게시물 운영 기준, 신고 처리 절차, 제재 기준 등)을 운영정책으로 정하여 서비스 내에 공개할 수 있습니다.',
            '② 운영정책은 본 약관과 함께 적용되며, 본 약관과 상충하는 경우 본 약관이 우선합니다.',
            '③ 회사는 약관·운영정책의 중요 변경을 서비스 초기 화면과 공지사항을 통해 알립니다.'
          ]
        },
        {
          h: '부칙',
          p: ['본 약관은 ' + POLICY_DATE + '부터 시행합니다.']
        }
      ]
    },

    privacy: {
      id: 'privacy',
      title: '개인정보처리방침',
      summary: COMPANY.name + '가 품(PUMSS) 서비스에서 회원의 개인정보를 수집·이용하는 기준입니다.',
      effective: POLICY_DATE,
      sections: [
        {
          h: '1. 총칙',
          p: [
            COMPANY.name + '(이하 "회사")는 회원의 개인정보를 소중하게 생각하며, 「개인정보 보호법」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」, 「통신비밀보호법」 등 관련 법령을 준수합니다.',
            '본 방침은 회사가 운영하는 품(PUMSS) 서비스(웹 · 모바일 앱 · PWA 포함)에 적용되며, 회사는 본 방침을 서비스 화면에 상시 공개합니다.',
            '본 방침은 법령 또는 서비스 변경에 따라 개정될 수 있으며, 개정 시 시행일 7일 전(회원의 권리에 중대한 변경은 30일 전)부터 서비스 내에 공지합니다.'
          ]
        },
        {
          h: '2. 개인정보 처리의 법적 근거',
          p: ['회사는 다음의 법적 근거에 따라 개인정보를 처리합니다.'],
          list: [
            '서비스 이용계약의 체결·이행: 회원가입, 본인 확인, 품 페이지 생성·공유, 콘텐츠 연동 (개인정보 보호법 제15조 제1항 제4호)',
            '법령상 의무의 이행: 본인 확인 기록 보관, 접속 기록 보관, 대금 결제·환불 기록 (같은 조 제2호)',
            '정보주체의 동의: 마케팅 정보 수신, 프로필 사진·주소 등 선택 항목 (같은 조 제1호)',
            '회사의 정당한 이익: 신고 접수·제재, 부정 이용 방지, 서비스 안정성 확보 (같은 조 제6호)'
          ]
        },
        {
          h: '3. 수집하는 개인정보 항목과 수집 방법',
          p: ['회사는 서비스 제공에 필요한 최소한의 개인정보를 다음의 시점에 수집합니다.'],
          list: [
            '회원가입 시(필수): 이름, 아이디(이메일 주소 또는 휴대전화번호), 비밀번호, 휴대전화번호 및 문자 인증 정보, 약관 동의 기록',
            '소셜 로그인 시(필수): 구글·네이버·카카오 계정의 이메일 주소, 프로필 이름(제공 동의 범위 내)',
            '프로필·품 꾸미기 시(선택): 프로필 사진, 배경 이미지, 소개글, 상호·직책, SNS 주소, 홈페이지 주소, 주소',
            '신고 접수 시(필수): 신고자 이메일 주소, 신고 대상 주소, 신고 사유 및 상세 내용, (선택) 참고 자료 파일',
            '1:1 문의 시(필수): 이름, 연락처(이메일 또는 전화번호), 문의 내용',
            '서비스 이용 과정에서 자동 생성·수집: 접속 IP, 쿠키·기기 저장소 값, 방문 일시, 서비스 이용·클릭 기록, 기기·브라우저 정보, 불량 이용 기록'
          ],
          p2: [
            '회사는 만 14세 미만 아동의 개인정보를 수집하지 않습니다. 아동임이 확인되는 경우 해당 계정을 즉시 비활성화하고 수집한 정보를 파기합니다.',
            '신용카드 번호·계좌번호 등 결제 수단 정보는 회사가 직접 저장하지 않으며, 결제가 필요한 유료 서비스는 결제대행사를 통해서만 처리합니다.'
          ]
        },
        {
          h: '4. 개인정보의 수집·이용 목적',
          p: ['회사는 수집한 개인정보를 다음의 목적으로만 이용합니다.'],
          list: [
            '회원 식별 및 본인 확인, 가입 의사 확인, 중복 가입 방지',
            '서비스 제공과 품 페이지 생성·공유, 품스 콘텐츠 연동, 고객 문의 응대',
            '신고 접수·처리 및 처리 결과 안내, 이용 제한 등 운영 정책 집행',
            '서비스 이용 통계와 접속 빈도 분석을 통한 서비스 개선',
            '이벤트·혜택 등 마케팅 정보 안내(별도 동의한 회원에 한함)'
          ]
        },
        {
          h: '5. 개인정보의 보유 및 이용 기간',
          p: ['회원의 개인정보는 수집·이용 목적이 달성되면 지체 없이 파기합니다. 회원 탈퇴 시 품 페이지는 즉시 비공개로 전환되고, 계정 정보는 30일 보관 후 완전히 삭제됩니다. 다만 관련 법령에 따라 다음 정보는 정해진 기간 동안 보관합니다.'],
          list: [
            '계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)',
            '대금 결제 및 재화·용역 공급에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)',
            '소비자 불만 또는 분쟁 처리에 관한 기록: 3년 (전자상거래 등에서의 소비자보호에 관한 법률)',
            '본인 확인에 관한 기록: 6개월 (정보통신망 이용촉진 및 정보보호 등에 관한 법률)',
            '접속에 관한 기록: 3개월 (통신비밀보호법)',
            '부정 가입·이용 방지를 위해 복원할 수 없는 형태로 변환한 휴대전화번호: 1년 (개인정보 보호법)'
          ]
        },
        {
          h: '6. 개인정보의 제3자 제공',
          p: [
            '회사는 회원의 개인정보를 본 방침에서 고지한 범위를 넘어 제3자에게 제공하지 않습니다. 다만 회원이 사전에 동의한 경우, 법령에 따라 수사기관이 정해진 절차와 방법으로 요구한 경우, 서비스 제공을 위해 결제·배송 등에 필요한 최소한의 정보를 제공하는 경우에는 예외로 합니다.',
            '제3자 제공이 필요한 경우 제공받는 자, 제공 목적, 제공 항목, 보유 기간을 사전에 고지하고 동의를 받습니다.',
            '신고가 접수된 페이지의 경우, 처리 결과 안내를 위해 신고자 이메일과 신고 내용을 해당 페이지 운영자에게 통지할 수 있으며 이때 신고자의 신원은 공개하지 않습니다.'
          ]
        },
        {
          h: '7. 개인정보 처리의 위탁',
          p: [
            '회사는 원활한 서비스 제공을 위하여 다음 업무를 외부 전문업체에 위탁합니다. 위탁 계약에는 개인정보 보호 법령의 준수, 비밀 유지, 제3자 제공 금지, 재위탁 제한, 처리 종료 후 파기 의무를 명시하고 관리·감독합니다.'
          ],
          list: [
            '서비스 서버 운영·호스팅: ㈜비아웹 — 회원 데이터 보관, 접속 로그 관리',
            '본인 확인 문자·알림 발송: 문자 발송 대행사 — 인증번호 및 안내 문자 발송',
            '이메일 발송: 메일 발송 대행 서비스 — 공지·안내 메일 발송',
            '클라우드 인프라: 국내 클라우드 사업자 — 서비스 운영 인프라 및 백업'
          ],
          p2: ['위탁 업체 또는 업무 내용이 변경되는 경우 본 방침을 통하여 공개합니다.']
        },
        {
          h: '8. 개인정보의 파기 절차 및 방법',
          p: [
            '수집 목적이 달성되거나 보유 기간이 끝난 개인정보는 지체 없이 파기합니다. 전자적 파일 형태로 저장된 정보는 복구할 수 없는 기술적 방법으로 삭제하고, 종이에 출력된 정보는 분쇄하거나 소각하여 파기합니다.',
            '회원 탈퇴 요청 후 5일 이내에는 실수로 인한 탈퇴를 취소할 수 있도록 정보를 보관하며, 이후 지체 없이 파기합니다.',
            '법령에 따라 보존이 필요한 정보는 별도의 저장 공간에 분리 보관하고, 보존 기간이 끝나면 즉시 파기합니다.'
          ]
        },
        {
          h: '9. 이용자와 법정대리인의 권리·행사 방법',
          p: [
            '이용자는 언제든지 자신의 개인정보를 조회·수정하거나 처리 정지를 요청할 수 있고, [계정 관리]에서 회원 탈퇴로 수집·이용 동의를 철회할 수 있습니다.',
            '이용자는 서면, 전화, 이메일로도 열람·정정·삭제·처리정지 요구를 할 수 있으며, 회사는 요청 접수일로부터 10일 이내에 처리 결과를 안내합니다.',
            '만 14세 미만 아동의 개인정보를 수집하는 경우 법정대리인의 동의를 받으며, 법정대리인은 아동의 개인정보 열람·정정·삭제를 요청할 수 있습니다.'
          ]
        },
        {
          h: '10. 쿠키 및 유사 기술(자동 수집 장치)의 운영',
          p: [
            '회사는 로그인 상태 유지, 글자 크기 등 화면 설정, 내 품 편집 내용의 임시 저장, 접속 통계 확인을 위하여 브라우저 쿠키와 기기 저장소(localStorage)를 사용합니다.',
            '이용자는 브라우저 설정에서 쿠키 저장을 거부하거나 저장된 쿠키를 삭제할 수 있습니다. 다만 이 경우 로그인과 품 꾸미기 저장 등 일부 기능을 이용하지 못할 수 있습니다.',
            '서비스 이용 통계는 개인을 식별할 수 없는 형태로 집계하며, 외부 분석 도구를 사용하는 경우 그 사실과 보관 기간을 본 방침에 공개합니다.'
          ]
        },
        {
          h: '11. 링크(외부) 사이트',
          p: [
            '품 페이지에는 회원이 등록한 SNS, 쇼핑몰, 지도, 동영상 등 외부 사이트로의 링크가 포함될 수 있습니다. 링크를 통해 이동한 외부 사이트의 개인정보 처리에는 해당 사이트의 개인정보처리방침이 적용되며, 회사는 외부 사이트의 내용이나 개인정보 처리에 대한 통제권이 없습니다.',
            '외부 사이트를 방문하기 전에 해당 사이트의 개인정보처리방침을 확인하시기 바랍니다.'
          ]
        },
        {
          h: '12. 개인정보의 안전성 확보 조치',
          p: [
            '회사는 개인정보 보호를 위하여 비밀번호 암호화, 접근 권한 최소화, 접속 기록 보관 및 위조·변조 방지, 보안 프로그램 운영 등 기술적·관리적 조치를 하고 있습니다.',
            '개인정보를 취급하는 인원을 최소한으로 지정하고 정기적으로 보안 교육과 자체 점검을 실시합니다.'
          ]
        },
        {
          h: '13. 개인정보 보호책임자 및 문의처',
          p: [
            '회사는 개인정보 처리에 관한 업무를 총괄하고 관련 문의·불만·피해 구제를 처리하기 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.'
          ],
          list: [
            '개인정보 보호책임자: ' + COMPANY.privacyOfficer + ' (' + COMPANY.privacyOfficerDept + ', ' + COMPANY.privacyOfficerTitle + ')',
            '전화: ' + COMPANY.tel,
            '이메일: ' + COMPANY.email,
            '고객문의: ' + COMPANY.support,
            '주소: ' + COMPANY.address
          ]
        },
        {
          h: '14. 권익침해 구제 방법',
          p: ['개인정보 침해에 대한 신고나 상담이 필요하신 경우 아래 기관에 문의하실 수 있습니다.'],
          list: [
            '개인정보침해 신고센터: (국번없이) 118 / privacy.kisa.or.kr',
            '개인정보 분쟁조정위원회: 1833-6972 / www.kopico.go.kr',
            '대검찰청 사이버수사과: (국번없이) 1301 / www.spo.go.kr',
            '경찰청 사이버수사국: (국번없이) 182 / ecrm.cyber.go.kr'
          ]
        },
        {
          h: '15. 고지의 의무',
          p: [
            '본 개인정보처리방침의 내용이 추가·삭제·수정되는 경우 시행일 최소 7일 전부터 서비스 내 공지사항을 통해 고지합니다. 수집 항목이나 이용 목적의 변경 등 회원 권리에 중대한 변경은 30일 전에 알립니다.',
            '공고일: ' + POLICY_DATE + ' / 시행일: ' + POLICY_DATE
          ]
        }
      ]
    },
    marketing: {
      id: 'marketing',
      title: '마케팅 정보 수신 동의',
      summary: '이벤트·혜택·새 소식 안내를 받을지 선택하는 동의입니다. 동의하지 않아도 가입할 수 있습니다.',
      effective: POLICY_DATE,
      sections: [
        {
          h: '1. 수집·이용 항목',
          p: ['이름, 휴대전화번호, 이메일 주소, 서비스 이용 기록(품 방문·클릭 기록)을 마케팅 정보 안내에 이용합니다.']
        },
        {
          h: '2. 이용 목적',
          p: ['회사는 다음 정보를 회원에게 안내하기 위하여 위 정보를 이용합니다.'],
          list: [
            '새로운 기능·서비스 업데이트 안내',
            '이벤트, 쿠폰, 품 프로 이용권 등 혜택 안내',
            '회원이 관심을 보인 콘텐츠·영역에 기반한 맞춤 정보 안내'
          ]
        },
        {
          h: '3. 전송 채널 및 방법',
          p: ['앱 알림(푸시), 문자메시지(SMS·MMS), 이메일, 서비스 내 알림으로 전송합니다. 광고성 정보는 제목 또는 본문 앞부분에 "(광고)" 표시와 수신 거부 방법을 함께 안내합니다. 오후 9시부터 다음 날 오전 8시까지는 별도의 사전 동의 없이 광고성 정보를 전송하지 않습니다.']
        },
        {
          h: '4. 보유 및 이용 기간',
          p: ['동의일로부터 회원 탈퇴 또는 동의 철회 시까지 보관하며, 철회 즉시 마케팅 목적 이용을 중단합니다. 법령에 따라 보존이 필요한 거래 기록은 해당 기간 동안 분리 보관합니다.']
        },
        {
          h: '5. 동의 거부 및 철회 방법',
          p: [
            '마케팅 정보 수신 동의는 선택 사항이며, 동의하지 않아도 회원가입과 서비스 이용에는 제한이 없습니다.',
            '[설정 > 알림]에서 수신을 끄거나, 문자·이메일의 수신 거부 안내, 또는 고객문의(' + COMPANY.email + ')를 통해 언제든지 철회할 수 있습니다.'
          ]
        }
      ]
    }
  };

  function policyById(id) {
    return POLICIES[id] || null;
  }

  function policyBodyHTML(doc) {
    return doc.sections
      .map(function (sec) {
        return (
          '<section class="policy-sec">' +
          '<h2>' + esc(sec.h) + '</h2>' +
          (sec.p || [])
            .map(function (t) {
              return '<p>' + esc(t) + '</p>';
            })
            .join('') +
          (sec.list && sec.list.length
            ? '<ul class="policy-list">' +
              sec.list
                .map(function (li) {
                  return '<li>' + esc(li) + '</li>';
                })
                .join('') +
              '</ul>'
            : '') +
          (sec.p2 || [])
            .map(function (t) {
              return '<p>' + esc(t) + '</p>';
            })
            .join('') +
          '</section>'
        );
      })
      .join('');
  }

  /** 약관 전문을 모달로 띄웁니다. (회원가입 [보기] · 푸터 링크 공용) */
  function openPolicy(id) {
    var doc = policyById(id);
    if (!doc) return;
    var m = Pum.modal({
      title: doc.title,
      desc: doc.summary,
      body:
        '<div class="policy-modal__body policy-body">' + policyBodyHTML(doc) + '</div>' +
        '<p class="policy-modal__date">시행일 ' + esc(doc.effective) + '</p>' +
        '<p class="policy-modal__more"><a class="linkbtn" href="#/' + esc(doc.id) + '">전체 화면으로 보기</a></p>',
      actions: [{ label: '확인', kind: 'primary' }]
    });
    if (m) m.el.classList.add('modal--policy');
  }

  /* ----------------------------------------------------------------------
     푸터
     ---------------------------------------------------------------------- */
  /** 로그인한 품 회원에게만 보이는 품스 바로가기 (비로그인·공유 페이지 컴팩트 푸터에는 없음) */
  function pumssLinkHTML() {
    if (!isMember()) return '';
    return (
      '<a class="site-foot__pumss" href="' + PUMSS_URL + '" target="_blank" rel="noopener noreferrer">' +
      '<img class="site-foot__pumss-icon" src="' + APP_ICON + '" alt="" width="30" height="30" />' +
      '<span class="site-foot__pumss-body"><b>품스(PUMSS) 바로가기</b>' +
      '<em>품을 만든 품스의 다른 서비스를 만나보세요</em></span>' +
      '<span class="site-foot__pumss-arrow">' + icon('external') + '</span>' +
      '</a>'
    );
  }

  function footerHTML(opts) {
    var o = opts || {};
    var linkButtons =
      '<button type="button" class="site-foot__link" data-site-policy="terms">이용약관</button>' +
      '<button type="button" class="site-foot__link" data-site-policy="privacy">개인정보처리방침</button>';

    if (o.compact) {
      return (
        '<footer class="site-foot site-foot--compact" aria-label="사업자 정보">' +
        '<div class="site-foot__inner">' +
        '<p class="site-foot__line"><b>' + esc(COMPANY.name) + '</b> · ' + esc(COMPANY.service) +
        ' · 대표 ' + esc(COMPANY.ceo) + '</p>' +
        '<p class="site-foot__line">' + esc(COMPANY.address) + ' · 사업자등록번호 ' + esc(COMPANY.bizNo) +
        ' · 고객문의 ' + esc(COMPANY.tel) + '</p>' +
        '<div class="site-foot__links">' + linkButtons +
        '<span class="site-foot__dot">·</span>' +
        '<button type="button" class="site-foot__link" data-site-policy="marketing">광고성 정보 수신</button></div>' +
        '</div></footer>'
      );
    }

    return (
      '<footer class="site-foot" aria-label="사업자 정보">' +
      pumssLinkHTML() +
      '<div class="site-foot__brand"><span class="site-foot__mark">품</span>' +
      '<span class="site-foot__word">PUMSS</span></div>' +
      '<p class="site-foot__line">' + esc(COMPANY.name) + ' · 대표이사 ' + esc(COMPANY.ceo) +
      ' · 개인정보 보호책임자 ' + esc(COMPANY.privacyOfficer) + '</p>' +
      '<p class="site-foot__line">' + esc(COMPANY.address) + '</p>' +
      '<p class="site-foot__line">사업자등록번호 ' + esc(COMPANY.bizNo) +
      ' · 통신판매업신고 ' + esc(COMPANY.mailOrderNo) + '</p>' +
      '<p class="site-foot__line">호스팅제공자 ' + esc(COMPANY.host) +
      ' · 고객문의 ' + esc(COMPANY.tel) + ' · ' + esc(COMPANY.email) + '</p>' +
      '<div class="site-foot__links">' + linkButtons +
      '<span class="site-foot__dot">·</span>' +
      '<button type="button" class="site-foot__link" data-site-policy="marketing">마케팅 정보 수신 안내</button></div>' +
      '<p class="site-foot__copy">© 2026 ' + esc(COMPANY.name) + '. All rights reserved.</p>' +
      '</footer>'
    );
  }

  /* ----------------------------------------------------------------------
     품 주소(@아이디) → 화면 경로
     ---------------------------------------------------------------------- */
  function routeKind(path) {
    if (
      ['/', '/login', '/signup', '/find', '/welcome', '/editor', '/preview', '/settings', '/account',
        '/terms', '/privacy', '/marketing', '/report'].indexOf(path) > -1
    ) {
      return 'full';
    }
    if (path === '/share' || path.indexOf('/p/') === 0) return 'compact';
    return null;
  }

  function targetSlug(path) {
    if (path === '/share') return (Pum.getState().profile.slug || '').trim();
    if (path.indexOf('/p/') === 0) {
      try {
        return decodeURIComponent(path.slice(3)).replace(/^@/, '').trim();
      } catch (e) {
        return path.slice(3).replace(/^@/, '').trim();
      }
    }
    return '';
  }

  function reportBlockHTML(slug) {
    return (
      '<div class="share-report">' +
      '<button type="button" class="share-report__btn" data-site-report="' + esc(slug) + '">' +
      icon('info') + '<span>신고하기</span></button>' +
      '<p class="share-report__hint">권리 침해 · 사칭 · 스팸·불법 게시물 등 운영 정책 위반을 신고할 수 있습니다.</p>' +
      '</div>'
    );
  }

  /* ----------------------------------------------------------------------
     홈 화면에 추가 (PWA 설치)
     ---------------------------------------------------------------------- */
  var deferredPrompt = null;
  var DISMISS_KEY = 'pum.install.bannerDismissedAt';
  var DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

  function isStandalone() {
    try {
      if (global.matchMedia && global.matchMedia('(display-mode: standalone)').matches) return true;
    } catch (e) {
      /* ignore */
    }
    return global.navigator.standalone === true;
  }

  function isIOS() {
    var ua = String((global.navigator && global.navigator.userAgent) || '');
    if (/iphone|ipad|ipod/i.test(ua)) return true;
    /* iPadOS 13+ 는 데스크톱 UA 로 표시됩니다 */
    return /macintosh/i.test(ua) && (global.navigator.maxTouchPoints || 0) > 1;
  }

  function isMobileView() {
    if (isIOS()) return true;
    if (/android/i.test(String((global.navigator && global.navigator.userAgent) || ''))) return true;
    try {
      return global.matchMedia('(max-width: 820px)').matches;
    } catch (e) {
      return false;
    }
  }

  function dismissedRecently() {
    try {
      var at = Number(localStorage.getItem(DISMISS_KEY) || 0);
      return at > 0 && Date.now() - at < DISMISS_MS;
    } catch (e) {
      return false;
    }
  }

  function canShowBanner() {
    return isMobileView() && !isStandalone() && !dismissedRecently();
  }

  function installGuideModal() {
    var ios = isIOS();
    var steps = ios
      ? [
          '<b>Safari</b>로 연 상태에서 화면 하단의 <b>공유 버튼(⬆️)</b>을 누릅니다.',
          '목록을 내려 <b>‘홈 화면에 추가’</b>를 선택합니다.',
          '오른쪽 위 <b>‘추가’</b>를 누르면 홈 화면에 품 아이콘이 생깁니다.'
        ]
      : [
          '브라우저 오른쪽 위 <b>메뉴(⋮)</b>를 누릅니다.',
          '<b>‘앱 설치’</b> 또는 <b>‘홈 화면에 추가’</b>를 선택합니다.',
          '확인을 누르면 홈 화면에 품 아이콘이 생깁니다.'
        ];
    Pum.modal({
      title: '홈 화면에 추가',
      desc: ios
        ? '아이폰(사파리)은 자동 설치 창이 뜨지 않아 아래 순서로 추가합니다.'
        : '아래 순서로 홈 화면에 추가할 수 있어요.',
      body:
        '<div class="install-app">' +
        '<img class="install-app__icon install-app__icon--lg" src="' + APP_ICON + '" alt="품 공식 앱 아이콘" width="64" height="64" />' +
        '<span class="install-app__body"><b>품 꾸미기</b>' +
        '<em>홈 화면에는 이 아이콘으로 추가됩니다</em></span></div>' +
        '<ol class="install-guide">' +
        steps
          .map(function (t) {
            return '<li><span>' + t + '</span></li>';
          })
          .join('') +
        '</ol>' +
        '<p class="field__hint" style="margin-top:12px">추가하면 주소 입력 없이 한 번에 열 수 있고, 화면이 앱처럼 넓게 표시됩니다.</p>',
      actions: [{ label: '확인', kind: 'primary' }]
    });
  }

  function promptInstall() {
    if (isStandalone()) {
      Pum.toast('이미 홈 화면에서 실행 중입니다');
      return;
    }
    if (deferredPrompt && typeof deferredPrompt.prompt === 'function') {
      var ev = deferredPrompt;
      deferredPrompt = null;
      ev.prompt();
      var done = function (choice) {
        var accepted = choice && choice.outcome === 'accepted';
        Pum.toast(accepted ? '홈 화면에 추가되었습니다' : '설치를 취소했습니다', accepted ? 'ok' : undefined);
        removeBanner();
      };
      if (ev.userChoice && typeof ev.userChoice.then === 'function') ev.userChoice.then(done);
      else removeBanner();
      return;
    }
    installGuideModal();
  }

  function bannerHTML() {
    return (
      '<div class="install-banner" role="region" aria-label="홈 화면에 추가">' +
      '<img class="install-banner__icon install-banner__icon--img" src="' + APP_ICON + '" alt="" width="38" height="38" />' +
      '<span class="install-banner__text"><b>홈 화면에 추가</b>' +
      '<span>앱처럼 한 번에 열고 새 소식을 받아보세요</span></span>' +
      '<button type="button" class="btn btn--xs btn--primary" data-site-install>추가</button>' +
      '<button type="button" class="install-banner__close" data-site-install-close aria-label="닫기">' +
      icon('close') + '</button>' +
      '</div>'
    );
  }

  function mountInstallBanner() {
    if (!canShowBanner()) return;
    if (document.querySelector('.install-banner')) return;
    var wrap = document.createElement('div');
    wrap.innerHTML = bannerHTML();
    document.body.appendChild(wrap.firstChild);
    document.body.classList.add('has-install-banner');
  }

  function removeBanner() {
    var el = document.querySelector('.install-banner');
    if (el && el.parentNode) el.parentNode.removeChild(el);
    document.body.classList.remove('has-install-banner');
  }

  function dismissBanner() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch (e) {
      /* ignore */
    }
    removeBanner();
  }

  /** 설정 화면의 ‘앱 설치’ 카드 */
  function installCardHTML() {
    var standalone = isStandalone();
    var supported = !!deferredPrompt;
    var status = standalone
      ? '홈 화면(앱)에서 실행 중입니다'
      : supported
      ? '이 브라우저는 한 번에 설치할 수 있어요'
      : isIOS()
      ? '아이폰은 공유 버튼 → 홈 화면에 추가로 설치합니다'
      : '브라우저 메뉴에서 홈 화면에 추가할 수 있어요';
    return (
      '<section class="card is-open">' +
      '<div class="card__head"><h2 class="card__title">홈 화면에 추가</h2>' +
      '<span class="card__sub" style="margin-left:auto">' + (standalone ? '설치됨' : 'PWA') + '</span></div>' +
      '<div class="card__body">' +
      '<div class="install-app">' +
      '<img class="install-app__icon" src="' + APP_ICON + '" alt="품 공식 앱 아이콘" width="52" height="52" />' +
      '<span class="install-app__body"><b>품 꾸미기</b>' +
      '<em>홈 화면에 추가될 아이콘 미리보기</em></span></div>' +
      '<p class="field__hint" style="margin:0">' + esc(status) + '</p>' +
      (standalone
        ? '<button class="btn btn--sm btn--ghost" type="button" disabled>이미 홈 화면에 추가됨</button>'
        : '<button class="btn btn--sm btn--primary" type="button" data-site-install>홈 화면에 추가</button>') +
      '<p class="field__hint" style="margin:0">홈 화면 아이콘은 품 공식 아이콘으로 고정되며, 프로필 사진을 바꿔도 아이콘은 바뀌지 않습니다.</p>' +
      '</div></section>'
    );
  }

  /* ----------------------------------------------------------------------
     공유 페이지 신고
     ---------------------------------------------------------------------- */
  var REPORT_REASONS = [
    '권리 침해 (저작권·초상권·상표권 등)',
    '사칭·명의 도용',
    '스팸·광고성 게시물',
    '불법·유해 정보 (음란·폭력·불법 촬영물 등)',
    '허위 정보·허위 홍보',
    '기타 운영 정책 위반'
  ];

  function stampNow() {
    var d = new Date();
    function pad(n) {
      return (n < 10 ? '0' : '') + n;
    }
    return (
      d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
      pad(d.getHours()) + ':' + pad(d.getMinutes())
    );
  }

  function ownerEmailOf(slug) {
    var ad = (Pum.adminData && Pum.adminData()) || null;
    if (!ad || !ad.members) return '';
    var found = ad.members.filter(function (m) {
      return String(m.slug || '').toLowerCase() === String(slug || '').toLowerCase();
    })[0];
    return (found && found.email) || '';
  }

  function openReport(slug) {
    var target = String(slug || '').trim();
    if (!target) target = (Pum.getState().profile.slug || '').trim();

    var body =
      '<div class="map-note">' + icon('info') +
      '<span><b>신고 목적 안내</b><br/>권리 침해, 사칭, 스팸·불법 게시물 등 운영 정책 위반을 신고하는 창구입니다. ' +
      '접수된 내용은 운영 관리자가 확인하여 게시중단·비공개·이용 정지 등 필요한 조치를 하며, 결과는 입력하신 이메일로 안내됩니다.</span></div>' +
      '<div class="report-target"><span>신고 대상</span><b>@' + esc(target) + '</b></div>' +
      '<div class="field"><label class="field__label" for="rpReason">신고 사유 <span class="req">*</span></label>' +
      '<select class="input select" id="rpReason">' +
      '<option value="">신고 사유를 선택해 주세요</option>' +
      REPORT_REASONS.map(function (r) {
        return '<option value="' + esc(r) + '">' + esc(r) + '</option>';
      }).join('') +
      '</select><div class="auth__error" id="rpReasonError"></div></div>' +
      '<div class="field"><label class="field__label" for="rpDetail">상세 내용 <span class="req">*</span></label>' +
      '<textarea class="textarea" id="rpDetail" rows="4" maxlength="500" ' +
      'placeholder="어떤 부분이 문제인지 구체적으로 적어 주세요. (예: 3번째 블록의 사진이 제 사진을 무단 사용했습니다)"></textarea>' +
      '<div class="field__hint"><span id="rpCount">0</span>/500자</div>' +
      '<div class="auth__error" id="rpDetailError"></div></div>' +
      '<div class="field"><label class="field__label" for="rpEmail">신고자 이메일 <span class="req">*</span></label>' +
      '<input class="input" id="rpEmail" type="email" inputmode="email" autocomplete="email" placeholder="example@email.com" />' +
      '<div class="field__hint">처리 결과를 회신받을 이메일입니다. 허위 신고 방지를 위해 사용되며 페이지에 공개되지 않습니다.</div>' +
      '<div class="auth__error" id="rpEmailError"></div></div>' +
      '<label class="check-row check-row--compact"><input type="checkbox" id="rpAgree" />' +
      '<span style="font-size:12px">허위 신고 시 이용이 제한될 수 있음을 확인했습니다. <span class="req">*</span></span></label>' +
      '<div class="auth__error" id="rpAgreeError"></div>';

    var m = Pum.modal({
      title: '신고하기',
      desc: '@' + target + ' 품을 신고합니다',
      body: body,
      actions: [
        { label: '취소', kind: 'ghost' },
        {
          label: '신고 접수',
          kind: 'brand',
          onClick: function (api) {
            var reasonEl = api.body.querySelector('#rpReason');
            var detailEl = api.body.querySelector('#rpDetail');
            var emailEl = api.body.querySelector('#rpEmail');
            var agreeEl = api.body.querySelector('#rpAgree');
            var reason = reasonEl.value;
            var detail = detailEl.value.trim();
            var email = emailEl.value.trim();
            var bad = false;

            function setErr(id, msg, el) {
              var box = api.body.querySelector(id);
              if (box) box.textContent = msg || '';
              if (el) el.classList.toggle('is-error', !!msg);
            }
            setErr('#rpReasonError', '', reasonEl);
            setErr('#rpDetailError', '', detailEl);
            setErr('#rpEmailError', '', emailEl);
            setErr('#rpAgreeError', '');

            if (!reason) {
              setErr('#rpReasonError', '신고 사유를 선택해 주세요.', reasonEl);
              bad = true;
            }
            if (detail.length < 5) {
              setErr('#rpDetailError', '상세 내용을 5자 이상 적어 주세요.', detailEl);
              bad = true;
            }
            if (!email) {
              setErr('#rpEmailError', '신고자 이메일을 입력해 주세요.', emailEl);
              bad = true;
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
              setErr('#rpEmailError', '이메일 형식으로 입력해 주세요.', emailEl);
              bad = true;
            }
            if (!agreeEl.checked) {
              setErr('#rpAgreeError', '확인 항목에 체크해 주세요.');
              bad = true;
            }
            if (bad) return false;

            var at = stampNow();
            Pum.update(function (st) {
              st.admin = st.admin || {};
              st.admin.reports = st.admin.reports || [];
              st.admin.reports.unshift({
                id: 'r-' + Date.now().toString(36),
                target: '@' + target,
                slug: target,
                email: ownerEmailOf(target),
                reason: reason,
                detail: detail,
                reporter: email,
                reporterEmail: email,
                at: at,
                status: '접수',
                source: 'share'
              });
              if (st.admin.reports.length > 100) st.admin.reports.length = 100;
            });
            if (Pum.logAudit) Pum.logAudit('공유 페이지 신고 접수 · @' + target + ' · 신고자 ' + email);
            if (Pum.addMail) {
              Pum.addMail({
                to: email,
                subject: '[품] 신고 접수가 완료되었습니다 (데모 발송)',
                body: '대상 @' + target + ' / 사유: ' + reason,
                kind: 'mail'
              });
            }
            Pum.toast('신고가 접수되었습니다. 처리 결과는 이메일로 안내됩니다');
            return true;
          }
        }
      ]
    });

    if (!m) return;
    var detailEl = m.body.querySelector('#rpDetail');
    var countEl = m.body.querySelector('#rpCount');
    if (detailEl && countEl) {
      detailEl.addEventListener('input', function () {
        countEl.textContent = String(detailEl.value.length);
      });
    }
    m.body.querySelectorAll('input, select, textarea').forEach(function (el) {
      el.addEventListener('input', function () {
        el.classList.remove('is-error');
      });
    });
  }

  /* ----------------------------------------------------------------------
     화면에 붙이기 (라우터가 매 화면 렌더 후 호출)
     ---------------------------------------------------------------------- */
  function mount(app, path) {
    if (!app) return;
    document.documentElement.classList.toggle('is-standalone', isStandalone());
    removeBanner();

    /* 화면 안에서 다시 그릴 때(비공개 품 잠금 해제 등) 중복되지 않도록 기존 푸터를 지웁니다. */
    Array.prototype.slice.call(app.querySelectorAll('.site-foot-slot')).forEach(function (el) {
      if (el.parentNode) el.parentNode.removeChild(el);
    });

    var kind = routeKind(path);
    if (!kind) return;

    var holder = document.createElement('div');
    holder.className = 'site-foot-slot';
    holder.innerHTML = footerHTML({ compact: kind === 'compact' });

    var page = app.querySelector('.share-page');
    (page || app).appendChild(holder);

    if (kind === 'full' && (path === '/editor' || path === '/preview' || path === '/settings')) {
      mountInstallBanner();
    }
  }

  /* 위임 클릭 — 화면마다 다시 붙이지 않아도 되도록 문서 단위로 처리 */
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    var policyBtn = t.closest('[data-site-policy]');
    if (policyBtn) {
      e.preventDefault();
      openPolicy(policyBtn.getAttribute('data-site-policy'));
      return;
    }
    var installBtn = t.closest('[data-site-install]');
    if (installBtn) {
      e.preventDefault();
      promptInstall();
      return;
    }
    var closeBtn = t.closest('[data-site-install-close]');
    if (closeBtn) {
      e.preventDefault();
      dismissBanner();
      return;
    }
    var reportBtn = t.closest('[data-site-report]');
    if (reportBtn) {
      e.preventDefault();
      openReport(reportBtn.getAttribute('data-site-report'));
    }
  });

  global.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
  });
  global.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    removeBanner();
    try {
      localStorage.removeItem(DISMISS_KEY);
    } catch (err) {
      /* ignore */
    }
    Pum.toast('홈 화면에 추가되었습니다');
  });

  /* ----------------------------------------------------------------------
     약관 전용 라우트 (#/terms · #/privacy · #/marketing)
     ---------------------------------------------------------------------- */
  function policyView(app, id) {
    var doc = policyById(id);
    if (!doc) {
      Pum.go('/login');
      return;
    }
    var others = ['terms', 'privacy', 'marketing'].filter(function (x) {
      return x !== id;
    });
    app.innerHTML =
      '<header class="appbar">' +
      '<button type="button" class="appbar__icon" data-nav="back" aria-label="뒤로">' + icon('back') + '</button>' +
      '<div class="appbar__title">' + esc(doc.title) + '</div>' +
      '<div class="appbar__right"></div>' +
      '</header>' +
      '<div class="shell policy-page">' +
      '<div class="policy-head">' +
      '<h1>' + esc(doc.title) + '</h1>' +
      '<p>' + esc(doc.summary) + '</p>' +
      '<p>시행일 ' + esc(doc.effective) + ' · ' + esc(COMPANY.name) + '</p>' +
      '</div>' +
      '<article class="policy-body">' + policyBodyHTML(doc) + '</article>' +
      '<nav class="policy-nav">' +
      others
        .map(function (x) {
          return '<a class="btn btn--sm btn--ghost" href="#/' + x + '">' + esc(POLICIES[x].title) + '</a>';
        })
        .join('') +
      '</nav>' +
      '</div>';
    document.title = doc.title + ' · 품';
  }

  Pum.site = {
    company: COMPANY,
    policies: POLICIES,
    pumssUrl: PUMSS_URL,
    appIcon: APP_ICON,
    footerHTML: footerHTML,
    installCardHTML: installCardHTML,
    inviteUrl: inviteUrl,
    isMember: isMember,
    mount: mount,
    openPolicy: openPolicy,
    openReport: openReport,
    promptInstall: promptInstall,
    isStandalone: isStandalone
  };

  Pum.views = Pum.views || {};
  Pum.views.terms = function (app) {
    policyView(app, 'terms');
  };
  Pum.views.privacy = function (app) {
    policyView(app, 'privacy');
  };
  Pum.views.marketing = function (app) {
    policyView(app, 'marketing');
  };
})(window);
