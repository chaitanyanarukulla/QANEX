'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { documentsApi, Document } from '@/lib/api';
import { Loader2, Plus, Search, FileText, Upload, Brain } from 'lucide-react';
import Link from 'next/link';

export default function DocumentsPage() {
    const router = useRouter();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [isUploading, setIsUploading] = useState(false);

    const [showImportModal, setShowImportModal] = useState(false);
    const [importForm, setImportForm] = useState({
        siteUrl: '',
        email: '',
        apiToken: '',
        pageId: '',
    });

    useEffect(() => {
        loadDocuments();
    }, []);

    const loadDocuments = async () => {
        try {
            const data = await documentsApi.list();
            setDocuments(data);
        } catch (error) {
            console.error('Failed to load documents:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async () => {
        try {
            const newDoc = await documentsApi.create({
                title: 'Untitled Document',
                content: '',
                source: 'MANUAL',
            });
            router.push(`/documents/${newDoc.id}`);
        } catch (error) {
            console.error('Failed to create document:', error);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const newDoc = await documentsApi.upload(file);
            router.push(`/documents/${newDoc.id}`);
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Failed to upload file');
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    const handleConfluenceImport = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUploading(true);
        try {
            const newDoc = await documentsApi.importConfluence(importForm);
            router.push(`/documents/${newDoc.id}`);
        } catch (error) {
            console.error('Import failed:', error);
            alert('Failed to import from Confluence. Check credentials.');
        } finally {
            setIsUploading(false);
            setShowImportModal(false);
        }
    };

    const filteredDocs = documents.filter(doc =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 relative">
            {showImportModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
                        <h2 className="mb-4 text-lg font-bold">Import from Confluence Cloud</h2>
                        <form onSubmit={handleConfluenceImport} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium">Confluence URL (e.g. https://myco.atlassian.net)</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full rounded-md border p-2"
                                    value={importForm.siteUrl}
                                    onChange={e => setImportForm({ ...importForm, siteUrl: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium">Email</label>
                                <input
                                    required
                                    type="email"
                                    className="w-full rounded-md border p-2"
                                    value={importForm.email}
                                    onChange={e => setImportForm({ ...importForm, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium">API Token</label>
                                <input
                                    required
                                    type="password"
                                    className="w-full rounded-md border p-2"
                                    value={importForm.apiToken}
                                    onChange={e => setImportForm({ ...importForm, apiToken: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium">Page ID</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full rounded-md border p-2"
                                    value={importForm.pageId}
                                    onChange={e => setImportForm({ ...importForm, pageId: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    disabled={isUploading}
                                    onClick={() => setShowImportModal(false)}
                                    className="rounded-md px-4 py-2 text-sm hover:bg-muted"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUploading}
                                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                                >
                                    {isUploading ? 'Importing...' : 'Import'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
                    <p className="text-muted-foreground">Manage BRDs, PRDs, and specifications.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                        <Brain className="mr-2 h-4 w-4" />
                        Sync Confluence
                    </button>
                    <div className="relative">
                        <input
                            type="file"
                            accept=".pdf,.docx,.txt,.md"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                            onChange={handleFileUpload}
                            disabled={isUploading}
                        />
                        <button
                            disabled={isUploading}
                            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                        >
                            {isUploading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Upload className="mr-2 h-4 w-4" />
                            )}
                            {isUploading ? 'Uploading...' : 'Upload'}
                        </button>
                    </div>
                    <button
                        onClick={handleCreate}
                        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        New Document
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search documents..."
                        className="w-full rounded-md border border-input bg-background pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : filteredDocs.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed text-center">
                    <FileText className="h-10 w-10 text-muted-foreground/50" />
                    <h3 className="mt-4 text-lg font-semibold">No documents found</h3>
                    <p className="text-muted-foreground">Create a new document to get started.</p>
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredDocs.map((doc) => (
                        <Link
                            key={doc.id}
                            href={`/documents/${doc.id}`}
                            className="group relative flex flex-col justify-between rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
                        >
                            <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                    <div className="rounded-md bg-primary/10 p-2 text-primary">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    {doc.aiReview && (
                                        <div className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                                            AI Reviewed
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-semibold leading-none tracking-tight group-hover:text-primary transition-colors">
                                        {doc.title}
                                    </h3>
                                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                                        {doc.requirementsCount !== undefined && (
                                            <span className="inline-flex items-center rounded-sm bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                                                {doc.requirementsCount} Requirements
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                                <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
                                <span className={`uppercase font-medium ${doc.status === 'FINAL' ? 'text-green-600' : 'text-yellow-600'
                                    }`}>
                                    {doc.status}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
