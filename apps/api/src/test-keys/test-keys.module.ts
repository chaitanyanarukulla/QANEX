import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestKeysService } from './test-keys.service';
import { TestKeysController } from './test-keys.controller';
import { TestCase } from './test-case.entity';
import { TestRun } from './test-run.entity';
import { TestResult } from './test-result.entity';

@Module({
    imports: [TypeOrmModule.forFeature([TestCase, TestRun, TestResult])],
    providers: [TestKeysService],
    controllers: [TestKeysController],
    exports: [TestKeysService],
})
export class TestKeysModule { }
