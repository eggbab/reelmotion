import { DatabaseSync } from 'node:sqlite'

/**
 * 앱 서버의 저장소: SQLite 파일 하나(운영은 볼륨 /data/reelmotion.db — 백업은 이 파일을 복사, docs/operations.md).
 * 판을 올릴 때는 MIGRATIONS 끝에 하나를 더한다(이미 쓴 것은 고치지 않는다).
 * 저장하는 것: 계정(구글 id·메일·이름·요금제), 로그인 세션(토큰은 해시만), 로그인 중인 요청(10분), 작업(영상 제외), 월별 내보내기 수.
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
