import { useSyncExternalStore } from 'react'

/**
 * 「앱으로 설치」: 크롬·엣지(컴퓨터·안드로이드)는 설치할 수 있을 때 사건(beforeinstallprompt)을 보내 준다 —
 * 그것을 잡아 두었다가 우리 단추를 누를 때 설치 창을 띄운다. 사파리·파이어폭스는 이 사건이 없어 도움말의 순서를 안내한다.
 */
type InstallEvent = Event & { prompt(): Promise<unknown>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let pending: InstallEvent | null = null
const listeners = new Set<() => void>()
const emit = () => {
  for (const listener of listeners) listener()
}

/** main.tsx 가 화면을 그리기 전에 한 번 부른다(사건이 화면보다 먼저 올 수 있다). */
export function watchInstall(): void {
  window.addEventListener('beforeinstallprompt', (event) => {
    // 브라우저가 스스로 띄우는 작은 안내 대신 우리 단추로 연다.
    event.preventDefault()
    pending = event as InstallEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    pending = null
    emit()
  })
}

export function canPromptInstall(): boolean {
  return pending !== null
}

/** 지금 설치 창을 띄울 수 있는지(미리 그린 HTML 과 처음 그림에서는 늘 false) */
export function useCanInstall(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    canPromptInstall,
    () => false,
  )
}

/** 설치 창을 띄운다. 한 번 쓴 사건은 다시 쓸 수 없어 비운다(브라우저가 다시 보내 주면 또 잡는다). */
export async function promptInstall(): Promise<void> {
  const event = pending
  if (!event) return
  pending = null
  emit()
  await event.prompt()
  await event.userChoice.catch(() => null)
}
