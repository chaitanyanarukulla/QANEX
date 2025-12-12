'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { aiSettingsApi } from '@/services/ai.service';
import { tenantsApi } from '@/services/tenants.service';
import {
  AIProviderType,
  AIProviderInfo,
  AIModelInfo,
  AIConnectionTestResult,
  AIFoundryLocalStatus,
  TenantAIConfig,
} from '@/types/ai';

// Provider icons/badges
const ProviderBadge = ({ category }: { category: 'cloud' | 'local' }) => (
  <span
    className={`px-2 py-0.5 text-xs rounded-full ${category === 'cloud'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-green-100 text-green-800'
      }`}
  >
    {category === 'cloud' ? 'Cloud API' : 'On-Device'}
  </span>
);

// Step indicator
const StepIndicator = ({
  steps,
  currentStep,
}: {
  steps: string[];
  currentStep: number;
}) => (
  <div className="flex items-center mb-8">
    {steps.map((step, index) => (
      <div key={step} className="flex items-center">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${index <= currentStep
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-600'
            }`}
        >
          {index + 1}
        </div>
        <span
          className={`ml-2 text-sm ${index <= currentStep ? 'text-blue-600 font-medium' : 'text-gray-500'
            }`}
        >
          {step}
        </span>
        {index < steps.length - 1 && (
          <div
            className={`w-12 h-0.5 mx-4 ${index < currentStep ? 'bg-blue-600' : 'bg-gray-200'
              }`}
          />
        )}
      </div>
    ))}
  </div>
);

export default function AISettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wizard state
  const [step, setStep] = useState(0);
  const steps = ['Choose Provider', 'Configure', 'Test & Save'];

  // Provider data
  const [providers, setProviders] = useState<AIProviderInfo[]>([]);
  const [currentConfig, setCurrentConfig] = useState<TenantAIConfig | null>(null);

  // Form state
  const [selectedProvider, setSelectedProvider] = useState<AIProviderType | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedEmbeddingModel, setSelectedEmbeddingModel] = useState('');
  const [foundryEndpoint, setFoundryEndpoint] = useState('http://127.0.0.1:55588/v1');
  const [foundryModel, setFoundryModel] = useState('phi-3.5-mini');

  // Anthropic embedding options
  const [anthropicEmbeddingProvider, setAnthropicEmbeddingProvider] = useState<'openai' | 'foundry_local'>('foundry_local');
  const [anthropicEmbeddingApiKey, setAnthropicEmbeddingApiKey] = useState('');

  // Test results
  const [testResult, setTestResult] = useState<AIConnectionTestResult | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  // Foundry Local status
  const [foundryStatus, setFoundryStatus] = useState<AIFoundryLocalStatus | null>(null);

  // Load providers and current config on mount
  useEffect(() => {
    async function load() {
      try {
        const [providersData, tenantData] = await Promise.all([
          aiSettingsApi.getProviders(),
          user?.defaultTenantId ? tenantsApi.get(user.defaultTenantId) : null,
        ]);

        setProviders(providersData);

        if (tenantData?.settings?.aiConfig) {
          const config = tenantData.settings.aiConfig;
          setCurrentConfig(config);
          setSelectedProvider(config.provider || null);

          // Restore form state from existing config
          if (config.provider && config.provider !== 'foundry_local' && config.cloudConfig) {
            const providerConfig = config.cloudConfig[config.provider as keyof typeof config.cloudConfig];
            if (providerConfig) {
              if ('apiKey' in providerConfig && providerConfig.apiKey) setApiKey('********'); // Masked
              if ('model' in providerConfig && providerConfig.model) setSelectedModel(providerConfig.model);
              if ('embeddingModel' in providerConfig && providerConfig.embeddingModel) {
                setSelectedEmbeddingModel(providerConfig.embeddingModel);
              }
              // Restore Anthropic embedding provider settings
              if (config.provider === 'anthropic' && 'embeddingProvider' in providerConfig) {
                setAnthropicEmbeddingProvider(providerConfig.embeddingProvider || 'foundry_local');
                if (providerConfig.embeddingApiKey) {
                  setAnthropicEmbeddingApiKey('********'); // Masked
                }
              }
            }
          }

          if (config.foundryLocalConfig) {
            setFoundryEndpoint(config.foundryLocalConfig.endpoint || 'http://127.0.0.1:55588/v1');
            setFoundryModel(config.foundryLocalConfig.model || 'phi-3.5-mini');
          }
        }
      } catch (_err) {
        setError('Failed to load AI settings');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  // Load Foundry Local status when selected
  useEffect(() => {
    if (selectedProvider === 'foundry_local') {
      aiSettingsApi.getFoundryLocalStatus().then(setFoundryStatus).catch(() => { });
    }
  }, [selectedProvider]);

  // Get current provider info
  const selectedProviderInfo = providers.find((p) => p.type === selectedProvider);

  // Set default models when provider changes (if no model is currently selected)
  useEffect(() => {
    if (!selectedProviderInfo || !selectedProvider) return;

    // For cloud providers, set default chat and embedding models
    if (selectedProviderInfo.category === 'cloud') {
      const providerChatModels = selectedProviderInfo.models.filter(
        (m: AIModelInfo) => m.category !== 'embedding'
      );
      const providerEmbeddingModels = selectedProviderInfo.models.filter(
        (m: AIModelInfo) => m.category === 'embedding'
      );

      // Set recommended or first chat model if not already set
      if (!selectedModel) {
        const recommendedChat = providerChatModels.find((m: AIModelInfo) => m.recommended);
        const defaultChat = recommendedChat || providerChatModels[0];
        if (defaultChat) {
          // Cloud models use 'id'
          setSelectedModel(defaultChat.id);
        }
      }

      // Set recommended or first embedding model if not already set
      if (!selectedEmbeddingModel && selectedProvider !== 'anthropic') {
        const recommendedEmbed = providerEmbeddingModels.find((m: AIModelInfo) => m.recommended);
        const defaultEmbed = recommendedEmbed || providerEmbeddingModels[0];
        if (defaultEmbed) {
          setSelectedEmbeddingModel(defaultEmbed.id);
        }
      }
    }
    // For Foundry Local, set default model
    else if (selectedProvider === 'foundry_local') {
      const foundryModels = selectedProviderInfo.models.filter(
        (m: AIModelInfo) => m.category === 'chat' || (m as unknown as { task: string }).task === 'chat-completions'
      );
      if (!foundryModel && foundryModels.length > 0) {
        // Foundry models use 'alias' but mapped to id/name in recent changes, checking strict props
        // If interface says id/name, we use id. But Foundry might use alias.
        // Let's assume AIModelInfo normalized it, or cast if specific Foundry property
        setFoundryModel(foundryModels[0].id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProviderInfo, selectedProvider]);

  // Get models for selected provider
  // Cloud providers use 'category', Foundry Local uses 'task' (mapped to category 'chat')
  const chatModels = selectedProviderInfo?.models.filter(
    (m: AIModelInfo) => m.category !== 'embedding'
  ) || [];
  const embeddingModels = selectedProviderInfo?.models.filter(
    (m: AIModelInfo) => m.category === 'embedding'
  ) || [];

  // Test connection
  async function handleTestConnection() {
    if (!selectedProvider) return;

    setTestLoading(true);
    setTestResult(null);

    try {
      const result = await aiSettingsApi.testConnection(selectedProvider, {
        apiKey: apiKey !== '********' ? apiKey : undefined,
        endpoint: selectedProvider === 'foundry_local' ? foundryEndpoint : undefined,
      });
      setTestResult(result);
    } catch (err) {
      setTestResult({
        success: false,
        message: (err as Error).message || 'Connection test failed',
      });
    } finally {
      setTestLoading(false);
    }
  }

  // Save configuration
  async function handleSave() {
    if (!selectedProvider || !user?.defaultTenantId) return;

    setSaving(true);
    setError(null);

    try {
      const aiConfig: TenantAIConfig = {
        provider: selectedProvider,
      };

      if (selectedProvider === 'foundry_local') {
        aiConfig.foundryLocalConfig = {
          endpoint: foundryEndpoint,
          model: foundryModel,
        };
      } else {
        aiConfig.cloudConfig = {};

        if (selectedProvider === 'openai') {
          aiConfig.cloudConfig.openai = {
            apiKey: apiKey !== '********' ? apiKey : currentConfig?.cloudConfig?.openai?.apiKey || '',
            model: selectedModel || 'gpt-4o-mini',
            embeddingModel: selectedEmbeddingModel || 'text-embedding-3-small',
          };
        } else if (selectedProvider === 'gemini') {
          aiConfig.cloudConfig.gemini = {
            apiKey: apiKey !== '********' ? apiKey : currentConfig?.cloudConfig?.gemini?.apiKey || '',
            model: selectedModel || 'gemini-1.5-flash',
            embeddingModel: selectedEmbeddingModel || 'text-embedding-004',
          };
        } else if (selectedProvider === 'anthropic') {
          aiConfig.cloudConfig.anthropic = {
            apiKey: apiKey !== '********' ? apiKey : currentConfig?.cloudConfig?.anthropic?.apiKey || '',
            model: selectedModel || 'claude-3-5-haiku-20241022',
            embeddingProvider: anthropicEmbeddingProvider,
            embeddingApiKey: anthropicEmbeddingProvider === 'openai' ? anthropicEmbeddingApiKey : undefined,
          };
        }
      }

      await tenantsApi.updateSettings(user.defaultTenantId, {
        aiConfig,
      });

      setCurrentConfig(aiConfig);
      setStep(0);
      alert('AI configuration saved successfully!');
    } catch (err) {
      setError((err as Error).message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">AI Provider Settings</h1>
        <p className="mt-2 text-gray-600">
          Configure your AI provider for requirement analysis, bug triage, and RAG search.
        </p>
      </div>

      {/* Current configuration banner */}
      {currentConfig?.provider && step === 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-blue-600 font-medium">Current Provider:</span>
              <span className="ml-2 text-blue-900 font-semibold">
                {providers.find((p) => p.type === currentConfig.provider)?.name || currentConfig.provider}
              </span>
              <ProviderBadge
                category={currentConfig.provider === 'foundry_local' ? 'local' : 'cloud'}
              />
            </div>
            <button
              onClick={() => setStep(0)}
              className="text-sm text-blue-600 hover:underline"
            >
              Change Provider
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <StepIndicator steps={steps} currentStep={step} />

      {/* Step 1: Choose Provider */}
      {step === 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold mb-4">Select Your AI Provider</h2>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Cloud Providers (Option 1) */}
            <div className="col-span-2 mb-2">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                Option 1: Cloud APIs (Requires API Key)
              </h3>
            </div>

            {providers
              .filter((p) => p.category === 'cloud')
              .map((provider) => (
                <div
                  key={provider.type}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedProvider === provider.type
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                  onClick={() => {
                    if (selectedProvider !== provider.type) {
                      setSelectedProvider(provider.type);
                      setTestResult(null);
                      // Clear model selections when switching providers
                      setSelectedModel('');
                      setSelectedEmbeddingModel('');
                      setApiKey('');
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">{provider.name}</span>
                    <ProviderBadge category={provider.category} />
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{provider.description}</p>
                  <p className="text-xs text-gray-500">{provider.setupInstructions}</p>
                </div>
              ))}

            {/* Local Provider (Option 2) */}
            <div className="col-span-2 mt-4 mb-2">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                Option 2: On-Device (100% Local, No API Key)
              </h3>
            </div>

            {providers
              .filter((p) => p.category === 'local')
              .map((provider) => (
                <div
                  key={provider.type}
                  className={`p-4 border rounded-lg cursor-pointer transition-all col-span-2 ${selectedProvider === provider.type
                    ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                  onClick={() => {
                    if (selectedProvider !== provider.type) {
                      setSelectedProvider(provider.type);
                      setTestResult(null);
                      // Clear cloud model selections when switching to local
                      setSelectedModel('');
                      setSelectedEmbeddingModel('');
                      setApiKey('');
                      // Reset Foundry model to default
                      setFoundryModel('phi-3.5-mini');
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">{provider.name}</span>
                    <ProviderBadge category={provider.category} />
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{provider.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Privacy: All data stays on your machine</span>
                    <span>Cost: Free (no API costs)</span>
                    <span>Offline: Works without internet</span>
                  </div>
                  <p className="text-xs text-green-700 mt-2">{provider.setupInstructions}</p>
                </div>
              ))}
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={() => setStep(1)}
              disabled={!selectedProvider}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Configure */}
      {step === 1 && selectedProvider && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">
            Configure {selectedProviderInfo?.name}
          </h2>

          {/* Cloud provider configuration */}
          {selectedProviderInfo?.category === 'cloud' && (
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key
                </label>
                <input
                  type="password"
                  autoComplete="off"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={`Enter your ${selectedProviderInfo.name} API key`}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {selectedProviderInfo.setupInstructions}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a model</option>
                  {chatModels.map((model: AIModelInfo) => {
                    const modelId = model.id;
                    return (
                      <option key={modelId} value={modelId}>
                        {model.name} {model.recommended ? '(Recommended)' : ''} - {model.description}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedProvider !== 'anthropic' && embeddingModels.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Embedding Model (for RAG)
                  </label>
                  <select
                    value={selectedEmbeddingModel}
                    onChange={(e) => setSelectedEmbeddingModel(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select an embedding model</option>
                    {embeddingModels.map((model: AIModelInfo) => {
                      const modelId = model.id;
                      return (
                        <option key={modelId} value={modelId}>
                          {model.name} {model.recommended ? '(Recommended)' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Anthropic embedding configuration */}
              {selectedProvider === 'anthropic' && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 mb-3">
                    Anthropic does not provide embeddings. Choose an alternative for RAG:
                  </p>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="embeddingProvider"
                        value="foundry_local"
                        checked={anthropicEmbeddingProvider === 'foundry_local'}
                        onChange={() => setAnthropicEmbeddingProvider('foundry_local')}
                      />
                      <span className="text-sm">Foundry Local (Free, on-device)</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="embeddingProvider"
                        value="openai"
                        checked={anthropicEmbeddingProvider === 'openai'}
                        onChange={() => setAnthropicEmbeddingProvider('openai')}
                      />
                      <span className="text-sm">OpenAI (Requires separate API key)</span>
                    </label>

                    {anthropicEmbeddingProvider === 'openai' && (
                      <input
                        type="password"
                        autoComplete="off"
                        value={anthropicEmbeddingApiKey}
                        onChange={(e) => setAnthropicEmbeddingApiKey(e.target.value)}
                        placeholder="Enter OpenAI API key for embeddings"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      />
                    )}
                  </div>
                </div>
              )}
            </form>
          )}

          {/* Foundry Local configuration */}
          {selectedProvider === 'foundry_local' && (
            <div className="space-y-4">
              {/* Service status */}
              {foundryStatus && (
                <div
                  className={`p-4 rounded-lg ${foundryStatus.running
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${foundryStatus.running ? 'bg-green-500' : 'bg-red-500'
                        }`}
                    />
                    <span className={foundryStatus.running ? 'text-green-800' : 'text-red-800'}>
                      {foundryStatus.running
                        ? 'Foundry Local is running'
                        : 'Foundry Local is not running'}
                    </span>
                  </div>
                  {foundryStatus.hardwareInfo && (
                    <p className="text-sm text-green-700 mt-2">
                      Hardware: {foundryStatus.hardwareInfo.accelerationType}
                      {foundryStatus.hardwareInfo.loadedModels.length > 0 &&
                        ` | Models: ${foundryStatus.hardwareInfo.loadedModels.map((m) => m.name).join(', ')}`}
                    </p>
                  )}
                  {!foundryStatus.running && (
                    <p className="text-sm text-red-700 mt-2">
                      Start Foundry Local with: <code className="bg-red-100 px-2 py-0.5 rounded">foundry service start</code>
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Endpoint URL
                </label>
                <input
                  type="text"
                  value={foundryEndpoint}
                  onChange={(e) => setFoundryEndpoint(e.target.value)}
                  placeholder="http://127.0.0.1:55588/v1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model
                </label>
                <select
                  value={foundryModel}
                  onChange={(e) => setFoundryModel(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  {selectedProviderInfo?.models
                    .filter((m: AIModelInfo) => m.category === 'chat')
                    .map((model: AIModelInfo) => (
                      <option key={model.id} value={model.id}>
                        {model.name} - {model.description}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Run <code className="bg-gray-100 px-1 rounded">foundry model run {foundryModel}</code> to load this model
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep(0)}
              className="px-6 py-2 text-gray-600 hover:text-gray-800"
            >
              Back
            </button>
            <button
              onClick={() => setStep(2)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Test & Save */}
      {step === 2 && selectedProvider && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Test Connection & Save</h2>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">Configuration Summary</h3>
            <dl className="space-y-1 text-sm">
              <div className="flex">
                <dt className="w-32 text-gray-500">Provider:</dt>
                <dd className="text-gray-900">{selectedProviderInfo?.name}</dd>
              </div>
              {selectedProviderInfo?.category === 'cloud' && (
                <>
                  <div className="flex">
                    <dt className="w-32 text-gray-500">API Key:</dt>
                    <dd className="text-gray-900">{apiKey ? '********' : 'Not set'}</dd>
                  </div>
                  <div className="flex">
                    <dt className="w-32 text-gray-500">Model:</dt>
                    <dd className="text-gray-900">{selectedModel || 'Default'}</dd>
                  </div>
                </>
              )}
              {selectedProvider === 'foundry_local' && (
                <>
                  <div className="flex">
                    <dt className="w-32 text-gray-500">Endpoint:</dt>
                    <dd className="text-gray-900">{foundryEndpoint}</dd>
                  </div>
                  <div className="flex">
                    <dt className="w-32 text-gray-500">Model:</dt>
                    <dd className="text-gray-900">{foundryModel}</dd>
                  </div>
                </>
              )}
            </dl>
          </div>

          {/* Test connection button */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleTestConnection}
              disabled={testLoading}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            >
              {testLoading ? 'Testing...' : 'Test Connection'}
            </button>

            {testResult && (
              <div
                className={`flex items-center gap-2 ${testResult.success ? 'text-green-600' : 'text-red-600'
                  }`}
              >
                {testResult.success ? '✓' : '✗'} {testResult.message}
                {testResult.latencyMs && (
                  <span className="text-gray-500 text-sm">({testResult.latencyMs}ms)</span>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between mt-6 pt-6 border-t">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-2 text-gray-600 hover:text-gray-800"
            >
              Back
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
