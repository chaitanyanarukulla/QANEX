import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureFlagsController } from './feature-flags.controller';
import { FeatureFlag } from './feature-flag.entity';

@Module({
    imports: [TypeOrmModule.forFeature([FeatureFlag])],
    controllers: [FeatureFlagsController],
    providers: [FeatureFlagsService],
    exports: [FeatureFlagsService],
})
export class FeatureFlagsModule { }
