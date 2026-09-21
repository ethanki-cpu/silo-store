import type { Metadata } from "next";
import { LegalDocument, LegalSection } from "@/components/legal/LegalDocument";
import { fetchBusinessInfo } from "@/lib/businessInfo";

export const metadata: Metadata = { title: "개인정보처리방침" };
export const revalidate = 3600;

// EPIC-158.0(토스페이먼츠 심사 요건): 개인정보처리방침. 실제 사용 중인 인프라(Supabase/Vercel/
// Cloudflare R2/토스페이먼츠/Google·Kakao 로그인)에 맞춘 초안 — 시행 전 대표님/법률 검토로 확정한다.
export default async function PrivacyPage() {
  const business = await fetchBusinessInfo();
  const company = business.name;
  const officer = business.privacyOfficer || "(개인정보보호책임자 지정 예정)";

  return (
    <LegalDocument title="개인정보처리방침" effectiveDate="2026년 9월 21일" business={business}>
      <p>
        {company}(이하 &quot;회사&quot;)는 「개인정보 보호법」 등 관련 법령을 준수하며, 이용자의 개인정보를 보호하고 관련 고충을 신속하게
        처리하기 위해 다음과 같이 개인정보처리방침을 수립·공개합니다.
      </p>

      <LegalSection title="1. 수집하는 개인정보 항목과 수집 방법">
        <p>가. 회원가입 및 서비스 이용: 이메일, 이름(닉네임), 소셜 로그인 시 제공되는 계정 식별자(Google, Kakao), 비밀번호(이메일 가입 시, 암호화 저장)</p>
        <p>나. 서비스 이용 과정에서 생성되는 정보: 게시글·댓글·업로드 파일, 포인트 및 활동 이력, 예약·주문·구매 이력, 접속 기록</p>
        <p>
          다. 유료 결제: 결제 수단 정보는 결제대행사(토스페이먼츠)가 직접 처리하며 회사는 카드 번호를 저장하지 않습니다. 정기결제를 위해
          토스페이먼츠가 발급하는 빌링키, 카드사명, 마스킹된 카드 번호, 결제 일시·금액·주문 번호를 저장합니다.
        </p>
        <p>라. 무통장 입금: 주문 정보, 입금자명, 배송이 필요한 경우 수령인 정보(성명, 연락처, 주소)</p>
      </LegalSection>

      <LegalSection title="2. 개인정보의 이용 목적">
        <p>회원 식별 및 본인 확인, 서비스 제공(콘텐츠·멤버십·예약·주문 처리), 대금 결제 및 환불, 고객 문의 응대, 서비스 개선 및 부정 이용 방지, 법령상 의무 이행.</p>
      </LegalSection>

      <LegalSection title="3. 개인정보의 보유 및 이용 기간">
        <p>회사는 회원 탈퇴 시 지체 없이 개인정보를 파기합니다. 다만 관련 법령에 따라 아래 기간 동안 보관합니다.</p>
        <p>- 계약 또는 청약철회 등에 관한 기록: 5년(전자상거래 등에서의 소비자보호에 관한 법률)</p>
        <p>- 대금결제 및 재화 등의 공급에 관한 기록: 5년(동법)</p>
        <p>- 소비자의 불만 또는 분쟁처리에 관한 기록: 3년(동법)</p>
        <p>- 표시·광고에 관한 기록: 6개월(동법)</p>
        <p>- 접속 로그 기록: 3개월(통신비밀보호법)</p>
      </LegalSection>

      <LegalSection title="4. 개인정보의 제3자 제공">
        <p>회사는 이용자의 동의가 있거나 법령에 근거가 있는 경우를 제외하고 개인정보를 제3자에게 제공하지 않습니다.</p>
      </LegalSection>

      <LegalSection title="5. 개인정보 처리의 위탁 및 국외 이전">
        <p>회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리를 위탁하고 있습니다.</p>
        <p>- 토스페이먼츠 주식회사: 결제 처리(카드·간편결제, 정기결제)</p>
        <p>- Supabase Inc.(미국 등): 회원 인증, 데이터베이스 저장</p>
        <p>- Vercel Inc.(미국): 웹사이트 호스팅</p>
        <p>- Cloudflare, Inc.(미국 등): 이미지·영상 등 파일 저장 및 전송(R2)</p>
        <p>
          위 해외 사업자에게는 서비스 이용 시점에 네트워크를 통해 개인정보가 이전되며, 이전되는 항목은 위 1항의 정보이고 보유·이용 기간은
          위탁 계약 종료 또는 회원 탈퇴 시까지입니다.
        </p>
      </LegalSection>

      <LegalSection title="6. 정보주체의 권리와 행사 방법">
        <p>
          이용자는 언제든지 자신의 개인정보에 대한 열람, 정정, 삭제, 처리정지를 요구할 수 있으며, 서비스 내 설정 화면 또는 아래 개인정보
          보호책임자에게 이메일로 요청하실 수 있습니다. 회사는 지체 없이 조치합니다.
        </p>
      </LegalSection>

      <LegalSection title="7. 개인정보의 파기 절차 및 방법">
        <p>보유 기간이 경과하거나 처리 목적이 달성된 개인정보는 지체 없이 파기합니다. 전자적 파일은 복구할 수 없는 방법으로 삭제합니다.</p>
      </LegalSection>

      <LegalSection title="8. 개인정보의 안전성 확보 조치">
        <p>접근 권한 최소화(행 단위 접근 제어), 비밀번호 암호화, 결제 인증 키(빌링키) 접근 차단, 전송 구간 암호화(HTTPS) 등 기술적·관리적 보호 조치를 시행합니다.</p>
      </LegalSection>

      <LegalSection title="9. 쿠키 및 로컬 저장소">
        <p>로그인 유지를 위해 브라우저 로컬 저장소에 인증 세션 정보를 저장합니다. 브라우저 설정에서 삭제할 수 있으나 삭제 시 로그인이 해제됩니다.</p>
      </LegalSection>

      <LegalSection title="10. 개인정보 보호책임자">
        <p>성명: {officer}</p>
        {business.email && <p>이메일: {business.email}</p>}
        {business.phone && <p>전화: {business.phone}</p>}
        <p>
          기타 개인정보 침해에 대한 신고나 상담은 개인정보침해신고센터(privacy.kisa.or.kr, 118), 대검찰청 사이버수사과(spo.go.kr, 1301),
          경찰청 사이버수사국(ecrm.cyber.go.kr, 182)에 문의하실 수 있습니다.
        </p>
      </LegalSection>

      <LegalSection title="11. 방침의 변경">
        <p>이 개인정보처리방침은 2026년 9월 21일부터 적용되며, 변경 시 시행일 7일 전부터 서비스 내에 공지합니다.</p>
      </LegalSection>
    </LegalDocument>
  );
}
