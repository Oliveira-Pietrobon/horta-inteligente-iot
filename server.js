
const express = require("express");
const mqtt = require("mqtt");
const { Pool } = require("pg");

const app = express();
const PORT = 3000;
const TOPICO = "sensores/ambiente";

const pool = new Pool({
  host: "localhost",
  port: 5434,
  database: "plataforma_iot",
  user: "iot_user",
  password: "iot_dev_2026"
});

app.use(express.json());
app.use(express.static("public"));

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

client.on("error", (erro) => {
  console.error("Erro no MQTT:", erro.message);
});

client.on("message", async (topico, mensagem) => {
  try {
    const dado = JSON.parse(mensagem.toString());

    if (
      typeof dado.deviceId !== "string" ||
      typeof dado.temperature !== "number" ||
      typeof dado.humidity !== "number" ||
      typeof dado.timestamp !== "string" ||
      Number.isNaN(Date.parse(dado.timestamp))
    ) {
      console.log("Mensagem inválida: confira os campos e o timestamp.");
      return;
    }

    const resultado = await pool.query(
      `INSERT INTO leituras
       (device_id, temperature, humidity, measured_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        dado.deviceId,
        dado.temperature,
        dado.humidity,
        dado.timestamp
      ]
    );

    console.log("Leitura salva no PostgreSQL:", resultado.rows[0]);
  } catch (erro) {
    console.error("Erro ao processar ou salvar leitura:", erro.message);
  }
});

app.get("/api/leituras", async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT id,
              device_id AS "deviceId",
              temperature,
              humidity,
              measured_at AS timestamp,
              received_at AS "receivedAt"
       FROM leituras
       ORDER BY measured_at DESC
       LIMIT 100`
    );

    res.json(resultado.rows.reverse());
  } catch (erro) {
    console.error("Erro ao consultar leituras:", erro.message);
    res.status(500).json({ mensagem: "Erro ao consultar leituras." });
  }
});

app.get("/api/leituras/ultima", async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT id,
              device_id AS "deviceId",
              temperature,
              humidity,
              measured_at AS timestamp,
              received_at AS "receivedAt"
       FROM leituras
       ORDER BY measured_at DESC
       LIMIT 1`
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({
        mensagem: "Nenhuma leitura recebida ainda."
      });
    }

    res.json(resultado.rows[0]);
  } catch (erro) {
    console.error("Erro ao consultar última leitura:", erro.message);
    res.status(500).json({ mensagem: "Erro ao consultar última leitura." });
  }
});

app.listen(PORT, () => {
  console.log(`API disponível em http://localhost:${PORT}`);
});
