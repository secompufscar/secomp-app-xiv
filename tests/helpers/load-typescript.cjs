const fs = require('node:fs'), path = require('node:path'), Module = require('node:module'), ts = require('typescript');

function loadTypescript(filename, cache = new Map()) {
  filename = path.resolve(filename);
  if (cache.has(filename)) return cache.get(filename).exports;
  const compiled = new Module(filename, module);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(path.dirname(filename));
  cache.set(filename, compiled);
  const originalRequire = compiled.require.bind(compiled);
  compiled.require = request => {
    const source = request.startsWith('.') ? path.resolve(path.dirname(filename), request) + '.ts' : null;
    return source && fs.existsSync(source) ? loadTypescript(source, cache) : originalRequire(request);
  };
  compiled._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText, filename);
  return compiled.exports;
}

module.exports = { loadTypescript };
