import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('flak sustain loop contains no release tail or recurring quiet gap', () => {
  const wav = readFileSync(new URL('../src/assets/audio/flak-burst-loop.wav', import.meta.url));
  let data;
  for (let offset = 12; offset + 8 <= wav.length;) {
    const length = wav.readUInt32LE(offset + 4);
    if (wav.toString('ascii', offset, offset + 4) === 'data') { data = wav.subarray(offset + 8, offset + 8 + length); break; }
    offset += 8 + length + length % 2;
  }
  assert.ok(data);
  data = Buffer.concat([data, data, data]); // Include both circular joins in the measurement.
  const rms = [];
  // Real cannon pulses have gaps between individual shots; check 100 ms rather than MG-like 40 ms energy.
  const windowBytes = 9600;
  for (let i = 0; i + windowBytes <= data.length; i += windowBytes / 2) {
    let sum = 0;
    for (let j = i; j < i + windowBytes; j += 2) sum += data.readInt16LE(j) ** 2;
    rms.push(Math.sqrt(sum / (windowBytes / 2)));
  }
  assert.ok(20 * Math.log10(Math.max(...rms) / Math.min(...rms)) < 10,
    'every 100 ms window must retain steady gunfire energy, including the loop transition');
});
