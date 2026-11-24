import { fileStorage } from '../../storage/fileStorage.js';
import { badRequest, notFound } from '../../utils/errors.js';
import { toUserRef } from '../users/users.mapper.js';
import { mediaRepository } from './media.repository.js';

function toMediaDTO(row) {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    description: row.description,
    imageUrl: fileStorage.url(row.image_file),
    pinCount: row.pin_count,
    uploadedBy: toUserRef(row.uploaded_by, row.uploader_name, row.uploader_color, row.uploader_avatar),
    createdAt: row.created_at,
  };
}

function toPinDTO(row) {
  return {
    id: row.id,
    x: Number(row.x),
    y: Number(row.y),
    label: row.label,
    description: row.description,
    createdBy: toUserRef(row.created_by, row.creator_name, row.creator_color, row.creator_avatar),
    createdAt: row.created_at,
  };
}

async function getOrFail(id) {
  const row = await mediaRepository.findById(id);
  if (!row) throw notFound('Imagem não encontrada');
  return row;
}

export const mediaService = {
  async list(kind) {
    return (await mediaRepository.list(kind)).map(toMediaDTO);
  },

  async get(id) {
    const row = await getOrFail(id);
    const pins = row.kind === 'map' ? (await mediaRepository.listPins(id)).map(toPinDTO) : [];
    return { ...toMediaDTO(row), pins };
  },

  async create(user, data, uploaded) {
    if (!uploaded?.image) throw badRequest('Envie a imagem no campo "image".');
    return toMediaDTO(await mediaRepository.create({ ...data, imageFile: uploaded.image }, user.id));
  },

  // Escrita restrita ao mestre na rota (requireRole('master')).
  async update(_user, id, data, uploaded) {
    const current = await getOrFail(id);
    const updated = await mediaRepository.update(id, { ...data, imageFile: uploaded?.image });
    if (uploaded?.image) await fileStorage.remove(current.image_file);
    return toMediaDTO(updated);
  },

  async remove(_user, id) {
    const current = await getOrFail(id);
    await mediaRepository.remove(id); // pins caem junto (ON DELETE CASCADE)
    await fileStorage.remove(current.image_file);
  },

  async addPin(user, assetId, data) {
    const asset = await getOrFail(assetId);
    if (asset.kind !== 'map') throw badRequest('Marcadores só podem ser adicionados em mapas.');
    return toPinDTO(await mediaRepository.createPin(assetId, data, user.id));
  },

  async removePin(_user, assetId, pinId) {
    const pin = await mediaRepository.findPin(assetId, pinId);
    if (!pin) throw notFound('Marcador não encontrado');
    await mediaRepository.removePin(pinId);
  },
};
