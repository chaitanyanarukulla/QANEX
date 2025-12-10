'use client';

import { useState } from 'react';
import { Database, Plus, Search, FileText } from 'lucide-react';

const MOCK_TEST_CASES = [
    { id: '1', title: 'Verify User Login with Valid Credentials', priority: 'CRITICAL', requirement: 'User Login with SSO' },
    { id: '2', title: 'Verify Login with Invalid Password', priority: 'HIGH', requirement: 'User Login with SSO' },
    { id: '3', title: 'Verify SSO Redirection', priority: 'MEDIUM', requirement: 'User Login with SSO' },
    { id: '4', title: 'Verify PDF Export Format', priority: 'MEDIUM', requirement: 'Export Reports to PDF' },
];

export default function TestRepositoryPage() {
    const [testCases, setTestCases] = useState(MOCK_TEST_CASES);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Test Repository</h1>
                    <p className="text-muted-foreground">Manage and organize your test cases.</p>
                </div>
                <button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
                    <Plus className="mr-2 h-4 w-4" />
                    New Test Case
                </button>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                        type="search"
                        placeholder="Search test cases..."
                        className="w-full rounded-md border border-input bg-background pl-9 pr-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                </div>
            </div>

            <div className="rounded-md border bg-card">
                <div className="p-4 border-b bg-muted/40 grid grid-cols-12 gap-4 font-medium text-sm text-muted-foreground">
                    <div className="col-span-6">Title</div>
                    <div className="col-span-2">Priority</div>
                    <div className="col-span-4">Requirement</div>
                </div>
                <div className="divide-y">
                    {testCases.map((tc) => (
                        <div key={tc.id} className="p-4 grid grid-cols-12 gap-4 items-center hover:bg-muted/50 transition-colors">
                            <div className="col-span-6 font-medium flex items-center gap-2">
                                <FileText className="h-4 w-4 text-blue-500" />
                                {tc.title}
                            </div>
                            <div className="col-span-2">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium 
                  ${tc.priority === 'CRITICAL' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                        tc.priority === 'HIGH' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                    {tc.priority}
                                </span>
                            </div>
                            <div className="col-span-4 text-sm text-muted-foreground">
                                {tc.requirement}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
