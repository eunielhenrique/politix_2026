# Dados de referência

## `tse_municipios_sp.json`
De-para IBGE → código TSE dos 645 municípios de SP.
Fonte: `https://resultados.tse.jus.br/oficial/ele2024/619/config/mun-e000619-cm.json`
(campo `cdi` = IBGE, `cd` = TSE).

## Votação de 2024 (`municipio_candidato`)
Carregada do portal de dados abertos do TSE — pacote `resultados-2024`,
recurso "Votação nominal por município e zona":

    https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_2024.zip

O zip traz um CSV por UF (`..._2024_SP.csv`, latin1, `;`). O arquivo é por
município **e zona eleitoral**, então a carga agrega por (município, cargo,
número do candidato) somando `QT_VOTOS_NOMINAIS`.

Regras usadas:
- votos = soma do **1º turno** (a votação de referência do candidato);
- situação = a do **último turno** em que o candidato aparece, para que quem
  venceu no 2º turno fique como ELEITO;
- `eleito` = situação começa com "ELEITO" (inclui ELEITO POR QP / POR MÉDIA);
- município casado por `CD_MUNICIPIO` (TSE) → IBGE pelo de-para acima.

Resultado: 2.040 prefeitos e 71.547 vereadores nos 645 municípios.
Em 7 municípios pequenos o TSE não registra prefeito eleito (eleição anulada /
pleito suplementar) — é o dado oficial, não falha de carga.

Para recarregar, refazer a agregação e inserir em `municipio_candidato`
(chave única: ibge + ano + cargo + nome_urna + numero).
