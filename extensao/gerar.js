// Gera tema.json = Material Icon Theme + ícones C/I/T/E por arquivo .php
const fs = require('fs'), path = require('path'), os = require('os');
const AQUI = __dirname;
const IGNORAR = new Set(['vendor', 'node_modules', 'storage', '.git', '.claude', 'bootstrap', 'dist', 'build']);

function achaMaterial() {
  const ext = path.join(os.homedir(), '.vscode', 'extensions');
  const c = fs.readdirSync(ext).filter(n => n.startsWith('pkief.material-icon-theme-')).sort();
  if (!c.length) throw new Error('Material Icon Theme não instalado');
  return path.join(ext, c[c.length - 1]);
}

function tipoDoArquivo(arq) {
  let t;
  try { t = fs.readFileSync(arq, 'utf8').slice(0, 20000); } catch { return null; }
  t = t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*(\/\/|#).*$/gm, '');
  const m = t.match(/^[ \t]*(?:(?:abstract|final|readonly)[ \t]+)*(class|interface|trait|enum)[ \t]+\w+/m);
  return m ? m[1] : null;
}

function varre(dir, saida) {
  let itens; try { itens = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const i of itens) {
    if (i.isDirectory()) { if (!IGNORAR.has(i.name)) varre(path.join(dir, i.name), saida); }
    else if (i.name.endsWith('.php') && !i.name.endsWith('.blade.php')) {
      const tp = tipoDoArquivo(path.join(dir, i.name));
      if (tp) saida[path.join(dir, i.name)] = tp;
    }
  }
}

function gerar(raizes) {
  const cacheArq = path.join(AQUI, 'cache.json');
  let cache = {};
  if (raizes.length) {
    // só as pastas abertas agora: acumular todos os projetos já abertos deixa o tema enorme
    // (milhares de nomes) e o navegador do VS Code deixa de aplicar os últimos da lista
    for (const r of raizes) varre(r, cache);
    fs.writeFileSync(cacheArq, JSON.stringify(cache, null, 1));
  } else {
    // sem pasta aberta: mantém o que já havia, sem arquivos apagados
    try { cache = JSON.parse(fs.readFileSync(cacheArq, 'utf8')); } catch {}
    for (const k of Object.keys(cache)) if (!fs.existsSync(k)) delete cache[k];
  }

  const mat = achaMaterial();
  const base = JSON.parse(fs.readFileSync(path.join(mat, 'dist', 'material-icons.json'), 'utf8'));
  const matIcons = path.join(mat, 'icons');
  // aponta para os ícones do Material em vez de copiar (caminho relativo ao tema)
  const rel = path.relative(AQUI, matIcons).split(path.sep).join('/');
  for (const d of Object.values(base.iconDefinitions)) {
    if (d.iconPath) d.iconPath = d.iconPath.replace(/^\.\/\.\.\/icons\//, rel + '/');
  }
  for (const t of ['class', 'interface', 'trait', 'enum'])
    base.iconDefinitions['php-' + t] = { iconPath: './icons/php-' + t + '.svg' };
  base.fileNames = base.fileNames || {};
  const porNome = {};
  for (const [arq, tp] of Object.entries(cache)) porNome[path.basename(arq)] = tp;
  for (const [nome, tp] of Object.entries(porNome)) base.fileNames[nome] = 'php-' + tp;
  const saida = JSON.stringify(base);
  const out = path.join(AQUI, 'tema.json');
  let antigo = ''; try { antigo = fs.readFileSync(out, 'utf8'); } catch {}
  if (antigo === saida) return false;
  fs.writeFileSync(out, saida);
  return true;
}
module.exports = { gerar };
if (require.main === module) {
  const r = process.argv.slice(2).map(p => path.resolve(p));
  const mudou = gerar(r);
  let total = 0;
  try { total = Object.keys(JSON.parse(fs.readFileSync(path.join(AQUI, 'cache.json'), 'utf8'))).length; } catch {}
  console.log(mudou ? 'tema atualizado' : 'sem mudanças', total, 'arquivos PHP com tipo');
}
