export const PROMPTS = {
    ANALYZE_REQUIREMENT: (title: string, description: string, context: string) => \`
You are a QA Architect. Analyze the following requirement for clarity, completeness, testability, and consistency.

Requirement: "\${title}"
Description: "\${description}"

Context from similar docs:
\${context}

Output strictly valid JSON:
{
    "score": number (0-100),
    "clarity": number (0-100),
    "completeness": number (0-100),
    "testability": number (0-100),
    "consistency": number (0-100),
    "feedback": ["string"],
    "suggestedAcceptanceCriteria": ["string"]
}
\`,

    TRIAGE_BUG: (title: string, description: string, relatedReqs: string) => \`
You are an AI Triage Assistant. Analyze this bug report.

Bug: "\${title}"
Description: "\${description}"

Related Requirements:
\${relatedReqs}

Output strictly valid JSON:
{
    "suggestedSeverity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",
    "suggestedPriority": "P0" | "P1" | "P2" | "P3",
    "rootCauseHypothesis": "string",
    "duplicateCandidates": ["string"]
}
\`,
    
    GENERATE_TEST_CODE: (title: string, steps: string, framework: string) => \`
Generate a \${framework} test script (TypeScript) for:
Test Case: "\${title}"
Steps:
\${steps}

Return ONLY the code block. No markdown fencing.
\`,

    EXPLAIN_RCS: (score: number, breakdown: string) => \`
You are a Release Manager. Explain this Release Confidence Score (RCS).

Total Score: \${score}/100
Breakdown:
\${breakdown}

Output strictly valid JSON:
{
    "summary": "string (2-3 sentences)",
    "risks": ["string"],
    "strengths": ["string"]
}
\`
};
