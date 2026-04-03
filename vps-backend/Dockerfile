FROM mcr.microsoft.com/playwright:v1.42.0-focal

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --production

COPY tsconfig.json ./
COPY src/ ./src/

RUN npx tsc

EXPOSE 3001

CMD ["node", "dist/server.js"]
