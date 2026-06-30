# Guess the Output — production image. Builds the React client, then runs the
# Express + Socket.IO server (rooms held in memory).
FROM node:20-alpine
WORKDIR /app

# Server runtime deps (express + socket.io); dev deps are test-only.
COPY package*.json ./
RUN npm ci --omit=dev

# Build the React client (Vite) -> client/dist
COPY client/package*.json ./client/
RUN npm --prefix client ci
COPY client ./client
RUN npm --prefix client run build

# Server source (engine + protocol)
COPY server.js ./
COPY src ./src

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
