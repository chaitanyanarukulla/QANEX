'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('general');

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Organization Settings</h1>
                    <p className="text-muted-foreground">Manage your organization preferences and team members.</p>
                </div>
            </div>

            <div className="border-b">
                <nav className="-mb-px flex gap-6" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`border-b-2 py-4 text-sm font-medium ${activeTab === 'general'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:border-gray-300 hover:text-foreground'
                            }`}
                    >
                        General & Thresholds
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`border-b-2 py-4 text-sm font-medium ${activeTab === 'users'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:border-gray-300 hover:text-foreground'
                            }`}
                    >
                        Users & Roles
                    </button>
                </nav>
            </div>

            <div className="pt-4">
                {activeTab === 'general' && <GeneralSettings />}
                {activeTab === 'users' && <UsersSettings />}
            </div>
        </div>
    );
}

function GeneralSettings() {
    const { showToast } = useToast();

    const handleSave = () => {
        // Mock save logic
        showToast('Settings saved successfully', 'success');
    };

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                <h3 className="text-lg font-semibold leading-none tracking-tight mb-4">Quality Gates</h3>
                <div className="space-y-4">
                    <div className="grid gap-2">
                        <label htmlFor="rqs" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Requirement Quality Score (RQS) Threshold
                        </label>
                        <input
                            type="number"
                            id="rqs"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="e.g. 70"
                            defaultValue={70}
                        />
                        <p className="text-[0.8rem] text-muted-foreground">
                            Requirements below this score will be flagged as needing revision.
                        </p>
                    </div>

                    <div className="grid gap-2">
                        <label htmlFor="rcs" className="text-sm font-medium leading-none">
                            Release Confidence Score (RCS) - Production
                        </label>
                        <input
                            type="number"
                            id="rcs"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            placeholder="e.g. 90"
                            defaultValue={90}
                        />
                    </div>
                </div>
                <div className="mt-6">
                    <button
                        onClick={handleSave}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

function UsersSettings() {
    const users = [
        { name: 'Admin User', email: 'admin@acme.com', role: 'ORG_ADMIN' },
        { name: 'Jane Doe', email: 'jane@acme.com', role: 'QA' },
        { name: 'John Smith', email: 'john@acme.com', role: 'DEV' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <button className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                    Invite User
                </button>
            </div>

            <div className="rounded-md border">
                <table className="w-full caption-bottom text-sm text-left">
                    <thead className="[&_tr]:border-b">
                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Name</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Email</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Role</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                        {users.map((user) => (
                            <tr key={user.email} className="border-b transition-colors hover:bg-muted/50">
                                <td className="p-4 align-middle font-medium">{user.name}</td>
                                <td className="p-4 align-middle">{user.email}</td>
                                <td className="p-4 align-middle">
                                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                                        {user.role}
                                    </span>
                                </td>
                                <td className="p-4 align-middle text-right">
                                    <button className="text-sm font-medium text-primary hover:underline">Edit</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
