const { buscarSerieHistoricaLeishmaniose } = require("../services/sinan.service");

async function listarDadosLeishmaniose(req, res) {
  try {
    const resultado = await buscarSerieHistoricaLeishmaniose();

    return res.json(resultado);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Erro ao buscar dados do SINAN/DATASUS."
    });
  }
}

module.exports = {
  listarDadosLeishmaniose
};