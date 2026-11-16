// Comandos Laravel: Model, Migration, Request, Service, Controller resource e Recurso completo.
const vscode = require('vscode');
const fs = require('fs'), path = require('path');
const G = require('./gera');
const { pastaAlvo, namespaceDe, psr4 } = require('./novo').util;
const BS = G.BS;

// ---------- leitura do projeto ----------
function raizProjeto(dir) {
  for (let d = dir; ; d = path.dirname(d)) {
    if (fs.existsSync(path.join(d, 'composer.json'))) return d;
    if (path.dirname(d) === d) return null;
  }
}
function mapaPrincipal(dir) {
  const m = psr4(dir);
  return m.find(([pre]) => !/test/i.test(pre)) || m[0] || null; // [prefixo, pasta]
}
const semBarra = s => s.split(BS).filter(Boolean).join(BS);
function achaArquivo(base, nome, prof = 4) {
  let itens; try { itens = fs.readdirSync(base, { withFileTypes: true }); } catch { return null; }
  for (const i of itens) if (i.isFile() && i.name === nome) return path.join(base, nome);
  if (prof === 0) return null;
  for (const i of itens) {
    if (i.isDirectory() && !['vendor', 'node_modules', 'storage', '.git'].includes(i.name)) {
      const r = achaArquivo(path.join(base, i.name), nome, prof - 1); if (r) return r;
    }
  }
  return null;
}
// onde fica (ou ficaria) o Model e qual o namespace dele
function infoModel(dir, model) {
  const mp = mapaPrincipal(dir);
  if (!mp) return { ns: null, dir: path.join(raizProjeto(dir) || dir, 'app', 'Models') };
  const [pre, base] = mp;
  const achado = model ? achaArquivo(base, model + '.php') : null;
  if (achado) return { ns: namespaceDe(path.dirname(achado)), dir: path.dirname(achado) };
  const d = path.join(base, 'Models');
  return { ns: semBarra(pre) + BS + 'Models', dir: d };
}
function layoutDoProjeto(dir) {
  const raiz = raizProjeto(dir);
  if (raiz) {
    const l = path.join(raiz, 'resources', 'views', 'layouts');
    try {
      const arqs = fs.readdirSync(l).filter(f => f.endsWith('.blade.php')).sort();
      const nome = arqs.includes('app.blade.php') ? 'app' : arqs[0] && arqs[0].replace(/\.blade\.php$/, '');
      if (nome) return 'layouts.' + nome;
    } catch {}
  }
  return 'layouts.app';
}

// ---------- entradas ----------
const NOME_CLASSE = /^[A-Za-z][A-Za-z0-9_]*(\.php)?$/;
const MSG_CLASSE = 'Use só letras, números e _ (começando por letra)';
async function pedeNome(prompt, placeHolder, regex, msg, value) {
  const v = await vscode.window.showInputBox({ prompt, placeHolder, value, validateInput: t => (regex.test(t.trim()) ? null : msg) });
  return v ? v.trim() : null;
}
// devolve array (vazio se em branco) ou null se cancelou
async function pedeCampos() {
  const v = await vscode.window.showInputBox({
    prompt: 'Campos (opcional) — nome:tipo[:nullable][:unique], separados por vírgula',
    placeHolder: 'Ex.: name:string, email:string:unique, valor:decimal:nullable, ativo:boolean, company_id:foreignId',
    validateInput: t => { try { G.parseCampos(t); return null; } catch (e) { return e.message; } },
  });
  if (v === undefined) return null;
  return G.parseCampos(v);
}
async function grava(arq, texto, abrir = true) {
  if (fs.existsSync(arq)) { vscode.window.showErrorMessage(`${path.basename(arq)} já existe aqui.`); return false; }
  fs.mkdirSync(path.dirname(arq), { recursive: true });
  fs.writeFileSync(arq, texto, 'utf8');
  if (abrir) await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(arq));
  return true;
}
const limpa = n => G.studly(n.replace(/\.php$/i, ''));
const nsDe = dir => namespaceDe(dir);
const cab = ns => ns; // legibilidade

// ---------- comandos simples ----------
async function novoModel(uri) {
  const dir = pastaAlvo(uri); if (!dir) return;
  let n = await pedeNome('Nome do Model (singular)', 'Ex.: Lead', NOME_CLASSE, MSG_CLASSE); if (!n) return;
  n = limpa(n);
  const campos = await pedeCampos(); if (!campos) return;
  await grava(path.join(dir, n + '.php'), G.model(nsDe(dir), n, campos));
}
async function novoRequest(uri) {
  const dir = pastaAlvo(uri); if (!dir) return;
  let n = await pedeNome('Nome do Request', 'Ex.: LeadRequest', NOME_CLASSE, MSG_CLASSE); if (!n) return;
  n = limpa(n).replace(/request$/i, '') + 'Request';
  const campos = await pedeCampos(); if (!campos) return;
  const base = n.replace(/Request$/, '').replace(/^(Store|Update|Create|Edit)/, '') || n;
  await grava(path.join(dir, n + '.php'), G.request(nsDe(dir), n, G.nomes(base), campos));
}
async function novoService(uri) {
  const dir = pastaAlvo(uri); if (!dir) return;
  let n = await pedeNome('Nome do Service', 'Ex.: LeadScoringService', NOME_CLASSE, MSG_CLASSE); if (!n) return;
  n = limpa(n).replace(/service$/i, '') + 'Service';
  const ns = nsDe(dir);
  await grava(path.join(dir, n + '.php'), `${'<?php\n\ndeclare(strict_types=1);\n\n'}${ns ? `namespace ${ns};\n\n` : ''}class ${n}\n{\n    //\n}\n`);
}
function dataHora() {
  const d = new Date(), p = x => String(x).padStart(2, '0');
  return `${d.getFullYear()}_${p(d.getMonth() + 1)}_${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}
async function novaMigration(uri) {
  const dir = pastaAlvo(uri); if (!dir) return;
  let n = await pedeNome('Nome da migration (snake_case)', 'Ex.: create_leads_table  ou  add_status_to_leads_table',
    /^[A-Za-z][A-Za-z0-9_ \-]*$/, 'Use letras, números e _ (ex.: create_leads_table)'); if (!n) return;
  n = G.snake(n);
  const m1 = n.match(/^create_(\w+)_table$/), m2 = n.match(/^(?:add|update|alter|change|remove|drop)_\w+?_(?:to|from|in)_(\w+)_table$/);
  let texto;
  if (m1) { const campos = await pedeCampos(); if (!campos) return; texto = G.migrationCria(m1[1], campos); }
  else if (m2) texto = G.migrationAltera(m2[1]);
  else texto = G.migrationVazia();
  await grava(path.join(dir, `${dataHora()}_${n}.php`), texto);
}

// ---------- Controller resource ----------
async function novoControllerResource(uri) {
  const dir = pastaAlvo(uri); if (!dir) return;
  let n = await pedeNome('Nome do Controller resource (ex.: Lead → LeadController)', 'Ex.: Lead', NOME_CLASSE, MSG_CLASSE); if (!n) return;
  n = limpa(n).replace(/controller$/i, '');
  const mm = await pedeNome('Model usado pelo controller', 'Ex.: Lead', NOME_CLASSE, MSG_CLASSE, n); if (!mm) return;
  const model = limpa(mm);
  const campos = await pedeCampos(); if (!campos) return;
  const espaco = nsDe(dir) || '';
  const mp = mapaPrincipal(dir);
  const baseNs = mp ? semBarra(mp[0]) + BS + 'Http' + BS + 'Controllers' : null;
  const texto = G.controllerResource({
    ns: espaco, nome: n + 'Controller', n: G.nomes(model), campos, baseNs,
    api: /(^|\\)Api(\\|$)/.test(espaco), modelNs: infoModel(dir, model).ns,
  });
  await grava(path.join(dir, n + 'Controller.php'), texto);
}

// ---------- Recurso completo ----------
async function recursoCompleto(uri) {
  const dir = pastaAlvo(uri); if (!dir) return;
  const raiz = raizProjeto(dir), mp = mapaPrincipal(dir);
  if (!raiz || !mp) { vscode.window.showErrorMessage('Não achei o composer.json do projeto (preciso dele para saber os namespaces).'); return; }
  const [pre, appDir] = mp;
  let m = await pedeNome('Nome do Model (singular) — cria Model, Migration, Request, Controller e Views', 'Ex.: Lead', NOME_CLASSE, MSG_CLASSE);
  if (!m) return;
  const model = limpa(m), n = G.nomes(model);
  const campos = await pedeCampos(); if (!campos) return;
  const tipo = await vscode.window.showQuickPick(
    [{ label: 'Web (Blade)', descricao: 'Controller com views Blade', api: false }, { label: 'API (JSON)', descricao: 'Controller que devolve JSON', api: true }],
    { placeHolder: 'Tipo do controller' });
  if (!tipo) return;

  const mi = infoModel(dir, null);                      // pasta e namespace do Model novo
  const reqDir = path.join(appDir, 'Http', 'Requests');
  const ctlBase = path.join(appDir, 'Http', 'Controllers');
  let ctlDir = ctlBase;
  if (tipo.api) ctlDir = fs.existsSync(path.join(ctlBase, 'Api', 'V1')) ? path.join(ctlBase, 'Api', 'V1') : path.join(ctlBase, 'Api');
  const migDir = path.join(raiz, 'database', 'migrations');
  const viewDir = path.join(raiz, 'resources', 'views', n.rota);
  const layout = layoutDoProjeto(dir);
  const reqNome = model + 'Request', ctlNome = model + 'Controller';

  const arquivos = [
    [path.join(mi.dir, model + '.php'), G.model(mi.ns, model, campos)],
    [path.join(migDir, `${dataHora()}_create_${n.tabela}_table.php`), G.migrationCria(n.tabela, campos)],
    [path.join(reqDir, reqNome + '.php'), G.request(namespaceDe(reqDir), reqNome, n, campos)],
    [path.join(ctlDir, ctlNome + '.php'), G.controllerResource({
      ns: namespaceDe(ctlDir), nome: ctlNome, n, campos, api: tipo.api,
      baseNs: semBarra(pre) + BS + 'Http' + BS + 'Controllers', modelNs: mi.ns,
      requestNs: namespaceDe(reqDir), requestClass: reqNome,
    })],
  ];
  if (!tipo.api) {
    arquivos.push(
      [path.join(viewDir, 'index.blade.php'), G.index(n, campos, layout)],
      [path.join(viewDir, '_form.blade.php'), G.formParcial(n, campos)],
      [path.join(viewDir, 'create.blade.php'), G.paginaForm(n, layout, false)],
      [path.join(viewDir, 'edit.blade.php'), G.paginaForm(n, layout, true)],
      [path.join(viewDir, 'show.blade.php'), G.show(n, campos, layout)]);
  }
  const jaExistem = arquivos.filter(([f]) => fs.existsSync(f)).map(([f]) => path.relative(raiz, f));
  if (jaExistem.length) {
    vscode.window.showErrorMessage('Nada foi criado, porque já existem: ' + jaExistem.join(', '));
    return;
  }
  for (const [f, t] of arquivos) await grava(f, t, false);
  const ctlArq = path.join(ctlDir, ctlNome + '.php');
  await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(ctlArq));
  const rota = tipo.api
    ? `Route::apiResource('${n.rota}', ${ctlNome}::class);`
    : `Route::resource('${n.rota}', ${ctlNome}::class);`;
  try { await vscode.env.clipboard.writeText(rota); } catch {}
  vscode.window.showInformationMessage(
    `Criados ${arquivos.length} arquivos para ${model}. Linha de rota copiada: ${rota} (cole em routes/${tipo.api ? 'api' : 'web'}.php e importe o ${ctlNome}).`);
}

exports.registrar = ctx => ctx.subscriptions.push(
  vscode.commands.registerCommand('phpTipos.novo.model', novoModel),
  vscode.commands.registerCommand('phpTipos.novo.migration', novaMigration),
  vscode.commands.registerCommand('phpTipos.novo.request', novoRequest),
  vscode.commands.registerCommand('phpTipos.novo.service', novoService),
  vscode.commands.registerCommand('phpTipos.novo.controllerResource', novoControllerResource),
  vscode.commands.registerCommand('phpTipos.novo.recursoCompleto', recursoCompleto));
exports.util = { pedeNome, pedeCampos, grava, layoutDoProjeto };
