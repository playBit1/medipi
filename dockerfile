FROM node:24-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm install

# Copy all source files
COPY . .

# Set environment variables
ENV DATABASE_URL="file:./dev.db"
ENV NEXTAUTH_SECRET="0LzU8WSDaKWoP5+GbzBFxl9tDU7b5sbJawz+3Y5jDrs="
ENV NEXTAUTH_URL="http://localhost:3000"
#ENV NEXT_PUBLIC_NODE_RED_URL="http://localhost:1880"
ENV NEXT_PUBLIC_NODE_RED_WS="ws://192.168.1.156:1880/ws/dispensers"
ENV NEXT_PUBLIC_NODE_RED_URL="http://192.168.1.156:1880"

# Generate Prisma client
RUN npx prisma generate

# Create and migrate the database
RUN npx prisma migrate deploy

# Seed the database
RUN npx prisma db seed

# Build the app
RUN npm run build

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]