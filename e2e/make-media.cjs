// 화면 시험에 넣을 영상 둘을 만든다(ffmpeg 필요). 저장소의 예시 영상을 이어 붙이고 소리(낮은 음)를 넣는다 —
// 내보내기 시험이 소리까지 보기 때문이다. 말소리는 들어 있지 않다(받아쓰기 정확도는 이 시험들이 재지 않는다).
//   e2e/media/talk.mp4    24초 · 1280×720 · 소리 있음
//   e2e/media/long70.mp4  70초 · 1280×720 · 소리 있음(무료 요금제의 1분 한도, 긴 영상의 타임라인 밀기·확대)
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const out = path.join(__dirname, 'media')
fs.mkdirSync(out, { recursive: true })

function make(name, clip, seconds, tone) {
  const target = path.join(out, name)
  execFileSync(
    'ffmpeg',
    [
      '-y', '-v', 'error',
      '-stream_loop', String(Math.ceil(seconds / 10)), '-i', path.join(root, 'public', 'media', clip),
      '-f', 'lavfi', '-i', `sine=frequency=${tone}:sample_rate=48000`,
      '-t', String(seconds), '-map', '0:v:0', '-map', '1:a:0',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-pix_fmt', 'yuv420p', '-r', '30',
      '-c:a', 'aac', '-b:a', '96k', '-af', 'volume=0.05', '-movflags', '+faststart',
      target,
    ],
    { stdio: 'inherit' },
  )
  console.log(`${path.relative(root, target)} · ${(fs.statSync(target).size / 1e6).toFixed(1)}MB`)
}

make('talk.mp4', 'podcast-a.mp4', 24, 220)
make('long70.mp4', 'studio.mp4', 70, 330)
