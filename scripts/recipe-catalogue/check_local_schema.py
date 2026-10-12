"""Replay recipe schemas and behavioral RLS tests in an isolated local transaction."""
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PSQL = Path('C:/Program Files/PostgreSQL/17/bin/psql.exe')
sql = ['begin;']
for name in ('local-bootstrap.sql', 'base-schema.sql', 'saved-base-schema.sql',
             'essentials-schema.sql', 'recipe-quality-gate.sql', 'community-schema.sql'):
    sql.append((ROOT / 'scripts/recipe-catalogue' / name).read_text(encoding='utf-8'))
sql.append((ROOT / 'scripts/recipe-catalogue/community-rls-check.sql').read_text(encoding='utf-8'))
sql.append((ROOT / 'scripts/recipe-catalogue/platform-rls-smoke.sql').read_text(encoding='utf-8'))
sql.append('rollback;')
result = subprocess.run([str(PSQL), '-X', '-h', '127.0.0.1', '-p', '55437',
                         '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'],
                        input='\n'.join(sql), text=True, capture_output=True)
if result.returncode:
    print(result.stdout[-3000:])
    print(result.stderr[-6000:])
    raise SystemExit(result.returncode)
print('PASS: isolated PostgreSQL schema replay and behavioral RLS checks (rolled back)')
