FROM node:current-alpine

RUN mkdir /cestmaddy

WORKDIR /cestmaddy

COPY res res
COPY gruntfile.js gruntfile.js
COPY package.json package.json
COPY server.js server.js

RUN npm i

EXPOSE 80
ENV PORT=80

CMD ["npm", "run", "start-favicons"]