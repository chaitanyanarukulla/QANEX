const fs = require('fs');
const path = require('path');

// Files with unused variable issues in our changes
const files = [
  "apps/api/src/bugs/domain/adapters/bug.adapter.ts",
  "apps/api/src/common/domain/event-subscribers/bug-triaged.subscriber.ts",
  "apps/api/src/common/domain/event-subscribers/release-readiness-achieved.subscriber.ts",
  "apps/api/src/common/domain/event-subscribers/release-readiness-evaluated.subscriber.ts",
  "apps/api/src/common/domain/event-subscribers/requirement-approved.subscriber.ts",
  "apps/api/src/common/domain/event-subscribers/sprint-completed.subscriber.ts",
  "apps/api/src/common/domain/event-subscribers/sprint-started.subscriber.ts",
  "apps/api/src/common/domain/event-subscribers/test-run-completed.subscriber.ts",
  "apps/api/src/sprints/domain/adapters/sprint.adapter.ts",
];

let totalFixed = 0;

files.forEach(file => {
  const fullPath = path.join('/Users/chaitanyanarukulla/Projects/QAV2', file);

  if (!fs.existsSync(fullPath)) {
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf-8');
  const original = content;

  // Fix unused parameters by prefixing with underscore
  // Pattern: async method(_param): or async method(param):
  content = content.replace(/\((_)?(\w+):\s*(\w+)\)\s*:/g, (match, underscore, name, type) => {
    if (underscore || name.startsWith('_')) {
      return match; // Already prefixed
    }
    return match.replace(name, `_${name}`);
  });

  // Also handle method parameters that aren't in parentheses context
  // async methodName(param1: Type1, param2: Type2): ... patterns
  // where param is not used in the method body

  if (content !== original) {
    fs.writeFileSync(fullPath, content);
    console.log(`✓ Fixed ${path.basename(file)}`);
    totalFixed++;
  }
});

console.log(`\nTotal files updated: ${totalFixed}`);
