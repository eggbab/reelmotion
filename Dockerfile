# syntax=docker/dockerfile:1
# ReelMotion 의 두 컨테이너를 한 파일에서 만든다(의존성 설치를 함께 쓴다).
#   web: 소개 페이지·편집기(정적 파일)를 Caddy 가 내보내고 /api/asr 는 받아쓰기 서버, /api 는 앱 서버로 넘긴다.
#   app: 로그인·계정·작업 저장 서버(Node, SQLite) — server/app
#   docker build --target web .    /    docker build --target app .
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# HTTPS 를 다시 서명하는 프록시 뒤에서 빌드할 때만: docker build --secret id=extra_ca,src=/path/to/ca.crt
RUN --mount=type=secret,id=extra_ca,required=false \
    if [ -s /run/secrets/extra_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca; fi && \
    npm ci --no-audit --no-fund
COPY . .

FROM deps AS web-build
# 도메인을 정하면 넘긴다(docker compose 는 deploy/.env 의 SITE_ORIGIN). 비어 있으면 바른 주소·언어별 주소·공유 그림·사이트 지도를 빼고 만든다.
ARG SITE_ORIGIN=
ENV SITE_ORIGIN=${SITE_ORIGIN}
# 1 이면 서비스 워커(편집기를 인터넷 없이 여는 기능)를 끄는 판으로 만든다 — 문제가 생겼을 때만(docs/operations.md 「앱으로 설치·오프라인」).
ARG SW_DISABLE=
ENV SW_DISABLE=${SW_DISABLE}
RUN npm run build

FROM deps AS app-build
RUN npx vite build --config server/app/vite.config.ts

FROM node:22-slim AS app
WORKDIR /app
ENV NODE_ENV=production DATA_DIR=/data APP_HOST=0.0.0.0 APP_PORT=8787
COPY --from=app-build /app/dist-app/main.js ./main.js
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:8787/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"
CMD ["node", "--disable-warning=ExperimentalWarning", "main.js"]

FROM caddy:2.10-alpine AS web
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=web-build /app/dist /srv
