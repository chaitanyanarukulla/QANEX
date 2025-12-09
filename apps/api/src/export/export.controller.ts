import { Controller, Get, Res, Request, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ExportService } from './export.service';

@Controller('export')
export class ExportController {
    constructor(private readonly exportService: ExportService) { }

    @Get('json')
    async exportJson(@Request() req: any, @Res() res: Response) {
        // Enforce tenant isolation via req.user.tenantId
        const tenantId = req.user?.tenantId || req.tenantId;
        if (!tenantId) {
            return res.status(403).json({ error: 'Tenant context required' });
        }

        const data = await this.exportService.exportAllJson(tenantId);

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="export-${tenantId}-${Date.now()}.json"`);
        return res.send(data);
    }
}
