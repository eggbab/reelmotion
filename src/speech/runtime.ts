/**
 * 브라우저 안 받아쓰기의 실행 파일(onnxruntime 의 .mjs·.wasm) 중 어느 판을 쓸지.
 * @huggingface/transformers 는 원래 이 파일을 jsDelivr(바깥 회사)에서 받는데, 우리는 같은 파일을 이 사이트에서 준다
 * (whisper.worker.ts — 개인정보처리방침의 바깥 회사는 모델 파일을 주는 Hugging Face 하나). 판을 고르는 기준은
 * 라이브러리와 같게 둔다: 사파리 26 미만이고 WebGPU 가 없으면 asyncify 가 아닌 판(transformers.web.js 의 isSafariBelow26).
 * 라이브러리를 올릴 때 이 기준이 바뀌었는지 확인한다.
 */
export function pickRuntimeFiles(userAgent: string, vendor: string, hasWebGpu: boolean): 'plain' | 'asyncify' {
  const safari = vendor.includes('Apple') && !/CriOS|FxiOS|EdgiOS|OPiOS|mercury|brave/i.test(userAgent) && !userAgent.includes('Chrome') && !userAgent.includes('Android')
  const version = /Version\/(\d+)/.exec(userAgent)
  const below26 = safari && version !== null && Number(version[1]) < 26
  return below26 && !hasWebGpu ? 'plain' : 'asyncify'
}
