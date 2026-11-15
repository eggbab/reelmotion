import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SPEECH_MODELS } from '../../speech/transcribe'
import { FONT_CREDITS, MODEL_CREDITS, PROGRAM_CREDITS } from './credits'

const root = new URL('../../../', import.meta.url)
const read = (path: string) => readFileSync(new URL(path, root), 'utf8')
const installed = (name: string) => JSON.parse(read(`node_modules/${name}/package.json`)) as { license?: string }

describe('오픈소스 라이선스 목록', () => {
  it('package.json 의 의존성이 모두 목록에 있다(새로 더하면 여기에도 적는다)', () => {
    const dependencies = Object.keys((JSON.parse(read('package.json')) as { dependencies: Record<string, string> }).dependencies)
    const listed = new Set([...FONT_CREDITS, ...PROGRAM_CREDITS].flatMap((credit) => credit.packages))
    expect(dependencies.filter((name) => !listed.has(name))).toEqual([])
  })

  it('적은 사용 허가가 설치된 판의 사용 허가와 같다', () => {
    for (const credit of [...FONT_CREDITS, ...PROGRAM_CREDITS]) {
      for (const name of credit.packages) expect(installed(name).license, name).toBe(credit.license)
    }
  })

  it('받아쓰기 모델이 실제로 쓰는 모델과 같다', () => {
    const browser = MODEL_CREDITS.filter((model) => model.where === 'browser').map((model) => model.id)
    expect(browser.sort()).toEqual(Object.values(SPEECH_MODELS).map((model) => model.id).sort())
    const servers = read('server/asr/reelmotion_asr/app.py') + read('deploy/compose.yml')
    for (const model of MODEL_CREDITS.filter((item) => item.where === 'server')) expect(servers).toContain(`"${model.id}"`)
  })
})
