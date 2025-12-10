'use client';

import { useState } from 'react';
import { Bot, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewRequirementPage() {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-8">
                <Link href="/requirements" className="p-2 hover:bg-muted rounded-full transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Requirement Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full bg-transparent text-3xl font-bold placeholder:text-muted-foreground/50 focus:outline-none"
                    />
                </div>
                <div className="flex gap-2">
                    <button className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
                        <Save className="mr-2 h-4 w-4" />
                        Save Draft
                    </button>
                    <button className="inline-flex items-center justify-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-purple-700">
                        <Bot className="mr-2 h-4 w-4" />
                        Analyze with AI
                    </button>
                </div>
            </div>

            <div className="min-h-[500px] rounded-lg border bg-card p-4">
                <textarea
                    placeholder="Describe the requirement in detail..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full h-full min-h-[500px] resize-none bg-transparent p-4 focus:outline-none"
                />
            </div>

            <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-900/50 dark:bg-purple-900/10">
                <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 mb-2">
                    <Bot className="h-4 w-4" />
                    <span className="text-sm font-medium">AI Insights Simulator</span>
                </div>
                <p className="text-sm text-muted-foreground">
                    Enter text above and click "Analyze with AI" to see the RQS Score.
                    (Try entering "TODO" or very short text to see warnings).
                </p>
            </div>
        </div>
    );
}
