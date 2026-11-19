import { DatabaseSync } from 'node:sqlite'

/**
 * 앱 서버의 저장소: SQLite 파일 하나(운영은 볼륨 /data/reelmotion.db — 백업은 이 파일을 복사, docs/operations.md).
 * 판을 올릴 때는 MIGRATIONS 끝에 하나를 더한다(이미 쓴 것은 고치지 않는다).
 * 저장하는 것: 계정(구글 id·메일·이름·요금제), 로그인 세션(토큰은 해시만), 로그인 중인 요청(10분), 작업(영상 제외), 월별 내보내기 수,
 * 공지 하나(관리자 화면에서 쓴 글 — 개인정보 아님), 문의(내용과 적었으면 답장 받을 메일 — inbox.ts, 3년), 쓰임 숫자(날짜·이름·브라우저 종류·횟수)와 브라우저 오류(오류 글·쪽 주소·브라우저 종류·판 —
 * 누구인지는 없다, pulse.ts). 커넥터 초안은 여기 두지 않는다(백업에 들어가지 않게 따로 — connect.ts).
 * 바꾸면 개인정보처리방침(src/site/legal/privacy.ts)도 함께 고친다.
 */
const MIGRATIONS: string[] = [
  `
  create table users (
    id text primary key,
    google_sub text unique,
    email text not null unique,
    name text not null default '',
    created_at integer not null,
    plan text not null default 'free',
    plan_until integer
  );
  create table sessions (
    token_hash text primary key,
    user_id text not null references users(id) on delete cascade,
    created_at integer not null,
    expires_at integer not null
  );
  create index sessions_user on sessions(user_id);
  create table oauth_states (
    state text primary key,
    nonce text not null,
    verifier text not null,
    next text not null,
    created_at integer not null
  );
  create table projects (
    user_id text not null references users(id) on delete cascade,
    id text not null,
    updated_at integer not null,
    data text not null,
    primary key (user_id, id)
  );
  create table usage (
    user_id text not null references users(id) on delete cascade,
    month text not null,
    exports integer not null default 0,
    primary key (user_id, month)
  );
  `,
  // 2026-11-15: 공지(관리자 화면에서 쓰고 사이트·편집기 위에 보인다). 한 줄뿐이다.
  `
  create table notice (
    id integer primary key check (id = 1),
    active integer not null default 0,
    level text not null default 'info',
    text_ko text not null default '',
    text_en text not null default '',
    text_ja text not null default '',
    updated_at integer not null default 0
  );
  insert into notice (id) values (1);
  `,
  // 2026-11-15: 운영자가 고장과 쓰임을 보는 숫자(pulse.ts). 누가 했는지는 넣을 칸이 없다.
  `
  create table pulse_daily (
    day text not null,
    event text not null,
    agent text not null,
    count integer not null default 0,
    primary key (day, event, agent)
  );
  create table client_errors (
    fingerprint text primary key,
    message text not null,
    stack text not null default '',
    page text not null default '',
    agent text not null default '',
    version text not null default '',
    count integer not null default 1,
    first_at integer not null,
    last_at integer not null
  );
  create index client_errors_last on client_errors(last_at);
  `,
  // 4. 문의하기(inbox.ts): 종류·내용·답장 받을 메일(적었을 때만)·화면 언어·보낸 쪽. 3년 두고 지운다.
  `
  create table contact_messages (
    id integer primary key autoincrement,
    created_at integer not null,
    kind text not null,
    body text not null,
    email text,
    lang text not null default 'en',
    page text not null default '',
    done_at integer
  );
  create index contact_messages_created on contact_messages(created_at);
  `,
]

export type Db = DatabaseSync

export function openDb(path: string): Db {
  const db = new DatabaseSync(path)
  db.exec('PRAGMA foreign_keys = ON')
  db.exec('PRAGMA busy_timeout = 3000')
  if (path !== ':memory:') db.exec('PRAGMA journal_mode = WAL')
  migrate(db)
  return db
}

function migrate(db: Db) {
  db.exec('create table if not exists meta (key text primary key, value text not null)')
  const row = db.prepare("select value from meta where key = 'schema'").get() as { value: string } | undefined
  for (let version = row ? Number(row.value) : 0; version < MIGRATIONS.length; version++) {
    db.exec('BEGIN')
    try {
      db.exec(MIGRATIONS[version])
      db.prepare("insert into meta (key, value) values ('schema', ?) on conflict(key) do update set value = excluded.value").run(String(version + 1))
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  }
}

export type UserRow = { id: string; google_sub: string | null; email: string; name: string; created_at: number; plan: string; plan_until: number | null }
