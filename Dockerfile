# ── Base image ─────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# ── Install dependencies first — cached unless package.json changes ──
COPY package.json package-lock.json ./
RUN npm install

# ── Copy the rest of the frontend source ──────────────────────
COPY . .

# ── Vite dev server port ───────────────────────────────────────
EXPOSE 5173

# ── host 0.0.0.0 required so it's reachable from outside the container ──
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
