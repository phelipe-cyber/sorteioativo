// lib/authMiddleware.js
import { jwtVerify } from 'jose';
import { NextResponse } from 'next/server';

const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET não está definido nas variáveis de ambiente');
  }
  return new TextEncoder().encode(secret);
};

export async function verifyAuth(request) {
  const token = request.headers.get('authorization')?.split(' ')[1];

  if (!token) {
    return {
      isAuthenticated: false,
      error: new NextResponse('Token de autorização não fornecido', { status: 401 }),
    };
  }

  try {
    const verified = await jwtVerify(token, getJwtSecretKey());
    // console.log('MIDDLEWARE verifyAuth: Token verificado COM SUCESSO. Payload:', verified.payload); // <-- ADICIONE ESTE LOG
    return {
      isAuthenticated: true,
      payload: verified.payload,
    };
  } catch (err) {
    console.error('MIDDLEWARE verifyAuth: FALHA na verificação do token.', err.code, err.message); // <-- ADICIONE ESTE LOG
    return {
      isAuthenticated: false,
      error: new NextResponse('Token inválido ou expirado', { status: 401 }),
    };
  }
}