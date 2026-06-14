import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { PacksModule } from '../packs/packs.module';

@Module({
  imports: [PacksModule],
  providers: [GameGateway, GameService],
})
export class GameModule {}
