'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FileText, Calendar, Beaker, Rocket, Bug, Settings, BookOpen, Activity, GitPullRequest, Kanban, Play } from 'lucide-react';
import { clsx } from 'clsx';

const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Requirements', href: '/requirements', icon: FileText },
    { name: 'Planning', href: '/planning', icon: Calendar },
    { name: 'Sprint Board', href: '/sprints/current', icon: Kanban },
    { name: 'Test Cases', href: '/tests', icon: Beaker },
    { name: 'Test Runs', href: '/runs', icon: Play },
    { name: 'Issues', href: '/issues', icon: Bug },
    { name: 'Releases', href: '/releases', icon: Rocket },
    { name: 'Automation', href: '/testing/automation', icon: GitPullRequest },
    { name: 'Metrics', href: '/metrics', icon: Activity },
];

const secondaryNavigation = [
    { name: 'Documentation', href: '/docs', icon: BookOpen },
    { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="flex h-full w-64 flex-col border-r bg-card">
            <div className="flex h-16 shrink-0 items-center px-6">
                <div className="flex items-center gap-2 font-bold text-xl text-primary">
                    <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
                        Q
                    </div>
                    QANexus
                </div>
            </div>

            <div className="flex flex-1 flex-col gap-y-7 overflow-y-auto px-6 pb-4">
                <nav className="flex flex-1 flex-col">
                    <ul role="list" className="flex flex-1 flex-col gap-y-7">
                        <li>
                            <ul role="list" className="-mx-2 space-y-1">
                                {navigation.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <li key={item.name}>
                                            <Link
                                                href={item.href}
                                                className={clsx(
                                                    isActive
                                                        ? 'bg-primary/10 text-primary'
                                                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                                                    'group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6'
                                                )}
                                            >
                                                <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                                                {item.name}
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </li>

                        <li className="mt-auto">
                            <div className="text-xs font-semibold leading-6 text-muted-foreground">Shortcuts</div>
                            <ul role="list" className="-mx-2 mt-2 space-y-1">
                                {secondaryNavigation.map((item) => (
                                    <li key={item.name}>
                                        <Link
                                            href={item.href}
                                            className="group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                        >
                                            <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                                            {item.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </li>
                    </ul>
                </nav>
            </div>
        </div>
    );
}
