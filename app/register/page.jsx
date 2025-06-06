// app/register/page.jsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext'; // Ajuste o caminho se necessário
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Spinner from '@/components/Spinner'; // Ajuste o caminho se necessário

// Ícones para visualização de senha (copiados da página de admin)
const IconEye = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
        <circle cx="12" cy="12" r="3"></circle>
    </svg>
);

const IconEyeOff = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path>
        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path>
        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path>
        <line x1="2" y1="2" x2="22" y2="22"></line>
    </svg>
);

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Estado para visibilidade da senha
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { register } = useAuth(); // Pegar a função register do contexto
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    if (!name.trim() || !email.trim() || !password.trim()) {
        setError('Nome, email e senha são obrigatórios.');
        setIsLoading(false);
        return;
    }
    if (password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres.');
        setIsLoading(false);
        return;
    }

    try {
      await register(name, email, password); // Chamar a função register do AuthContext
      setSuccess('Registro realizado com sucesso! Você será redirecionado para o login.');
      setName('');
      setEmail('');
      setPassword('');
      setShowPassword(false);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Ocorreu um erro desconhecido durante o registro.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className=" flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="bg-white p-6 sm:p-10 rounded-xl shadow-2xl max-w-md w-full">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-8">
          Criar Nova Conta
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">Nome Completo <span className="text-red-500">*</span></label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              required
              disabled={isLoading}
              placeholder="Seu nome completo"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email <span className="text-red-500">*</span></label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              required
              disabled={isLoading}
              placeholder="seuemail@example.com"
            />
          </div>

          {/* Campo de Senha com Botão de Visualização */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">Senha <span className="text-red-500">*</span></label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'} // Alterna o tipo do input
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                required
                minLength={6}
                disabled={isLoading}
                placeholder="Mínimo 6 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-indigo-600 focus:outline-none"
                aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                disabled={isLoading}
              >
                {showPassword ? <IconEyeOff /> : <IconEye />}
              </button>
            </div>
          </div>
          
          {error && <p className="text-red-600 text-center text-sm p-3 bg-red-50 rounded-lg border border-red-200">{error}</p>}
          {success && <p className="text-green-600 text-center text-sm p-3 bg-green-50 rounded-lg border border-green-200">{success}</p>}

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white font-semibold py-3.5 px-5 rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-150 ease-in-out disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center text-base"
            disabled={isLoading || !!success} // Desabilita também se houver mensagem de sucesso
          >
            {isLoading ? (
              <>
                <Spinner size="h-5 w-5" />
                <span className="ml-2">Registrando...</span>
              </>
            ) : (
              'Criar Conta'
            )}
          </button>
        </form>
        <p className="text-center mt-6 text-sm">
          Já tem uma conta? 
          <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500 hover:underline ml-1">
            Faça o login
          </Link>
        </p>
      </div>
    </div>
  );
}
