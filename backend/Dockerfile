FROM node:18-alpine

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install
RUN npx prisma generate

COPY . .

RUN npm run build

EXPOSE 8083

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["docker-entrypoint.sh"]
