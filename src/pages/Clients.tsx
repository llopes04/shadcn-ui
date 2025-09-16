import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Client } from '@/types';
import { clientService } from '@/services/firebaseService';

export default function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useLocalStorage<Client[]>('clients', []);
  const [currentUser] = useLocalStorage('currentUser', null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Carregar dados do localStorage sempre que o componente for montado
  useEffect(() => {
    setIsLoading(false);
  }, []);

  // Sincronizar com Firebase em segundo plano (apenas na montagem inicial)
  useEffect(() => {
    const syncWithFirebase = async () => {
      try {
        const firebaseClients = await clientService.getAll();
        if (firebaseClients.length === 0) return;

        // 1) Ler clientes locais atuais
        const currentClients: Client[] = JSON.parse(localStorage.getItem('clients') || '[]');

        // 2) Normalizar IDs vindos do Firebase para usar o prefixo 'firebase_'
        const normalizedFirebase = firebaseClients.map(fc => ({
          ...fc,
          id: `firebase_${fc.id}`
        } as Client));

        // 3) Corrigir clientes locais que tenham IDs não prefixados mas existentes no Firebase
        const remoteIds = new Set(firebaseClients.map(fc => fc.id));
        const currentNormalized: Client[] = currentClients.map(c => {
          if (!c.id.startsWith('firebase_') && remoteIds.has(c.id)) {
            return { ...c, id: `firebase_${c.id}` } as Client;
          }
          return c;
        });

        // 4) Mesclar: manter preferência pelo dado LOCAL quando existir
        const byId = new Map<string, Client>();
        currentNormalized.forEach(c => byId.set(c.id, c));

        normalizedFirebase.forEach(fc => {
          const local = byId.get(fc.id);
          if (!local) {
            // Não existe localmente, adiciona do Firebase
            byId.set(fc.id, fc);
          } else {
            // Existe localmente: preferir local e preencher campos faltantes do Firebase
            const merged = { ...fc, ...local } as Client; // local sobrescreve fc
            byId.set(fc.id, merged);
          }
        });

        // 5) Garantir que clientes apenas locais (sem relação com Firebase) permaneçam
        // (já garantido pois começamos pelo currentNormalized)

        const result = Array.from(byId.values());

        // Atualizar somente se houver diferença real
        const prevJson = JSON.stringify(currentClients);
        const nextJson = JSON.stringify(result);
        if (prevJson !== nextJson) {
          setClients(result);
        }
      } catch (error) {
        console.error('Erro ao sincronizar com Firebase:', error);
      }
    };

    const timer = setTimeout(syncWithFirebase, 1000);
    return () => clearTimeout(timer);
   }, []);

   // Listener para recarregar dados quando a página ganha foco
   useEffect(() => {
     const handleFocus = () => {
       setRefreshTrigger(prev => prev + 1);
     };

     window.addEventListener('focus', handleFocus);

     return () => {
       window.removeEventListener('focus', handleFocus);
     };
   }, []);

   // Recarregar dados quando refreshTrigger mudar (com proteção contra sobrescrita)
   useEffect(() => {
     if (refreshTrigger > 0) {
       const lastEdit = localStorage.getItem('lastClientEdit');
       const now = Date.now();
       
       // Só recarregar se não houve edição recente (últimos 5 segundos)
       if (!lastEdit || (now - parseInt(lastEdit)) > 5000) {
         const storedClients = localStorage.getItem('clients');
         if (storedClients) {
           try {
             const parsedClients = JSON.parse(storedClients);
             setClients(parsedClients);
           } catch (error) {
             console.error('Erro ao recarregar dados:', error);
           }
         }
       }
     }
   }, [refreshTrigger]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
      try {
        console.log('Iniciando exclusão do cliente:', id);
        
        // Se é um cliente do Firebase, excluir do Firebase também
        if (id.startsWith('firebase_')) {
          const remoteId = id.replace(/^firebase_/, '');
          console.log('Excluindo do Firebase com ID:', remoteId);
          await clientService.delete(remoteId);
          console.log('Cliente excluído do Firebase com sucesso');
        }
        
        // Remover do localStorage
        setClients(clients.filter(client => client.id !== id));
        console.log('Cliente removido do localStorage');
        alert('Cliente excluído com sucesso!');
      } catch (e: unknown) {
        console.error('Erro detalhado ao excluir cliente:', e);
        const errorMessage = e instanceof Error ? e.message : 'Erro desconhecido';
        alert(`Falha ao excluir no Firebase: ${errorMessage}`);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando clientes...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Clientes</h1>
          <Button onClick={() => navigate('/clients/new')}>
            Novo Cliente
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Clientes</CardTitle>
            <CardDescription>
              {clients.length} cliente(s) cadastrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {clients.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>Nenhum cliente cadastrado</p>
                <Button 
                  onClick={() => navigate('/clients/new')}
                  className="mt-4"
                >
                  Cadastrar Primeiro Cliente
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {clients.map((client) => (
                  <div key={client.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{client.nome}</h3>
                        {client.telefone && (
                          <p className="text-gray-600">📞 {client.telefone}</p>
                        )}
                        {client.email && (
                          <p className="text-gray-600">📧 {client.email}</p>
                        )}
                        {client.endereco && (
                          <p className="text-gray-600 text-sm">📍 {client.endereco}</p>
                        )}
                        {(client.cidade || client.estado) && (
                          <p className="text-gray-600 text-sm">
                            🏙️ {[client.cidade, client.estado].filter(Boolean).join(', ')}
                          </p>
                        )}
                        <p className="text-sm text-blue-600 font-medium mt-2">
                          📊 {client.geradores?.length || 0} gerador(es) cadastrado(s)
                        </p>
                        {client.id.startsWith('firebase_') && (
                          <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full mt-1">
                            Sincronizado
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/clients/edit/${client.id}`)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(client.id)}
                        >
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6">
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard')}
            className="w-full"
          >
            Voltar ao Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
