
const express = require("express");
const mqtt = require("mqtt");

const app = express();
const PORT = 3000;
const TOPICO = "sensores/ambiente";

// Armazenamento temporário das leituras
const leituras = [];

app.use(express.json());
app.use(express.static("public"));

// Conexão com o servidor MQTT
const client = mqtt.connect("mqtt://localhost:1883");

client.on("connect", () => {
  console.log("Backend conectado ao MQTT!");
  client.subscribe(TOPICO, (erro) => {
    if (erro) {
      console.error("Erro ao assinar o tópico:", erro.message);
    } else {
      console.log(`Aguardando mensagens em: ${TOPICO}`);
    }
  });
});

// Receber e validar as mensagens do sensor
client.on("message", (topico, mensagem) => {
  try {
    const dado = JSON.parse(mensagem.toString());

    if (
      typeof dado.deviceId !== "string" ||
      typeof dado.temperature !== "number" ||
      typeof dado.humidity !== "number" ||
      typeof dado.timestamp !== "string"
    ) {
      console.log("Mensagem inválida: campos ausentes ou incorretos.");
      return;
    }

    const leitura = {
      deviceId: dado.deviceId,
      temperature: dado.temperature,
      humidity: dado.humidity,
      timestamp: dado.timestamp
    };

    leituras.push(leitura);

    // Limitar a memória a 100 leituras nesta primeira versão
    if (leituras.length > 100) {
      leituras.shift();
    }

    console.log("Leitura recebida:", leitura);
  } catch (erro) {
    console.error("Mensagem JSON inválida:", erro.message);
  }
});

// API para consultar as leituras
app.get("/api/leituras", (req, res) => {
  res.json(leituras);
});

// API para consultar a última leitura
app.get("/api/leituras/ultima", (req, res) => {
  if (leituras.length === 0) {
    return res.status(404).json({
      mensagem: "Nenhuma leitura recebida ainda."
    });
  }

  res.json(leituras[leituras.length - 1]);
});

app.listen(PORT, () => {
  console.log(`API disponível em http://localhost:${PORT}`);
});
