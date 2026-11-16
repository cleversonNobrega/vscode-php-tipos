"""Gera o .vsix da extensão a partir da pasta extensao/ (sem baixar nada da internet).

Uso:  python scripts/empacotar.py
Saída: dist/php-tipos-icones-<versão>.vsix
Requer: Node (para gerar tema.json) e o Material Icon Theme instalado no VS Code.
"""
import json, os, subprocess, sys, zipfile
from xml.sax.saxutils import escape

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIG = os.path.join(RAIZ, 'extensao')
SAIDA = os.path.join(RAIZ, 'dist')
os.makedirs(SAIDA, exist_ok=True)

# tema.json é gerado (Material + ícones C/I/T/E) e fica fora do git
subprocess.run(['node', os.path.join(ORIG, 'gerar.js')], check=True)

pkg = json.load(open(os.path.join(ORIG, 'package.json'), encoding='utf-8'))
pkg['extensionDependencies'] = ['pkief.material-icon-theme']
pkg.setdefault('categories', ['Themes', 'Snippets', 'Other'])
pkg['description'] = 'Ícones em anel (C/I/T/E) para classes PHP e menus de criação de arquivos Laravel/Blade com campos.'

readme = open(os.path.join(RAIZ, 'README.md'), encoding='utf-8').read()

excluir = {'cache.json', 'testes'}
arquivos = []
for raiz, dirs, nomes in os.walk(ORIG):
    dirs[:] = [d for d in dirs if d not in excluir]
    arquivos += [os.path.join(raiz, n) for n in nomes if n not in excluir]

manifesto = f'''<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Language="en-US" Id="{pkg['name']}" Version="{pkg['version']}" Publisher="{pkg['publisher']}"/>
    <DisplayName>{escape(pkg['displayName'])}</DisplayName>
    <Description xml:space="preserve">{escape(pkg['description'])}</Description>
    <Tags>php,laravel,blade,icons</Tags>
    <Categories>{','.join(pkg['categories'])}</Categories>
    <GalleryFlags>Public</GalleryFlags>
    <Properties>
      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="{pkg['engines']['vscode']}"/>
      <Property Id="Microsoft.VisualStudio.Code.ExtensionDependencies" Value="pkief.material-icon-theme"/>
      <Property Id="Microsoft.VisualStudio.Code.ExtensionPack" Value=""/>
      <Property Id="Microsoft.VisualStudio.Code.ExtensionKind" Value="ui,workspace"/>
      <Property Id="Microsoft.VisualStudio.Code.LocalizedLanguages" Value=""/>
      <Property Id="Microsoft.VisualStudio.Code.ExecutesCode" Value="true"/>
    </Properties>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code"/>
  </Installation>
  <Dependencies/>
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true"/>
    <Asset Type="Microsoft.VisualStudio.Services.Content.Details" Path="extension/readme.md" Addressable="true"/>
  </Assets>
</PackageManifest>
'''
tipos = '''<?xml version="1.0" encoding="utf-8"?>
<Types>
  <Default Extension=".json" ContentType="application/json"/>
  <Default Extension=".js" ContentType="application/javascript"/>
  <Default Extension=".svg" ContentType="image/svg+xml"/>
  <Default Extension=".md" ContentType="text/markdown"/>
  <Default Extension=".vsixmanifest" ContentType="text/xml"/>
</Types>
'''
destino = os.path.join(SAIDA, f"{pkg['name']}-{pkg['version']}.vsix")
with zipfile.ZipFile(destino, 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('[Content_Types].xml', tipos)
    z.writestr('extension.vsixmanifest', manifesto)
    z.writestr('extension/readme.md', readme)
    for f in arquivos:
        rel = os.path.relpath(f, ORIG).replace(os.sep, '/')
        if rel == 'package.json':
            z.writestr('extension/package.json', json.dumps(pkg, indent=2, ensure_ascii=False))
        else:
            z.write(f, 'extension/' + rel)
print(destino, os.path.getsize(destino) // 1024, 'KB', len(arquivos), 'arquivos')
