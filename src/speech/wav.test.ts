import { describe, expect, it } from 'vitest'
import { encodeWav } from './wav'

describe('encodeWav', () => {
  it('16kHz 한 채널 16비트 WAV 머리말과 소리를 쓴다', async () => {
    const samples = new Float32Array([0, 1, -1, 0.5])
    const bytes = new Uint8Array(await encodeWav(samples, 16000).arrayBuffer())
    const view = new DataView(bytes.buffer)
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe('RIFF')
    expect(String.fromCharCode(...bytes.slice(8, 12))).toBe('WAVE')
    expect(view.getUint16(22, true)).toBe(1) // 채널
    expect(view.getUint32(24, true)).toBe(16000)
    expect(view.getUint16(34, true)).toBe(16) // 비트
    expect(view.getUint32(40, true)).toBe(8) // 소리 바이트 수
    expect(view.getInt16(46, true)).toBe(32767)
    expect(view.getInt16(48, true)).toBe(-32768)
    expect(bytes.length).toBe(44 + 8)
  })
})
