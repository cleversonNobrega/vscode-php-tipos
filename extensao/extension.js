const vscode = require('vscode');
const { gerar } = require('./gerar');
const ID = 'php-tipos-icones';
let timer, ocupado = false;

// Troca o tema por um instante para o VS Code reler tema.json sem recarregar a janela.
async function reaplicaTema() {
  if (ocupado) return;
  ocupado = true;
  try {
    const cfg = vscode.workspace.getConfiguration('workbench');
    await cfg.update('iconTheme', 'material-icon-theme', vscode.ConfigurationTarget.Global);
    await new Promise(r => setTimeout(r, 400));
    await cfg.update('iconTheme', ID, vscode.ConfigurationTarget.Global);
  } catch (e) {
    console.error('php-tipos-icones', e);
  } finally { ocupado = false; }
}

function rodar() {
  const raizes = (vscode.workspace.workspaceFolders || []).map(f => f.uri.fsPath);
  let mudou = false;
  try { mudou = gerar(raizes); } catch (e) { console.error('php-tipos-icones', e); return; } // sem pasta aberta também regera (ex.: Material atualizou)
  const tema = vscode.workspace.getConfiguration('workbench').get('iconTheme');
  if (!mudou || tema !== ID) return;
  if (vscode.workspace.getConfiguration('phpTipos').get('atualizarIconesSozinho', true)) {
    reaplicaTema();
  } else {
    vscode.window.showInformationMessage('Ícones PHP atualizados. Recarregar a janela para aplicar?', 'Recarregar')
      .then(r => { if (r) vscode.commands.executeCommand('workbench.action.reloadWindow'); });
  }
}

// Lê as configurações phpTipos.* e entrega aos geradores (plural, strict_types, layout).
function aplicaConfig() {
  const c = vscode.workspace.getConfiguration('phpTipos');
  require('./gera').configurar({
    plural: c.get('plural', 'pt-BR'),
    custom: c.get('pluraisPersonalizados', {}),
    strict: c.get('strictTypes', true),
    layout: c.get('layoutPadrao', 'layouts.app'),
  });
}

exports.activate = ctx => {
  aplicaConfig();
  ctx.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => { if (e.affectsConfiguration('phpTipos')) aplicaConfig(); }));
  require('./novo').registrar(ctx);
  require('./laravel').registrar(ctx);
  require('./blade').registrar(ctx);
  rodar();
  const agenda = () => { clearTimeout(timer); timer = setTimeout(rodar, 1000); };
  const w = vscode.workspace.createFileSystemWatcher('**/*.php');
  ctx.subscriptions.push(w, w.onDidCreate(agenda), w.onDidDelete(agenda), w.onDidChange(agenda));
};
exports.deactivate = () => clearTimeout(timer);
