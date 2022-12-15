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

# Build and compile
RUN npm run build
RUN npm run compile

EXPOSE 80
ENV PORT=80
CMD ["sh", "-c", "npm run compile && npm run start"]
