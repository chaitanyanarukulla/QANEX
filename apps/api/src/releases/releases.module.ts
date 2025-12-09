import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReleasesService } from './releases.service';
import { ReleasesController } from './releases.controller';
import { Release } from './release.entity';
import { RcsService } from './rcs.service';
import { RequirementsModule } from '../requirements/requirements.module';
import { BugsModule } from '../bugs/bugs.module';
import { TestKeysModule } from '../test-keys/test-keys.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Release]),
        RequirementsModule,
        BugsModule,
        TestKeysModule,
    ],
    providers: [ReleasesService, RcsService],
    controllers: [ReleasesController],
    exports: [ReleasesService],
})
export class ReleasesModule { }
