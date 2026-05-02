const express = require("express");
const { listarDadosLeishmaniose } = require("../controllers/sinan.controller");

const router = express.Router();

router.get("/leishmaniose", listarDadosLeishmaniose);

module.exports = router;