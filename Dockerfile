FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache \
    python3 make g++ \
    cairo-dev pango-dev jpeg-dev giflib-dev

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3420

CMD ["node", "src/index.js"]
