// app/api/users/forgot-password/route.js
import { NextResponse } from 'next/server';
import { query, dbPool } from '@/app/lib/db';
import { sendPasswordResetEmail } from '@/app/lib/mailer'; // Precisaremos adicionar esta função ao 

import crypto from 'crypto';

export async function POST(request) {
  let connection;
  try {
    const { email } = await request.json();
    if (!email) {
      return new NextResponse(JSON.stringify({ message: 'O e-mail é obrigatório.' }), { status: 400 });
    }

    const [user] = await query({
      query: "SELECT id, name FROM users WHERE email = ?",
      values: [email],
    });

    if (!user) {
      // Por segurança, não informamos que o e-mail não existe.
      console.log(`Tentativa de redefinição para e-mail não existente: ${email}`);
      return NextResponse.json({ message: 'Se um utilizador com este e-mail existir, um link de redefinição foi enviado.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const tokenExpiry = new Date(Date.now() + 300000); // 30 minuots de validade

    connection = await dbPool.getConnection();
    await connection.execute(
      "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
      [user.id, tokenHash, tokenExpiry]
    );

    // O link enviado no e-mail conterá o token original, não o hash.
    const resetUrl = `${process.env.APP_URL}/reset-password/${resetToken}`;
    
    await sendPasswordResetEmail({
        userEmail: email,
        userName: user.name,
        resetUrl: resetUrl,
    });

    return NextResponse.json({ message: 'Se um utilizador com este e-mail existir, um link de redefinição foi enviado.' });

  } catch (error) {
    console.error("Erro na API forgot-password:", error);
    return new NextResponse(JSON.stringify({ message: 'Erro interno do servidor.' }), { status: 500 });
  } finally {
      if(connection) connection.release();
  }
}

