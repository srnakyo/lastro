# Lastro server: dashboard, API and MCP endpoint. Build from the repository root:
#   docker build -f docker/Dockerfile -t lastro .
# Targets: "web" (default, the server) and "migrate" (applies the database migrations and exits).

FROM oven/bun:1.3.2 AS build
WORKDIR /repo
COPY . .
RUN bun install --frozen-lockfile \
 && cd packages/database && bunx prisma generate \
 && cd /repo/apps/web && bun run build

FROM build AS migrate
WORKDIR /repo/packages/database
CMD ["bunx", "prisma", "migrate", "deploy"]

FROM node:22-bookworm-slim AS web
ENV NODE_ENV=production \
    PORT=4317 \
    HOST=0.0.0.0 \
    LASTRO_STORAGE_DIR=/data/storage \
    LASTRO_MERMAID_JS=/app/vendor/mermaid.min.js \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
WORKDIR /app
COPY --from=build /repo/apps/web/.output ./.output
COPY --from=build /repo/apps/web/node_modules/mermaid/dist/mermaid.min.js ./vendor/mermaid.min.js
# Chromium draws the diagrams of the documents and prints their PDFs.
RUN V=$(node -p "require('./.output/server/node_modules/playwright/package.json').version") \
 && npx -y "playwright@$V" install --with-deps chromium \
 && npm cache clean --force \
 && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /data/storage && chown -R node:node /data
USER node
VOLUME ["/data"]
EXPOSE 4317
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:4317/sign-in').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", ".output/server/index.mjs"]
