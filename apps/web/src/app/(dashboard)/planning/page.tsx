'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Plus, ArrowRight, Bot, MoreHorizontal, Loader2, Lightbulb, X, FileText, ChevronDown, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { sprintsApi } from '@/services/sprints.service';
import { requirementsApi } from '@/services/requirements.service';
import { SprintItem, AIPlanRecommendation } from '@/types/sprint';
import { Requirement } from '@/types/requirement';

interface BacklogRequirement extends Requirement {
    tasks: SprintItem[];
}

export default function PlanningPage() {
    const router = useRouter();
    const [backlogRequirements, setBacklogRequirements] = useState<BacklogRequirement[]>([]);
    const [standaloneBacklog, setStandaloneBacklog] = useState<SprintItem[]>([]);
    const [expandedRequirements, setExpandedRequirements] = useState<Set<string>>(new Set());
    const [sprintItems, setSprintItems] = useState<SprintItem[]>([]);
    const [isStarting, setIsStarting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isPlanning, setIsPlanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [aiRecommendation, setAiRecommendation] = useState<AIPlanRecommendation | null>(null);
    const [showRequirementsModal, setShowRequirementsModal] = useState(false);
    const [requirements, setRequirements] = useState<Requirement[]>([]);
    const [selectedRequirements, setSelectedRequirements] = useState<Set<string>>(new Set());
    const [isImporting, setIsImporting] = useState(false);

    useEffect(() => {
        loadBacklogItems();
    }, []);

    const loadBacklogItems = async () => {
        try {
            setIsLoading(true);
            const data = await sprintsApi.getStructuredBacklog();
            setBacklogRequirements(data.requirements);
            setStandaloneBacklog(data.standaloneTasks);

            // Auto expand all requirements initially
            setExpandedRequirements(new Set(data.requirements.map(r => r.id)));

            setError(null);
        } catch (err) {
            console.error('Failed to load backlog:', err);
            setError('Failed to load backlog items');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleRequirement = (reqId: string) => {
        const newExpanded = new Set(expandedRequirements);
        if (newExpanded.has(reqId)) {
            newExpanded.delete(reqId);
        } else {
            newExpanded.add(reqId);
        }
        setExpandedRequirements(newExpanded);
    };

    const moveRight = (item: SprintItem) => {
        // Remove from standalone if present
        if (standaloneBacklog.find(i => i.id === item.id)) {
            setStandaloneBacklog(standaloneBacklog.filter(i => i.id !== item.id));
        } else {
            // Remove from requirement tasks
            setBacklogRequirements(prev => prev.map(req => ({
                ...req,
                tasks: req.tasks.filter(t => t.id !== item.id)
            })));
        }
        setSprintItems([...sprintItems, item]);
    };

    const moveLeft = (item: SprintItem) => {
        setSprintItems(sprintItems.filter(i => i.id !== item.id));

        // Check if it belongs to a requirement
        if (item.requirementId) {
            const reqExists = backlogRequirements.find(r => r.id === item.requirementId);
            if (reqExists) {
                setBacklogRequirements(prev => prev.map(req => {
                    if (req.id === item.requirementId) {
                        return { ...req, tasks: [...req.tasks, item] };
                    }
                    return req;
                }));
                return;
            }
        }

        // Add to standalone
        setStandaloneBacklog([...standaloneBacklog, item]);
    };

    const handleAutoPlan = async () => {
        try {
            setIsPlanning(true);
            setError(null);

            // Call AI planning endpoint
            const recommendation = await sprintsApi.planSprint(20);
            setAiRecommendation(recommendation);

            // Auto-add recommended items to sprint
            const recommendedItems = recommendation.recommendedItems.map(r => r.item);

            // Add to sprint items
            setSprintItems(prev => [...prev, ...recommendedItems]);

            // Remove from standalone
            setStandaloneBacklog(prev => prev.filter(item =>
                !recommendedItems.some(rec => rec.id === item.id)
            ));

            // Remove from requirements
            setBacklogRequirements(prev => prev.map(req => ({
                ...req,
                tasks: req.tasks.filter(t => !recommendedItems.some(rec => rec.id === t.id))
            })));

        } catch (err) {
            console.error('Failed to plan sprint:', err);
            setError('Failed to get AI recommendations');
        } finally {
            setIsPlanning(false);
        }
    };

    const handleStartSprint = async () => {
        if (sprintItems.length === 0) {
            alert('Please add items to the sprint before starting');
            return;
        }

        try {
            setIsStarting(true);

            // Calculate sprint dates (2-week sprint)
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 14);

            // Create the sprint
            const sprint = await sprintsApi.create({
                name: `Sprint ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
                goal: `Complete ${sprintItems.length} items`,
                capacity: 20,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            });

            // Update sprint status to ACTIVE
            await sprintsApi.updateStatus(sprint.id, 'ACTIVE');

            // Move all sprint items from backlog to the sprint
            await Promise.all(
                sprintItems.map(item =>
                    sprintsApi.moveItem(item.id, sprint.id, 'todo')
                )
            );

            // Navigate to the sprint board
            router.push(`/sprints/${sprint.id}`);
        } catch (err) {
            console.error('Failed to start sprint:', err);
            setError('Failed to start sprint. Please try again.');
        } finally {
            setIsStarting(false);
        }
    };

    const loadRequirements = async () => {
        try {
            const reqs = await requirementsApi.list();
            // Filter to only show READY requirements
            setRequirements(reqs.filter(r => r.state === 'READY'));
        } catch (err) {
            console.error('Failed to load requirements:', err);
            setError('Failed to load requirements');
        }
    };

    const handleOpenRequirementsModal = () => {
        setShowRequirementsModal(true);
        loadRequirements();
    };

    const toggleRequirementSelection = (reqId: string) => {
        const newSelection = new Set(selectedRequirements);
        if (newSelection.has(reqId)) {
            newSelection.delete(reqId);
        } else {
            newSelection.add(reqId);
        }
        setSelectedRequirements(newSelection);
    };

    const handleImportRequirements = async () => {
        if (selectedRequirements.size === 0) {
            return;
        }

        try {
            setIsImporting(true);
            setError(null);

            // Import requirements as sprint items (to backlog)
            await sprintsApi.createItemsFromRequirements(
                Array.from(selectedRequirements)
            );

            // Refresh backlog
            await loadBacklogItems();

            // Close modal and reset
            setShowRequirementsModal(false);
            setSelectedRequirements(new Set());
        } catch (err) {
            console.error('Failed to import requirements:', err);
            setError('Failed to import requirements');
        } finally {
            setIsImporting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col space-y-4">
            {error && (
                <div className="rounded-md border border-red-500/20 bg-red-500/10 p-4">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
            )}

            {aiRecommendation && (
                <div className="rounded-lg border border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-900/10 p-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                            <Lightbulb className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
                                    AI Planning Recommendation
                                </h3>
                                <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">
                                    {aiRecommendation.reasoning}
                                </p>
                                <div className="space-y-2">
                                    {aiRecommendation.recommendedItems.slice(0, 3).map((rec, _idx) => (
                                        <div key={rec.item.id} className="text-xs text-purple-600 dark:text-purple-400">
                                            <span className="font-medium">{rec.item.title}</span>
                                            <span className="text-purple-500 dark:text-purple-500"> ({rec.score} pts)</span>
                                            {rec.reason && <span className="text-purple-600 dark:text-purple-400"> - {rec.reason}</span>}
                                        </div>
                                    ))}
                                    {aiRecommendation.recommendedItems.length > 3 && (
                                        <div className="text-xs text-purple-600 dark:text-purple-400">
                                            +{aiRecommendation.recommendedItems.length - 3} more items recommended
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setAiRecommendation(null)}
                            className="text-purple-400 hover:text-purple-600 dark:hover:text-purple-300 flex-shrink-0">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Sprint Planning</h1>
                    <p className="text-muted-foreground">Plan your next sprint cycle.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleOpenRequirementsModal}
                        className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent">
                        <FileText className="mr-2 h-4 w-4" />
                        Import from Requirements
                    </button>
                    <button
                        onClick={handleAutoPlan}
                        disabled={(standaloneBacklog.length + backlogRequirements.reduce((acc, r) => acc + r.tasks.length, 0)) === 0 || isPlanning}
                        className="inline-flex items-center justify-center rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-purple-700 disabled:opacity-50">
                        {isPlanning ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Planning...
                            </>
                        ) : (
                            <>
                                <Bot className="mr-2 h-4 w-4" />
                                AI Auto-Plan
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleStartSprint}
                        disabled={isStarting || sprintItems.length === 0}
                        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50">
                        {isStarting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Starting...
                            </>
                        ) : (
                            'Start Sprint'
                        )}
                    </button>
                </div>
            </div>

            {/* Requirements Import Modal */}
            {showRequirementsModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card rounded-lg border shadow-lg max-w-2xl w-full max-h-[80vh] flex flex-col m-4">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h2 className="text-lg font-semibold">Import Requirements</h2>
                            <button
                                onClick={() => setShowRequirementsModal(false)}
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {requirements.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    No ready requirements available. Make sure requirements are in READY state.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {requirements.map(req => (
                                        <label
                                            key={req.id}
                                            className="flex items-start gap-3 p-3 rounded-md border hover:bg-accent cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedRequirements.has(req.id)}
                                                onChange={() => toggleRequirementSelection(req.id)}
                                                className="mt-1"
                                            />
                                            <div className="flex-1">
                                                <div className="font-medium text-sm">{req.title}</div>
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    RQS: {req.rqsScore || 'N/A'}
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t flex justify-between items-center">
                            <div className="text-sm text-muted-foreground">
                                {selectedRequirements.size} requirement{selectedRequirements.size !== 1 ? 's' : ''} selected
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowRequirementsModal(false)}
                                    className="px-4 py-2 text-sm font-medium border border-input rounded-md hover:bg-accent"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleImportRequirements}
                                    disabled={selectedRequirements.size === 0 || isImporting}
                                    className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {isImporting ? (
                                        <>
                                            <Loader2 className="inline h-4 w-4 animate-spin mr-2" />
                                            Importing...
                                        </>
                                    ) : (
                                        'Import to Backlog'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-6 h-full pb-6">
                {/* Backlog Column */}
                <div className="rounded-lg border bg-card flex flex-col h-full overflow-hidden">
                    <div className="p-4 border-b bg-muted/40 flex justify-between items-center">
                        <h3 className="font-semibold flex items-center gap-2">
                            Product Backlog
                            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                                {standaloneBacklog.length + backlogRequirements.reduce((acc, req) => acc + req.tasks.length, 0)} items
                            </span>
                        </h3>
                        <button className="text-muted-foreground hover:text-foreground">
                            <Plus className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">

                        {/* 1. Requirements with Tasks */}
                        {backlogRequirements.map(req => (
                            <div key={req.id} className="border rounded-md bg-background overflow-hidden">
                                <div
                                    className="flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                                    onClick={() => toggleRequirement(req.id)}
                                >
                                    <div className="flex items-center gap-2">
                                        {expandedRequirements.has(req.id) ? (
                                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
                                        )}
                                        <span className="font-medium text-purple-900 dark:text-purple-300">
                                            {req.title}
                                        </span>
                                        <span className="text-xs text-muted-foreground bg-background border px-1.5 py-0.5 rounded">
                                            {req.tasks.length} tasks
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        RQS: {req.rqsScore || '-'}
                                    </div>
                                </div>

                                {expandedRequirements.has(req.id) && (
                                    <div className="divide-y border-t">
                                        {req.tasks.length === 0 ? (
                                            <div className="p-3 text-xs text-muted-foreground text-center italic">
                                                No tasks in backlog for this requirement.
                                            </div>
                                        ) : (
                                            req.tasks.map(item => (
                                                <div key={item.id} className="group flex items-center justify-between p-3 pl-8 hover:bg-accent/50 transition-colors bg-white dark:bg-slate-950">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="font-medium text-sm">{item.title}</div>
                                                            <span className="px-1.5 py-0.5 text-[10px] font-medium border rounded uppercase text-muted-foreground">
                                                                {item.type}
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-muted-foreground mt-0.5">
                                                            Priority: {item.priority}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            moveRight(item);
                                                        }}
                                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-all">
                                                        <ArrowRight className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* 2. Standalone Tasks */}
                        {standaloneBacklog.length > 0 && (
                            <div className="space-y-2">
                                {backlogRequirements.length > 0 && (
                                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-1">
                                        Unlinked Items
                                    </div>
                                )}
                                {standaloneBacklog.map(item => (
                                    <div key={item.id} className="group flex items-center justify-between p-3 rounded-md border bg-background hover:border-primary/50 transition-colors">
                                        <div>
                                            <Link href={`/planning/backlog/${item.id}`} className="hover:underline">
                                                <div className="font-medium text-sm">{item.title}</div>
                                            </Link>
                                            <div className="text-xs text-muted-foreground">
                                                {item.rqsScore ? `RQS: ${item.rqsScore}` : 'No RQS'} • {item.priority}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => moveRight(item)}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-all">
                                            <ArrowRight className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {backlogRequirements.length === 0 && standaloneBacklog.length === 0 && (
                            <div className="text-center py-12 border rounded-lg border-dashed bg-muted/10">
                                <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2 opacity-50" />
                                <h3 className="text-sm font-medium">Backlog is empty</h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Approve requirements to add them here.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sprint Column */}
                <div className="rounded-lg border bg-card flex flex-col h-full overflow-hidden border-purple-200 dark:border-purple-900/50">
                    <div className="p-4 border-b bg-purple-50/50 dark:bg-purple-900/10 flex justify-between items-center">
                        <div className="space-y-1">
                            <h3 className="font-semibold flex items-center gap-2 text-purple-900 dark:text-purple-100">
                                Sprint 1
                                <span className="rounded-full bg-purple-200 dark:bg-purple-800 px-2 py-0.5 text-xs text-purple-800 dark:text-purple-100">{sprintItems.length}</span>
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-purple-700 dark:text-purple-300">
                                <Calendar className="h-3 w-3" />
                                <span>Dec 9 - Dec 23</span>
                            </div>
                        </div>
                        <button className="text-purple-700 dark:text-purple-300 hover:text-purple-900">
                            <MoreHorizontal className="h-4 w-4" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-purple-50/20 dark:bg-purple-900/5">
                        {sprintItems.map(item => (
                            <div key={item.id} className="group flex items-center justify-between p-3 rounded-md border bg-background hover:border-primary/50 transition-colors">
                                <div>
                                    <div className="font-medium text-sm">{item.title}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {item.rqsScore ? `RQS: ${item.rqsScore}` : 'No RQS'} • {item.priority}
                                    </div>
                                </div>
                                <button
                                    onClick={() => moveLeft(item)}
                                    className="opacity-0 group-hover:opacity-100 text-xs text-muted-foreground hover:text-red-500 underline transition-all">
                                    Remove
                                </button>
                            </div>
                        ))}
                        {sprintItems.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground text-sm">Sprint empty. Add items from backlog.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
