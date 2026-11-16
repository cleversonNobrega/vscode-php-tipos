// Teste dos geradores com um VS Code simulado. Uso: node testes/teste.js
const Module = require('module'), fs = require('fs'), path = require('path'), os = require('os'), cp = require('child_process');
const resp = [], cmds = {}; let clip = '';
const fake = {
  window: { showInputBox: async () => resp.shift(), showQuickPick: async () => resp.shift(), showTextDocument: async () => {}, showErrorMessage: m => console.log('ERRO:', m), showInformationMessage: () => {} },
  workspace: { workspaceFolders: [], openTextDocument: async () => ({}), getConfiguration: () => ({ get: () => null }) },
  commands: { registerCommand: (n, f) => { cmds[n] = f; return {}; } }, env: { clipboard: { writeText: async t => { clip = t; } } },
};
const o = Module._load; Module._load = function (r, ...a) { return r === 'vscode' ? fake : o.call(this, r, ...a); };
const AQUI = path.join(__dirname, '..');
require(AQUI + '/laravel.js').registrar({ subscriptions: [] }); require(AQUI + '/blade.js').registrar({ subscriptions: [] });
const raiz = fs.mkdtempSync(path.join(os.tmpdir(), 'lar-'));
const mk = (p, t = '') => { fs.mkdirSync(path.dirname(path.join(raiz, p)), { recursive: true }); fs.writeFileSync(path.join(raiz, p), t); };
mk('composer.json', JSON.stringify({ autoload: { 'psr-4': { ['App' + String.fromCharCode(92)]: 'app/' } } })); mk('app/Models/.keep'); mk('app/Http/Controllers/.keep');
mk('resources/views/layouts/principal.blade.php'); mk('database/migrations/.keep');
const campos = 'name:string, email:string:unique, valor:decimal:nullable, ativo:boolean, obs:text:nullable, nasc:date:nullable, company_id:foreignId, dados:json:nullable';
(async () => {
  const run = async (c, dir, ...r) => { resp.push(...r); await cmds['phpTipos.' + c]({ fsPath: path.join(raiz, dir) }); };
  await run('novo.recursoCompleto', 'app', 'lead', campos, { label: 'Web', api: false });
  await run('novo.recursoCompleto', 'app', 'Cliente', 'name:string', { label: 'API', api: true });
  await run('novo.controllerResource', 'app/Http/Controllers', 'Avulso', 'Avulso', 'name:string:unique');
  await run('novo.migration', 'database/migrations', 'add_status_to_leads_table');
  await run('blade.formulario', 'resources/views', 'Lead', campos);
  const lista = []; (function v(d) { for (const i of fs.readdirSync(d, { withFileTypes: true })) i.isDirectory() ? v(path.join(d, i.name)) : lista.push(path.join(d, i.name)); })(raiz);
  let ok = true;
  for (const f of lista.filter(f => f.endsWith('.php') && !f.endsWith('.blade.php'))) {
    const r = cp.spawnSync('php', ['-l', f], { encoding: 'utf8' });
    if (r.status !== 0) { ok = false; console.log('FALHOU php -l', path.relative(raiz, f), r.stdout + r.stderr); }
  }
  console.log(lista.map(f => path.relative(raiz, f)).join('\n')); console.log('rota:', clip); console.log(ok ? 'PHP OK' : 'PHP COM ERRO');
  console.log('DIR=' + raiz);
})();
