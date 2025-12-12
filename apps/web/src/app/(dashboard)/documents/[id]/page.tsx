'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { documentsApi } from '@/services/documents.service';
import { Document, DocumentStatus } from '@/types/document';
import { Loader2, Save, ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { AiReviewPanel } from '@/components/documents/AiReviewPanel';
import { useToast } from '@/components/ui/use-toast';
import { EditorToolbar } from '@/components/editor/EditorToolbar';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';

export default function DocumentDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const { showToast } = useToast();

    const [document, setDocument] = useState<Document | null>(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [status, setStatus] = useState<DocumentStatus>(DocumentStatus.DRAFT);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [detailsForm, setDetailsForm] = useState({
        description: '',
        version: '',
        tags: ''
    });
    const [showSidebar, setShowSidebar] = useState(true);

    // Initialize Tiptap editor
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
                alignments: ['left', 'center', 'right'],
            }),
        ],
        content,
        editable: true,
        immediatelyRender: false, // Fix SSR hydration issues
        onUpdate: ({ editor }) => {
            setContent(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg focus:outline-none max-w-none min-h-[600px] p-12 text-gray-900',
            },
        },
    });

    const loadDocument = useCallback(async () => {
        if (!id) return;
        try {
            const data = await documentsApi.get(id);
            setDocument(data);
            setTitle(data.title);
            setContent(data.content || '');
            setStatus(data.status);
            setDetailsForm({
                description: data.description || '',
                version: data.version || '1.0',
                tags: data.tags?.join(', ') || ''
            });

            if (editor && data.content) {
                editor.commands.setContent(data.content);
            }
        } catch (error) {
            console.error('Failed to load document:', error);
        } finally {
            setIsLoading(false);
        }
    }, [id, editor]);

    useEffect(() => {
        loadDocument();
    }, [loadDocument]);

    const handleSaveDetails = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!document) return;
        setIsSaving(true);
        try {
            const updated = await documentsApi.update(document.id, {
                title, // Keep title from main state
                description: detailsForm.description,
                version: detailsForm.version,
                tags: detailsForm.tags.split(',').map(t => t.trim()).filter(Boolean)
            });
            setDocument(updated);
            setShowDetailsModal(false);
            showToast("Details updated successfully", "success");
        } catch (error) {
            console.error('Failed to update details:', error);
            showToast("Failed to update details", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async (newStatus?: DocumentStatus) => {
        if (!document) return;
        setIsSaving(true);
        try {
            const dataToUpdate = {
                title,
                content: editor?.getHTML() || content,
                status: newStatus || status
            };

            const updated = await documentsApi.update(document.id, dataToUpdate);
            setDocument(updated);

            if (newStatus) {
                setStatus(newStatus);
                if (newStatus === DocumentStatus.AI_ANALYZING) {
                    showToast("Status updated. AI analysis started...", "info");
                } else if (newStatus === DocumentStatus.READY_FOR_IMPLEMENTATION) {
                    showToast("Status updated. Generating requirements...", "info");
                } else {
                    showToast("Document saved", "success");
                }
            } else {
                setLastSaved(new Date());
                showToast("Document saved", "success");
            }

            // Refresh to get AI results if status triggered them
            if (newStatus === DocumentStatus.AI_ANALYZING || newStatus === DocumentStatus.READY_FOR_IMPLEMENTATION) {
                setTimeout(() => loadDocument(), 2000);
            }

        } catch (error) {
            console.error('Failed to save document:', error);
            showToast("Failed to save changes", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value as DocumentStatus;
        await handleSave(newStatus);
    };

    const handleAnalyze = async () => {
        if (!document) return;

        // Save the document first
        setIsSaving(true);
        try {
            await documentsApi.update(document.id, {
                title,
                content: editor?.getHTML() || content,
                status
            });
        } catch (error) {
            console.error('Failed to save before analysis:', error);
            showToast("Failed to save document. Please save manually before analyzing.", "error");
            setIsSaving(false);
            return;
        }
        setIsSaving(false);

        // Start analysis
        setIsAnalyzing(true);
        showToast("AI analysis started...", "info");

        try {
            const review = await documentsApi.analyze(document.id);

            // Update document with new review
            setDocument(prev => prev ? { ...prev, aiReview: review } : null);

            // Show success feedback
            showToast("✓ AI analysis completed successfully!", "success");

            // Refresh document to get any backend updates
            await loadDocument();
        } catch (error: unknown) {
            console.error('AI Analysis failed:', error);

            // Detailed error message for user
            const errorMessage = error instanceof Error && error.message
                ? error.message
                : "AI analysis failed. Please try again or contact support if this continues.";

            showToast(`Analysis failed: ${errorMessage}`, "error");
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

    const getStatusColor = (status: DocumentStatus) => {
        switch (status) {
            case DocumentStatus.READY_FOR_IMPLEMENTATION:
                return 'bg-green-50 text-green-700 border-green-200';
            case DocumentStatus.AI_ANALYZING:
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case DocumentStatus.IN_REVIEW:
                return 'bg-yellow-50 text-yellow-700 border-yellow-200';
            default:
                return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Details Modal */}
            {showDetailsModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
                        <h2 className="mb-4 text-xl font-semibold">Document Details</h2>
                        <form onSubmit={handleSaveDetails} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Description</label>
                                <textarea
                                    className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    rows={3}
                                    value={detailsForm.description}
                                    onChange={e => setDetailsForm({ ...detailsForm, description: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Version</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        value={detailsForm.version}
                                        onChange={e => setDetailsForm({ ...detailsForm, version: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Tags (comma separated)</label>
                                    <input
                                        type="text"
                                        className="mt-1 block w-full rounded-md border border-gray-300 p-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        value={detailsForm.tags}
                                        onChange={e => setDetailsForm({ ...detailsForm, tags: e.target.value })}
                                        placeholder="e.g. frontend, v1, urgent"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowDetailsModal(false)}
                                    className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {isSaving ? 'Saving...' : 'Save Details'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Top Navigation Bar */}
            <div className="flex items-center justify-between px-6 py-3 bg-white border-b">
                <div className="flex items-center gap-4 flex-1">
                    <Link href="/documents" className="rounded-full p-2 hover:bg-gray-100">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div className="flex flex-col">
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Document Title"
                            className="text-xl font-semibold text-gray-900 bg-transparent border-none outline-none focus:ring-0 px-0"
                        />
                        <button
                            onClick={() => setShowDetailsModal(true)}
                            className="text-xs text-blue-600 hover:underline text-left -mt-1"
                        >
                            v{document.version || '1.0'} • Edit Details
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {lastSaved && (
                        <span className="text-xs text-gray-500">
                            Saved {lastSaved.toLocaleTimeString()}
                        </span>
                    )}

                    <select
                        value={status}
                        onChange={handleStatusChange}
                        className={`text-xs px-3 py-1.5 rounded-full border ${getStatusColor(status)}`}
                    >
                        <option value={DocumentStatus.DRAFT}>Draft</option>
                        <option value={DocumentStatus.IN_REVIEW}>In Review</option>
                        <option value={DocumentStatus.AI_ANALYZING}>AI Analyzing</option>
                        <option value={DocumentStatus.FIXING_GAPS}>Fixing Gaps</option>
                        <option value={DocumentStatus.READY_FOR_IMPLEMENTATION}>Ready</option>
                        <option value={DocumentStatus.FINAL}>Final</option>
                    </select>

                    <button
                        onClick={() => handleSave()}
                        disabled={isSaving}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save
                    </button>

                    <button
                        onClick={handleDelete}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 border border-red-200"
                    >
                        <Trash2 className="h-4 w-4" />
                        Delete
                    </button>

                    <button
                        onClick={() => setShowSidebar(!showSidebar)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                    >
                        {showSidebar ? '→' : '←'}
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <EditorToolbar editor={editor} />

            {/* Main Content Area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Document Canvas */}
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-4xl mx-auto my-8">
                        <div className="bg-white shadow-lg rounded-lg overflow-hidden min-h-[800px]">
                            <EditorContent editor={editor} />
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                {showSidebar && (
                    <div className="w-[552px] border-l bg-white overflow-y-auto p-4">
                        <AiReviewPanel
                            review={document.aiReview}
                            isLoading={isAnalyzing}
                            onAnalyze={handleAnalyze}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
