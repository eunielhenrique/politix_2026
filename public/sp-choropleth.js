// <sp-choropleth> — São Paulo municipality choropleth: rede × histórico da família.
// Attributes: layer (cobertura|historico|rede|muni2024), fonte (candidato|irmao|pai|familia),
// ano (todos|2024|2022|2018|2012), theme (light|dark), data-anchors (JSON).
// Events (window): 'politix:muni' (click detail), 'politix:mapstats' (KPI counts).
(function () {
  const W = 880, H = 620;
  const MESH_URL = 'https://servicodados.ibge.gov.br/api/v3/malhas/estados/35?formato=application/json&intrarregiao=municipio&qualidade=intermediaria';
  const NAMES_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades/estados/35/municipios';
  const GSP = ['3550308', '3534401', '3505708', '3547304', '3510609', '3518800', '3513009', '3522505', '3509205', '3525003', '3539103', '3552809', '3515004', '3513801', '3548708', '3547809'];
  const PAL = {
    // fora/foraLine = município fora da RA ou reprovado no filtro. Precisa CONTRASTAR com o
    // fundo (senão o estado de SP some quando o recorte é pequeno) sem competir com as cores
    // do recorte: cinza chapado, claro no dark e escuro no light, com contorno próprio.
    // line/selLine INVERTEM por tema: no dark a divisa é preta e a marcação (hover +
    // tracejado da seleção) é branca; no light é o contrário, porque as faixas claras
    // (hseq começa em #f4f1e8) engoliam qualquer traço branco.
    dark: { neutro: '#1a1a1a', fraco: '#5e4a1e', coberto: '#ededed', parcial: '#878787', priorizar: '#ffb224', seq: ['#111111', '#454545', '#ededed'], hseq: ['#181818', '#3a2a08', '#7a4d00', '#c67a00', '#ffb224', '#ffe3ad'], line: '#000000', pin: '#ededed', pinRing: '#000000', fora: '#31312f', foraLine: '#0d0d0d', selLine: '#ffffff' },
    light: { neutro: '#ececec', fraco: '#f0dca0', coberto: '#171717', parcial: '#8f8f8f', priorizar: '#c77700', seq: ['#ededed', '#b8b8b8', '#171717'], hseq: ['#f4f1e8', '#f7d17a', '#eda01f', '#cc6f00', '#9a4a00', '#5a2a00'], line: '#6b6b66', pin: '#171717', pinRing: '#ffffff', fora: '#d2d2d0', foraLine: '#ffffff', selLine: '#141414' },
  };
  const ANO_SYNTH = { '2024': 0.35, '2022': 0.6, '2018': 0.35, '2012': 0.2 };
  const MEMBROS = { candidato: ['candidato'], irmao: ['irmao'], pai: ['pai'], familia: ['candidato', 'irmao', 'pai'] };
  const MEMBRO_L = { candidato: 'Wesley Cezar (Lelinho)', irmao: 'Elvis Cezar', pai: 'Cezar (Cezão)' };
  const MEMBRO_C = { candidato: 'Candidato', irmao: 'Irmão', pai: 'Pai' };
  // `fonte` aceita um apelido ('familia') OU a combinação escolhida nos chips
  // ('pai,irmao'). O índice já vem pronto por município nas anchors — aqui só
  // os VOTOS e o histórico são somados, nunca índices (índice não soma).
  const membrosDe = fonte => {
    const m = MEMBROS[fonte] || String(fonte || '').split(',').filter(x => MEMBROS[x]);
    return m.length ? m : MEMBROS.familia;
  };
  const fonteLabel = fonte => {
    const m = membrosDe(fonte);
    return m.length === 3 ? 'Família Cezar' : m.map(x => MEMBRO_C[x]).join(' + ');
  };

  function rewind(feature) {
    const d3 = window.d3;
    if (!d3 || d3.geoArea(feature) <= Math.PI) return;
    const g = feature.geometry, rev = r => r.forEach(x => x.reverse());
    if (g.type === 'Polygon') rev(g.coordinates); else if (g.type === 'MultiPolygon') g.coordinates.forEach(rev);
    if (d3.geoArea(feature) > Math.PI) { if (g.type === 'Polygon') rev(g.coordinates); else if (g.type === 'MultiPolygon') g.coordinates.forEach(rev); }
  }
  function waitFor(cond, cb, tries = 200) { if (cond()) return cb(); if (tries <= 0) return; setTimeout(() => waitFor(cond, cb, tries - 1), 50); }
  const fmt = n => n.toLocaleString('pt-BR');

  // Veredito de cobertura — SEMPRE derivado das contagens REAIS do município
  // (líderes ativos + liderados + eleitorado TSE). Cidade com líder nunca é "Descoberta".
  // Exposto no window pro painel usar a MESMA fonte (nunca dois vereditos divergentes).
  const semLid = () => !!window.PX_SEM_LIDERADOS;
  // Prioridade de um município SEM líder: onde há voto pra buscar.
  // ALTA = 100 mil+ eleitores ou reduto da família (índice >= 18) — 57 + redutos.
  // MÉDIA = 20 mil a 100 mil eleitores. Abaixo disso não entra no mapa de prioridade.
  const PRIO_ALTA = 100000, PRIO_MEDIA = 20000, REDUTO_TOP = 40;
  // O corte de reduto era `indice >= 18`, número CHUMBADO. Quando o índice passou a ser
  // penetração pura ele virou letra morta: só 3 municípios em 645 alcançam 18, e 2 deles já
  // entrariam pelo eleitorado. O corte agora é RELATIVO — estar entre os 40 municípios de
  // maior penetração da seleção — então o reduto continua contando qualquer que seja a
  // calibração da escala. `limiar` é o índice do 40º colocado, calculado a cada render.
  let redutoMin = Infinity;
  const prioridadeDe = (r, limiar) => {
    const corte = limiar == null ? redutoMin : limiar;
    if (r.eleitorado >= PRIO_ALTA || (r.pen > 0 && r.pen >= corte)) return 'alta';
    return r.eleitorado >= PRIO_MEDIA ? 'media' : null;
  };
  window.PXPrioridade = prioridadeDe;
  function veredito(lideres, liderados, eleitorado) {
    const l = lideres || 0, ld = liderados || 0;
    const porMil = eleitorado ? ld / (eleitorado / 1000) : 0;
    // sem cadastro de liderados não dá pra falar em cobertura: o veredito é por LÍDERES
    if (semLid()) {
      if (l === 0) return { label: 'Sem líder', status: 'priorizar', porMil: 0 };
      if (l >= 5) return { label: `${l} líderes`, status: 'coberto', porMil: 0 };
      return { label: `${l} líder(es)`, status: 'parcial', porMil: 0 };
    }
    if (l === 0 && ld === 0) return { label: 'Descoberta', status: 'priorizar', porMil };
    if (porMil >= 2) return { label: 'Coberta', status: 'coberto', porMil };
    return { label: `Presença · ${l} líder(es)`, status: 'parcial', porMil };
  }
  window.PXVeredito = veredito;

  // ── Escala em FAIXAS (verde→vermelho), no lugar do cinza contínuo ──
  // Cobertura: verde = rede forte sobre o eleitorado, vermelho = descoberto.
  // Município 2024: verde = eleitorado grande (onde mora o voto), vermelho = município pequeno.
  const TIERS = {
    cobertura: [
      { min: 2, cor: '#2f9e64', label: 'Coberta (2+/mil)' },
      { min: 1, cor: '#7cb342', label: 'Boa (1–2/mil)' },
      { min: 0.4, cor: '#e3c04a', label: 'Média (0,4–1/mil)' },
      // min 0 pega quem TEM líder mas ainda não tem liderados — nunca cai no vermelho de
      // "descoberta", que é exclusivo de município sem rede nenhuma (ver fill()).
      { min: 0, cor: '#e08b3c', label: 'Presença, pouca base' },
      { min: -1, cor: '#c9463c', label: 'Descoberta com potencial' },
    ],
    // faixas exibidas na legenda do modo sem liderados
    lideresLegenda: [
      { cor: '#2f9e64', label: '5+ líderes' },
      { cor: '#7cb342', label: '3–4 líderes' },
      { cor: '#e3c04a', label: '2 líderes' },
      { cor: '#e08b3c', label: '1 líder' },
      { cor: '#c9463c', label: 'Sem líder · 100 mil+ eleitores' },
      { cor: '#7d3b34', label: 'Sem líder · 20–100 mil' },
    ],
    // enquanto não há liderados, a cobertura é lida pelo número de LÍDERES no município
    lideres: [
      { min: 5, cor: '#2f9e64', label: '5+ líderes' },
      { min: 3, cor: '#7cb342', label: '3–4 líderes' },
      { min: 2, cor: '#e3c04a', label: '2 líderes' },
      { min: 1, cor: '#e08b3c', label: '1 líder' },
      { min: -1, cor: '#c9463c', label: 'Sem líder · prioridade' },
    ],
    muni2024: [
      { min: 200000, cor: '#2f9e64', label: 'Muito alto (200 mil+)' },
      { min: 80000, cor: '#7cb342', label: 'Alto (80–200 mil)' },
      { min: 30000, cor: '#e3c04a', label: 'Médio (30–80 mil)' },
      { min: 10000, cor: '#e08b3c', label: 'Baixo (10–30 mil)' },
      { min: -1, cor: '#c9463c', label: 'Muito baixo (<10 mil)' },
    ],
  };
  const tierDe = (escala, v) => (TIERS[escala] || []).find(t => v >= t.min) || TIERS[escala][TIERS[escala].length - 1];
  window.PXTiers = TIERS;

  class SPChoropleth extends HTMLElement {
    static get observedAttributes() { return ['layer', 'fonte', 'ano', 'theme', 'orient', 'data-anchors', 'data-sel-ra', 'data-sel-muni', 'data-filtros']; }
    // São Paulo é deitado (880x620): num celular em pé o desenho cabe pela LARGURA e
    // sobram ~70% de altura preta. orient="v" gira o desenho 90° — mesma malha, mesma
    // projeção, só o quadro exibido troca de eixo (620x880) e o estado usa a tela toda.
    vert() { return (this.getAttribute('orient') || '') === 'v'; }
    get _W() { return this.vert() ? H : W; }
    get _H() { return this.vert() ? W : H; }
    // caixa em coordenadas da malha -> coordenadas do quadro exibido
    _bx(b) {
      if (!b || !this.vert()) return b;
      const [[x0, y0], [x1, y1]] = b;
      return [[y0, W - x1], [y1, W - x0]];
    }
    connectedCallback() {
      if (this._init) return; this._init = true;
      this._onCtl = e => this.ctl(e.detail && e.detail.action, e.detail && e.detail.ibge);
      window.addEventListener('politix:mapctl', this._onCtl);
      this.style.display = 'block'; this.style.position = 'relative';
      this.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;min-height:420px;font:13px var(--font-mono,monospace);color:var(--color-muted-foreground,#878787)">Carregando os 645 municípios (IBGE)…</div>';
      waitFor(() => window.d3, () => this.load());
    }
    attributeChangedCallback(name, oldV, newV) {
      // voltar pra "Estado" (sem RA) desfaz o zoom de duplo-clique — senão ficaria preso na cidade
      if (name === 'data-sel-ra' && oldV !== newV && (newV == null || newV === '')) this._zt = null;
      if (this._feats) this.render();
    }
    get anchors() { try { return JSON.parse(this.getAttribute('data-anchors') || '[]'); } catch (e) { return []; } }
    get filtros() { try { return JSON.parse(this.getAttribute('data-filtros') || '{}'); } catch (e) { return {}; } }
    // cruzamento dos filtros do drawer — tudo em E. 'todos' (ou ausente) não restringe.
    passaFiltros(r) {
      const f = this.filtros;
      if (f.cob === 'com' && !(r.lideres > 0)) return false;
      if (f.cob === 'sem' && r.lideres > 0) return false;
      // prioridade é EIXO PRÓPRIO: vale com ou sem líder, então dá pra perguntar
      // "onde já tenho líder num lugar que importa?" — impossível quando era só um
      // subconjunto de "sem líder".
      const pr = prioridadeDe(r);
      if (f.prio === 'alta' && pr !== 'alta') return false;
      if (f.prio === 'media' && pr !== 'media') return false;
      if (f.prio === 'baixa' && pr !== null) return false;
      if (f.porte === 'g' && !(r.eleitorado >= 100000)) return false;
      if (f.porte === 'm' && !(r.eleitorado >= 20000 && r.eleitorado < 100000)) return false;
      if (f.porte === 'p' && !(r.eleitorado > 0 && r.eleitorado < 20000)) return false;
      if (f.pot === 'alto' && !(r.indice >= 40)) return false;
      if (f.pot === 'medio' && !(r.indice >= 18 && r.indice < 40)) return false;
      if (f.pot === 'baixo' && !(r.indice < 18)) return false;
      if (f.comp === 'acima' && !(r.eleitorado > 0 && r.vv / r.eleitorado >= 0.6725)) return false;
      if (f.comp === 'abaixo' && !(r.eleitorado > 0 && r.vv / r.eleitorado < 0.6725)) return false;
      return true;
    }
    async load() {
      try {
        const [bruto, names] = await Promise.all([fetch(MESH_URL).then(r => { if (!r.ok) throw 0; return r.json(); }), fetch(NAMES_URL).then(r => { if (!r.ok) throw 0; return r.json(); })]);
        const nameByCode = {}; names.forEach(m => { nameByCode[String(m.id)] = m.nome; });
        const d3 = window.d3;
        // TopoJSON em vez de GeoJSON: 291 KB contra 988 KB na mesma qualidade, e é o que
        // permite unir os municípios de uma RA num contorno EXTERNO só (topojson.merge),
        // sem as divisas internas que um simples empilhamento de paths mostraria.
        let mesh = bruto, topo = null, objKey = null;
        if (bruto && bruto.type === 'Topology' && window.topojson) {
          topo = bruto; objKey = Object.keys(bruto.objects)[0];
          mesh = window.topojson.feature(bruto, bruto.objects[objKey]);
        }
        this._topo = topo; this._topoKey = objKey;
        mesh.features.forEach(f => rewind(f));
        const proj = d3.geoMercator().fitExtent([[10, 10], [W - 10, H - 10]], mesh);
        const path = d3.geoPath(proj);
        this._proj = proj;
        this._feats = mesh.features.map(f => {
          const code = String(f.properties.codarea);
          return { code, nome: nameByCode[code] || ('Município ' + code), d: path(f), b: path.bounds(f), c: path.centroid(f) };
        });
        this.render();
      } catch (e) {
        this.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;min-height:420px;font:13px var(--font-mono,monospace);color:var(--color-muted-foreground,#878787);text-align:center;padding:24px">Não foi possível carregar a malha municipal (IBGE).<br>Verifique a conexão e recarregue.</div>';
      }
    }
    // synthetic low baseline for non-anchor municipalities (deterministic)
    synthPot(code, membros) {
      const n = parseInt(code, 10); const h = (n * 2654435761 % 997) / 997;
      let v = 0;
      if (membros.includes('candidato')) v += Math.round(h * 1400);
      if (membros.includes('irmao')) v += Math.round(((n * 48271 % 887) / 887) * 8000);
      if (membros.includes('pai')) v += Math.round(((n * 69621 % 761) / 761) * 900);
      return v;
    }
    values() {
      const fonte = this.getAttribute('fonte') || 'familia';
      const ano = this.getAttribute('ano') || 'todos';
      const membros = membrosDe(fonte);
      const anosSel = (ano && ano !== 'todos') ? String(ano).split(',') : null;
      const A = {}; this.anchors.forEach(a => { A[String(a.ibge)] = a; });
      const rows = this._feats.map(ft => {
        const a = A[ft.code];
        let pot = 0, historico = [];
        if (a) {
          membros.forEach(m => (a.hist[m] || []).forEach(hh => {
            if (anosSel && !anosSel.includes(String(hh.ano))) return;
            pot += hh.votos; historico.push({ membro: MEMBRO_L[m], cargo: hh.cargo, ano: hh.ano, votos: hh.votos });
          }));
        } else pot = Math.round(this.synthPot(ft.code, membros) * (ano === 'todos' ? 1 : (ANO_SYNTH[ano] || 0.3)));
        const indice = a && typeof a.indice === 'number' ? a.indice : 0; // penetração da família (0–100)
        const liderados = a ? a.rede.liderados : 0;
        const lideres = a ? a.rede.lideres : 0;
        const pend = a && a.rede.pend ? a.rede.pend : 0;
        const liderJan = liderados;
        const eleitorado = a && a.eleitorado ? a.eleitorado : 0;
        const vv = a && a.vv ? a.vv : 0; // votos válidos 2024 (TSE)
        return { ...ft, a, pot, indice, pen: (a && typeof a.pen === 'number') ? a.pen : 0, historico, liderados, lideres, pend, liderJan, eleitorado, vv, ra: a && a.ra ? a.ra : null, ritmo: a ? a.rede.ritmo : 0 };
      });
      const maxPot = Math.max(...rows.map(r => r.pot), 1);
      // limiar do reduto: índice do REDUTO_TOP-ésimo município mais penetrado da seleção
      // ranqueia pela PENETRAÇÃO real (3 casas), não pelo índice arredondado: no índice
      // inteiro dezenas de municípios empatam no mesmo valor e o "top 40" viraria 61
      const penOrd = rows.map(r => r.pen).filter(v => v > 0).sort((a, b) => b - a);
      redutoMin = penOrd.length >= REDUTO_TOP ? penOrd[REDUTO_TOP - 1] : (penOrd.length ? penOrd[penOrd.length - 1] : Infinity);
      rows.forEach(r => {
        const v = veredito(r.lideres, r.liderados, r.eleitorado);
        r.porMil = v.porMil;
        if (r.lideres > 0 || r.liderados > 0) {
          // tem rede REAL: veredito e cor saem da mesma contagem — nunca "descoberta" com líder
          r.status = v.status; r.statusLabel = v.label;
        } else {
          // sem rede nenhuma: a cor mostra o potencial da família
          // (≤10 = fora do reduto; 10–18 = presença fraca; ≥18 = descoberta com potencial)
          r.status = r.indice <= 10 ? 'neutro' : r.indice < 18 ? 'fraco' : 'priorizar';
          r.statusLabel = { neutro: 'Potencial baixo', fraco: 'Presença fraca', priorizar: 'Descoberta' }[r.status];
        }
      });
      return { rows, maxPot, fonte };
    }
    render() {
      const d3 = window.d3;
      const layer = this.getAttribute('layer') || 'cobertura';
      const theme = this.getAttribute('theme') === 'light' ? 'light' : 'dark';
      const P = PAL[theme];
      const { rows, maxPot, fonte } = this.values();
      this._rows = rows; // usado pelo foco por busca de nome
      // RA agora é o nome oficial vindo do banco (municipio_politico.ra, 16 regiões) — string, não índice
      const selRa = this.getAttribute('data-sel-ra') || '';
      const selIbge = this.getAttribute('data-sel-muni') || ''; // cidade aberta no painel
      // "fora" = fora da RA escolhida OU reprovado no cruzamento de filtros
      const fora = r => (selRa && r.ra !== selRa) || !this.passaFiltros(r);
      // exposto para a busca por nome decidir se PRECISA limpar o recorte:
      // limpar sempre era exagero — a cidade procurada muitas vezes já passa nele
      window.PXEstaFora = (ibge) => {
        const r = (this._rows || []).find(x => String(x.code) === String(ibge));
        return r ? fora(r) : false;
      };
      const scoped = rows.filter(r => !fora(r)); // RA + filtros
      const maxLid = Math.max(...rows.map(r => r.liderJan), 1);
      const maxEl = Math.max(...rows.map(r => r.eleitorado), 1);
      // eleitorado é MUITO desigual (capital ~9M × cidade de 1k): escala log pra não achatar o mapa
      const elN = v => v > 0 ? Math.log10(1 + v) / Math.log10(1 + maxEl) : 0;
      const seq = d3.interpolateRgbBasis(P.seq);
      const hseq = d3.interpolateRgbBasis(P.hseq);
      const fill = r => {
        if (fora(r)) return P.fora; // fora da RA/filtro = cinza chapado (sem cor vazando)
        if (layer === 'historico') return hseq(Math.pow(r.indice / 100, 0.6)); // heat âmbar, realça o meio
        if (layer === 'rede') {
          if (semLid()) return r.lideres > 0 ? tierDe('lideres', r.lideres).cor : P.neutro;
          return r.liderJan > 0 ? seq(0.25 + 0.75 * Math.sqrt(r.liderJan / maxLid)) : P.neutro;
        }
        if (layer === 'muni2024') return r.eleitorado > 0 ? tierDe('muni2024', r.eleitorado).cor : P.neutro;
        // Cobertura em faixas verde→vermelho SÓ onde há rede real. Sem rede, vermelho fica
        // reservado a quem tem potencial da família (é o que pede ação); o resto segue cinza,
        // senão o estado inteiro ficaria vermelho e a cor não diria nada.
        if (semLid()) {
          if (r.lideres > 0) return tierDe('lideres', r.lideres).cor;
          // Sem líder: prioridade é onde estão os VOTOS (eleitorado) ou o reduto da família.
          // Só o índice ≥ 18 deixava 12 pontinhos no mapa — o histórico da família é
          // concentradíssimo (18 de 645 municípios) e não serve sozinho pra priorizar.
          const pr = prioridadeDe(r);
          return pr === 'alta' ? '#c9463c' : pr === 'media' ? '#7d3b34' : P.neutro;
        }
        if (r.lideres > 0 || r.liderados > 0) return tierDe('cobertura', r.porMil).cor;
        return r.status === 'priorizar' ? '#c9463c' : P[r.status];
      };
      // stats + live ranked list (escopados pela RA quando selecionada)
      const hi = scoped.filter(r => r.status !== 'neutro' && r.status !== 'fraco');
      // lista: 2024 → todo município com eleitorado, ranqueado por eleitorado;
      // RA selecionada → TODAS as cidades da região (ranking por índice); sem RA → só as de foco (índice ≥ 18)
      const m24 = layer === 'muni2024';
      const temFiltro = selRa || Object.values(this.filtros).some(v => v && v !== 'todos');
      const listRows = m24 ? scoped.filter(r => r.eleitorado > 0) : temFiltro ? scoped.filter(r => r.eleitorado > 0 || r.indice > 0) : hi;
      const top = listRows.slice().sort((a, b) => m24 ? b.eleitorado - a.eleitorado : b.indice - a.indice).map(r => ({
        ibge: r.code, nome: r.nome, status: r.status, statusLabel: r.statusLabel, pot: r.pot, indice: r.indice, pend: r.pend,
        liderados: r.liderados, lideres: r.lideres, ritmo: r.ritmo, eleitorado: r.eleitorado, vv: r.vv, ra: r.ra,
        historico: r.historico.slice().sort((a, b) => b.votos - a.votos),
        topLideres: (r.a && r.a.topLideres) || [], fonte,
      }));
      window.dispatchEvent(new CustomEvent('politix:mapstats', { detail: {
        priorizadas: hi.filter(r => r.status === 'priorizar').length,
        parciais: hi.filter(r => r.status === 'parcial').length,
        cobertas: hi.filter(r => r.status === 'coberto').length,
        totalHist: scoped.reduce((s, r) => s + r.pot, 0),
        totalLiderados: scoped.reduce((s, r) => s + r.liderJan, 0),
        munis: scoped.filter(r => r.eleitorado > 0).length,
        comLider: scoped.filter(r => r.lideres > 0).length,
        // mesma regra do vermelho no mapa — KPI e cor nunca podem discordar
        prioAlta: scoped.filter(r => r.lideres === 0 && prioridadeDe(r) === 'alta').length,
        prioMedia: scoped.filter(r => r.lideres === 0 && prioridadeDe(r) === 'media').length,
        eleitPrio: scoped.reduce((s, r) => s + ((r.lideres === 0 && prioridadeDe(r)) ? r.eleitorado : 0), 0),
        totalLideres: scoped.reduce((s, r) => s + r.lideres, 0),
        eleitAlcancado: scoped.reduce((s, r) => s + (r.lideres > 0 ? r.eleitorado : 0), 0),
        totalEleitorado: scoped.reduce((s, r) => s + r.eleitorado, 0),
        totalVV: scoped.reduce((s, r) => s + r.vv, 0),
        top,
      } }));
      const svg = d3.create('svg').attr('viewBox', `0 0 ${this._W} ${this._H}`).attr('width', '100%').attr('height', '100%')
        // em pé o desenho é mais largo que o quadro: a sobra vai pro RODAPÉ, que é
        // justamente onde o painel ao vivo entra — nunca uma faixa preta no meio
        .attr('preserveAspectRatio', this.vert() ? 'xMidYMin meet' : 'xMidYMid meet').style('display', 'block').style('font-family', '"Geist Mono",monospace');
      // o zoom continua no grupo de FORA (espaço de tela): arrastar e pinçar seguem o dedo.
      // a rotação mora num grupo interno, então a malha não precisa ser reprojetada.
      const gZoom = svg.append('g');
      const g = this.vert() ? gZoom.append('g').attr('transform', `translate(0,${W}) rotate(-90)`) : gZoom;
      const self = this;
      g.selectAll('path').data(rows).join('path')
        .attr('d', r => r.d)
        .attr('fill', r => fill(r))
        .attr('fill-opacity', 1)
        .attr('stroke', r => (selIbge && String(r.code) === selIbge) ? P.selLine : (fora(r) ? P.foraLine : P.line))
        // non-scaling-stroke: a divisa fica com a MESMA espessura em qualquer zoom (antes
        // ela era multiplicada pelo k e virava um traço grosso ao aproximar);
        // linejoin/linecap round tiram as pontas agudas dos vértices do polígono
        .attr('stroke-width', r => selIbge && String(r.code) === selIbge ? 1.6 : 0.35)
        .attr('vector-effect', 'non-scaling-stroke')
        .attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round')
        // marcação viva do que está selecionado: contorno tracejado que corre em volta,
        // mesma leitura do shimmer de carregamento — mostra o alvo sem tapar a cor da cidade
        .attr('class', r => (selIbge && String(r.code) === selIbge) ? 'px-sel' : null)
        .style('cursor', 'pointer')
        // hover: contorno BRANCO e mais grosso — o traço do tema (preto no dark) sumia
        // por cima das faixas de cor. Ao sair, volta ao traço original da cidade.
        .on('mousemove', function (ev, r) {
          self.tip(ev, r, fonte);
          d3.select(this).attr('stroke', P.selLine).attr('stroke-width', 1.4).raise();
        })
        .on('mouseleave', function (ev, r) {
          self.hideTip();
          const sel = selIbge && String(r.code) === selIbge;
          d3.select(this)
            .attr('stroke', sel ? P.selLine : (fora(r) ? P.foraLine : P.line))
            .attr('stroke-width', sel ? 1.6 : 0.35);
        })
        .on('click', (ev, r) => {
          window.dispatchEvent(new CustomEvent('politix:muni', { detail: {
            ibge: r.code, nome: r.nome, status: r.status, statusLabel: r.statusLabel, pot: r.pot, indice: r.indice, pend: r.pend,
            lideres: r.lideres, liderados: r.liderados, ritmo: r.ritmo,
            historico: r.historico.sort((a, b) => b.votos - a.votos),
            topLideres: (r.a && r.a.topLideres) || [], fonte,
          } }));
        })
        .on('dblclick', (ev, r) => { ev.stopPropagation(); self.zoomToFeature(r); }); // clique simples abre o painel; duplo aproxima
      // sobe a cidade aberta pro topo: senão os vizinhos desenham por cima do traço dela
      if (selIbge) g.selectAll('path').filter(r => r && String(r.code) === selIbge).raise();
      // contorno EXTERNO da RA selecionada: topojson.merge une os municípios num polígono
      // só, então sai a silhueta da região em vez de 39 contornos com as divisas internas
      if (selRa && this._topo && window.topojson && this._proj) {
        try {
          const dentro = new Set((this._rows || []).filter(r => r.ra === selRa).map(r => String(r.code)));
          const geos = this._topo.objects[this._topoKey].geometries
            .filter(gm => dentro.has(String(gm.properties && gm.properties.codarea)));
          if (geos.length) {
            const uniao = window.topojson.merge(this._topo, geos);
            const dPath = d3.geoPath(this._proj)(uniao);
            if (dPath) {
              g.append('path').attr('d', dPath).attr('class', 'px-sel')
                .attr('fill', 'none').attr('stroke', P.selLine).attr('stroke-width', 2)
                .attr('vector-effect', 'non-scaling-stroke')
                .attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round')
                .attr('pointer-events', 'none');
            }
          }
        } catch (e) {}
      }
      if (layer !== 'historico') {
        const pg = g.append('g').attr('pointer-events', 'none');
        rows.filter(r => r.c && !fora(r)).forEach(r => {
          const [x, y] = r.c;
          if (!isFinite(x) || !isFinite(y)) return;
          if (r.pend > 0 && r.liderados === 0 && r.lideres === 0) {
            // líder convidado (pendente) — marcador pequeno tracejado, em qualquer camada
            pg.append('circle').attr('cx', x).attr('cy', y).attr('r', 4)
              .attr('fill', 'none').attr('stroke', '#ffb224').attr('stroke-width', 1.6).attr('stroke-dasharray', '2.5,2.5');
          } else if (layer === 'rede' && r.liderados > 0) {
            // quantidade de liderados: só na camada "Rede atual" (na Cobertura, a cor da cidade já diz)
            pg.append('circle').attr('cx', x).attr('cy', y).attr('r', Math.min(3 + Math.sqrt(r.liderados) * 0.55, 16))
              .attr('fill', P.pin).attr('fill-opacity', 0.85).attr('stroke', P.pinRing).attr('stroke-width', 1.2);
          }
        });
      }
      // mínimo abaixo de 1: o "−" precisa AFASTAR de verdade (travado em 1 o mapa nunca
      // encolhia além do enquadramento inicial, e o painel lateral cobria parte do estado)
      const zoom = d3.zoom().scaleExtent([0.3, 14]).on('zoom', ev => { this._zt = ev.transform; gZoom.attr('transform', ev.transform); });
      // mapa girado sem bússola desorienta: no modo vertical o norte aponta pra ESQUERDA
      if (this.vert()) {
        // à esquerda, na faixa livre entre a barra de filtros (topo) e a legenda (base)
        const cx = 46, cy = Math.round(this._H * 0.75);
        const bus = svg.append('g').attr('pointer-events', 'none').attr('opacity', .6);
        bus.append('path').attr('d', `M${cx + 18},${cy} L${cx - 18},${cy} M${cx - 18},${cy} l8,-6 M${cx - 18},${cy} l8,6`)
          .attr('fill', 'none').attr('stroke', P.selLine).attr('stroke-width', 2.2)
          .attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round');
        bus.append('text').attr('x', cx - 18).attr('y', cy - 12).attr('fill', P.selLine)
          .attr('font-size', 15).attr('font-weight', 600).text('N');
      }
      svg.call(zoom);
      svg.on('dblclick.zoom', null); // duplo-clique é nosso (zoomToFeature), não o do d3.zoom
      this._svg = svg; this._zoom = zoom; // expõe pros controles +/−/centralizar da barra de cima
      this.innerHTML = '';
      svg.style('touch-action', 'none'); // sem isso o browser rouba pan/pinça do d3.zoom
      this.appendChild(svg.node());
      if (this._zt) svg.call(zoom.transform, this._zt);
      // zoom automático pra RA selecionada (só quando a RA muda)
      if (selRa !== this._lastSelRa) {
        this._lastSelRa = selRa;
        if (selRa) {
          const bs = scoped.map(r => r.b).filter(Boolean);
          if (bs.length) {
            const [[x0, y0], [x1, y1]] = this._bx([
              [Math.min(...bs.map(b => b[0][0])), Math.min(...bs.map(b => b[0][1]))],
              [Math.max(...bs.map(b => b[1][0])), Math.max(...bs.map(b => b[1][1]))],
            ]);
            const DW = this._W, DH = this._H;
            const k = Math.min(6, 0.5 / Math.max((x1 - x0) / DW, (y1 - y0) / DH, 0.0001)); // zoom folgado: mantém o resto do estado visível ao redor
            const t = d3.zoomIdentity.translate(DW / 2 - k * (x0 + x1) / 2, DH / 2 - k * (y0 + y1) / 2).scale(k);
            this._zt = t; svg.transition().duration(500).call(zoom.transform, t);
          }
        } else if (this._zt) { this._zt = d3.zoomIdentity; svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity); }
      }
      const tip = document.createElement('div');
      tip.style.cssText = 'position:absolute;pointer-events:none;display:none;z-index:6;max-width:270px;padding:9px 11px;border:1px solid var(--color-border,#242424);border-radius:0;background:var(--color-background-200,#111);color:var(--color-foreground,#ededed);font:12px "Geist Mono",monospace;box-shadow:0 4px 14px rgba(0,0,0,.12)';
      this.appendChild(tip); this._tip = tip;
    }
    // duplo-clique: aproxima e centraliza o município (mantém o painel aberto pelo click simples)
    zoomToFeature(r) {
      const d3 = window.d3; const svg = this._svg, zoom = this._zoom;
      if (!d3 || !svg || !zoom || !r || !r.b) return;
      const [[x0, y0], [x1, y1]] = this._bx(r.b);
      const DW = this._W, DH = this._H;
      const k = Math.min(8, 0.9 / Math.max((x1 - x0) / DW, (y1 - y0) / DH, 0.0001));
      const t = d3.zoomIdentity.translate(DW / 2 - k * (x0 + x1) / 2, DH / 2 - k * (y0 + y1) / 2).scale(k);
      this._zt = t;
      svg.transition().duration(600).call(zoom.transform, t);
    }
    // caixa que envolve TODOS os municípios da RA selecionada (null = nenhuma RA)
    caixaRA() {
      const ra = this.getAttribute('data-sel-ra') || '';
      if (!ra || ra === 'todos') return null;
      const dentro = (this._rows || []).filter(r => r.ra === ra && r.b);
      if (!dentro.length) return null;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      dentro.forEach(r => {
        x0 = Math.min(x0, r.b[0][0]); y0 = Math.min(y0, r.b[0][1]);
        x1 = Math.max(x1, r.b[1][0]); y1 = Math.max(y1, r.b[1][1]);
      });
      return this._bx([[x0, y0], [x1, y1]]);
    }
    // com RA selecionada o "todo" do mapa é a RA, não o estado: centralizar cai nela e
    // o +/− amplia em torno do centro dela (senão o recorte foge da tela ao aproximar)
    enquadrar(b, dur = 500) {
      const d3 = window.d3; const svg = this._svg, zoom = this._zoom;
      if (!d3 || !svg || !zoom || !b) return;
      const [[x0, y0], [x1, y1]] = b;
      // mesmo enquadramento folgado (0.5) de quando a RA é escolhida: centralizar devolve
      // exatamente a vista inicial da região, com o resto do estado visível em volta
      const DW = this._W, DH = this._H;
      const k = Math.min(6, 0.5 / Math.max((x1 - x0) / DW, (y1 - y0) / DH, 0.0001));
      const t = d3.zoomIdentity.translate(DW / 2 - k * (x0 + x1) / 2, DH / 2 - k * (y0 + y1) / 2).scale(k);
      this._zt = t;
      svg.transition().duration(dur).call(zoom.transform, t);
    }
    ctl(action, ibge) {
      const d3 = window.d3; const svg = this._svg, zoom = this._zoom;
      if (!d3 || !svg || !zoom) return;
      if (action === 'focus') {
        // busca por nome: aproxima o município E dispara o mesmo evento do clique,
        // pra o painel receber exatamente o mesmo detalhe (nada de dado paralelo)
        const r = (this._rows || []).find(x => String(x.code) === String(ibge));
        if (!r) return;
        this.zoomToFeature(r);
        window.dispatchEvent(new CustomEvent('politix:muni', { detail: {
          ibge: r.code, nome: r.nome, status: r.status, statusLabel: r.statusLabel, pot: r.pot, indice: r.indice, pend: r.pend,
          lideres: r.lideres, liderados: r.liderados, ritmo: r.ritmo,
          historico: r.historico.slice().sort((a, b) => b.votos - a.votos),
          topLideres: (r.a && r.a.topLideres) || [], fonte: this.getAttribute('fonte') || 'familia',
        } }));
        return;
      }
      const bra = this.caixaRA();
      // âncora do +/−: centro da RA em coordenadas de tela, ou o centro do quadro
      const pivo = () => {
        if (!bra) return [this._W / 2, this._H / 2];
        const t = this._zt || d3.zoomIdentity;
        return t.apply([(bra[0][0] + bra[1][0]) / 2, (bra[0][1] + bra[1][1]) / 2]);
      };
      if (action === 'in') svg.transition().duration(220).call(zoom.scaleBy, 1.6, pivo());
      else if (action === 'out') svg.transition().duration(220).call(zoom.scaleBy, 0.63, pivo());
      else if (action === 'reset') {
        if (bra) this.enquadrar(bra, 400);
        else svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity);
      }
    }
    tip(ev, r, fonte) {
      const rect = this.getBoundingClientRect();
      const t = this._tip; if (!t) return;
      // modo touch não tem hover: a tooltip abriria no tap e ficaria presa.
      // O tap já abre o painel da cidade, que mostra tudo isso e mais.
      if (window.PX_TOUCH) return;
      const place = () => {
        t.style.display = 'block';
        const x = ev.clientX - rect.left + 14, y = ev.clientY - rect.top + 10;
        t.style.left = Math.min(x, rect.width - 250) + 'px'; t.style.top = Math.min(y, rect.height - 90) + 'px';
      };
      // camada Município 2024: só dado oficial do TSE — eleitorado, votos válidos e comparecimento.
      // NÃO existe comparação entre eleições aqui, então nada de "crescimento".
      if ((this.getAttribute('layer') || '') === 'muni2024') {
        const comp = r.eleitorado > 0 && r.vv > 0 ? (r.vv / r.eleitorado * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%' : '—';
        t.innerHTML = `<div style="font-weight:600;margin-bottom:2px">${r.nome}</div>
<div style="color:var(--color-muted-foreground,#878787)">${r.ra ? 'RA ' + r.ra : 'região não informada'}</div>
<div style="color:var(--color-muted-foreground,#878787)">Eleitorado 2024: <b style="font-variant-numeric:tabular-nums;color:var(--color-foreground,#ededed)">${r.eleitorado ? fmt(r.eleitorado) : '—'}</b></div>
<div style="color:var(--color-muted-foreground,#878787)">Votos válidos 2024: <b style="font-variant-numeric:tabular-nums;color:var(--color-foreground,#ededed)">${r.vv ? fmt(r.vv) : '—'}</b> · ${comp} do eleitorado</div>
<div style="color:var(--color-muted-foreground,#878787)">Rede atual: <b style="font-variant-numeric:tabular-nums;color:var(--color-foreground,#ededed)">${r.lideres}</b> líder(es)${semLid() ? '' : ' · ' + fmt(r.liderados) + ' liderados'}</div>`;
        return place();
      }
      const fl = fonteLabel(fonte);
      const porMilF = (r.porMil || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
      const alvoF = (r.eleitorado && !semLid()) ? ` · ${porMilF}/mil eleitores (alvo 2/mil)` : '';
      let verdict, vc;
      // a contagem real manda: com líder/liderado na cidade, nunca dizer "nenhum líder"
      if (semLid() && r.lideres > 0) { verdict = `${r.lideres} líder(es) ativo(s) nesta cidade`; vc = r.lideres >= 5 ? '#2f9e64' : '#b06a12'; }
      else if (r.status === 'coberto') { verdict = `Coberta · ${r.lideres} líder(es) ativo(s)${alvoF}`; vc = '#2f9e64'; }
      else if (r.lideres > 0 || r.liderados > 0) { verdict = `Presença · ${r.lideres} líder(es) ativo(s) · ${fmt(r.liderados)} liderado(s)${alvoF}`; vc = '#b06a12'; }
      else if (r.pend > 0) { verdict = `${r.pend} líder(es) convidado(s) · aguardando ativar (pendente)`; vc = '#b06a12'; }
      else if (r.status === 'neutro' || r.status === 'fraco') { verdict = 'Histórico baixo da família aqui · prioridade baixa'; vc = 'var(--mutedsoft,#93939f)'; }
      else { const nv = r.indice >= 40 ? 'alto' : 'médio'; verdict = `Descoberta · nenhum líder cadastrado. Potencial ${nv}`; vc = r.indice >= 40 ? '#c23b3b' : '#b06a12'; }
      t.innerHTML = `<div style="font-weight:600;margin-bottom:2px">${r.nome}</div>
<div style="color:var(--color-muted-foreground,#878787)">Potencial da família (${fl}): <b style="color:var(--color-foreground,#ededed)">${r.indice >= 40 ? 'alto' : r.indice >= 18 ? 'médio' : 'baixo'} · índice ${r.indice}</b></div>
<div style="color:var(--color-muted-foreground,#878787)">Rede atual: ${semLid() ? '' : '<b style="font-variant-numeric:tabular-nums;color:var(--color-foreground,#ededed)">' + fmt(r.liderados) + '</b> liderados · '}<b style="font-variant-numeric:tabular-nums;color:var(--color-foreground,#ededed)">${r.lideres}</b> líder(es)${r.pend ? ' · <b style="color:#ffb224">' + r.pend + ' pendente(s)</b>' : ''}</div>
<div style="margin-top:3px;font-weight:600;color:${vc}">${verdict}</div>`;
      place();
    }
    hideTip() { if (this._tip) this._tip.style.display = 'none'; }
  }
  if (!customElements.get('sp-choropleth')) customElements.define('sp-choropleth', SPChoropleth);
})();
