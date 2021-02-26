FROM node:current-buster

RUN apt update
RUN apt upgrade -y
RUN apt install -y git

RUN mkdir /cestmaddy

WORKDIR /cestmaddy

COPY package.json package.json
RUN npm i

COPY res res
COPY gruntfile.js gruntfile.js
COPY server.js server.js
COPY entrypoint.sh entrypoint.sh

EXPOSE 80
ENV PORT=80