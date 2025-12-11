'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { KnowledgeBaseSettings } from '@/components/settings/knowledge-base-settings';
import { AiUsageChart } from '@/components/settings/AiUsageChart';
import { usersApi, TenantUser } from '@/lib/api';
import { Loader2, Plus, X, Check, Trash2, Pencil } from 'lucide-react';

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
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={`border-b-2 py-4 text-sm font-medium ${activeTab === 'ai'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:border-gray-300 hover:text-foreground'
                            }`}
                    >
                        Models & AI
                    </button>
                    <button
                        onClick={() => setActiveTab('knowledge')}
                        className={`border-b-2 py-4 text-sm font-medium ${activeTab === 'knowledge'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:border-gray-300 hover:text-foreground'
                            }`}
                    >
                        Knowledge Base
                    </button>
                </nav>
            </div>

            <div className="pt-4">
                {activeTab === 'general' && <GeneralSettings />}
                {activeTab === 'users' && <UsersSettings />}
                {activeTab === 'ai' && <AiSettings />}
                {activeTab === 'knowledge' && <KnowledgeBaseSettings />}
            </div>
        </div>
    );
}

function AiSettings() {
    return (
        <div className="space-y-6 max-w-2xl">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                <h3 className="text-lg font-semibold leading-none tracking-tight mb-4">AI Provider Configuration</h3>
                <p className="text-muted-foreground mb-6">
                    Configure your AI provider for requirement analysis, bug triage, RAG search, and more.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">☁️</span>
                            <span className="font-semibold">Option 1: Cloud APIs</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            OpenAI, Google Gemini, or Anthropic Claude with your own API key.
                        </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">💻</span>
                            <span className="font-semibold">Option 2: On-Device</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Microsoft Foundry Local - 100% local, no data egress, free.
                        </p>
                    </div>
                </div>

                <a
                    href="/settings/ai"
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                >
                    Configure AI Provider
                </a>

                <h2 className="text-xl font-semibold mb-4 text-foreground mt-8">Usage & Cost</h2>
                <div className="bg-card p-4 rounded-lg border shadow-sm">
                    <AiUsageChart />
                </div>
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
    const { showToast } = useToast();
    const [users, setUsers] = useState<TenantUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Invite State
    const [isInviting, setIsInviting] = useState(false);
    const [inviteForm, setInviteForm] = useState({
        email: '',
        firstName: '',
        lastName: '',
        role: 'VIEWER'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ firstName: '', lastName: '' });

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const data = await usersApi.list();
            setUsers(data);
        } catch (error) {
            console.error(error);
            showToast('Failed to load users', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const newUser = await usersApi.invite(inviteForm);
            setUsers(prev => [...prev, newUser]);
            setIsInviting(false);
            setInviteForm({ email: '', firstName: '', lastName: '', role: 'VIEWER' });
            showToast('User invited successfully', 'success');
        } catch (error) {
            console.error(error);
            showToast('Failed to invite user', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            await usersApi.updateRole(userId, newRole);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
            showToast('Role updated successfully', 'success');
        } catch (error) {
            console.error(error);
            showToast('Failed to update role', 'error');
        }
    };

    const startEdit = (user: TenantUser) => {
        setEditingId(user.id);
        setEditForm({ firstName: user.firstName, lastName: user.lastName });
    };

    const saveEdit = async (userId: string) => {
        try {
            await usersApi.update(userId, editForm);
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...editForm } : u));
            setEditingId(null);
            showToast('User updated successfully', 'success');
        } catch (error) {
            console.error(error);
            showToast('Failed to update user', 'error');
        }
    };

    const handleDelete = async (userId: string) => {
        if (!confirm('Are you sure you want to remove this user?')) return;
        try {
            await usersApi.delete(userId);
            setUsers(prev => prev.filter(u => u.id !== userId));
            showToast('User removed successfully', 'success');
        } catch (error) {
            console.error(error);
            showToast('Failed to remove user', 'error');
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Team Members</h3>
                <button
                    onClick={() => setIsInviting(!isInviting)}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
                >
                    {isInviting ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                    {isInviting ? 'Cancel' : 'Invite User'}
                </button>
            </div>

            {isInviting && (
                <form onSubmit={handleInvite} className="rounded-lg border bg-card p-4 space-y-4 animate-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">First Name</label>
                            <input
                                required
                                value={inviteForm.firstName}
                                onChange={e => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                placeholder="John"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Last Name</label>
                            <input
                                required
                                value={inviteForm.lastName}
                                onChange={e => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                placeholder="Doe"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <input
                                required
                                type="email"
                                value={inviteForm.email}
                                onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                placeholder="john@example.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Role</label>
                            <select
                                value={inviteForm.role}
                                onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value="VIEWER">Viewer</option>
                                <option value="DEV">Developer</option>
                                <option value="QA">QA Engineer</option>
                                <option value="PM">Product Manager</option>
                                <option value="ORG_ADMIN">Admin</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2"
                        >
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Send Invitation
                        </button>
                    </div>
                </form>
            )}

            <div className="rounded-md border">
                <table className="w-full caption-bottom text-sm text-left">
                    <thead className="[&_tr]:border-b">
                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Name</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Email</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Role</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right w-[180px]">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                        {users.map((user) => (
                            <tr key={user.id} className="border-b transition-colors hover:bg-muted/50">
                                <td className="p-4 align-middle font-medium">
                                    {editingId === user.id ? (
                                        <div className="flex gap-2">
                                            <input
                                                value={editForm.firstName}
                                                onChange={e => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                                                className="w-24 rounded-md border px-2 py-1 text-sm"
                                            />
                                            <input
                                                value={editForm.lastName}
                                                onChange={e => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                                                className="w-24 rounded-md border px-2 py-1 text-sm"
                                            />
                                        </div>
                                    ) : (
                                        `${user.firstName} ${user.lastName}`
                                    )}
                                </td>
                                <td className="p-4 align-middle">{user.email}</td>
                                <td className="p-4 align-middle">
                                    <select
                                        value={user.role}
                                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                        className="h-8 w-32 rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    >
                                        <option value="VIEWER">Viewer</option>
                                        <option value="DEV">Developer</option>
                                        <option value="QA">QA</option>
                                        <option value="PM">PM</option>
                                        <option value="ORG_ADMIN">Admin</option>
                                    </select>
                                </td>
                                <td className="p-4 align-middle text-right">
                                    <div className="flex justify-end gap-2">
                                        {editingId === user.id ? (
                                            <>
                                                <button
                                                    onClick={() => saveEdit(user.id)}
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-green-500/10 text-green-600 hover:bg-green-500/20"
                                                >
                                                    <Check className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => setEditingId(null)}
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-gray-500/10 text-gray-600 hover:bg-gray-500/20"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => startEdit(user)}
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
                                                >
                                                    <Pencil className="h-4 w-4 text-muted-foreground" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-red-500/10 text-red-500"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
