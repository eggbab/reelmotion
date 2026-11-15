import { describe, expect, it } from 'vitest'
import { pickRuntimeFiles } from './runtime'

const CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'
const SAFARI_18 = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Safari/605.1.15'
const SAFARI_26 = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Safari/605.1.15'
const IOS_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0 Mobile/15E148 Safari/604.1'

describe('pickRuntimeFiles (받아쓰기 실행 파일 고르기 — @huggingface/transformers 의 기준과 같다)', () => {
  it('사파리 26 미만이고 WebGPU 가 없을 때만 asyncify 가 아닌 판', () => {
    expect(pickRuntimeFiles(SAFARI_18, 'Apple Computer, Inc.', false)).toBe('plain')
    expect(pickRuntimeFiles(SAFARI_18, 'Apple Computer, Inc.', true)).toBe('asyncify')
    expect(pickRuntimeFiles(SAFARI_26, 'Apple Computer, Inc.', false)).toBe('asyncify')
  })

  it('크롬·아이폰 크롬은 asyncify', () => {
    expect(pickRuntimeFiles(CHROME, 'Google Inc.', false)).toBe('asyncify')
    expect(pickRuntimeFiles(IOS_CHROME, 'Apple Computer, Inc.', false)).toBe('asyncify')
  })
})
