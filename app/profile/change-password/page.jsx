// app/profile/change-password/page.jsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Spinner from '@/components/Spinner';

// Ícones
const IconArrowLeft = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
    </svg>
);
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

export default function ChangePasswordPage() {
    const { token, logout, user, isAuthenticated, loading: authLoading } = useAuth();
    const router = useRouter();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    // --- NOVO ESTADO PARA O CAMPO DE CONFIRMAÇÃO ---
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        // Redireciona se não estiver logado
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');

        if (newPassword !== confirmPassword) {
            setError('A nova senha e a confirmação não coincidem.');
            return;
        }
        if (newPassword.length < 6) {
            setError('A nova senha deve ter pelo menos 6 caracteres.');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('/api/users/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Falha ao alterar a senha.');
            }
            
            setSuccessMessage(data.message + ' Por favor, faça login novamente com a sua nova senha.');
            
            // Forçar logout após sucesso para que o utilizador precise logar novamente
            setTimeout(() => {
                logout(); // A função logout já redireciona para /login
            }, 3000);

        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };
    
    if (authLoading || !isAuthenticated) {
        return <div className="flex justify-center items-center h-screen"><Spinner size="h-10 w-10 text-indigo-600"/></div>
    }

    return (
        <div className="w-full flex flex-col items-center justify-start pt-8 md:pt-12">
            <div className="bg-white p-6 sm:p-10 rounded-xl shadow-2xl max-w-lg w-full">
                <div className="mb-6">
                    <Link href="/" className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium group">
                        <IconArrowLeft />
                        <span className="group-hover:underline ml-1.5">Voltar para a Página Principal</span>
                    </Link>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-8">
                    Alterar Senha
                </h1>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1.5">Senha Atual</label>
                        <div className="relative">
                            <input type={showCurrentPassword ? 'text' : 'password'} id="currentPassword" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required disabled={isLoading || !!successMessage} className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg shadow-sm" placeholder="A sua senha atual"/>
                             <button type="button" onClick={() => setShowCurrentPassword(p => !p)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-indigo-600 focus:outline-none">
                                {showCurrentPassword ? <IconEyeOff /> : <IconEye />}
                            </button>
                        </div>
                    </div>
                     <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1.5">Nova Senha</label>
                         <div className="relative">
                            <input type={showNewPassword ? 'text' : 'password'} id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} disabled={isLoading || !!successMessage} className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg shadow-sm" placeholder="Mínimo 6 caracteres"/>
                             <button type="button" onClick={() => setShowNewPassword(p => !p)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-indigo-600 focus:outline-none">
                                {showNewPassword ? <IconEyeOff /> : <IconEye />}
                            </button>
                        </div>
                    </div>
                     <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">Confirmar Nova Senha</label>
                        <div className="relative">
                            <input 
                                type={showConfirmPassword ? 'text' : 'password'} 
                                id="confirmPassword" 
                                value={confirmPassword} 
                                onChange={(e) => setConfirmPassword(e.target.value)} 
                                required 
                                minLength={6} 
                                disabled={isLoading || !!successMessage} 
                                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg shadow-sm" 
                                placeholder="Confirme a nova senha"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-indigo-600 focus:outline-none"
                                aria-label={showConfirmPassword ? "Esconder senha" : "Mostrar senha"}
                                disabled={isLoading || !!successMessage}
                            >
                                {showConfirmPassword ? <IconEyeOff /> : <IconEye />}
                            </button>
                        </div>
                    </div>

                    {error && <p className="text-red-600 text-center text-sm p-3 bg-red-50 rounded-lg border border-red-200">{error}</p>}
                    {successMessage && <p className="text-green-600 text-center text-sm p-3 bg-green-50 rounded-lg border border-green-200">{successMessage}</p>}
                    
                    <button type="submit" disabled={isLoading || !!successMessage} className="w-full flex justify-center py-3 px-4 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
                        {isLoading ? <><Spinner className="h-5 w-5 mr-2"/> A alterar...</> : 'Alterar Senha'}
                    </button>
                </form>
            </div>
        </div>
    );
}
