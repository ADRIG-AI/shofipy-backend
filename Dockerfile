FROM node:21-alpine

# Set NODE_ENV to production
ENV NODE_ENV=production

# Create app directory
WORKDIR /usr/src/app

# Copy only the dependency definitions
COPY package*.json ./

RUN npm ci --omit=dev


# Copy the rest of your app
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Start the app
CMD ["node", "index.js"]
