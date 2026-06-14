import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PacksController } from './packs.controller';
import { PacksService } from './packs.service';
import { CloudinaryService } from './cloudinary.service';

@Module({
  imports: [
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [PacksController],
  providers: [PacksService, CloudinaryService],
  exports: [PacksService],
})
export class PacksModule {}
