// Script para verificar errores comunes en el código
const fs = require('fs');
const path = require('path');

const errors = [];

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Verificar acceso a propiedades sin optional chaining cuando podrían ser null/undefined
    if (line.match(/\.(data|client|category|pos)\./) && !line.includes('?.') && !line.includes('||')) {
      // Verificar si es un acceso seguro con verificación previa
      const prevLines = lines.slice(Math.max(0, index - 3), index).join(' ');
      if (!prevLines.includes('if (') && !prevLines.includes('data?.') && !prevLines.includes('data.data')) {
        // Solo reportar si no hay verificación previa
        if (line.includes('data.data.') || line.includes('request.category.') || line.includes('request.client.')) {
          errors.push({
            file: filePath,
            line: lineNum,
            type: 'Unsafe property access',
            message: `Possible unsafe property access: ${line.trim()}`
          });
        }
      }
    }
    
    // Verificar console.error sin manejo de errores
    if (line.includes('console.error') && !line.includes('catch') && !line.includes('finally')) {
      const nextLines = lines.slice(index, Math.min(lines.length, index + 5)).join(' ');
      if (!nextLines.includes('catch') && !nextLines.includes('try')) {
        // No es crítico, solo informativo
      }
    }
    
    // Verificar uso de 'as any' (code smell)
    if (line.includes('as any')) {
      errors.push({
        file: filePath,
        line: lineNum,
        type: 'Type assertion',
        message: `Using 'as any' type assertion: ${line.trim()}`
      });
    }
  });
}

// Verificar archivos principales
const filesToCheck = [
  'src/app/page.tsx',
  'src/app/components/DashboardFeed.tsx',
  'src/app/components/MapSection.tsx',
];

filesToCheck.forEach(file => {
  const fullPath = path.join(__dirname, file);
  if (fs.existsSync(fullPath)) {
    checkFile(fullPath);
  }
});

// Reportar errores
if (errors.length > 0) {
  console.log('⚠️ Errores encontrados:\n');
  errors.forEach(err => {
    console.log(`${err.file}:${err.line} - ${err.type}`);
    console.log(`  ${err.message}\n`);
  });
  process.exit(1);
} else {
  console.log('✅ No se encontraron errores comunes');
  process.exit(0);
}
