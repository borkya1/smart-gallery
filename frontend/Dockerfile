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
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
