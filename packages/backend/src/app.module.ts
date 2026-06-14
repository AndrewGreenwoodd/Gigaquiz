import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { PacksModule } from './packs/packs.module';
import { GameModule } from './game/game.module';

@Module({
  imports: [PrismaModule, PacksModule, GameModule],
})
export class AppModule {}
