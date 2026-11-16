// Geradores de texto (sem depender do VS Code): Model, Migration, Request, Controller e Views.
const BS = '\\';
const STRICT = '<?php\n\ndeclare(strict_types=1);\n\n';

// ---------- nomes ----------
const studly = s => s.split(/[_\-\s]+/).filter(Boolean).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
const snake = s => s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/[\-\s]+/g, '_').toLowerCase();
const kebab = s => snake(s).replace(/_/g, '-');
const plural = s => (/(s|x|z|ch|sh)$/.test(s) ? s + 'es' : /[^aeiou]y$/.test(s) ? s.slice(0, -1) + 'ies' : s + 's');
const lcFirst = s => s.charAt(0).toLowerCase() + s.slice(1);
const humaniza = n => { const t = n.replace(/_id$/, '').replace(/_/g, ' '); return t.charAt(0).toUpperCase() + t.slice(1); };
const nomes = model => {
  const v = lcFirst(model);
  return { model, v, vp: plural(v), tabela: snake(plural(model)), rota: kebab(plural(model)), titulo: plural(model) };
};

// ---------- campos: "nome:string, email:string:unique, valor:decimal:nullable, company_id:foreignId" ----------
const TIPOS = {
  string: 'string', text: 'text', integer: 'integer', int: 'integer', bigint: 'bigInteger', biginteger: 'bigInteger',
  boolean: 'boolean', bool: 'boolean', decimal: 'decimal', float: 'float', date: 'date', datetime: 'dateTime',
  json: 'json', foreignid: 'foreignId', fk: 'foreignId',
};
function parseCampos(txt) {
  if (!txt || !txt.trim()) return [];
  return txt.split(',').map(s => s.trim()).filter(Boolean).map(s => {
    const [nomeBruto, tipoBruto, ...mods] = s.split(':').map(x => x.trim());
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(nomeBruto)) throw new Error(`Nome de campo inválido: "${nomeBruto}"`);
    const nome = snake(nomeBruto);
    let tipo;
    if (tipoBruto && !['nullable', 'unique'].includes(tipoBruto.toLowerCase())) {
      tipo = TIPOS[tipoBruto.toLowerCase()];
      if (!tipo) throw new Error(`Tipo desconhecido "${tipoBruto}" em "${nome}". Use: ${[...new Set(Object.values(TIPOS))].join(', ')}`);
    } else {
      tipo = /_id$/.test(nome) ? 'foreignId' : 'string';
      if (tipoBruto) mods.unshift(tipoBruto);
    }
    const m = mods.map(x => x.toLowerCase());
    return { nome, tipo, nulo: m.includes('nullable'), unico: m.includes('unique') };
  });
}

// ---------- pedaços ----------
const tabelaFk = c => snake(plural(c.nome.replace(/_id$/, '')));

function migrationLinhas(campos, ind = '            ') {
  return campos.map(c => {
    let l;
    switch (c.tipo) {
      case 'decimal': l = `$table->decimal('${c.nome}', 10, 2)`; break;
      case 'foreignId': l = `$table->foreignId('${c.nome}')${c.nulo ? '->nullable()' : ''}->constrained()`; break;
      default: l = `$table->${c.tipo}('${c.nome}')`;
    }
    if (c.tipo !== 'foreignId' && c.nulo) l += '->nullable()';
    if (c.unico) l += '->unique()';
    return `${ind}${l};`;
  }).join('\n');
}
const CASTS = { boolean: 'boolean', decimal: 'decimal:2', json: 'array', date: 'date', dateTime: 'datetime', integer: 'integer' };

const TOK = {
  string: ["'string'", "'max:255'"], text: ["'string'"], integer: ["'integer'"], bigInteger: ["'integer'"], foreignId: ["'integer'"],
  boolean: ["'boolean'"], decimal: ["'numeric'"], float: ["'numeric'"], date: ["'date'"], dateTime: ["'date'"], json: ["'array'"],
};
// modo: 'request' (regras no FormRequest) | 'store' | 'update' (inline no controller)
function regras(campos, n, modo) {
  let usaRule = false;
  const linhas = campos.map(c => {
    const r = [];
    if (c.tipo !== 'boolean') r.push(c.nulo ? "'nullable'" : "'required'");
    r.push(...TOK[c.tipo]);
    if (c.tipo === 'foreignId') r.push(`'exists:${tabelaFk(c)},id'`);
    if (c.unico) {
      if (modo === 'store') r.push(`'unique:${n.tabela},${c.nome}'`);
      else { usaRule = true; r.push(`Rule::unique('${n.tabela}', '${c.nome}')->ignore(${modo === 'request' ? `$this->route('${n.v}')` : `$${n.v}`})`); }
    }
    return { nome: c.nome, texto: `[${r.join(', ')}]` };
  });
  return { linhas, usaRule };
}
const regrasBloco = (campos, n, modo, ind) => {
  const { linhas, usaRule } = regras(campos, n, modo);
  const txt = linhas.length ? linhas.map(l => `${ind}'${l.nome}' => ${l.texto},`).join('\n') : `${ind}//`;
  return { txt, usaRule };
};

// ---------- PHP ----------
function model(ns, nome, campos) {
  const fill = campos.length ? campos.map(c => `        '${c.nome}',`).join('\n') : '        //';
  const casts = campos.filter(c => CASTS[c.tipo]).map(c => `            '${c.nome}' => '${CASTS[c.tipo]}',`).join('\n') || '            //';
  return `${STRICT}${ns ? `namespace ${ns};\n\n` : ''}use Illuminate${BS}Database${BS}Eloquent${BS}Factories${BS}HasFactory;\nuse Illuminate${BS}Database${BS}Eloquent${BS}Model;\n\nclass ${nome} extends Model\n{\n    use HasFactory;\n\n    protected $fillable = [\n${fill}\n    ];\n\n    protected function casts(): array\n    {\n        return [\n${casts}\n        ];\n    }\n}\n`;
}

function migrationCria(tabela, campos) {
  const cols = campos.length ? migrationLinhas(campos) : '            //';
  return `${STRICT}use Illuminate${BS}Database${BS}Migrations${BS}Migration;\nuse Illuminate${BS}Database${BS}Schema${BS}Blueprint;\nuse Illuminate${BS}Support${BS}Facades${BS}Schema;\n\nreturn new class extends Migration\n{\n    public function up(): void\n    {\n        Schema::create('${tabela}', function (Blueprint $table) {\n            $table->id();\n${cols}\n            $table->timestamps();\n        });\n    }\n\n    public function down(): void\n    {\n        Schema::dropIfExists('${tabela}');\n    }\n};\n`;
}
function migrationAltera(tabela) {
  const bloco = `        Schema::table('${tabela}', function (Blueprint $table) {\n            //\n        });`;
  return `${STRICT}use Illuminate${BS}Database${BS}Migrations${BS}Migration;\nuse Illuminate${BS}Database${BS}Schema${BS}Blueprint;\nuse Illuminate${BS}Support${BS}Facades${BS}Schema;\n\nreturn new class extends Migration\n{\n    public function up(): void\n    {\n${bloco}\n    }\n\n    public function down(): void\n    {\n${bloco}\n    }\n};\n`;
}
const migrationVazia = () => `${STRICT}use Illuminate${BS}Database${BS}Migrations${BS}Migration;\n\nreturn new class extends Migration\n{\n    public function up(): void\n    {\n        //\n    }\n\n    public function down(): void\n    {\n        //\n    }\n};\n`;

function request(ns, nome, n, campos) {
  const { txt, usaRule } = regrasBloco(campos, n, 'request', '            ');
  const usos = ['Illuminate' + BS + 'Foundation' + BS + 'Http' + BS + 'FormRequest'];
  if (usaRule) usos.push('Illuminate' + BS + 'Validation' + BS + 'Rule');
  return `${STRICT}${ns ? `namespace ${ns};\n\n` : ''}${usos.sort().map(u => `use ${u};`).join('\n')}\n\nclass ${nome} extends FormRequest\n{\n    public function authorize(): bool\n    {\n        return true;\n    }\n\n    /**\n     * @return array<string, array<int, mixed>>\n     */\n    public function rules(): array\n    {\n        return [\n${txt}\n        ];\n    }\n}\n`;
}

// o: {ns, nome, n, api, campos, modelNs, requestNs, requestClass, baseNs}
function controllerResource(o) {
  const { n, api, campos } = o, m = n.model, v = n.v;
  const usos = [];
  if (o.baseNs && o.ns !== o.baseNs) usos.push(`${o.baseNs}${BS}Controller`);
  if (o.modelNs) usos.push(`${o.modelNs}${BS}${m}`);
  const comReq = !!o.requestClass;
  if (comReq && o.requestNs) usos.push(`${o.requestNs}${BS}${o.requestClass}`);
  const I = 'Illuminate' + BS;
  let rulesStore = '', rulesUpdate = '', usaRule = false;
  if (!comReq) {
    const a = regrasBloco(campos, n, 'store', '            '), b = regrasBloco(campos, n, 'update', '            ');
    rulesStore = a.txt; rulesUpdate = b.txt; usaRule = b.usaRule;
    usos.push(`${I}Http${BS}Request`);
    if (usaRule) usos.push(`${I}Validation${BS}Rule`);
  } else if (!api) { /* requests tipados já cobrem */ }
  const reqTipo = comReq ? o.requestClass : 'Request';
  const dados = (txt) => comReq ? `$data = $request->validated();` : `$data = $request->validate([\n${txt}\n        ]);`;
  let corpo;
  if (api) {
    usos.push(`${I}Http${BS}JsonResponse`);
    if (comReq) usos.push(`${I}Http${BS}Request`);
    corpo = `    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => ${m}::latest()->paginate()]);
    }

    public function store(${reqTipo} $request): JsonResponse
    {
        ${dados(rulesStore)}

        $${v} = ${m}::create($data);

        return response()->json(['data' => $${v}], 201);
    }

    public function show(${m} $${v}): JsonResponse
    {
        return response()->json(['data' => $${v}]);
    }

    public function update(${reqTipo} $request, ${m} $${v}): JsonResponse
    {
        ${dados(rulesUpdate)}

        $${v}->update($data);

        return response()->json(['data' => $${v}]);
    }

    public function destroy(${m} $${v}): JsonResponse
    {
        $${v}->delete();

        return response()->json(null, 204);
    }`;
  } else {
    usos.push(`${I}Contracts${BS}View${BS}View`, `${I}Http${BS}RedirectResponse`);
    const vista = n.rota;
    corpo = `    public function index(): View
    {
        return view('${vista}.index', ['${n.vp}' => ${m}::latest()->paginate()]);
    }

    public function create(): View
    {
        return view('${vista}.create');
    }

    public function store(${reqTipo} $request): RedirectResponse
    {
        ${dados(rulesStore)}

        ${m}::create($data);

        return redirect()->route('${n.rota}.index')->with('status', 'Registro criado.');
    }

    public function show(${m} $${v}): View
    {
        return view('${vista}.show', ['${v}' => $${v}]);
    }

    public function edit(${m} $${v}): View
    {
        return view('${vista}.edit', ['${v}' => $${v}]);
    }

    public function update(${reqTipo} $request, ${m} $${v}): RedirectResponse
    {
        ${dados(rulesUpdate)}

        $${v}->update($data);

        return redirect()->route('${n.rota}.index')->with('status', 'Registro atualizado.');
    }

    public function destroy(${m} $${v}): RedirectResponse
    {
        $${v}->delete();

        return redirect()->route('${n.rota}.index')->with('status', 'Registro excluído.');
    }`;
  }
  const uses = [...new Set(usos)].sort().map(u => `use ${u};`).join('\n');
  return `${STRICT}${o.ns ? `namespace ${o.ns};\n\n` : ''}${uses ? uses + '\n\n' : ''}class ${o.nome} extends Controller\n{\n${corpo}\n}\n`;
}

// ---------- Blade ----------
const layoutBase = () => `<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>@yield('title', config('app.name'))</title>

    @vite(['resources/css/app.css', 'resources/js/app.js'])
    @stack('styles')
</head>
<body>
    <header>
        <a href="{{ url('/') }}">{{ config('app.name') }}</a>
    </header>

    <main>
        @yield('content')
    </main>

    @stack('scripts')
</body>
</html>
`;

const colunas = campos => campos.filter(c => c.tipo !== 'text' && c.tipo !== 'json').slice(0, 4);
function celula(c, v) {
  if (c.tipo === 'boolean') return `{{ $${v}->${c.nome} ? 'Sim' : 'Não' }}`;
  if (c.tipo === 'date') return `{{ $${v}->${c.nome}?->format('d/m/Y') }}`;
  if (c.tipo === 'dateTime') return `{{ $${v}->${c.nome}?->format('d/m/Y H:i') }}`;
  return `{{ $${v}->${c.nome} }}`;
}

function index(n, campos, layout) {
  const cols = colunas(campos);
  const th = cols.length ? cols.map(c => `                <th>${humaniza(c.nome)}</th>`).join('\n') : '                {{-- demais colunas --}}';
  const td = cols.length ? cols.map(c => `                    <td>${celula(c, n.v)}</td>`).join('\n') : '                    {{-- demais colunas --}}';
  const span = cols.length + 2;
  return `@extends('${layout}')

@section('title', '${n.titulo}')

@section('content')
    <div>
        <h1>${n.titulo}</h1>
        <a href="{{ route('${n.rota}.create') }}">Novo</a>
    </div>

    @if (session('status'))
        <p>{{ session('status') }}</p>
    @endif

    <table>
        <thead>
            <tr>
                <th>#</th>
${th}
                <th>Ações</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($${n.vp} as $${n.v})
                <tr>
                    <td>{{ $${n.v}->id }}</td>
${td}
                    <td>
                        <a href="{{ route('${n.rota}.show', $${n.v}) }}">Ver</a>
                        <a href="{{ route('${n.rota}.edit', $${n.v}) }}">Editar</a>
                        <form action="{{ route('${n.rota}.destroy', $${n.v}) }}" method="POST"
                              onsubmit="return confirm('Excluir este registro?')" style="display:inline">
                            @csrf
                            @method('DELETE')
                            <button type="submit">Excluir</button>
                        </form>
                    </td>
                </tr>
            @empty
                <tr>
                    <td colspan="${span}">Nenhum registro encontrado.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    {{ $${n.vp}->links() }}
@endsection
`;
}

function campoForm(c, v, ind) {
  const id = c.nome, lab = humaniza(c.nome);
  const erro = `${ind}    @error('${id}')\n${ind}        <span>{{ $message }}</span>\n${ind}    @enderror`;
  const sem = `$${v}->${id} ?? ''`;
  let ctrl;
  switch (c.tipo) {
    case 'text': ctrl = `<textarea id="${id}" name="${id}">{{ old('${id}', ${sem}) }}</textarea>`; break;
    case 'boolean':
      ctrl = `<input type="hidden" name="${id}" value="0">\n${ind}    <input type="checkbox" id="${id}" name="${id}" value="1" @checked(old('${id}', $${v}->${id} ?? false))>`; break;
    case 'integer': case 'bigInteger': case 'foreignId':
      ctrl = `<input type="number" id="${id}" name="${id}" value="{{ old('${id}', ${sem}) }}">`; break;
    case 'decimal': case 'float':
      ctrl = `<input type="number" step="any" id="${id}" name="${id}" value="{{ old('${id}', ${sem}) }}">`; break;
    case 'date':
      ctrl = `<input type="date" id="${id}" name="${id}" value="{{ old('${id}', isset($${v}) ? $${v}->${id}?->format('Y-m-d') : '') }}">`; break;
    case 'dateTime':
      ctrl = `<input type="datetime-local" id="${id}" name="${id}" value="{{ old('${id}', isset($${v}) ? $${v}->${id}?->format('Y-m-d\\TH:i') : '') }}">`; break;
    default: {
      const tp = /email/i.test(id) ? 'email' : /(senha|password)/i.test(id) ? 'password' : 'text';
      ctrl = `<input type="${tp}" id="${id}" name="${id}" value="{{ ${tp === 'password' ? "''" : `old('${id}', ${sem})`} }}">`;
    }
  }
  return `${ind}<div>\n${ind}    <label for="${id}">${lab}</label>\n${ind}    ${ctrl}\n${erro}\n${ind}</div>`;
}
const camposHtml = (campos, v, ind) => {
  const f = campos.filter(c => c.tipo !== 'json');
  return f.length ? f.map(c => campoForm(c, v, ind)).join('\n\n') : `${ind}{{-- campos --}}`;
};

// formulário único (criar e editar no mesmo arquivo)
function formUnico(n, campos, layout) {
  return `@extends('${layout}')

@section('title', isset($${n.v}) ? 'Editar ${n.model}' : 'Novo ${n.model}')

@section('content')
    <h1>{{ isset($${n.v}) ? 'Editar' : 'Novo' }} ${n.model}</h1>

    <form action="{{ isset($${n.v}) ? route('${n.rota}.update', $${n.v}) : route('${n.rota}.store') }}" method="POST">
        @csrf
        @isset($${n.v})
            @method('PUT')
        @endisset

${camposHtml(campos, n.v, '        ')}

        <button type="submit">Salvar</button>
        <a href="{{ route('${n.rota}.index') }}">Cancelar</a>
    </form>
@endsection
`;
}
// parcial + páginas create/edit (usado no recurso completo)
const formParcial = (n, campos) => `${camposHtml(campos, n.v, '').replace(/^/gm, '')}\n`;
function paginaForm(n, layout, edit) {
  return `@extends('${layout}')

@section('title', '${edit ? 'Editar' : 'Novo'} ${n.model}')

@section('content')
    <h1>${edit ? 'Editar' : 'Novo'} ${n.model}</h1>

    <form action="{{ route('${n.rota}.${edit ? `update', $${n.v}` : "store'"}) }}" method="POST">
        @csrf
${edit ? "        @method('PUT')\n" : ''}
        @include('${n.rota}._form')

        <button type="submit">Salvar</button>
        <a href="{{ route('${n.rota}.index') }}">Cancelar</a>
    </form>
@endsection
`;
}
function show(n, campos, layout) {
  const dl = campos.length
    ? campos.map(c => `        <dt>${humaniza(c.nome)}</dt>\n        <dd>${celula(c, n.v)}</dd>`).join('\n')
    : '        {{-- campos --}}';
  return `@extends('${layout}')

@section('title', '${n.model}')

@section('content')
    <h1>${n.model} #{{ $${n.v}->id }}</h1>

    <dl>
${dl}
    </dl>

    <a href="{{ route('${n.rota}.edit', $${n.v}) }}">Editar</a>
    <a href="{{ route('${n.rota}.index') }}">Voltar</a>
@endsection
`;
}
const componente = () => `@props([
    'title' => null,
])

<div {{ $attributes }}>
    @if ($title)
        <h3>{{ $title }}</h3>
    @endif

    {{ $slot }}
</div>
`;

module.exports = {
  BS, studly, snake, kebab, plural, lcFirst, nomes, parseCampos,
  model, migrationCria, migrationAltera, migrationVazia, request, controllerResource,
  layoutBase, index, formUnico, formParcial, paginaForm, show, componente,
};
