'use client';

import { useState, useEffect } from 'react';
import { toast } from '@/components/toast';
import {
  readLLMConfig,
  writeLLMConfig,
  LLM_PROVIDERS,
  fetchLiveCerebrasModels,
  type LLMConfig,
} from '@/lib/llm-settings';
import { generateMissionTitle, testLLMConnection } from '@/lib/llm';
import {
  Sparkles,
  Eye,
  EyeOff,
  Check,
  Loader,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LLMSettingsPage() {
  const [config, setConfig] = useState<LLMConfig | null>(null);
  const [providerModels, setProviderModels] = useState<Record<string, string[]>>(
    () =>
      Object.fromEntries(
        Object.entries(LLM_PROVIDERS).map(([id, provider]) => [id, provider.models])
      )
  );
  const [showApiKey, setShowApiKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    setConfig(readLLMConfig());
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadLiveCerebrasModels = async () => {
      try {
        const models = await fetchLiveCerebrasModels();
        if (!cancelled) {
          setProviderModels((prev) => ({ ...prev, cerebras: models }));
        }
      } catch {
        // Keep static fallback list when live fetch fails.
      }
    };

    void loadLiveCerebrasModels();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!config) return;
    const options = providerModels[config.provider];
    if (!options || options.length === 0) return;
    if (options.includes(config.model)) return;
    const next = { ...config, model: options[0] };
    setConfig(next);
    writeLLMConfig(next);
  }, [config, providerModels]);

  if (!config) return null;

  const save = (patch: Partial<LLMConfig>) => {
    const next = { ...config, ...patch };
    setConfig(next);
    writeLLMConfig(next);
  };

  const handleProviderChange = (provider: string) => {
    const preset = LLM_PROVIDERS[provider];
    if (preset) {
      const liveModels = providerModels[provider] ?? preset.models;
      save({
        provider,
        baseUrl: preset.baseUrl,
        model: liveModels[0] ?? preset.defaultModel,
      });
    } else {
      save({ provider });
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    // Temporarily enable so generateMissionTitle reads an enabled config.
    // Only toggle the `enabled` flag — don't snapshot/restore the full config
    // to avoid clobbering edits the user makes while the async call is in flight.
    const wasEnabled = config.enabled;
    if (!wasEnabled) writeLLMConfig({ ...config, enabled: true });
    try {
      const probe = await testLLMConnection();
      if (!probe.ok) {
        toast.error(`Connection failed: ${probe.error ?? 'Unknown error'}`);
        return;
      }

      const title = await generateMissionTitle(
        'Fix the authentication bug in the login page',
        'I\'ll investigate the login flow and fix the session handling issue.'
      );
      const sample = title || probe.content || 'OK';
      if (sample) {
        setTestResult(sample);
        toast.success('LLM connection working');
      } else {
        toast.error('No response from LLM. Check your API key and base URL');
      }
    } catch (err) {
      toast.error(
        `LLM request failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    } finally {
      // Restore only the enabled flag we toggled, using the *current* config
      // so any other edits the user made during the test are preserved.
      if (!wasEnabled) {
        const current = readLLMConfig();
        writeLLMConfig({ ...current, enabled: wasEnabled });
      }
      setTesting(false);
    }
  };

  const providerInfo = LLM_PROVIDERS[config.provider];
  const modelOptions =
    providerModels[config.provider] ?? providerInfo?.models ?? [];

  return (
    <div className="flex-1 flex flex-col items-center p-6 overflow-auto">
      <div className="w-full max-w-xl space-y-6">
        <header>
          <h1 className="text-xl font-semibold text-white">LLM</h1>
          <p className="mt-1 text-sm text-white/50">
            Configure a fast LLM provider for dashboard features like
            auto-generated mission titles
          </p>
        </header>

        <div className="space-y-5">
          {/* Enable toggle */}
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                  <Sparkles className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-sm font-medium text-white">
                    LLM Integration
                  </h2>
                  <p className="text-xs text-white/40">
                    Enable AI-powered UX features in the dashboard
                  </p>
                </div>
              </div>
              <button
                onClick={() => save({ enabled: !config.enabled })}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  config.enabled ? 'bg-emerald-500' : 'bg-white/10'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 rounded-full bg-white transition-transform',
                    config.enabled ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>
          </div>

          {/* Provider config */}
          <div
            className={cn(
              'rounded-xl bg-white/[0.02] border border-white/[0.04] p-5 space-y-4 transition-opacity',
              !config.enabled && 'opacity-75 dark:opacity-40 pointer-events-none'
            )}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
                <Zap className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-sm font-medium text-white">Provider</h2>
                <p className="text-xs text-white/40">
                  Choose a fast LLM provider. Cerebras is recommended for speed
                </p>
              </div>
            </div>

            {/* Provider selector */}
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">
                Provider
              </label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(LLM_PROVIDERS).map(([id, p]) => (
                  <button
                    key={id}
                    onClick={() => handleProviderChange(id)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                      config.provider === id
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-white/[0.04] text-white/50 border border-transparent hover:bg-white/[0.06]'
                    )}
                  >
                    {p.name}
                  </button>
                ))}
                <button
                  onClick={() => handleProviderChange('custom')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                    !LLM_PROVIDERS[config.provider]
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'bg-white/[0.04] text-white/50 border border-transparent hover:bg-white/[0.06]'
                  )}
                >
                  Custom
                </button>
              </div>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">
                API Key
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={config.apiKey}
                  onChange={(e) => save({ apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="w-full rounded-lg bg-white/[0.04] border border-white/[0.06] px-3 py-2 pr-10 text-sm text-white placeholder:text-white/20 focus:border-indigo-500/40 focus:outline-none"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                >
                  {showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Base URL (shown for custom, or editable) */}
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">
                Base URL
              </label>
              <input
                type="text"
                value={config.baseUrl}
                onChange={(e) => save({ baseUrl: e.target.value })}
                placeholder="https://api.cerebras.ai/v1"
                className="w-full rounded-lg bg-white/[0.04] border border-white/[0.06] px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-indigo-500/40 focus:outline-none"
              />
            </div>

            {/* Model */}
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">
                Model
              </label>
              {modelOptions.length > 0 ? (
                <select
                  value={config.model}
                  onChange={(e) => save({ model: e.target.value })}
                  className="w-full rounded-lg bg-white/[0.04] border border-white/[0.06] px-3 py-2 text-sm text-white focus:border-indigo-500/40 focus:outline-none appearance-none"
                >
                  {modelOptions.map((m) => (
                    <option key={m} value={m} className="bg-[#1a1a2e]">
                      {m}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={config.model}
                  onChange={(e) => save({ model: e.target.value })}
                  placeholder="model-name"
                  className="w-full rounded-lg bg-white/[0.04] border border-white/[0.06] px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-indigo-500/40 focus:outline-none"
                />
              )}
            </div>

            {/* Test button */}
            <div className="pt-2">
              <button
                onClick={handleTest}
                disabled={!config.apiKey || testing}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                  config.apiKey && !testing
                    ? 'bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30'
                    : 'bg-white/[0.04] text-white/30 cursor-not-allowed'
                )}
              >
                {testing ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Test Connection
              </button>
              {testResult && (
                <p className="mt-2 text-xs text-emerald-400">
                  Generated title: &ldquo;{testResult}&rdquo;
                </p>
              )}
            </div>
          </div>

          {/* Features */}
          <div
            className={cn(
              'rounded-xl bg-white/[0.02] border border-white/[0.04] p-5 transition-opacity',
              !config.enabled && 'opacity-40 pointer-events-none'
            )}
          >
            <h2 className="text-sm font-medium text-white mb-4">Features</h2>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/80">
                  Auto-generate mission titles
                </p>
                <p className="text-xs text-white/40">
                  Use the LLM to create meaningful titles from mission content
                </p>
              </div>
              <button
                onClick={() => save({ autoTitle: !config.autoTitle })}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  config.autoTitle ? 'bg-emerald-500' : 'bg-white/10'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 rounded-full bg-white transition-transform',
                    config.autoTitle ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
