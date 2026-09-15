const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: fs.createReadStream('C:/Users/rosha/.gemini/antigravity-ide/brain/f758131a-8e56-4e14-8e3e-e57a4a6b175b/.system_generated/logs/transcript_full.jsonl')
});

rl.on('line', (line) => {
  try {
    const obj = JSON.parse(line);
    if (obj.step_index === 906) {
      console.log('Keys:', Object.keys(obj));
      const str = JSON.stringify(obj);
      const regex = /([a-zA-Z]:[\\\/][^"'\n\r]+\.(png|jpg|jpeg|webp))/gi;
      let m;
      while ((m = regex.exec(str)) !== null) {
        console.log('Matched image path:', m[0]);
      }
      if (obj.media_paths) console.log('media_paths:', obj.media_paths);
      if (obj.content && typeof obj.content === 'string') {
        const lines = obj.content.split('\n');
        for (const l of lines) {
          if (l.includes('png') || l.includes('jpg') || l.includes('webp') || l.includes('image')) {
            console.log('Content line with image:', l);
          }
        }
      }
    }
  } catch (e) {}
});
