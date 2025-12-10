#!/bin/bash
# Quick script to fix remaining unused imports

# Fix ExecutionContext in ai-rate-limit.guard.ts
sed -i '' 's/import { Injectable, ExecutionContext }/import { Injectable }/' src/ai/guards/ai-rate-limit.guard.ts

# Fix UnauthorizedException in auth.service.ts  
sed -i '' 's/import { Injectable, UnauthorizedException }/import { Injectable }/' src/auth/auth.service.ts

# Fix UseGuards in export.controller.ts
sed -i '' 's/Controller, Get, Request, UseGuards/Controller, Get, Request/' src/export/export.controller.ts

# Fix NotFoundException in tenant.middleware.ts
sed -i '' 's/NestMiddleware, NotFoundException/NestMiddleware/' src/tenants/tenant.middleware.ts

# Fix NotFoundException in test-automation-settings.service.ts
sed -i '' 's/Injectable, NotFoundException/Injectable/' src/test-automation/test-automation-settings.service.ts

# Fix UserTenant in users.controller.ts
sed -i '' "s/import { User, UserTenant } from '.\/user.entity';/import { User } from '.\/user.entity';/" src/users/users.controller.ts

# Fix RequirementState in requirements.service.ts
sed -i '' "s/Requirement, RequirementState/Requirement/" src/requirements/requirements.service.ts

# Fix Severity in security-ops.service.ts
sed -i '' "s/import { Injectable } from '@nestjs\/common';/import { Injectable } from '@nestjs\/common';/" src/security-ops/security-ops.service.ts

# Fix BadRequestException in sprints.service.ts
sed -i '' "s/Injectable, BadRequestException/Injectable/" src/sprints/sprints.service.ts

# Fix AiProviderFactory in automation-candidate.service.ts
sed -i '' "s/import { AiProviderFactory } from '..\/ai\/ai-provider.factory';//" src/test-automation/automation-candidate.service.ts

echo "Fixed unused imports"
