FROM node:11

RUN apt-get update -y && apt-get install -y postgresql-client

WORKDIR /usr/src/app

COPY package*.json ./

COPY wait-for-postgres.sh ./

RUN npm ci

COPY . .

RUN npx cm build
ENV NODE_ENV="production"

CMD [ "npm", "start" ]