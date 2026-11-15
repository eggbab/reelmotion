/** -1~1 소리 숫자 배열을 16비트 PCM WAV 로 만든다(받아쓰기 서버로 보낼 때). 16kHz 한 채널이면 1분에 약 1.9MB. */
export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const bytes = samples.length * 2
  const buffer = new ArrayBuffer(44 + bytes)
  const view = new DataView(buffer)
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i))
  }
  ascii(0, 'RIFF')
  view.setUint32(4, 36 + bytes, true)
  ascii(8, 'WAVE')
  ascii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // 한 채널
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  ascii(36, 'data')
  view.setUint32(40, bytes, true)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(44 + i * 2, s < 0 ? s * 32768 : s * 32767, true)
  }
  return new Blob([buffer], { type: 'audio/wav' })
}
