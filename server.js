
require("dotenv").config();

const path = require("path");
const express = require("express");
const mqtt = require("mqtt");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const TOPICO = "sensores/ambiente";

// ========================================
// 1. VALIDAR CONFIGURAÇÕES
// ========================================

const variaveisObrigatorias = [
  "SESSION_SECRET",
  "POSTGRES_DB",
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_CALLBACK_URL"
];

for (const nome of variaveisObrigatorias) {
  if (!process.env[nome]) {
    throw new Error(
      `A variável ${nome} não foi configurada no arquivo .env`
    );
  }
}

// ========================================
// 2. CONEXÃO COM POSTGRESQL
// ========================================

const pool = new Pool({
  host: process.env.POSTGRES_HOST || "localhost",
  port: Number(process.env.POSTGRES_PORT) || 5434,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD
});

pool.on("error", (erro) => {
  console.error("Erro inesperado no PostgreSQL:", erro.message);
});

// ========================================
// 3. MIDDLEWARES
// ========================================

app.use(express.json());

app.use(
  session({
    name: "iot.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

app.use(passport.initialize());

// ========================================
// 4. MIDDLEWARE DE AUTENTICAÇÃO
// ========================================

function exigirLogin(req, res, next) {
  if (!req.session || !req.session.usuario) {
    return res.status(401).json({
      mensagem: "Você precisa fazer login para acessar este recurso."
    });
  }

  return next();
}

// ========================================
// 5. CRIAR SESSÃO DO USUÁRIO
// ========================================

function iniciarSessao(req, res, usuario, depois) {
  req.session.regenerate((erro) => {
    if (erro) {
      console.error("Erro ao criar sessão:", erro.message);

      return res.status(500).send(
        "Não foi possível iniciar a sessão."
      );
    }

    req.session.usuario = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email
    };

    req.session.save((erroAoSalvar) => {
      if (erroAoSalvar) {
        console.error(
          "Erro ao salvar sessão:",
          erroAoSalvar.message
        );

        return res.status(500).send(
          "Não foi possível salvar a sessão."
        );
      }

      return depois();
    });
  });
}

// ========================================
// 6. CONFIGURAR LOGIN COM GOOGLE
// ========================================

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL
    },

    async (accessToken, refreshToken, profile, done) => {
      try {
        const emailGoogle = profile.emails?.[0]?.value
          ?.trim()
          .toLowerCase();

        const emailVerificado =
          profile._json?.email_verified === true;

        if (!emailGoogle || !emailVerificado) {
          return done(null, false, {
            message: "Não foi possível confirmar o e-mail Google."
          });
        }

        const googleId = profile.id;

        const nome = (
          profile.displayName || "Usuário Google"
        )
          .trim()
          .slice(0, 100);

        // Verifica se o Google já está vinculado a uma conta.
        let resultado = await pool.query(
          `SELECT id, nome, email
           FROM usuarios
           WHERE google_id = $1`,
          [googleId]
        );

        if (resultado.rows.length > 0) {
          return done(null, resultado.rows[0]);
        }

        // Procura uma conta com o mesmo e-mail verificado.
        resultado = await pool.query(
          `SELECT id, nome, email, google_id
           FROM usuarios
           WHERE email = $1`,
          [emailGoogle]
        );

        if (resultado.rows.length > 0) {
          const existente = resultado.rows[0];

          if (
            existente.google_id &&
            existente.google_id !== googleId
          ) {
            return done(null, false, {
              message: "Esta conta está vinculada a outro Google."
            });
          }

          const atualizado = await pool.query(
            `UPDATE usuarios
             SET google_id = $1
             WHERE id = $2
             RETURNING id, nome, email`,
            [googleId, existente.id]
          );

          return done(null, atualizado.rows[0]);
        }

        // Cria uma conta para um usuário novo do Google.
        resultado = await pool.query(
          `INSERT INTO usuarios
             (nome, email, google_id, senha_hash)
           VALUES ($1, $2, $3, NULL)
           RETURNING id, nome, email`,
          [nome, emailGoogle, googleId]
        );

        return done(null, resultado.rows[0]);
      } catch (erro) {
        return done(erro);
      }
    }
  )
);

// ========================================
// 7. CADASTRO COM E-MAIL E SENHA
// ========================================

app.post("/api/auth/cadastro", async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    if (
      typeof nome !== "string" ||
      typeof email !== "string" ||
      typeof senha !== "string"
    ) {
      return res.status(400).json({
        mensagem: "Informe nome, e-mail e senha."
      });
    }

    const nomeLimpo = nome.trim();
    const emailLimpo = email.trim().toLowerCase();

    if (!nomeLimpo || nomeLimpo.length > 100) {
      return res.status(400).json({
        mensagem: "O nome deve ter entre 1 e 100 caracteres."
      });
    }

    if (
      emailLimpo.length > 255 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)
    ) {
      return res.status(400).json({
        mensagem: "Informe um e-mail válido."
      });
    }

    if (senha.length < 8 || senha.length > 72) {
      return res.status(400).json({
        mensagem: "A senha deve ter entre 8 e 72 caracteres."
      });
    }

    const senhaHash = await bcrypt.hash(senha, 12);

    const resultado = await pool.query(
      `INSERT INTO usuarios (nome, email, senha_hash)
       VALUES ($1, $2, $3)
       RETURNING id, nome, email, criado_em`,
      [nomeLimpo, emailLimpo, senhaHash]
    );

    return res.status(201).json({
      mensagem: "Cadastro realizado com sucesso.",
      usuario: resultado.rows[0]
    });
  } catch (erro) {
    if (erro.code === "23505") {
      return res.status(409).json({
        mensagem: "Este e-mail já está cadastrado."
      });
    }

    console.error("Erro no cadastro:", erro.message);

    return res.status(500).json({
      mensagem: "Não foi possível realizar o cadastro."
    });
  }
});

// ========================================
// 8. LOGIN COM E-MAIL E SENHA
// ========================================

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (
      typeof email !== "string" ||
      typeof senha !== "string" ||
      !email.trim() ||
      !senha
    ) {
      return res.status(400).json({
        mensagem: "Informe e-mail e senha."
      });
    }

    const resultado = await pool.query(
      `SELECT id, nome, email, senha_hash
       FROM usuarios
       WHERE email = $1`,
      [email.trim().toLowerCase()]
    );

    if (resultado.rows.length === 0) {
      return res.status(401).json({
        mensagem: "E-mail ou senha incorretos."
      });
    }

    const usuario = resultado.rows[0];

    if (!usuario.senha_hash) {
      return res.status(401).json({
        mensagem: "Entre com o Google para acessar esta conta."
      });
    }

    const senhaCorreta = await bcrypt.compare(
      senha,
      usuario.senha_hash
    );

    if (!senhaCorreta) {
      return res.status(401).json({
        mensagem: "E-mail ou senha incorretos."
      });
    }

    return iniciarSessao(req, res, usuario, () => {
      return res.json({
        mensagem: "Login realizado com sucesso.",
        usuario: req.session.usuario
      });
    });
  } catch (erro) {
    console.error("Erro no login:", erro.message);

    return res.status(500).json({
      mensagem: "Não foi possível realizar o login."
    });
  }
});

// ========================================
// 9. INICIAR AUTENTICAÇÃO GOOGLE
// ========================================

app.get(
  "/api/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
    prompt: "select_account"
  })
);

// ========================================
// 10. RETORNO DO GOOGLE
// ========================================

app.get(
  "/api/auth/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: "/login.html?erro=google"
  }),

  (req, res) => {
    return iniciarSessao(req, res, req.user, () => {
      return res.redirect("/index.html");
    });
  }
);

// ========================================
// 11. VERIFICAR USUÁRIO CONECTADO
// ========================================

app.get("/api/auth/me", (req, res) => {
  if (!req.session?.usuario) {
    return res.status(401).json({
      mensagem: "Nenhum usuário conectado."
    });
  }

  return res.json({
    usuario: req.session.usuario
  });
});

// ========================================
// 12. LOGOUT
// ========================================

app.post("/api/auth/logout", (req, res) => {
  if (!req.session) {
    return res.json({
      mensagem: "Sessão encerrada."
    });
  }

  req.session.destroy((erro) => {
    if (erro) {
      console.error("Erro ao encerrar sessão:", erro.message);

      return res.status(500).json({
        mensagem: "Não foi possível encerrar a sessão."
      });
    }

    res.clearCookie("iot.sid", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });

    return res.json({
      mensagem: "Logout realizado com sucesso."
    });
  });
});

// ========================================
// 13. CONEXÃO MQTT
// ========================================

const client = mqtt.connect(
  process.env.MQTT_URL || "mqtt://localhost:1883"
);

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
    if (topico !== TOPICO) return;

    const dado = JSON.parse(mensagem.toString());

    if (
      typeof dado.deviceId !== "string" ||
      typeof dado.temperature !== "number" ||
      !Number.isFinite(dado.temperature) ||
      typeof dado.humidity !== "number" ||
      !Number.isFinite(dado.humidity) ||
      typeof dado.timestamp !== "string" ||
      Number.isNaN(Date.parse(dado.timestamp))
    ) {
      console.log(
        "Mensagem inválida: confira os campos e o timestamp."
      );
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

    console.log(
      "Leitura salva no PostgreSQL:",
      resultado.rows[0]
    );
  } catch (erro) {
    console.error(
      "Erro ao processar ou salvar leitura:",
      erro.message
    );
  }
});

// ========================================
// 14. CONSULTAR LEITURAS
// ========================================

app.get("/api/leituras", exigirLogin, async (req, res) => {
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

    return res.json(resultado.rows.reverse());
  } catch (erro) {
    console.error("Erro ao consultar leituras:", erro.message);

    return res.status(500).json({
      mensagem: "Erro ao consultar leituras."
    });
  }
});

app.get(
  "/api/leituras/ultima",
  exigirLogin,
  async (req, res) => {
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

      return res.json(resultado.rows[0]);
    } catch (erro) {
      console.error(
        "Erro ao consultar última leitura:",
        erro.message
      );

      return res.status(500).json({
        mensagem: "Erro ao consultar leituras."
      });
    }
  }
);

// ========================================
// 15. ARQUIVOS DA INTERFACE
// ========================================

app.use(express.static(path.join(__dirname, "public")));

// Rota de diagnóstico para caminhos inexistentes
app.use((req, res) => {
  return res.status(404).send(
    `Rota não encontrada: ${req.method} ${req.originalUrl}`
  );
});

// ========================================
// 16. INICIAR SERVIDOR
// ========================================

const servidor = app.listen(PORT, () => {
  console.log(`API disponível em http://localhost:${PORT}`);
  console.log(
    "Rotas OAuth registradas: /api/auth/google e /api/auth/google/callback"
  );
});

servidor.on("error", (erro) => {
  console.error("Erro ao iniciar o servidor:", erro.message);
});

// ========================================
// 17. ENCERRAMENTO ORGANIZADO
// ========================================

async function encerrarServidor() {
  console.log("Encerrando servidor...");

  client.end(true);

  servidor.close(async () => {
    try {
      await pool.end();
      process.exit(0);
    } catch (erro) {
      console.error(
        "Erro ao fechar PostgreSQL:",
        erro.message
      );
      process.exit(1);
    }
  });
}

process.on("SIGINT", encerrarServidor);
process.on("SIGTERM", encerrarServidor);
