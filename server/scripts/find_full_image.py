import sqlite3
import os
import glob

# 1. Check all tables in db for larger blobs or file paths
db_path = r'C:\Users\rosha\.gemini\antigravity-ide\conversations\f758131a-8e56-4e14-8e3e-e57a4a6b175b.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT idx, length(step_payload), length(metadata) FROM steps WHERE length(step_payload) > 100000 OR length(metadata) > 100000")
print("Steps with large payload/metadata:", cursor.fetchall())

# Look for string containing input_file_path or similar
cursor.execute("SELECT idx, step_payload, metadata FROM steps WHERE idx = 906")
r = cursor.fetchone()
if r:
    meta = r[2]
    if isinstance(meta, bytes):
        for s in [b'file:', b'C:', b'Users', b'.png', b'.jpg', b'.jpeg', b'.webp']:
            pos = 0
            while True:
                pos = meta.find(s, pos)
                if pos == -1:
                    break
                snippet = meta[max(0, pos-20) : min(len(meta), pos+150)]
                print(f"Found {s} in metadata:", snippet)
                pos += len(s)

# Also check other files in C:\Users\rosha\.gemini
print("\nSearching .gemini directory...")
for root, dirs, files in os.walk(r'C:\Users\rosha\.gemini'):
    for f in files:
        if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            fp = os.path.join(root, f)
            sz = os.path.getsize(fp)
            if sz > 20000:
                print(f"Image in .gemini: {fp} ({sz} bytes)")
