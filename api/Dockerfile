FROM node:slim

ENV NPM_CONFIG_LOGLEVEL error
ENV NODE_ENV production
EXPOSE 3000

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY api /usr/src/app

ENTRYPOINT ["node", "."]