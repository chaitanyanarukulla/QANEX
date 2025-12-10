import Link from 'next/link';
import { Book, Code, Shield, Activity, Bug } from 'lucide-react';

export default function DocsPage() {
    const sections = [
        {
            title: 'Getting Started',
            icon: Book,
            items: [
                { label: 'What is TraceGate?', href: '#' },
                { label: 'Quickstart: Zero to RCS', href: '#' },
                { label: 'Key Concepts (Tenant, Project, RQS)', href: '#' },
            ]
        },
        {
            title: 'Core Workflows',
            icon: Code,
            items: [
                { label: 'Requirements & RQS Analysis', href: '#' },
                { label: 'Sprints & Planning Assistant', href: '#' },
                { label: 'Testing & TRS', href: '#' },
                { label: 'Bugs & Triage', href: '#' },
            ]
        },
        {
            title: 'Releases & Gates',
            icon: Shield,
            items: [
                { label: 'Understanding RCS (Release Confidence Score)', href: '#' },
                { label: 'Connecting CI/CD Pipelines', href: '#' },
                { label: 'Gate Policies', href: '#' },
            ]
        },
        {
            title: 'AI capabilities',
            icon: Activity,
            items: [
                { label: 'AI Modes (Cloud vs Local)', href: '#' },
                { label: 'Data Privacy & Observer Model', href: '#' },
            ]
        }
    ];

    return (
        <div className="max-w-4xl mx-auto py-10">
            <h1 className="text-3xl font-bold mb-2">Documentation & Knowledge Base</h1>
            <p className="text-muted-foreground mb-10 text-lg">
                Everything you need to know about TraceGate.
            </p>

            <div className="grid gap-6 md:grid-cols-2">
                {sections.map((section) => (
                    <div key={section.title} className="rounded-xl border bg-card p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <section.icon className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-semibold">{section.title}</h2>
                        </div>
                        <ul className="space-y-2">
                            {section.items.map(item => (
                                <li key={item.label}>
                                    <Link href={item.href} className="text-sm text-muted-foreground hover:text-primary hover:underline">
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <div className="mt-12 rounded-xl border border-dashed p-8 text-center">
                <h3 className="text-lg font-medium mb-2">Need more help?</h3>
                <p className="text-muted-foreground mb-4">Join our Beta Slack channel or contact support.</p>
                <button className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md font-medium">Contact Support</button>
            </div>
        </div>
    );
}
