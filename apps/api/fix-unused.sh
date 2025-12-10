#!/bin/bash
# Fix remaining unused variable errors

# foundry-ai.provider.ts - success variable
sed -i '' 's/let success = true;/let _success = true;/' src/ai/foundry-ai.provider.ts
sed -i '' 's/success = false;/_success = false;/' src/ai/foundry-ai.provider.ts
sed -i '' 's/success=${success}/_success=${_success}/' src/ai/foundry-ai.provider.ts

# local-ai.provider.ts - result variable  
sed -i '' 's/const result = await/const _result = await/' src/ai/local-ai.provider.ts

# mock-ai.provider.ts - isCritical variable
sed -i '' 's/const isCritical =/const _isCritical =/' src/ai/mock-ai.provider.ts

# ai-metrics.service.ts - days variable
sed -i '' 's/(startDate, days)/(startDate, _days)/' src/metrics/ai-metrics.service.ts

# onboarding.service.ts - hasReleaseWithRcs variable
sed -i '' 's/const hasReleaseWithRcs =/const _hasReleaseWithRcs =/' src/onboarding/onboarding.service.ts

# rcs.service.ts - Logger import
sed -i '' "s/import { Injectable, Logger }/import { Injectable }/" src/releases/rcs.service.ts

# security-ops.service.ts - Severity import
sed -i '' "s/import { Injectable } from '@nestjs\/common';/import { Injectable } from '@nestjs\/common';/" src/security-ops/security-ops.service.ts
sed -i '' "s/enum Severity/enum _Severity/" src/security-ops/security-ops.service.ts

# sprints.controller.ts - req parameter
sed -i '' 's/@Param() req/@Param() _req/' src/sprints/sprints.controller.ts

# sprints.service.ts - BadRequestException import
sed -i '' 's/Injectable, BadRequestException/Injectable/' src/sprints/sprints.service.ts

# git-integration.service.ts - body parameter
sed -i '' 's/(body: string)/(\_body: string)/' src/test-automation/git-integration.service.ts

echo "Fixed remaining unused variables"
