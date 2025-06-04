// context/AuthContext.js
'use client';

import { createContext, useState, useEffect, useContext } from 'react';
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
    console.log('AuthContext: Carregando do localStorage...'); // DEBUG
    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        console.log('AuthContext: Usuário do localStorage:', parsedUser); // DEBUG
        setToken(storedToken);
        setUser(parsedUser);
      } catch (e) {
        console.error('AuthContext: Erro ao parsear usuário do localStorage', e);
        localStorage.removeItem('user'); // Limpa usuário inválido
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  // const login = async (email, password) => {
  //   // ... (função login que já existe, sem alterações)
  //   const response = await fetch('/api/users/login', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ email, password }),
  //   });
  //   const data = await response.json();
  //   if (response.ok) {
  //     localStorage.setItem('token', data.token);
  //     localStorage.setItem('user', JSON.stringify(data.user));
  //     setToken(data.token);
  //     setUser(data.user);
  //     router.push('/');
  //     return data; // Retorna a mensagem de sucesso
  //   } else {
  //     throw new Error(data.message || 'Falha no login');
  //   }
  // };

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
      router.push('/');
      console.log('AuthContext: Login bem-sucedido, usuário definido:', data.user); // DEBUG
      // A lógica de redirecionamento após o login está na página de login
      return data; // Retorna a mensagem de sucesso
    } else {
      throw new Error(data.message || 'Falha no login');
    }
  };

  // --- ADICIONE ESTA NOVA FUNÇÃO ---
  const register = async (name, email, password) => {
    const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
        // Se a API retornar um erro (ex: email já existe), ele será lançado aqui
        throw new Error(data.message || 'Falha ao registrar.');
    }

    return data; // Retorna a mensagem de sucesso
  };
  // --- FIM DA NOVA FUNÇÃO ---
  
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  // Adicione um log para quando o valor do contexto muda
  console.log('AuthContext Value:', { user, token, loading, isAuthenticated: !!token }); // DEBUG


  // Adicione a função `register` ao objeto `value`
  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
  
}

export const useAuth = () => useContext(AuthContext);