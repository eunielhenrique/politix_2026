/**
 * Politix — sincronização Planilha → Supabase
 * ---------------------------------------------------------------------------
 * Lê as abas regionais desta planilha e espelha cada linha em `planilha_linha`
 * no Supabase; em seguida chama a função `sync_planilha()`, que consolida em
 * `leader` e `municipio_politico` deduplicando por WhatsApp.
 *
 * A planilha continua PRIVADA: quem fala com o Supabase é este script, com a
 * service role key guardada nas Propriedades do Script (nunca no código).
 *
 * Instalação: veja README.md nesta pasta.
 */

// A aba precisa ter estes cabeçalhos para ser considerada regional.
var COLUNAS = {
  municipio:   ['município', 'municipio'],
  eleitores:   ['eleitores'],
  votos:       ['votos válidos - 2024', 'votos validos - 2024', 'votos válidos', 'votos validos'],
  nome:        ['nome'],
  telefone:    ['telefone'],
  dobrada:     ['dobrada'],
  expectativa: ['expectativa de voto', 'expectativa'],
  observacao:  ['observação', 'observacao'],
};

var ABAS_IGNORADAS = ['instruções', 'instrucoes', 'resumo geral'];
var LOTE = 500;          // linhas por request
var DEBOUNCE_SEG = 90;   // espera depois da última edição antes de sincronizar

// ---------------------------------------------------------------------------
// Configuração
// ---------------------------------------------------------------------------

function cfg_() {
  var p = PropertiesService.getScriptProperties();
  var c = {
    url:     p.getProperty('SUPABASE_URL'),
    key:     p.getProperty('SUPABASE_SERVICE_ROLE'),
    tenant:  p.getProperty('TENANT_ID'),
  };
  if (!c.url || !c.key || !c.tenant) {
    throw new Error('Faltam propriedades do script: SUPABASE_URL, SUPABASE_SERVICE_ROLE, TENANT_ID.');
  }
  c.url = c.url.replace(/\/+$/, '');
  return c;
}

function req_(c, metodo, caminho, corpo, prefer) {
  var res = UrlFetchApp.fetch(c.url + caminho, {
    method: metodo,
    contentType: 'application/json',
    headers: {
      apikey: c.key,
      Authorization: 'Bearer ' + c.key,
      Prefer: prefer || 'return=minimal',
    },
    payload: corpo == null ? undefined : JSON.stringify(corpo),
    muteHttpExceptions: true,
  });
  var code = res.getResponseCode();
  if (code < 200 || code >= 300) {
    throw new Error(metodo + ' ' + caminho + ' -> HTTP ' + code + ': ' + res.getContentText().slice(0, 400));
  }
  var txt = res.getContentText();
  return txt ? JSON.parse(txt) : null;
}

// ---------------------------------------------------------------------------
// Leitura da planilha
// ---------------------------------------------------------------------------

function norm_(s) {
  return String(s == null ? '' : s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .trim().toLowerCase();
}

/** Acha a linha de cabeçalho e devolve o índice de cada coluna conhecida. */
function mapearColunas_(valores) {
  for (var i = 0; i < Math.min(valores.length, 12); i++) {
    var linha = valores[i].map(norm_);
    if (linha.indexOf('municipio') === -1 && linha.indexOf('município') === -1) continue;
    var idx = {};
    Object.keys(COLUNAS).forEach(function (campo) {
      idx[campo] = -1;
      COLUNAS[campo].forEach(function (alias) {
        if (idx[campo] === -1) idx[campo] = linha.indexOf(norm_(alias));
      });
    });
    if (idx.municipio !== -1 && idx.nome !== -1) return { header: i, idx: idx };
  }
  return null;
}

function inteiro_(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Math.round(v);
  var d = String(v).replace(/[^\d]/g, '');
  return d ? parseInt(d, 10) : null;
}

function texto_(v) {
  var s = String(v == null ? '' : v).trim();
  return s || null;
}

/** Lê todas as abas regionais e devolve as linhas prontas para o Supabase. */
function lerPlanilha_(tenant) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var out = [];

  ss.getSheets().forEach(function (sheet) {
    var nome = sheet.getName();
    if (ABAS_IGNORADAS.indexOf(norm_(nome)) !== -1) return;

    var valores = sheet.getDataRange().getValues();
    var mapa = mapearColunas_(valores);
    if (!mapa) return;                       // aba sem tabela regional — ignora

    var idx = mapa.idx;
    var ra = null;
    for (var i = 0; i < mapa.header; i++) {
      var t = texto_(valores[i][0]);
      if (t && /^regi[ãa]o/i.test(t)) ra = t;
    }

    var ultimoMunicipio = null;
    for (var r = mapa.header + 1; r < valores.length; r++) {
      var linha = valores[r];
      var municipio = texto_(linha[idx.municipio]);
      // Linha de continuação: o contato pertence ao município da linha de cima.
      if (municipio) ultimoMunicipio = municipio; else municipio = ultimoMunicipio;

      var pessoa = idx.nome === -1 ? null : texto_(linha[idx.nome]);
      var eleitores = idx.eleitores === -1 ? null : inteiro_(linha[idx.eleitores]);
      if (!municipio && !pessoa) continue;                 // linha vazia
      if (!pessoa && eleitores == null) continue;          // sobra de formatação

      out.push({
        tenant_id: tenant,
        aba: nome,
        linha: r + 1,                                      // 1-based, igual à planilha
        ra: ra,
        municipio: municipio,
        eleitores: eleitores,
        votos_validos_2024: idx.votos === -1 ? null : inteiro_(linha[idx.votos]),
        nome: pessoa,
        telefone: idx.telefone === -1 ? null : texto_(linha[idx.telefone]),
        dobrada: idx.dobrada === -1 ? null : texto_(linha[idx.dobrada]),
        expectativa: idx.expectativa === -1 ? null : inteiro_(linha[idx.expectativa]),
        observacao: idx.observacao === -1 ? null : texto_(linha[idx.observacao]),
      });
    }
  });

  return out;
}

// ---------------------------------------------------------------------------
// Sincronização
// ---------------------------------------------------------------------------

/** Roda a sincronização completa. É o que os gatilhos chamam. */
function sincronizar() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;          // outra execução em andamento
  try {
    var c = cfg_();
    var linhas = lerPlanilha_(c.tenant);
    if (!linhas.length) throw new Error('Nenhuma linha lida — confira os cabeçalhos das abas.');

    // Espelho completo: apaga e regrava. É o que faz linha removida na planilha
    // desaparecer do Politix, sem nunca duplicar as que continuam lá.
    req_(c, 'delete', '/rest/v1/planilha_linha?tenant_id=eq.' + c.tenant);
    for (var i = 0; i < linhas.length; i += LOTE) {
      req_(c, 'post', '/rest/v1/planilha_linha', linhas.slice(i, i + LOTE));
    }

    var r = req_(c, 'post', '/rest/v1/rpc/sync_planilha',
      { p_tenant: c.tenant, p_origem: 'apps-script' }, 'return=representation');

    Logger.log('sincronizado: %s linhas | %s', linhas.length, JSON.stringify(r));
    return r;
  } finally {
    lock.releaseLock();
  }
}

/** Gatilho de edição: agenda a sincronização para daqui a DEBOUNCE_SEG. */
function aoEditar() {
  PropertiesService.getScriptProperties().setProperty('pendente', String(Date.now()));
}

/** Roda de minuto em minuto: sincroniza se houve edição e a poeira baixou. */
function verificarPendencia() {
  var p = PropertiesService.getScriptProperties();
  var t = parseInt(p.getProperty('pendente') || '0', 10);
  if (!t) return;
  if (Date.now() - t < DEBOUNCE_SEG * 1000) return;
  p.deleteProperty('pendente');
  sincronizar();
}

/** Executar UMA vez, na mão, para criar os gatilhos. */
function instalarGatilhos() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('aoEditar').forSpreadsheet(ss).onChange().create();
  ScriptApp.newTrigger('verificarPendencia').timeBased().everyMinutes(1).create();
  ScriptApp.newTrigger('sincronizar').timeBased().everyHours(6).create();  // rede de segurança
  return 'gatilhos instalados';
}
