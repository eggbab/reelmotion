/**
 * 내보낸 영상을 어디에 둘까. 보통은 메모리에 모아 「내려받기」 단추로 준다. 긴 영상(10분 넘게)은 다 만든 영상이
 * 수백 MB(10분 720p 에 214MB, 30분 1080p 면 1GB 가까이)라 메모리에 쥐면 브라우저가 멈출 수 있어서,
 * 파일 저장 창을 여는 브라우저(컴퓨터의 크롬·엣지)에서는 저장할 파일을 먼저 고르고 그 파일에 바로 써 나간다(exportVideo 의 file).
 */
export const FILE_EXPORT_SECONDS = 600

type PickerOptions = { suggestedName: string; types: { description: string; accept: Record<string, string[]> }[] }
type Picker = (options: PickerOptions) => Promise<FileSystemFileHandle>

/** 파일 저장 창(File System Access API). 없는 브라우저(사파리·파이어폭스·휴대폰)는 null */
export function savePicker(): Picker | null {
  if (typeof window === 'undefined') return null
  const picker = (window as unknown as { showSaveFilePicker?: Picker }).showSaveFilePicker
  return typeof picker === 'function' ? picker.bind(window) : null
}

/** 고른 파일에 바로 쓸까 */
export function writesToFile(durationSeconds: number, hasPicker: boolean): boolean {
  return hasPicker && durationSeconds > FILE_EXPORT_SECONDS
}

/** 저장 창에 보일 꼴 */
export function pickerTypes(extension: 'mp4' | 'webm'): PickerOptions['types'] {
  return extension === 'mp4' ? [{ description: 'MP4 video', accept: { 'video/mp4': ['.mp4'] } }] : [{ description: 'WebM video', accept: { 'video/webm': ['.webm'] } }]
}
