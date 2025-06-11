// generate-swagger.js
const swaggerJSDoc = require('swagger-jsdoc');
const fs = require('fs');
const path = require('path');

// Configurações do Swagger
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Sorteio Ativo',
      version: '1.0.0',
      description: 'Documentação da API do Sorteio Ativo',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./app/api/**/*.js'], // Altere para o caminho onde estão os comentários @swagger
};

const swaggerSpec = swaggerJSDoc(options);

// Salvar como swagger.json na pasta public
const outputPath = path.join(__dirname, 'public', 'swagger.json');
fs.writeFileSync(outputPath, JSON.stringify(swaggerSpec, null, 2));

console.log('✅ swagger.json gerado com sucesso em /public/swagger.json');
