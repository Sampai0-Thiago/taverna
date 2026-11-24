import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isActiveMaster, sameFingerprint, tokenFingerprint } from '../src/utils/masterToken.js';

const SECRET = 'segredo-de-teste';

describe('token de mestre', () => {
  const current = tokenFingerprint('dragao-vermelho', SECRET);

  it('gera impressão digital determinística sem expor o token', () => {
    assert.equal(current, tokenFingerprint('dragao-vermelho', SECRET));
    assert.equal(current.length, 64);
    assert.ok(!current.includes('dragao'));
  });

  it('token errado ou segredo diferente não batem', () => {
    assert.equal(sameFingerprint(tokenFingerprint('dragao-azul', SECRET), current), false);
    assert.equal(sameFingerprint(tokenFingerprint('dragao-vermelho', 'outro'), current), false);
  });

  it('usuário é mestre só com o token vigente', () => {
    assert.equal(isActiveMaster({ master_token_fp: current }, current), true);
    assert.equal(isActiveMaster({ master_token_fp: null }, current), false);
    // trocar o MASTER_TOKEN no servidor revoga quem ativou com o token antigo
    const rotated = tokenFingerprint('novo-token', SECRET);
    assert.equal(isActiveMaster({ master_token_fp: current }, rotated), false);
  });
});
