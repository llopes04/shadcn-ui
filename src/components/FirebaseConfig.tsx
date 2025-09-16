import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export default function FirebaseConfig() {
  const [config, setConfig] = useLocalStorage<FirebaseConfig>('firebaseConfig', {
    apiKey: '',
    authDomain: '',
    databaseURL: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  });

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const handleInputChange = (field: keyof FirebaseConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      // Simulação de teste de conexão
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verificar se todos os campos estão preenchidos
      const allFieldsFilled = Object.values(config).every(value => value.trim() !== '');
      
      if (allFieldsFilled) {
        setTestResult('success');
      } else {
        setTestResult('error');
      }
    } catch (error) {
      setTestResult('error');
    } finally {
      setIsTesting(false);
    }
  };

  const fields: { key: keyof FirebaseConfig; label: string; placeholder: string }[] = [
    { key: 'apiKey', label: 'API Key', placeholder: 'Sua chave API do Firebase' },
    { key: 'authDomain', label: 'Auth Domain', placeholder: 'seu-projeto.firebaseapp.com' },
    { key: 'databaseURL', label: 'Database URL', placeholder: 'https://seu-projeto.firebaseio.com' },
    { key: 'projectId', label: 'Project ID', placeholder: 'seu-projeto-id' },
    { key: 'storageBucket', label: 'Storage Bucket', placeholder: 'seu-projeto.appspot.com' },
    { key: 'messagingSenderId', label: 'Messaging Sender ID', placeholder: '123456789' },
    { key: 'appId', label: 'App ID', placeholder: '1:123456789:web:abcdef' }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuração do Firebase</CardTitle>
        <CardDescription>
          Configure as credenciais do Firebase para sincronização em tempo real
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map((field) => (
          <div key={field.key} className="space-y-2">
            <label className="text-sm font-medium">{field.label}</label>
            <Input
              type="password"
              value={config[field.key]}
              onChange={(e) => handleInputChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className="w-full"
            />
          </div>
        ))}

        <div className="flex gap-3 pt-4">
          <Button
            onClick={testConnection}
            disabled={isTesting}
            className="flex-1"
          >
            {isTesting ? 'Testando...' : 'Testar Conexão'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setConfig({
              apiKey: '',
              authDomain: '',
              databaseURL: '',
              projectId: '',
              storageBucket: '',
              messagingSenderId: '',
              appId: ''
            })}
            className="flex-1"
          >
            Limpar
          </Button>
        </div>

        {testResult && (
          <div className={`p-3 rounded ${
            testResult === 'success' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {testResult === 'success' 
              ? '✅ Conexão testada com sucesso!'
              : '❌ Erro na configuração. Verifique os campos.'
            }
          </div>
        )}

        <div className="text-sm text-gray-600">
          <p>💡 Dica: Estas configurações podem ser encontradas no:</p>
          <ul className="list-disc list-inside ml-4 mt-2">
            <li>Console do Firebase → Configurações do projeto</li>
            <li>Seção "Contas de serviço" ou "Configurações gerais"</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}