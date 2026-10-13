const assert = require('node:assert/strict');
const { test } = require('node:test');
const path = require('node:path');
const policy = require('./helpers/load-typescript.cjs').loadTypescript(path.resolve(__dirname, '../src/utils/activityCertification.ts'));
const activity = { nome: 'Palestra', categoria: { nome: 'Palestras', slug: 'palestras' }, durationMinutes: 60, durationSource: 'Programação oficial', certificateExcluded: false };

test('formulário preserva configuração oficial existente e distingue legado pendente', () => {
  const form = policy.certificationForm(activity);
  assert.equal(policy.certificationChanged(form, activity), false);
  assert.deepEqual(policy.certificationPayload(form, activity), { durationMinutes: 60, durationSource: 'Programação oficial', certificateExcluded: false });
  assert.equal(policy.certificationChanged({ ...form, minutes: '180' }, activity), true);
  assert.equal(policy.activityCertificationLabel(activity), '60 min · Certificável');
  assert.equal(policy.activityCertificationLabel({ nome: 'Legado' }), 'Duração não cadastrada · Certificação pendente');
});

test('não certificável mantém duração e validação rejeita valor parcial, zero, decimal e decisão ausente', () => {
  const form = policy.certificationForm(activity);
  assert.equal(policy.certificationPayload({ ...form, certifiable: false }, activity).durationMinutes, 60);
  assert.equal(policy.activityCertificationLabel({ ...activity, certificateExcluded: true }), '60 min · Não certificável');
  for (const minutes of ['', '0', '1.5', '60min', '10081']) assert.throws(() => policy.certificationPayload({ ...form, minutes }, activity));
  assert.throws(() => policy.certificationPayload({ ...form, certifiable: null }, activity));
});

test('atividades obrigatoriamente excluídas não ganham horas com escolha Sim', () => {
  for (const nome of ['Abertura', 'Encerramento', 'Camisetas', 'Coffee Break', 'Lual', 'Feira da Comp + Enterprise Day']) {
    const excluded = { ...activity, nome };
    assert.equal(policy.certificationPayload(policy.certificationForm(activity), excluded).certificateExcluded, true);
    assert.equal(policy.activityCertificationLabel(excluded), '60 min · Não certificável');
  }
  assert.equal(policy.certificationPayload(policy.certificationForm(activity), { ...activity, categoria: { nome: 'Credenciamento', slug: 'credenciamento-xiv' } }).certificateExcluded, true);
});
