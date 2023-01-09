FROM node:12.18.1-alpine 

ENV NODE_ENV=local
# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install

RUN wget https://s3.amazonaws.com/rds-downloads/rds-combined-ca-bundle.pem
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

EXPOSE 3000



CMD [ "node", "socket-server.js" ]

