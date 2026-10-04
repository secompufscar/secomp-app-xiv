const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Execute the component's filter with category/activity fixtures, without rendering React Native.
const source = fs.readFileSync(path.join(__dirname, '../src/components/activity/activityList.tsx'), 'utf8');
const ast = ts.createSourceFile('activityList.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let initializer;
function visit(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'getFilteredActivities') {
    initializer = node.initializer.getText(ast);
  }
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(initializer, 'ActivityList filter must exist');
const script = ts.transpileModule(`const filter = ${initializer}; filter();`, {
  compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText;
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const categories = ['Workshop', 'LualDAComp', 'Sociocultural', 'Credenciamento', 'Coffee', 'Outros', 'Palestras', 'Minicursos', 'Competições']
  .map((nome, index) => ({ id: `category-${index}`, nome }));
const activities = categories.map(c => ({ id: c.nome, categoriaId: c.id }));
const ids = result => Array.from(result, a => a.id);
function filter(selectedCategory, allCategories = categories, allActivities = activities, platform = 'web') {
  return vm.runInNewContext(script, { selectedCategory, allCategories, allActivities, normalize, Platform: { OS: platform } });
}

test('Outros reúne Workshop e todas as demais categorias do grupo', () => {
  assert.deepEqual(ids(filter('Outros')), activities.slice(0, 6).map(a => a.id));
});

test('Workshop e duas mesas continuam juntos com categorias em ordem diferente', () => {
  const fixture = [
    { id: 'karina-workshop', categoriaId: categories[0].id },
    { id: 'mesa-empreendedorismo', categoriaId: categories[5].id },
    { id: 'mesa-docencia', categoriaId: categories[5].id },
    { id: 'palestra', categoriaId: categories[6].id },
  ];
  assert.deepEqual(ids(filter('Outros', [...categories].reverse(), fixture)), fixture.slice(0, 3).map(a => a.id));
});

test('nomes normalizados aceitam caixa e acentos sem repetir atividades', () => {
  const fixture = [...categories.map(c => ({ ...c, nome: c.nome.toUpperCase() })), { id: 'another-workshop', nome: 'Wórkshop' }];
  assert.deepEqual(ids(filter('ÓUTROS', fixture)), activities.slice(0, 6).map(a => a.id));
});

test('abas de Palestras, Minicursos e Competições mantêm os respectivos resultados', () => {
  for (const name of ['Palestras', 'Minicursos', 'Competições']) {
    assert.deepEqual(ids(filter(name)), [name]);
  }
});

test('grupo parcial, categoria inexistente e ausência de filtro', () => {
  assert.deepEqual(ids(filter('Outros', [categories[5]])), ['Outros']);
  assert.deepEqual(ids(filter('Inexistente')), []);
  assert.deepEqual(ids(filter(undefined)), activities.map(a => a.id));
});

test('Android e iOS preservam o filtro existente nesta publicação exclusiva da web', () => {
  for (const platform of ['android', 'ios']) {
    assert.deepEqual(ids(filter('Outros', categories, activities, platform)), []);
    assert.deepEqual(ids(filter('Palestras', categories, activities, platform)), ['Palestras']);
  }
});
