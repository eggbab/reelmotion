import { describe, expect, it } from 'vitest'
import { FILE_EXPORT_SECONDS, pickerTypes, savePicker, writesToFile } from './saveTarget'

describe('내보낸 영상을 둘 곳', () => {
  it('10분이 넘고 파일 저장 창이 있는 브라우저에서만 파일에 바로 쓴다', () => {
    expect(FILE_EXPORT_SECONDS).toBe(600)
    expect(writesToFile(601, true)).toBe(true)
    expect(writesToFile(600, true)).toBe(false)
    expect(writesToFile(1800, false)).toBe(false)
  })

  it('저장 창의 꼴', () => {
    expect(pickerTypes('mp4')[0].accept).toEqual({ 'video/mp4': ['.mp4'] })
    expect(pickerTypes('webm')[0].accept).toEqual({ 'video/webm': ['.webm'] })
  })

  it('창이 없는 곳(서버·시험)에서는 null', () => {
    expect(savePicker()).toBeNull()
  })
})
