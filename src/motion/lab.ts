/** 개발용 견본: 모든 그래픽 × 디자인 묶음을 실제 영상 한 장면 위에 그린다(lab.html). 빌드에 들어가지 않는다. */
import { scriptToWords } from '../captions/segment'
import { loadFontsForGraphics } from './fonts'
import { renderGraphics } from './render'
import { THEMES } from './themes'
import type { Graphic } from './types'

const params = new URLSearchParams(location.search)
const portrait = params.get('portrait') === '1'
const at = Number(params.get('t') ?? '2.6')
const lang = params.get('lang') ?? 'en'

const TEXT: Record<string, { title: string; name: string; role: string; label: string; list: string[]; quote: string; captions: string; bars: string[]; barsTitle: string; callout: string; listTitle: string }> = {
  en: { title: 'Three habits that changed my mornings', name: 'Mina Park', role: 'Product designer', label: 'more focused hours', list: ['Drink water first', 'Stretch for 5 minutes', 'Plan one big task'], listTitle: 'My morning routine', quote: 'Done is better than perfect', captions: 'Okay so here is the thing nobody tells you about mornings', bars: ['Coffee', 'Water', 'Tea'], barsTitle: 'What I drink first', callout: 'New mic' },
  ko: { title: '아침을 바꾼 세 가지 습관', name: '김하늘', role: '제품 디자이너', label: '늘어난 집중 시간', list: ['물부터 마시기', '5분 스트레칭', '큰 일 하나 정하기'], listTitle: '나의 아침 루틴', quote: '완벽보다 완성이 낫다', captions: '아침에 대해 아무도 말해 주지 않는 게 있어요', bars: ['커피', '물', '차'], barsTitle: '아침에 마시는 것', callout: '새 마이크' },
  ja: { title: '朝を変えた三つの習慣', name: '田中 ゆい', role: 'デザイナー', label: '集中できる時間', list: ['まず水を飲む', '5分ストレッチ', '大きな仕事を一つ決める'], listTitle: '朝のルーティン', quote: '完璧より完成', captions: '朝について 誰も教えてくれない ことが あります', bars: ['コーヒー', '水', 'お茶'], barsTitle: '朝に飲むもの', callout: '新しいマイク' },
}

function graphicsFor(kind: string): Graphic[] {
  const x = TEXT[lang] ?? TEXT.en
  const base = { id: kind, start: 0, end: 8 }
  switch (kind) {
    case 'title':
      return [{ ...base, kind: 'title', text: x.title, emphasis: 2 }]
    case 'lowerThird':
      return [{ ...base, kind: 'lowerThird', name: x.name, role: x.role }]
    case 'stat':
      return [{ ...base, kind: 'stat', value: 42, prefix: '', suffix: '%', decimals: 0, label: x.label }]
    case 'bars':
      return [{ ...base, kind: 'bars', title: x.barsTitle, unit: '%', items: x.bars.map((label, i) => ({ label, value: [55, 30, 15][i] })) }]
    case 'list':
      return [{ ...base, kind: 'list', title: x.listTitle, items: x.list, itemTimes: [0.4, 0.8, 1.2] }]
    case 'callout':
      return [{ ...base, kind: 'callout', text: x.callout, x: 0.62, y: 0.55 }]
    case 'quote':
      return [{ ...base, kind: 'quote', text: x.quote, author: x.name }]
    default:
      return [{ ...base, kind: 'captions', words: scriptToWords(x.captions, 4.5) }]
  }
}

async function main() {
  const image = new Image()
  image.src = portrait ? '/media/shorts-a.jpg' : '/media/explainer.jpg'
  await image.decode()
  const grid = document.getElementById('grid')!
  const kinds = (params.get('kinds') ?? 'title,lowerThird,stat,bars,list,callout,quote,captions').split(',')
  const themes = (params.get('themes') ?? THEMES.map((t) => t.id).join(',')).split(',')
  for (const kind of kinds) {
    for (const theme of THEMES.filter((t) => themes.includes(t.id))) {
      const figure = document.createElement('figure')
      const canvas = document.createElement('canvas')
      canvas.width = portrait ? 720 : 1280
      canvas.height = portrait ? 1280 : 720
      await loadFontsForGraphics(theme, graphicsFor(kind))
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      renderGraphics(ctx, canvas.width, canvas.height, graphicsFor(kind), kind === 'captions' ? 2.2 : at, theme)
      const caption = document.createElement('figcaption')
      caption.textContent = `${kind} · ${theme.id}`
      figure.append(canvas, caption)
      grid.append(figure)
    }
  }
  document.body.dataset.ready = '1'
}
void main()
