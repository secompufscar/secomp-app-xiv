const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { createHash } = require('node:crypto');

test('assets do modelo V1 permanecem congelados para downloads historicos', () => {
  const hashes = {
    'dc.png': 'c9d61cc1ee2f950886cb3d198a64ab16ebab4226987c8fdfe3f24d31539f614a',
    'secomp.png': '6befe6ce9b0d59b4254a2bdce2a3b5fe9069fa8638a6ee0c30a4ecde9cbab39e',
    'ufscar.png': '0c60e0a11c519b1d390b3af17df672c655ec0edec93a71ede1fa2fe629c6b211',
    'Inter-Regular.ttf': '41ab0f707a2bfab8133ccdfcdab52282f5f79e5751f43a264805451c7bb95fb8',
    'Poppins-SemiBold.ttf': '248c0244b350ec68880996aa6be6d7796274b49992d5fcbbefe251906aa4ea36',
  };
  for (const [file, hash] of Object.entries(hashes)) {
    assert.equal(createHash('sha256').update(readFileSync(join(__dirname, '../assets/certificate/v1', file))).digest('hex'), hash,
      `${file}: crie outra versao do modelo em vez de substituir assets historicos`);
  }
});
