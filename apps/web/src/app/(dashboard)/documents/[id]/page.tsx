'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { documentsApi, Document } from '@/lib/api';
import { Loader2, Save, ArrowLeft, Trash2, Check } from 'lucide-react';
import Link from 'next/link';
import { AiReviewPanel } from '@/components/documents/AiReviewPanel';
import { useToast } from '@/components/ui/use-toast';

export default function DocumentDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const { showToast } = useToast();

    const [document, setDocument] = useState<Document | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // ... (loadDocument code inferred to be correct as per previous restoration)
    const loadDocument = useCallback(async () => {
        if (!id) return;
        try {
            const data = await documentsApi.get(id);
            setDocument(data);
            setTitle(data.title);
            setContent(data.content);
        } catch (error) {
            console.error('Failed to load document:', error);
            // router.push('/documents'); // Handle 404
        } finally {
            setIsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        loadDocument();
    }, [loadDocument]);

    // ... (handleSave code inferred)
    const handleSave = async () => {
        if (!document) return;
        setIsSaving(true);
        try {
            const updated = await documentsApi.update(document.id, { title, content });
            setDocument(updated);
            setLastSaved(new Date());
        } catch (error) {
            console.error('Failed to save document:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleAnalyze = async () => {
        if (!document) return;
        setIsAnalyzing(true);
        // Save first to ensure analysis is on latest content
        await handleSave();

        try {
            const review = await documentsApi.analyze(document.id);
            setDocument(prev => prev ? { ...prev, aiReview: review } : null);
            showToast("Analysis Complete: AI review generated.", 'success');
        } catch (error: any) {
            console.error('Failed to analyze document:', error);
            showToast(error.message || "Failed to analyze document. Please try again.", 'error');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this document?')) return;
        try {
            await documentsApi.delete(id);
            router.push('/documents');
        } catch (error) {
            console.error('Failed to delete document:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!document) return <div>Document not found</div>;

    return (
        <div className="grid h-[calc(100vh-4rem)] grid-cols-1 gap-6 lg:grid-cols-2 overflow-hidden">
            {/* Editor Column */}
            <div className="flex flex-col h-full space-y-4">
                <div className="flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <Link href="/documents" className="rounded-full p-2 hover:bg-muted">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="bg-transparent text-xl font-bold outline-none focus:underline"
                            placeholder="Document Title"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        {lastSaved && (
                            <span className="text-xs text-muted-foreground mr-2">
                                Saved {lastSaved.toLocaleTimeString()}
                            </span>
                        )}
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="inline-flex items-center justify-center rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        </button>
                        <button
                            onClick={handleDelete}
                            className="inline-flex items-center justify-center rounded-md text-red-500 hover:bg-red-50 px-3 py-2"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 rounded-lg border bg-card p-1 shadow-sm overflow-hidden flex flex-col">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="h-full w-full resize-none bg-transparent p-4 outline-none font-mono text-sm leading-relaxed"
                        placeholder="Start typing your requirements specification..."
                    />
                </div>
            </div>

            {/* Analysis Column */}
            <div className="h-full overflow-y-auto pr-2 pb-6">
                <AiReviewPanel
                    review={document.aiReview}
                    isLoading={isAnalyzing}
                    onAnalyze={handleAnalyze}
                />

                {/* Future: Requirement Extraction Panel */}
            </div>
        </div>
    );
}
