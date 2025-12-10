interface PillarCardProps {
    title: string;
    score: number;
    max?: number;
    icon?: React.ComponentType<{ className?: string }>;
}

export function PillarCard({ title, score, max = 100, icon: Icon }: PillarCardProps) {
    let color = 'bg-green-500';
    if (score < 50) color = 'bg-red-500';
    else if (score < 80) color = 'bg-yellow-500';

    return (
        <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">{title}</span>
                {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
            </div>
            <div className="flex items-end gap-2">
                <span className="text-2xl font-bold">{score}</span>
                <span className="text-sm text-muted-foreground mb-1">/ {max}</span>
            </div>
            <div className="mt-3 h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div
                    className={`h-full ${color} transition-all duration-500`}
                    style={{ width: `${(score / max) * 100}%` }}
                />
            </div>
        </div>
    );
}
