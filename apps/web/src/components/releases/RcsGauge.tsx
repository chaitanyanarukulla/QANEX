'use client';

export function RcsGauge({ score }: { score: number }) {
    // Color logic
    let color = 'text-green-500';
    if (score < 50) {
        color = 'text-red-500';
    } else if (score < 80) {
        color = 'text-yellow-500';
    }

    const circumference = 2 * Math.PI * 40;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center w-40 h-40">
            {/* SVG Ring */}
            <svg className="w-full h-full transform -rotate-90">
                <circle
                    cx="80"
                    cy="80"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    className="text-muted/20"
                />
                <circle
                    cx="80"
                    cy="80"
                    r="40"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    className={`${color} transition-all duration-1000 ease-out`}
                    strokeLinecap="round"
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className={`text-3xl font-bold ${color}`}>{score}</span>
                <span className="text-xs text-muted-foreground uppercase font-medium">RCS Score</span>
            </div>
        </div>
    );
}
