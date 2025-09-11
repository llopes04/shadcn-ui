import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { reinitializeFirebase, isFirebaseConfigured } from '@/lib/firebase';
import { CheckCircle, AlertCircle, Copy, Eye, EyeOff } from 'lucide-react';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export default function ConfigFirebase() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<FirebaseConfig>({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  });
  const [configText, setConfigText] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    // Carregar configuração existente
    try {
      const storedConfig = localStorage.getItem('firebaseConfig');
      if (storedConfig) {
        const parsed = JSON.parse(storedConfig);
        setConfig(parsed);
        setConfigText(JSON.stringify(parsed, null, 2));
      }
    } catch (error) {
      console.error('Erro ao carregar configuração:', error);
    }
    
    setIsConfigured(isFirebaseConfigured());
  }, []);

  const handleInputChange = (field: keyof FirebaseConfig, value: string) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleConfigTextChange = (value: string) => {
    setConfigText(value);
    try {
      const parsed = JSON.parse(value);
      if (parsed.apiKey && parsed.authDomain && parsed.projectId) {
        setConfig(parsed);
      }
    } catch (error) {
      // Ignorar erros de parsing enquanto o usuário digita
    }
  };

  const saveConfig = () => {
    try {
      // Validar configuração
      if (!config.apiKey || !config.authDomain || !config.projectId) {
        alert('Por favor, preencha pelo menos os campos obrigatórios: API Key, Auth Domain e Project ID');
        return;
      }

      localStorage.setItem('firebaseConfig', JSON.stringify(config));
      
      // Reinicializar Firebase com nova configuração
      const success = reinitializeFirebase();
      
      if (success) {
        setIsConfigured(true);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        alert('Erro ao inicializar Firebase. Verifique suas credenciais.');
      }
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      alert('Erro ao salvar configuração');
    }
  };

  const clearConfig = () => {
    if (confirm('Tem certeza que deseja limpar a configuração do Firebase?')) {
      localStorage.removeItem('firebaseConfig');
      setConfig({
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: ''
      });
      setConfigText('');
      setIsConfigured(false);
    }
  };

  const copyExampleConfig = () => {
    const exampleConfig = {
      apiKey: "sua-api-key-aqui",
      authDomain: "seu-projeto.firebaseapp.com",
      projectId: "seu-projeto-id",
      storageBucket: "seu-projeto.appspot.com",
      messagingSenderId: "123456789",
      appId: "1:123456789:web:abcdef123456"
    };
    
    setConfigText(JSON.stringify(exampleConfig, null, 2));
    navigator.clipboard.writeText(JSON.stringify(exampleConfig, null, 2));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mr-4">
            ← Voltar
          </Button>
          <h1 className="text-2xl font-bold">Configuração do Firebase</h1>
          {isConfigured && (
            <CheckCircle className="w-6 h-6 text-green-600 ml-2" />
          )}
        </div>

        {showSuccess && (
          <Alert className="mb-6 border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Firebase configurado com sucesso!
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Status da Configuração
                {isConfigured ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                )}
              </CardTitle>
              <CardDescription>
                {isConfigured 
                  ? 'Firebase está configurado e pronto para uso'
                  : 'Firebase não está configurado. Configure as credenciais abaixo.'
                }
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Tutorial Card */}
          <Card>
            <CardHeader>
              <CardTitle>Como obter as credenciais do Firebase</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Passo a passo:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Acesse o <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Firebase Console</a></li>
                  <li>Crie um novo projeto ou selecione um existente</li>
                  <li>Clique em "Configurações do projeto" (ícone de engrenagem)</li>
                  <li>Na aba "Geral", role até "Seus aplicativos"</li>
                  <li>Clique em "Adicionar aplicativo" e selecione "Web" (&lt;/&gt;)</li>
                  <li>Registre seu aplicativo com um nome</li>
                  <li>Copie o objeto de configuração que aparece</li>
                  <li>Cole a configuração na aba "JSON" abaixo</li>
                </ol>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">⚠️ Importante:</h3>
                <p className="text-sm">
                  Ative os serviços necessários no Firebase Console:
                </p>
                <ul className="list-disc list-inside text-sm mt-2">
                  <li><strong>Firestore Database:</strong> Para armazenar dados</li>
                  <li><strong>Authentication:</strong> Para login de usuários</li>
                  <li><strong>Storage:</strong> Para armazenar arquivos</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Configuration Tabs */}
          <Card>
            <CardHeader>
              <CardTitle>Configurar Credenciais</CardTitle>
              <CardDescription>
                Configure suas credenciais do Firebase usando formulário ou JSON
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="form" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="form">Formulário</TabsTrigger>
                  <TabsTrigger value="json">JSON</TabsTrigger>
                </TabsList>
                
                <TabsContent value="form" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="apiKey">API Key *</Label>
                      <div className="relative">
                        <Input
                          id="apiKey"
                          type={showApiKey ? "text" : "password"}
                          value={config.apiKey}
                          onChange={(e) => handleInputChange('apiKey', e.target.value)}
                          placeholder="AIza..."
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="authDomain">Auth Domain *</Label>
                      <Input
                        id="authDomain"
                        value={config.authDomain}
                        onChange={(e) => handleInputChange('authDomain', e.target.value)}
                        placeholder="projeto.firebaseapp.com"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="projectId">Project ID *</Label>
                      <Input
                        id="projectId"
                        value={config.projectId}
                        onChange={(e) => handleInputChange('projectId', e.target.value)}
                        placeholder="meu-projeto"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="storageBucket">Storage Bucket</Label>
                      <Input
                        id="storageBucket"
                        value={config.storageBucket}
                        onChange={(e) => handleInputChange('storageBucket', e.target.value)}
                        placeholder="projeto.appspot.com"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="messagingSenderId">Messaging Sender ID</Label>
                      <Input
                        id="messagingSenderId"
                        value={config.messagingSenderId}
                        onChange={(e) => handleInputChange('messagingSenderId', e.target.value)}
                        placeholder="123456789"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="appId">App ID</Label>
                      <Input
                        id="appId"
                        value={config.appId}
                        onChange={(e) => handleInputChange('appId', e.target.value)}
                        placeholder="1:123456789:web:abc123"
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="json" className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label htmlFor="configJson">Configuração JSON</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={copyExampleConfig}
                        className="flex items-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Exemplo
                      </Button>
                    </div>
                    <Textarea
                      id="configJson"
                      value={configText}
                      onChange={(e) => handleConfigTextChange(e.target.value)}
                      placeholder="Cole aqui o objeto de configuração do Firebase..."
                      rows={12}
                      className="font-mono text-sm"
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex gap-3 mt-6">
                <Button onClick={saveConfig} className="flex-1">
                  Salvar Configuração
                </Button>
                {isConfigured && (
                  <Button variant="destructive" onClick={clearConfig}>
                    Limpar
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}