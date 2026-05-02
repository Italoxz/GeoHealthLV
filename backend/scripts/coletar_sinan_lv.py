import json
from pathlib import Path

import pandas as pd
from pysus.ftp.databases.sinan import SINAN

MUNICIPIOS_ALVO = {
    "211130": {
        "codigoIbge": "2111300",
        "codigoDatasus": "211130",
        "nome": "São Luís",
        "latitude": -2.5307,
        "longitude": -44.3068,
    },
    "211120": {
        "codigoIbge": "2111201",
        "codigoDatasus": "211120",
        "nome": "São José de Ribamar",
        "latitude": -2.5619,
        "longitude": -44.0542,
    },
    "210750": {
        "codigoIbge": "2107506",
        "codigoDatasus": "210750",
        "nome": "Paço do Lumiar",
        "latitude": -2.5164,
        "longitude": -44.1019,
    },
    "210945": {
        "codigoIbge": "2109452",
        "codigoDatasus": "210945",
        "nome": "Raposa",
        "latitude": -2.4254,
        "longitude": -44.0973,
    },
}

ANOS = list(range(2007, 2025))

BASE_DIR = Path(__file__).resolve().parents[1]
CACHE_DIR = BASE_DIR / "src" / "cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

ARQUIVO_SAIDA = CACHE_DIR / "sinan-leishmaniose-real.json"


def normalizar_codigo_municipio(valor):
    if pd.isna(valor):
        return None

    texto = str(valor).strip().replace(".0", "")
    texto = "".join(caractere for caractere in texto if caractere.isdigit())

    if len(texto) >= 6:
        return texto[:6]

    return texto.zfill(6)


def descobrir_coluna_municipio(df):
    possiveis = [
        "ID_MN_RESI",
        "ID_MUNICIP",
        "MUN_RES",
        "MUNICIPIO",
        "MUN_NOT",
    ]

    for coluna in possiveis:
        if coluna in df.columns:
            return coluna

    raise Exception(f"Coluna de município não encontrada. Colunas: {list(df.columns)}")


def converter_para_dataframe(objeto):
    if hasattr(objeto, "to_dataframe"):
        return objeto.to_dataframe()

    try:
        lista = list(objeto)
    except TypeError:
        lista = []

    if lista:
        primeiro = lista[0]

        if hasattr(primeiro, "to_dataframe"):
            return primeiro.to_dataframe()

        if isinstance(primeiro, (str, Path)):
            return pd.read_parquet(primeiro)

    raise Exception(f"Não foi possível converter para DataFrame. Tipo recebido: {type(objeto)}")


def descobrir_arquivos_leishmaniose(sinan):
    candidatos = []

    for atributo in ["files", "file_list", "metadata"]:
        if hasattr(sinan, atributo):
            valor = getattr(sinan, atributo)

            if callable(valor):
                try:
                    valor = valor()
                except Exception:
                    continue

            try:
                candidatos.extend(list(valor))
            except Exception:
                pass

    arquivos = []

    for item in candidatos:
        texto = str(item).upper()

        if "LEIV" in texto:
            arquivos.append(item)

    unicos = []
    vistos = set()

    for arquivo in arquivos:
        chave = str(arquivo)

        if chave not in vistos:
            vistos.add(chave)
            unicos.append(arquivo)

    return unicos


def filtrar_arquivos_por_ano(arquivos):
    filtrados = []

    for arquivo in arquivos:
        texto = str(arquivo).upper()

        for ano in ANOS:
            sufixo = str(ano)[-2:]

            if f"LEIVBR{sufixo}" in texto or str(ano) in texto:
                filtrados.append((ano, arquivo))
                break

    return filtrados


def main():
    sinan = SINAN().load()

    resultado = {}

    for codigo_datasus, info in MUNICIPIOS_ALVO.items():
        resultado[codigo_datasus] = {
            "codigoIbge": info["codigoIbge"],
            "codigoDatasus": info["codigoDatasus"],
            "nome": info["nome"],
            "uf": "MA",
            "latitude": info["latitude"],
            "longitude": info["longitude"],
            "doenca": "Leishmaniose Visceral",
            "fonte": "SINAN/DATASUS microdados",
            "dadosReaisIntegrados": True,
            "historico": {str(ano): 0 for ano in ANOS},
        }

    arquivos = descobrir_arquivos_leishmaniose(sinan)
    arquivos_por_ano = filtrar_arquivos_por_ano(arquivos)

    print(f"Arquivos de Leishmaniose encontrados: {len(arquivos)}")
    print(f"Arquivos filtrados por ano: {len(arquivos_por_ano)}")

    anos_processados = []

    for ano, arquivo in arquivos_por_ano:
        print(f"Processando Leishmaniose Visceral - {ano}: {arquivo}")

        try:
            baixados = sinan.download([arquivo])
            df = converter_para_dataframe(baixados)

            coluna_municipio = descobrir_coluna_municipio(df)
            df[coluna_municipio] = df[coluna_municipio].apply(normalizar_codigo_municipio)

            df_filtrado = df[df[coluna_municipio].isin(MUNICIPIOS_ALVO.keys())]
            contagem = df_filtrado[coluna_municipio].value_counts()

            print(f"Contagem encontrada em {ano}:")
            print(contagem.to_dict())

            for codigo_datasus in MUNICIPIOS_ALVO.keys():
                resultado[codigo_datasus]["historico"][str(ano)] = int(
                    contagem.get(codigo_datasus, 0)
                )

            anos_processados.append(ano)

        except Exception as erro:
            print(f"Erro no ano {ano}: {erro}")

    saida = {
        "fonte": "SINAN/DATASUS microdados",
        "doenca": "Leishmaniose Visceral",
        "regiao": "Ilha de São Luís - MA",
        "anosSolicitados": ANOS,
        "anosProcessados": sorted(list(set(anos_processados))),
        "dadosReaisIntegrados": len(anos_processados) > 0,
        "dados": list(resultado.values()),
    }

    with open(ARQUIVO_SAIDA, "w", encoding="utf-8") as arquivo:
        json.dump(saida, arquivo, ensure_ascii=False, indent=2)

    print(f"Arquivo gerado: {ARQUIVO_SAIDA}")


if __name__ == "__main__":
    main()
