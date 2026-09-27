import { TicTacToeEngine } from "./tictactoe.engine";
describe("TicTacToeEngine", () => {
  const e = new TicTacToeEngine();
  const [a, b] = ["a", "b"];
  it("detects a win", () => {
    let s = e.createInitialState([a, b]);
    s = e.applyInput(s, a, { index: 0 });
    s = e.applyInput(s, b, { index: 3 });
    s = e.applyInput(s, a, { index: 1 });
    s = e.applyInput(s, b, { index: 4 });
    s = e.applyInput(s, a, { index: 2 });
    expect(e.checkWinCondition(s)).toEqual({ status: "WIN", winnerId: a });
  });
  it("detects a draw", () => {
    let s = e.createInitialState([a, b]);
    for (const [p, i] of [
      [a, 0],
      [b, 1],
      [a, 2],
      [b, 4],
      [a, 3],
      [b, 5],
      [a, 7],
      [b, 6],
      [a, 8],
    ] as Array<[string, number]>)
      s = e.applyInput(s, p, { index: i });
    expect(e.checkWinCondition(s)).toEqual({ status: "DRAW" });
  });
  it("rejects wrong turn", () => {
    const s = e.createInitialState([a, b]);
    expect(e.validateInput(s, b, { index: 0 })).toBe(false);
  });
});
