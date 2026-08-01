// <sp-choropleth> — São Paulo municipality choropleth: rede × histórico da família.
// Attributes: layer (cobertura|historico|rede|muni2024), fonte (candidato|irmao|pai|familia),
// ano (todos|2024|2022|2018|2012), theme (light|dark), data-anchors (JSON).
// Events (window): 'politix:muni' (click detail), 'politix:mapstats' (KPI counts).
(function () {
  const W = 880, H = 620;
  const MESH_URL = 'https://servicodados.ibge.gov.br/api/v3/malhas/estados/35?formato=application/vnd.geo+json&intrarregiao=municipio&qualidade=minima';
  const NAMES_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades/estados/35/municipios';
  const GSP = ['3550308', '3534401', '3505708', '3547304', '3510609', '3518800', '3513009', '3522505', '3509205', '3525003', '3539103', '3552809', '3515004', '3513801', '3548708', '3547809'];
  const PAL = {
    dark: { neutro: '#1a1a1a', fraco: '#5e4a1e', coberto: '#ededed', parcial: '#878787', priorizar: '#ffb224', seq: ['#111111', '#454545', '#ededed'], hseq: ['#181818', '#3a2a08', '#7a4d00', '#c67a00', '#ffb224', '#ffe3ad'], line: '#000000', pin: '#ededed', pinRing: '#000000' },
    light: { neutro: '#ececec', fraco: '#f0dca0', coberto: '#171717', parcial: '#8f8f8f', priorizar: '#c77700', seq: ['#ededed', '#b8b8b8', '#171717'], hseq: ['#f4f1e8', '#f7d17a', '#eda01f', '#cc6f00', '#9a4a00', '#5a2a00'], line: '#ffffff', pin: '#171717', pinRing: '#ffffff' },
  };
  const ANO_SYNTH = { '2024': 0.35, '2022': 0.6, '2018': 0.35, '2012': 0.2 };
  const MEMBROS = { candidato: ['candidato'], irmao: ['irmao'], pai: ['pai'], familia: ['candidato', 'irmao', 'pai'] };
  const MEMBRO_L = { candidato: 'Wesley Cezar (Lelinho)', irmao: 'Elvis Cezar', pai: 'Cezar (Cezão)' };

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
  function veredito(lideres, liderados, eleitorado) {
    const l = lideres || 0, ld = liderados || 0;
    const porMil = eleitorado ? ld / (eleitorado / 1000) : 0;
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
    static get observedAttributes() { return ['layer', 'fonte', 'ano', 'theme', 'data-anchors', 'data-sel-ra']; }
    connectedCallback() {
      if (this._init) return; this._init = true;
      this._onCtl = e => this.ctl(e.detail && e.detail.action);
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
    async load() {
      try {
        const [mesh, names] = await Promise.all([fetch(MESH_URL).then(r => { if (!r.ok) throw 0; return r.json(); }), fetch(NAMES_URL).then(r => { if (!r.ok) throw 0; return r.json(); })]);
        const nameByCode = {}; names.forEach(m => { nameByCode[String(m.id)] = m.nome; });
        const d3 = window.d3;
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
      const membros = MEMBROS[fonte] || MEMBROS.familia;
      const A = {}; this.anchors.forEach(a => { A[String(a.ibge)] = a; });
      const rows = this._feats.map(ft => {
        const a = A[ft.code];
        let pot = 0, historico = [];
        if (a) {
          membros.forEach(m => (a.hist[m] || []).forEach(hh => {
            if (ano !== 'todos' && String(hh.ano) !== ano) return;
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
        return { ...ft, a, pot, indice, historico, liderados, lideres, pend, liderJan, eleitorado, vv, ra: a && a.ra ? a.ra : null, ritmo: a ? a.rede.ritmo : 0 };
      });
      const maxPot = Math.max(...rows.map(r => r.pot), 1);
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
      // RA agora é o nome oficial vindo do banco (municipio_politico.ra, 16 regiões) — string, não índice
      const selRa = this.getAttribute('data-sel-ra') || '';
      const scoped = selRa ? rows.filter(r => r.ra === selRa) : rows; // RA selecionada
      const maxLid = Math.max(...rows.map(r => r.liderJan), 1);
      const maxEl = Math.max(...rows.map(r => r.eleitorado), 1);
      // eleitorado é MUITO desigual (capital ~9M × cidade de 1k): escala log pra não achatar o mapa
      const elN = v => v > 0 ? Math.log10(1 + v) / Math.log10(1 + maxEl) : 0;
      const seq = d3.interpolateRgbBasis(P.seq);
      const hseq = d3.interpolateRgbBasis(P.hseq);
      const fill = r => {
        if (selRa && r.ra !== selRa) return P.neutro; // fora da RA = cinza chapado (sem cor vazando)
        if (layer === 'historico') return hseq(Math.pow(r.indice / 100, 0.6)); // heat âmbar, realça o meio
        if (layer === 'rede') return r.liderJan > 0 ? seq(0.25 + 0.75 * Math.sqrt(r.liderJan / maxLid)) : P.neutro;
        if (layer === 'muni2024') return r.eleitorado > 0 ? tierDe('muni2024', r.eleitorado).cor : P.neutro;
        // Cobertura em faixas verde→vermelho SÓ onde há rede real. Sem rede, vermelho fica
        // reservado a quem tem potencial da família (é o que pede ação); o resto segue cinza,
        // senão o estado inteiro ficaria vermelho e a cor não diria nada.
        if (r.lideres > 0 || r.liderados > 0) return tierDe('cobertura', r.porMil).cor;
        return r.status === 'priorizar' ? '#c9463c' : P[r.status];
      };
      // stats + live ranked list (escopados pela RA quando selecionada)
      const hi = scoped.filter(r => r.status !== 'neutro' && r.status !== 'fraco');
      // lista: 2024 → todo município com eleitorado, ranqueado por eleitorado;
      // RA selecionada → TODAS as cidades da região (ranking por índice); sem RA → só as de foco (índice ≥ 18)
      const m24 = layer === 'muni2024';
      const listRows = m24 ? scoped.filter(r => r.eleitorado > 0) : selRa ? scoped.filter(r => r.indice > 0) : hi;
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
        totalEleitorado: scoped.reduce((s, r) => s + r.eleitorado, 0),
        totalVV: scoped.reduce((s, r) => s + r.vv, 0),
        top,
      } }));
      const svg = d3.create('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', '100%').attr('height', '100%').style('display', 'block').style('font-family', '"Geist Mono",monospace');
      const g = svg.append('g');
      const self = this;
      g.selectAll('path').data(rows).join('path')
        .attr('d', r => r.d)
        .attr('fill', r => fill(r))
        .attr('fill-opacity', r => (selRa && r.ra !== selRa) ? 0.35 : 1)
        .attr('stroke', P.line).attr('stroke-width', 0.4)
        .style('cursor', 'pointer')
        .on('mousemove', function (ev, r) { self.tip(ev, r, fonte); d3.select(this).attr('stroke-width', 1.4).raise(); })
        .on('mouseleave', function () { self.hideTip(); d3.select(this).attr('stroke-width', 0.4); })
        .on('click', (ev, r) => {
          window.dispatchEvent(new CustomEvent('politix:muni', { detail: {
            ibge: r.code, nome: r.nome, status: r.status, statusLabel: r.statusLabel, pot: r.pot, indice: r.indice, pend: r.pend,
            lideres: r.lideres, liderados: r.liderados, ritmo: r.ritmo,
            historico: r.historico.sort((a, b) => b.votos - a.votos),
            topLideres: (r.a && r.a.topLideres) || [], fonte,
          } }));
        })
        .on('dblclick', (ev, r) => { ev.stopPropagation(); self.zoomToFeature(r); }); // clique simples abre o painel; duplo aproxima
      if (layer !== 'historico') {
        const pg = g.append('g').attr('pointer-events', 'none');
        rows.filter(r => r.c && (!selRa || r.ra === selRa)).forEach(r => {
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
      const zoom = d3.zoom().scaleExtent([0.3, 14]).on('zoom', ev => { this._zt = ev.transform; g.attr('transform', ev.transform); });
      svg.call(zoom);
      svg.on('dblclick.zoom', null); // duplo-clique é nosso (zoomToFeature), não o do d3.zoom
      this._svg = svg; this._zoom = zoom; // expõe pros controles +/−/centralizar da barra de cima
      this.innerHTML = '';
      this.appendChild(svg.node());
      if (this._zt) svg.call(zoom.transform, this._zt);
      // zoom automático pra RA selecionada (só quando a RA muda)
      if (selRa !== this._lastSelRa) {
        this._lastSelRa = selRa;
        if (selRa) {
          const bs = scoped.map(r => r.b).filter(Boolean);
          if (bs.length) {
            const x0 = Math.min(...bs.map(b => b[0][0])), y0 = Math.min(...bs.map(b => b[0][1]));
            const x1 = Math.max(...bs.map(b => b[1][0])), y1 = Math.max(...bs.map(b => b[1][1]));
            const k = Math.min(6, 0.5 / Math.max((x1 - x0) / W, (y1 - y0) / H, 0.0001)); // zoom folgado: mantém o resto do estado visível ao redor
            const t = d3.zoomIdentity.translate(W / 2 - k * (x0 + x1) / 2, H / 2 - k * (y0 + y1) / 2).scale(k);
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
      const [[x0, y0], [x1, y1]] = r.b;
      const k = Math.min(8, 0.9 / Math.max((x1 - x0) / W, (y1 - y0) / H, 0.0001));
      const t = d3.zoomIdentity.translate(W / 2 - k * (x0 + x1) / 2, H / 2 - k * (y0 + y1) / 2).scale(k);
      this._zt = t;
      svg.transition().duration(600).call(zoom.transform, t);
    }
    ctl(action) {
      const d3 = window.d3; const svg = this._svg, zoom = this._zoom;
      if (!d3 || !svg || !zoom) return;
      if (action === 'in') svg.transition().duration(220).call(zoom.scaleBy, 1.6);
      else if (action === 'out') svg.transition().duration(220).call(zoom.scaleBy, 0.63);
      else if (action === 'reset') svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity);
    }
    tip(ev, r, fonte) {
      const rect = this.getBoundingClientRect();
      const t = this._tip; if (!t) return;
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
<div style="color:var(--color-muted-foreground,#878787)">Rede atual: <b style="font-variant-numeric:tabular-nums;color:var(--color-foreground,#ededed)">${fmt(r.liderados)}</b> liderados · ${r.lideres} líder(es)</div>`;
        return place();
      }
      const fl = { candidato: 'Wesley Cezar', irmao: 'Elvis Cezar', pai: 'Cezão', familia: 'Família Cezar' }[fonte];
      const porMilF = (r.porMil || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
      const alvoF = r.eleitorado ? ` · ${porMilF}/mil eleitores (alvo 2/mil)` : '';
      let verdict, vc;
      // a contagem real manda: com líder/liderado na cidade, nunca dizer "nenhum líder"
      if (r.status === 'coberto') { verdict = `Coberta — ${r.lideres} líder(es) ativo(s)${alvoF}`; vc = '#2f9e64'; }
      else if (r.lideres > 0 || r.liderados > 0) { verdict = `Presença · ${r.lideres} líder(es) ativo(s) · ${fmt(r.liderados)} liderado(s)${alvoF}`; vc = '#b06a12'; }
      else if (r.pend > 0) { verdict = `${r.pend} líder(es) convidado(s) — aguardando ativar (pendente)`; vc = '#b06a12'; }
      else if (r.status === 'neutro' || r.status === 'fraco') { verdict = 'Histórico baixo da família aqui — prioridade baixa'; vc = 'var(--mutedsoft,#93939f)'; }
      else { const nv = r.indice >= 40 ? 'alto' : 'médio'; verdict = `Descoberta — nenhum líder cadastrado. Potencial ${nv}`; vc = r.indice >= 40 ? '#c23b3b' : '#b06a12'; }
      t.innerHTML = `<div style="font-weight:600;margin-bottom:2px">${r.nome}</div>
<div style="color:var(--color-muted-foreground,#878787)">Potencial da família (${fl}): <b style="color:var(--color-foreground,#ededed)">${r.indice >= 40 ? 'alto' : r.indice >= 18 ? 'médio' : 'baixo'} · índice ${r.indice}</b></div>
<div style="color:var(--color-muted-foreground,#878787)">Rede atual: <b style="font-variant-numeric:tabular-nums;color:var(--color-foreground,#ededed)">${fmt(r.liderados)}</b> liderados · ${r.lideres} líder(es)${r.pend ? ' · <b style="color:#ffb224">' + r.pend + ' pendente(s)</b>' : ''}</div>
<div style="margin-top:3px;font-weight:600;color:${vc}">${verdict}</div>`;
      place();
    }
    hideTip() { if (this._tip) this._tip.style.display = 'none'; }
  }
  if (!customElements.get('sp-choropleth')) customElements.define('sp-choropleth', SPChoropleth);
})();
