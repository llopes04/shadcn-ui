import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Client, Generator } from '@/types';
import GeneratorForm from '@/components/GeneratorForm';
import { clientService } from '@/services/firebaseService';
import { useToast } from '@/hooks/use-toast';

export default function ClientEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [clients, setClients] = useLocalStorage<Client[]>('clients', []);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    nome: '',
    endereco: '',
    telefone: '',
    email: '',
    cidade: '',
    estado: ''
  });
  const [geradores, setGeradores] = useState<Generator[]>([]);
  const [showGeneratorForm, setShowGeneratorForm] = useState(false);
  const [editingGenerator, setEditingGenerator] = useState<Generator | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncErrors, setSyncErrors] = useState<string[]>([]);

  useEffect(() => {
    if (id) {
      const client = clients.find(c => c.id === id);
      if (client) {
        setFormData({
          nome: client.nome || '',
          endereco: client.endereco || '',
          telefone: client.telefone || '',
          email: client.email || '',
          cidade: client.cidade || '',
          estado: client.estado || ''
        });
        setGeradores(client.geradores || []);
      }
    }
  }, [id]); // Remover 'clients' para evitar recarregamento desnecessário

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Validar se já existe outro cliente com o mesmo nome (exceto o atual)
      const clienteExistente = clients.find(c => 
        c.id !== id && c.nome.toLowerCase().trim() === formData.nome.toLowerCase().trim()
      );
      
      if (clienteExistente) {
        alert('Já existe outro cliente cadastrado com este nome. Por favor, use um nome diferente.');
        setIsSubmitting(false);
        return;
      }

      // Gerar novo ID baseado no nome se o nome foi alterado
      const clienteAtual = clients.find(c => c.id === id);
      let clientId = id!;
      
      if (clienteAtual && clienteAtual.nome.toLowerCase().trim() !== formData.nome.toLowerCase().trim()) {
        // Nome foi alterado, gerar novo ID
        clientId = formData.nome.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      }

      const updatedClient: Client = {
        id: clientId,
        ...formData,
        geradores
      };

      console.log('Atualizando cliente:', updatedClient);

      // Se o ID mudou, precisamos atualizar as referências nas ordens de serviço
      if (clientId !== id) {
        const serviceOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]');
        const updatedOrders = serviceOrders.map((order: any) => 
          order.cliente_id === id ? { ...order, cliente_id: clientId } : order
        );
        localStorage.setItem('serviceOrders', JSON.stringify(updatedOrders));
      }

      // Marcar timestamp da edição para evitar sobrescrita
      localStorage.setItem('lastClientEdit', Date.now().toString());
      
      // Atualizar no localStorage primeiro
      const updatedClients = clientId !== id 
        ? clients.map(c => c.id === id ? updatedClient : c).filter(c => c.id !== id).concat([updatedClient])
        : clients.map(c => c.id === id ? updatedClient : c);
      
      // Aguardar a atualização do localStorage
      setClients(updatedClients);
      
      // Aguardar um pequeno delay para garantir que o localStorage seja atualizado
      await new Promise(resolve => setTimeout(resolve, 100));

      // Se é um cliente do Firebase, atualizar no Firebase também
      if (id && id.startsWith('firebase_')) {
        try {
          const remoteId = id.replace(/^firebase_/, '');
          const { id: _localId, ...clientData } = updatedClient;
          
          await clientService.update(remoteId, clientData);
          
          toast({
            title: "Sucesso",
            description: "Cliente atualizado com sucesso!",
            variant: "default",
          });
        } catch (firebaseError) {
          console.error('Erro ao atualizar no Firebase:', firebaseError);
          const errorMessage = (firebaseError as Error).message;
          toast({
            title: "Erro de Sincronização",
            description: `Cliente atualizado localmente, mas houve erro ao sincronizar com Firebase: ${errorMessage}`,
            variant: "destructive",
          });
          setSyncErrors(prev => [...prev, `Atualização do cliente: ${errorMessage}`]);
        }
      } else {
        toast({
          title: "Sucesso",
          description: "Cliente atualizado localmente!",
          variant: "default",
        });
      }

      // Aguardar mais um pouco antes de navegar
      await new Promise(resolve => setTimeout(resolve, 200));
      navigate('/clients');
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      alert('Erro ao atualizar cliente: ' + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Remover atualização automática para evitar conflitos
    // A atualização será feita apenas no handleSubmit
  };

  const handleAddGenerator = async (generator: Generator) => {
    let updatedGenerators: Generator[];
    
    if (editingGenerator) {
      updatedGenerators = geradores.map(g => g.id === generator.id ? generator : g);
      setEditingGenerator(null);
    } else {
      updatedGenerators = [...geradores, generator];
    }
    
    setGeradores(updatedGenerators);
    setShowGeneratorForm(false);
    
    // Atualizar no localStorage e aguardar
    if (id) {
      setClients(prev => prev.map(c => c.id === id ? { ...c, geradores: updatedGenerators } as Client : c));
      
      // Aguardar um pequeno delay para garantir que o localStorage seja atualizado
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Se é um cliente do Firebase, atualizar no Firebase também
      if (id.startsWith('firebase_')) {
        try {
          const remoteId = id.replace(/^firebase_/, '');
          await clientService.update(remoteId, {
            nome: formData.nome,
            endereco: formData.endereco,
            telefone: formData.telefone,
            email: formData.email,
            cidade: formData.cidade,
            estado: formData.estado,
            geradores: updatedGenerators
          });
          console.log('Gerador atualizado no Firebase com sucesso');
          toast({
            title: "Sucesso",
            description: editingGenerator ? "Gerador editado com sucesso!" : "Gerador adicionado com sucesso!",
            variant: "default",
          });
        } catch (firebaseError) {
           console.error('Erro ao atualizar gerador no Firebase:', firebaseError);
           const errorMessage = (firebaseError as Error).message;
           setSyncErrors(prev => [...prev, `Gerador: ${errorMessage}`]);
           if ((firebaseError as any).code === 'permission-denied') {
             toast({
               title: "Erro de Permissão",
               description: "As regras do Firebase estão bloqueando a sincronização de geradores.",
               variant: "destructive",
             });
           }
         }
      } else {
        // Cliente local - mostrar notificação de sucesso
        toast({
          title: "Sucesso",
          description: editingGenerator ? "Gerador editado com sucesso!" : "Gerador adicionado com sucesso!",
          variant: "default",
        });
      }
    }
  };

  const handleEditGenerator = (generator: Generator) => {
    setEditingGenerator(generator);
    setShowGeneratorForm(true);
  };

  const handleDeleteGenerator = async (generatorId: string) => {
    console.log('Iniciando exclusão do gerador:', generatorId, 'do cliente:', id);
    
    const updatedGenerators = geradores.filter(g => g.id !== generatorId);
    setGeradores(updatedGenerators);

    // Persistir imediatamente no localStorage para manter consistência
    if (id) {
      setClients(prev => prev.map(c => c.id === id ? { ...c, geradores: updatedGenerators } as Client : c));
      console.log('Gerador removido do localStorage');
    }

    // Se o cliente já estiver sincronizado com o Firebase, refletir a alteração também lá
    try {
      if (id && id.startsWith('firebase_')) {
        const remoteId = id.replace(/^firebase_/, '');
        console.log('Atualizando cliente no Firebase com ID:', remoteId);
        await clientService.update(remoteId, {
          nome: formData.nome,
          endereco: formData.endereco,
          telefone: formData.telefone,
          email: formData.email,
          cidade: formData.cidade,
          estado: formData.estado,
          geradores: updatedGenerators
        });
      }
    } catch (e) {
      console.error('Erro ao atualizar cliente no Firebase após excluir gerador:', e);
      const errorMessage = (e as Error).message;
      setSyncErrors(prev => [...prev, `Exclusão de gerador: ${errorMessage}`]);
      toast({
        title: "Erro ao Excluir Gerador",
        description: `Gerador removido localmente, mas houve erro na sincronização: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };

  const handleCancelGenerator = () => {
    setShowGeneratorForm(false);
    setEditingGenerator(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => navigate('/clients')} className="mr-4">
            ← Voltar
          </Button>
          <h1 className="text-2xl font-bold">Editar Cliente</h1>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Informações do Cliente</CardTitle>
            <CardDescription>Edite os dados do cliente</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome *</label>
                <Input
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  placeholder="Nome completo"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Endereço</label>
                <Input
                  value={formData.endereco}
                  onChange={(e) => handleInputChange('endereco', e.target.value)}
                  placeholder="Endereço completo"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cidade</label>
                  <Input
                    value={formData.cidade}
                    onChange={(e) => handleInputChange('cidade', e.target.value)}
                    placeholder="Cidade"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Estado</label>
                  <Input
                    value={formData.estado}
                    onChange={(e) => handleInputChange('estado', e.target.value)}
                    placeholder="Estado"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Telefone</label>
                <Input
                  value={formData.telefone}
                  onChange={(e) => handleInputChange('telefone', e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Principal</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Secundário (Opcional)</label>
                  <Input
                    type="email"
                    value={formData.email2 || ''}
                    onChange={(e) => handleInputChange('email2', e.target.value)}
                    placeholder="email2@exemplo.com"
                  />
                </div>
              </div>

              <div className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Geradores</h3>
                  <Button 
                    type="button" 
                    onClick={(e) => {
                      e.preventDefault();
                      setShowGeneratorForm(true);
                    }}
                    variant="outline"
                  >
                    + Adicionar Gerador
                  </Button>
                </div>

                {geradores.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    Nenhum gerador adicionado
                  </p>
                ) : (
                  <div className="space-y-3">
                    {geradores.map((gerador) => (
                      <div key={gerador.id} className="border rounded-lg p-4 bg-white">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium">{gerador.motor || 'Motor'} / {gerador.gerador || 'Gerador'}</h4>
                            <p className="text-sm text-gray-600">
                              Modelo Motor: {gerador.modelo_motor || 'N/A'}
                            </p>
                            <p className="text-sm text-gray-600">
                              Nº Série Motor: {gerador.serie_motor || 'N/A'}
                            </p>
                            <p className="text-sm text-gray-600">
                              Modelo Gerador: {gerador.modelo_gerador || 'N/A'}
                            </p>
                            <p className="text-sm text-gray-600">
                              Nº Série Gerador: {gerador.serie_gerador || 'N/A'}
                            </p>
                            <p className="text-sm text-gray-600">
                              USCA: {gerador.usca || 'N/A'}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                handleEditGenerator(gerador);
                              }}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                handleDeleteGenerator(gerador.id);
                              }}
                            >
                              Excluir
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/clients')}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {showGeneratorForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-2xl">
              <GeneratorForm
                generator={editingGenerator || undefined}
                onSubmit={handleAddGenerator}
                onCancel={handleCancelGenerator}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
