// app/admin/logs/page.jsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import Spinner from '../../../components/Spinner';

export default function AdminLogsPage() {
    const { token } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [filterUserId, setFilterUserId] = useState('');
    const [filterOrderId, setFilterOrderId] = useState('');
    
    const [debouncedUserId, setDebouncedUserId] = useState('');
    const [debouncedOrderId, setDebouncedOrderId] = useState('');

    const [hasSearched, setHasSearched] = useState(false);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedUserId(filterUserId);
        }, 500); 
        return () => clearTimeout(handler);
    }, [filterUserId]);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedOrderId(filterOrderId);
        }, 500);
        return () => clearTimeout(handler);
    }, [filterOrderId]);


    const fetchLogs = useCallback(async () => {
        if (!token || (!debouncedUserId && !debouncedOrderId)) {
            setLogs([]); 
            setHasSearched(false);
            return;
        };

        setHasSearched(true); 
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (debouncedUserId) params.append('userId', debouncedUserId);
            if (debouncedOrderId) params.append('orderId', debouncedOrderId);
            
            const response = await fetch(`/api/admin/logs?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Erro ao buscar logs.');
            }
            const data = await response.json();
            setLogs(data.logs || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [token, debouncedUserId, debouncedOrderId]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);


    const getLevelClass = (level) => {
        switch (level?.toUpperCase()) {
            case 'ERROR': return 'bg-red-100 text-red-800';
            case 'WARN': return 'bg-yellow-100 text-yellow-800';
            case 'INFO': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    
    const formatPayloadForDisplay = (payload) => {
        if (!payload) return null;
        try {
            const parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;
            return JSON.stringify(parsedPayload, null, 2);
        } catch (e) {
            return payload;
        }
    };

    const handleClearFilters = () => {
        setFilterUserId('');
        setFilterOrderId('');
    };


    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Logs do Sistema</h1>

            {/* --- Filtros --- */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 border rounded-lg bg-gray-50">
                <div className="flex-1">
                    <label htmlFor="userIdFilter" className="block text-sm font-medium text-gray-700">Filtrar por ID do Utilizador</label>
                    <input
                        type="number"
                        id="userIdFilter"
                        value={filterUserId}
                        onChange={(e) => setFilterUserId(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Digite o ID do utilizador..."
                    />
                </div>
                <div className="flex-1">
                    <label htmlFor="orderIdFilter" className="block text-sm font-medium text-gray-700">Filtrar por ID do Pedido</label>
                    <input
                        type="number"
                        id="orderIdFilter"
                        value={filterOrderId}
                        onChange={(e) => setFilterOrderId(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Digite o ID do pedido..."
                    />
                </div>
                {(filterUserId || filterOrderId) && (
                    <div className="flex items-end">
                         <button onClick={handleClearFilters} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium">Limpar Filtros</button>
                    </div>
                )}
            </div>
            
            {loading && (
                <div className="text-center py-8"><Spinner size="h-8 w-8" /> <p className="mt-2">A pesquisar...</p></div>
            )}

            {!loading && error && (
                <p className="text-center text-red-500 bg-red-100 p-4 rounded-md">Erro: {error}</p>
            )}

            {!loading && !error && !hasSearched && (
                 <div className="text-center text-gray-500 py-10 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-medium">Consultar Logs</h3>
                    <p className="mt-1 text-sm">Digite um ID de utilizador ou pedido para iniciar a pesquisa.</p>
                </div>
            )}
            
            {!loading && !error && hasSearched && logs.length === 0 && (
                <div className="text-center text-gray-500 py-10 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-medium">Nenhum log encontrado</h3>
                    <p className="mt-1 text-sm">Não há registos que correspondam aos filtros atuais.</p>
                </div>
            )}

            {!loading && logs.length > 0 && (
                <div className="space-y-4">
                    {logs.map(log => (
                        <div key={log.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <span className={`px-2.5 py-0.5 text-xs font-semibold rounded-full ${getLevelClass(log.level)}`}>
                                        {log.level}
                                    </span>
                                    <span className="ml-2 text-sm font-medium text-gray-700">[{log.context}]</span>
                                </div>
                                <span className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString('pt-BR')}</span>
                            </div>
                            <p className="mt-2 text-sm text-gray-800">{log.message}</p>
                            {log.user_id && (
                                <p className="text-xs text-gray-500 mt-1">
                                    Utilizador: {log.user_name || 'N/A'} (ID: {log.user_id})
                                </p>
                            )}
                            {log.order_id && (
                                <div className="mt-1">
                                    <p className="text-xs text-gray-500">
                                        Pedido: #{log.order_id}
                                    </p>
                                    {log.associatedNumbers && log.associatedNumbers.length > 0 && (
                                        <div className="mt-1 flex flex-wrap gap-1">
                                            <span className="text-xs text-gray-500">Números:</span>
                                            {log.associatedNumbers.map(num => (
                                                <span key={num} className="px-1.5 py-0.5 text-xs rounded bg-indigo-100 text-indigo-700 font-mono">
                                                    {String(num).padStart(3, '0')}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            {log.payload && (
                                <details className="mt-2">
                                    <summary className="text-xs text-gray-500 cursor-pointer hover:underline">Ver Payload</summary>
                                    <pre className="mt-1 bg-gray-100 p-3 rounded-md text-xs text-gray-800 overflow-x-auto">
                                        {formatPayloadForDisplay(log.payload)}
                                    </pre>
                                </details>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
