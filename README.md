# ChoufPrice-DZ-Platform Backend

Simple auth API built with Express, MongoDB, and JWT.

## Prerequisites

- Node.js 18+ (tested on 22)
- MongoDB URI

## Setup

1. Install deps:
   ```bash
   npm install
   ```
2. Copy env template and fill values:
   ```bash
   cp .env.example .env
   # edit .env
   ```
3. Run dev server:
   ```bash
   npm run dev
   ```

## Environment variables

- PORT (default 4000)
- MONGODB_URI (required)
- JWT_SECRET (required)
- FRONTEND_ORIGIN (CORS allowlist, default "\*")

## API

Base URL: `http://localhost:4000`

- `GET /health` — service status
- `POST /api/auth/register` — body: `{ email, password, name? }`
- `POST /api/auth/login` — body: `{ email, password }`
- `GET /api/auth/me` — header: `Authorization: Bearer <token>`

## Project scripts

- `npm run dev` — start with nodemon
- `npm start` — start with node

## Tech stack

- express, mongoose, jsonwebtoken, bcrypt, helmet, cors, morgan

## Notes

- Tokens expire in 7d; adjust in `src/routes/auth.js` if needed.
- Keep `.env` out of git (already in `.gitignore`).
