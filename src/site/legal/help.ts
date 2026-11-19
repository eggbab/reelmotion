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
              'ReelMotion 서버(Qwen3-ASR): 기본값이고 더 정확해요. 영상의 소리만 보내고, 받아 적은 뒤 남기지 않아요. 10분이 넘는 소리는 조용한 틈에서 나눠 차례로 보내요(「(1/3)」처럼 보여요).',
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
              '숫자 하나: 올라가는 숫자(%면 고리). 「100에서 500으로」처럼 바뀐 숫자는 「100 → 500」',
              '같은 단위의 숫자를 쉼표로 나란히: 막대 차트',
              '「첫째·둘째」나 「먼저·그다음·마지막으로」: 목록',
              '따옴표 안의 말, 「○○는 이렇게 말했죠」 다음 말: 인용',
              '첫 문장: 제목, 말 전체: 자막',
            ],
          },
          '숫자·순서·이름이 없는 이야기라 제목과 자막만 나오면 「그래픽」 탭 위의 「AI로 강조할 순간 찾기」를 눌러 보세요. 우리 서버의 AI가 대본을 읽고 제목·목록·인용을 그 말을 하는 때에 더해요(되돌릴 수 있어요). 말하지 않은 말을 인용으로 넣지는 않아요.',
          '가로 영상이면 숫자·차트·목록·제목·이름표가 말하는 사람의 얼굴을 가리지 않는 쪽(왼쪽·오른쪽)에 놓여요. 얼굴 자리는 이 브라우저 안에서 찾고 어디로도 보내지 않아요. 쪽은 「그래픽」 탭의 「위치」에서 바꿀 수 있어요. 세로 영상은 그래픽이 가운데에 놓여요.',
        ],
      },
      {
        title: '고치기',
        blocks: [
          '타임라인에서 그래픽을 끌어 옮기거나 양 끝을 끌어 길이를 바꿔요(고른 그래픽은 화살표 키로도 움직여요). 「그래픽」 탭에서 글·숫자·시간을 고치고, 「더하기」로 그래픽을 더하거나 지울 수 있어요.',
          '잘못 고치거나 지웠으면 미리보기 아래의 되돌리기(↶)를 누르거나 Ctrl+Z(맥은 ⌘Z)를 눌러요. 다시 하기는 ↷ 또는 Ctrl+Shift+Z(맥은 ⌘⇧Z). 글 칸 안에서 누르면 그 칸의 글자만 되돌려요.',
          '눈금 줄이나 미리보기 아래의 막대를 끌면 영상 위치가 따라와요. 긴 영상은 타임라인을 옆으로 밀어 보고, 왼쪽 위의 −·+ 로 크게·작게 볼 수 있어요. 휴대폰에서는 그래픽을 먼저 한 번 눌러 고른 뒤에 끌어요 — 타임라인을 밀다가 잘못 옮기지 않게요.',
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
        blocks: [
          '「내보내기」를 누르면 브라우저 안에서 MP4(H.264)로 만들어 내려받아요. 소리는 그대로 남아요. 컴퓨터의 최신 크롬·엣지·사파리를 권해요.',
          '10분이 넘는 영상은 컴퓨터의 크롬·엣지에서 저장할 곳을 먼저 물은 뒤 그 파일에 바로 써요(다 만든 영상을 메모리에 쥐지 않아 멈추지 않아요). 다른 브라우저는 메모리를 많이 써서, 멈추면 크롬이나 엣지로 해 보세요.',
          '유튜브·인스타그램에 자막을 따로 올리려면 「받아쓴 말」 탭 아래 「자막 파일」의 SRT·VTT 를 눌러요. 영상에 넣은 자막과 같은 곳에서 나눠요.',
        ],
      },
      {
        title: '내 작업',
        blocks: ['고칠 때마다 이 브라우저에 저장돼요. 「내 작업」에서 다시 열거나 지울 수 있어요. 구글로 로그인하면 계정에도 저장돼 다른 기기에서도 열려요(영상은 그 기기에서 다시 골라요). 브라우저 데이터를 지우면 이 브라우저의 작업은 지워지니 다 만든 영상은 내보내 두세요. 자세한 내용은 {privacy}에 있어요.'],
      },
      {
        id: 'install',
        title: '앱으로 설치하기',
        blocks: [
          'ReelMotion 을 앱처럼 설치하면 주소창 없는 자기 창으로 열려요. 설치는 쓰는 브라우저가 해 주며, 앱 장터에서 받는 앱은 아니에요. 설치하지 않아도, 편집기를 한 번 열어 본 뒤에는 인터넷이 없어도 편집기가 열려요.',
          {
            list: [
              '컴퓨터의 크롬·엣지: 주소창 오른쪽에 나오는 설치 아이콘을 누르거나, 브라우저 메뉴에서 설치 항목을 고르세요.',
              '맥의 사파리: 메뉴 막대의 「파일」에서 「Dock에 추가」를 고르세요.',
              '아이폰·아이패드: 사파리의 공유 단추를 누르고 「홈 화면에 추가」를 고르세요.',
              '안드로이드: 크롬 메뉴에서 「홈 화면에 추가」나 「앱 설치」를 고르세요.',
            ],
          },
          '인터넷이 없을 때는 받아쓰기 서버·말로 고치기·계정 저장을 쓸 수 없어요. 대본을 직접 적거나, 전에 한 번 써서 내려받아 둔 「이 브라우저」 받아쓰기를 쓰세요. 그래픽 만들기·고치기·내보내기는 그대로 돼요.',
        ],
      },
      {
        id: 'connect',
        title: 'Claude·ChatGPT에서 쓰기',
        blocks: [
          'Claude 나 ChatGPT 에 ReelMotion 을 커넥터로 더하면, 대화하면서 대본을 다듬고 어떤 그래픽이 언제 나올지 미리 본 뒤 편집기로 여는 링크를 받을 수 있어요. 영상은 보내지 않아요 — 링크를 열어 내 브라우저에서 영상을 넣어요.',
          '커넥터 주소: {mcp}',
          {
            list: [
              'Claude: 「Customize → Connectors」에서 「Add」, 「Add custom connector」를 차례로 누르고 이름과 위 주소를 넣으세요. 로그인 방식은 「No sign-in(로그인 없음)」을 고르세요. 팀·엔터프라이즈 요금제에서는 조직 소유자가 더해 줘야 해요.',
              'ChatGPT(웹): 「Plugins」에서 더하기(+) 단추를 누르고 「Add custom MCP server」를 고르세요. 서버 주소에 위 주소를 넣고 인증은 「No authentication(인증 없음)」을 고른 다음, 플러그인을 만들고 설치하세요.',
            ],
          },
          '메뉴 이름은 Claude·ChatGPT 가 바꿀 수 있고, 화면 언어에 따라 다르게 보일 수 있어요. 요금제나 조직 설정에 따라 사용자 지정 커넥터를 쓸 수 없을 수도 있어요.',
          '그다음 이렇게 말해 보세요: 「이 대본으로 ReelMotion 그래픽 계획을 보여 줘」, 「서울 스타일로 편집기 링크를 만들어 줘」. 도구를 써도 되는지 물으면 허락해 주세요. 링크는 7일 동안 열리고, 그동안 대본이 ReelMotion 서버에 보관됐다가 지워져요. 자세한 내용은 {privacy}에 있어요.',
        ],
      },
      {
        title: '계정과 요금제',
        blocks: [
          '구글로 로그인하면 작업이 계정에도 저장돼요. {account}에서 요금제와 이번 달 내보내기 수를 보고, 로그아웃하거나 탈퇴할 수 있어요.',
          '베타 동안은 로그인하지 않아도 모든 기능을 한도 없이 무료로 써요. 유료 요금제가 열리면 내보내려면 로그인해야 하고, 요금제마다 영상 하나의 길이와 한 달 내보내기 횟수가 정해져요(자세한 한도는 {pricing}). 무료 요금제로 내보낸 영상에는 오른쪽 아래에 작은 ReelMotion 표시가 들어가요. 내보내다 그만두거나 실패한 것은 횟수에 들어가지 않아요.',
        ],
      },
      {
        title: '잘 안 될 때',
        blocks: [
          {
            list: [
              '받아쓰기 서버가 바쁘다고 하면: 잠시 뒤 다시 누르거나 「받아쓰는 곳」을 이 브라우저로 바꾸세요.',
              '10분이 넘는 영상: 서버가 나눠서 차례로 받아 적어 조금 더 걸려요. 중간에 멈추면 다시 누르세요.',
              '내보내기가 안 되면: 컴퓨터의 최신 크롬이나 엣지로 해 보세요.',
              '내보내기가 막히면: 창에 나온 까닭(로그인·영상 길이·한 달 횟수)을 보고 {account}에서 요금제를 확인하세요.',
            ],
          },
          '그래도 안 되면 {inquiry}에서 알려 주세요. 어느 화면에서 무엇을 했을 때 어떻게 됐는지, 쓰는 기기와 브라우저를 적어 주면 더 빨리 고칠 수 있어요. 메일({contact})로 보내도 돼요.',
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
              'ReelMotion server (Qwen3-ASR): the default, and more accurate. Only the sound is sent, and it is not kept. Sound longer than 10 minutes is split at quiet moments and sent in turn (you will see “(1/3)”).',
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
              'One number: a counter (a ring for %). A change such as “from 100 to 500” shows as “100 → 500”',
              'Numbers in the same unit, listed with commas: a bar chart',
              '“First, second” or “Start by, then, finally”: a checklist',
              'Words in quotes, or “As Maya Angelou said, …”: a quote',
              'First sentence: a title, everything said: captions',
            ],
          },
          'If a talk without numbers, steps or names only gets a title and captions, press “Find more moments with AI” at the top of the Graphics tab. The AI on our server reads the script and adds titles, checklists and quotes at the moment they are said (you can undo it). It never quotes words that were not said.',
          'On a landscape video, counters, charts, checklists, titles and name tags go on the side (left or right) that keeps the speaker’s face clear. The face is found in your browser and never sent anywhere. Change the side with “Position” on the Graphics tab. On a portrait video, graphics sit in the center.',
        ],
      },
      {
        title: 'Edit',
        blocks: [
          'On the timeline, drag a graphic to move it or drag its ends to change its length (arrow keys move the selected one). On the Graphics tab, change the text, numbers and timing, use “Add” for more graphics, or delete one.',
          'Made a mistake or deleted something? Press Undo (↶) under the preview, or Ctrl+Z (⌘Z on a Mac). Redo is ↷ or Ctrl+Shift+Z (⌘⇧Z). Inside a text box, it only undoes your typing there.',
          'Drag along the ruler, or the bar under the preview, to move through the video. For a long video, swipe the timeline sideways and use − and + at its top left to zoom. On a phone, tap a graphic once to select it, then drag it — so swiping the timeline never moves one by accident.',
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
        blocks: [
          'Press “Export” and an MP4 (H.264) is made inside your browser and downloaded, with the original sound. A recent Chrome, Edge or Safari on a computer is recommended.',
          'For videos over 10 minutes, Chrome and Edge on a computer first ask where to save, then write straight into that file (the finished video is not held in memory, so it does not stall). Other browsers use a lot of memory; if it stops, try Chrome or Edge.',
          'To upload captions separately to YouTube or Instagram, press SRT or VTT under “Subtitle file” at the bottom of the Transcript tab. They are split at the same places as the captions in your video.',
        ],
      },
      {
        title: 'My projects',
        blocks: ['Your work is saved in this browser as you go. Reopen or delete it from “My projects”. Log in with Google and it is kept in your account too, so it opens on your other devices (choose the video again there). Clearing browser data removes this browser’s copy, so export the videos you finish. See the {privacy} for details.'],
      },
      {
        id: 'install',
        title: 'Install as an app',
        blocks: [
          'Install ReelMotion like an app and it opens in its own window, without the address bar. Your browser does the installing; it is not an app from an app store. Installed or not, once you have opened the editor it opens again even without the internet.',
          {
            list: [
              'Chrome or Edge on a computer: press the install icon at the right of the address bar, or choose the install item in the browser menu.',
              'Safari on a Mac: choose “Add to Dock” in the File menu.',
              'iPhone or iPad: in Safari, press the Share button and choose “Add to Home Screen”.',
              'Android: in Chrome’s menu, choose “Add to Home screen” or “Install app”.',
            ],
          },
          'Without the internet, the speech server, chat editing and saving to your account are unavailable. You can type the script yourself, or transcribe in “This browser” if you have used it before and its files are already downloaded. Making graphics, editing and exporting work as usual.',
        ],
      },
      {
        id: 'connect',
        title: 'Use it from Claude or ChatGPT',
        blocks: [
          'Add ReelMotion to Claude or ChatGPT as a connector and you can shape your script in a chat, preview which graphics will appear and when, and get a link that opens it in the editor. No video is sent — you open the link and add your video in your own browser.',
          'Connector address: {mcp}',
          {
            list: [
              'Claude: go to Customize → Connectors, choose Add, then “Add custom connector”. Enter a name and the address above, and for sign-in choose “No sign-in”. On Team and Enterprise plans, an Owner adds it for the organization.',
              'ChatGPT (on the web): open Plugins, press the plus button and choose “Add custom MCP server”. Enter the address above as the server URL, choose “No authentication”, then create the plugin and install it.',
            ],
          },
          'Claude and ChatGPT can rename these menus, and your plan or workspace settings may not allow custom connectors.',
          'Then try: “Show me the ReelMotion graphics plan for this script” or “Make an editor link in the Seoul style”. If it asks whether it may use the tool, allow it. The link works for 7 days; the script is kept on ReelMotion’s server for that time and then deleted. See the {privacy} for details.',
        ],
      },
      {
        title: 'Account and plans',
        blocks: [
          'Log in with Google and your projects are kept in your account too. In {account} you can see your plan and how many videos you exported this month, log out, or delete your account.',
          'During the beta, every feature is free and unlimited, with or without logging in. When paid plans open, you will need to log in to export, and each plan sets a maximum video length and a number of exports per month (see {pricing}). Videos exported on the Free plan carry a small ReelMotion mark in the bottom-right corner. Exports you cancel or that fail are not counted.',
        ],
      },
      {
        title: 'If something goes wrong',
        blocks: [
          {
            list: [
              'The speech server is busy: try again in a moment, or switch “Transcribe with” to this browser.',
              'Videos over 10 minutes: the server transcribes them in parts, one after another, so it takes a little longer. If it stops partway, press it again.',
              'Export does not work: try a recent Chrome or Edge on a computer.',
              'Export is blocked: read the reason in the window (login, video length or monthly exports) and check your plan in {account}.',
            ],
          },
          'If it still does not work, tell us on {inquiry}. Say which screen you were on, what you did and what happened, and which device and browser you use, so we can fix it faster. You can also email {contact}.',
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
              'ReelMotion サーバー(Qwen3-ASR): 初期設定で、より正確です。動画の音声だけを送り、書き起こした後は残しません。10分を超える音声は静かなところで分けて順に送ります(「(1/3)」のように表示されます)。',
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
              '数字ひとつ: カウンター(% ならリング)。「100から500に」のような変化は「100 → 500」',
              '同じ単位の数字を読点で並べる: 棒グラフ',
              '「まず・次に・最後に」: チェックリスト',
              'かぎかっこの中の言葉、「○○はこう言いました」の次の言葉: 引用',
              '最初の文: タイトル、話した内容すべて: 字幕',
            ],
          },
          '数字・順番・名前のない話でタイトルと字幕しか出ないときは、「グラフィック」タブの上の「AIで見せ場を探す」を押してください。当社サーバーの AI が台本を読み、タイトル・チェックリスト・引用を、その言葉を話すときに追加します(元に戻せます)。話していない言葉を引用にすることはありません。',
          '横長の動画では、カウンター・グラフ・チェックリスト・タイトル・名前テロップを、話している人の顔を隠さない側(左・右)に置きます。顔の位置はこのブラウザの中で探し、どこにも送りません。側は「グラフィック」タブの「位置」で変えられます。縦長の動画では、グラフィックスは中央に置かれます。',
        ],
      },
      {
        title: '直す',
        blocks: [
          'タイムラインでグラフィックをドラッグして動かしたり、両端をドラッグして長さを変えたりできます(選んだグラフィックは矢印キーでも動きます)。「グラフィック」タブで文字・数字・時間を直し、「追加」でグラフィックを増やしたり削除したりできます。',
          '間違えて直したり消したりしたときは、プレビューの下の「元に戻す」(↶)か Ctrl+Z(Mac は ⌘Z)を押します。やり直しは ↷ か Ctrl+Shift+Z(⌘⇧Z)。文字の欄の中で押すと、その欄の文字だけが戻ります。',
          '目盛りの行や、プレビューの下のバーをドラッグすると、動画の位置が動きます。長い動画はタイムラインを横にスワイプして見られ、左上の − と + で拡大・縮小できます。スマートフォンでは、グラフィックを一度タップして選んでからドラッグします — タイムラインをスワイプしているときに誤って動かさないためです。',
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
        blocks: [
          '「書き出し」を押すと、ブラウザの中で MP4(H.264)を作ってダウンロードします。音声はそのまま残ります。パソコンの最新の Chrome・Edge・Safari をおすすめします。',
          '10分を超える動画は、パソコンの Chrome・Edge で保存先を先に聞き、そのファイルに直接書き込みます(完成した動画をメモリに持たないので止まりません)。ほかのブラウザはメモリを多く使うため、止まったら Chrome か Edge でお試しください。',
          'YouTube や Instagram に字幕を別に上げるときは、「書き起こし」タブの下の「字幕ファイル」から SRT・VTT を押します。動画に入れた字幕と同じところで分けます。',
        ],
      },
      {
        title: 'マイプロジェクト',
        blocks: ['直すたびにこのブラウザに保存されます。「マイプロジェクト」から開き直したり削除したりできます。Google でログインするとアカウントにも保存され、ほかの端末でも開けます(動画はその端末で選び直します)。ブラウザのデータを消すとこのブラウザの分は消えるため、完成した動画は書き出しておいてください。詳しくは{privacy}をご覧ください。'],
      },
      {
        id: 'install',
        title: 'アプリとしてインストール',
        blocks: [
          'ReelMotion をアプリのようにインストールすると、アドレスバーのない専用ウィンドウで開きます。インストールはお使いのブラウザが行うもので、アプリストアのアプリではありません。インストールしなくても、エディターを一度開いたあとは、インターネットがなくてもエディターを開けます。',
          {
            list: [
              'パソコンの Chrome・Edge: アドレスバーの右に出るインストールアイコンを押すか、ブラウザのメニューからインストールの項目を選びます。',
              'Mac の Safari: メニューバーの「ファイル」から「Dock に追加」を選びます。',
              'iPhone・iPad: Safari の共有ボタンを押して「ホーム画面に追加」を選びます。',
              'Android: Chrome のメニューから「ホーム画面に追加」または「アプリをインストール」を選びます。',
            ],
          },
          'インターネットがないときは、文字起こしサーバー・話して直す・アカウントへの保存は使えません。台本を自分で入力するか、以前に一度使ってファイルをダウンロード済みの「このブラウザ」の文字起こしを使ってください。グラフィックの作成・編集・書き出しはそのまま使えます。',
        ],
      },
      {
        id: 'connect',
        title: 'Claude・ChatGPT から使う',
        blocks: [
          'Claude や ChatGPT に ReelMotion をコネクターとして追加すると、会話しながら台本を整え、どのグラフィックがいつ出るかを先に確認して、エディターで開くリンクを受け取れます。動画は送りません — リンクを開いて、自分のブラウザで動画を入れます。',
          'コネクターのアドレス: {mcp}',
          {
            list: [
              'Claude: 「Customize → Connectors」で「Add」、「Add custom connector」の順に選び、名前と上のアドレスを入力します。サインイン方法は「No sign-in(サインインなし)」を選びます。Team・Enterprise プランでは、組織のオーナーが追加します。',
              'ChatGPT(ウェブ): 「Plugins」でプラス(+)ボタンを押し、「Add custom MCP server」を選びます。サーバー URL に上のアドレスを入力し、認証は「No authentication(認証なし)」を選んで、プラグインを作成してインストールします。',
            ],
          },
          'メニューの名前は Claude・ChatGPT 側で変わることがあり、表示言語によっても異なります。プランや組織の設定によっては、カスタムコネクターを使えないことがあります。',
          'そのあと、こう話しかけてみてください: 「この台本で ReelMotion のグラフィック計画を見せて」「ソウルスタイルでエディターのリンクを作って」。ツールを使ってよいか聞かれたら、許可してください。リンクは7日間有効で、その間は台本が ReelMotion のサーバーに保管され、その後削除されます。詳しくは{privacy}をご覧ください。',
        ],
      },
      {
        title: 'アカウントとプラン',
        blocks: [
          'Google でログインすると、プロジェクトがアカウントにも保存されます。{account}で、プランと今月の書き出し回数を確認したり、ログアウトや退会をしたりできます。',
          'ベータ期間中は、ログインしなくてもすべての機能を上限なしで無料で使えます。有料プランが始まると、書き出しにはログインが必要になり、プランごとに動画1本の長さと月の書き出し回数が決まります(詳しい上限は{pricing})。無料プランで書き出した動画には、右下に小さな ReelMotion の表示が入ります。途中でやめた書き出しや失敗した書き出しは回数に入りません。',
        ],
      },
      {
        title: 'うまくいかないとき',
        blocks: [
          {
            list: [
              '書き起こしサーバーが混み合っているとき: 少し待ってからもう一度押すか、「書き起こす場所」をこのブラウザに変えてください。',
              '10分を超える動画: サーバーが分けて順に書き起こすため、少し長くかかります。途中で止まったら、もう一度押してください。',
              '書き出しができないとき: パソコンの最新の Chrome か Edge でお試しください。',
              '書き出しが止められたとき: 画面に出た理由(ログイン・動画の長さ・月の回数)を見て、{account}でプランを確認してください。',
            ],
          },
          'それでも解決しない場合は、{inquiry}からお知らせください。どの画面で何をしたときにどうなったか、使っている機器とブラウザを書いてもらえると早く直せます。メール({contact})でも送れます。',
        ],
      },
    ],
  },
}
