import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { syncService } from '@/services/firebaseService';
import { isFirebaseConfigured } from '@/lib/firebase';
import { Upload, Download, CheckCircle, AlertCircle, Loader2, Database, RefreshCw } from 'lucide-react';

export default function SyncControls() {
  const [isUploading, setIsUploading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSyncToFirebase = async () => {
    if (!isFirebaseConfigured()) {
      setMessage({ type: 'error', text: 'Firebase não está configurado. Configure primeiro.' });
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      console.log('🚀 Iniciando sincronização para Firebase...');
      const result = await syncService.syncToFirebase();
      console.log('📊 Resultado da sincronização:', result);
      
      setMessage({ 
        type: result.success ? 'success' : 'error', 
        text: result.message 
      });
    } catch (error) {
      console.error('❌ Erro detalhado:', error);
      setMessage({ 
        type: 'error', 
        text: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
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
      console.log('⬇️ Iniciando download do Firebase...');
      const result = await syncService.syncFromFirebase();
      console.log('📊 Resultado do download:', result);
      
      setMessage({ 
        type: result.success ? 'success' : 'error', 
        text: result.message 
      });
      
      if (result.success) {
        // Recarregar a página para atualizar os dados
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (error) {
      console.error('❌ Erro detalhado:', error);
      setMessage({ 
        type: 'error', 
        text: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleMergeFromFirebase = async () => {
    if (!isFirebaseConfigured()) {
      setMessage({ type: 'error', text: 'Firebase não está configurado. Configure primeiro.' });
      return;
    }

    setIsMerging(true);
    setMessage(null);

    try {
      console.log('🔄 Iniciando mesclagem com Firebase...');
      const result = await syncService.mergeFromFirebase();
      console.log('📊 Resultado da mesclagem:', result);
      
      setMessage({ 
        type: result.success ? 'success' : 'error', 
        text: result.message 
      });
      
      if (result.success) {
        // Recarregar a página para atualizar os dados
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (error) {
      console.error('❌ Erro detalhado:', error);
      setMessage({ 
        type: 'error', 
        text: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      });
    } finally {
      setIsMerging(false);
    }
  };

  const handleFixClientIds = async () => {
    setIsFixing(true);
    setMessage(null);

    try {
      console.log('🔧 Iniciando correção de cliente_id...');
      const result = await syncService.fixClientIds();
      console.log('📊 Resultado da correção:', result);
      
      setMessage({ 
        type: result.success ? 'success' : 'error', 
        text: result.message 
      });
    } catch (error) {
      console.error('❌ Erro detalhado:', error);
      setMessage({ 
        type: 'error', 
        text: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      });
    } finally {
      setIsFixing(false);
    }
  };

  const isConfigured = isFirebaseConfigured();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
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

        <div className="grid grid-cols-1 gap-3">
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
            {isDownloading ? 'Baixando...' : 'Baixar do Firebase (Substituir)'}
          </Button>

          <Button
            variant="secondary"
            onClick={handleMergeFromFirebase}
            disabled={!isConfigured || isMerging}
            className="flex items-center gap-2"
          >
            {isMerging ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {isMerging ? 'Mesclando...' : 'Mesclar com Firebase'}
          </Button>
        </div>

        <div className="text-sm text-gray-600 space-y-1">
          <p><strong>Enviar para Firebase:</strong> Envia apenas dados novos para o Firebase (evita duplicatas automaticamente)</p>
          <p><strong>Baixar do Firebase (Substituir):</strong> Substitui completamente seus dados locais pelos do Firebase</p>
          <p><strong>Mesclar com Firebase:</strong> Combina dados locais com os do Firebase (detecção inteligente de duplicatas)</p>
        </div>

        {!isConfigured && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Configuração necessária:</strong><br/>
              1. Configure o Firebase em "Configurar Firebase"<br/>
              2. Ative o Firestore Database no Firebase Console<br/>
              3. Configure as regras de segurança para modo teste
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}