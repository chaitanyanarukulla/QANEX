import { FileText, Plus, Search } from 'lucide-react';
import Link from 'next/link';

export default function RequirementsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Requirements</h1>
                    <p className="text-muted-foreground">Manage and track product requirements.</p>
                </div>
                <Link
                    href="/requirements/new"
                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                >
                    <Plus className="mr-2 h-4 w-4" />
                    New Requirement
                </Link>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                        type="search"
                        placeholder="Search requirements..."
                        className="w-full rounded-md border border-input bg-background pl-9 pr-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                </div>
            </div>

            <div className="rounded-md border bg-card">
                <div className="p-6 text-center text-muted-foreground">
                    <FileText className="mx-auto h-12 w-12 opacity-20 mb-4" />
                    <p>No requirements found. Create one to get started.</p>
                </div>
            </div>
        </div>
    );
}
