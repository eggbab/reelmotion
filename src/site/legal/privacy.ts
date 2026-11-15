import type { LegalDocs } from './types'

/**
 * 개인정보처리방침. 원문은 한국어이고 영어·일본어는 번역이다.
 * 글은 실제 동작과 같아야 한다(2026-11-15 확인). 동작을 바꾸면 이 글도 함께 고친다(AGENTS.md 규칙).
 * - 영상: 브라우저 안에서만 처리, 올리지 않는다(src/export).
 * - 소리: 16kHz 모노로 바꿔 받아쓰기 서버로 보낸다(src/speech/server.ts). 서버는 메모리에서만 다루고 결과를 돌려주면 버린다
 *   (server/asr — 디스크에 쓰지 않음, 접속 기록 끔).
 * - 접속 기록: 웹(deploy/Caddyfile)은 접속 기록을 쓰지 않고 오류 기록에서 IP·머리글을 지운다. 앞단(운영 PC 의 공개 주소)도
 *   접속 기록을 남기지 않게 둔다(docs/operations.md).
 * - 기기에 저장: 언어 선택(localStorage `reelmotion.lang`), 브라우저 안 받아쓰기 모델 파일(브라우저 캐시). 쿠키 없음.
 * - 바깥 회사: 브라우저 안 받아쓰기의 모델 파일만 Hugging Face 에서 직접 받는다. 실행 파일(onnxruntime)은 우리 서버에서 준다.
 */
export const PRIVACY: LegalDocs = {
  ko: {
    title: '개인정보처리방침',
    description: 'ReelMotion 개인정보처리방침 — 영상은 올리지 않고, 받아 적은 소리는 저장하지 않으며, 접속 기록을 남기지 않습니다. 처리하는 정보와 보유 기간, 이용자의 권리를 안내합니다.',
    intro: '브이미랩스(이하 「회사」)는 ReelMotion(이하 「서비스」)을 운영하면서 개인정보 보호법에 따라 이용자의 개인정보를 보호합니다. 서비스는 계정이 없고, 영상을 회사 서버로 올리지 않으며, 받아 적은 소리를 저장하지 않습니다.',
    sections: [
      {
        title: '처리하는 정보',
        blocks: [
          {
            facts: [
              ['말소리', '회사 서버로 받아 적기를 쓰면 영상에서 뽑은 소리를 받습니다. 소리에는 목소리와 말한 내용이 들어 있습니다.'],
              ['접속 정보', '페이지와 받아쓰기 서버에 접속하면 통신을 위해 IP 주소와 브라우저 정보가 회사 서버에 전달됩니다.'],
            ],
          },
          '영상 파일, 내보낸 결과물, 이름·이메일 같은 정보는 받지 않습니다. 영상은 이용자의 기기 안에서만 처리합니다.',
        ],
      },
      {
        title: '처리 목적',
        blocks: [
          {
            list: [
              '말소리: 받아 적은 글과 낱말별 시간을 이용자에게 돌려주는 데만 씁니다. 학습이나 다른 목적에 쓰지 않습니다.',
              '접속 정보: 페이지와 받아쓰기 결과를 이용자에게 보내는 데만 씁니다.',
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
            ],
          },
        ],
      },
      {
        title: '이용자 기기에 저장하는 것',
        blocks: [
          '쿠키를 쓰지 않습니다.',
          {
            list: [
              '고른 화면 언어: 브라우저 저장소(localStorage)에 기억합니다. 회사로 보내지 않습니다.',
              '브라우저 안 받아쓰기를 쓰면: 받아쓰기 모델 파일을 브라우저 캐시에 저장해 다음에는 다시 내려받지 않습니다.',
            ],
          },
          '브라우저 설정에서 이 사이트의 데이터를 지우면 함께 지워집니다.',
        ],
      },
      {
        title: '제3자 제공과 처리 위탁',
        blocks: ['개인정보를 제3자에게 제공하지 않고, 처리를 다른 회사에 맡기지 않습니다. 서버는 회사가 직접 운영합니다.'],
      },
      {
        title: '국외 이전',
        blocks: [
          '브라우저 안 받아쓰기를 쓸 때(직접 고르거나, 받아쓰기 서버를 쓸 수 없어 편집기가 이 방식을 고른 때)만 해당합니다. 이용자의 브라우저가 받아쓰기 모델 파일을 아래 회사의 서버에서 직접 내려받습니다. 말소리와 영상은 보내지 않습니다.',
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
        ],
      },
      {
        title: '이용자의 권리',
        blocks: [
          '이용자는 개인정보의 열람, 정정, 삭제, 처리정지를 요구할 수 있습니다. 회사는 영상, 말소리, 접속 기록을 보관하지 않아 보관 중인 정보가 없지만, {contact} 로 문의하시면 지체 없이 답합니다.',
        ],
      },
      { title: '만 14세 미만 아동', blocks: ['서비스는 계정을 받지 않으며 만 14세 미만 아동의 개인정보를 따로 수집하지 않습니다.'] },
      {
        title: '안전성 확보 조치',
        blocks: [
          {
            list: [
              '통신 암호화: 회사와 이용자 사이의 통신을 HTTPS 로 암호화합니다.',
              '저장하지 않기: 말소리를 디스크에 쓰지 않고 메모리에서만 처리합니다.',
              '접근 제한: 서버에 접근할 수 있는 사람을 운영자로 한정합니다.',
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
    title: 'Privacy Policy',
    description: 'ReelMotion Privacy Policy — videos are never uploaded, the sound we transcribe is not kept, and we keep no access logs. What we process, for how long, and your rights.',
    intro: '브이미랩스 (the “Company”) runs ReelMotion (the “Service”) and protects your personal information under Korea’s Personal Information Protection Act. The Service has no accounts, never uploads your videos to our servers and does not keep the sound it transcribes.',
    sections: [
      {
        title: 'What we process',
        blocks: [
          {
            facts: [
              ['Speech audio', 'When you transcribe on our server, we receive the sound taken from your video. It contains voices and what is said.'],
              ['Connection information', 'When you open our pages or use the speech server, your IP address and browser information reach our servers as part of the connection.'],
            ],
          },
          'We do not receive video files, what you export, or information such as names or email addresses. Videos are processed only on your device.',
        ],
      },
      {
        title: 'Why we process it',
        blocks: [
          {
            list: [
              'Speech audio: only to send you back the transcript and the timing of each word. It is not used for training or anything else.',
              'Connection information: only to deliver pages and transcripts to you.',
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
            ],
          },
        ],
      },
      {
        title: 'What is stored on your device',
        blocks: [
          'We do not use cookies.',
          {
            list: [
              'Your language choice: remembered in your browser’s local storage. It is not sent to us.',
              'If you transcribe in your browser: the speech model files are saved in your browser’s cache so they are not downloaded again.',
            ],
          },
          'Clearing this site’s data in your browser settings removes them.',
        ],
      },
      {
        title: 'Sharing and outsourcing',
        blocks: ['We do not provide personal information to third parties or outsource its processing to other companies. We run our servers ourselves.'],
      },
      {
        title: 'Transfers outside Korea',
        blocks: [
          'This applies only when transcription runs in your browser (when you choose it, or when the editor uses it because the speech server is unavailable). Your browser downloads the speech model files directly from the servers of the company below. Your audio and video are not sent.',
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
        ],
      },
      {
        title: 'Your rights',
        blocks: [
          'You can ask to see, correct, delete or stop the processing of your personal information. We keep no videos, audio or access logs, so we hold nothing about you, but we will answer any request sent to {contact} without delay.',
        ],
      },
      { title: 'Children under 14', blocks: ['The Service takes no accounts and does not separately collect personal information from children under 14.'] },
      {
        title: 'How we protect it',
        blocks: [
          {
            list: [
              'Encryption: connections between you and us are encrypted with HTTPS.',
              'No storage: audio is processed in memory and never written to disk.',
              'Limited access: only the operator can access the servers.',
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
    title: 'プライバシーポリシー',
    description: 'ReelMotion プライバシーポリシー — 動画はアップロードせず、文字起こしした音声は保存せず、アクセス記録も残しません。扱う情報、保存期間、利用者の権利をご案内します。',
    intro: '브이미랩스(以下「当社」)は、ReelMotion(以下「本サービス」)の運営にあたり、韓国の個人情報保護法に従って利用者の個人情報を保護します。本サービスにはアカウントがなく、動画を当社のサーバーにアップロードせず、文字起こしした音声を保存しません。',
    sections: [
      {
        title: '扱う情報',
        blocks: [
          {
            facts: [
              ['音声', '当社サーバーで文字起こしをすると、動画から取り出した音声を受け取ります。音声には声と話の内容が含まれます。'],
              ['接続情報', 'ページや文字起こしサーバーに接続すると、通信のために IP アドレスとブラウザ情報が当社サーバーに届きます。'],
            ],
          },
          '動画ファイル、書き出した作成物、氏名やメールアドレスなどの情報は受け取りません。動画はお使いの端末の中だけで処理します。',
        ],
      },
      {
        title: '利用目的',
        blocks: [
          {
            list: [
              '音声: 文字起こしの結果と単語ごとの時間をお返しするためだけに使います。学習やほかの目的には使いません。',
              '接続情報: ページと文字起こしの結果をお届けするためだけに使います。',
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
            ],
          },
        ],
      },
      {
        title: '端末に保存するもの',
        blocks: [
          'Cookie は使いません。',
          {
            list: [
              '選んだ表示言語: ブラウザのストレージ(localStorage)に記憶します。当社には送りません。',
              'ブラウザ内の文字起こしを使う場合: 文字起こしモデルのファイルをブラウザのキャッシュに保存し、次からは再ダウンロードしません。',
            ],
          },
          'ブラウザの設定でこのサイトのデータを消すと、あわせて消えます。',
        ],
      },
      {
        title: '第三者提供と委託',
        blocks: ['個人情報を第三者に提供せず、処理をほかの会社に委託しません。サーバーは当社が自ら運営しています。'],
      },
      {
        title: '国外移転',
        blocks: [
          'ブラウザ内の文字起こしを使う場合(ご自身で選んだとき、または文字起こしサーバーが使えずエディターがこの方式を選んだとき)だけ該当します。お使いのブラウザが、文字起こしモデルのファイルを下記の会社のサーバーから直接ダウンロードします。音声と動画は送りません。',
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
        ],
      },
      {
        title: '利用者の権利',
        blocks: [
          '利用者は、個人情報の閲覧・訂正・削除・処理停止を求めることができます。当社は動画・音声・アクセス記録を保管していないため、保管中の情報はありませんが、{contact} までご連絡いただければすぐにお答えします。',
        ],
      },
      { title: '14歳未満の子ども', blocks: ['本サービスはアカウントを受け付けず、14歳未満の子どもの個人情報を別途収集しません。'] },
      {
        title: '安全管理措置',
        blocks: [
          {
            list: [
              '通信の暗号化: 当社と利用者の間の通信を HTTPS で暗号化します。',
              '保存しない: 音声をディスクに書き込まず、メモリの中だけで処理します。',
              'アクセス制限: サーバーにアクセスできるのは運営者に限ります。',
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
