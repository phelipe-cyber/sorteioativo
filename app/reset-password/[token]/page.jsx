// app/reset-password/[token]/page.jsx
'use client';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Spinner from '@/components/Spinner';

// Ícones para visualização de senha
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


export default function ResetPasswordPage() {
    const params = useParams();
    const router = useRouter();
    const token = params.token;

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }
        setIsLoading(true);

        try {
            const response = await fetch('/api/users/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password, confirmPassword })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Erro ao redefinir a senha.');
            setSuccess(data.message + ' Você será redirecionado para o login em breve.');
            setTimeout(() => router.push('/login'), 3000);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="min-h-screen flex items-center justify-center py-12 px-4">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
                <div>
                    <h2 className="text-center text-3xl font-extrabold text-gray-900">Redefinir a sua Senha</h2>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <input type="hidden" name="token" value={token || ''} />
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">Nova Senha</label>
                        <div className="relative">
                            <input 
                                id="password" 
                                name="password" 
                                type={showPassword ? 'text' : 'password'}
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                required disabled={isLoading || !!success} 
                                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                                placeholder="Nova Senha"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-indigo-600 focus:outline-none"
                                aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                                disabled={isLoading || !!success}
                            >
                                {showPassword ? <IconEyeOff /> : <IconEye />}
                            </button>
                        </div>
                    </div>
                     <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">Confirmar Nova Senha</label>
                         <div className="relative">
                            <input 
                                id="confirmPassword" 
                                name="confirmPassword" 
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword} 
                                onChange={(e) => setConfirmPassword(e.target.value)} 
                                required disabled={isLoading || !!success} 
                                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                                placeholder="Confirme a Nova Senha"
                            />
                             <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-indigo-600 focus:outline-none"
                                aria-label={showConfirmPassword ? "Esconder senha" : "Mostrar senha"}
                                disabled={isLoading || !!success}
                            >
                                {showConfirmPassword ? <IconEyeOff /> : <IconEye />}
                            </button>
                        </div>
                    </div>
                    {error && <p className="text-red-600 text-center text-sm p-3 bg-red-50 rounded-lg border border-red-200">{error}</p>}
                    {success && <p className="text-green-600 text-center text-sm p-3 bg-green-50 rounded-lg border border-green-200">{success}</p>}
                    <div>
                        <button type="submit" disabled={isLoading || !!success} className="w-full flex justify-center py-3 px-4 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
                            {isLoading ? <Spinner className="h-5 w-5"/> : 'Redefinir Senha'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
