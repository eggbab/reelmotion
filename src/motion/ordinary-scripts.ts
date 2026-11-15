/**
 * 평범한 대본 24개(한국어·영어·일본어 × 리뷰·브이로그·요령·돈·요리·인터뷰·동기부여·뉴스).
 * 자동 배치(direct.ts)를 「시연용으로 규칙에 맞춰 쓴 대본」이 아닌 글로 재는 데 쓴다 — ordinary.test.ts.
 * 2026-11-15 처음 쟀을 때: 24개 가운데 9개는 제목·자막만 나왔고, 숫자 설명이 깨진 문장이었다
 * (「가격은 12만 9천 원인데 저는 만족합니다」 → 큰 숫자 「12만」, 설명 「가격은 9천 원인데 저는 만족합니다」).
 * 규칙을 고칠 때 이 글에 맞추려고 글을 바꾸지 않는다. 새로운 꼴의 말을 찾으면 여기에 대본을 더한다.
 */
export const ORDINARY_SCRIPTS: Record<string, string> = {
  'ko-review':
    "이 무선 이어폰 한 달 써 봤는데요. 솔직히 음질은 기대 이상이에요. 배터리는 한 번 충전하면 8시간 정도 가고요. 노이즈 캔슬링은 지하철에서도 꽤 조용해요. 다만 케이스가 좀 커서 주머니에 넣기는 불편해요. 가격은 12만 9천 원인데 저는 만족합니다.",
  'ko-vlog':
    "오늘은 아침 여섯 시에 일어났어요. 요즘 미라클 모닝 도전 중이거든요. 일어나자마자 물 한 잔 마시고 스트레칭부터 해요. 그리고 삼십 분 정도 책을 읽어요. 이렇게 하니까 하루가 훨씬 길게 느껴져요.",
  'ko-tips':
    "시험 기간에 꼭 지켜야 할 게 있어요. 먼저 계획을 너무 빡빡하게 세우지 마세요. 그다음에 오십 분 공부하고 십 분은 꼭 쉬세요. 마지막으로 잠은 최소 여섯 시간은 자야 해요.",
  'ko-money':
    "월급 300만 원 받는 직장인이 1년에 1,000만 원 모으는 방법 알려드릴게요. 월세랑 고정비로 120만 원, 생활비 80만 원, 그리고 저축은 85만 원씩 자동이체 하세요. 남는 15만 원은 비상금입니다.",
  'ko-cooking':
    "오늘은 5분 만에 만드는 계란 볶음밥이에요. 팬에 기름 두르고 파를 먼저 볶아 주세요. 계란 두 개를 풀어서 넣고 밥을 넣어요. 간장 한 스푼, 굴소스 반 스푼 넣으면 끝이에요.",
  'ko-interview':
    "안녕하세요, 카페를 운영하고 있는 이서연이라고 합니다. 회사를 그만두고 가게를 연 지 3년 됐어요. 처음 1년은 정말 힘들었는데 지금은 단골손님이 하루 200명 정도 오세요.",
  'ko-motivation':
    "성공한 사람들은 재능이 뛰어난 게 아니에요. 그냥 포기하지 않은 사람들이에요. 스티브 잡스는 이렇게 말했죠. 계속 갈망하고 우직하게 나아가라. 오늘 하루만 더 해 보세요.",
  'ko-news':
    "한국은행이 기준금리를 0.25%포인트 내렸습니다. 이로써 기준금리는 연 2.75%가 됐는데요. 대출 금리도 조금씩 내려갈 것으로 보입니다. 다만 물가는 여전히 2%대를 유지하고 있습니다.",
  'en-review':
    "So I've been using this standing desk for about three months now. Honestly, it changed how I work. The motor is quiet and it goes from sitting to standing in about ten seconds. My only complaint is the cable tray, which feels cheap. For 349 dollars, I think it's worth it.",
  'en-vlog':
    "Good morning everyone. Today I'm taking you along for a day in my life as a nurse. I start my shift at seven, so I'm up by five thirty. Coffee first, always. Then it's a twelve hour shift on the ward.",
  'en-tips':
    "If you want to learn a language faster, stop memorizing word lists. Start by listening to real conversations every day. Then try to speak, even if you make mistakes. And finally, write a few sentences before bed.",
  'en-finance':
    "Here's how I saved 10,000 dollars in one year on a normal salary. I put 20% of every paycheck into a separate account. I cut my subscriptions from 9 down to 3. And I cooked at home 5 nights a week.",
  'en-cooking':
    "This is the easiest pasta you will ever make. Boil your spaghetti in salted water. While that cooks, melt butter with garlic in a pan. Toss the pasta in, add parmesan and black pepper, and you're done.",
  'en-interview':
    "Hi, my name is Daniel Kim and I'm a product designer at a small startup. I've been designing apps for eight years. Before that I studied architecture, which is where I learned to think about people first.",
  'en-motivation':
    "Nobody is coming to save you. That sounds harsh, but it's actually freeing. As Maya Angelou said, nothing will work unless you do. So start today, even if it's small.",
  'en-news':
    "The city council voted last night to expand the bike lane network. The plan adds 40 miles of protected lanes over the next 3 years. Supporters say it will cut traffic. Critics worry about the 85 million dollar cost.",
  'ja-review':
    "このロボット掃除機を二か月使ってみました。正直、想像以上に便利です。バッテリーは一回の充電で120分くらい持ちます。音も静かで、夜でも気になりません。ただ、段差には少し弱いです。値段は39,800円でした。",
  'ja-vlog':
    "おはようございます。今日は朝六時に起きました。最近、朝活を始めたんです。まず白湯を一杯飲んで、ストレッチをします。それから三十分くらい本を読みます。",
  'ja-tips':
    "資格試験に一発で受かるコツを話します。まず、過去問から始めてください。次に、間違えた問題だけをノートにまとめます。最後に、試験の一週間前は新しいことをやらないでください。",
  'ja-money':
    "手取り25万円で年間100万円貯める方法です。家賃と固定費で11万円、生活費は6万円、貯金は毎月8万円を先に分けます。これだけで一年後には96万円になります。",
  'ja-cooking':
    "今日は五分でできる卵チャーハンを作ります。フライパンに油をひいて、ねぎを炒めます。卵を二個入れて、ご飯を加えます。しょうゆを大さじ一杯入れたら完成です。",
  'ja-interview':
    "こんにちは、パン屋を経営している田中美咲と申します。会社を辞めてお店を始めて三年になります。最初の一年は本当に大変でしたが、今は毎日200人くらいのお客さんが来てくれます。",
  'ja-motivation':
    "成功する人は才能があるわけではありません。ただ、あきらめなかった人です。イチローはこう言いました。「小さいことを積み重ねるのが、とんでもないところへ行くただひとつの道」。今日一日だけ、続けてみましょう。",
  'ja-news':
    "日本銀行は政策金利を0.25%引き上げました。これで金利は0.75%になります。住宅ローンの金利も少しずつ上がる見通しです。一方、物価の上昇率は2%台が続いています。",
}
