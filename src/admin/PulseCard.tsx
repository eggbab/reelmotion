import { useEffect, useRef, useState } from 'react'
import { fill } from '../langs'
import { agentLabel } from './agent'
import { fetchPulse } from './api'
import type { AdminPulse } from './api'
import type { AdminCopy } from './copy'

const zero = (value: number) => (value === 0 ? '·' : value.toLocaleString('en-US'))

/** 쓰임 숫자: 최근 7일 동안 무엇이 몇 번 있었나, 어느 브라우저에서 내보내기가 되고 안 되나. 누가 했는지는 서버에도 없다. */
export function PulseCard({ copy }: { copy: AdminCopy }) {
  const [data, setData] = useState<AdminPulse | 'loading' | 'failed'>('loading')
  // 좁은 화면에서는 표가 가로로 밀린다 — 가장 최근 날짜와 합계(오른쪽 끝)가 먼저 보이게 밀어 두고,
  // 밀리는 동안만 이름 칸을 붙여 둔다(is-wide — 넓은 화면에서는 붙일 까닭이 없다)
  const daysTable = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const box = daysTable.current
    if (!box) return
    const fit = () => {
      const wide = box.scrollWidth > box.clientWidth + 1
      box.classList.toggle('is-wide', wide)
      if (wide) box.scrollLeft = box.scrollWidth
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [data])
  useEffect(() => {
    let alive = true
    void fetchPulse().then((value) => {
      if (alive) setData(value ?? 'failed')
    })
    return () => {
      alive = false
    }
  }, [])
  if (data === 'loading') return null
  const text = copy.pulse
  if (data === 'failed') {
    return (
      <section className="account-card">
        <h2>{text.title}</h2>
        <p className="account-note is-error">{copy.failed}</p>
      </section>
    )
  }
  const any = data.events.some((row) => row.total > 0)
  return (
    <section className="account-card">
      <h2>{text.title}</h2>
      <p className="account-note">{text.note}</p>
      {any ? (
        <div className="admin-table-wrap" ref={daysTable}>
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">{text.what}</th>
                {data.days.map((day) => (
                  <th key={day} scope="col">
                    {`${Number(day.slice(5, 7))}/${Number(day.slice(8, 10))}`}
                  </th>
                ))}
                <th scope="col">{text.total}</th>
              </tr>
            </thead>
            <tbody>
              {data.events.map((row) => (
                <tr key={row.event} className={row.total === 0 ? 'is-empty' : undefined}>
                  <th scope="row">{text.events[row.event]}</th>
                  {row.counts.map((count, i) => (
                    <td key={data.days[i]}>{zero(count)}</td>
                  ))}
                  <td>
                    <strong>{zero(row.total)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="account-note">{text.empty}</p>
      )}
      {data.exports.length > 0 && (
        <>
          <h3 className="admin-subtitle">{text.exportsTitle}</h3>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">{text.browser}</th>
                  <th scope="col">{text.started}</th>
                  <th scope="col">{text.done}</th>
                  <th scope="col">{text.failed}</th>
                  <th scope="col">{text.unsupported}</th>
                </tr>
              </thead>
              <tbody>
                {data.exports.map((row) => (
                  <tr key={row.agent}>
                    <th scope="row">{agentLabel(row.agent, text)}</th>
                    <td>{zero(row.started)}</td>
                    <td>{zero(row.done)}</td>
                    <td className={row.failed > 0 ? 'is-bad' : undefined}>{zero(row.failed)}</td>
                    <td className={row.unsupported > 0 ? 'is-bad' : undefined}>{zero(row.unsupported)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {data.bots > 0 && <p className="account-note">{fill(text.bots, { n: data.bots.toLocaleString('en-US') })}</p>}
    </section>
  )
}
