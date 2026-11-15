# syntax=docker/dockerfile:1
# ReelMotion 웹(소개 페이지 + 편집기). 빌드한 정적 파일을 Caddy 가 내보내고, /api/asr 는 받아쓰기 서버로 넘긴다.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
# HTTPS 를 다시 서명하는 프록시 뒤에서 빌드할 때만: docker build --secret id=extra_ca,src=/path/to/ca.crt
RUN --mount=type=secret,id=extra_ca,required=false \
    if [ -s /run/secrets/extra_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/extra_ca; fi && \
    npm ci --no-audit --no-fund
COPY . .
# 도메인을 정하면 넘긴다(docker compose 는 deploy/.env 의 SITE_ORIGIN). 비어 있으면 바른 주소·언어별 주소·공유 그림·사이트 지도를 빼고 만든다.
ARG SITE_ORIGIN=
ENV SITE_ORIGIN=${SITE_ORIGIN}
RUN npm run build

FROM caddy:2.10-alpine
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
