const { createSwaggerSpec } = require('next-swagger-doc');
const fs = require('fs');

const spec = createSwaggerSpec({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Site de Sorteio',
      description: 'Documentação completa da API para o site de sorteios.',
      version: '1.0.0',
    },
  },
  // Caminho para os arquivos de API
  apiFolder: './src/app/api/',
});

// Escreve o arquivo swagger.json na pasta public
fs.writeFileSync('./public/swagger.json', JSON.stringify(spec, null, 2));

console.log('Swagger spec gerado em ./public/swagger.json');


