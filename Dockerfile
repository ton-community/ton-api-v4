FROM node:16-alpine
WORKDIR /app/

# Add sources
COPY package.json /app/
COPY yarn.lock /app/
RUN yarn install

# Build
COPY tsconfig.json /app/
COPY . .
RUN yarn build

# Execute
CMD [ "node", "--inspect", "/app/dist/index.js" ]
