import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Client } from '@/types';
import { clientService } from '@/services/firebaseService';

export default function Clients() {
  const navigate = useNavigate();
  const [clients, setClients] = useLocalStorage<Client[]>('clients', []);
  const [currentUser] = useLocalStorage('currentUser', null);

  // Carregar dados do Firebase quando o componente for montado
  useEffect(() => {
    const loadFirebaseData = async () => {
      console.log('Clients: Tentando carregar dados do Firebase...');
      console.log('Clients: currentUser:', currentUser);
      
      try {
        // Carregar clientes do Firebase
        const firebaseClients = await clientService.getAll();
        console.log('Clients: Clientes carregados do Firebase:', firebaseClients.length);
        
        if (firebaseClients.length > 0) {
          setClients(firebaseClients);
          console.log('Clients: Clientes definidos no estado');
        } else {
          console.log('Clients: Nenhum cliente encontrado no Firebase');
        }
      } catch (error) {
        console.error('Clients: Erro ao carregar clientes do Firebase:', error);
      }
    };

    loadFirebaseData();
  }, [setClients]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
      try {
        console.log('Iniciando exclusão do cliente:', id);
        
        if (id.startsWith('firebase_')) {
          const remoteId = id.replace(/^firebase_/, '');
          console.log('Excluindo do Firebase com ID:', remoteId);
          await clientService.delete(remoteId);
          console.log('Cliente excluído do Firebase com sucesso');
        }
        
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
                        <p className="text-sm text-blue-600 font-medium mt-2">
                          📊 {client.geradores?.length || 0} gerador(es) cadastrado(s)
                        </p>
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