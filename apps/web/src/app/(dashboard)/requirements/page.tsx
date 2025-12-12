'use client';

import { FileText, Plus, Search, Loader2, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { requirementsApi } from '@/services/requirements.service';
import { documentsApi } from '@/services/documents.service';
import { Requirement } from '@/types/requirement';
import { DocumentStatus, Document as AppDocument } from '@/types/document';

const stateColors: Record<string, string> = {
  DRAFT: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800',
  PUBLISHED: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  NEEDS_REVISION: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  READY: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800',
  APPROVED: 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
  BACKLOGGED: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
};

const rqsColor = (score: number) => {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-yellow-500';
  return 'text-red-500';
};

export default function RequirementsPage() {
  const [viewMode, setViewMode] = useState<'documents' | 'list'>('documents');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<AppDocument[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Move loadDocuments outside useEffect or use useCallback, but for simplicity in this refactor:
  // We can keep them inside or just suppress the warning if acceptable, but better to fix.
  // actually, let's keep it simple.

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        setIsLoading(true);
        const allDocs = await documentsApi.list();
        const readyDocs = allDocs.filter((doc) =>
          doc.status === DocumentStatus.READY_FOR_IMPLEMENTATION ||
          doc.status === DocumentStatus.FINAL
        );
        setDocuments(readyDocs);
        setError(null);
      } catch (err) {
        setError('Failed to load documents');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    const fetchReqs = async () => {
      try {
        setIsLoading(true);
        const data = await requirementsApi.list();
        setRequirements(data);
        setError(null);
      } catch (err) {
        setError('Failed to load requirements');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (viewMode === 'documents') {
      fetchDocs();
    } else {
      fetchReqs();
    }
  }, [viewMode]); // selectedDocumentId doesn't need to trigger reload, it filters locally or we could fetch filtered.

  // Removed separate loadDocuments/loadRequirements function definitions to avoid dependency array issues


  const handleDocumentClick = (docId: string) => {
    setSelectedDocumentId(docId);
    setViewMode('list');
    setSearchQuery(''); // Reset search when switching context
  };

  const handleBackToDocuments = () => {
    setSelectedDocumentId(null);
    setViewMode('documents');
    setSearchQuery('');
  };

  // Filter logic
  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRequirements = requirements.filter(req => {
    // Must belong to selected document if in list mode
    if (viewMode === 'list' && selectedDocumentId) {
      if (req.sourceDocumentId !== selectedDocumentId) return false;
    }

    return (
      req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.content?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const selectedDocument = documents.find(d => d.id === selectedDocumentId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {viewMode === 'documents' ? 'Requirements' : `Requirements: ${selectedDocument?.title || 'Unknown Document'}`}
          </h1>
          <p className="text-muted-foreground">
            {viewMode === 'documents'
              ? 'Select a finalized document to view its requirements.'
              : 'Manage linked requirements for this document.'}
          </p>
        </div>

        {viewMode === 'list' && (
          <div className="flex gap-2">
            <button
              onClick={handleBackToDocuments}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Back to Documents
            </button>
            <Link
              href={`/requirements/new?documentId=${selectedDocumentId}`}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Requirement
            </Link>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            placeholder={viewMode === 'documents' ? "Search documents..." : "Search requirements..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-input bg-background pl-9 pr-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {viewMode === 'documents'
            ? `${filteredDocuments.length} document${filteredDocuments.length !== 1 ? 's' : ''}`
            : `${filteredRequirements.length} requirement${filteredRequirements.length !== 1 ? 's' : ''}`
          }
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="text-red-500">{error}</p>
        </div>
      ) : (
        <>
          {viewMode === 'documents' ? (
            // --- DOCUMENT GRID VIEW ---
            filteredDocuments.length === 0 ? (
              <div className="rounded-md border bg-card p-12 text-center text-muted-foreground">
                <FileText className="mx-auto h-12 w-12 opacity-20 mb-4" />
                <p>No finalized documents found matching your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDocuments.map(doc => (
                  <div
                    key={doc.id}
                    onClick={() => handleDocumentClick(doc.id)}
                    className="group relative flex flex-col justify-between rounded-lg border bg-card p-6 shadow-sm transition-all hover:shadow-md cursor-pointer hover:border-primary/50"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold leading-none tracking-tight group-hover:text-primary transition-colors mb-2">
                          {doc.title}
                        </h3>
                      </div>
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                        {doc.status.replace(/_/g, ' ')}
                      </span>
                      <p className="mt-4 text-sm text-muted-foreground line-clamp-2">
                        {doc.requirementsCount !== undefined
                          ? `${doc.requirementsCount} Requirements linked`
                          : 'No requirements linked yet'}
                      </p>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            // --- REQUIREMENTS LIST VIEW ---
            filteredRequirements.length === 0 ? (
              <div className="rounded-md border bg-card">
                <div className="p-6 text-center text-muted-foreground">
                  <FileText className="mx-auto h-12 w-12 opacity-20 mb-4" />
                  <p>
                    {searchQuery
                      ? 'No requirements match your search.'
                      : 'No requirements found for this document.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-md border bg-card divide-y">
                <div className="flex items-center px-4 py-3 bg-muted/40 font-medium text-sm text-muted-foreground">
                  <div className="flex-1">Requirement Name</div>
                  <div className="w-24 text-center">Tasks</div>
                  <div className="w-24 text-right">RQS</div>
                  <div className="w-10"></div>
                </div>

                {filteredRequirements.map((req) => (
                  <div
                    key={req.id}
                    className="px-4 py-4 hover:bg-muted/50 transition-colors flex items-center gap-4"
                  >
                    {/* Name Column */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Link
                          href={`/requirements/${req.id}`}
                          className="font-medium hover:text-primary truncate"
                        >
                          {req.title}
                        </Link>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${stateColors[req.state]}`}>
                          {req.state}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {req.content || 'No content'}
                      </p>
                    </div>

                    {/* Tasks Column */}
                    <div className="w-24 text-center">
                      <Link href={`/requirements/${req.id}`} className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary hover:bg-secondary/80 text-secondary-foreground">
                        {req.sprintItems?.length || 0} Tasks
                      </Link>
                    </div>

                    {/* RQS Column */}
                    <div className="w-24 flex justify-end">
                      {req.rqsScore !== undefined ? (
                        <div className="text-center">
                          <p className={`text-lg font-bold ${rqsColor(req.rqsScore)}`}>
                            {req.rqsScore}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>

                    {/* Action */}
                    <div className="w-10 flex justify-end">
                      <Link
                        href={`/requirements/${req.id}`}
                        className="p-2 rounded-md hover:bg-muted"
                      >
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
