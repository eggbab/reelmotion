import type { Lang } from '../../langs'
import type { LegalDocs } from './types'

export const HELP_EYEBROW: Record<Lang, string> = { ko: '쓰는 법', en: 'HOW IT WORKS', ja: '使い方' }

/**
 * 도움말: 편집기 쓰는 법. 단추·탭 이름은 편집기 글(src/editor/copy.ts)과 같게 쓴다 — 편집기 글을 바꾸면 여기도 고친다.
 * 세 언어의 절·문단 구성이 같아야 한다(legal.test.ts).
 */
export const HELP: LegalDocs = {
  ko: {
    title: '도움말',
    description: 'ReelMotion 쓰는 법 — 영상 넣기, 말 받아쓰기, 그래픽 만들기와 고치기, 스타일, MP4 내보내기, 내 작업 저장.',
    intro: '말하는 영상 하나로 모션그래픽 영상을 만드는 순서입니다. 편집기는 계정 없이 바로 쓸 수 있어요.',
    sections: [
      {
        title: '영상 넣기',
        blocks: ['편집기에서 「영상 고르기」를 누르거나 영상을 끌어다 놓으세요. 말하는 사람이 나오는 영상이면 됩니다. 영상은 이 컴퓨터 밖으로 나가지 않아요. 먼저 예시 영상으로 해 볼 수도 있어요.'],
      },
      {
        title: '말 받아쓰기',
        blocks: [
          '「말 받아쓰기」를 누르면 말을 낱말마다 시간과 함께 받아 적어요. 「말하는 언어」에서 영어·한국어·일본어나 자동을 고르세요.',
          {
            list: [
              'ReelMotion 서버(Qwen3-ASR): 기본값이고 더 정확해요. 영상의 소리만 보내고, 받아 적은 뒤 남기지 않아요. 한 번에 10분까지 받아요.',
              '이 브라우저: 서버를 쓸 수 없을 때 써요. 처음 한 번 받아쓰기 모델을 내려받아요(빠르게 약 250MB, 정확하게 약 760MB).',
            ],
          },
          '틀린 낱말은 「받아쓴 말」 탭의 「말한 내용」에서 고치면 돼요. 시간은 그대로 남아요. 받아쓰지 않고 대본을 직접 적어도 됩니다 — 시간은 영상 길이에 맞춰 나눠요.',
        ],
      },
      {
        title: '그래픽 만들기',
        blocks: [
          '「그래픽 만들기」를 누르면 말을 보고 그래픽을 골라 그 말을 하는 순간에 놓아요.',
          {
            list: [
              '자기소개: 이름표',
              '숫자 하나: 올라가는 숫자(%면 고리)',
              '숫자 여럿: 막대 차트',
              '「첫째·둘째」: 목록',
              '따옴표 안의 말: 인용',
              '첫 문장: 제목, 말 전체: 자막',
            ],
          },
        ],
      },
      {
        title: '고치기',
        blocks: [
          '아래 타임라인에서 그래픽을 끌어 옮기거나 양 끝을 끌어 길이를 바꿔요(고른 그래픽은 화살표 키로도 움직여요). 오른쪽 「그래픽」 탭에서 글·숫자·시간을 고치고, 「더하기」로 그래픽을 더하거나 지울 수 있어요.',
        ],
      },
      {
        title: '말로 고치기',
        blocks: [
          '「말로 고치기」 탭에 고치고 싶은 것을 적으면 ReelMotion 서버의 AI 가 그래픽을 고쳐요. 예: 「제목을 \'아침 루틴\'으로 바꿔 줘」, 「숫자를 50%로」, 「이름표를 2초 늦게」, 「도쿄 스타일로」. 마지막에 고친 것은 「되돌리기」로 되돌릴 수 있어요. 10분에 20번까지 쓸 수 있어요.',
        ],
      },
      {
        title: '스타일',
        blocks: ['스타일 여섯 가지(클린·네온·볼드·에디토리얼·서울·도쿄) 중 하나를 고르면 모든 그래픽이 한 번에 바뀌어요. 서울과 도쿄는 한국어·일본어 글자에 맞춘 예능 자막·텔롭 느낌이에요.'],
      },
      {
        title: '내보내기',
        blocks: ['「내보내기」를 누르면 브라우저 안에서 MP4(H.264)로 만들어 내려받아요. 소리는 그대로 남아요. 컴퓨터의 최신 크롬·엣지·사파리를 권해요.'],
      },
      {
        title: '내 작업',
        blocks: ['고칠 때마다 이 브라우저에 저장돼요. 「내 작업」에서 다시 열거나 지울 수 있어요. 구글로 로그인하면 계정에도 저장돼 다른 기기에서도 열려요(영상은 그 기기에서 다시 골라요). 브라우저 데이터를 지우면 이 브라우저의 작업은 지워지니 다 만든 영상은 내보내 두세요. 자세한 내용은 {privacy}에 있어요.'],
      },
      {
        title: '잘 안 될 때',
        blocks: [
          {
            list: [
              '받아쓰기 서버가 바쁘다고 하면: 잠시 뒤 다시 누르거나 「받아쓰는 곳」을 이 브라우저로 바꾸세요.',
              '10분이 넘는 영상: 서버 대신 이 브라우저로 받아 적으세요.',
              '내보내기가 안 되면: 컴퓨터의 최신 크롬이나 엣지로 해 보세요.',
            ],
          },
          '그래도 안 되면 {contact} 로 알려 주세요.',
        ],
      },
    ],
  },
  en: {
    title: 'Help',
    description: 'How to use ReelMotion — add a video, transcribe it, make and edit graphics, pick a style, export an MP4 and keep your projects.',
    intro: 'Here is how to turn one talking video into a motion graphics video. The editor works right away, with no account.',
    sections: [
      {
        title: 'Add a video',
        blocks: ['In the editor, press “Choose a video” or drop a video file. Any video of someone talking works. The video never leaves your computer. You can also start with a sample clip.'],
      },
      {
        title: 'Transcribe the speech',
        blocks: [
          'Press “Transcribe speech” and every word is written down with its timing. Pick English, Korean, Japanese or Auto under “Spoken language”.',
          {
            list: [
              'ReelMotion server (Qwen3-ASR): the default, and more accurate. Only the sound is sent, and it is not kept. Up to 10 minutes at a time.',
              'This browser: used when the server is unavailable. The speech model downloads once the first time (about 250 MB for fast, 760 MB for accurate).',
            ],
          },
          'Fix a misheard word in “What is said” on the Transcript tab — the timing stays. You can also type a script instead of transcribing; it is timed across the video.',
        ],
      },
      {
        title: 'Make graphics',
        blocks: [
          'Press “Make graphics” and ReelMotion picks graphics from what is said and places each at the moment it is said.',
          {
            list: [
              'Introducing yourself: a name tag',
              'One number: a counter (a ring for %)',
              'Several numbers: a bar chart',
              '“First, second”: a checklist',
              'Words in quotes: a quote',
              'First sentence: a title, everything said: captions',
            ],
          },
        ],
      },
      {
        title: 'Edit',
        blocks: [
          'On the timeline below, drag a graphic to move it or drag its ends to change its length (arrow keys move the selected one). On the Graphics tab, change the text, numbers and timing, use “Add” for more graphics, or delete one.',
        ],
      },
      {
        title: 'Chat editing',
        blocks: [
          'On the Chat tab, type what you want to change and the AI on the ReelMotion server edits the graphics — for example “Change the title to \'Morning routine\'”, “Make the number 50%”, “Show the name tag 2 seconds later” or “Switch to the Tokyo style”. You can undo the latest change with “Undo”. Up to 20 requests every 10 minutes.',
        ],
      },
      {
        title: 'Style',
        blocks: ['Pick one of six styles — Clean, Neon, Bold, Editorial, Seoul and Tokyo — and every graphic changes at once. Seoul and Tokyo are made for Korean variety captions and Japanese telop.'],
      },
      {
        title: 'Export',
        blocks: ['Press “Export” and an MP4 (H.264) is made inside your browser and downloaded, with the original sound. A recent Chrome, Edge or Safari on a computer is recommended.'],
      },
      {
        title: 'My projects',
        blocks: ['Your work is saved in this browser as you go. Reopen or delete it from “My projects”. Log in with Google and it is kept in your account too, so it opens on your other devices (choose the video again there). Clearing browser data removes this browser’s copy, so export the videos you finish. See the {privacy} for details.'],
      },
      {
        title: 'If something goes wrong',
        blocks: [
          {
            list: [
              'The speech server is busy: try again in a moment, or switch “Transcribe with” to this browser.',
              'Videos over 10 minutes: transcribe in this browser instead of the server.',
              'Export does not work: try a recent Chrome or Edge on a computer.',
            ],
          },
          'If it still does not work, write to {contact}.',
        ],
      },
    ],
  },
  ja: {
    title: 'ヘルプ',
    description: 'ReelMotion の使い方 — 動画を入れる、声を書き起こす、グラフィックスを作って直す、スタイル、MP4 の書き出し、マイプロジェクト。',
    intro: '話している動画ひとつから、モーショングラフィックス動画を作る手順です。エディターはアカウントなしですぐに使えます。',
    sections: [
      {
        title: '動画を入れる',
        blocks: ['エディターで「動画を選ぶ」を押すか、動画をドラッグして入れてください。話している人が映っている動画なら使えます。動画はパソコンの外に出ません。まずサンプル動画で試すこともできます。'],
      },
      {
        title: '声を書き起こす',
        blocks: [
          '「声を書き起こす」を押すと、言葉を単語ごとに時間付きで書き起こします。「話している言語」で英語・韓国語・日本語または自動を選んでください。',
          {
            list: [
              'ReelMotion サーバー(Qwen3-ASR): 初期設定で、より正確です。動画の音声だけを送り、書き起こした後は残しません。一度に10分まで受け付けます。',
              'このブラウザ: サーバーが使えないときに使います。初回だけ書き起こしモデルをダウンロードします(速い: 約250MB、正確: 約760MB)。',
            ],
          },
          '間違った言葉は「書き起こし」タブの「話した内容」で直せます。時間はそのまま残ります。書き起こさずに台本を直接入力しても構いません — 時間は動画の長さに合わせて割り振ります。',
        ],
      },
      {
        title: 'グラフィックスを作る',
        blocks: [
          '「グラフィックを作る」を押すと、話した内容からグラフィックスを選び、その言葉を話した瞬間に置きます。',
          {
            list: [
              '自己紹介: 名前テロップ',
              '数字ひとつ: カウンター(% ならリング)',
              '数字がいくつか: 棒グラフ',
              '「まず・次に」: チェックリスト',
              'かぎかっこの中の言葉: 引用',
              '最初の文: タイトル、話した内容すべて: 字幕',
            ],
          },
        ],
      },
      {
        title: '直す',
        blocks: [
          '下のタイムラインでグラフィックをドラッグして動かしたり、両端をドラッグして長さを変えたりできます(選んだグラフィックは矢印キーでも動きます)。右の「グラフィック」タブで文字・数字・時間を直し、「追加」でグラフィックを増やしたり削除したりできます。',
        ],
      },
      {
        title: '話して直す',
        blocks: [
          '「話して直す」タブに直したいことを書くと、ReelMotion サーバーの AI がグラフィックスを直します。例: 「タイトルを『朝のルーティン』にして」「数字を50%にして」「名前テロップを2秒遅く出して」「東京スタイルにして」。最後の変更は「元に戻す」で戻せます。10分に20回まで使えます。',
        ],
      },
      {
        title: 'スタイル',
        blocks: ['6つのスタイル(クリーン・ネオン・ボールド・エディトリアル・ソウル・東京)から選ぶと、すべてのグラフィックスが一度に変わります。ソウルと東京は、韓国語のバラエティ字幕と日本語のテロップに合わせたものです。'],
      },
      {
        title: '書き出し',
        blocks: ['「書き出し」を押すと、ブラウザの中で MP4(H.264)を作ってダウンロードします。音声はそのまま残ります。パソコンの最新の Chrome・Edge・Safari をおすすめします。'],
      },
      {
        title: 'マイプロジェクト',
        blocks: ['直すたびにこのブラウザに保存されます。「マイプロジェクト」から開き直したり削除したりできます。Google でログインするとアカウントにも保存され、ほかの端末でも開けます(動画はその端末で選び直します)。ブラウザのデータを消すとこのブラウザの分は消えるため、完成した動画は書き出しておいてください。詳しくは{privacy}をご覧ください。'],
      },
      {
        title: 'うまくいかないとき',
        blocks: [
          {
            list: [
              '書き起こしサーバーが混み合っているとき: 少し待ってからもう一度押すか、「書き起こす場所」をこのブラウザに変えてください。',
              '10分を超える動画: サーバーではなく、このブラウザで書き起こしてください。',
              '書き出しができないとき: パソコンの最新の Chrome か Edge でお試しください。',
            ],
          },
          'それでも解決しない場合は、{contact} までお知らせください。',
        ],
      },
    ],
  },
}
