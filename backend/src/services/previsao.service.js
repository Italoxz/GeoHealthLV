const { buscarSerieHistoricaLeishmaniose } = require("./sinan.service");

function obterTextoPeriodo(periodo) {
  const periodos = {
    1: "1 mês",
    6: "6 meses",
    12: "1 ano",
    60: "5 anos",
    120: "10 anos"
  };

  return periodos[periodo] || `${periodo} meses`;
}

function classificarNivel(risco) {
  if (risco < 30) return "baixo";
  if (risco < 60) return "medio";
  if (risco < 85) return "alto";
  return "critico";
}

function calcularMedia(valores) {
  if (!valores.length) return 0;

  const soma = valores.reduce((total, valor) => total + valor, 0);
  return soma / valores.length;
}

function analisarHistorico(historico) {
  const anos = Object.keys(historico || {})
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  if (anos.length === 0) {
    return {
      anos: [],
      totalHistorico: 0,
      ultimoAno: null,
      casosUltimoAno: 0,
      mediaAntiga: 0,
      mediaRecente: 0,
      crescimentoPercentual: 0,
      tendenciaBase: "sem dados"
    };
  }

  const valores = anos.map((ano) => Number(historico[ano] || historico[String(ano)] || 0));
  const totalHistorico = valores.reduce((total, valor) => total + valor, 0);

  const metade = Math.ceil(anos.length / 2);
  const anosAntigos = anos.slice(0, metade);
  const anosRecentes = anos.slice(-metade);

  const mediaAntiga = calcularMedia(
    anosAntigos.map((ano) => Number(historico[ano] || historico[String(ano)] || 0))
  );

  const mediaRecente = calcularMedia(
    anosRecentes.map((ano) => Number(historico[ano] || historico[String(ano)] || 0))
  );

  let crescimentoPercentual = 0;

  if (mediaAntiga > 0) {
    crescimentoPercentual = ((mediaRecente - mediaAntiga) / mediaAntiga) * 100;
  } else if (mediaRecente > 0) {
    crescimentoPercentual = 100;
  }

  let tendenciaBase = "estável";

  if (crescimentoPercentual > 15) {
    tendenciaBase = "aumento";
  }

  if (crescimentoPercentual < -15) {
    tendenciaBase = "diminuição";
  }

  const ultimoAno = anos[anos.length - 1];

  return {
    anos,
    totalHistorico,
    ultimoAno,
    casosUltimoAno: Number(historico[ultimoAno] || historico[String(ultimoAno)] || 0),
    mediaAntiga: Number(mediaAntiga.toFixed(2)),
    mediaRecente: Number(mediaRecente.toFixed(2)),
    crescimentoPercentual: Number(crescimentoPercentual.toFixed(2)),
    tendenciaBase
  };
}

function calcularRisco(analise, periodo) {
  if (!analise.anos.length) {
    return 0;
  }

  const fatorTempo = periodo / 12;

  const pesoCasosRecentes = analise.mediaRecente * 6;
  const pesoCrescimento = Math.max(analise.crescimentoPercentual, 0) * 0.5;
  const pesoUltimoAno = analise.casosUltimoAno * 4;
  const pesoTempo = fatorTempo * 6;

  const risco = pesoCasosRecentes + pesoCrescimento + pesoUltimoAno + pesoTempo;

  return Math.round(Math.min(risco, 100));
}

function calcularTendenciaFinal(analise, risco, periodo) {
  if (!analise.anos.length) {
    return "sem dados";
  }

  if (periodo >= 60 && risco >= 45) {
    return "aumento";
  }

  if (risco >= 60) {
    return "aumento";
  }

  if (analise.tendenciaBase === "diminuição" && risco < 50) {
    return "diminuição";
  }

  return analise.tendenciaBase;
}

function calcularVariacaoProjetada(analise, risco, tendencia, periodo) {
  if (!analise.anos.length) {
    return 0;
  }

  const fatorTempo = periodo / 12;

  if (tendencia === "aumento") {
    return Math.round(Math.max(5, analise.crescimentoPercentual * 0.5 + fatorTempo * 8));
  }

  if (tendencia === "diminuição") {
    return Math.round(Math.min(-5, analise.crescimentoPercentual * 0.5 - fatorTempo * 2));
  }

  return Math.round(analise.crescimentoPercentual * 0.2);
}

function calcularCasosEstimados(analise, periodo, tendencia) {
  if (!analise.anos.length) {
    return 0;
  }

  const anosEquivalentes = periodo / 12;

  let fatorTendencia = 1;

  if (tendencia === "aumento") {
    fatorTendencia = 1.25;
  }

  if (tendencia === "diminuição") {
    fatorTendencia = 0.75;
  }

  if (tendencia === "estável") {
    fatorTendencia = 1;
  }

  const estimativa = analise.mediaRecente * anosEquivalentes * fatorTendencia;

  return Math.max(0, Math.round(estimativa));
}

function gerarExplicacao(municipio, analise, tendencia, periodo, casosEstimados) {
  const textoPeriodo = obterTextoPeriodo(periodo);

  if (!analise.anos.length) {
    return `Não há série histórica integrada para ${municipio.nome}. A previsão depende da coleta automática dos dados públicos do SINAN/DATASUS.`;
  }

  return `Para ${municipio.nome}, a série histórica de ${analise.anos[0]} a ${
    analise.anos[analise.anos.length - 1]
  } indica tendência base de ${analise.tendenciaBase}. Para ${textoPeriodo}, o modelo estima ${casosEstimados} novos casos e projeta tendência de ${tendencia}.`;
}

async function gerarPrevisaoLeishmaniose({ periodo }) {
  const serie = await buscarSerieHistoricaLeishmaniose();

  const dados = serie.dados.map((municipio) => {
    const analise = analisarHistorico(municipio.historico);
    const risco = calcularRisco(analise, periodo);
    const tendencia = calcularTendenciaFinal(analise, risco, periodo);
    const variacaoPercentual = calcularVariacaoProjetada(
      analise,
      risco,
      tendencia,
      periodo
    );
    const casosEstimados = calcularCasosEstimados(analise, periodo, tendencia);

    return {
      municipio: municipio.nome,
      uf: municipio.uf,
      codigoIbge: municipio.codigoIbge,
      codigoDatasus: municipio.codigoDatasus,
      latitude: municipio.latitude,
      longitude: municipio.longitude,
      historico: municipio.historico,
      anosDisponiveis: analise.anos,
      totalHistorico: analise.totalHistorico,
      ultimoAno: analise.ultimoAno,
      casosUltimoAno: analise.casosUltimoAno,
      mediaAntiga: analise.mediaAntiga,
      mediaRecente: analise.mediaRecente,
      crescimentoPercentual: analise.crescimentoPercentual,
      risco,
      nivel: classificarNivel(risco),
      tendencia,
      variacaoPercentual,
      casosEstimados,
      explicacao: gerarExplicacao(
        municipio,
        analise,
        tendencia,
        periodo,
        casosEstimados
      )
    };
  });

  const dadosComHistorico = dados.filter((item) => item.anosDisponiveis.length);

  const mediaRisco = dados.length
    ? Math.round(dados.reduce((soma, item) => soma + item.risco, 0) / dados.length)
    : 0;

  const maiorRisco = dados.reduce((maior, atual) => {
    return atual.risco > maior.risco ? atual : maior;
  }, dados[0]);

  return {
    projeto: "GeoHealthLV",
    doenca: "Leishmaniose Visceral",
    regiao: "Ilha de São Luís - MA",
    periodo,
    textoPeriodo: obterTextoPeriodo(periodo),
    fonteDados: serie.fonte,
    base: serie.base || "SINAN/DATASUS microdados",
    dadosReaisIntegrados: serie.dadosReaisIntegrados,
    municipiosComHistorico: dadosComHistorico.length,
    mediaRisco,
    municipioMaiorRisco: maiorRisco ? maiorRisco.municipio : null,
    aviso:
      "Modelo estatístico simplificado para fins acadêmicos. Não substitui análise epidemiológica oficial.",
    dados
  };
}

module.exports = {
  gerarPrevisaoLeishmaniose
};