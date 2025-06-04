// lib/adminAuthMiddleware.js
import { verifyAuth } from './authMiddleware'; // Reutilizamos nossa verificação principal
import { NextResponse } from 'next/server';

export async function verifyAdminAuth(request) {
  // Primeiro, verifica se o token é válido
  const authResult = await verifyAuth(request);
    console.table(authResult);
  if (!authResult.isAuthenticated) {
    return authResult; // Retorna o erro de não autenticado
  }

  // Se autenticado, verifica se a função é 'admin'
  if (authResult.payload.role !== 'admin') {
    return {
      isAuthenticated: false, // Tecnicamente autenticado, mas não autorizado
      error: new NextResponse('Acesso negado. Rota exclusiva para administradores.', { status: 403 }), // 403 Forbidden
    };
  }

  // Se for admin, retorna sucesso
  return authResult;
}