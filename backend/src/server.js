const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
require("dotenv").config();

const healthRoutes = require("./routes/health.routes");
const sinanRoutes = require("./routes/sinan.routes");
const previsaoRoutes = require("./routes/previsao.routes");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(helmet());

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
  })
);

app.use(express.json({ limit: "20kb" }));
app.use(morgan("dev"));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    erro: "Muitas requisições. Tente novamente mais tarde."
  }
});

app.use(limiter);

app.use("/api/health", healthRoutes);
app.use("/api/sinan", sinanRoutes);
app.use("/api/previsao", previsaoRoutes);

app.get("/", (req, res) => {
  res.json({
    projeto: "GeoHealthLV",
    status: "online",
    descricao: "API de previsão de Leishmaniose Visceral na Ilha de São Luís",
    fontePlanejada: "DATASUS/TABNET/SINAN"
  });
});

app.use((req, res) => {
  res.status(404).json({
    erro: "Rota não encontrada"
  });
});

app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    erro: "Erro interno no servidor"
  });
});

app.listen(PORT, () => {
  console.log(`GeoHealthLV API rodando em http://localhost:${PORT}`);
});