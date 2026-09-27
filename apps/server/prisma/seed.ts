import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const games = [
    ["tic-tac-toe", "Tic-Tac-Toe", "Classic 3x3 strategy.", "Strategy"],
    ["connect-four", "Connect Four", "Drop four pieces in a row.", "Strategy"],
    ["dama", "Dama", "Classic 8x8 checkers-style battle.", "Board"],
    ["pong", "Pong", "Fast two-paddle arcade action.", "Arcade"],
    ["snake-battle", "Snake Battle", "Outlast your opponent.", "Arcade"],
    ["battleship", "Battleship", "Attack the hidden fleet.", "Strategy"],
    ["chess", "Chess", "Classic competitive chess.", "Board"],
    [
      "tetris-battle",
      "Tetris Battle",
      "Clear lines and send garbage.",
      "Puzzle",
    ],
    ["typing-race", "Typing Race", "Race to finish the same text.", "Skill"],
    ["tank-battle", "Tank Battle", "Top-down tank combat.", "Action"],
  ];
  for (const [id, name, description, category] of games)
    await prisma.game.upsert({
      where: { id },
      update: { name, description, category },
      create: { id, name, description, category },
    });
}
main().finally(() => prisma.$disconnect());
