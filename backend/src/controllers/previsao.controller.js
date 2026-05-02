const { z } = require("zod");
const { gerarPrevisaoLeishmaniose } = require("../services/previsao.service");

const previsaoSchema = z.object({
  periodo: z
    .number()
    .int()
    .refine((valor) => [1, 6, 12, 60, 120].includes(valor), {
      message: "Período inválido. Use 1, 6, 12, 60 ou 120."
    })
});

async function gerarPrevisao(req, res) {
  const validacao = previsaoSchema.safeParse(req.body);

  if (!validacao.success) {
    return res.status(400).json({
      erro: "Dados inválidos",
      detalhes: validacao.error.flatten()
    });
  }

  try {
    const resultado = await gerarPrevisaoLeishmaniose(validacao.data);

    return res.json(resultado);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      erro: "Erro ao gerar previsão."
    });
  }
}

module.exports = {
  gerarPrevisao
};