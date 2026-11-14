/** 말소리 인식이 받는 소리 형식: 1초에 16000개, 한 채널. */
const SAMPLE_RATE = 16000

export class NoAudioError extends Error {}

/** 영상(또는 소리) 파일에서 소리만 꺼내 인식용 형식으로 바꾼다. 파일은 이 브라우저 안에서만 다룬다. */
export async function decodeToMono16k(file: Blob): Promise<Float32Array> {
  const context = new AudioContext()
  try {
    let decoded: AudioBuffer
    try {
      decoded = await context.decodeAudioData(await file.arrayBuffer())
    } catch {
      throw new NoAudioError()
    }
    const frames = Math.ceil(decoded.duration * SAMPLE_RATE)
    if (frames === 0) throw new NoAudioError()
    const offline = new OfflineAudioContext(1, frames, SAMPLE_RATE)
    const source = offline.createBufferSource()
    source.buffer = decoded
    source.connect(offline.destination)
    source.start()
    const rendered = await offline.startRendering()
    return rendered.getChannelData(0)
  } finally {
    void context.close()
  }
}
