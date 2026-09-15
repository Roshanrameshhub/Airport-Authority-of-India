import sqlite3
import json
import os

db_path = r'C:\Users\rosha\.gemini\antigravity-ide\conversations\f758131a-8e56-4e14-8e3e-e57a4a6b175b.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
print('Tables:', tables)

for t in tables:
    tname = t[0]
    cursor.execute(f"PRAGMA table_info({tname})")
    cols = [c[1] for c in cursor.fetchall()]
    print(f"\nTable {tname}: {cols}")
    cursor.execute(f"SELECT COUNT(*) FROM {tname}")
    count = cursor.fetchone()[0]
    print(f"Row count: {count}")

# Check for blob columns or media
for t in tables:
    tname = t[0]
    cursor.execute(f"SELECT * FROM {tname} LIMIT 5")
    rows = cursor.fetchall()
    for r in rows:
        for idx, val in enumerate(r):
            if isinstance(val, bytes) and len(val) > 1000:
                print(f"Found large blob in {tname}, col {idx}, size: {len(val)}")
            elif isinstance(val, str) and ('.png' in val.lower() or '.jpg' in val.lower() or '.webp' in val.lower()):
                print(f"Found image string in {tname}: {val[:200]}")
