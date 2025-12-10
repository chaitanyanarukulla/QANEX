'use client';

import { useState } from 'react';
import { Users, UserPlus, Mail, Shield } from 'lucide-react';

const MOCK_USERS = [
    { id: '1', name: 'Alice Admin', email: 'alice@qanexus.com', role: 'ADMIN', status: 'Active' },
    { id: '2', name: 'Bob Developer', email: 'bob@qanexus.com', role: 'MEMBER', status: 'Active' },
    { id: '3', name: 'Charlie Tester', email: 'charlie@qanexus.com', role: 'MEMBER', status: 'Invited' },
];

export default function TeamPage() {
    const [users, setUsers] = useState(MOCK_USERS);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Team Management</h1>
                    <p className="text-muted-foreground">Manage your team members and roles.</p>
                </div>
                <button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite Member
                </button>
            </div>

            <div className="rounded-md border bg-card">
                <div className="p-4 border-b bg-muted/40 font-medium text-sm text-muted-foreground grid grid-cols-12 gap-4">
                    <div className="col-span-4">User</div>
                    <div className="col-span-4">Email</div>
                    <div className="col-span-2">Role</div>
                    <div className="col-span-2">Status</div>
                </div>
                <div className="divide-y">
                    {users.map((user) => (
                        <div key={user.id} className="p-4 grid grid-cols-12 gap-4 items-center hover:bg-muted/50 transition-colors">
                            <div className="col-span-4 flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs ring-1 ring-primary/20">
                                    {user.name.charAt(0)}
                                </div>
                                <div className="font-medium text-sm">{user.name}</div>
                            </div>
                            <div className="col-span-4 flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {user.email}
                            </div>
                            <div className="col-span-2">
                                <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${user.role === 'ADMIN'
                                        ? 'bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-900/10 dark:text-purple-400 dark:ring-purple-400/20'
                                        : 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/10 dark:text-blue-400 dark:ring-blue-400/20'
                                    }`}>
                                    <Shield className="h-3 w-3" />
                                    {user.role}
                                </span>
                            </div>
                            <div className="col-span-2">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
                   ${user.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'}`}>
                                    {user.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
