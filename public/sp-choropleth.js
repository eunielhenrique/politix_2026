// <sp-choropleth> — São Paulo municipality choropleth: rede × histórico da família.
// Attributes: layer (cobertura|historico|rede), fonte (candidato|irmao|pai|familia),
// ano (todos|2024|2022|2018|2012), theme (light|dark), data-anchors (JSON).
// Events (window): 'politix:muni' (click detail), 'politix:mapstats' (KPI counts).
(function () {
  const W = 880, H = 620;
  const MESH_URL = 'https://servicodados.ibge.gov.br/api/v3/malhas/estados/35?formato=application/vnd.geo+json&intrarregiao=municipio&qualidade=minima';
  const NAMES_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades/estados/35/municipios';
  const GSP = ['3550308', '3534401', '3505708', '3547304', '3510609', '3518800', '3513009', '3522505', '3509205', '3525003', '3539103', '3552809', '3515004', '3513801', '3548708', '3547809'];
  const PAL = {
    dark: { neutro: '#1a1a1a', coberto: '#ededed', parcial: '#878787', priorizar: '#ffb224', seq: ['#111111', '#454545', '#ededed'], line: '#000000', pin: '#ededed', pinRing: '#000000' },
    light: { neutro: '#ececec', coberto: '#171717', parcial: '#8f8f8f', priorizar: '#c77700', seq: ['#ededed', '#b8b8b8', '#171717'], line: '#ffffff', pin: '#171717', pinRing: '#ffffff' },
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

  class SPChoropleth extends HTMLElement {
    static get observedAttributes() { return ['layer', 'fonte', 'ano', 'theme', 'data-anchors']; }
    connectedCallback() {
      if (this._init) return; this._init = true;
      this.style.display = 'block'; this.style.position = 'relative';
      this.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;min-height:420px;font:13px var(--font-mono,monospace);color:var(--color-muted-foreground,#878787)">Carregando os 645 municípios (IBGE)…</div>';
      waitFor(() => window.d3, () => this.load());
    }
    attributeChangedCallback() { if (this._feats) this.render(); }
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
          return { code, nome: nameByCode[code] || ('Município ' + code), d: path(f), b: path.bounds(f) };
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
        const liderados = a ? a.rede.liderados : 0;
        const lideres = a ? a.rede.lideres : 0;
        const liderJan = liderados;
        return { ...ft, a, pot, historico, liderados, lideres, liderJan, ritmo: a ? a.rede.ritmo : 0 };
      });
      const maxPot = Math.max(...rows.map(r => r.pot), 1);
      const thr = 0.045 * maxPot;
      rows.forEach(r => {
        if (r.pot < thr) r.status = 'neutro';
        else {
          const cov = r.liderados * 100 / r.pot;
          r.status = (cov >= 0.2 && r.liderados >= 80) ? 'coberto' : r.liderados >= 25 ? 'parcial' : 'priorizar';
        }
        r.statusLabel = { neutro: 'Neutro (histórico baixo)', coberto: 'Coberto', parcial: 'Abaixo do potencial', priorizar: 'Priorizar' }[r.status];
      });
      return { rows, maxPot, fonte };
    }
    render() {
      const d3 = window.d3;
      const layer = this.getAttribute('layer') || 'cobertura';
      const theme = this.getAttribute('theme') === 'light' ? 'light' : 'dark';
      const P = PAL[theme];
      const { rows, maxPot, fonte } = this.values();
      const maxLid = Math.max(...rows.map(r => r.liderJan), 1);
      const seq = d3.interpolateRgbBasis(P.seq);
      const fill = r => {
        if (layer === 'historico') return seq(Math.sqrt(r.pot / maxPot));
        if (layer === 'rede') return r.liderJan > 0 ? seq(0.25 + 0.75 * Math.sqrt(r.liderJan / maxLid)) : P.neutro;
        return P[r.status];
      };
      // stats + live ranked list
      const hi = rows.filter(r => r.status !== 'neutro');
      const score = r => r.pot * (1 - Math.min(r.liderados / 150, 1));
      const top = hi.slice().sort((a, b) => score(b) - score(a)).slice(0, 9).map(r => ({
        ibge: r.code, nome: r.nome, status: r.status, statusLabel: r.statusLabel, pot: r.pot,
        liderados: r.liderados, lideres: r.lideres, ritmo: r.ritmo,
        historico: r.historico.slice().sort((a, b) => b.votos - a.votos),
        topLideres: (r.a && r.a.topLideres) || [], fonte,
      }));
      window.dispatchEvent(new CustomEvent('politix:mapstats', { detail: {
        priorizadas: hi.filter(r => r.status === 'priorizar').length,
        parciais: hi.filter(r => r.status === 'parcial').length,
        cobertas: hi.filter(r => r.status === 'coberto').length,
        totalHist: rows.reduce((s, r) => s + r.pot, 0),
        totalLiderados: rows.reduce((s, r) => s + r.liderJan, 0),
        top,
      } }));
      const svg = d3.create('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', '100%').attr('height', '100%').style('display', 'block').style('font-family', '"Geist Mono",monospace');
      const g = svg.append('g');
      const self = this;
      g.selectAll('path').data(rows).join('path')
        .attr('d', r => r.d)
        .attr('fill', r => fill(r))
        .attr('stroke', P.line).attr('stroke-width', 0.4)
        .style('cursor', 'pointer')
        .on('mousemove', function (ev, r) { self.tip(ev, r, fonte); d3.select(this).attr('stroke-width', 1.4).raise(); })
        .on('mouseleave', function () { self.hideTip(); d3.select(this).attr('stroke-width', 0.4); })
        .on('click', (ev, r) => {
          window.dispatchEvent(new CustomEvent('politix:muni', { detail: {
            ibge: r.code, nome: r.nome, status: r.status, statusLabel: r.statusLabel, pot: r.pot,
            lideres: r.lideres, liderados: r.liderados, ritmo: r.ritmo,
            historico: r.historico.sort((a, b) => b.votos - a.votos),
            topLideres: (r.a && r.a.topLideres) || [], fonte,
          } }));
        });
      if (layer !== 'historico') {
        const pins = rows.filter(r => r.a && r.liderJan > 0);
        const pg = g.append('g').attr('pointer-events', 'none');
        pins.forEach(r => {
          const [x, y] = this._proj([r.a.lng, r.a.lat]);
          pg.append('circle').attr('cx', x).attr('cy', y).attr('r', Math.min(3 + Math.sqrt(r.liderJan) * 0.55, 16))
            .attr('fill', P.pin).attr('fill-opacity', 0.85).attr('stroke', P.pinRing).attr('stroke-width', 1.2);
        });
      }
      const zoom = d3.zoom().scaleExtent([1, 14]).on('zoom', ev => { this._zt = ev.transform; g.attr('transform', ev.transform); });
      svg.call(zoom);
      this.innerHTML = '';
      this.appendChild(svg.node());
      if (this._zt) svg.call(zoom.transform, this._zt);
      // toolbar
      const bar = document.createElement('div');
      bar.style.cssText = `position:absolute;bottom:12px;right:${window.innerWidth < 900 ? (window.innerWidth > window.innerHeight ? '296px' : '12px') : '344px'};display:flex;gap:6px;z-index:5`;
      const mk = (label, title, fn, w) => { const b = document.createElement('button'); b.textContent = label; b.title = title; b.style.cssText = `height:30px;min-width:${w || 30}px;padding:0 8px;border:1px solid var(--color-border,#242424);border-radius:0;background:var(--color-background-200,#111);color:var(--color-foreground,#ededed);font:500 12px "Geist Mono",monospace;cursor:pointer`; b.onclick = fn; return b; };
      const zoomBy = k => svg.transition().duration(250).call(zoom.scaleBy, k);
      bar.appendChild(mk('+', 'Aproximar', () => zoomBy(1.6)));
      bar.appendChild(mk('−', 'Afastar', () => zoomBy(0.63)));
      bar.appendChild(mk('Estado', 'Ver o estado inteiro', () => svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity), 30));
      bar.appendChild(mk('Grande SP', 'Focar na Grande São Paulo', () => {
        const bs = rows.filter(r => GSP.includes(r.code)).map(r => r.b);
        if (!bs.length) return;
        const x0 = Math.min(...bs.map(b => b[0][0])), y0 = Math.min(...bs.map(b => b[0][1]));
        const x1 = Math.max(...bs.map(b => b[1][0])), y1 = Math.max(...bs.map(b => b[1][1]));
        const k = Math.min(14, 0.85 / Math.max((x1 - x0) / W, (y1 - y0) / H));
        const t = d3.zoomIdentity.translate(W / 2 - k * (x0 + x1) / 2, H / 2 - k * (y0 + y1) / 2).scale(k);
        svg.transition().duration(500).call(zoom.transform, t);
      }, 30));
      this.appendChild(bar);
      const tip = document.createElement('div');
      tip.style.cssText = 'position:absolute;pointer-events:none;display:none;z-index:6;max-width:270px;padding:9px 11px;border:1px solid var(--color-border,#242424);border-radius:0;background:var(--color-background-200,#111);color:var(--color-foreground,#ededed);font:12px "Geist Mono",monospace;box-shadow:0 4px 14px rgba(0,0,0,.12)';
      this.appendChild(tip); this._tip = tip;
    }
    tip(ev, r, fonte) {
      const rect = this.getBoundingClientRect();
      const t = this._tip; if (!t) return;
      const fl = { candidato: 'Wesley Cezar', irmao: 'Elvis Cezar', pai: 'Cezão', familia: 'Família Cezar' }[fonte];
      const porMil = r.pot > 0 ? r.liderados / r.pot * 1000 : 0;
      const porMilF = porMil.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
      let verdict, vc;
      if (r.status === 'neutro') { verdict = 'Histórico baixo da família aqui — prioridade baixa'; vc = 'var(--mutedsoft,#93939f)'; }
      else if (r.liderados === 0) { verdict = 'NÃO coberta — nenhum líder ativo. Alto potencial descoberto'; vc = '#c23b3b'; }
      else if (r.status === 'coberto') { verdict = `Coberta e no ritmo do potencial (${Math.min(999, Math.round(porMil / 2 * 100))}% do alvo)`; vc = '#2f9e64'; }
      else { verdict = `Coberta, mas ABAIXO do potencial (cobrindo ${Math.min(999, Math.round(porMil / 2 * 100))}% do alvo)`; vc = '#b06a12'; }
      t.innerHTML = `<div style="font-weight:600;margin-bottom:2px">${r.nome}</div>
<div style="color:var(--color-muted-foreground,#878787)">Potencial da família (${fl}): <b style="color:var(--color-foreground,#ededed)">${r.pot >= 60000 ? 'alto' : r.pot >= 15000 ? 'médio' : 'baixo'} · índice ${Math.max(1, Math.min(99, Math.round(r.pot / 1500)))}</b></div>
<div style="color:var(--color-muted-foreground,#878787)">Rede atual: <b style="font-variant-numeric:tabular-nums;color:var(--color-foreground,#ededed)">${fmt(r.liderados)}</b> liderados · ${r.lideres} líder(es)</div>
<div style="margin-top:3px;font-weight:600;color:${vc}">${verdict}</div>`;
      t.style.display = 'block';
      const x = ev.clientX - rect.left + 14, y = ev.clientY - rect.top + 10;
      t.style.left = Math.min(x, rect.width - 250) + 'px'; t.style.top = Math.min(y, rect.height - 90) + 'px';
    }
    hideTip() { if (this._tip) this._tip.style.display = 'none'; }
  }
  if (!customElements.get('sp-choropleth')) customElements.define('sp-choropleth', SPChoropleth);
})();
