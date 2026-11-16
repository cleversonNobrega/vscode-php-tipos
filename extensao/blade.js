// Comandos Blade: layout base, listagem, formulário, detalhe e componente.
const vscode = require('vscode');
const path = require('path');
const G = require('./gera');
const { pastaAlvo } = require('./novo').util;
const { pedeNome, pedeCampos, grava, layoutDoProjeto } = require('./laravel').util;

const NOME_MODEL = /^[A-Za-z][A-Za-z0-9_]*$/;
const MSG_MODEL = 'Use só letras e números (começando por letra)';

async function pedeModel() {
  const m = await pedeNome('Nome do Model no singular (ex.: Lead)', 'Ex.: Lead', NOME_MODEL, MSG_MODEL);
  return m ? G.nomes(G.studly(m)) : null;
}

async function layoutBase(uri) {
  const dir = pastaAlvo(uri); if (!dir) return;
  const n = await pedeNome('Nome do layout (ex.: app)', 'app', /^[A-Za-z0-9][A-Za-z0-9_-]*$/, 'Use letras, números, - e _', 'app');
  if (!n) return;
  await grava(path.join(dir, n + '.blade.php'), G.layoutBase());
}
async function listagem(uri) {
  const dir = pastaAlvo(uri); if (!dir) return;
  const n = await pedeModel(); if (!n) return;
  const campos = await pedeCampos(); if (!campos) return;
  await grava(path.join(dir, 'index.blade.php'), G.index(n, campos, layoutDoProjeto(dir)));
}
async function formulario(uri) {
  const dir = pastaAlvo(uri); if (!dir) return;
  const n = await pedeModel(); if (!n) return;
  const campos = await pedeCampos(); if (!campos) return;
  await grava(path.join(dir, 'form.blade.php'), G.formUnico(n, campos, layoutDoProjeto(dir)));
}
async function detalhe(uri) {
  const dir = pastaAlvo(uri); if (!dir) return;
  const n = await pedeModel(); if (!n) return;
  const campos = await pedeCampos(); if (!campos) return;
  await grava(path.join(dir, 'show.blade.php'), G.show(n, campos, layoutDoProjeto(dir)));
}
async function componente(uri) {
  const dir = pastaAlvo(uri); if (!dir) return;
  const n = await pedeNome('Nome do componente (ex.: card)', 'card', /^[A-Za-z0-9][A-Za-z0-9_-]*$/, 'Use letras, números, - e _');
  if (!n) return;
  await grava(path.join(dir, G.kebab(n) + '.blade.php'), G.componente());
}

exports.registrar = ctx => ctx.subscriptions.push(
  vscode.commands.registerCommand('phpTipos.blade.layoutBase', layoutBase),
  vscode.commands.registerCommand('phpTipos.blade.listagem', listagem),
  vscode.commands.registerCommand('phpTipos.blade.formulario', formulario),
  vscode.commands.registerCommand('phpTipos.blade.detalhe', detalhe),
  vscode.commands.registerCommand('phpTipos.blade.componente', componente));
