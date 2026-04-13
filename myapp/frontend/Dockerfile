# Stage 1: Build the React app
FROM node:18-alpine AS build
WORKDIR /app

# 1. Install dependencies first (better for caching)
COPY package*.json ./
RUN npm install

# 2. Copy the rest of the frontend source code
COPY . .

# 3. Run the Vite build command
# This creates the /app/dist folder inside the container
RUN npm run build 

# Stage 2: Serve with Nginx
FROM nginx:alpine

# 4. Copy your custom Nginx config (the one with the /api/ proxy)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 5. Copy the BUILT files from the 'build' stage to Nginx's public folder
# Since Vite puts things in 'dist', we use /app/dist
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]