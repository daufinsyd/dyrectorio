# Stage 1
FROM node:19.2-alpine3.17 AS BUILDER

ENV NODE_ENV production
WORKDIR /app

RUN apk --update add openssl1.1-compat

COPY ./package.json ./package-lock.json ./tsconfig.build.json ./tsconfig.json ./
COPY ./prisma ./prisma
COPY ./templates ./templates
COPY ./src ./src

RUN npm ci --no-fund && npm run prismagen
RUN npm run build

# Stage 2
FROM node:19.2-alpine3.17 AS RUNNER
ENV NODE_ENV production
ENV TZ Europe/Budapest

RUN apk --update add tzdata openssl1.1-compat

WORKDIR /app

COPY --from=BUILDER /app/dist ./dist
COPY --from=BUILDER /app/package.json ./
COPY --from=BUILDER /app/node_modules ./node_modules
COPY --from=BUILDER /app/prisma ./prisma
COPY --from=BUILDER /app/templates ./templates
COPY ./crux-docker-entrypoint.sh ./
COPY ./assets/ ./assets/
COPY ./proto ./proto

USER node

EXPOSE 5000-5001
LABEL org.opencontainers.image.source="https://github.com/dyrector-io/dyrectorio/web/crux"

# Start
ENTRYPOINT ["./crux-docker-entrypoint.sh"]
CMD ["serve"]
