const API_URL = "https://geohealthlv.onrender.com";

const map = L.map("map").setView([-2.52, -44.18], 11);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "Dados do mapa: OpenStreetMap"
}).addTo(map);

const periodoSelect = document.getElementById("periodo");
const btnPrevisao = document.getElementById("btnPrevisao");

const mediaRiscoEl = document.getElementById("mediaRisco");
const municipioMaiorRiscoEl = document.getElementById("municipioMaiorRisco");
const dadosReaisEl = document.getElementById("dadosReais");
const resumoEl = document.getElementById("resumo");
const fonteDadosEl = document.getElementById("fonteDados");
const apiStatusEl = document.getElementById("apiStatus");

const tabelaMunicipiosEl = document.getElementById("tabelaMunicipios");
const historicoHeadEl = document.getElementById("historicoHead");
const historicoBodyEl = document.getElementById("historicoBody");

let camadasMapa = [];

function obterCorPorNivel(nivel) {
  const cores = {
    baixo: "#22c55e",
    medio: "#eab308",
    alto: "#f97316",
    critico: "#ef4444",
    indefinido: "#64748b"
  };

  return cores[nivel] || "#64748b";
}

function limparMapa() {
  camadasMapa.forEach((camada) => {
    map.removeLayer(camada);
  });

  camadasMapa = [];
}

async function verificarAPI() {
  try {
    const resposta = await fetch(`${API_URL}/api/health`);
    const dados = await resposta.json();

    if (dados.status === "online") {
      apiStatusEl.textContent = "API: online";
      apiStatusEl.classList.add("online");
      apiStatusEl.classList.remove("offline");
    }
  } catch (error) {
    apiStatusEl.textContent = "API: offline";
    apiStatusEl.classList.add("offline");
    apiStatusEl.classList.remove("online");
  }
}

async function gerarPrevisao() {
  const periodo = Number(periodoSelect.value);

  btnPrevisao.disabled = true;
  btnPrevisao.textContent = "Gerando previsão...";

  try {
    const resposta = await fetch(`${API_URL}/api/previsao`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ periodo })
    });

    const resultado = await resposta.json();

    if (!resposta.ok) {
      throw new Error(resultado.erro || "Erro ao gerar previsão.");
    }

    renderizarResultado(resultado);
    renderizarMapa(resultado.dados);
    renderizarTabelaMunicipios(resultado.dados);
    renderizarTabelaHistorica(resultado.dados);
  } catch (error) {
    console.error(error);
    resumoEl.textContent = `Erro: ${error.message}. Verifique se o backend está rodando em http://localhost:3000.`;
  } finally {
    btnPrevisao.disabled = false;
    btnPrevisao.textContent = "Gerar previsão";
  }
}

function renderizarResultado(resultado) {
  mediaRiscoEl.textContent = `${resultado.mediaRisco ?? 0}%`;
  municipioMaiorRiscoEl.textContent = resultado.municipioMaiorRisco || "--";
  dadosReaisEl.textContent = resultado.dadosReaisIntegrados ? "Sim" : "Não";

  fonteDadosEl.textContent = `${resultado.fonteDados || "SINAN/DATASUS"} — ${resultado.base || "microdados públicos"}`;

  resumoEl.textContent = `A previsão para ${resultado.doenca}, na região da ${resultado.regiao}, considera o período de ${resultado.textoPeriodo}. O município com maior risco estimado é ${resultado.municipioMaiorRisco || "não identificado"}.`;
}

function renderizarMapa(dados) {
  limparMapa();

  const bounds = [];

  dados.forEach((municipio) => {
    const cor = obterCorPorNivel(municipio.nivel);
    const risco = municipio.risco || 0;
    const raio = Math.max(risco * 130, 1800);

    const circulo = L.circle([municipio.latitude, municipio.longitude], {
      color: cor,
      fillColor: cor,
      fillOpacity: 0.55,
      radius: raio,
      weight: 2
    }).addTo(map);

    circulo.bindPopup(`
      <div>Total histórico: ${municipio.totalHistorico ?? 0}</div>
        <div>Novos casos estimados: ${municipio.casosEstimados ?? 0}</div>
        <div>Crescimento: ${municipio.crescimentoPercentual ?? 0}%</div>
        <div class="popup-risk">Risco previsto: ${municipio.risco ?? 0}%</div>
        <div>Tendência: ${municipio.tendencia}</div>
    `);

    camadasMapa.push(circulo);
    bounds.push([municipio.latitude, municipio.longitude]);
  });

  if (bounds.length > 0) {
    map.fitBounds(bounds, {
      padding: [40, 40]
    });
  }
}

function renderizarTabelaMunicipios(dados) {
  tabelaMunicipiosEl.innerHTML = "";

  dados.forEach((municipio) => {
    const linha = document.createElement("tr");

    linha.innerHTML = `
  <td>${municipio.municipio}</td>
  <td>${municipio.ultimoAno || "--"}</td>
  <td>${municipio.casosUltimoAno ?? 0}</td>
  <td>${municipio.totalHistorico ?? 0}</td>
  <td><strong>${municipio.casosEstimados ?? 0}</strong></td>
  <td>${municipio.crescimentoPercentual ?? 0}%</td>
  <td>${municipio.risco ?? 0}%</td>
  <td><span class="badge ${municipio.nivel || "indefinido"}">${municipio.nivel || "indefinido"}</span></td>
  <td>${municipio.tendencia}</td>
`;

    tabelaMunicipiosEl.appendChild(linha);
  });
}

function renderizarTabelaHistorica(dados) {
  const anos = new Set();

  dados.forEach((municipio) => {
    Object.keys(municipio.historico || {}).forEach((ano) => {
      anos.add(Number(ano));
    });
  });

  const anosOrdenados = Array.from(anos)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  historicoHeadEl.innerHTML = `
    <tr>
      <th>Município</th>
      ${anosOrdenados.map((ano) => `<th>${ano}</th>`).join("")}
    </tr>
  `;

  historicoBodyEl.innerHTML = "";

  dados.forEach((municipio) => {
    const linha = document.createElement("tr");

    linha.innerHTML = `
      <td>${municipio.municipio}</td>
      ${anosOrdenados.map((ano) => `<td>${municipio.historico?.[ano] ?? municipio.historico?.[String(ano)] ?? 0}</td>`).join("")}
    `;

    historicoBodyEl.appendChild(linha);
  });
}

btnPrevisao.addEventListener("click", gerarPrevisao);

verificarAPI();
gerarPrevisao();