FROM node:18-alpine as build
WORKDIR /app
COPY package.json package-lock.json ./
# Rule 9: Quiet install
RUN npm ci --silent
COPY . .
# Build
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Cloud Run requirement: Listen on 8080
# Create a valid nginx config on the fly
RUN echo "server { \
    listen 8080; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files \$uri \$uri/ /index.html; \
    } \
}" > /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
