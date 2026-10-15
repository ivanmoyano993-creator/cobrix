FROM node:24-alpine

ENV NODE_ENV=production \
	HOST=0.0.0.0 \
	PORT=4300 \
	BILLING_API_PORT=4310 \
	COBRIX_DATA_DIR=/data/cobrix \
	BILLING_API_DB=/data/billing-api.sqlite

WORKDIR /app

COPY package.json ./
COPY src ./src
COPY docs/ENUNCIADO.md ./docs/ENUNCIADO.md

RUN mkdir /data && chown node:node /data

USER node

VOLUME /data

EXPOSE 4300 4310

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
	CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"

CMD ["node", "--disable-warning=ExperimentalWarning", "src/main.ts"]
