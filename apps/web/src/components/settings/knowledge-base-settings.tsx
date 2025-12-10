import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { aiApi, SearchResult } from '@/lib/api';
import { Trash2, RefreshCw, FileText, Bug, CheckSquare, Search } from 'lucide-react';

export function KnowledgeBaseSettings() {
    const { showToast } = useToast();
    const [documents, setDocuments] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const loadDocuments = async () => {
        try {
            setLoading(true);
            const docs = await aiApi.listDocuments();
            setDocuments(docs);
        } catch (error) {
            console.error('Failed to load documents', error);
            showToast('Failed to load knowledge base', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDocuments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure? This removes the item from AI memory, but keeps the original record.')) return;

        try {
            await aiApi.deleteDocument(id);
            setDocuments(documents.filter(d => d.id !== id));
            showToast('Document removed from AI memory', 'success');
        } catch (error) {
            console.error('Failed to delete document', error);
            showToast('Failed to delete document', 'error');
        }
    };

    const handleReindex = async () => {
        if (!confirm('This will scan all Requirements and Bugs and re-add them to the AI index. Continue?')) return;

        try {
            setLoading(true);
            const result = await aiApi.reindex();
            showToast(`Re-indexed ${result.indexed.total} items successfully`, 'success');
            await loadDocuments();
        } catch (error) {
            console.error('Failed to reindex', error);
            showToast('Failed to reindex content', 'error');
            setLoading(false);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'REQUIREMENT': return <FileText className="h-4 w-4 text-blue-500" />;
            case 'BUG': return <Bug className="h-4 w-4 text-red-500" />;
            case 'TEST': return <CheckSquare className="h-4 w-4 text-green-500" />;
            default: return <FileText className="h-4 w-4 text-gray-500" />;
        }
    };

    const filteredDocs = documents.filter(doc =>
        doc.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.metadata?.title?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold leading-none tracking-tight">AI Knowledge Base</h3>
                        <p className="text-sm text-muted-foreground mt-2">
                            View and manage the data indexed by the AI. Deleting items here prevents the AI from using them in answers.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleReindex}
                            disabled={loading}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3"
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Rebuild Index
                        </button>
                        <button
                            onClick={loadDocuments}
                            disabled={loading}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                <div className="flex items-center space-x-2 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search indexed items..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 pl-9 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                </div>

                <div className="rounded-md border">
                    <table className="w-full caption-bottom text-sm text-left">
                        <thead className="[&_tr]:border-b">
                            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                <th className="h-10 px-4 align-middle font-medium text-muted-foreground w-[100px]">Type</th>
                                <th className="h-10 px-4 align-middle font-medium text-muted-foreground">Title / Content Preview</th>
                                <th className="h-10 px-4 align-middle font-medium text-muted-foreground w-[100px] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="[&_tr:last-child]:border-0">
                            {loading && documents.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="p-4 text-center text-muted-foreground">Loading indices...</td>
                                </tr>
                            ) : filteredDocs.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="p-4 text-center text-muted-foreground">No indexed documents found.</td>
                                </tr>
                            ) : (
                                filteredDocs.map((doc) => (
                                    <tr key={doc.id} className="border-b transition-colors hover:bg-muted/50">
                                        <td className="p-4 align-middle">
                                            <div className="flex items-center gap-2">
                                                {getIcon(doc.type)}
                                                <span className="text-xs font-medium">{doc.type}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-medium truncate max-w-[400px]">
                                                    {doc.metadata?.title || doc.id}
                                                </span>
                                                <span className="text-xs text-muted-foreground truncate max-w-[400px]">
                                                    {doc.content.substring(0, 100)}...
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 align-middle text-right">
                                            <button
                                                onClick={() => handleDelete(doc.id)}
                                                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-destructive hover:bg-destructive/10 h-8 w-8"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="mt-4 text-xs text-muted-foreground text-center">
                    Showing {filteredDocs.length} of {documents.length} items
                </div>
            </div>
        </div>
    );
}
