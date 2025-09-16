import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { ServiceOrder, Client, Generator, GeneratorData, Verification } from '@/types';
import { Trash2, Plus, Copy } from 'lucide-react';
import { serviceOrderService } from '@/services/firebaseService';
import { isFirebaseConfigured } from '@/lib/firebase';

interface MultiOSFormProps {
  client: Client;
  onSave?: (order: ServiceOrder) => void;
  onCancel?: () => void;
  clients?: Client[];
  currentUser?: { nome: string } | null;
}

const VERIFICATION_ITEMS = [
  'Tanque de combustivel',
  'Estado do tanque',
  'Motor de partida',
  'Nível de água',
  'Mangueiras e Tubulações',
  'Verificação de vazamentos',
  'Verificação de correias',
  'Nível de óleo lubrificante',
  'Ruídos estranhos no motor',
  'Teste de carga 5min',
  'QTA',
  'Cabos de força/comandos',
  'Conexões e contatos elétricos',
  'Pré aquecimento',
  'Solenoide',
  'Cabos e polos da bateria',
  'Bateria'
];

export default function MultiOSForm({ client, onSave, onCancel, clients, currentUser }: MultiOSFormProps) {
  const navigate = useNavigate();
  const [serviceOrders, setServiceOrders] = useLocalStorage<ServiceOrder[]>('serviceOrders', []);
  const [storedCurrentUser] = useLocalStorage('currentUser', null);

  // Use props or fallback to stored values
  const user = currentUser || storedCurrentUser;

  // Estados do formulário
  const [tecnico, setTecnico] = useState(user?.nome || '');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [observacoesGerais, setObservacoesGerais] = useState('');
  const [representante, setRepresentante] = useState('');

  // Estados para geradores selecionados
  const [selectedGenerators, setSelectedGenerators] = useState<GeneratorData[]>([]);

  // Função para adicionar um gerador
  const addGenerator = () => {
    if (client.geradores.length === 0) {
      alert('Este cliente não possui geradores cadastrados');
      return;
    }

    const newGeneratorData: GeneratorData = {
      gerador_id: '',
      tipo_manutencao: 'Preventiva',
      verificacoes: VERIFICATION_ITEMS.map(item => ({
        item,
        status: 'OK' as const,
        observacao: ''
      })),
      observacoes: ''
    };

    setSelectedGenerators([...selectedGenerators, newGeneratorData]);
  };

  // Função para remover um gerador
  const removeGenerator = (index: number) => {
    const updated = selectedGenerators.filter((_, i) => i !== index);
    setSelectedGenerators(updated);
  };

  // Função para duplicar um gerador
  const duplicateGenerator = (index: number) => {
    const original = selectedGenerators[index];
    const duplicate: GeneratorData = {
      ...original,
      gerador_id: '', // Reset generator selection
      verificacoes: original.verificacoes.map(v => ({ ...v })) // Deep copy verificações
    };
    
    const updated = [...selectedGenerators];
    updated.splice(index + 1, 0, duplicate);
    setSelectedGenerators(updated);
  };

  // Função para atualizar dados de um gerador específico
  const updateGeneratorData = (index: number, field: keyof GeneratorData, value: string | GeneratorData['tipo_manutencao']) => {
    const updated = [...selectedGenerators];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedGenerators(updated);
  };

  // Função para atualizar verificação específica
  const updateVerification = (generatorIndex: number, verificationIndex: number, field: keyof Verification, value: string | Verification['status']) => {
    const updated = [...selectedGenerators];
    updated[generatorIndex].verificacoes[verificationIndex] = {
      ...updated[generatorIndex].verificacoes[verificationIndex],
      [field]: value
    };
    setSelectedGenerators(updated);
  };

  // Função para obter nome do gerador
  const getGeneratorName = (generatorId: string) => {
    const generator = client.geradores.find(g => g.id === generatorId);
    return generator ? `${generator.gerador} - ${generator.modelo_gerador}` : 'Selecione um gerador';
  };

  // Função para salvar a OS
  const handleSave = async () => {
    if (!tecnico.trim()) {
      alert('Por favor, informe o técnico responsável');
      return;
    }

    if (selectedGenerators.length === 0) {
      alert('Por favor, adicione pelo menos um gerador');
      return;
    }

    // Validar se todos os geradores têm ID selecionado
    const invalidGenerators = selectedGenerators.filter(g => !g.gerador_id);
    if (invalidGenerators.length > 0) {
      alert('Por favor, selecione um gerador para todos os itens da lista');
      return;
    }

    // Verificar se há geradores duplicados
    const generatorIds = selectedGenerators.map(g => g.gerador_id);
    const uniqueIds = new Set(generatorIds);
    if (uniqueIds.size !== generatorIds.length) {
      alert('Não é possível selecionar o mesmo gerador mais de uma vez');
      return;
    }

    const newOrder: ServiceOrder = {
      id: Date.now().toString(),
      tecnico: tecnico.trim(),
      data,
      cliente_id: client.id.replace(/^firebase_/, ''), // Remove prefixo firebase_ do ID
      geradores: selectedGenerators,
      ...(observacoesGerais.trim() && { observacoes_gerais: observacoesGerais.trim() }),
      ...(representante.trim() && { representante: representante.trim() })
    };

    if (onSave) {
      // Se há callback, usar ele (modo assinatura)
      onSave(newOrder);
    } else {
      // Salvar diretamente (modo antigo) com integração Firebase
      try {
        // Salvar no localStorage primeiro
        const updatedOrders = [...serviceOrders, newOrder];
        setServiceOrders(updatedOrders);

        // Tentar salvar no Firebase se estiver configurado
        if (isFirebaseConfigured()) {
          try {
            const { id: _omit, ...orderData } = newOrder;
            
            // Remover campos undefined antes de enviar para o Firebase
            const cleanOrderData = Object.fromEntries(
              Object.entries(orderData).filter(([_, value]) => value !== undefined)
            );
            
            const firebaseId = await serviceOrderService.create(cleanOrderData);
            
            // Atualizar o ID local com referência do Firebase
            const orderWithFirebaseId = { ...newOrder, id: `firebase_${firebaseId}` };
            const finalOrders = updatedOrders.map(order => 
              order.id === newOrder.id ? orderWithFirebaseId : order
            );
            setServiceOrders(finalOrders);
            
            alert('✅ Ordem de serviço salva com sucesso no sistema local e Firebase!');
          } catch (firebaseError) {
            console.error('Erro ao salvar no Firebase:', firebaseError);
            alert('⚠️ Ordem de serviço salva localmente. Erro ao sincronizar com Firebase: ' + 
                  (firebaseError instanceof Error ? firebaseError.message : 'Erro desconhecido'));
          }
        } else {
          alert('ℹ️ Ordem de serviço salva localmente. Configure o Firebase para sincronização automática.');
        }
        
        navigate('/orders');
      } catch (error) {
        console.error('Erro ao salvar ordem de serviço:', error);
        alert('❌ Erro ao salvar ordem de serviço: ' + 
              (error instanceof Error ? error.message : 'Erro desconhecido'));
      }
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/service-orders');
    }
  };

  // Adicionar primeiro gerador automaticamente
  useEffect(() => {
    if (selectedGenerators.length === 0) {
      addGenerator();
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Nova Ordem de Serviço</CardTitle>
            <CardDescription>
              Cliente: {client.nome} - {selectedGenerators.length} gerador(es) selecionado(s)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Informações Gerais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tecnico">Técnico Responsável</Label>
                <Input
                  id="tecnico"
                  value={tecnico}
                  onChange={(e) => setTecnico(e.target.value)}
                  placeholder="Nome do técnico"
                />
              </div>
              <div>
                <Label htmlFor="data">Data do Serviço</Label>
                <Input
                  id="data"
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                />
              </div>
            </div>

            {/* Lista de Geradores */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Geradores</h3>
                <Button onClick={addGenerator} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Adicionar Gerador
                </Button>
              </div>

              {selectedGenerators.map((generatorData, index) => (
                <Card key={index} className="mb-4">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-base">
                        Gerador {index + 1}
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => duplicateGenerator(index)}
                          className="flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          Duplicar
                        </Button>
                        {selectedGenerators.length > 1 && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => removeGenerator(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Seleção do Gerador e Tipo de Manutenção */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Selecionar Gerador</Label>
                        <Select
                          value={generatorData.gerador_id}
                          onValueChange={(value) => updateGeneratorData(index, 'gerador_id', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um gerador" />
                          </SelectTrigger>
                          <SelectContent>
                            {client.geradores
                              .filter(generator => 
                                !selectedGenerators.some((sg, i) => 
                                  i !== index && sg.gerador_id === generator.id
                                )
                              )
                              .map((generator) => (
                                <SelectItem key={generator.id} value={generator.id}>
                                  {generator.gerador} - Série Motor: {generator.serie_motor}
                                </SelectItem>
                              ))
                            }
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Tipo de Manutenção</Label>
                        <Select
                          value={generatorData.tipo_manutencao}
                          onValueChange={(value: 'Preventiva' | 'Corretiva') => 
                            updateGeneratorData(index, 'tipo_manutencao', value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Preventiva">Preventiva</SelectItem>
                            <SelectItem value="Corretiva">Corretiva</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Dados Técnicos */}
                    <div>
                      <h4 className="font-medium mb-2">Dados Técnicos</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <div>
                          <Label htmlFor={`fase_r_s_${index}`}>Fase R-S (V)</Label>
                          <Input
                            id={`fase_r_s_${index}`}
                            value={generatorData.fase_r_s || ''}
                            onChange={(e) => updateGeneratorData(index, 'fase_r_s', e.target.value)}
                            placeholder="220"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`fase_t_r_${index}`}>Fase T-R (V)</Label>
                          <Input
                            id={`fase_t_r_${index}`}
                            value={generatorData.fase_t_r || ''}
                            onChange={(e) => updateGeneratorData(index, 'fase_t_r', e.target.value)}
                            placeholder="220"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`fase_t_s_${index}`}>Fase T-S (V)</Label>
                          <Input
                            id={`fase_t_s_${index}`}
                            value={generatorData.fase_t_s || ''}
                            onChange={(e) => updateGeneratorData(index, 'fase_t_s', e.target.value)}
                            placeholder="220"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`frequencia_${index}`}>Frequência (Hz)</Label>
                          <Input
                            id={`frequencia_${index}`}
                            value={generatorData.frequencia || ''}
                            onChange={(e) => updateGeneratorData(index, 'frequencia', e.target.value)}
                            placeholder="60"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`kva_${index}`}>KVA</Label>
                          <Input
                            id={`kva_${index}`}
                            value={generatorData.kva || ''}
                            onChange={(e) => updateGeneratorData(index, 'kva', e.target.value)}
                            placeholder="100"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`tempo_funcionamento_${index}`}>Tempo Funcionamento (h)</Label>
                          <Input
                            id={`tempo_funcionamento_${index}`}
                            value={generatorData.tempo_funcionamento || ''}
                            onChange={(e) => updateGeneratorData(index, 'tempo_funcionamento', e.target.value)}
                            placeholder="1000"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`tensao_bateria_standby_${index}`}>Tensão Bateria Standby (V)</Label>
                          <Input
                            id={`tensao_bateria_standby_${index}`}
                            value={generatorData.tensao_bateria_standby || ''}
                            onChange={(e) => updateGeneratorData(index, 'tensao_bateria_standby', e.target.value)}
                            placeholder="12.5"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`tensao_bateria_carregando_${index}`}>Tensão Bateria Carregando (V)</Label>
                          <Input
                            id={`tensao_bateria_carregando_${index}`}
                            value={generatorData.tensao_bateria_carregando || ''}
                            onChange={(e) => updateGeneratorData(index, 'tensao_bateria_carregando', e.target.value)}
                            placeholder="13.8"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`queda_tensao_bateria_${index}`}>Queda de Tensão da Bateria (V)</Label>
                          <Input
                            id={`queda_tensao_bateria_${index}`}
                            value={generatorData.queda_tensao_bateria || ''}
                            onChange={(e) => updateGeneratorData(index, 'queda_tensao_bateria', e.target.value)}
                            placeholder="0.5"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`temperatura_agua_${index}`}>Temperatura Água (°C)</Label>
                          <Input
                            id={`temperatura_agua_${index}`}
                            value={generatorData.temperatura_agua || ''}
                            onChange={(e) => updateGeneratorData(index, 'temperatura_agua', e.target.value)}
                            placeholder="85"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`pressao_oleo_${index}`}>Pressão Óleo</Label>
                          <Input
                            id={`pressao_oleo_${index}`}
                            value={generatorData.pressao_oleo || ''}
                            onChange={(e) => updateGeneratorData(index, 'pressao_oleo', e.target.value)}
                            placeholder="4.5 bar"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`nivel_combustivel_${index}`}>Nível Combustível</Label>
                          <Select
                            value={generatorData.nivel_combustivel || ''}
                            onValueChange={(value) => updateGeneratorData(index, 'nivel_combustivel', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Cheio">Cheio</SelectItem>
                              <SelectItem value="3/4">3/4</SelectItem>
                              <SelectItem value="1/2">1/2</SelectItem>
                              <SelectItem value="1/4">1/4</SelectItem>
                              <SelectItem value="Vazio">Vazio</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Verificações */}
                    <div>
                      <h4 className="font-medium mb-2">Verificações</h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {generatorData.verificacoes.map((verification, vIndex) => {
                          // Lógica especial para "Teste de carga 5min"
                          if (verification.item === 'Teste de carga 5min') {
                            return (
                              <div key={vIndex} className="space-y-3 p-3 border rounded bg-blue-50">
                                <div className="flex items-center gap-3">
                                  <div className="flex-1">
                                    <span className="text-sm font-medium">{verification.item}</span>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`ok_${index}_${vIndex}`}
                                        checked={verification.status === 'OK'}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            updateVerification(index, vIndex, 'status', 'OK');
                                          }
                                        }}
                                      />
                                      <Label htmlFor={`ok_${index}_${vIndex}`} className="text-xs">OK</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`com_carga_${index}_${vIndex}`}
                                        checked={verification.status === 'Com carga'}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            updateVerification(index, vIndex, 'status', 'Com carga');
                                          }
                                        }}
                                      />
                                      <Label htmlFor={`com_carga_${index}_${vIndex}`} className="text-xs">Com carga</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`obs_${index}_${vIndex}`}
                                        checked={verification.status === 'OBS'}
                                        onCheckedChange={(checked) => {
                                          if (checked) {
                                            updateVerification(index, vIndex, 'status', 'OBS');
                                          }
                                        }}
                                      />
                                      <Label htmlFor={`obs_${index}_${vIndex}`} className="text-xs">OBS</Label>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Campos de corrente quando "Com carga" é selecionado */}
                                {verification.status === 'Com carga' && (
                                  <div className="grid grid-cols-2 gap-3 mt-3 p-3 bg-white rounded border">
                                    <div>
                                      <Label htmlFor={`corrente_r_${index}`} className="text-xs">Corrente R</Label>
                                      <Input
                                        id={`corrente_r_${index}`}
                                        value={generatorData.corrente_r || ''}
                                        onChange={(e) => updateGeneratorData(index, 'corrente_r', e.target.value)}
                                        placeholder="Amperes"
                                        className="text-xs"
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor={`corrente_s_${index}`} className="text-xs">Corrente S</Label>
                                      <Input
                                        id={`corrente_s_${index}`}
                                        value={generatorData.corrente_s || ''}
                                        onChange={(e) => updateGeneratorData(index, 'corrente_s', e.target.value)}
                                        placeholder="Amperes"
                                        className="text-xs"
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor={`corrente_t_${index}`} className="text-xs">Corrente T</Label>
                                      <Input
                                        id={`corrente_t_${index}`}
                                        value={generatorData.corrente_t || ''}
                                        onChange={(e) => updateGeneratorData(index, 'corrente_t', e.target.value)}
                                        placeholder="Amperes"
                                        className="text-xs"
                                      />
                                    </div>
                                    <div>
                                      <Label htmlFor={`corrente_geral_${index}`} className="text-xs">Corrente geral</Label>
                                      <Input
                                        id={`corrente_geral_${index}`}
                                        value={generatorData.corrente_geral || ''}
                                        onChange={(e) => updateGeneratorData(index, 'corrente_geral', e.target.value)}
                                        placeholder="Amperes"
                                        className="text-xs"
                                      />
                                    </div>
                                  </div>
                                )}
                                
                                {verification.status === 'OBS' && (
                                  <Input
                                    placeholder="Observação"
                                    value={verification.observacao || ''}
                                    onChange={(e) => updateVerification(index, vIndex, 'observacao', e.target.value)}
                                    className="w-full text-xs mt-2"
                                  />
                                )}
                              </div>
                            );
                          }
                          
                          // Renderização padrão para outros itens
                          return (
                            <div key={vIndex} className="flex items-center gap-3 p-2 border rounded">
                              <div className="flex-1">
                                <span className="text-sm">{verification.item}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`ok_${index}_${vIndex}`}
                                    checked={verification.status === 'OK'}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        updateVerification(index, vIndex, 'status', 'OK');
                                      }
                                    }}
                                  />
                                  <Label htmlFor={`ok_${index}_${vIndex}`} className="text-xs">OK</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`obs_${index}_${vIndex}`}
                                    checked={verification.status === 'OBS'}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        updateVerification(index, vIndex, 'status', 'OBS');
                                      }
                                    }}
                                  />
                                  <Label htmlFor={`obs_${index}_${vIndex}`} className="text-xs">OBS</Label>
                                </div>
                              </div>
                              {verification.status === 'OBS' && (
                                <Input
                                  placeholder="Observação"
                                  value={verification.observacao || ''}
                                  onChange={(e) => updateVerification(index, vIndex, 'observacao', e.target.value)}
                                  className="w-40 text-xs"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Observações específicas do gerador */}
                    <div>
                      <Label htmlFor={`observacoes_${index}`}>Observações Específicas</Label>
                      <Textarea
                        id={`observacoes_${index}`}
                        value={generatorData.observacoes || ''}
                        onChange={(e) => updateGeneratorData(index, 'observacoes', e.target.value)}
                        placeholder="Observações específicas deste gerador..."
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Observações Gerais */}
            <div>
              <Label htmlFor="observacoes_gerais">Observações Gerais da OS</Label>
              <Textarea
                id="observacoes_gerais"
                value={observacoesGerais}
                onChange={(e) => setObservacoesGerais(e.target.value)}
                placeholder="Observações gerais que se aplicam a toda a ordem de serviço..."
                rows={3}
              />
            </div>

            {/* Representante do Cliente */}
            <div>
              <Label htmlFor="representante">Nome do Representante do Cliente</Label>
              <Input
                id="representante"
                value={representante}
                onChange={(e) => setRepresentante(e.target.value)}
                placeholder="Nome completo do representante do cliente"
              />
            </div>

            {/* Botões */}
            <div className="flex gap-3">
              <Button onClick={handleSave} className="flex-1">
                {onSave ? 'Continuar para Assinatura' : 'Salvar Ordem de Serviço'}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleCancel}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}