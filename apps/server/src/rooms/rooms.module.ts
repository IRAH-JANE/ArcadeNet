import { Module } from "@nestjs/common";
import { GamesModule } from "../games/games.module";
import { RoomsGateway } from "./rooms.gateway";
import { RoomsService } from "./rooms.service";
@Module({imports:[GamesModule],providers:[RoomsService,RoomsGateway]}) export class RoomsModule{}
