import { rename, unlink } from 'node:fs/promises';
import sharp from 'sharp';

/**
 * Regrava a imagem enviada SEM metadados (LGPD — minimização de dados).
 *
 * Fotos de celular carregam EXIF com localização GPS, modelo do aparelho, data/hora e,
 * às vezes, nome do autor. Sem esta etapa, quem abrisse o avatar ou o retrato de alguém
 * poderia descobrir onde a foto foi tirada (ex.: a casa da pessoa).
 *
 * - A orientação do EXIF é aplicada aos pixels antes de ser descartada (a foto não "deita").
 * - O formato original é mantido (PNG continua PNG etc.); GIF/WebP animados continuam animados.
 * - limitInputPixels barra "bombas de descompressão" (imagens minúsculas que expandem para GB na memória).
 * - Como a imagem é decodificada e codificada de novo, conteúdo escondido após a imagem
 *   (arquivos poliglotas) também é descartado.
 */
const MAX_PIXELS = 50_000_000; // ~ 8000 x 6000

const ENCODERS = {
  png: (img) => img.png({ compressionLevel: 9 }),
  jpeg: (img) => img.jpeg({ quality: 88, mozjpeg: true }),
  webp: (img) => img.webp({ quality: 88 }),
  gif: (img) => img.gif(),
};

/** @param {string} filePath caminho do arquivo (substituído no lugar) @param {'png'|'jpeg'|'webp'|'gif'} format */
export async function stripImageMetadata(filePath, format) {
  const encode = ENCODERS[format];
  if (!encode) throw new Error(`Formato de imagem não suportado: ${format}`);

  const animated = format === 'gif' || format === 'webp';
  const tmp = `${filePath}.clean`;
  try {
    // .rotate() sem argumentos aplica a orientação do EXIF; a saída do sharp não leva metadados.
    await encode(sharp(filePath, { animated, limitInputPixels: MAX_PIXELS }).rotate()).toFile(tmp);
    await rename(tmp, filePath);
  } catch (error) {
    await unlink(tmp).catch(() => {});
    throw error;
  }
}
