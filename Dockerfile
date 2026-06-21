# Family Archive — Railway build.
#
# This repo is a small monorepo: the root package is the `@family-archive/ui`
# design-system library, and the Next.js app lives in `app/` and depends on the
# library via a `file:..` dependency. The library's built output (`dist/`) is
# gitignored, so it must be (re)built here before the app can compile.
#
# Build order: build the library -> dist/, then install + build the app.

FROM node:20-alpine AS base
WORKDIR /repo

# (The DB driver is `pg` — pure JS, no native build toolchain needed.)

# --- 1. Build the design-system library (root package -> dist/) ---
COPY package.json package-lock.json tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm ci
RUN npm run build

# --- 2. Install + build the Next.js app (resolves @family-archive/ui via file:..) ---
WORKDIR /repo/app
COPY app/package.json app/package-lock.json ./
RUN npm ci
COPY app/ ./
RUN npm run build

# --- 3. Runtime ---
ENV NODE_ENV=production
# Railway injects PORT; `next start` honors it. Default for local `docker run`.
ENV PORT=3000
EXPOSE 3000
CMD ["npm", "run", "start"]
