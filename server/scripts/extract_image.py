import sqlite3

db_path = r'C:\Users\rosha\.gemini\antigravity-ide\conversations\f758131a-8e56-4e14-8e3e-e57a4a6b175b.db'
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT idx, step_type, step_payload, metadata FROM steps WHERE idx = 906")
row = cursor.fetchone()
payload = row[2]

print("Payload total length:", len(payload))
jpeg_start = payload.find(b'\xff\xd8\xff')
print("JPEG start offset:", jpeg_start)

if jpeg_start != -1:
    # Find JPEG end \xff\xd9
    jpeg_end = payload.rfind(b'\xff\xd9')
    print("JPEG end offset:", jpeg_end)
    if jpeg_end != -1:
        jpeg_data = payload[jpeg_start : jpeg_end + 2]
        print("Extracted JPEG length:", len(jpeg_data))
        with open(r'c:\Users\rosha\Downloads\aai\server\sample_data\uploaded_image.jpg', 'wb') as f:
            f.write(jpeg_data)
        print("Saved to server/sample_data/uploaded_image.jpg successfully!")
