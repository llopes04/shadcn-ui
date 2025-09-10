import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle, Database, Wifi } from 'lucide-react';
import { isFirebaseConfigured } from '@/lib/firebase';
import { serviceOrderService, clientService, syncService } from '@/services/firebaseService';

interface DiagnosticResult {
  test: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export function FirebaseDiagnostic() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const diagnostics: DiagnosticResult[] = [];

    // Teste 1: Configuração do Firebase
    try {
      const configured = isFirebaseConfigured();
      diagnostics.push({
        test: 'Configuração do Firebase',
        status: configured ? 'success' : 'error',
        message: configured ? 'Firebase configurado corretamente' : 'Firebase não configurado',
        details: configured ? 'Todas as variáveis de ambiente estão presentes' : 'Verifique as variáveis VITE_FIREBASE_* no arquivo .env'
      });
    } catch (error) {
      diagnostics.push({
        test: 'Configuração do Firebase',
        status: 'error',
        message: 'Erro ao verificar configuração',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }

    // Teste 2: Conexão com Firestore
    try {
      await serviceOrderService.getAll();
      diagnostics.push({
        test: 'Conexão com Firestore',
        status: 'success',
        message: 'Conexão estabelecida com sucesso',
        details: 'Conseguiu acessar a coleção serviceOrders'
      });
    } catch (error: any) {
      const isPermissionError = error.code === 'permission-denied';
      diagnostics.push({
        test: 'Conexão com Firestore',
        status: 'error',
        message: isPermissionError ? 'Erro de permissão' : 'Erro de conexão',
        details: isPermissionError 
          ? 'As regras do Firestore estão bloqueando o acesso. Verifique as regras de segurança no console do Firebase.'
          : error.message
      });
    }

    // Teste 3: Dados locais
    try {
      const localOrders = JSON.parse(localStorage.getItem('serviceOrders') || '[]');
      const localClients = JSON.parse(localStorage.getItem('clients') || '[]');
      
      diagnostics.push({
        test: 'Dados Locais',
        status: localOrders.length > 0 || localClients.length > 0 ? 'success' : 'warning',
        message: `${localOrders.length} ordens e ${localClients.length} clientes no localStorage`,
        details: localOrders.length === 0 && localClients.length === 0 
          ? 'Nenhum dado local encontrado. Crie algumas ordens de serviço primeiro.'
          : 'Dados locais disponíveis para sincronização'
      });
    } catch (error) {
      diagnostics.push({
        test: 'Dados Locais',
        status: 'error',
        message: 'Erro ao acessar localStorage',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }

    // Teste 4: Teste de escrita (se possível)
    try {
      const testOrder = {
        numeroOS: `TESTE-${Date.now()}`,
        cliente: { nome: 'Cliente Teste', email: 'teste@teste.com' },
        tecnico: 'Teste Diagnóstico',
        data: new Date().toISOString().split('T')[0],
        status: 'pendente' as const,
        servicos: [],
        observacoes: 'Ordem criada pelo diagnóstico do Firebase'
      };

      await serviceOrderService.create(testOrder);
      diagnostics.push({
        test: 'Teste de Escrita',
        status: 'success',
        message: 'Conseguiu criar documento no Firebase',
        details: 'O Firebase está funcionando corretamente para escrita'
      });
    } catch (error: any) {
      const isPermissionError = error.code === 'permission-denied';
      diagnostics.push({
        test: 'Teste de Escrita',
        status: 'error',
        message: isPermissionError ? 'Sem permissão para escrever' : 'Erro ao escrever',
        details: isPermissionError 
          ? 'PROBLEMA IDENTIFICADO: As regras do Firestore estão bloqueando a escrita. Acesse o console do Firebase e altere as regras de segurança.'
          : error.message
      });
    }

    setResults(diagnostics);
    setIsRunning(false);
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'warning': return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: DiagnosticResult['status']) => {
    const variants = {
      success: 'default',
      error: 'destructive',
      warning: 'secondary'
    } as const;
    
    return (
      <Badge variant={variants[status]}>
        {status === 'success' ? 'OK' : status === 'error' ? 'ERRO' : 'AVISO'}
      </Badge>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Diagnóstico do Firebase
        </CardTitle>
        <CardDescription>
          Verifique a conectividade e configuração do Firebase
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runDiagnostics} 
          disabled={isRunning}
          className="w-full"
        >
          <Wifi className="h-4 w-4 mr-2" />
          {isRunning ? 'Executando Diagnóstico...' : 'Executar Diagnóstico'}
        </Button>

        {results.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Resultados:</h3>
            {results.map((result, index) => (
              <Alert key={index} className={`border-l-4 ${
                result.status === 'success' ? 'border-l-green-500' :
                result.status === 'error' ? 'border-l-red-500' : 'border-l-yellow-500'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getStatusIcon(result.status)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{result.test}</span>
                        {getStatusBadge(result.status)}
                      </div>
                      <AlertDescription className="text-sm">
                        <div className="mb-1">{result.message}</div>
                        {result.details && (
                          <div className="text-xs text-muted-foreground mt-1 p-2 bg-muted rounded">
                            {result.details}
                          </div>
                        )}
                      </AlertDescription>
                    </div>
                  </div>
                </div>
              </Alert>
            ))}
          </div>
        )}

        {results.some(r => r.status === 'error' && r.test === 'Teste de Escrita') && (
          <Alert className="border-l-4 border-l-red-500">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>SOLUÇÃO:</strong> Acesse o <a 
                href="https://console.firebase.google.com/project/projeto-sermag/firestore/rules" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Console do Firebase
              </a> e altere as regras de segurança para permitir leitura e escrita.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}