"""Gera o .vsix da extensão a partir da pasta extensao/ (sem baixar nada da internet).

Uso:  python scripts/empacotar.py
Saída: dist/php-tipos-<versão>.vsix
Requer: Node (para gerar tema.json) e o Material Icon Theme instalado no VS Code.

Para publicar no Marketplace use o vsce (veja o README da raiz); este script serve para
gerar e testar o instalador localmente.
"""
import json, os, subprocess, zipfile
from xml.sax.saxutils import escape

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIG = os.path.join(RAIZ, 'extensao')
SAIDA = os.path.join(RAIZ, 'dist')
os.makedirs(SAIDA, exist_ok=True)

# tema.json é gerado (Material + ícones C/I/T/E) e fica fora do git; aqui sai sem projetos
subprocess.run(['node', os.path.join(ORIG, 'gerar.js')], check=True)

pkg = json.load(open(os.path.join(ORIG, 'package.json'), encoding='utf-8'))
dependencias = ','.join(pkg.get('extensionDependencies', []))
categorias = ','.join(pkg.get('categories', ['Other']))
tags = ','.join(pkg.get('keywords', []))

# o que NÃO vai no pacote (mesma ideia do .vscodeignore)
excluir_pastas = {'testes', 'docs', 'node_modules'}
excluir_arquivos = {'cache.json', '.vscodeignore'}
arquivos = []
for raiz, dirs, nomes in os.walk(ORIG):
    dirs[:] = [d for d in dirs if d not in excluir_pastas]
    for n in nomes:
        if n in excluir_arquivos or n.endswith('.vsix'):
            continue
        arquivos.append(os.path.join(raiz, n))

manifesto = f'''<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Language="en-US" Id="{pkg['name']}" Version="{pkg['version']}" Publisher="{pkg['publisher']}"/>
    <DisplayName>{escape(pkg['displayName'])}</DisplayName>
    <Description xml:space="preserve">{escape(pkg['description'])}</Description>
    <Tags>{escape(tags)}</Tags>
    <Categories>{escape(categorias)}</Categories>
    <GalleryFlags>Public</GalleryFlags>
    <Properties>
      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="{pkg['engines']['vscode']}"/>
      <Property Id="Microsoft.VisualStudio.Code.ExtensionDependencies" Value="{dependencias}"/>
      <Property Id="Microsoft.VisualStudio.Code.ExtensionPack" Value=""/>
      <Property Id="Microsoft.VisualStudio.Code.ExtensionKind" Value="ui,workspace"/>
      <Property Id="Microsoft.VisualStudio.Code.LocalizedLanguages" Value=""/>
      <Property Id="Microsoft.VisualStudio.Code.ExecutesCode" Value="true"/>
      <Property Id="Microsoft.VisualStudio.Services.Links.Source" Value="{escape(pkg['repository']['url'])}"/>
      <Property Id="Microsoft.VisualStudio.Services.Links.Support" Value="{escape(pkg['bugs']['url'])}"/>
    </Properties>
    <License>extension/LICENSE</License>
    <Icon>extension/icon.png</Icon>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code"/>
  </Installation>
  <Dependencies/>
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true"/>
    <Asset Type="Microsoft.VisualStudio.Services.Content.Details" Path="extension/README.md" Addressable="true"/>
    <Asset Type="Microsoft.VisualStudio.Services.Content.Changelog" Path="extension/CHANGELOG.md" Addressable="true"/>
    <Asset Type="Microsoft.VisualStudio.Services.Content.License" Path="extension/LICENSE" Addressable="true"/>
    <Asset Type="Microsoft.VisualStudio.Services.Icons.Default" Path="extension/icon.png" Addressable="true"/>
  </Assets>
</PackageManifest>
'''
tipos = '''<?xml version="1.0" encoding="utf-8"?>
<Types>
  <Default Extension=".json" ContentType="application/json"/>
  <Default Extension=".js" ContentType="application/javascript"/>
  <Default Extension=".svg" ContentType="image/svg+xml"/>
  <Default Extension=".png" ContentType="image/png"/>
  <Default Extension=".md" ContentType="text/markdown"/>
  <Default Extension=".vsixmanifest" ContentType="text/xml"/>
  <Default Extension="" ContentType="text/plain"/>
</Types>
'''
destino = os.path.join(SAIDA, f"{pkg['name']}-{pkg['version']}.vsix")
with zipfile.ZipFile(destino, 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('[Content_Types].xml', tipos)
    z.writestr('extension.vsixmanifest', manifesto)
    for f in sorted(arquivos):
        rel = os.path.relpath(f, ORIG).replace(os.sep, '/')
        z.write(f, 'extension/' + rel)
print(destino, os.path.getsize(destino) // 1024, 'KB', len(arquivos), 'arquivos')
for f in sorted(arquivos):
    print('  ', os.path.relpath(f, ORIG).replace(os.sep, '/'))
