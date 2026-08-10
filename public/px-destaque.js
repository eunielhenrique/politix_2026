/**
 * Politix — escolha do "Destaque da rede" (lógica pura, testada)
 *
 * O banner tem selo de troféu e botão "Ver o ramo": tem peso de recomendação.
 * Antes ele era um sort()[0] cru, então uma lista inteira de zeros elegia um
 * "vencedor" — empate em nada virava destaque, e alguém podia alocar esforço
 * em cima de ruído.
 *
 * Regras para o destaque existir:
 *   1. a base não pode estar vazia;
 *   2. o primeiro colocado precisa ter ritmo > 0 (ninguém se destaca parado);
 *   3. precisa haver um segundo colocado e o primeiro tem que ser
 *      estritamente maior que ele (empate no topo não elege ninguém).
 *
 * A regra 3 também cobre o caso de um único líder: sem alguém para comparar,
 * "o maior ritmo da rede" é trivial e "apoie esse ramo" não significa nada —
 * não há escolha a recomendar.
 *
 * Sem destaque, o bloco não renderiza (não existe estado "meio destaque").
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PXDestaque = api;
})(typeof self !== 'undefined' ? self : this, function () {
  function ritmoDe(l) {
    var n = Number(l && l.rate_7d);
    return isFinite(n) && n > 0 ? n : 0;
  }

  /**
   * @param {Array<{name?:string, rate_7d?:number|string, pct?:number}>} lideres
   * @returns {object|null} o líder destacado, ou null quando não há destaque legítimo
   */
  function escolherDestaque(lideres) {
    if (!Array.isArray(lideres) || lideres.length < 2) return null;

    var ordenados = lideres.slice().sort(function (a, b) { return ritmoDe(b) - ritmoDe(a); });
    var primeiro = ordenados[0];
    var segundo = ordenados[1];

    if (ritmoDe(primeiro) <= 0) return null;                    // rede parada
    if (ritmoDe(primeiro) <= ritmoDe(segundo)) return null;     // empate no topo

    return primeiro;
  }

  return { escolherDestaque: escolherDestaque, ritmoDe: ritmoDe };
});
