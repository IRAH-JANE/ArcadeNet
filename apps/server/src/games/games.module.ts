import { Module } from "@nestjs/common";
import { GameRegistry } from "./game.registry";
@Module({providers:[GameRegistry],exports:[GameRegistry]}) export class GamesModule{}
