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

  // Carregar e sincronizar dados quando o componente for montado
  useEffect(() => {
    const loadAndSyncData = async () => {
      console.log('Clients: Iniciando carregamento de dados...');
      console.log('Clients: currentUser:', currentUser);
      console.log('Clients: Clientes locais atuais:', clients.length);
      
      try {
        // Sempre tentar carregar dados do Firebase para sincronizar
        console.log('Clients: Tentando carregar dados do Firebase...');
        const firebaseClients = await clientService.getAll();
        console.log('Clients: Clientes carregados do Firebase:', firebaseClients.length);
        
        if (firebaseClients.length > 0) {
          // Se há dados no Firebase, mesclar com dados locais
          const localClients = clients;
          const mergedClients = [...firebaseClients];
          
          // Adicionar clientes locais que não existem no Firebase
          localClients.forEach(localClient => {
            if (!localClient.id.startsWith('firebase_') && 
                !firebaseClients.find(fc => fc.nome.toLowerCase() === localClient.nome.toLowerCase())) {
              mergedClients.push(localClient);
              console.log('Clients: Cliente local adicionado à lista:', localClient.nome);
            }
          });
          
          setClients(mergedClients);
          console.log('Clients: Total de clientes após mesclagem:', mergedClients.length);
        } else {
          console.log('Clients: Nenhum cliente no Firebase, mantendo dados locais');
        }
      } catch (error) {
        console.error('Clients: Erro ao carregar clientes do Firebase:', error);
        console.log('Clients: Mantendo apenas dados locais devido ao erro');
      } finally {
        setIsLoading(false);
      }
    };

    loadAndSyncData();
  }, []); // Remover dependência de setClients para evitar loops

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
