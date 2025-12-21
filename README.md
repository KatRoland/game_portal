## *English version is below.*


# Game Portal

Ez a projekt egy átfogó játék portál, websocket támogatással, adminisztrációs felülettel és Discord bot támogatással.

## Architektúra

A projekt három fő komponensből áll:

1.  **Frontend**: Next.js (React) alapú weboldal Tailwind CSS használatával.
2.  **Backend**: Node.js + Express szerver, Prisma ORM-mel (MySQL adatbázis), WebSocket támogatással a valós idejű játékokhoz.
3.  **Discord Bot**: Discord.js alapú bot, amely bővíti a néhány játékmód működését discord integrációval.

## Technológiai Stack

-   **Frontend**:
    -   Next.js 14
    -   React 18
    -   Tailwind CSS
    -   TypeScript
    -   Axios
-   **Backend**:
    -   Node.js (v18+ ajánlott)
    -   Express
    -   Prisma (MySQL)
    -   WebSocket (`ws`)
    -   FFmpeg (média feldolgozáshoz)
    -   JSON Web Token (JWT) hitelesítés
    -   Multer (fájlfeltöltés)
-   **Discord Bot**:
    -   Discord.js v14

## Telepítés és Futtatás

### Előfeltételek

-   Node.js (v18+ ajánlott)
-   npm csomagkezelő
-   MySQL adatbázis
-   Ahhoz hogy az oldal megfelőlően működjön ebben az esetben is, szükség van egy domainre, és SSL tanúsítványra (a discord botot kivéve).


### Adatbázis Beállítása

Győződj meg róla, hogy fut a MySQL szerver, és létrehoztad a szükséges adatbázist. A `backend/.env` fájlban add meg a `DATABASE_URL`-t.

```bash
# Backend könyvtárban
npx prisma generate
npx prisma migrate deploy
```

### 1. Backend Indítása

```bash
cd backend
npm install
# .env fájl létrehozása a .env.example alapján
npm run dev
```

A backend alapértelmezetten a `8081`-es porton fut (vagy amit a `.env`-ben beállítasz).

### 2. Frontend Indítása

```bash
cd frontend
npm install
# .env létrehozása a .env.example alapján
npm run dev
```

A frontend alapértelmezetten a `http://localhost:3000` címen érhető el.

### 3. Discord Bot Indítása

```bash
cd discordbot
npm install
# .env létrehozása a .env.example alapján
npm start
```

## Futtatás Dockerrel (Ajánlott)

A projekt tartalmaz `docker-compose` támogatást, így egyetlen paranccsal elindítható az egész környezet (adatbázis, backend, frontend, bot).

### Előfeltételek
- Docker és Docker Compose telepítve legyen a gépeden.

### Indítás
```bash
# Projekt gyökérkönyvtárában
docker-compose up --build
```

A szolgáltatások a következő portokon lesznek elérhetőek:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8081
- **Discord Bot**: http://localhost:3030
- **Adatbázis**: 3306

> **Megjegyzés**: 
- Az első indításnál a Prisma migrációk automatikusan lefutnak a konténer indulásakor.

## Biztonság

A rendszer JWT alapú hitelesítést használ. A környezeti változókat (API kulcsok, adatbázis URL) `.env` fájlokban tároljuk. **Azonban a projekt csak hobbi céllal készült, és biztonsági szempontból jelenleg sok téren nem felel meg a szokványos biztonsági megoldásoknak!**

## TODO
-   *Fő prioritás:*
    -   Kód refaktorálása/optimizálása
    -   Részletes dokumentáció készítése
    -   Authentikáció, biztonsági frissítések 
-   *Egyebek:*
    -   Jelenlegi játékmódokban található hibák kijavítása
    -   További játékmódok hozzáadása.

---

# Game Portal (English)

This project is a comprehensive game portal with websocket support, administration interface, and Discord bot support.

## Architecture

The project consists of three main components:

1.  **Frontend**: Next.js (React) based website using Tailwind CSS.
2.  **Backend**: Node.js + Express server with Prisma ORM (MySQL database), WebSocket support for real-time games.
3.  **Discord Bot**: Discord.js based bot that extends the functionality of some game modes with Discord integration.

## Technology Stack

-   **Frontend**:
    -   Next.js 14
    -   React 18
    -   Tailwind CSS
    -   TypeScript
    -   Axios
-   **Backend**:
    -   Node.js (v18+ recommended)
    -   Express
    -   Prisma (MySQL)
    -   WebSocket (`ws`)
    -   FFmpeg (for media processing)
    -   JSON Web Token (JWT) authentication
    -   Multer (file uploading)
-   **Discord Bot**:
    -   Discord.js v14

## Installation and Running

### Prerequisites

-   Node.js (v18+ recommended)
-   npm package manager
-   MySQL database
-   To ensure proper functionality, a domain and SSL certificate are required (except for the discord bot).

### Database Setup

Make sure the MySQL server is running and the required database is created. Set the `DATABASE_URL` in the `backend/.env` file.

```bash
# In backend directory
npx prisma generate
npx prisma migrate deploy
```

### 1. Starting Backend

```bash
cd backend
npm install
# Create .env file based on .env.example
npm run dev
```

The backend runs on port `8081` by default (or whatever is set in `.env`).

### 2. Starting Frontend

```bash
cd frontend
npm install
# Create .env based on .env.example
npm run dev
```

The frontend is available at `http://localhost:3000` by default.

### 3. Starting Discord Bot

```bash
cd discordbot
npm install
# Create .env based on .env.example
npm start
```

## Running with Docker (Recommended)

The project includes `docker-compose` support, so the entire environment (database, backend, frontend, bot) can be started with a single command.

### Prerequisites
- Docker and Docker Compose must be installed on your machine.

### Startup
```bash
# In project root directory
docker-compose up --build
```

Services will be available on the following ports:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8081
- **Discord Bot**: http://localhost:3030
- **Database**: 3306

> **Note**: 
- On first startup, Prisma migrations run automatically when the container starts.

## Security

The system uses JWT-based authentication. Environment variables (API keys, database URL) are stored in `.env` files. **However, this project was created for hobby purposes only, and currently does not meet standard security solutions in many aspects!**

## TODO
-   *Main priority:*
    -   Code refactoring/optimization
    -   Detailed documentation
    -   Authentication, security updates
-   *Others:*
    -   Fixing bugs in current game modes
    -   Adding more game modes.