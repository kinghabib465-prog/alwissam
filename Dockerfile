FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY prisma ./prisma
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache bash curl

# Copy everything as root first (for migrations)
COPY --from=build /app/public ./public
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

# Create upload directory
RUN mkdir -p /app/uploads

# Create app user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    chown -R nextjs:nodejs /app

# Apply migrations and seed before switching user
RUN echo "Starting migrations..." && \
    npx prisma migrate deploy && \
    echo "Migrations completed" && \
    npm run db:seed && \
    echo "Seed completed"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# Switch to nextjs user
USER nextjs

# Set environment variables
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

# Start with standalone server.js (not 'next start')
CMD ["node", ".next/standalone/server.js"]
