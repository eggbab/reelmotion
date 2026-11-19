import { DOC_HEADS } from './heads'
import type { LegalDocs } from './types'

/**
 * 개인정보처리방침. 원문은 한국어이고 영어·일본어는 번역이다.
 * 글은 실제 동작과 같아야 한다(2026-11-15 확인). 동작을 바꾸면 이 글도 함께 고친다(AGENTS.md 규칙).
 * - 영상: 브라우저 안에서만 처리, 올리지 않는다(src/export).
 * - 얼굴 자리(src/faces, 2026-11-15): 가로 영상에 그래픽이 있으면 장면에서 가장 큰 얼굴의 상자(화면의 비율)만 브라우저 안에서 찾는다.
 *   누구인지 알아보지 않는다(얼굴 인식 아님). 상자는 메모리에만 두고 보내거나 저장하지 않는다. 작업에는 그래픽의 쪽(left·right)만.
 *   모델(UltraFace, 1.3MB)과 실행 파일은 우리 사이트에서 받아 서비스 워커 캐시·브라우저 캐시에 둔다.
 * - 소리: 16kHz 모노로 바꿔 받아쓰기 서버로 보낸다(src/speech/server.ts). 서버는 메모리에서만 다루고 결과를 돌려주면 버린다
 *   (server/asr — 디스크에 쓰지 않음, 접속 기록 끔).
 * - 접속 기록: 웹(deploy/Caddyfile)은 접속 기록을 쓰지 않고 오류 기록에서 IP·머리글을 지운다. 앞단(운영 PC 의 공개 주소)도
 *   접속 기록을 남기지 않게 둔다(docs/operations.md).
 * - 기기에 저장: 「내 작업」(IndexedDB `reelmotion` — 작업과 넣은 영상, src/editor/store.ts), 언어 선택(localStorage `reelmotion.lang`),
 *   닫은 공지의 판 번호(localStorage `reelmotion.notice.closed` — src/site/notice.ts),
 *   편집기 화면 파일(Cache Storage `reelmotion-<판>` — 서비스 워커 src/pwa/sw.ts, 편집기를 연 사람만),
 *   브라우저 안 받아쓰기 모델 파일(브라우저 캐시). 쿠키는 로그인했을 때 로그인 유지 하나(rm_session, 30일 — server/app/sessions.ts).
 * - Claude·ChatGPT 커넥터(server/app/connect.ts, /mcp): 그 서비스가 보낸 대본·스타일·언어만 받는다(누가 보냈는지는 모른다).
 *   계획만 볼 때는 저장하지 않고, 「편집기로 열기」는 초안을 최대 7일 둔다(drafts.db — 백업에 넣지 않는다. 표가 차면 더 일찍 지울 수 있다).
 *   남용 막기로 링크를 만든 횟수를 셀 때 요청을 보낸 곳의 IP(보통 그 서비스의 서버)를 메모리에 1분까지.
 * - 계정(server/app, 2026-11-15): 구글 로그인(고유번호·메일·이름), 로그인한 사람의 작업(영상 제외)을 서버 SQLite 에. 탈퇴하면 바로 지운다.
 * - 말로 고치기(server/app/assist.ts)·AI 로 강조할 순간 찾기(server/app/highlights.ts — 대본의 문장과 시간): 우리 서버의 AI 가 읽고 버린다. 로그인하지 않았으면 남용 막기로 IP 를 메모리에 10분까지.
 * - 내보내기(server/app/app.ts /api/usage/export): 내보내기 전에 영상 길이(초)만 받아 요금제 한도를 보고 버린다. 다 만들면 로그인한 사람의
 *   달마다 횟수(usage 표)를 하나 센다. 탈퇴하면 함께 지운다(on delete cascade).
 * - 백업(server/app/backup.ts): 앱 서버가 하루 한 번 저장소 전체를 같은 서버 안에 백업하고 7일(BACKUP_DAYS, 30 이하)이 지나면 지운다.
 *   운영자가 꺼내 둔 백업도 30일이 지나면 지운다(docs/operations.md 「백업」). 그래서 「백업에는 최대 30일」.
 * - 쓰임 횟수·오류(server/app/pulse.ts, 화면은 src/pulse.ts·src/errors.ts): 편집기에서 한 일의 이름과 브라우저 종류(크롬-윈도우 같은 이름)를
 *   날짜마다 횟수로만 센다(400일). 편집기에서 오류가 나면 오류 글·자취·쪽 주소(물음표 뒤 제외)·브라우저 종류·판 번호(30일, 200가지까지).
 *   계정·IP·브라우저 원문은 저장하지 않는다(칸이 없다). 남용 막기로 IP 를 메모리에 1분까지. 같은 저장소라 하루 백업에 들어간다.
 * - 문의(server/app/inbox.ts, 2026-11-19): 종류·내용·답장 받을 메일(적었을 때만)·화면 언어·보낸 쪽 주소(물음표 뒤 제외). 계정·IP 는 함께 저장하지 않는다.
 *   3년 두고 지운다. 남용 막기로 IP 를 메모리에 10분까지. 같은 저장소라 하루 백업에 들어간다. 운영자에게 가는 알림 메일에는 번호·종류만.
 *   답은 회사 메일(vmelabs@outlook.com — Microsoft Outlook)에서 보낸다 → 위탁·국외 이전(Microsoft). 메일함의 답장도 3년 뒤 지운다(docs/operations.md).
 * - 바깥 회사: 브라우저 안 받아쓰기의 모델 파일만 Hugging Face 에서 직접 받는다. 실행 파일(onnxruntime)은 우리 서버에서 준다.
 */
export const PRIVACY: LegalDocs = {
  ko: {
    ...DOC_HEADS.privacy.ko,
    intro: '브이미랩스(이하 「회사」)는 ReelMotion(이하 「서비스」)을 운영하면서 개인정보 보호법에 따라 이용자의 개인정보를 보호합니다. 서비스는 로그인하지 않아도 쓸 수 있고, 영상을 회사 서버로 올리지 않으며, 받아 적은 소리를 저장하지 않습니다.',
    sections: [
      {
        title: '처리하는 정보',
        blocks: [
          {
            facts: [
              ['말소리', '회사 서버로 받아 적기를 쓰면 영상에서 뽑은 소리를 받습니다. 소리에는 목소리와 말한 내용이 들어 있습니다.'],
              ['접속 정보', '페이지와 받아쓰기 서버에 접속하면 통신을 위해 IP 주소와 브라우저 정보가 회사 서버에 전달됩니다.'],
              ['계정 정보', '구글로 로그인하면(선택) 구글 계정의 고유번호, 메일 주소, 이름을 받습니다.'],
              ['계정에 저장한 작업', '로그인하면 만든 작업(대본, 받아 적은 글, 그래픽, 스타일, 작은 미리보기 그림)을 계정에 저장합니다.'],
              ['말로 고치기·AI 그래픽 찾기에 보낸 글', '말로 고치기를 쓰면 적은 말과 작업의 글(대본, 그래픽의 글·시간, 스타일)을, 「AI로 강조할 순간 찾기」를 누르면 대본의 문장과 그 시간을 받습니다.'],
              ['커넥터로 보낸 대본', 'Claude·ChatGPT 에 ReelMotion 커넥터를 더해 쓰면, 그 서비스가 보내는 대본·스타일·말한 언어를 받습니다. 누가 보냈는지(계정·이름)는 받지 않습니다.'],
              ['내보내기 횟수', '내보내기 전에 요금제 한도를 확인하려고 영상 길이(초)를 받습니다. 로그인했으면 달마다 다 만든 내보내기 수를 계정에 셉니다. 영상과 그 내용은 받지 않습니다.'],
              ['쓰임 횟수와 오류', '서비스가 얼마나 쓰이는지와 고장을 알려고, 편집기에서 한 일의 이름(편집기 열기, 영상 넣기, 내보내기 시작·끝·실패 등)과 브라우저 종류(예: 크롬·윈도우)를 받아 날짜마다 횟수만 셉니다. 편집기에서 오류가 나면 오류 글(프로그램이 만든 글로, 드물게 파일 이름 같은 값이 섞일 수 있습니다), 오류가 난 코드의 위치, 쪽 주소(물음표 뒤는 빼고), 브라우저 종류, 판 번호를 받습니다. 누가 했는지(계정·IP 주소)는 함께 저장하지 않습니다.'],
              ['문의', '문의하기 쪽에서 보내면 문의 종류와 내용, 적었으면 답장 받을 메일 주소, 화면 언어, 어느 쪽에서 왔는지(쪽 주소, 물음표 뒤는 빼고)를 받습니다. 누가 보냈는지(계정·IP 주소)는 함께 저장하지 않습니다.'],
            ],
          },
          '영상 파일과 내보낸 결과물은 받지 않습니다. 영상은 이용자의 기기 안에서만 처리합니다. 로그인하지 않으면, 문의하기에 답장 받을 메일을 적을 때 말고는 이름·메일 같은 정보도 받지 않습니다.',
          '그래픽이 말하는 사람의 얼굴을 가리지 않도록, 편집기는 이용자의 기기 안에서 영상 장면의 얼굴이 화면 어디에 있는지만 찾습니다. 누구인지 알아보지 않으며, 찾은 자리는 회사로 보내거나 저장하지 않고 편집기를 닫으면 사라집니다. 작업에는 그래픽이 놓인 쪽(왼쪽·오른쪽)만 남습니다.',
        ],
      },
      {
        title: '처리 목적',
        blocks: [
          {
            list: [
              '말소리: 받아 적은 글과 낱말별 시간을 이용자에게 돌려주는 데만 씁니다. 학습이나 다른 목적에 쓰지 않습니다.',
              '접속 정보: 페이지와 받아쓰기 결과를 이용자에게 보내는 데만 씁니다.',
              '계정 정보: 로그인을 유지하고, 계정에 저장한 작업을 보여 주고, 요금제를 관리하고, 문의에 답하는 데 씁니다.',
              '계정에 저장한 작업: 이용자가 여러 기기에서 작업을 열 수 있게 하는 데만 씁니다.',
              '말로 고치기·AI 그래픽 찾기에 보낸 글: 회사 서버의 AI 가 그래픽 고치기를 만들거나 그래픽을 더할 순간을 고르는 데만 씁니다. 학습에 쓰지 않습니다.',
              '커넥터로 보낸 대본: 그래픽 계획을 만들어 돌려주고, 「편집기로 열기」를 하면 편집기에서 열 링크를 만드는 데만 씁니다. 학습에 쓰지 않습니다.',
              '내보내기 횟수: 요금제의 영상 길이·한 달 횟수 한도를 지키고 「내 계정」에 보여 주는 데만 씁니다.',
              '쓰임 횟수와 오류: 서비스가 얼마나 쓰이는지, 어느 브라우저에서 무엇이 안 되는지 알아 고치는 데만 씁니다.',
              '문의: 문의를 읽고 답하고, 알려 준 고장을 고치는 데만 씁니다.',
            ],
          },
        ],
      },
      {
        title: '보유 기간과 파기',
        blocks: [
          {
            list: [
              '말소리: 받아 적는 동안 서버의 메모리에만 두고, 결과를 돌려주면 바로 지웁니다. 디스크에 저장하지 않습니다.',
              '접속 정보: 접속 기록을 남기지 않습니다. 서버 오류를 고치기 위한 기록에도 IP 주소와 말소리를 남기지 않습니다.',
              '계정 정보, 계정에 저장한 작업, 내보내기 횟수: 탈퇴할 때까지 보관하고, 탈퇴하면 바로 지웁니다. 작업 하나는 「내 작업」에서 지우면 바로 지웁니다. 한도를 확인할 때 받은 영상 길이는 저장하지 않습니다.',
              '로그인 기록: 로그인 유지 기간(30일, 쓸 때마다 다시 30일)이 끝나거나 로그아웃하면 지웁니다.',
              '커넥터로 보낸 대본: 계획만 볼 때는 돌려주면 바로 지웁니다. 「편집기로 열기」로 링크를 만들면 그 대본과 스타일을 최대 7일 보관한 뒤 지우며, 백업에는 넣지 않습니다. 그동안 링크를 아는 사람은 그 대본을 열 수 있습니다. 남용을 막으려고 링크를 만든 횟수를 셀 때, 요청을 보낸 서버(보통 Claude·ChatGPT 의 서버)의 IP 주소를 서버 메모리에 1분까지 둡니다.',
              '백업: 장애에 대비해 계정 정보, 계정에 저장한 작업, 내보내기 횟수, 쓰임 횟수와 오류, 문의를 하루 한 번 백업하고, 30일이 지난 백업은 지웁니다. 그래서 탈퇴하거나 지운 정보도 백업에는 최대 30일 남을 수 있습니다.',
              '말로 고치기·AI 그래픽 찾기에 보낸 글: 답을 돌려주면 바로 지웁니다. 로그인하지 않았으면 남용을 막으려고 요청 횟수를 셀 때 IP 주소를 서버 메모리에 10분까지 둡니다.',
              '쓰임 횟수와 오류: 날짜별 횟수는 400일, 오류는 30일이 지나면 지웁니다. 남용을 막으려고 요청 횟수를 셀 때 보낸 곳의 IP 주소를 서버 메모리에 1분까지 둡니다.',
              '문의: 받은 날부터 3년 보관한 뒤 지웁니다(전자상거래 등에서의 소비자보호에 관한 법률의 소비자 불만·분쟁 처리 기록). 메일로 주고받은 답장도 회사 메일함에서 같은 기간이 지나면 지웁니다. 남용을 막으려고 보낸 횟수를 셀 때 IP 주소를 서버 메모리에 10분까지 둡니다.',
            ],
          },
        ],
      },
      {
        title: '이용자 기기에 저장하는 것',
        blocks: [
          '로그인하면 로그인 유지 쿠키 하나(30일)를 씁니다. 광고 쿠키나 이용자를 알아보는 분석·추적 코드는 없습니다(쓰임 횟수는 누구인지 없이 셉니다).',
          {
            list: [
              '만든 작업: 대본, 받아 적은 글, 그래픽, 스타일, 작은 미리보기 그림과 넣은 영상 파일을 브라우저 저장소(IndexedDB)에 저장해 「내 작업」에서 다시 열 수 있게 합니다. 회사로 보내지 않으며, 「내 작업」에서 지우면 함께 지워집니다.',
              '고른 화면 언어와 닫은 공지: 브라우저 저장소(localStorage)에 기억합니다. 회사로 보내지 않습니다.',
              '브라우저 안 받아쓰기를 쓰면: 받아쓰기 모델 파일을 브라우저 캐시에 저장해 다음에는 다시 내려받지 않습니다.',
              '편집기 화면 파일: 편집기를 열면 그 화면 파일(프로그램과 글꼴)을 브라우저 저장소에 받아 두어 인터넷이 없어도 편집기가 열립니다. 이용자의 정보는 들어 있지 않습니다.',
              '얼굴 자리 찾기 파일: 가로 영상에 그래픽을 놓을 때 얼굴 자리를 찾는 모델과 실행 파일을 회사 사이트에서 받아 브라우저 저장소와 캐시에 둡니다. 이용자의 정보는 들어 있지 않습니다.',
            ],
          },
          '브라우저 설정에서 이 사이트의 데이터를 지우면 함께 지워집니다.',
        ],
      },
      {
        title: '제3자 제공과 처리 위탁',
        blocks: [
          '개인정보를 제3자에게 제공하지 않습니다. 서버는 회사가 직접 운영하며, 처리를 다른 회사에 맡기는 것은 문의에 메일로 답할 때 하나뿐입니다.',
          {
            facts: [
              ['맡는 회사', 'Microsoft Corporation(회사의 메일 계정 Outlook)'],
              ['맡기는 일', '문의에 메일로 답하고, 주고받은 메일을 보관합니다. 운영자에게 가는 문의 알림 메일에는 문의 번호와 종류만 넣고, 내용과 메일 주소는 넣지 않습니다.'],
            ],
          },
          '구글 로그인은 이용자가 Google LLC(미국)의 로그인 화면에서 직접 하며, 회사는 구글에서 고유번호·메일·이름만 받습니다.',
          'Claude(Anthropic)·ChatGPT(OpenAI)에 커넥터를 더해 쓰는 것은 이용자가 고른 그 서비스와 이용자 사이의 일이며, 그 대화는 각 회사의 방침을 따릅니다. 회사는 그 서비스의 요청에 답할 뿐, 이용자의 정보를 먼저 보내지 않습니다.',
        ],
      },
      {
        title: '국외 이전',
        blocks: [
          '개인정보가 나라 밖으로 가는 것은 아래 두 경우뿐입니다. 첫째는 브라우저 안 받아쓰기를 쓸 때(직접 고르거나, 받아쓰기 서버를 쓸 수 없어 편집기가 이 방식을 고른 때)입니다. 이용자의 브라우저가 받아쓰기 모델 파일을 아래 회사의 서버에서 직접 내려받습니다. 말소리와 영상은 보내지 않습니다.',
          {
            facts: [
              ['받는 자', 'Hugging Face, Inc.(미국)'],
              ['항목', '파일을 내려받는 데 필요한 IP 주소와 브라우저 정보'],
              ['때와 방법', '브라우저 안 받아쓰기를 처음 쓸 때 인터넷으로'],
              ['목적', '받아쓰기 모델 파일 전송'],
              ['보유 기간', 'Hugging Face 의 개인정보 처리방침을 따릅니다'],
              ['거부 방법', '브라우저 안 받아쓰기를 쓰지 않고, 회사 서버로 받아 적거나 말을 직접 입력합니다'],
            ],
          },
          '둘째는 문의에 메일로 답할 때입니다. 회사의 메일 계정(Outlook)은 Microsoft 의 서버에 있습니다.',
          {
            facts: [
              ['받는 자', 'Microsoft Corporation(미국)'],
              ['항목', '답장 받을 메일 주소, 답장과 그 안에 인용한 문의 내용'],
              ['때와 방법', '문의에 답장을 보낼 때 인터넷으로'],
              ['목적', '문의 답장 보내기와 주고받은 메일 보관'],
              ['보유 기간', '회사 메일함에서 3년 보관한 뒤 지웁니다'],
              ['거부 방법', '답장 받을 메일을 적지 않고 보냅니다(이때는 답장을 받을 수 없습니다)'],
            ],
          },
        ],
      },
      {
        title: '이용자의 권리',
        blocks: [
          '이용자는 개인정보의 열람, 정정, 삭제, 처리정지를 요구할 수 있습니다. 계정 정보는 「내 계정」에서 볼 수 있고, 탈퇴하면 바로 지울 수 있습니다. 그 밖의 요청은 {contact} 로 메일을 보내거나 {inquiry}에서 하시면 지체 없이 답합니다.',
        ],
      },
      { title: '만 14세 미만 아동', blocks: ['만 14세 미만 아동은 로그인(계정 만들기)을 할 수 없습니다. 로그인 없이 쓸 때는 이름·메일 같은 정보를 받지 않습니다. 만 14세 미만 아동은 문의하기에 메일 주소를 적지 말고, 보호자가 대신 문의해 주세요.'] },
      {
        title: '안전성 확보 조치',
        blocks: [
          {
            list: [
              '통신 암호화: 회사와 이용자 사이의 통신을 HTTPS 로 암호화합니다.',
              '저장하지 않기: 말소리를 디스크에 쓰지 않고 메모리에서만 처리합니다.',
              '접근 제한: 서버에 접근할 수 있는 사람을 운영자로 한정합니다.',
              '로그인 보호: 로그인 쿠키는 다른 사이트에서 쓸 수 없게 하고(HttpOnly·SameSite), 서버에는 그 값을 해시로만 둡니다.',
            ],
          },
        ],
      },
      { title: '개인정보 보호책임자', blocks: ['김우진(브이미랩스 대표) · {contact}'] },
      { title: '권익침해 구제방법', blocks: ['개인정보 침해로 도움이 필요하면 아래 기관에 문의할 수 있습니다.', 'agencies'] },
      { title: '변경 고지', blocks: ['이 방침이 바뀌면 시행 7일 전에 이 페이지에 알립니다. 이용자에게 불리하게 바뀌면 시행 30일 전에 알립니다.'] },
    ],
  },
  en: {
    ...DOC_HEADS.privacy.en,
    intro: '브이미랩스 (the “Company”) runs ReelMotion (the “Service”) and protects your personal information under Korea’s Personal Information Protection Act. You can use the Service without logging in. It never uploads your videos to our servers and does not keep the sound it transcribes.',
    sections: [
      {
        title: 'What we process',
        blocks: [
          {
            facts: [
              ['Speech audio', 'When you transcribe on our server, we receive the sound taken from your video. It contains voices and what is said.'],
              ['Connection information', 'When you open our pages or use the speech server, your IP address and browser information reach our servers as part of the connection.'],
              ['Account information', 'If you log in with Google (optional), we receive your Google account ID, email address and name.'],
              ['Projects kept in your account', 'When you are logged in, the projects you make (script, transcript, graphics, style and a small preview image) are kept in your account.'],
              ['Text sent for chat editing and AI moments', 'When you use chat editing, we receive what you type and your project text (script, graphic text and timing, style). When you press “Find more moments with AI”, we receive the sentences of your script and their timing.'],
              ['Scripts sent through the connector', 'If you add the ReelMotion connector to Claude or ChatGPT, we receive the script, style and spoken language that service sends. We do not receive who sent it (no account or name).'],
              ['Export count', 'Before an export, we receive the length of the video (in seconds) to check your plan’s limits. If you are logged in, we count the exports you finish each month in your account. We do not receive the video or what is in it.'],
              ['Usage counts and errors', 'To see how much the Service is used and what breaks, we receive the name of what you did in the editor (opening the editor, adding a video, starting, finishing or failing an export, and so on) and the kind of browser (for example Chrome on Windows), and only count them per day. If the editor hits an error, we receive the error text (written by the program; on rare occasions it may include a value such as a file name), where in our code it happened, the page address (without anything after the question mark), the kind of browser and the build number. We do not store who did it (no account or IP address).'],
              ['Messages', 'When you send a message from the Contact page, we receive its type and text, the email address for our reply if you give one, the language of the page and which page you came from (the page address, without anything after the question mark). We do not store who sent it (no account or IP address).'],
            ],
          },
          'We do not receive video files or what you export. Videos are processed only on your device. If you do not log in, we do not receive information such as your name or email address either, except an email address you give on the Contact page for our reply.',
          'So that graphics do not cover the speaker’s face, the editor finds, on your device, only where a face is on the screen in your video’s frames. It does not recognize who anyone is. The face positions are not sent to us or saved, and they are gone when you close the editor. Your project keeps only the side each graphic sits on (left or right).',
        ],
      },
      {
        title: 'Why we process it',
        blocks: [
          {
            list: [
              'Speech audio: only to send you back the transcript and the timing of each word. It is not used for training or anything else.',
              'Connection information: only to deliver pages and transcripts to you.',
              'Account information: to keep you logged in, show you the projects kept in your account, manage your plan and answer your questions.',
              'Projects kept in your account: only to let you open your projects on any of your devices.',
              'Text sent for chat editing and AI moments: only for the AI on our server to make graphic edits or pick moments for new graphics. It is not used for training.',
              'Scripts sent through the connector: only to make the graphics plan we send back and, when you ask to open it in the editor, the link that opens it. They are not used for training.',
              'Export count: only to apply your plan’s limits on video length and exports per month, and to show them in My account.',
              'Usage counts and errors: only to know how much the Service is used and what does not work in which browser, so we can fix it.',
              'Messages: only to read and answer them, and to fix the problems you report.',
            ],
          },
        ],
      },
      {
        title: 'How long we keep it',
        blocks: [
          {
            list: [
              'Speech audio: held only in the server’s memory while it is transcribed, and deleted as soon as the result is returned. It is never written to disk.',
              'Connection information: we keep no access logs. Records we keep to fix server errors contain no IP addresses or audio either.',
              'Account information, projects kept in your account and your export count: kept until you delete your account, then deleted right away. Deleting a project in My projects deletes it right away. The video length we receive to check limits is not kept.',
              'Login records: deleted when the login period ends (30 days, renewed as you use the Service) or when you log out.',
              'Scripts sent through the connector: when you only preview a plan, deleted as soon as the plan is returned. When a link to the editor is made, the script and style are kept for up to 7 days and then deleted, and they are not included in backups. During that time anyone who has the link can open the script. To prevent abuse, the IP address of the server that sent the request (normally a Claude or ChatGPT server) is held in server memory for up to 1 minute to count how many links were made.',
              'Backups: to recover from failures, we back up account information, projects kept in accounts, export counts, usage counts and errors, and messages once a day, and delete backups older than 30 days. Information you delete, including a closed account, may therefore remain in a backup for up to 30 days.',
              'Text sent for chat editing and AI moments: deleted as soon as the answer is returned. If you are not logged in, your IP address is held in server memory for up to 10 minutes to count requests and prevent abuse.',
              'Usage counts and errors: daily counts are deleted after 400 days and errors after 30 days. To prevent abuse, the IP address a request comes from is held in server memory for up to 1 minute while requests are counted.',
              'Messages: kept for 3 years from the day we receive them and then deleted (records of consumer complaints and disputes under the Korean Act on Consumer Protection in Electronic Commerce). The replies we exchange by email are also deleted from our mailbox after the same period. To prevent abuse, your IP address is held in server memory for up to 10 minutes to count how many messages are sent.',
            ],
          },
        ],
      },
      {
        title: 'What is stored on your device',
        blocks: [
          'If you log in, we use a single login cookie (30 days). There are no advertising cookies and no analytics or tracking code that recognizes you (usage is counted without knowing who).',
          {
            list: [
              'Your projects: the script, transcript, graphics, style, a small preview image and the video you added are saved in your browser’s storage (IndexedDB) so you can reopen them from My projects. They are not sent to us, and deleting a project in My projects removes them.',
              'Your language choice and the notices you dismissed: remembered in your browser’s local storage. They are not sent to us.',
              'If you transcribe in your browser: the speech model files are saved in your browser’s cache so they are not downloaded again.',
              'Editor files: when you open the editor, its files (the program and fonts) are saved in your browser’s storage so the editor opens without the internet. They contain none of your information.',
              'Face-finding files: when graphics are placed on a landscape video, the model and program that find face positions are downloaded from our site and kept in your browser’s storage and cache. They contain none of your information.',
            ],
          },
          'Clearing this site’s data in your browser settings removes them.',
        ],
      },
      {
        title: 'Sharing and outsourcing',
        blocks: [
          'We do not provide personal information to third parties. We run our servers ourselves, and the only processing we outsource to another company is answering messages by email.',
          {
            facts: [
              ['Company', 'Microsoft Corporation (our Outlook email account)'],
              ['Work outsourced', 'Sending our email replies to messages and keeping the emails exchanged. The alert email our operator receives about a new message contains only its number and type, not its text or your email address.'],
            ],
          },
          'Google login happens on the login screen of Google LLC (United States), directly between you and Google; we only receive your Google account ID, email address and name from Google.',
          'Using the connector in Claude (Anthropic) or ChatGPT (OpenAI) is between you and the service you chose, and that conversation follows that company’s policy. We only answer the service’s requests; we do not send your information to it on our own.',
        ],
      },
      {
        title: 'Transfers outside Korea',
        blocks: [
          'Personal information leaves Korea only in the two cases below. The first is when transcription runs in your browser (when you choose it, or when the editor uses it because the speech server is unavailable). Your browser downloads the speech model files directly from the servers of the company below. Your audio and video are not sent.',
          {
            facts: [
              ['Recipient', 'Hugging Face, Inc. (United States)'],
              ['Information', 'The IP address and browser information needed to download the files'],
              ['When and how', 'Over the internet, the first time in-browser transcription is used'],
              ['Purpose', 'Delivering the speech model files'],
              ['Retention', 'Under Hugging Face’s privacy policy'],
              ['How to refuse', 'Do not use in-browser transcription: transcribe on our server or type the words yourself'],
            ],
          },
          'The second is when we answer a message by email. Our email account (Outlook) is on Microsoft’s servers.',
          {
            facts: [
              ['Recipient', 'Microsoft Corporation (United States)'],
              ['Information', 'The email address for our reply, and our reply including any part of your message it quotes'],
              ['When and how', 'Over the internet, when we send a reply'],
              ['Purpose', 'Sending replies to messages and keeping the emails exchanged'],
              ['Retention', 'Kept in our mailbox for 3 years and then deleted'],
              ['How to refuse', 'Send your message without an email address (we then cannot reply)'],
            ],
          },
        ],
      },
      {
        title: 'Your rights',
        blocks: [
          'You can ask to see, correct, delete or stop the processing of your personal information. You can see your account information in My account and delete it at once by deleting your account. For anything else, email {contact} or use {inquiry}, and we will answer without delay.',
        ],
      },
      { title: 'Children under 14', blocks: ['Children under 14 cannot log in or create an account. When the Service is used without logging in, we do not receive information such as names or email addresses. Children under 14 should not give an email address on the Contact page; a parent or guardian can contact us instead.'] },
      {
        title: 'How we protect it',
        blocks: [
          {
            list: [
              'Encryption: connections between you and us are encrypted with HTTPS.',
              'No storage: audio is processed in memory and never written to disk.',
              'Limited access: only the operator can access the servers.',
              'Login protection: the login cookie cannot be used by other websites (HttpOnly, SameSite), and our server keeps only a hash of it.',
            ],
          },
        ],
      },
      { title: 'Privacy officer', blocks: ['김우진 (Representative, 브이미랩스) · {contact}'] },
      { title: 'Getting help', blocks: ['If you need help with a privacy violation, you can contact the Korean agencies below.', 'agencies'] },
      { title: 'Changes to this policy', blocks: ['If this policy changes, we will post the change on this page 7 days before it takes effect, or 30 days before if it is unfavorable to you.'] },
    ],
  },
  ja: {
    ...DOC_HEADS.privacy.ja,
    intro: '브이미랩스(以下「当社」)は、ReelMotion(以下「本サービス」)の運営にあたり、韓国の個人情報保護法に従って利用者の個人情報を保護します。本サービスはログインしなくても使え、動画を当社のサーバーにアップロードせず、文字起こしした音声を保存しません。',
    sections: [
      {
        title: '扱う情報',
        blocks: [
          {
            facts: [
              ['音声', '当社サーバーで文字起こしをすると、動画から取り出した音声を受け取ります。音声には声と話の内容が含まれます。'],
              ['接続情報', 'ページや文字起こしサーバーに接続すると、通信のために IP アドレスとブラウザ情報が当社サーバーに届きます。'],
              ['アカウント情報', 'Google でログインする場合(任意)、Google アカウントの固有番号、メールアドレス、名前を受け取ります。'],
              ['アカウントに保存したプロジェクト', 'ログインすると、作ったプロジェクト(台本、文字起こし、グラフィックス、スタイル、小さなプレビュー画像)をアカウントに保存します。'],
              ['話して直す・AIで見せ場を探すに送った文', '話して直すを使うと、書いた言葉とプロジェクトの文字(台本、グラフィックスの文字・時間、スタイル)を、「AIで見せ場を探す」を押すと、台本の文とその時間を受け取ります。'],
              ['コネクターで送られた台本', 'Claude・ChatGPT に ReelMotion のコネクターを追加して使う場合、そのサービスが送る台本・スタイル・話している言語を受け取ります。誰が送ったか(アカウント・名前)は受け取りません。'],
              ['書き出し回数', '書き出しの前に、プランの上限を確かめるため動画の長さ(秒)を受け取ります。ログインしている場合は、月ごとに書き出しを終えた回数をアカウントで数えます。動画とその内容は受け取りません。'],
              ['利用回数とエラー', '本サービスがどれだけ使われ、どこで不具合が起きているかを知るため、エディターで行ったことの名前(エディターを開く、動画を追加する、書き出しの開始・完了・失敗など)とブラウザの種類(例: Windows の Chrome)を受け取り、日ごとの回数だけを数えます。エディターでエラーが起きた場合は、エラーの文(プログラムが作った文で、まれにファイル名のような値が含まれることがあります)、エラーが起きたコードの場所、ページのアドレス(? 以降は除く)、ブラウザの種類、ビルド番号を受け取ります。誰が行ったか(アカウント・IP アドレス)は一緒に保存しません。'],
              ['お問い合わせ', 'お問い合わせページから送ると、お問い合わせの種類と内容、書いた場合は返信先のメールアドレス、画面の言語、どのページから来たか(ページのアドレス、? 以降は除く)を受け取ります。誰が送ったか(アカウント・IP アドレス)は一緒に保存しません。'],
            ],
          },
          '動画ファイルと書き出した作成物は受け取りません。動画はお使いの端末の中だけで処理します。ログインしなければ、お問い合わせで返信先のメールを書く場合を除き、氏名やメールアドレスなどの情報も受け取りません。',
          'グラフィックが話している人の顔を隠さないように、エディターはお使いの端末の中で、動画の場面のどこに顔があるかだけを探します。誰なのかは識別しません。見つけた位置は当社に送らず保存もせず、エディターを閉じると消えます。作品には、グラフィックを置く側(左・右)だけが残ります。',
        ],
      },
      {
        title: '利用目的',
        blocks: [
          {
            list: [
              '音声: 文字起こしの結果と単語ごとの時間をお返しするためだけに使います。学習やほかの目的には使いません。',
              '接続情報: ページと文字起こしの結果をお届けするためだけに使います。',
              'アカウント情報: ログインを保ち、アカウントに保存したプロジェクトを表示し、プランを管理し、お問い合わせに答えるために使います。',
              'アカウントに保存したプロジェクト: 複数の端末でプロジェクトを開けるようにするためだけに使います。',
              '話して直す・AIで見せ場を探すに送った文: 当社サーバーの AI がグラフィックスの変更を作るか、グラフィックスを追加する場面を選ぶためだけに使います。学習には使いません。',
              'コネクターで送られた台本: グラフィックの計画を作ってお返しし、「エディターで開く」を行った場合はエディターで開くリンクを作るためだけに使います。学習には使いません。',
              '書き出し回数: プランの動画の長さ・月の回数の上限を守り、「マイアカウント」に表示するためだけに使います。',
              '利用回数とエラー: 本サービスがどれだけ使われ、どのブラウザで何が動かないかを知って直すためだけに使います。',
              'お問い合わせ: お問い合わせを読んで返信し、知らせていただいた不具合を直すためだけに使います。',
            ],
          },
        ],
      },
      {
        title: '保存期間と削除',
        blocks: [
          {
            list: [
              '音声: 文字起こしの間だけサーバーのメモリに置き、結果をお返ししたらすぐに消します。ディスクには保存しません。',
              '接続情報: アクセス記録を残しません。サーバーの障害を直すための記録にも、IP アドレスと音声は残しません。',
              'アカウント情報、アカウントに保存したプロジェクト、書き出し回数: 退会するまで保管し、退会するとすぐに消します。プロジェクトは「マイプロジェクト」で削除するとすぐに消します。上限の確認で受け取った動画の長さは保存しません。',
              'ログインの記録: ログインの保持期間(30日、使うたびに延長)が終わるか、ログアウトすると消します。',
              'コネクターで送られた台本: 計画を見るだけの場合は、お返ししたらすぐに消します。「エディターで開く」でリンクを作った場合は、その台本とスタイルを最大7日間保管してから消し、バックアップには含めません。その間、リンクを知っている人はその台本を開けます。不正利用を防ぐため、リンクを作った回数を数えるあいだ、要求を送ってきたサーバー(通常は Claude・ChatGPT のサーバー)の IP アドレスをサーバーのメモリに最大1分置きます。',
              'バックアップ: 障害に備えて、アカウント情報・アカウントに保存したプロジェクト・書き出し回数・利用回数とエラー・お問い合わせを1日1回バックアップし、30日を過ぎたバックアップは削除します。そのため、退会や削除をした情報もバックアップには最大30日残ることがあります。',
              '話して直す・AIで見せ場を探すに送った文: 答えをお返ししたらすぐに消します。ログインしていない場合は、不正利用を防ぐため、回数を数えるあいだ IP アドレスをサーバーのメモリに最大10分置きます。',
              '利用回数とエラー: 日ごとの回数は400日、エラーは30日を過ぎると削除します。不正利用を防ぐため、回数を数えるあいだ送信元の IP アドレスをサーバーのメモリに最大1分置きます。',
              'お問い合わせ: 受け取った日から3年保管したあと削除します(韓国の電子商取引等における消費者保護に関する法律が定める、消費者の不満・紛争処理の記録)。メールでやり取りした返信も、同じ期間がたつと当社のメールボックスから削除します。不正利用を防ぐため、送った回数を数えるあいだ IP アドレスをサーバーのメモリに最大10分置きます。',
            ],
          },
        ],
      },
      {
        title: '端末に保存するもの',
        blocks: [
          'ログインすると、ログインを保つ Cookie を1つ(30日)使います。広告の Cookie や、利用者を識別する分析・追跡コードはありません(利用回数は誰かを知らずに数えます)。',
          {
            list: [
              '作ったプロジェクト: 台本、文字起こし、グラフィックス、スタイル、小さなプレビュー画像と入れた動画ファイルを、ブラウザのストレージ(IndexedDB)に保存し、「マイプロジェクト」から開き直せるようにします。当社には送らず、「マイプロジェクト」で削除するとあわせて消えます。',
              '選んだ表示言語と閉じたお知らせ: ブラウザのストレージ(localStorage)に記憶します。当社には送りません。',
              'ブラウザ内の文字起こしを使う場合: 文字起こしモデルのファイルをブラウザのキャッシュに保存し、次からは再ダウンロードしません。',
              'エディターの画面ファイル: エディターを開くと、その画面ファイル(プログラムとフォント)をブラウザのストレージに保存し、インターネットがなくてもエディターを開けるようにします。利用者の情報は含まれません。',
              '顔の位置を探すファイル: 横長の動画にグラフィックを置くとき、顔の位置を探すモデルと実行ファイルを当社サイトから受け取り、ブラウザのストレージとキャッシュに置きます。利用者の情報は含まれません。',
            ],
          },
          'ブラウザの設定でこのサイトのデータを消すと、あわせて消えます。',
        ],
      },
      {
        title: '第三者提供と委託',
        blocks: [
          '個人情報を第三者に提供しません。サーバーは当社が自ら運営しており、処理をほかの会社に委託するのは、お問い合わせにメールで返信するときだけです。',
          {
            facts: [
              ['委託先', 'Microsoft Corporation(当社のメールアカウント Outlook)'],
              ['委託する業務', 'お問い合わせへのメールでの返信と、やり取りしたメールの保管。運営者に届く新着お問い合わせの通知メールには番号と種類だけを入れ、内容とメールアドレスは入れません。'],
            ],
          },
          'Google ログインは、利用者が Google LLC(米国)のログイン画面で直接行い、当社は Google から固有番号・メールアドレス・名前だけを受け取ります。',
          'Claude(Anthropic)・ChatGPT(OpenAI)でコネクターを使うことは、利用者が選んだそのサービスと利用者の間のことで、その会話は各社のポリシーに従います。当社はそのサービスからの要求に答えるだけで、利用者の情報を自分から送ることはありません。',
        ],
      },
      {
        title: '国外移転',
        blocks: [
          '個人情報が国外に移るのは、次の2つの場合だけです。1つ目は、ブラウザ内の文字起こしを使う場合(ご自身で選んだとき、または文字起こしサーバーが使えずエディターがこの方式を選んだとき)です。お使いのブラウザが、文字起こしモデルのファイルを下記の会社のサーバーから直接ダウンロードします。音声と動画は送りません。',
          {
            facts: [
              ['受け取る者', 'Hugging Face, Inc.(米国)'],
              ['項目', 'ファイルのダウンロードに必要な IP アドレスとブラウザ情報'],
              ['時期と方法', 'ブラウザ内の文字起こしを初めて使うときに、インターネットで'],
              ['目的', '文字起こしモデルのファイルの送信'],
              ['保存期間', 'Hugging Face のプライバシーポリシーに従います'],
              ['拒否する方法', 'ブラウザ内の文字起こしを使わず、当社サーバーで文字起こしするか、言葉を直接入力してください'],
            ],
          },
          '2つ目は、お問い合わせにメールで返信するときです。当社のメールアカウント(Outlook)は Microsoft のサーバーにあります。',
          {
            facts: [
              ['受け取る者', 'Microsoft Corporation(米国)'],
              ['項目', '返信先のメールアドレス、返信とその中で引用したお問い合わせの内容'],
              ['時期と方法', '返信を送るときに、インターネットで'],
              ['目的', 'お問い合わせへの返信と、やり取りしたメールの保管'],
              ['保存期間', '当社のメールボックスで3年保管したあと削除します'],
              ['拒否する方法', '返信先のメールを書かずに送ってください(この場合は返信を受け取れません)'],
            ],
          },
        ],
      },
      {
        title: '利用者の権利',
        blocks: [
          '利用者は、個人情報の閲覧・訂正・削除・処理停止を求めることができます。アカウント情報は「マイアカウント」で確認でき、退会するとすぐに消せます。そのほかのご依頼は、{contact} へのメールか{inquiry}からご連絡いただければすぐにお答えします。',
        ],
      },
      { title: '14歳未満の子ども', blocks: ['14歳未満の子どもはログイン(アカウント作成)できません。ログインせずに使う場合は、氏名やメールアドレスなどの情報を受け取りません。14歳未満の子どもはお問い合わせにメールアドレスを書かず、保護者が代わりにお問い合わせください。'] },
      {
        title: '安全管理措置',
        blocks: [
          {
            list: [
              '通信の暗号化: 当社と利用者の間の通信を HTTPS で暗号化します。',
              '保存しない: 音声をディスクに書き込まず、メモリの中だけで処理します。',
              'アクセス制限: サーバーにアクセスできるのは運営者に限ります。',
              'ログインの保護: ログイン用 Cookie はほかのサイトから使えないようにし(HttpOnly・SameSite)、サーバーにはその値をハッシュでのみ保存します。',
            ],
          },
        ],
      },
      { title: '個人情報保護責任者', blocks: ['김우진(브이미랩스 代表) · {contact}'] },
      { title: '権利侵害の救済', blocks: ['個人情報の侵害について助けが必要な場合は、下記の韓国の機関に問い合わせることができます。', 'agencies'] },
      { title: '変更のお知らせ', blocks: ['このポリシーを変更する場合は、施行の7日前にこのページでお知らせします。利用者に不利な変更は、施行の30日前にお知らせします。'] },
    ],
  },
}
