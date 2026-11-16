// Testes de unidade dos geradores (sem VS Code). Uso: node extensao/testes/unidade.js
const assert = require('assert');
const G = require('../gera');

G.configurar({ plural: 'pt-BR', custom: {}, strict: true, layout: 'layouts.app' });
const pt = { Contato: 'contatos', Item: 'itens', Animal: 'animais', Acao: 'acaos', Lead: 'leads', Mulher: 'mulheres', Cliente: 'clientes', Onibus: 'onibus' };
for (const [s, p] of Object.entries(pt)) assert.strictEqual(G.nomes(s).tabela, p, `plural pt de ${s}`);
assert.strictEqual(G.nomes('Quantidade').rota, 'quantidades');
assert.strictEqual(G.nomes('ContatoTeste').rota, 'contato-testes');
assert.strictEqual(G.nomes('ContatoTeste').vp, 'contatoTestes');
assert.strictEqual(G.nomes('Contato').titulo, 'Contatos');

G.configurar({ plural: 'en' });
assert.strictEqual(G.nomes('Category').tabela, 'categories');
assert.strictEqual(G.nomes('Box').tabela, 'boxes');

G.configurar({ plural: 'pt-BR', custom: { Pessoa: 'pessoas', Mao: 'maos' } });
assert.strictEqual(G.nomes('Mao').tabela, 'maos');
assert.strictEqual(G.nomes('Pessoa').rota, 'pessoas');

G.configurar({ strict: false });
assert.ok(!G.model('App\\Models', 'X', []).includes('strict_types'), 'strict desligado');
G.configurar({ strict: true });
assert.ok(G.model('App\\Models', 'X', []).includes('declare(strict_types=1);'), 'strict ligado');

const campos = G.parseCampos('name:string, email:unique, valor:decimal:nullable, company_id');
assert.deepStrictEqual(campos.map(c => [c.nome, c.tipo, c.nulo, c.unico]),
  [['name', 'string', false, false], ['email', 'string', false, true], ['valor', 'decimal', true, false], ['company_id', 'foreignId', false, false]]);
assert.throws(() => G.parseCampos('x:inexistente'), /Tipo desconhecido/);
assert.throws(() => G.parseCampos('1abc:string'), /inválido/);
console.log('unidade OK');
