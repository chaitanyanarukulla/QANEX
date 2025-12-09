import { useState } from 'react';
import { X, MessageSquare, ThumbsUp, AlertTriangle, Lightbulb } from 'lucide-react';

export function FeedbackModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const [category, setCategory] = useState('UX');
    const [rating, setRating] = useState(0);
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('accessToken');
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch('http://localhost:3000/feedback', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    category,
                    rating,
                    message,
                    path: window.location.pathname
                })
            });

            if (res.ok) {
                setSuccess(true);
                setTimeout(() => {
                    setSuccess(false);
                    setMessage('');
                    setRating(0);
                    onClose();
                }, 2000);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-lg">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-primary" />
                        Give Feedback
                    </h2>
                    <button onClick={onClose} className="p-1 rounded hover:bg-muted">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {success ? (
                    <div className="py-8 text-center text-green-500 animate-in zoom-in">
                        <ThumbsUp className="w-12 h-12 mx-auto mb-4" />
                        <p className="font-medium">Thanks for your feedback!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium mb-1.5 block">Category</label>
                            <div className="flex gap-2">
                                {['UX', 'BUG', 'FEATURE'].map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setCategory(cat)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${category === cat ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted'}`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1.5 block">Rating</label>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map(r => (
                                    <button
                                        key={r}
                                        onClick={() => setRating(r)}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border transition-colors ${rating >= r ? 'bg-yellow-400 text-yellow-900 border-yellow-400' : 'bg-background hover:bg-muted'}`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium mb-1.5 block">Message</label>
                            <textarea
                                className="w-full rounded-md border bg-background p-3 text-sm outline-none focus:ring-1 focus:ring-primary min-h-[100px]"
                                placeholder="Tell us what you think..."
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                            />
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !message}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Sending...' : 'Send Feedback'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
