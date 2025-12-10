'use client';

import { useState } from 'react';
import { ChevronDown, Book, Zap, BarChart3, FileText, Calendar, Beaker, Rocket, Bug, Settings } from 'lucide-react';

interface DocSection {
    id: string;
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    content: {
        subtitle: string;
        items: {
            heading: string;
            description: string;
        }[];
    };
}

const docSections: DocSection[] = [
    {
        id: 'getting-started',
        title: 'Getting Started',
        icon: Zap,
        content: {
            subtitle: 'Welcome to QANexus - Your Quality Assurance Platform',
            items: [
                {
                    heading: 'What is QANexus?',
                    description: 'QANexus is a comprehensive quality assurance and testing management platform designed for modern development teams. It helps you manage requirements, plan sprints, execute tests, track releases, and maintain code quality.',
                },
                {
                    heading: 'Key Features',
                    description: 'Dashboard with real-time metrics, Requirements management with RQS scoring, Sprint planning and Kanban board, Test case creation and execution, Test run tracking, Release management with confidence scoring, Issue and bug tracking, Comprehensive metrics and analytics.',
                },
                {
                    heading: 'First Steps',
                    description: 'Start by navigating to the Dashboard to see an overview of your projects. Create a new project, define requirements, plan your first sprint, create test cases, and begin tracking quality metrics. Use the Sprint Board to manage your team\'s workflow.',
                },
                {
                    heading: 'Navigation Guide',
                    description: 'Use the left sidebar to navigate between modules. Main sections include: Dashboard (overview), Requirements (manage specs), Planning (sprint planning), Sprint Board (workflow), Test Cases, Test Runs, Issues (bug tracking), Releases, and Metrics.',
                },
            ],
        },
    },
    {
        id: 'requirements',
        title: 'Requirements Management',
        icon: FileText,
        content: {
            subtitle: 'Managing Project Requirements',
            items: [
                {
                    heading: 'Understanding Requirements',
                    description: 'Requirements are the specifications that define what your application must do. Each requirement has a title, description, and state. The RQS (Requirement Quality Score) indicates how well-defined and complete your requirement is.',
                },
                {
                    heading: 'Requirement States',
                    description: 'DRAFT - New requirement being written. PUBLISHED - Requirement ready for review. NEEDS_REVISION - Feedback requires changes. READY - Requirement is complete and approved. Use these states to track requirement maturity.',
                },
                {
                    heading: 'Creating Requirements',
                    description: 'Navigate to Requirements and click the add button. Enter a title, write a detailed description, and save. Your requirement starts in DRAFT state. Use the Analyze button to have AI evaluate the requirement and provide an RQS score.',
                },
                {
                    heading: 'RQS Score Breakdown',
                    description: 'The RQS score (0-100) evaluates: Clarity, Completeness, Testability, and Business Value. Green (80+) means the requirement is well-defined. Yellow (60-80) needs some work. Red (<60) requires significant revision.',
                },
            ],
        },
    },
    {
        id: 'sprint-planning',
        title: 'Sprint Planning & Board',
        icon: Calendar,
        content: {
            subtitle: 'Plan and Manage Your Sprints',
            items: [
                {
                    heading: 'Sprint Planning',
                    description: 'Navigate to Planning to set up your next sprint. Move items from the Product Backlog to your Sprint using the arrow buttons. Use AI Auto-Plan to have the system suggest items based on priority and RQS scores.',
                },
                {
                    heading: 'Starting a Sprint',
                    description: 'Once you\'ve selected items for your sprint, click "Start Sprint". The system validates that you have at least one item in the sprint and creates a new sprint with those items. You\'ll be redirected to the Sprint Board.',
                },
                {
                    heading: 'Sprint Board Overview',
                    description: 'The Sprint Board displays your current sprint with 6 swimlanes: To Do, In Progress, Code Review, Ready for QA, In Testing, and Done. Track items as they move through your SDLC workflow.',
                },
                {
                    heading: 'Managing Sprint Items',
                    description: 'Drag items between swimlanes to update their status. Each item shows its title, RQS score, priority, type, and assignee. The progress bar shows how many items are done. You can also expand the backlog panel to add more items after sprint creation.',
                },
                {
                    heading: 'Backlog Management',
                    description: 'After creating a sprint, expand the backlog panel to see remaining items. Click the "+" button to add items to the To Do swimlane, or drag them directly. You can also drag sprint items back to backlog if needed.',
                },
            ],
        },
    },
    {
        id: 'testing',
        title: 'Test Cases & Execution',
        icon: Beaker,
        content: {
            subtitle: 'Creating and Running Tests',
            items: [
                {
                    heading: 'Test Cases',
                    description: 'Test cases define what you\'re testing and how. Each test case has a title, description, steps, expected results, priority, and a reference requirement. Create test cases to ensure your requirements are properly verified.',
                },
                {
                    heading: 'Test Priority Levels',
                    description: 'CRITICAL - Must pass before release. HIGH - Important functionality. MEDIUM - Standard functionality. LOW - Nice to have. Priority affects test execution order and release readiness.',
                },
                {
                    heading: 'Creating Test Cases',
                    description: 'Navigate to Test Cases and create a new test. Define the test steps clearly, specify expected results, set priority based on importance, and link it to a requirement. Well-written test cases are essential for consistent testing.',
                },
                {
                    heading: 'Test Execution',
                    description: 'Navigate to Test Runs and start a new test run. Select test cases to execute, run them (manually or automated), record results (Passed, Failed, Blocked, Skipped). The system tracks test metrics and pass rates.',
                },
                {
                    heading: 'Test Run Details',
                    description: 'Each test run shows overall pass rate, number of tests in each status, execution duration, and detailed results per test. Use this data to identify failing areas and prioritize fixes.',
                },
            ],
        },
    },
    {
        id: 'releases',
        title: 'Release Management',
        icon: Rocket,
        content: {
            subtitle: 'Managing Releases with Confidence',
            items: [
                {
                    heading: 'Understanding Releases',
                    description: 'A release represents a version of your application ready for production. Each release has a name, version, target date, and an RCS (Release Confidence Score) that indicates readiness.',
                },
                {
                    heading: 'RCS Score (Release Confidence Score)',
                    description: 'The RCS (0-100) combines: Test coverage (Are all requirements tested?), Test pass rate (Do tests pass?), Code quality metrics (Any critical bugs?), and Time on release (Has it had sufficient QA time?). Green (80+) means ready to release.',
                },
                {
                    heading: 'Release Workflow',
                    description: 'Create a release, plan which requirements and test cases are included, execute your test runs, fix any failures, and monitor your RCS score. When RCS reaches 80+, the release is considered ready for production.',
                },
                {
                    heading: 'Preventing Release Issues',
                    description: 'Don\'t release if RCS is below 80. Low scores indicate incomplete testing, test failures, or quality issues. Use the detailed breakdown to understand what\'s blocking release readiness.',
                },
                {
                    heading: 'Release Tracking',
                    description: 'Track all past releases to understand your release history, patterns, and metrics over time. Use this data to improve your release process and set realistic timelines.',
                },
            ],
        },
    },
    {
        id: 'metrics',
        title: 'Metrics & Analytics',
        icon: BarChart3,
        content: {
            subtitle: 'Data-Driven Quality Insights',
            items: [
                {
                    heading: 'Dashboard Metrics',
                    description: 'The Dashboard provides an overview of key metrics: Total requirements and their RQS status, Active sprints and progress, Test pass rate and coverage, Open issues and their severity, Release readiness via RCS scores.',
                },
                {
                    heading: 'RQS Trends',
                    description: 'Monitor how the quality of your requirements improves over time. Higher average RQS means better-defined requirements, leading to fewer misunderstandings and rework.',
                },
                {
                    heading: 'Test Metrics',
                    description: 'Track test pass rates, code coverage, and bug density. Pass rate shows test effectiveness. Coverage shows how much of your code is tested. Bug density (bugs per 1000 lines) indicates code quality.',
                },
                {
                    heading: 'Bug Density Analysis',
                    description: 'Bug density is calculated as the number of bugs found per 1000 lines of code. High density indicates quality issues. Track density over releases to see if quality improves with each iteration.',
                },
                {
                    heading: 'AI-Powered Insights',
                    description: 'The platform provides AI-powered recommendations for improving quality: Suggest requirements that need revision, Identify test coverage gaps, Alert when RCS is declining, Recommend which tests to prioritize.',
                },
            ],
        },
    },
    {
        id: 'issues',
        title: 'Issue & Bug Tracking',
        icon: Bug,
        content: {
            subtitle: 'Managing Bugs and Issues',
            items: [
                {
                    heading: 'Understanding Issues',
                    description: 'Issues track bugs, defects, and problems found during testing. Each issue has a title, description, severity, priority, status, and optional assignment to a team member.',
                },
                {
                    heading: 'Severity vs Priority',
                    description: 'Severity measures impact (Critical = system down, High = major feature broken, Medium = feature partially broken, Low = minor issues). Priority measures urgency (Critical = fix immediately, High = fix soon, Medium = normal, Low = backlog).',
                },
                {
                    heading: 'Issue Lifecycle',
                    description: 'New → Assigned → In Progress → Code Review → Testing → Resolved → Closed. Move issues through this workflow as they\'re worked on and fixed.',
                },
                {
                    heading: 'Creating Issues',
                    description: 'When test runs reveal failures, create an issue with clear steps to reproduce, expected vs actual behavior, and attach the failing test case reference. This helps developers understand and fix the problem.',
                },
                {
                    heading: 'Blocking Issues',
                    description: 'Critical issues block release. If you have Critical severity issues, your RCS score will be low and release will be prevented. This ensures production quality.',
                },
            ],
        },
    },
    {
        id: 'best-practices',
        title: 'Best Practices',
        icon: Settings,
        content: {
            subtitle: 'Tips for Successful Quality Management',
            items: [
                {
                    heading: 'Requirements Best Practices',
                    description: 'Write clear, testable requirements. Use specific language ("the system must..." vs "it should..."). Include acceptance criteria. Get RQS scores above 80 before starting development. Have requirements reviewed by stakeholders.',
                },
                {
                    heading: 'Testing Best Practices',
                    description: 'Create test cases for all major requirements. Include positive and negative test cases. Write clear test steps others can follow. Maintain your test cases as requirements change. Aim for >80% code coverage.',
                },
                {
                    heading: 'Sprint Best Practices',
                    description: 'Plan sprints with realistic item counts. Start with high RQS requirements. Review sprint metrics daily. Move items through swimlanes as work progresses. Complete sprint retrospectives to improve process.',
                },
                {
                    heading: 'Release Best Practices',
                    description: 'Never release with RCS below 80. Plan releases 2-3 weeks ahead. Execute full regression testing. Have code review completed before release. Document known issues if they\'re acceptable.',
                },
                {
                    heading: 'Team Collaboration',
                    description: 'Assign items to team members in the sprint board. Use requirements as communication between product and engineering. Share metrics with the team weekly. Celebrate quality improvements.',
                },
            ],
        },
    },
];

export default function DocsPage() {
    const [expandedSection, setExpandedSection] = useState<string | null>('getting-started');

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-bold tracking-tight mb-2">Documentation</h1>
                <p className="text-muted-foreground">
                    Complete guides and best practices for using QANexus
                </p>
            </div>

            {/* Documentation Sections */}
            <div className="space-y-4">
                {docSections.map((section) => {
                    const Icon = section.icon;
                    const isExpanded = expandedSection === section.id;

                    return (
                        <div
                            key={section.id}
                            className="rounded-lg border bg-card overflow-hidden transition-all"
                        >
                            {/* Section Header */}
                            <button
                                onClick={() =>
                                    setExpandedSection(isExpanded ? null : section.id)
                                }
                                className="w-full px-6 py-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <Icon className="h-5 w-5 text-primary" />
                                    <h2 className="text-lg font-semibold">{section.title}</h2>
                                </div>
                                <ChevronDown
                                    className={`h-5 w-5 text-muted-foreground transition-transform ${
                                        isExpanded ? 'rotate-180' : ''
                                    }`}
                                />
                            </button>

                            {/* Section Content */}
                            {isExpanded && (
                                <div className="border-t px-6 py-6 space-y-6 bg-muted/30">
                                    <div>
                                        <h3 className="text-sm font-semibold text-primary mb-2">
                                            {section.content.subtitle}
                                        </h3>
                                    </div>

                                    <div className="space-y-4">
                                        {section.content.items.map((item, index) => (
                                            <div key={index} className="border-l-2 border-primary/30 pl-4">
                                                <h4 className="font-semibold text-foreground mb-2">
                                                    {item.heading}
                                                </h4>
                                                <p className="text-sm text-muted-foreground leading-relaxed">
                                                    {item.description}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Help Footer */}
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-900/10 p-6">
                <div className="flex gap-4">
                    <Book className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
                    <div>
                        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                            Need More Help?
                        </h3>
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                            For additional support, reach out to the QANexus support team or check the in-app tooltips for context-specific help.
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <a
                    href="/requirements"
                    className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-center"
                >
                    <FileText className="h-5 w-5 text-primary mx-auto mb-2" />
                    <p className="text-sm font-semibold">Requirements</p>
                </a>
                <a
                    href="/planning"
                    className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-center"
                >
                    <Calendar className="h-5 w-5 text-primary mx-auto mb-2" />
                    <p className="text-sm font-semibold">Sprint Planning</p>
                </a>
                <a
                    href="/sprints/current"
                    className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-center"
                >
                    <Beaker className="h-5 w-5 text-primary mx-auto mb-2" />
                    <p className="text-sm font-semibold">Sprint Board</p>
                </a>
                <a
                    href="/metrics"
                    className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-center"
                >
                    <BarChart3 className="h-5 w-5 text-primary mx-auto mb-2" />
                    <p className="text-sm font-semibold">Metrics</p>
                </a>
            </div>
        </div>
    );
}
