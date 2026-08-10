import { describe, expect, it } from 'vitest';
import { escolherDestaque } from '../public/px-destaque.js';

const lider = (name, rate_7d, pct = 0) => ({ name, rate_7d, pct });

describe('escolherDestaque', () => {
  it('não elege ninguém quando a rede inteira está zerada', () => {
    // o bug original: sort() sobre uma lista de zeros devolvia o primeiro da
    // lista como "maior ritmo da rede" — empate em nada virava recomendação
    const rede = [lider('Eduardo Mazucato', 0), lider('Ana Ferreira', 0), lider('Marcos C.', 0)];
    expect(escolherDestaque(rede)).toBeNull();
  });

  it('não elege ninguém quando há empate no topo', () => {
    const rede = [lider('Ana', 4.2), lider('Bruno', 4.2), lider('Carla', 1)];
    expect(escolherDestaque(rede)).toBeNull();
  });

  it('não elege ninguém quando só existe um líder', () => {
    // sem segundo colocado não há escolha a recomendar: "o maior ritmo da rede"
    // é trivial e "apoie esse ramo" não distingue nada
    expect(escolherDestaque([lider('Ana', 9)])).toBeNull();
  });

  it('não elege ninguém com a base vazia ou inválida', () => {
    expect(escolherDestaque([])).toBeNull();
    expect(escolherDestaque(null)).toBeNull();
    expect(escolherDestaque(undefined)).toBeNull();
  });

  it('elege quando alguém se destaca de verdade', () => {
    const rede = [lider('Ana', 1.2), lider('Bruno', 6.5, 82), lider('Carla', 0)];
    expect(escolherDestaque(rede)?.name).toBe('Bruno');
  });

  it('ignora ritmo negativo, nulo ou não numérico', () => {
    const rede = [lider('Ana', null), lider('Bruno', 'abc'), lider('Carla', -3)];
    expect(escolherDestaque(rede)).toBeNull();

    const comUmValido = [lider('Ana', null), lider('Bruno', 2), lider('Carla', 'x')];
    expect(escolherDestaque(comUmValido)?.name).toBe('Bruno');
  });

  it('aceita ritmo vindo como string numérica (planilha)', () => {
    const rede = [lider('Ana', '5'), lider('Bruno', '1')];
    expect(escolherDestaque(rede)?.name).toBe('Ana');
  });

  it('não altera o array recebido', () => {
    const rede = [lider('Ana', 1), lider('Bruno', 9)];
    const copia = rede.slice();
    escolherDestaque(rede);
    expect(rede).toEqual(copia);
  });
});
