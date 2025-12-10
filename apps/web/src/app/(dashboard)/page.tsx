import { ArrowUpRight, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { GettingStartedPanel } from '@/components/onboarding/GettingStartedPanel';
import { WelcomeModal } from '@/components/onboarding/WelcomeModal';

const stats = [
  { name: 'Active Requirements', value: '24', change: '+2', changeType: 'positive', icon: Clock },
  { name: 'Tests Passing', value: '98.5%', change: '+1.2%', changeType: 'positive', icon: CheckCircle2 },
  { name: 'Open Issues', value: '12', change: '-3', changeType: 'positive', icon: AlertCircle },
  { name: 'Release Confidence', value: '92', change: '+4', changeType: 'positive', icon: ArrowUpRight },
];

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      </div>

      <WelcomeModal />
      <GettingStartedPanel />

      <div id="dashboard-stats" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="overflow-hidden rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-bold">{stat.value}</h3>
                  <span className={`text-xs font-medium ${stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.change}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div id="release-chart" className="col-span-2 rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-medium mb-4">Release Readiness Trend</h3>
          <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg border-muted">
            <p className="text-muted-foreground">Chart Placeholder - Release Confidence Score</p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-medium mb-4">Pending Approvals</h3>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="h-2 w-2 mt-2 rounded-full bg-yellow-500" />
                <div>
                  <p className="text-sm font-medium">Requirement Review: User Auth</p>
                  <p className="text-xs text-muted-foreground">Waiting for implementation plan approval</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
