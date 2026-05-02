function verificarStatus(req, res) {
  return res.json({
    status: "online",
    projeto: "GeoHealthLV",
    backend: "Node.js + Express",
    fonteDados: "DATASUS/TABNET/SINAN",
    doenca: "Leishmaniose Visceral",
    regiao: "Ilha de São Luís - MA"
  });
}

module.exports = {
  verificarStatus
};