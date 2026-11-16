# Changelog

## 1.0.1

- Os submenus **Novo PHP**, **Novo Laravel** e **Novo Blade** agora mostram todos os itens em qualquer pasta. Antes, cada item só aparecia na pasta que combinava (por exemplo, o Blade só dentro de `views`). Para voltar ao comportamento antigo, desligue `phpTipos.mostrarTudo`.

## 1.0.0

Primeira versão pública.

- **Ícones:** tema "Material + PHP Tipos (anel)" com C (classe), I (interface), T (trait) e E (enum).
- **Novo PHP:** Arquivo PHP, Classe, Interface, Trait e Enum, com namespace PSR-4.
- **Novo Laravel:** Recurso completo, Controller (vazio), Controller resource, Model, Migration, Request e Service, a partir dos campos informados.
- **Novo Blade:** layout base, listagem, formulário, detalhe, componente, view com `@extends` e view em branco.
- **Configurações:** `mostrarPhp`, `mostrarLaravel`, `mostrarBlade`, `mostrarTudo`, `plural`, `pluraisPersonalizados`, `strictTypes`, `layoutPadrao` e `atualizarIconesSozinho`.
- O tema agora contém só as pastas abertas no momento (antes acumulava todos os projetos já abertos e o VS Code deixava de aplicar os últimos ícones).
- O **Controller (vazio)** passou de "Novo PHP" para "Novo Laravel".
- O identificador da extensão mudou de `php-tipos-icones` para `php-tipos`. Desinstale a versão antiga para não duplicar os menus. O tema de ícones continua com o mesmo identificador, então a configuração `workbench.iconTheme` segue valendo.
