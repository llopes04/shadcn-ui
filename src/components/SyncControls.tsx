import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { syncService } from '@/services/firebaseService';
import { isFirebaseConfigured } from '@/lib/firebase';
import { Upload, Download, CheckCircle, AlertCircle, Loader2, Trash2 } from 'lucide-react';

export default function SyncControls() {
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSyncToFirebase = async () => {
    if (!isFirebaseConfigured()) {
      setMessage({ type: 'error', text: 'Firebase não está configurado. Configure primeiro.' });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      const result = await syncService.syncToFirebase();
      setMessage({ 
        type: result.success ? 'success' : 'error', 
        text: result.message 
      });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Erro ao sincronizar dados para o Firebase.' 
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSyncFromFirebase = async () => {
    if (!isFirebaseConfigured()) {
      setMessage({ type: 'error', text: 'Firebase não está configurado. Configure primeiro.' });
      return;
    }

    setIsDownloading(true);
    setMessage(null);

    try {
      const result = await syncService.syncFromFirebase();
      setMessage({ 
        type: result.success ? 'success' : 'error', 
        text: result.message 
      });
      
      if (result.success) {
        // Recarregar a página para atualizar os dados
        window.location.reload();
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Erro ao baixar dados do Firebase.' 
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCleanDuplicates = async () => {
    setIsCleaning(true);
    setMessage(null);

    try {
      const result = await syncService.cleanDuplicates();
      setMessage({ 
        type: result.success ? 'success' : 'error', 
        text: result.message 
      });
      
      if (result.success) {
        // Recarregar a página para atualizar os dados
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Erro ao limpar duplicatas.' 
      });
    } finally {
      setIsCleaning(false);
    }
  };

  const isConfigured = isFirebaseConfigured();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Sincronização Firebase
          {isConfigured ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <AlertCircle className="w-5 h-5 text-orange-500" />
          )}
        </CardTitle>
        <CardDescription>
          {isConfigured 
            ? 'Sincronize seus dados locais com o Firebase'
            : 'Configure o Firebase primeiro para usar a sincronização'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <Alert className={message.type === 'success' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            {message.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Button
            onClick={handleSyncToFirebase}
            disabled={!isConfigured || isUploading}
            className="flex items-center gap-2"
          >
            {isUploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {isUploading ? 'Enviando...' : 'Enviar para Firebase'}
          </Button>

          <Button
            variant="outline"
            onClick={handleSyncFromFirebase}
            disabled={!isConfigured || isDownloading}
            className="flex items-center gap-2"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isDownloading ? 'Baixando...' : 'Baixar do Firebase'}
          </Button>
        </div>

        <div className="mt-4">
          <Button
            variant="destructive"
            onClick={handleCleanDuplicates}
            disabled={isCleaning}
            className="flex items-center gap-2 w-full"
          >
            {isCleaning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            {isCleaning ? 'Limpando...' : 'Limpar Duplicatas'}
          </Button>
        </div>

        <div className="text-sm text-gray-600 space-y-1">
          <p><strong>Enviar para Firebase:</strong> Salva seus dados locais no Firebase (evita duplicatas)</p>
          <p><strong>Baixar do Firebase:</strong> Atualiza seus dados locais com os do Firebase (evita duplicatas)</p>
          <p><strong>Limpar Duplicatas:</strong> Remove registros duplicados dos dados locais</p>
        </div>
      </CardContent>
    </Card>
  );
}