# -----------------------------
# Base stage for dependencies
# -----------------------------
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install

# -----------------------------
# Development stage (Vite HMR)
# -----------------------------
FROM base AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# -----------------------------
# Build stage (Static SPA build)
# -----------------------------
FROM base AS builder
COPY . .
RUN npm run build

# -----------------------------
# Production stage (Nginx static)
# -----------------------------
FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
