import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; 
import { Label } from '@/components/ui/label';
import { RTI, ServiceOrder, User, Client, ImageAttachment } from '@/types';
import { generateRTIPDF, downloadPDF } from '@/utils/pdfGenerator';
import { ImageUpload } from '@/components/ImageUpload';

interface RTIFormProps {
  serviceOrder: ServiceOrder;
  client?: Client;
  currentUser: User | null;
  existingRTI?: RTI | null;
  onSave: (rti: RTI) => void;
  onCancel: () => void;
}

export default function RTIForm({ 
  serviceOrder, 
  client,
  currentUser, 
  existingRTI, 
  onSave, 
  onCancel 
}: RTIFormProps) {
  const [rti, setRTI] = useState<RTI>({
    id: existingRTI?.id || Date.now().toString(),
    service_order_id: serviceOrder.id,
    tecnico: currentUser?.nome || '',
    data_criacao: new Date().toLocaleDateString('pt-BR'),
    detalhes_tecnicos: existingRTI?.detalhes_tecnicos || '',
    recomendacoes: existingRTI?.recomendacoes || '',
    pecas_utilizadas: existingRTI?.pecas_utilizadas || '',
    tempo_gasto: existingRTI?.tempo_gasto || '',
    problemas_identificados: existingRTI?.problemas_identificados || '',
    solucao_aplicada: existingRTI?.solucao_aplicada || '',
    images: existingRTI?.images || []
  });

  useEffect(() => {
    if (existingRTI) {
      setRTI(existingRTI);
    }
  }, [existingRTI]);

  const handleChange = (field: keyof RTI, value: string) => {
    setRTI(prev => ({ ...prev, [field]: value }));
  };

  const handleImagesChange = (images: ImageAttachment[]) => {
    setRTI(prev => ({ ...prev, images }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(rti);
  };

  const exportRTIToPDF = async () => {
    if (!client) {
      alert('Informações do cliente não disponíveis para gerar o PDF');
      return;
    }

    try {
      const pdf = await generateRTIPDF(rti, serviceOrder, client);
      downloadPDF(pdf, `rti_${serviceOrder.id.slice(-6)}_${rti.data_criacao.replace(/\//g, '-')}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF do RTI:', error);
      alert('Ocorreu um erro ao gerar o PDF do RTI');
    }
  };

  return (
    <Card className="border-gray-200 shadow-md">
      <CardHeader className="bg-gray-50 border-b">
        <CardTitle className="text-xl font-bold text-gray-800">
          {existingRTI ? 'Editar Relatório Técnico Interno' : 'Novo Relatório Técnico Interno'}
        </CardTitle>
        <CardDescription>
          {existingRTI ? 
            `Editando RTI para OS #${serviceOrder.id.slice(-6)}` : 
            `Criando novo RTI para OS #${serviceOrder.id.slice(-6)}`}
          <br />
          <span className="text-xs text-blue-600">
            * O RTI é um documento interno e não aparece no PDF da Ordem de Serviço
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tecnico" className="font-medium">
                Técnico Responsável
              </Label>
              <Input
                id="tecnico"
                value={rti.tecnico}
                onChange={(e) => handleChange('tecnico', e.target.value)}
                placeholder="Nome do técnico"
                required
                className="border-gray-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data" className="font-medium">
                Data
              </Label>
              <Input
                id="data"
                value={rti.data_criacao}
                onChange={(e) => handleChange('data_criacao', e.target.value)}
                placeholder="DD/MM/AAAA"
                required
                className="border-gray-300"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tempo" className="font-medium">
              Tempo Gasto (horas)
            </Label>
            <Input
              id="tempo"
              type="text"
              value={rti.tempo_gasto}
              onChange={(e) => handleChange('tempo_gasto', e.target.value)}
              placeholder="Ex: 2.5"
              className="border-gray-300"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="problemas" className="font-medium">
              Problemas Identificados
            </Label>
            <Textarea
              id="problemas"
              value={rti.problemas_identificados}
              onChange={(e) => handleChange('problemas_identificados', e.target.value)}
              placeholder="Descreva detalhadamente os problemas identificados no equipamento"
              className="min-h-[100px] border-gray-300"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="solucao" className="font-medium">
              Solução Aplicada
            </Label>
            <Textarea
              id="solucao"
              value={rti.solucao_aplicada}
              onChange={(e) => handleChange('solucao_aplicada', e.target.value)}
              placeholder="Descreva as soluções e procedimentos aplicados"
              className="min-h-[100px] border-gray-300"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pecas" className="font-medium">
              Peças Utilizadas
            </Label>
            <Textarea
              id="pecas"
              value={rti.pecas_utilizadas}
              onChange={(e) => handleChange('pecas_utilizadas', e.target.value)}
              placeholder="Liste todas as peças utilizadas na manutenção"
              className="min-h-[100px] border-gray-300"
            />
            <p className="text-xs text-gray-500">
              Informe o código, quantidade e descrição das peças
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="detalhes" className="font-medium">
              Detalhes Técnicos
            </Label>
            <Textarea
              id="detalhes"
              value={rti.detalhes_tecnicos}
              onChange={(e) => handleChange('detalhes_tecnicos', e.target.value)}
              placeholder="Informações técnicas adicionais sobre o equipamento e procedimentos"
              className="min-h-[100px] border-gray-300"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recomendacoes" className="font-medium">
              Recomendações
            </Label>
            <Textarea
              id="recomendacoes"
              value={rti.recomendacoes}
              onChange={(e) => handleChange('recomendacoes', e.target.value)}
              placeholder="Recomendações para manutenção futura ou cuidados necessários"
              className="min-h-[100px] border-gray-300"
            />
          </div>

          {/* Seção de Upload de Imagens */}
          <div className="border-t pt-6">
            <ImageUpload
              images={rti.images || []}
              onImagesChange={handleImagesChange}
              maxImages={10}
              maxSizeKB={1024} // 1MB por imagem
            />
            <p className="text-xs text-gray-500 mt-2">
              * As fotos ficam disponíveis apenas no sistema e no PDF do RTI (separado da OS)
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-6">
            {existingRTI && client && (
              <Button
                type="button"
                variant="outline"
                onClick={exportRTIToPDF}
                className="bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200"
              >
                Exportar RTI em PDF
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="border-gray-300"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Salvar Relatório
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}