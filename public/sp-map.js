// <sp-map> — São Paulo state map (real IBGE geometry) with coverage pins.
// Requires window.d3 (loaded via pinned tag in the page head).
// Attributes: data-cities (JSON array), theme ("light"|"dark").
(function () {
  const W = 720, H = 500;
  const STATUS_COLORS = { coberto: 'var(--pin-coberto, #ededed)', parcial: 'var(--pin-parcial, #878787)', priorizar: 'var(--pin-priorizar, #ffb224)' };
  const IBGE_URL = 'https://servicodados.ibge.gov.br/api/v3/malhas/estados/35?formato=application/vnd.geo+json';

  // d3 expects spherical winding; IBGE rings come reversed → rewind if area covers the globe
  function rewind(feature) {
    const d3 = window.d3;
    if (!d3 || d3.geoArea(feature) <= Math.PI) return;
    const g = feature.geometry;
    const rev = rings => rings.forEach(r => r.reverse());
    if (g.type === 'Polygon') rev(g.coordinates);
    else if (g.type === 'MultiPolygon') g.coordinates.forEach(rev);
    if (d3.geoArea(feature) > Math.PI) { // still wrong? revert
      if (g.type === 'Polygon') rev(g.coordinates);
      else if (g.type === 'MultiPolygon') g.coordinates.forEach(rev);
    }
  }

  function waitFor(cond, cb, tries = 200) {
    if (cond()) return cb();
    if (tries <= 0) return;
    setTimeout(() => waitFor(cond, cb, tries - 1), 50);
  }

  class SPMap extends HTMLElement {
    static get observedAttributes() { return ['data-cities', 'theme']; }
    connectedCallback() {
      this.style.display = 'block';
      this.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;min-height:320px;font:13px var(--font-mono,monospace);color:var(--color-muted-foreground,#878787)">Carregando mapa de São Paulo…</div>';
      waitFor(() => window.d3, () => this.load());
    }
    attributeChangedCallback() { if (this._geo) this.render(); }
    async load() {
      try {
        const res = await fetch(IBGE_URL);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const geo = await res.json();
        const fc = geo.type === 'FeatureCollection' ? geo : { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: geo, properties: {} }] };
        fc.features.forEach(f => rewind(f));
        this._geo = fc;
        this.render();
      } catch (e) {
        this.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;min-height:320px;font:13px var(--font-mono,monospace);color:var(--color-muted-foreground,#878787);text-align:center;padding:24px">Não foi possível carregar o contorno oficial (IBGE).<br>Verifique a conexão e recarregue.</div>';
      }
    }
    render() {
      const d3 = window.d3;
      let cities = [];
      try { cities = JSON.parse(this.getAttribute('data-cities') || '[]'); } catch (e) {}
      const proj = d3.geoMercator().fitExtent([[16, 16], [W - 16, H - 16]], this._geo);
      const path = d3.geoPath(proj);
      const maxPot = Math.max(1, ...cities.map(c => c.potencial || 0));
      const rPot = d3.scaleSqrt().domain([0, maxPot]).range([0, 44]);
      const svg = d3.create('svg')
        .attr('viewBox', `0 0 ${W} ${H}`)
        .attr('width', '100%').attr('height', '100%')
        .style('display', 'block').style('font-family', '"Geist Mono", monospace');
      svg.append('path').datum(this._geo)
        .attr('d', path)
        .attr('fill', 'var(--map-fill, #eeece7)')
        .attr('stroke', 'var(--map-stroke, #93939f)')
        .attr('stroke-width', 1.2)
        .attr('stroke-linejoin', 'round');
      const g = svg.append('g');
      cities.forEach(c => {
        const [x, y] = proj([c.lng, c.lat]);
        const grp = g.append('g').attr('transform', `translate(${x},${y})`).style('cursor', 'default');
        // TSE potential halo (reference layer — never summed with cadastros)
        grp.append('circle').attr('r', rPot(c.potencial || 0))
          .attr('fill', 'var(--map-halo, #75758a)').attr('fill-opacity', 0.10)
          .attr('stroke', 'var(--map-halo, #75758a)').attr('stroke-opacity', 0.25)
          .attr('stroke-dasharray', '3 3').attr('stroke-width', 1);
        if (c.status === 'priorizar' && (c.potencial || 0) > maxPot * 0.06) {
          const pulse = grp.append('circle').attr('r', 7).attr('fill', 'none')
            .attr('stroke', STATUS_COLORS.priorizar).attr('stroke-width', 1.5);
          pulse.append('animate').attr('attributeName', 'r').attr('values', '7;16').attr('dur', '1.8s').attr('repeatCount', 'indefinite');
          pulse.append('animate').attr('attributeName', 'stroke-opacity').attr('values', '0.8;0').attr('dur', '1.8s').attr('repeatCount', 'indefinite');
        }
        grp.append('circle').attr('r', 5.5)
          .attr('fill', STATUS_COLORS[c.status] || '#93939f')
          .attr('stroke', 'var(--map-pin-ring, #ffffff)').attr('stroke-width', 1.8);
        grp.append('title').text(`${c.nome} — ${c.statusLabel || c.status}\nPotencial da família: ${(c.potencial || 0) >= 60000 ? 'alto' : (c.potencial || 0) >= 15000 ? 'médio' : 'baixo'}\nLíderes: ${c.lideres ?? 0} · Cadastros: ${(c.cadastros ?? 0).toLocaleString('pt-BR')}`);
        if (c.label !== false) {
          grp.append('text').text(c.nome)
            .attr('x', c.labelDx ?? 9).attr('y', c.labelDy ?? 4)
            .attr('text-anchor', c.labelAnchor || 'start')
            .attr('font-size', 11).attr('font-weight', 500)
            .attr('fill', 'var(--map-label, #212121)')
            .attr('paint-order', 'stroke')
            .attr('stroke', 'var(--map-label-halo, #ffffff)')
            .attr('stroke-width', 3).attr('stroke-linejoin', 'round');
        }
      });
      this.innerHTML = '';
      this.appendChild(svg.node());
    }
  }
  if (!customElements.get('sp-map')) customElements.define('sp-map', SPMap);
})();
