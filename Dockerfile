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

EXPOSE 80
ENV PORT=80
CMD [ "npm", "start" ]
