
const mqtt = require("mqtt");

// Conectar ao servidor MQTT local
const client = mqtt.connect("mqtt://localhost:1883");

client.on("connect", () => {
  console.log("Sensor conectado ao servidor MQTT!");

  // Enviar uma leitura a cada 5 segundos
  setInterval(() => {
    const leitura = {
      deviceId: "sensor-001",
      temperature: Number((20 + Math.random() * 10).toFixed(1)),
      humidity: Math.floor(40 + Math.random() * 31),
      timestamp: new Date().toISOString()
    };

    client.publish("sensores/ambiente", JSON.stringify(leitura));

    console.log("Leitura enviada:", leitura);
  }, 5000);
});

client.on("error", (erro) => {
  console.error("Erro na conexão MQTT:", erro.message);
});
