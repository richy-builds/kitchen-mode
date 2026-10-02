// Packs Alice's recorded pieces into voice/alice.mp3 and voice/alice.json, which build.mjs puts inside km.js.
//   node scripts/voice.mjs [fragments folder]     default: ../kitchen-mode-video/out/voices/frag
// The pieces come from kitchen-mode-video's scripts/voice.py (Kokoro-82M, voice bf_alice, Apache 2.0): every verb in
// VERB_RE ("v_cook"), "Step 1" to "Step 30" ("s_1"), and "Time's up" ("up"), as 24 kHz mono WAVs. Needs ffmpeg.
import { readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const dir = process.argv[2] || join(ROOT, '../kitchen-mode-video/out/voices/frag');
const RATE = 24000;
// Silence before each piece. MP3 decoders differ in how much start padding they keep, so km.js finds the first
// piece's real start (`first`, the first sample over `thr`) and shifts every offset by the same amount. The gap keeps
// a small shift playing silence rather than the end of the piece before.
const GAP = 0.1, THR = 0.01;

const pcm = file => {
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(RATE), '-f', 'f32le', '-'], { maxBuffer: 1 << 26 });
  return new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
};
// Keys km.js looks up: the verb as verbBefore() writes it, lower case, ASCII ("saute"); the step number; "up".
const key = name => name.replace(/^v_/, '').replace(/^s_/, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const names = readdirSync(dir).filter(n => n.endsWith('.wav')).sort();
const parts = [], clips = {};
let at = 0;
for (const name of names) {
  const x = pcm(join(dir, name)), gap = new Float32Array(Math.round(GAP * RATE));
  parts.push(gap, x);
  at += gap.length;
  clips[key(name.slice(0, -4))] = [+(at / RATE).toFixed(4), +(x.length / RATE).toFixed(4)];
  at += x.length;
}
parts.push(new Float32Array(Math.round(GAP * RATE)));
const all = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
parts.reduce((o, p) => (all.set(p, o), o + p.length), 0);
const first = +(all.findIndex(v => Math.abs(v) > THR) / RATE).toFixed(4);

mkdirSync(join(ROOT, 'voice'), { recursive: true });
const mp3 = join(ROOT, 'voice/alice.mp3');
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(RATE), '-ac', '1', '-i', '-',
  '-c:a', 'libmp3lame', '-b:a', '32k', '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact', mp3],
  { input: Buffer.from(all.buffer) });
writeFileSync(join(ROOT, 'voice/alice.json'), JSON.stringify({ first, thr: THR, clips }) + '\n');
console.log(`${names.length} pieces, ${(all.length / RATE).toFixed(1)} s -> voice/alice.mp3 and voice/alice.json`);
