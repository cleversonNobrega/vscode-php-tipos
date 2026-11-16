const vscode = require('vscode');
const fs = require('fs'), path = require('path');

function psr4(dir) {
  // acha composer.json subindo as pastas e devolve {raiz, mapas:[[prefixo, pasta]]}
  for (let d = dir; ; d = path.dirname(d)) {
    const f = path.join(d, 'composer.json');
    if (fs.existsSync(f)) {
      try {
        const c = JSON.parse(fs.readFileSync(f, 'utf8'));
        const m = { ...(c.autoload || {})['psr-4'], ...(c['autoload-dev'] || {})['psr-4'] };
        return Object.entries(m).map(([pre, p]) => [pre, path.resolve(d, [].concat(p)[0])]);
      } catch { return []; }
    }
    if (path.dirname(d) === d) return [];
  }
}
function namespaceDe(dir) {
  let melhor = null;
  for (const [pre, base] of psr4(dir)) {
    const rel = path.relative(base, dir);
    if (rel.startsWith('..') || path.isAbsolute(rel)) continue;
    if (!melhor || base.length > melhor[1].length) melhor = [pre, base, rel];
  }
  if (!melhor) return null;
  const partes = melhor[2] ? melhor[2].split(path.sep) : [];
  const BS = String.fromCharCode(92);
  const pre = melhor[0].split(BS).filter(Boolean).join(BS);
  return [pre, ...partes].filter(Boolean).join(BS);
}
function prefixoPrincipal(dir) {
  const BS = String.fromCharCode(92);
  const m = psr4(dir).find(([pre]) => !/test/i.test(pre)) || psr4(dir)[0];
  return m ? m[0].split(BS).filter(Boolean).join(BS) : 'App';
}
function corpo(tipo, nome, ns, dir) {
  const G = require('./gera');
  const cab = G.abertura() + (ns ? `namespace ${ns};\n\n` : '');
  switch (tipo) {
    case 'controller': {
      const BS = String.fromCharCode(92);
      const ctl = [prefixoPrincipal(dir), 'Http', 'Controllers'].join(BS);
      const req = 'use Illuminate' + BS + 'Http' + BS + 'Request;\n\n';
      const uso = ns && ns !== ctl ? 'use ' + ctl + BS + 'Controller;\n' + req : (ns ? req : '');
      return `${cab}${uso}class ${nome} extends Controller\n{\n    //\n}\n`;
    }
    case 'arquivo': return G.abertura();
    case 'class': return `${cab}class ${nome}\n{\n    //\n}\n`;
    case 'interface': return `${cab}interface ${nome}\n{\n    //\n}\n`;
    case 'trait': return `${cab}trait ${nome}\n{\n    //\n}\n`;
    case 'enum': return `${cab}enum ${nome}\n{\n    //\n}\n`;
  }
}
function pastaAlvo(uri) {
  let dir = uri && uri.fsPath;
  if (!dir) { const f = vscode.workspace.workspaceFolders; if (!f) return null; dir = f[0].uri.fsPath; }
  if (fs.existsSync(dir) && fs.statSync(dir).isFile()) dir = path.dirname(dir);
  return dir;
}
async function criarBlade(uri, modelo) {
  const dir = pastaAlvo(uri);
  if (!dir) return;
  let nome = await vscode.window.showInputBox({
    prompt: `Nome da view Blade (em ${path.basename(dir)})`,
    placeHolder: 'Ex.: index  ou  lead-form',
    validateInput: v => /^[A-Za-z0-9][A-Za-z0-9_-]*(\.blade)?(\.php)?$/.test(v.trim()) ? null : 'Use letras, números, - e _ (sem espaços)'
  });
  if (!nome) return;
  nome = nome.trim().replace(/(\.blade)?(\.php)?$/i, '');
  const arq = path.join(dir, nome + '.blade.php');
  if (fs.existsSync(arq)) { vscode.window.showErrorMessage(`${nome}.blade.php já existe aqui.`); return; }
  const texto = modelo === 'layout'
    ? `@extends('${require('./gera').cfg.layout || 'layouts.app'}')\n\n@section('content')\n    \n@endsection\n`
    : '';
  fs.writeFileSync(arq, texto, 'utf8');
  await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(arq));
}
async function criar(tipo, uri) {
  const dir = pastaAlvo(uri);
  if (!dir) return;
  const rotulo = { arquivo: 'Arquivo PHP', controller: 'Controller', class: 'Classe', interface: 'Interface', trait: 'Trait', enum: 'Enum' }[tipo];
  let nome = await vscode.window.showInputBox({
    prompt: `Nome da ${rotulo} (em ${path.basename(dir)})`,
    placeHolder: tipo === 'controller' ? 'Ex.: LeadController' : 'Ex.: NomeDoArquivo',
    validateInput: v => /^[A-Za-z_][A-Za-z0-9_]*(\.php)?$/.test(v.trim()) ? null : 'Use só letras, números e _ (começando por letra)'
  });
  if (!nome) return;
  nome = nome.trim().replace(/\.php$/i, '');
  if (tipo !== 'arquivo') {
    // PSR-1/Laravel: nome de classe em StudlyCase (lead_form -> LeadForm, teste2 -> Teste2)
    nome = nome.split('_').filter(Boolean).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  }
  if (tipo === 'controller') nome = nome.replace(/controller$/i, '') + 'Controller';
  const arq = path.join(dir, nome + '.php');
  if (fs.existsSync(arq)) { vscode.window.showErrorMessage(`${nome}.php já existe aqui.`); return; }
  fs.writeFileSync(arq, corpo(tipo, nome, namespaceDe(dir), dir), 'utf8');
  await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(arq));
}
exports.util = { pastaAlvo, namespaceDe, psr4 };
exports.registrar = ctx => {
  ['arquivo', 'controller', 'class', 'interface', 'trait', 'enum'].forEach(t =>
    ctx.subscriptions.push(vscode.commands.registerCommand('phpTipos.novo.' + t, u => criar(t, u))));
  ctx.subscriptions.push(
    vscode.commands.registerCommand('phpTipos.novo.blade', u => criarBlade(u, 'vazio')),
    vscode.commands.registerCommand('phpTipos.novo.bladeLayout', u => criarBlade(u, 'layout')));
};
