import { Module } from "@nestjs/common";
import { GamesModule } from "./games/games.module";
import { RoomsModule } from "./rooms/rooms.module";
@Module({imports:[GamesModule,RoomsModule]}) export class AppModule{}
