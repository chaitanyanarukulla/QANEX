import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityCheck } from './security-check.entity';
import { SecurityOpsService } from './security-ops.service';
import { SecurityOpsController } from './security-ops.controller';

@Module({
    imports: [TypeOrmModule.forFeature([SecurityCheck])],
    controllers: [SecurityOpsController],
    providers: [SecurityOpsService],
    exports: [SecurityOpsService],
})
export class SecurityOpsModule { }
