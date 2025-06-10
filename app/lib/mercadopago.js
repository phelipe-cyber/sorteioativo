// lib/mercadopago.js
import { MercadoPagoConfig } from 'mercadopago';

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
  options: {
    timeout: 5000, // Opcional: tempo limite para as requisições em milissegundos
    // idempotencyKey: 'SUA_CHAVE_DE_IDEMPOTENCIA_OPCIONAL' // Opcional
  }
});

export default client; // Exportamos a instância do cliente configurado