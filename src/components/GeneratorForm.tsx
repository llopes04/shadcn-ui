import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Generator } from '@/types';

interface GeneratorFormProps {
  generator?: Generator;
  onSubmit: (generator: Generator) => void;
  onCancel: () => void;
}

export default function GeneratorForm({ generator, onSubmit, onCancel }: GeneratorFormProps) {
  const [formData, setFormData] = useState({
    motor: generator?.motor || '',
    modelo_motor: generator?.modelo_motor || '',
    serie_motor: generator?.serie_motor || '',
    gerador: generator?.gerador || '',
    modelo_gerador: generator?.modelo_gerador || '',
    serie_gerador: generator?.serie_gerador || '',
    usca: generator?.usca || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newGenerator: Generator = {
      id: generator?.id || Date.now().toString(),
      ...formData
    };
    onSubmit(newGenerator);
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{generator ? 'Editar Gerador' : 'Novo Gerador'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Motor</label>
              <Input
                value={formData.motor}
                onChange={(e) => handleInputChange('motor', e.target.value)}
                placeholder="Motor"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Modelo Motor</label>
              <Input
                value={formData.modelo_motor}
                onChange={(e) => handleInputChange('modelo_motor', e.target.value)}
                placeholder="Modelo do motor"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nº Série Motor</label>
              <Input
                value={formData.serie_motor}
                onChange={(e) => handleInputChange('serie_motor', e.target.value)}
                placeholder="Número de série do motor"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Gerador</label>
              <Input
                value={formData.gerador}
                onChange={(e) => handleInputChange('gerador', e.target.value)}
                placeholder="Gerador"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Modelo Gerador</label>
              <Input
                value={formData.modelo_gerador}
                onChange={(e) => handleInputChange('modelo_gerador', e.target.value)}
                placeholder="Modelo do gerador"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nº Série Gerador</label>
              <Input
                value={formData.serie_gerador}
                onChange={(e) => handleInputChange('serie_gerador', e.target.value)}
                placeholder="Número de série do gerador"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">USCA</label>
              <Input
                value={formData.usca}
                onChange={(e) => handleInputChange('usca', e.target.value)}
                placeholder="USCA"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
              {generator ? 'Atualizar' : 'Adicionar'} Gerador
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}