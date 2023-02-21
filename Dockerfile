FROM node:16-alpine
WORKDIR /app/

# Add sources
COPY package.json /app/
COPY yarn.lock /app/
COPY .yarnrc.yml /app/
COPY .yarn/releases /app/.yarn/releases
RUN yarn install

# Build
COPY tsconfig.json /app/
COPY . .
RUN yarn build

# Execute
CMD [ "node", "/app/dist/index.js" ]