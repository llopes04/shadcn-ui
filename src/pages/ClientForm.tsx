import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { Client, Generator } from '@/types';
import GeneratorForm from '@/components/GeneratorForm';
import { clientService } from '@/services/firebaseService';

export default function ClientForm() {
  const navigate = useNavigate();
  const [clients, setClients] = useLocalStorage<Client[]>('clients', []);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Validar se já existe um cliente com o mesmo nome
      const clienteExistente = clients.find(c => 
        c.nome.toLowerCase().trim() === formData.nome.toLowerCase().trim()
      );
      
      if (clienteExistente) {
        alert('Já existe um cliente cadastrado com este nome. Por favor, use um nome diferente.');
        setIsSubmitting(false);
        return;
      }

      // Gerar ID baseado no nome do cliente (normalizado)
      const clientId = formData.nome.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      
      const newClient: Client = {
        id: clientId,
        ...formData,
        geradores: [...geradores]
      };

      console.log('Salvando cliente:', newClient);

      // Salvar no localStorage primeiro (para garantir que funcione mesmo sem Firebase)
      const updatedClients = [...clients, newClient];
      setClients(updatedClients);

      // Tentar salvar no Firebase também
      try {
        console.log('Tentando salvar no Firebase...');
        const { id: _localId, ...clientData } = newClient;
        const firebaseId = await clientService.create(clientData);
        console.log('Cliente salvo no Firebase com ID:', firebaseId);

        // Atualizar o cliente local com o ID do Firebase
        const clientWithFirebaseId = { ...newClient, id: `firebase_${firebaseId}` };
        const updatedClientsWithFirebaseId = updatedClients.map(c => 
          c.id === newClient.id ? clientWithFirebaseId : c
        );
        setClients(updatedClientsWithFirebaseId);
        
        alert('Cliente salvo com sucesso!');
      } catch (firebaseError) {
        console.error('Erro ao salvar no Firebase:', firebaseError);
        alert('Cliente salvo localmente. Erro ao sincronizar com Firebase: ' + (firebaseError as Error).message);
      }

      navigate('/clients');
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      alert('Erro ao salvar cliente: ' + (error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddGenerator = (generator: Generator) => {
    if (editingGenerator) {
      setGeradores(prev => prev.map(g => g.id === generator.id ? generator : g));
      setEditingGenerator(null);
    } else {
      setGeradores(prev => [...prev, generator]);
    }
    setShowGeneratorForm(false);
  };

  const handleEditGenerator = (generator: Generator) => {
    setEditingGenerator(generator);
    setShowGeneratorForm(true);
  };

  const handleDeleteGenerator = (id: string) => {
    setGeradores(prev => prev.filter(g => g.id !== id));
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
          <h1 className="text-2xl font-bold">Novo Cliente</h1>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Informações do Cliente</CardTitle>
            <CardDescription>Preencha os dados do novo cliente</CardDescription>
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

              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="email@exemplo.com"
                />
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

              <div className="flex gap-3 pt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate('/clients')}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Cliente'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {showGeneratorForm && (
          <Card className="mb-6">
            <GeneratorForm
              generator={editingGenerator || undefined}
              onSubmit={handleAddGenerator}
              onCancel={handleCancelGenerator}
            />
          </Card>
        )}
      </div>
    </div>
  );
}
