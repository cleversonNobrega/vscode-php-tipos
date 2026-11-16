# vscode-php-tipos

Extensão pessoal do VS Code para PHP/Laravel **e** a configuração do editor, para manter tudo versionado.

## O que a extensão faz

- **Tema de ícones "Material + PHP Tipos (anel)"**: Material Icon Theme + ícones C (classe), I (interface), T (trait) e E (enum), escolhidos lendo o conteúdo de cada `.php`. O tema é refeito sozinho ao criar ou apagar arquivos.
- **Botão direito em uma pasta**, três submenus (cada item só aparece na pasta que combina; `phpTipos.mostrarTudo` mostra todos):
  - **Novo PHP**: Arquivo PHP, Controller, Classe, Interface, Trait, Enum.
  - **Novo Laravel**: Recurso completo (Model, Migration, Request, Controller, Views), Controller resource, Model, Migration, Request, Service.
  - **Novo Blade**: layout base, listagem, formulário, detalhe, componente, view em branco e com `@extends`.
- Pergunta os campos (`name:string, email:string:unique, valor:decimal:nullable, ativo:boolean, company_id:foreignId`) e monta migration, `$fillable`/`casts`, regras de validação e telas.

Depois de instalar, escolha o tema em *Preferências: Tema de Ícones de Arquivo*. Requer o Material Icon Theme (vem como dependência).

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `extensao/` | Código da extensão (`package.json`, `extension.js`, geradores, ícones, testes) |
| `configuracao/` | `settings.json` do usuário, `extensoes.txt` (extensões do marketplace) e `instalar.ps1` |
| `scripts/empacotar.py` | Gera o `.vsix` sem baixar nada da internet |

## Manutenção

**Testar os geradores** (VS Code simulado, num projeto Laravel temporário; precisa de PHP no PATH):

```bash
node extensao/testes/teste.js
```

**Gerar o instalador** (`dist/php-tipos-icones-<versão>.vsix`; precisa de Node e do Material Icon Theme instalado):

```bash
python scripts/empacotar.py
```

**Instalar:**

```bash
code --install-extension dist/php-tipos-icones-0.0.1.vsix --force
```

Ao mudar o código, suba a `version` no `extensao/package.json` antes de empacotar.

### Mapa do código

- `extensao/gera.js`: geradores de texto (Model, Migration, Request, Controller, Blade), sem depender do VS Code.
- `extensao/laravel.js` e `extensao/blade.js`: comandos e perguntas.
- `extensao/novo.js`: comandos de PHP (Controller, Classe, Interface, Trait, Enum, Arquivo) e funções de namespace (PSR-4).
- `extensao/gerar.js`: monta o tema de ícones lendo o Material Icon Theme.
- `extensao/extension.js`: ativação, observação de arquivos e troca do tema.

## Outro computador

1. Instale VS Code, PHP, Composer e Node.
2. Rode `configuracao/instalar.ps1` (instala as extensões, o `.vsix` e copia o `settings.json`, com backup).
3. Instale o Pint: `composer global require laravel/pint`.

## Limites conhecidos

- O ícone é escolhido pelo nome do arquivo: dois arquivos com o mesmo nome e tipos diferentes dividem o mesmo ícone.
- Os modelos usam HTML simples (sem Bootstrap/Tailwind) e o layout `layouts.app` quando o projeto não tem um.
- O `settings.json` guardado aqui é pessoal; revise antes de usar em outra máquina.
