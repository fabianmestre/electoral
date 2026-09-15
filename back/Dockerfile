FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3002
COPY package.json ./
COPY src ./src
EXPOSE 3002
USER node
CMD ["node", "src/server.js"]
