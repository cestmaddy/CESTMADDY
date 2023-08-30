###################
# COMPILE WEBSITE #
###################
FROM node:18-alpine as compile

# Install dependencies
RUN apk add --no-cache \
	imagemagick

# Copy sources
WORKDIR /cestmaddy
COPY package.json package-lock.json tsconfig.json ./
RUN npm install
COPY core core
COPY deployment/default cestici

# Compile sources
RUN npm run compile

# Build website
RUN npm run build

###################
# RUN WEBSITE     #
###################
FROM alpine:3.16 as main

# Install dependencies
RUN apk add --no-cache \
	nodejs \
	icu-data-full \
	npm

WORKDIR /cestmaddy
COPY --from=compile /cestmaddy/package.json /cestmaddy/package-lock.json ./
COPY --from=compile /cestmaddy/dist dist
COPY --from=compile /cestmaddy/.dist .dist
COPY --from=compile /cestmaddy/cestici/config.yml cestici/config.yml
RUN npm install --omit=dev

EXPOSE 80
ENV PORT=80
CMD [ "npm", "start" ]
