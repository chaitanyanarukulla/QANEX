'use client';

import { useState, useEffect } from 'react';
import { tenantsApi, TenantSettings } from '@/lib/api';
import { ShieldCheck, Cloud, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export function AiStatusIndicator() {
    const { user } = useAuth();
    const [provider, setProvider] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchSettings = async () => {
        if (!user?.defaultTenantId) return;
        try {
            // We might need a lightweight "get public settings" endpoint if we want this to be super fast/cached
            // But for now, using the existing get is fine.
            const tenant = await tenantsApi.get(user.defaultTenantId);
            setProvider(tenant.settings?.aiConfig?.provider || 'foundry');
        } catch (err) {
            console.error('Failed to fetch AI settings for indicator', err);
            // Fallback or keep null
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, [user?.defaultTenantId]);

    if (isLoading) return null; // Or a small skeleton

    let icon = <Cloud className="w-4 h-4 text-blue-500" />;
    let label = 'Cloud AI';
    let description = 'Connected to Microsoft Foundry / Azure OpenAI. Data is processed in the cloud.';
    let colorClass = 'bg-blue-100 text-blue-700 border-blue-200';

    if (provider === 'local') {
        icon = <ShieldCheck className="w-4 h-4 text-green-600" />;
        label = 'Local Mode';
        description = 'Running on Local LLM (Ollama). No data leaves your infrastructure.';
        colorClass = 'bg-green-100 text-green-700 border-green-200';
    } else if (provider === 'azure') {
        icon = <Cloud className="w-4 h-4 text-blue-500" />;
        label = 'Azure AI';
        // Description same as cloud
    }

    return (
        <div className="relative group flex items-center">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${colorClass} text-xs font-medium cursor-help transition-all hover:bg-opacity-80`}>
                {icon}
                <span className="hidden sm:inline">{label}</span>
            </div>

            {/* Tooltip */}
            <div className="absolute top-full right-0 mt-2 w-64 p-3 bg-popover text-popover-foreground text-xs rounded-md shadow-md border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-50">
                <h4 className="font-semibold mb-1 flex items-center gap-2">
                    {icon} {label}
                </h4>
                <p className="text-muted-foreground leading-snug">
                    {description}
                </p>
                <div className="mt-2 pt-2 border-t text-[10px] text-muted-foreground flex justify-between">
                    <span>Provider: {provider}</span>
                    {provider === 'local' && <span className="text-green-600 font-semibold">✔ Zero Egress</span>}
                </div>
            </div>
        </div>
    );
}
