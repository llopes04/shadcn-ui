import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ImageAttachment } from '@/types';
import { Camera, Upload, X, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ImageUploadProps {
  images: ImageAttachment[];
  onImagesChange: (images: ImageAttachment[]) => void;
  maxImages?: number;
  maxSizeKB?: number;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  images,
  onImagesChange,
  maxImages = 10,
  maxSizeKB = 2048 // 2MB default
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Função para comprimir imagem
  const compressImage = (file: File, maxSizeKB: number): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calcular dimensões mantendo proporção
        const maxWidth = 1200;
        const maxHeight = 1200;
        let { width, height } = img;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Desenhar imagem redimensionada
        ctx?.drawImage(img, 0, 0, width, height);

        // Comprimir até atingir o tamanho desejado
        let quality = 0.9;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        while (dataUrl.length > maxSizeKB * 1024 && quality > 0.1) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(dataUrl);
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || images.length >= maxImages) return;

    setIsUploading(true);
    const newImages: ImageAttachment[] = [];

    for (let i = 0; i < files.length && images.length + newImages.length < maxImages; i++) {
      const file = files[i];

      if (!file.type.startsWith('image/')) continue;

      try {
        const compressedDataUrl = await compressImage(file, maxSizeKB);
        
        const imageAttachment: ImageAttachment = {
          id: Date.now().toString() + i,
          name: file.name,
          url: compressedDataUrl,
          size: compressedDataUrl.length,
          type: file.type,
          uploadDate: new Date().toISOString(),
          description: ''
        };

        newImages.push(imageAttachment);
      } catch (error) {
        console.error('Erro ao processar imagem:', error);
      }
    }

    onImagesChange([...images, ...newImages]);
    setIsUploading(false);

    // Limpar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (imageId: string) => {
    onImagesChange(images.filter(img => img.id !== imageId));
  };

  const updateImageDescription = (imageId: string, description: string) => {
    onImagesChange(
      images.map(img => 
        img.id === imageId ? { ...img, description } : img
      )
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / (1024 * 1024)) + ' MB';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Label>Anexar Fotos ({images.length}/{maxImages})</Label>
        {images.length < maxImages && (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              {isUploading ? 'Processando...' : 'Galeria'}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                // Simular captura de câmera (na prática, abre seletor de arquivo com câmera)
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.capture = 'environment';
                input.multiple = true;
                input.onchange = (e) => {
                  const target = e.target as HTMLInputElement;
                  handleFileSelect(target.files);
                };
                input.click();
              }}
              disabled={isUploading}
            >
              <Camera className="w-4 h-4 mr-2" />
              Câmera
            </Button>
          </div>
        )}
      </div>

      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      {images.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {images.map((image) => (
            <Card key={image.id} className="relative">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="relative flex-shrink-0">
                    <img
                      src={image.url}
                      alt={image.name}
                      className="w-20 h-20 object-cover rounded border"
                    />
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="absolute -top-2 -right-2 w-6 h-6 p-0"
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>{image.name}</DialogTitle>
                        </DialogHeader>
                        <div className="flex justify-center">
                          <img
                            src={image.url}
                            alt={image.name}
                            className="max-w-full max-h-[70vh] object-contain"
                          />
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium truncate">{image.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(image.size)} • {new Date(image.uploadDate).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeImage(image.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    <Input
                      placeholder="Descrição da foto (opcional)"
                      value={image.description || ''}
                      onChange={(e) => updateImageDescription(image.id, e.target.value)}
                      className="mt-2 text-xs"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {images.length === 0 && (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <Camera className="w-12 h-12 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-500">
            Nenhuma foto anexada. Use os botões acima para adicionar fotos.
          </p>
        </div>
      )}
    </div>
  );
};