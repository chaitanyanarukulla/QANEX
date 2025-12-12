'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, FileText, Loader2, Trash2, Edit, ChevronDown, ChevronRight } from 'lucide-react';
import { testCasesApi } from '@/services/tests.service';
import { TestCase, TestStep } from '@/types/tests';

export default function TestRepositoryPage() {
    const [testCases, setTestCases] = useState<TestCase[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingCase, setEditingCase] = useState<TestCase | null>(null);
    const [expandedCase, setExpandedCase] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        priority: 'MEDIUM' as TestCase['priority'],
        steps: [] as TestStep[],
    });

    useEffect(() => {
        loadTestCases();
    }, []);

    const loadTestCases = async () => {
        try {
            setIsLoading(true);
            const data = await testCasesApi.list();
            setTestCases(data);
        } catch (err) {
            console.error('Failed to load test cases:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateOrUpdate = async () => {
        try {
            if (editingCase) {
                await testCasesApi.update(editingCase.id, formData);
            } else {
                await testCasesApi.create(formData);
            }
            setShowModal(false);
            setEditingCase(null);
            resetForm();
            loadTestCases();
        } catch (err) {
            console.error('Failed to save test case:', err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this test case?')) return;
        try {
            await testCasesApi.delete(id);
            loadTestCases();
        } catch (err) {
            console.error('Failed to delete test case:', err);
        }
    };

    const openEditModal = (tc: TestCase) => {
        setEditingCase(tc);
        setFormData({
            title: tc.title,
            description: tc.description || '',
            priority: tc.priority,
            steps: tc.steps || [],
        });
        setShowModal(true);
    };

    const openCreateModal = () => {
        setEditingCase(null);
        resetForm();
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            priority: 'MEDIUM',
            steps: [],
        });
    };

    const addStep = () => {
        setFormData(prev => ({
            ...prev,
            steps: [...prev.steps, { step: '', expected: '' }],
        }));
    };

    const updateStep = (index: number, field: 'step' | 'expected', value: string) => {
        setFormData(prev => ({
            ...prev,
            steps: prev.steps.map((s, i) => i === index ? { ...s, [field]: value } : s),
        }));
    };

    const removeStep = (index: number) => {
        setFormData(prev => ({
            ...prev,
            steps: prev.steps.filter((_, i) => i !== index),
        }));
    };

    const filteredCases = testCases.filter(tc =>
        tc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tc.description && tc.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Test Repository</h1>
                    <p className="text-muted-foreground">Manage and organize your test cases.</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                >
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
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-md border border-input bg-background pl-9 pr-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                </div>
                <div className="text-sm text-muted-foreground">
                    {filteredCases.length} test case{filteredCases.length !== 1 ? 's' : ''}
                </div>
            </div>

            {testCases.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed p-12 text-center">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                    <h3 className="mt-4 text-lg font-semibold">No test cases yet</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Create your first test case to get started with test management.
                    </p>
                    <button
                        onClick={openCreateModal}
                        className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Create Test Case
                    </button>
                </div>
            ) : (
                <div className="rounded-md border bg-card">
                    <div className="p-4 border-b bg-muted/40 grid grid-cols-12 gap-4 font-medium text-sm text-muted-foreground">
                        <div className="col-span-1"></div>
                        <div className="col-span-5">Title</div>
                        <div className="col-span-2">Priority</div>
                        <div className="col-span-2">Steps</div>
                        <div className="col-span-2 text-right">Actions</div>
                    </div>
                    <div className="divide-y">
                        {filteredCases.map((tc) => (
                            <div key={tc.id}>
                                <div className="p-4 grid grid-cols-12 gap-4 items-center hover:bg-muted/50 transition-colors">
                                    <div className="col-span-1">
                                        <button
                                            onClick={() => setExpandedCase(expandedCase === tc.id ? null : tc.id)}
                                            className="p-1 hover:bg-muted rounded"
                                        >
                                            {expandedCase === tc.id ? (
                                                <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                    <div className="col-span-5 font-medium flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-blue-500" />
                                        <div>
                                            <div>{tc.title}</div>
                                            {tc.description && (
                                                <div className="text-xs text-muted-foreground truncate max-w-md">
                                                    {tc.description}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
                                            ${tc.priority === 'CRITICAL' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                tc.priority === 'HIGH' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                                                    tc.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                        'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'}`}>
                                            {tc.priority}
                                        </span>
                                    </div>
                                    <div className="col-span-2 text-sm text-muted-foreground">
                                        {tc.steps?.length || 0} step{(tc.steps?.length || 0) !== 1 ? 's' : ''}
                                    </div>
                                    <div className="col-span-2 flex justify-end gap-2">
                                        <button
                                            onClick={() => openEditModal(tc)}
                                            className="p-2 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground"
                                            title="Edit"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(tc.id)}
                                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md text-muted-foreground hover:text-red-600"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                {expandedCase === tc.id && tc.steps && tc.steps.length > 0 && (
                                    <div className="px-4 pb-4 pl-16 bg-muted/20">
                                        <div className="text-sm font-medium mb-2">Test Steps:</div>
                                        <ol className="space-y-2">
                                            {tc.steps.map((step, idx) => (
                                                <li key={idx} className="border-l-2 border-primary/30 pl-3 py-1">
                                                    <div className="font-medium text-sm">{idx + 1}. {step.step}</div>
                                                    <div className="text-xs text-muted-foreground">Expected: {step.expected}</div>
                                                </li>
                                            ))}
                                        </ol>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
                    <div className="relative bg-card border rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-xl font-semibold mb-4">
                                {editingCase ? 'Edit Test Case' : 'Create Test Case'}
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Title *</label>
                                    <input
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        placeholder="Enter test case title"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                                        placeholder="Enter test case description"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Priority</label>
                                    <select
                                        value={formData.priority}
                                        onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as TestCase['priority'] }))}
                                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    >
                                        <option value="CRITICAL">Critical</option>
                                        <option value="HIGH">High</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="LOW">Low</option>
                                    </select>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium">Test Steps</label>
                                        <button
                                            type="button"
                                            onClick={addStep}
                                            className="text-xs text-primary hover:underline"
                                        >
                                            + Add Step
                                        </button>
                                    </div>
                                    {formData.steps.length === 0 ? (
                                        <div className="text-sm text-muted-foreground border rounded-md p-4 text-center">
                                            No steps added. Click &quot;Add Step&quot; to add test steps.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {formData.steps.map((step, idx) => (
                                                <div key={idx} className="border rounded-md p-3 space-y-2">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-sm font-medium">Step {idx + 1}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeStep(idx)}
                                                            className="text-xs text-red-500 hover:underline"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={step.step}
                                                        onChange={(e) => updateStep(idx, 'step', e.target.value)}
                                                        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                                                        placeholder="Step action"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={step.expected}
                                                        onChange={(e) => updateStep(idx, 'expected', e.target.value)}
                                                        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                                                        placeholder="Expected result"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-sm font-medium rounded-md border hover:bg-muted"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateOrUpdate}
                                    disabled={!formData.title.trim()}
                                    className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {editingCase ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
