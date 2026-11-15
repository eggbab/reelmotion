import type { LegalDocs } from './types'

/**
 * 이용약관. 원문은 한국어이고 영어·일본어는 번역이다(10절). 같은 사업자의 AllMails 약관처럼 꼭 필요한 것만 짧게 쓴다.
 * 서비스가 실제로 하는 일과 맞아야 한다: 계정 없음 · 영상은 올리지 않음 · 소리만 받아쓰기 서버로 · 서버 한도 10분(ASR_MAX_SECONDS).
 * 계정·결제가 생기면 2·6절을 고친다.
 */
export const TERMS: LegalDocs = {
  ko: {
    title: '이용약관',
    description: 'ReelMotion 이용약관 — 서비스 내용, 영상과 결과물의 권리, 금지 행위, 이용 한도, 약관 변경, 책임의 한계를 정합니다.',
    intro: '이 약관은 브이미랩스(이하 「회사」)가 운영하는 ReelMotion(이하 「서비스」)을 이용하는 조건입니다. 서비스를 이용하면 이 약관에 동의한 것으로 봅니다.',
    sections: [
      {
        title: '서비스 내용',
        blocks: [
          '서비스는 말하는 영상의 말을 받아 적고, 말하는 순간에 맞춰 제목·숫자·차트·이름표·자막 같은 모션그래픽을 영상 위에 얹어 새 영상 파일로 내보내는 웹 서비스입니다.',
          '지금은 공개 베타라 모든 기능을 무료로 제공합니다. 유료 요금제를 열 때는 값과 내용을 요금 안내에 먼저 알립니다.',
        ],
      },
      {
        title: '이용 방법',
        blocks: [
          '웹 브라우저에서 바로 씁니다. 만든 작업은 그 브라우저에 저장되어 「내 작업」에서 다시 열 수 있고, 구글로 로그인하면(선택) 계정에도 저장되어 다른 기기에서 열 수 있습니다.',
          '영상 파일은 이용자의 기기 안에서만 처리하며 회사 서버로 올리지 않습니다. 말을 받아 적을 때는 영상의 소리만 회사의 받아쓰기 서버로 보내고, 원하면 브라우저 안에서만 받아 적을 수도 있습니다. 자세한 내용은 {privacy}에 있습니다.',
        ],
      },
      {
        title: '계정',
        blocks: [
          '구글 계정으로 로그인하면 계정이 만들어집니다. 만 14세 미만은 계정을 만들 수 없습니다. 계정은 본인만 쓰세요.',
          '「내 계정」에서 언제든 탈퇴할 수 있습니다. 탈퇴하면 계정과 계정에 저장한 작업이 바로 지워지며 되돌릴 수 없습니다. 금지 행위를 어기면 회사는 계정을 멈출 수 있습니다.',
        ],
      },
      {
        title: '영상과 결과물의 권리',
        blocks: [
          '이용자가 넣은 영상과 서비스로 만든 결과물의 권리는 이용자에게 있습니다. 회사는 이를 저장하지 않고 다른 목적에 쓰지 않습니다.',
          '이용자는 넣는 영상과 그래픽에 적는 글에 필요한 권리(저작권, 초상권, 출연자의 동의 등)를 갖추어야 합니다.',
          '스타일 묶음의 글꼴과 그래픽 모양은 결과물 안에서 상업적으로 써도 됩니다.',
        ],
      },
      {
        title: '금지 행위',
        blocks: [
          {
            list: [
              '다른 사람의 저작권·초상권·명예 같은 권리를 침해하는 영상 만들기',
              '법을 어기는 영상 만들기',
              '자동화된 방법으로 받아쓰기 서버에 많은 요청을 보내 서비스를 방해하기',
              '보안 장치를 피하거나 허락 없이 서버에 접근하기',
            ],
          },
          '이를 어기면 회사는 그 이용을 막을 수 있습니다.',
        ],
      },
      {
        title: '이용 한도',
        blocks: [
          '받아쓰기 서버는 한 번에 10분까지의 소리를 받으며, 여러 사람이 함께 쓰면 잠시 기다리거나 다시 시도해야 할 수 있습니다. 한도는 서비스를 안정적으로 제공하기 위해 바뀔 수 있고, 바뀌면 서비스 화면에 알립니다.',
        ],
      },
      {
        title: '유료 서비스',
        blocks: ['유료 요금제는 아직 판매하지 않습니다. 판매를 시작하면 값, 제공 내용, 결제 방법을 요금 안내에 적고, 환불은 {refund}을 따릅니다.'],
      },
      {
        title: '약관 변경과 서비스 중단',
        blocks: [
          '약관이 바뀌면 시행 7일 전에 이 페이지에 알립니다. 이용자에게 불리하게 바뀌면 시행 30일 전에 알립니다.',
          '회사는 서비스를 바꾸거나 중단할 수 있으며, 중요한 변경과 종료는 30일 전에 알립니다. 점검·고장·통신 장애처럼 미리 알릴 수 없는 때에는 서비스가 잠시 멈출 수 있습니다.',
        ],
      },
      {
        title: '책임의 한계',
        blocks: [
          '받아쓰기와 자동 배치는 틀릴 수 있습니다. 결과물을 공개하기 전에 내용을 확인해 주세요.',
          '무료로 제공하는 서비스, 이용자의 기기·브라우저 문제, 이용자가 넣은 영상으로 생긴 손해는 회사의 고의나 중대한 과실이 없는 한 책임지지 않습니다.',
          '로그인하지 않고 만든 작업은 이용자의 브라우저에만 저장됩니다. 브라우저 데이터가 지워져 잃은 작업과, 회사가 받지 않는 영상 파일은 되살릴 수 없으니 다 만든 영상은 내보내 보관해 주세요.',
        ],
      },
      { title: '준거법', blocks: ['이 약관은 대한민국 법을 따릅니다.'] },
      { title: '번역', blocks: ['이 약관의 원문은 한국어입니다. 영어·일본어 번역과 뜻이 다르면 한국어 원문을 따릅니다.'] },
      { title: '문의', blocks: ['{contact}'] },
    ],
  },
  en: {
    title: 'Terms of Service',
    description: 'ReelMotion Terms of Service — what the service does, who owns your videos, what is not allowed, usage limits, changes and limits of liability.',
    intro: 'These terms are the conditions for using ReelMotion (the “Service”), run by 브이미랩스 (the “Company”). By using the Service, you agree to these terms.',
    sections: [
      {
        title: 'What the Service does',
        blocks: [
          'The Service is a web service that writes down what is said in a talking video, places motion graphics — titles, numbers, charts, name tags and captions — at the moment each thing is said, and exports a new video file.',
          'It is in public beta and every feature is free. Before paid plans open, their prices and what they include will be announced in the pricing section.',
        ],
      },
      {
        title: 'How you use it',
        blocks: [
          'You use it in a web browser. What you make is saved in that browser and can be reopened from My projects; if you log in with Google (optional), it is also kept in your account so you can open it on other devices.',
          'Video files are processed only on your device and are never uploaded to our servers. To transcribe, only the sound of the video is sent to our speech server, or, if you prefer, transcription runs entirely in your browser. See the {privacy} for details.',
        ],
      },
      {
        title: 'Accounts',
        blocks: [
          'Logging in with Google creates an account. Children under 14 cannot create an account. Please keep your account to yourself.',
          'You can delete your account at any time from My account. Deleting it removes the account and the projects kept in it right away, and this cannot be undone. If you break the rules in “What is not allowed”, we may suspend the account.',
        ],
      },
      {
        title: 'Your videos and what you make',
        blocks: [
          'You keep the rights to the videos you add and to what you make with the Service. We do not store them or use them for anything else.',
          'You must have the rights needed for the videos you add and the text you put into graphics (copyright, likeness rights, consent of the people in the video, and so on).',
          'The fonts and graphic designs in the style packs may be used commercially in what you export.',
        ],
      },
      {
        title: 'What is not allowed',
        blocks: [
          {
            list: [
              'Making videos that infringe the rights of others, such as copyright, likeness or reputation',
              'Making videos that break the law',
              'Disrupting the Service by sending large numbers of automated requests to the speech server',
              'Getting around security measures or accessing our servers without permission',
            ],
          },
          'If you do any of these, we may block that use.',
        ],
      },
      {
        title: 'Usage limits',
        blocks: [
          'The speech server accepts up to 10 minutes of sound at a time. When many people use it at once, you may need to wait or try again. Limits may change to keep the Service stable, and changes will be shown in the Service.',
        ],
      },
      {
        title: 'Paid plans',
        blocks: ['Paid plans are not on sale yet. When they are, prices, what is included and how to pay will be listed in the pricing section, and refunds will follow the {refund}.'],
      },
      {
        title: 'Changes to these terms and the Service',
        blocks: [
          'If these terms change, we will post the change on this page 7 days before it takes effect, or 30 days before if it is unfavorable to you.',
          'We may change or stop the Service, and will announce important changes and shutting down 30 days in advance. The Service may pause without notice for maintenance, failures or network problems.',
        ],
      },
      {
        title: 'Limits of liability',
        blocks: [
          'Transcription and automatic placement can be wrong. Please check what you made before you publish it.',
          'Unless caused by our intent or gross negligence, we are not liable for damage arising from the free Service, from problems with your device or browser, or from the videos you add.',
          'Projects you make without logging in are saved only in your browser. We cannot recover projects lost when browser data is cleared, or video files, which we never receive, so please export and keep your finished videos.',
        ],
      },
      { title: 'Governing law', blocks: ['These terms are governed by the laws of the Republic of Korea.'] },
      { title: 'Translations', blocks: ['The original of these terms is in Korean. If an English or Japanese translation differs from it, the Korean original applies.'] },
      { title: 'Contact', blocks: ['{contact}'] },
    ],
  },
  ja: {
    title: '利用規約',
    description: 'ReelMotion 利用規約 — サービスの内容、動画と作成物の権利、禁止事項、利用上限、規約の変更、責任の範囲を定めます。',
    intro: 'この規約は、브이미랩스(以下「当社」)が運営する ReelMotion(以下「本サービス」)の利用条件です。本サービスを利用すると、この規約に同意したものとみなします。',
    sections: [
      {
        title: 'サービスの内容',
        blocks: [
          '本サービスは、話している動画の言葉を文字に起こし、話した瞬間に合わせてタイトル・数字・グラフ・名前テロップ・字幕などのモーショングラフィックスを動画に重ね、新しい動画ファイルとして書き出すウェブサービスです。',
          '現在は公開ベータのため、すべての機能を無料で提供しています。有料プランを始める前に、料金と内容を料金案内でお知らせします。',
        ],
      },
      {
        title: '利用方法',
        blocks: [
          'ウェブブラウザからすぐに使えます。作ったプロジェクトはそのブラウザに保存されて「マイプロジェクト」から開き直せ、Google でログインすると(任意)アカウントにも保存されてほかの端末でも開けます。',
          '動画ファイルはお使いの端末の中だけで処理し、当社のサーバーにはアップロードしません。文字起こしでは動画の音声だけを当社の文字起こしサーバーに送ります。ご希望なら、ブラウザの中だけで文字起こしすることもできます。詳しくは{privacy}をご覧ください。',
        ],
      },
      {
        title: 'アカウント',
        blocks: [
          'Google アカウントでログインすると、アカウントが作られます。14歳未満の方はアカウントを作れません。アカウントはご本人だけでお使いください。',
          '「マイアカウント」からいつでも退会できます。退会すると、アカウントとアカウントに保存したプロジェクトがすぐに削除され、元に戻せません。禁止事項に違反した場合、当社はアカウントを停止することがあります。',
        ],
      },
      {
        title: '動画と作成物の権利',
        blocks: [
          '利用者が入れた動画と、本サービスで作った作成物の権利は利用者にあります。当社はこれらを保存せず、ほかの目的に使いません。',
          '利用者は、入れる動画とグラフィックスに書く文字について、必要な権利(著作権、肖像権、出演者の同意など)を備えてください。',
          'スタイルパックのフォントとグラフィックスのデザインは、作成物の中で商用利用できます。',
        ],
      },
      {
        title: '禁止事項',
        blocks: [
          {
            list: [
              '他人の著作権・肖像権・名誉などの権利を侵害する動画を作ること',
              '法令に違反する動画を作ること',
              '自動化した方法で文字起こしサーバーに大量のリクエストを送り、本サービスを妨げること',
              'セキュリティ対策を回避すること、または許可なくサーバーにアクセスすること',
            ],
          },
          'これらに違反した場合、当社はその利用を止めることがあります。',
        ],
      },
      {
        title: '利用上限',
        blocks: [
          '文字起こしサーバーは、一度に10分までの音声を受け付けます。多くの人が同時に使うと、しばらく待つか、やり直す必要があることがあります。上限は本サービスを安定して提供するために変わることがあり、変わる場合は本サービスの画面でお知らせします。',
        ],
      },
      {
        title: '有料サービス',
        blocks: ['有料プランはまだ販売していません。販売を始めるときは、料金・内容・支払い方法を料金案内に記載し、返金は{refund}に従います。'],
      },
      {
        title: '規約の変更とサービスの停止',
        blocks: [
          '規約を変更する場合は、施行の7日前にこのページでお知らせします。利用者に不利な変更は、施行の30日前にお知らせします。',
          '当社は本サービスを変更または終了することがあり、重要な変更と終了は30日前にお知らせします。点検・故障・通信障害など事前にお知らせできない場合は、本サービスが一時的に止まることがあります。',
        ],
      },
      {
        title: '責任の範囲',
        blocks: [
          '文字起こしと自動配置は間違うことがあります。作成物を公開する前に内容をご確認ください。',
          '無料で提供する本サービス、利用者の端末・ブラウザの問題、利用者が入れた動画によって生じた損害について、当社の故意または重大な過失による場合を除き、当社は責任を負いません。',
          'ログインせずに作ったプロジェクトは、利用者のブラウザにだけ保存されます。ブラウザのデータが消えて失われたプロジェクトや、当社が受け取らない動画ファイルは復元できないため、完成した動画は書き出して保管してください。',
        ],
      },
      { title: '準拠法', blocks: ['この規約は大韓民国の法律に従います。'] },
      { title: '翻訳', blocks: ['この規約の原文は韓国語です。英語・日本語の翻訳と意味が異なる場合は、韓国語の原文に従います。'] },
      { title: 'お問い合わせ', blocks: ['{contact}'] },
    ],
  },
}
