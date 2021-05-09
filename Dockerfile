FROM node:current-alpine

RUN apk update
RUN apk add imagemagick

RUN mkdir /cestmaddy

WORKDIR /cestmaddy

COPY package.json package.json

RUN apk --no-cache --virtual build-dependencies add \
    python \
    make \
    g++
RUN npm i
RUN apk del build-dependencies

COPY res res
COPY gruntfile.js gruntfile.js
COPY server.js server.js

EXPOSE 80
ENV PORT=80