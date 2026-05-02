const express = require("express");
const { gerarPrevisao } = require("../controllers/previsao.controller");

const router = express.Router();

router.post("/", gerarPrevisao);

module.exports = router;