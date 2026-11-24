import assert from 'node:assert/strict';
import { it } from 'node:test';
import { detectFileType } from '../src/utils/fileSignature.js';

const bytes = (...arr) => Uint8Array.from(arr);
const ascii = (s) => [...s].map((c) => c.charCodeAt(0));

it('reconhece PNG, JPEG, GIF, WEBP e PDF pelos magic bytes', () => {
  assert.equal(detectFileType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)), 'png');
  assert.equal(detectFileType(bytes(0xff, 0xd8, 0xff, 0xe0)), 'jpeg');
  assert.equal(detectFileType(bytes(...ascii('GIF89a'))), 'gif');
  assert.equal(detectFileType(bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP'))), 'webp');
  assert.equal(detectFileType(bytes(...ascii('%PDF-1.7'))), 'pdf');
});

it('rejeita conteúdo disfarçado', () => {
  assert.equal(detectFileType(bytes(...ascii('<html><script>'))), null);
  assert.equal(detectFileType(bytes(...ascii('MZ'))), null);
});
