const express = require("express");
const { verificarStatus } = require("../controllers/health.controller");

const router = express.Router();

router.get("/", verificarStatus);

module.exports = router;