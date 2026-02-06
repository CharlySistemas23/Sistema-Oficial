# Usar imagen oficial de Node.js
FROM node:18-alpine

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias primero (para aprovechar caché de Docker)
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar el resto de los archivos de la aplicación
COPY . .

# Exponer el puerto (Railway asignará el puerto automáticamente)
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["npm", "start"]
