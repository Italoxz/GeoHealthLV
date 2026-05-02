const fs = require("fs");
const path = require("path");
const municipios = require("../data/municipios");

const ARQUIVO_CACHE_REAL = path.join(
  __dirname,
  "..",
  "cache",
  "sinan-leishmaniose-real.json"
);

function montarFallback() {
  const dados = municipios.map((municipio) => ({
    ...municipio,
    doenca: "Leishmaniose Visceral",
    fonte: "SINAN/DATASUS",
    dadosReaisIntegrados: false,
    historico: {}
  }));

  return {
    fonte: "SINAN/DATASUS",
    doenca: "Leishmaniose Visceral",
    regiao: "Ilha de São Luís - MA",
    caminhoProcurado: ARQUIVO_CACHE_REAL,
    dadosReaisIntegrados: false,
    observacao:
      "Arquivo real ainda não foi encontrado pelo backend. Confirme se existe em src/cache/sinan-leishmaniose-real.json",
    dados
  };
}

async function buscarSerieHistoricaLeishmaniose() {
  console.log("Procurando arquivo real em:", ARQUIVO_CACHE_REAL);

  if (!fs.existsSync(ARQUIVO_CACHE_REAL)) {
    console.log("Arquivo real NÃO encontrado.");
    return montarFallback();
  }

  console.log("Arquivo real encontrado.");

  const conteudo = fs.readFileSync(ARQUIVO_CACHE_REAL, "utf-8");
  const json = JSON.parse(conteudo);

  return {
    fonte: json.fonte || "SINAN/DATASUS microdados",
    doenca: json.doenca || "Leishmaniose Visceral",
    regiao: json.regiao || "Ilha de São Luís - MA",
    anosSolicitados: json.anosSolicitados || [],
    anosProcessados: json.anosProcessados || [],
    dadosReaisIntegrados: Boolean(json.dadosReaisIntegrados),
    dados: json.dados || []
  };
}

module.exports = {
  buscarSerieHistoricaLeishmaniose
};