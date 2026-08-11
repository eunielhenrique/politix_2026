import { describe, expect, it } from 'vitest';

// réplica da lógica de raAgregado (mesma fórmula do protótipo) para travar o
// comportamento que importa: cobertura compara regiões de tamanhos diferentes
function agrega({ muni, lideresPorCidade, fam = {} }) {
  const porRa = {};
  Object.entries(muni).forEach(([ibge, m]) => {
    if (!m.ra) return;
    const a = porRa[m.ra] || (porRa[m.ra] = { municipios: 0, eleitorado: 0, votos: 0, lideres: 0, cidadesComLider: 0 });
    a.municipios++;
    a.eleitorado += m.eleitorado || 0;
    a.votos += (fam[ibge] && fam[ibge].votos) || 0;
    const nl = lideresPorCidade[m.nome] || 0;
    if (nl) { a.lideres += nl; a.cidadesComLider++; }
  });
  return Object.entries(porRa).map(([ra, a]) => ({
    ra, ...a,
    porMilhao: a.eleitorado ? a.lideres / (a.eleitorado / 1e6) : 0,
  }));
}

const cenario = {
  muni: {
    '1': { nome: 'Capital', ra: 'Metropolitana', eleitorado: 8_000_000 },
    '2': { nome: 'Guarulhos', ra: 'Metropolitana', eleitorado: 8_500_000 },
    '3': { nome: 'Rio Preto', ra: 'Rio Preto', eleitorado: 600_000 },
    '4': { nome: 'Catanduva', ra: 'Rio Preto', eleitorado: 600_000 },
  },
  lideresPorCidade: { Capital: 40, 'Rio Preto': 30, Catanduva: 22 },
  fam: { '1': { votos: 5000 }, '3': { votos: 900 } },
};

describe('agregado por RA', () => {
  it('soma líderes e eleitorado por região', () => {
    const r = agrega(cenario);
    const metro = r.find(x => x.ra === 'Metropolitana');
    expect(metro.lideres).toBe(40);
    expect(metro.eleitorado).toBe(16_500_000);
    expect(metro.municipios).toBe(2);
  });

  it('cobertura inverte a leitura: mais líderes não é mais coberto', () => {
    const r = agrega(cenario);
    const metro = r.find(x => x.ra === 'Metropolitana');
    const interior = r.find(x => x.ra === 'Rio Preto');
    // o interior tem mais líderes...
    expect(interior.lideres).toBeGreaterThan(metro.lideres);
    // ...e ainda assim a metropolitana é a descoberta por eleitor
    expect(interior.porMilhao).toBeGreaterThan(metro.porMilhao);
    expect(Math.round(metro.porMilhao)).toBe(2);      // 40 / 16,5 mi
    expect(Math.round(interior.porMilhao)).toBe(43);  // 52 / 1,2 mi
  });

  it('conta cidades com líder, não cidades da região', () => {
    const r = agrega(cenario);
    expect(r.find(x => x.ra === 'Metropolitana').cidadesComLider).toBe(1); // só a Capital
    expect(r.find(x => x.ra === 'Rio Preto').cidadesComLider).toBe(2);
  });

  it('soma votos da família por região, sem somar índices', () => {
    const r = agrega(cenario);
    expect(r.find(x => x.ra === 'Metropolitana').votos).toBe(5000);
    expect(r.find(x => x.ra === 'Rio Preto').votos).toBe(900);
  });

  it('região sem eleitorado não divide por zero', () => {
    const r = agrega({ muni: { '9': { nome: 'X', ra: 'Vazia', eleitorado: 0 } }, lideresPorCidade: { X: 3 } });
    expect(r[0].porMilhao).toBe(0);
  });
});
