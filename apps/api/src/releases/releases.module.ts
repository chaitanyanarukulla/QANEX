import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReleasesService } from './releases.service';
import { ReleasesController } from './releases.controller';
import { Release } from './release.entity';
import { RcsService } from './rcs.service';
import { RequirementsModule } from '../requirements/requirements.module';
import { BugsModule } from '../bugs/bugs.module';
import { TestKeysModule } from '../test-keys/test-keys.module';
import { SecurityOpsModule } from '../security-ops/security-ops.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Release]),
    RequirementsModule,
    BugsModule,
    TestKeysModule,
    SecurityOpsModule,
  ],
  providers: [ReleasesService, RcsService],
  controllers: [ReleasesController],
  exports: [ReleasesService],
})
export class ReleasesModule {}
