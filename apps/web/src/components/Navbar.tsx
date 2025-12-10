'use client';

import { Search, Bell, User, MessageSquare, LogOut, Loader2 } from 'lucide-react';
import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { FeedbackModal } from './feedback/FeedbackModal';
import { useAuth } from '@/contexts/AuthContext';
import { aiApi, SearchResult } from '@/lib/api';
import { AiStatusIndicator } from './AiStatusIndicator';

export function Navbar() {
    const { user, logout } = useAuth();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const searchTimeout = useRef<NodeJS.Timeout | null>(null);

    const performSearch = useCallback(async (searchQuery: string) => {
        if (searchQuery.length < 2) {
            setResults([]);
            setShowResults(false);
            return;
        }

        setIsSearching(true);
        try {
            // Use Agentic Search for better reasoning
            const searchResults = await aiApi.search(searchQuery, 'agentic');
            setResults(searchResults);
            setShowResults(true);
        } catch (err) {
            console.error('Search failed:', err);
            setResults([]);
            setShowResults(false);
        } finally {
            setIsSearching(false);
        }
    }, []);

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setQuery(val);

        // Debounce search
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        if (val.length > 2) {
            searchTimeout.current = setTimeout(() => {
                performSearch(val);
            }, 500); // Increased debounce for agentic
        } else {
            setResults([]);
            setShowResults(false);
        }
    };

    const getResultLink = (result: SearchResult): string => {
        switch (result.type) {
            case 'REQUIREMENT':
                return `/requirements/${result.id}`;
            case 'BUG':
                return `/issues`;
            case 'TEST':
                return `/tests`;
            case 'RELEASE':
                return `/releases/${result.id}`;
            // @ts-ignore
            case 'ANSWER':
                return '#';
            default:
                return '#';
        }
    };

    const getResultTitle = (result: SearchResult): string => {
        return result.metadata?.title || result.content.substring(0, 50);
    };

    return (
        <div className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-6">
            <div className="flex flex-1 items-center gap-4">
                <div className="relative w-full max-w-md">
                    {isSearching ? (
                        <Loader2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />
                    ) : (
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    )}
                    <input
                        type="search"
                        placeholder="Ask AI anything..."
                        className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
                        value={query}
                        onChange={handleSearch}
                        onBlur={() => setTimeout(() => setShowResults(false), 200)}
                        onFocus={() => query.length > 2 && setShowResults(true)}
                    />
                    {showResults && (
                        <div className="absolute top-full mt-1 w-full rounded-md border bg-popover p-2 shadow-md z-50 max-h-[80vh] overflow-y-auto">
                            {results.map(res => {
                                // @ts-ignore
                                if (res.type === 'ANSWER') {
                                    return (
                                        <div key={res.id} className="p-3 mb-2 bg-primary/5 rounded-md border border-primary/20">
                                            <div className="flex items-center gap-2 mb-2 text-primary font-semibold text-xs uppercase tracking-wider">
                                                <span className="text-lg">✨</span> AI Answer
                                            </div>
                                            <p className="text-sm text-foreground whitespace-pre-wrap">{res.content}</p>
                                        </div>
                                    );
                                }
                                return (
                                    <Link
                                        key={res.id}
                                        href={getResultLink(res)}
                                        className="block cursor-pointer rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                                        onClick={() => {
                                            setShowResults(false);
                                            setQuery('');
                                        }}
                                    >
                                        <span className="font-mono text-xs mr-2 text-muted-foreground">[{res.type}]</span>
                                        {getResultTitle(res)}
                                    </Link>
                                );
                            })}
                            {results.length === 0 && (
                                <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                                    No results found for &quot;{query}&quot;
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-4">
                {/* Org Switcher (Mock) */}
                <div className="hidden md:flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Org:</span>
                    <select className="bg-transparent font-medium outline-none">
                        <option>Acme Corp</option>
                        <option>Beta Inc</option>
                    </select>
                </div>

                <AiStatusIndicator />

                <button
                    onClick={() => setIsFeedbackOpen(true)}
                    className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-secondary text-secondary-foreground rounded-full hover:bg-secondary/80"
                >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Feedback
                </button>

                <button className="relative rounded-full bg-card p-1 text-muted-foreground hover:text-foreground">
                    <span className="sr-only">View notifications</span>
                    <Bell className="h-5 w-5" />
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-card" />
                </button>
                <div className="h-8 w-px bg-border" />
                <div className="relative">
                    <button
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                            <User className="h-4 w-4" />
                        </div>
                        <span className="hidden md:inline">
                            {user ? `${user.firstName} ${user.lastName}` : 'User'}
                        </span>
                    </button>
                    {showUserMenu && (
                        <div className="absolute right-0 top-full mt-2 w-48 rounded-md border bg-popover p-1 shadow-md z-50">
                            <div className="px-3 py-2 text-sm border-b mb-1">
                                <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                                <p className="text-xs text-muted-foreground">{user?.email}</p>
                            </div>
                            <Link
                                href="/settings"
                                className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
                                onClick={() => setShowUserMenu(false)}
                            >
                                <User className="h-4 w-4" />
                                Settings
                            </Link>
                            <button
                                onClick={() => {
                                    logout();
                                    setShowUserMenu(false);
                                }}
                                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-red-500 hover:bg-accent"
                            >
                                <LogOut className="h-4 w-4" />
                                Sign out
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
        </div>
    );
}
