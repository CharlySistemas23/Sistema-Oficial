// Script para iniciar el servidor desde el root
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { chdir } from 'process';
import { existsSync, readdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const backendPath = join(__dirname, 'backend');
const serverPath = join(backendPath, 'server.js');

console.log('🔍 Verificando estructura de directorios...');
console.log('   Directorio actual:', __dirname);
console.log('   Buscando backend en:', backendPath);
console.log('   Buscando server.js en:', serverPath);

if (!existsSync(backendPath)) {
    console.error('❌ Error: No se encontró el directorio backend/');
    console.error('   Directorio actual:', process.cwd());
    process.exit(1);
}

if (!existsSync(serverPath)) {
    console.error('❌ Error: No se encontró backend/server.js');
    try {
        console.error('   Archivos en backend/:', readdirSync(backendPath));
    } catch (e) {
        console.error('   No se pudo leer el directorio backend/');
    }
    process.exit(1);
}

console.log('✅ Directorio backend encontrado');
console.log('✅ Archivo server.js encontrado');
console.log('📂 Cambiando al directorio backend...');

chdir(backendPath);
console.log('✅ Directorio de trabajo cambiado a:', process.cwd());

console.log('🚀 Iniciando servidor...');
import(serverPath).catch(err => {
    console.error('❌ Error al importar server.js:', err);
    process.exit(1);
});
