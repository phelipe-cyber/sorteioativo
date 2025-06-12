// app/forgot-password/page.jsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import Spinner from '@/components/Spinner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/users/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      setMessage(data.message);
    } catch (error) {
      setMessage('Ocorreu um erro. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">Esqueceu a sua senha?</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sem problemas. Digite o seu e-mail e enviaremos um link para redefinir a sua senha.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="sr-only">Endereço de e-mail</label>
            <input
              id="email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              autoComplete="email" required disabled={isLoading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Endereço de e-mail"
            />
          </div>
          {message && <p className="text-center text-sm text-green-600 bg-green-50 p-3 rounded-lg">{message}</p>}
          <div>
            <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
              {isLoading ? <Spinner className="h-5 w-5"/> : 'Enviar Link de Redefinição'}
            </button>
          </div>
        </form>
         <div className="text-center text-sm">
            <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                Lembrou-se da senha? Voltar para o login
            </Link>
        </div>
      </div>
    </div>
  );
}