import { fileStorage } from '../../storage/fileStorage.js';
import { notFound } from '../../utils/errors.js';
import { assertCanManage } from '../../utils/permissions.js';
import { toUserRef } from '../users/users.mapper.js';
import { charactersRepository } from './characters.repository.js';

function toCharacterDTO(row) {
  return {
    id: row.id,
    name: row.name,
    className: row.class_name,
    race: row.race,
    level: row.level,
    summary: row.summary,
    portraitUrl: fileStorage.url(row.portrait_file),
    sheet: row.sheet_file
      ? { url: fileStorage.url(row.sheet_file), fileName: row.sheet_original_name ?? 'ficha.pdf' }
      : null,
    owner: toUserRef(row.owner_id, row.owner_name, row.owner_color, row.owner_avatar),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getOrFail(id) {
  const row = await charactersRepository.findById(id);
  if (!row) throw notFound('Personagem não encontrado');
  return row;
}

/** Extrai os arquivos enviados no multipart para o formato do repositório. */
function filesFrom(uploaded = {}) {
  return {
    portraitFile: uploaded.portrait,
    sheetFile: uploaded.sheet,
    sheetOriginalName: uploaded.sheetOriginalName,
  };
}

export const charactersService = {
  async list() {
    return (await charactersRepository.list()).map(toCharacterDTO);
  },

  async get(id) {
    return toCharacterDTO(await getOrFail(id));
  },

  async create(user, data, uploaded) {
    return toCharacterDTO(await charactersRepository.create(user.id, { ...data, ...filesFrom(uploaded) }));
  },

  async update(user, id, data, uploaded) {
    const current = await getOrFail(id);
    assertCanManage(user, current.owner_id, 'Só o dono do personagem ou o mestre pode editá-lo.');
    const files = filesFrom(uploaded);
    const updated = await charactersRepository.update(id, { ...data, ...files });
    // arquivos substituídos são apagados somente após o banco confirmar a troca
    await fileStorage.removeMany([
      files.portraitFile && current.portrait_file,
      files.sheetFile && current.sheet_file,
    ]);
    return toCharacterDTO(updated);
  },

  async remove(user, id) {
    const current = await getOrFail(id);
    assertCanManage(user, current.owner_id, 'Só o dono do personagem ou o mestre pode excluí-lo.');
    await charactersRepository.remove(id);
    await fileStorage.removeMany([current.portrait_file, current.sheet_file]);
  },
};
