import sqlite3
import json

db_path = r'C:\Users\rosha\.gemini\antigravity-ide\conversations\f758131a-8e56-4e14-8e3e-e57a4a6b175b.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT idx, step_type, step_payload, metadata FROM steps WHERE idx = 906")
row = cursor.fetchone()
if row:
    print('idx:', row[0])
    print('step_type:', row[1])
    payload = row[2]
    metadata = row[3]
    if isinstance(payload, bytes):
        print('payload bytes len:', len(payload))
        # try saving or inspect
        try:
            print('payload text:', payload.decode('utf-8')[:300])
        except Exception as e:
            print('payload is binary:', e)
            # check if payload contains image magic bytes (PNG: \x89PNG, JPEG: \xff\xd8\xff, WebP: RIFF...WEBP)
            if b'PNG' in payload:
                print('PNG detected in payload!')
            if b'WEBP' in payload:
                print('WEBP detected in payload!')
            if b'\xff\xd8\xff' in payload:
                print('JPEG detected in payload!')
    elif isinstance(payload, str):
        print('payload str len:', len(payload))
        print('payload snippet:', payload[:300])
