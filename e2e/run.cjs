// 화면 시험을 차례로 돌리고 통과·실패 수를 모아 보여 준다. 스택이 떠 있어야 한다(e2e/README.md).
//   node e2e/run.cjs                 기본 묶음
//   node e2e/run.cjs phone connect   고른 것만
//   E2E_ENFORCED=1 node e2e/run.cjs  요금제 한도를 켠 스택(ENFORCE_PLANS=1)에서: plans · admin
const { spawnSync } = require('node:child_process')
const path = require('node:path')

/** 기본 설정(베타: 요금제 한도 꺼짐)으로 띄운 스택에서 도는 것. 앞의 것일수록 빠르다. */
const BASIC = ['landing', 'help', 'faqhelp', 'aspect', 'timeline', 'projects', 'accounts', 'notice', 'admin', 'pulse', 'connect', 'connect-limits', 'chat', 'ai-picks', 'faces', 'phone', 'pwa']
/** 요금제 한도를 켠 스택에서 도는 것 */
const ENFORCED = ['plans', 'admin']

const picked = process.argv.slice(2)
const names = picked.length > 0 ? picked : process.env.E2E_ENFORCED === '1' ? ENFORCED : BASIC
const rows = []
for (const name of names) {
  const started = Date.now()
  const run = spawnSync(process.execPath, [path.join(__dirname, 'tests', `${name}.cjs`)], { encoding: 'utf8', timeout: 15 * 60 * 1000 })
  const output = `${run.stdout ?? ''}${run.stderr ?? ''}`
  const pass = (output.match(/^PASS/gm) ?? []).length
  const failed = output.split('\n').filter((line) => /^FAIL/.test(line))
  const errors = /^ERRORS:/m.test(output)
  const crashed = run.status !== 0
  rows.push({ name, pass, fail: failed.length, crashed, errors, seconds: Math.round((Date.now() - started) / 1000) })
  console.log(`${crashed || failed.length > 0 || errors ? '✗' : '✓'} ${name.padEnd(16)} 통과 ${String(pass).padStart(3)} · 실패 ${failed.length}${crashed ? ` · 멈춤(종료 ${run.status ?? '시간 초과'})` : ''}${errors ? ' · 화면 오류 있음' : ''} · ${rows[rows.length - 1].seconds}초`)
  for (const line of failed) console.log(`    ${line}`)
  if (crashed || errors) console.log(output.trim().split('\n').slice(-12).map((line) => `    ${line}`).join('\n'))
}
const bad = rows.filter((row) => row.crashed || row.fail > 0 || row.errors)
console.log(`\n${rows.length}개 시험 · 확인 ${rows.reduce((sum, row) => sum + row.pass, 0)}개 통과 · ${bad.length === 0 ? '모두 통과' : `문제: ${bad.map((row) => row.name).join(', ')}`}`)
process.exit(bad.length === 0 ? 0 : 1)
