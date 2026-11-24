/**
 * Detecta o tipo real de um arquivo pelos "magic bytes", sem confiar
 * no Content-Type nem na extensão enviados pelo cliente.
 * Função pura — testada em tests/fileSignature.test.js.
 *
 * @param {Uint8Array} bytes primeiros bytes do arquivo (16 são suficientes)
 * @returns {'png'|'jpeg'|'gif'|'webp'|'pdf'|null}
 */
export function detectFileType(bytes) {
  const startsWith = (sig, offset = 0) => sig.every((b, i) => bytes[offset + i] === b);
  const ascii = (str) => [...str].map((c) => c.charCodeAt(0));

  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (startsWith([0xff, 0xd8, 0xff])) return 'jpeg';
  if (startsWith(ascii('GIF87a')) || startsWith(ascii('GIF89a'))) return 'gif';
  if (startsWith(ascii('RIFF')) && startsWith(ascii('WEBP'), 8)) return 'webp';
  if (startsWith(ascii('%PDF-'))) return 'pdf';
  return null;
}

export const IMAGE_TYPES = new Set(['png', 'jpeg', 'gif', 'webp']);
export const PDF_TYPES = new Set(['pdf']);
