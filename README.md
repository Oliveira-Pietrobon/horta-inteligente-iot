
# Plataforma IoT Integrada

## 1. Sobre o projeto

A Plataforma IoT Integrada é um projeto acadêmico desenvolvido na disciplina de Internet das Coisas (IoT), com o objetivo de demonstrar a comunicação entre sensores, serviços de backend, banco de dados e uma interface web para monitoramento de dados.

O protótipo simula a coleta de dados ambientais, como temperatura e umidade, e permite visualizar as leituras por meio de um dashboard.

## 2. Objetivos

- Simular a coleta de dados de sensores.
- Realizar a comunicação utilizando o protocolo MQTT.
- Receber e processar mensagens no backend.
- Armazenar as leituras em um banco de dados PostgreSQL.
- Disponibilizar os dados por meio de uma API REST.
- Apresentar as informações em uma interface web.
- Permitir a navegação entre as páginas de monitoramento.

## 3. Tecnologias utilizadas

| Tecnologia | Finalidade |
|---|---|
| HTML5 | Estrutura das páginas web |
| CSS3 | Estilização e responsividade |
| JavaScript | Interatividade e atualização dos dados |
| Node.js | Execução do backend |
| Express | Servidor web e API REST |
| MQTT | Comunicação entre o sensor simulado e o backend |
| Eclipse Mosquitto | Broker MQTT |
| PostgreSQL | Persistência das leituras |
| Docker Compose | Inicialização dos serviços em containers |
| npm | Gerenciamento das dependências Node.js |

## 4. Arquitetura do sistema

O fluxo de funcionamento do protótipo é:

1. O sensor simulado gera dados de temperatura e umidade.
2. Os dados são publicados em um tópico MQTT.
3. O broker Mosquitto recebe e encaminha as mensagens.
4. O backend Node.js recebe e processa as mensagens.
5. As leituras são armazenadas no PostgreSQL.
6. A API REST disponibiliza os dados para consulta.
7. O dashboard consulta a API e apresenta as informações.

### Fluxo simplificado

```text
Sensor simulado
      |
      v
Broker MQTT (Mosquitto)
      |
      v
Backend Node.js + Express
      |
      v
Banco PostgreSQL
      |
      v
API REST
      |
      v
Dashboard Web
```

## 5. Funcionalidades implementadas

### Dashboard
- Exibição da temperatura atual.
- Exibição da umidade atual.
- Identificação do dispositivo da última leitura.
- Horário da última medição.
- Gráficos de temperatura e umidade.
- Estatísticas de média, máxima e mínima.
- Histórico recente das leituras.
- Atualização automática dos dados.

### Leituras
- Consulta das leituras recebidas pela plataforma.
- Visualização do histórico disponível.
- Pesquisa e navegação pelos registros apresentados.

### Dispositivos
- Identificação dos dispositivos presentes nas leituras recebidas.
- Exibição das informações de monitoramento disponíveis.

Observação: a identificação apresentada nessa página é baseada nas leituras disponíveis. Ela ainda não representa um catálogo completo e persistente de dispositivos.

### Alertas
- Verificação visual de leituras que ultrapassam limites definidos na interface.

Observação: as regras apresentadas nessa versão não representam um serviço completo de notificações do backend.

### Relatórios
- Consulta das leituras disponíveis.
- Filtragem dos dados apresentados.
- Exportação dos registros filtrados para CSV.

Observação: os relatórios dependem da quantidade de registros disponibilizada pela API.

### Configurações
- Seleção de preferências locais da interface.
- Consulta do estado de resposta da API.

Observação: as preferências são armazenadas no navegador e não configuram diretamente os serviços do servidor.

## 6. Estrutura do projeto

```text
plataforma-iot-integrada/
├── public/
│   ├── index.html
│   ├── leituras.html
│   ├── dispositivos.html
│   ├── alertas.html
│   ├── relatorios.html
│   └── configuracoes.html
├── mosquitto/
│   ├── config/
│   │   └── mosquitto.conf
│   ├── data/
│   └── log/
├── docker-compose.yml
├── package.json
├── package-lock.json
├── sensor.js
├── server.js
└── README.md
```

A estrutura acima representa a organização prevista para o protótipo. Confira os nomes e arquivos existentes no seu diretório antes de entregar.

## 7. Pré-requisitos

Para executar o projeto, são necessários:

- Node.js e npm.
- Docker Desktop com Docker Compose.
- Os arquivos do projeto.
- As dependências Node.js instaladas.

## 8. Como executar

### 8.1. Abrir a pasta do projeto

No terminal, acesse a pasta principal:

```powershell
cd "C:\Users\lidia\Documents\8periodo\Internet das coisas\ciclo 2\plataforma-iot-integrada"
```

### 8.2. Instalar as dependências

```powershell
npm install
```

### 8.3. Iniciar o broker MQTT e o PostgreSQL

```powershell
docker compose up -d
```

Verifique os containers:

```powershell
docker ps
```

### 8.4. Iniciar o backend

Em um terminal:

```powershell
node server.js
```

O servidor deverá disponibilizar a API na porta 3000, conforme a configuração atual do projeto.

### 8.5. Iniciar o sensor simulado

Em outro terminal, na pasta principal:

```powershell
node sensor.js
```

O sensor deverá publicar mensagens no tópico MQTT configurado no projeto.

### 8.6. Abrir o dashboard

No navegador, acesse:

http://localhost:3000/index.html

As demais páginas podem ser acessadas pelo menu lateral do dashboard.

## 9. Endpoints da API

| Endpoint | Finalidade |
|---|---|
| `GET /api/leituras` | Consultar o histórico de leituras disponível |
| `GET /api/leituras/ultima` | Consultar a última leitura recebida |

Os endpoints acima correspondem às rotas utilizadas pela interface do protótipo. Consulte o arquivo `server.js` para confirmar a implementação atual.

## 10. Banco de dados

O PostgreSQL é utilizado para persistir as leituras dos sensores.

A tabela `leituras` armazena os registros recebidos pela aplicação, incluindo informações como identificador do dispositivo, temperatura, umidade e horário da medição, conforme a implementação atual.

## 11. Limitações da versão atual

Este projeto está em desenvolvimento e representa um protótipo acadêmico. Nem todos os requisitos de uma plataforma IoT completa estão implementados.

Entre os itens que ainda precisam ser avaliados ou desenvolvidos estão:

- Autenticação e controle de acesso por perfil.
- Isolamento de dados por organização ou cliente.
- Catálogo persistente e gerenciamento completo de dispositivos.
- Validação formal das mensagens com JSON Schema.
- Deduplicação de mensagens.
- Tratamento de dados atrasados.
- Ingestão por HTTP e processamento em lote.
- Armazenamento offline na borda e sincronização posterior.
- Regras de alertas persistentes e notificações.
- Monitoramento técnico, métricas e logs centralizados.
- Configuração segura de credenciais MQTT e dos serviços.

A conclusão desses itens depende da comparação com o documento de requisitos da disciplina e do planejamento das próximas etapas.

## 12. Segurança

As configurações utilizadas no ambiente de desenvolvimento devem ser tratadas como locais e temporárias.

Antes de disponibilizar o sistema em um ambiente público:

- Desabilite o acesso anônimo ao broker MQTT.
- Configure autenticação e permissões.
- Utilize senhas fortes e variáveis de ambiente.
- Não publique credenciais no repositório.
- Restrinja o acesso às portas dos serviços.
- Implemente autenticação e autorização na API.

Não utilize as credenciais de desenvolvimento como configuração de produção.

## 13. Contexto acadêmico

**Projeto:** Plataforma IoT Integrada  
**Disciplina:** Internet das Coisas  
**Instituição:** UniEVANGÉLICA  
**Curso:** Engenharia de Software

Projeto desenvolvido para fins acadêmicos, com foco na integração entre dispositivos simulados, comunicação MQTT, backend, banco de dados e interface de monitoramento.
