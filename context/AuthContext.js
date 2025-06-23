// context/AuthContext.js
'use client';

import { createContext, useState, useEffect, useContext, useCallback } from 'react'; // Adicionado useCallback
import { useRouter } from 'next/navigation';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const logout = useCallback(() => { // Envolvido em useCallback
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    router.push('/login');
  }, [router]);

  // --- NOVA FUNÇÃO authFetch ---
  // Este é um "wrapper" para a função fetch que adiciona o token
  // e trata automaticamente os erros 401 (token expirado/inválido).
  const authFetch = useCallback(async (url, options = {}) => {
    if (!token) {
        logout(); // Se não há token, desloga
        throw new Error('Utilizador não autenticado.');
    }

    // Adiciona o cabeçalho de autorização
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    const finalOptions = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    };

    const response = await fetch(url, finalOptions);

    // Se a resposta for 401 Unauthorized, o token expirou ou é inválido.
    if (response.status === 401) {
        console.log("AuthContext: Token expirado ou inválido. A deslogar utilizador.");
        logout();
        // Lança um erro para interromper a execução do código que fez a chamada
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
    }

    return response;
  }, [token, logout]);

  const login = async (email, password) => {
    const response = await fetch('/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (response.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    } else {
      throw new Error(data.message || 'Falha no login');
    }
  };
  
  const register = async (name, email, password, phone) => {
    const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, phone }),
    });
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.message || 'Falha ao registar.');
    }
    return data;
  };
  
  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading, isAuthenticated: !!token, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
