# 🎮 Game Portal

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=nodedotjs)](https://nodejs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-blue?logo=prisma)](https://www.prisma.io/)
[![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?logo=discord)](https://discord.js.org/)
[![Docker](https://img.shields.io/badge/Docker-Supported-2496ED?logo=docker)](https://www.docker.com/)

*English version is below. / Az angol verzió lejjebb található.*

---

## Magyar (Hungarian)

Ez a projekt egy átfogó, modern webes játék portál, valós idejű WebSocket támogatással, beépített adminisztrációs felülettel és Discord bot integrációval. Ideális zárt baráti társaságok, közösségek számára közös játékestek lebonyolítására.

###  Funkciók
- **Valós idejű többjátékos élmény**: WebSocket alapú kommunikáció a gyors és zökkenőmentes játékmenetért.
- **Különböző játékmódok**: Beépített egyedi játékmódok.
- **Discord Integráció**: A Discord bot kibővíti a játékélményt, és lehetővé teszi a szerverrel való interakciót közvetlenül Discordról.
- **Média Kezelés**: FFmpeg támogatás a médiafájlok (hangok, képek) háttérbeli feldolgozásához.
- **Dockerizált környezet**: Könnyű és gyors telepítés Docker Compose segítségével.

###  Projekt Szerkezet

A projekt egy monorepo struktúrát követ, ahol a kliens, a szerver és a bot logikája külön csomagokban van elszeparálva:

```game-portal/
├── backend/            # Express.js szerver, WebSocket és Prisma ORM logóika
│   ├── prisma/         # Adatbázis sémák és migrációs fájlok
│   └── .env.example    # Szerveroldali környezeti változók mintája
├── frontend/           # Next.js 14 kliensalkalmazás (App Router)
│   └── .env.example    # Kliensoldali környezeti változók mintája
├── discordbot/         # Discord.js bot és az Express átjárója
│   └── .env.example    # Bot hitelesítési kulcsok mintája
├── docker-compose.yml  # Multi-konténeres Docker konfiguráció
└── README.md
```

###  Architektúra és Technológiai Stack

1. **Frontend** (Kliens)
   - **Next.js 14** & **React 18**
   - **Tailwind CSS** a modern és reszponzív dizájnért
   - **TypeScript** & **Axios**

2. **Backend** (Szerver)
   - **Node.js** (v18+) & **Express**
   - **Prisma ORM** (MySQL adatbázissal)
   - **WebSocket (`ws`)** a valós idejű adatáramláshoz
   - **JWT** (JSON Web Token) hitelesítés
   - **FFmpeg** & **Multer** a fájlok/média kezeléséhez

3. **Discord Bot**
   - **Discord.js v14**
   - Express.js végpontok a backenddel való biztonságos kommunikációhoz

###  Telepítés és Futtatás

#### Előfeltételek
- Node.js (v18+)
- npm / pnpm / yarn
- MySQL szerver (amennyiben nem Dockeren keresztül futtatod)
- FFmpeg telepítve a host gépen (manuális futtatás esetén)

#### Futtatás Dockerrel (Ajánlott)
A leggyorsabb módja a projekt elindításának a Docker használata. Ekkor minden környezet (MySQL, FFmpeg) automatikusan konfigurálódik.

Indítás előtt másold le a `.env.example` fájlokat `.env` néven a megfelelő mappákban, és töltsd ki a szükséges tokeneket/kulcsokat.

##### A projekt gyökérkönyvtárában futtasd:
docker-compose up --build -d

A szolgáltatások az alábbi portokon lesznek elérhetőek:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8083
- **MySQL Adatbázis**: 3307 (a host gépen keresztüli eléréshez)

*(Megjegyzés: A Prisma migrációk a konténer indulásakor automatikusan lefutnak.)*

#### Manuális Futtatás (Docker nélkül)

1. **Adatbázis Beállítása**
   Hozd létre a MySQL adatbázist, majd állítsd be a `DATABASE_URL`-t a `backend/.env` fájlban.
   
   cd backend
   npm install
   npx prisma generate
   npx prisma migrate deploy

2. **Backend Indítása**
   
   cd backend
   npm run dev

3. **Frontend Indítása**
   
   cd ../frontend
   npm install
   npm run dev

4. **Discord Bot Indítása**
   
   cd ../discordbot
   npm install
   npm start

### Biztonság és Megjegyzések
A rendszer JWT alapú hitelesítést használ, a szenzitív adatok pedig szigorúan `.env` fájlokban tárolódnak.

> [!WARNING]
> A projekt jelenleg hobbicélokat szolgál és fejlesztés alatt áll. Éles, nyilvános környezetben való használat előtt további biztonsági intézkedések (pl. rate limiting, szigorúbb CORS szabályok, input validáció megerősítése) szükségesek!

### TODO / Útiterv
- [ ] Kód refaktorálása és optimalizálása (tisztább architektúra)
- [ ] Részletesebb API és komponens dokumentáció készítése
- [ ] Autentikáció és biztonsági funkciók továbbfejlesztése
- [ ] Meglévő játékmódok finomhangolása, hibajavítások
- [ ] Új játékmódok implementálása a közösség számára

---

## English

This project is a comprehensive, modern web-based game portal featuring real-time WebSocket support, a built-in administration interface, and seamless Discord bot integration. Perfect for private communities and friend groups to host custom game nights.

### Features
- **Real-time Multiplayer Experience**: Powered by WebSockets for instant, low-latency state synchronization.
- **Various Game Modes**: Built-in distinct game modes.
- **Discord Integration**: Rich Discord bot integration to interact with the game portal directly from your Discord server.
- **Media Processing**: Behind-the-scenes media management powered by FFmpeg.
- **Dockerized Environment**: Ready-to-go deployment via Docker Compose.

### Project Structure

The project is structured as a monorepo, separating core concerns into distinct packages:
```
game-portal/
├── backend/            # Express.js server, WebSocket & Prisma logic
│   ├── prisma/         # Database schemas and migrations
│   └── .env.example    # Server-side environment variables template
├── frontend/           # Next.js 14 client application (App Router)
│   └── .env.example    # Client-side environment variables template
├── discordbot/         # Discord.js bot & local Express gateway
│   └── .env.example    # Bot credentials template
├── docker-compose.yml  # Multi-container Docker configuration
└── README.md
```
### Architecture & Tech Stack

1. **Frontend** (Client)
   - **Next.js 14** & **React 18**
   - **Tailwind CSS** for modern and responsive UI design
   - **TypeScript** & **Axios**

2. **Backend** (Server)
   - **Node.js** (v18+ recommended) & **Express**
   - **Prisma ORM** with MySQL
   - **WebSocket (`ws`)** for real-time data streaming
   - **JWT** (JSON Web Token) authentication
   - **FFmpeg** & **Multer** for file and media processing

3. **Discord Bot**
   - **Discord.js v14**
   - Express.js endpoints for secure bridge communication with the backend

### Installation and Running

#### Prerequisites
- Node.js (v18+)
- npm / pnpm / yarn
- MySQL server (if running locally without Docker)
- FFmpeg installed on your host system (if running manually)

#### Running with Docker (Recommended)
Docker Compose will automatically set up the entire environment, including MySQL and FFmpeg tools. 

Before running the command, make sure to copy the `.env.example` files to `.env` in their respective directories and fill out the required credentials.

# From the project root directory:
docker-compose up --build -d

The applications will be accessible at:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8083
- **MySQL Database**: 3307 (forwarded to the host machine)

*(Note: Prisma migrations run automatically when the backend container starts up.)*

#### Manual Setup (Without Docker)

1. **Database Setup**
   Create a blank MySQL database, then configure your `DATABASE_URL` inside `backend/.env`.
```   
   cd backend
   npm install
   npx prisma generate
   npx prisma migrate deploy
```
2. **Starting the Backend**
```
   cd backend
   npm run dev
```
3. **Starting the Frontend**
```
   cd ../frontend
   npm install
   npm run dev
```
4. **Starting the Discord Bot**
   
   cd ../discordbot
   npm install
   npm start

### Security & Notes
The system leverages standard JWT authentication, keeping all private tokens safely tucked away inside `.env` configs.

> [!WARNING]
> This project is currently built for hobby and private group purposes. Before exposing it to a live public environment, further security hardening (such as aggressive rate limiting, stricter CORS rules, and deeper input validation) is strongly advised!

### TODO / Roadmap
- [ ] Code refactoring and performance optimization (cleaner architecture)
- [ ] Generating detailed API and component documentation
- [ ] Enhancing authentication and security features
- [ ] Bug fixing and fine-tuning existing game modes
- [ ] Implementing brand-new custom game modes