# Runs INSIDE the outreach app container (deploy/smtp-from-outreach.ps1 copies it there).
# Prints the mail account outreach itself uses for its service mail - the Gmail connected to the
# outreach admin account, or SYSTEM_GMAIL_* if the outreach .env sets it - as four KEY=value lines
# for ReelMotion's deploy/.env. The caller redirects the output into the file, so the app password
# is never shown on screen. ASCII only: Windows PowerShell 5 reads BOM-less files as ANSI.
import os
import sys

# Same as outreach's own ops scripts (.github/ops/*.py): the app lives in /app inside the container.
sys.path.insert(0, os.environ.get("OUTREACH_APP_DIR", "/app"))

from app.core.database import SessionLocal  # noqa: E402
from app.services.system_mail import resolve_system_account  # noqa: E402


def quote(value: str) -> str:
    # Compose reads a single-quoted .env value literally (no $ expansion).
    if "'" in value or "\n" in value or "\r" in value:
        raise SystemExit("the mail password contains a quote or a line break: put it in deploy/.env by hand")
    return "'" + value + "'"


def main() -> int:
    db = SessionLocal()
    try:
        found = resolve_system_account(db)
    finally:
        db.close()
    if not found:
        print("outreach has no sending mail account (connect a mailbox in the admin account's settings first)", file=sys.stderr)
        return 2
    email, password, server = found
    # Gmail shows an app password as four groups; the spaces are not part of it.
    if server.smtp_host == "smtp.gmail.com":
        password = password.replace(" ", "")
    print("SMTP_HOST=" + server.smtp_host)
    print("SMTP_PORT=" + str(server.smtp_port))
    print("SMTP_USER=" + quote(email))
    print("SMTP_PASS=" + quote(password))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
