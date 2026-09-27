import { GameId, GameResult, MultiplayerGame } from "@arcadenet/shared";

type Point = { row: number; col: number };
type TurnState = { players: [string, string]; turnPlayerId: string; winnerId?: string; draw?: boolean };
const other = (s: TurnState, id: string) => s.players.find((player) => player !== id)!;
const win = (winnerId: string): GameResult => ({ status: "WIN", winnerId });
const TANK_DELTAS: Record<string, number[]> = { up: [-1,0], right: [0,1], down: [1,0], left: [0,-1] };

abstract class TurnEngine implements MultiplayerGame<any, any, any> {
  abstract readonly id: GameId;
  abstract createInitialState(playerIds: string[]): any;
  abstract validateInput(state: any, playerId: string, input: any): boolean;
  abstract applyInput(state: any, playerId: string, input: any): any;
  update(state: any, _deltaMs: number) { return state; }
  checkWinCondition(state: any): GameResult | null {
    if (state.winnerId) return win(state.winnerId);
    if (state.draw) return { status: "DRAW" };
    return null;
  }
  serializeState(state: any) { return state; }
  protected players(ids: string[]): [string, string] {
    if (ids.length !== 2) throw new Error(`${this.id} requires two players.`);
    return [ids[0], ids[1]];
  }
}

export class ConnectFourEngine extends TurnEngine {
  readonly id = "connect-four" as const;
  createInitialState(ids: string[]) { const players = this.players(ids); return { players, board: Array(42).fill(null), marks: { [players[0]]: "R", [players[1]]: "Y" }, turnPlayerId: players[0] }; }
  validateInput(s: any, p: string, i: any) { return s.turnPlayerId === p && Number.isInteger(i?.column) && i.column >= 0 && i.column < 7 && s.board[i.column] === null; }
  applyInput(s: any, p: string, i: any) {
    if (!this.validateInput(s, p, i)) return s;
    const board = [...s.board]; let row = 0;
    while (row < 5 && board[(row + 1) * 7 + i.column] === null) row++;
    board[row * 7 + i.column] = s.marks[p];
    const next = { ...s, board, moves: (s.moves ?? 0) + 1, turnPlayerId: other(s, p) };
    if (this.hasFour(board, row, i.column, s.marks[p])) next.winnerId = p;
    else if (board.every(Boolean)) next.draw = true;
    return next;
  }
  private hasFour(board: any[], row: number, col: number, mark: string) {
    const directions = [[0,1],[1,0],[1,1],[1,-1]];
    return directions.some(([dr,dc]) => {
      let count = 1;
      for (const sign of [-1,1]) for (let step=1; step<4; step++) {
        const r=row+dr*step*sign, c=col+dc*step*sign;
        if (r<0||r>=6||c<0||c>=7||board[r*7+c]!==mark) break;
        count++;
      }
      return count>=4;
    });
  }
}

export class DamaEngine extends TurnEngine {
  readonly id = "dama" as const;
  createInitialState(ids: string[]) {
    const players=this.players(ids), board=Array(64).fill(null);
    for(let r=0;r<3;r++)for(let c=0;c<8;c++)if((r+c)%2===1)board[r*8+c]={owner:players[1],king:false};
    for(let r=5;r<8;r++)for(let c=0;c<8;c++)if((r+c)%2===1)board[r*8+c]={owner:players[0],king:false};
    return {players,board,turnPlayerId:players[0]};
  }
  validateInput(s:any,p:string,i:any) {
    if(s.turnPlayerId!==p||!this.point(i?.from)||!this.point(i?.to))return false;
    const {row:r,col:c}=i.from,{row:nr,col:nc}=i.to,piece=s.board[r*8+c];
    if(!piece||piece.owner!==p||s.board[nr*8+nc]||Math.abs(nc-c)!==Math.abs(nr-r))return false;
    const distance=Math.abs(nr-r),forward=piece.king?1:(p===s.players[0]?-1:1);
    if(distance===1)return nr-r===forward;
    if(distance!==2||nr-r!==2*forward)return false;
    const jumped=s.board[((r+nr)/2)*8+(c+nc)/2];
    return Boolean(jumped&&jumped.owner!==p);
  }
  applyInput(s:any,p:string,i:any) {
    if(!this.validateInput(s,p,i))return s;
    const board=[...s.board],from=i.from.row*8+i.from.col,to=i.to.row*8+i.to.col,piece={...board[from]};
    board[from]=null;board[to]=piece;
    if(Math.abs(i.to.row-i.from.row)===2)board[((i.from.row+i.to.row)/2)*8+(i.from.col+i.to.col)/2]=null;
    if((p===s.players[0]&&i.to.row===0)||(p===s.players[1]&&i.to.row===7))piece.king=true;
    const next={...s,board,moves:(s.moves??0)+1,turnPlayerId:other(s,p)};
    if(!board.some((x:any)=>x?.owner===other(s,p)))next.winnerId=p;
    return next;
  }
  private point(p:any):p is Point{return Number.isInteger(p?.row)&&p.row>=0&&p.row<8&&Number.isInteger(p?.col)&&p.col>=0&&p.col<8;}
}

export class PongEngine extends TurnEngine {
  readonly id="pong" as const;
  createInitialState(ids:string[]){const players=this.players(ids);return{players,paddles:{[players[0]]:300,[players[1]]:300},ball:{x:500,y:300,vx:360,vy:170},score:{[players[0]]:0,[players[1]]:0},rally:0,moves:0};}
  validateInput(s:any,p:string,i:any){return s.players.includes(p)&&Number.isFinite(i?.paddleY)&&i.paddleY>=0&&i.paddleY<=600;}
  applyInput(s:any,p:string,i:any){if(!this.validateInput(s,p,i))return s;return{...s,paddles:{...s.paddles,[p]:i.paddleY},moves:(s.moves??0)+1};}
  update(s:any,deltaMs:number){
    if(s.winnerId||s.draw)return s;
    const ball={...s.ball},previousX=s.ball.x,dt=Math.min(deltaMs,50)/1000,players=s.players,halfPaddle=58,radius=11;
    ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;
    if(ball.y<radius){ball.y=radius;ball.vy=Math.abs(ball.vy);}
    if(ball.y>600-radius){ball.y=600-radius;ball.vy=-Math.abs(ball.vy);}
    const left=players[0],right=players[1];
    let rally=s.rally;
    if(ball.vx<0&&previousX>=49&&ball.x-radius<=49&&Math.abs(ball.y-s.paddles[left])<=halfPaddle+radius){ball.x=49;ball.vx=Math.min(680,Math.abs(ball.vx)*1.045);ball.vy+=(ball.y-s.paddles[left])*2.6;rally++;}
    if(ball.vx>0&&previousX<=951&&ball.x+radius>=951&&Math.abs(ball.y-s.paddles[right])<=halfPaddle+radius){ball.x=951;ball.vx=-Math.min(680,Math.abs(ball.vx)*1.045);ball.vy+=(ball.y-s.paddles[right])*2.6;rally++;}
    ball.vy=Math.max(-540,Math.min(540,ball.vy));
    if(ball.x < -radius || ball.x > 1000+radius){
      const scorer=ball.x<0?right:left,score={...s.score,[scorer]:s.score[scorer]+1},winnerId=score[scorer]>=5?scorer:undefined;
      const direction=scorer===left?1:-1;
      return{...s,score,winnerId,rally:0,ball:{x:500,y:300,vx:direction*360,vy:(Math.random()-.5)*240}};
    }
    return{...s,ball,rally};
  }
}
export class SnakeBattleEngine extends TurnEngine {
  readonly id="snake-battle" as const;
  createInitialState(ids:string[]){const players=this.players(ids),[left,right]=players;return{players,width:15,height:15,snakes:{[left]:[{row:12,col:3},{row:13,col:3},{row:14,col:3}],[right]:[{row:2,col:11},{row:1,col:11},{row:0,col:11}]},directions:{[left]:"up",[right]:"down"},food:{row:7,col:7},moves:0};}
  validateInput(s:any,p:string,i:any){if(!s.players.includes(p)||!["up","down","left","right"].includes(i?.direction))return false;const current=s.directions[p],opposite:Record<string,string>={up:"down",down:"up",left:"right",right:"left"};return i.direction!==opposite[current];}
  applyInput(s:any,p:string,i:any){if(!this.validateInput(s,p,i))return s;return{...s,directions:{...s.directions,[p]:i.direction}};}
  update(s:any,_deltaMs:number){
    if(s.winnerId||s.draw)return s;
    const nextHeads:Record<string,Point>={},directions:Record<string,string>={...s.directions};
    for(const id of s.players){const head={...s.snakes[id][0]},direction=directions[id];if(direction==="up")head.row--;if(direction==="down")head.row++;if(direction==="left")head.col--;if(direction==="right")head.col++;nextHeads[id]=head;}
    const eats:Record<string,boolean>=Object.fromEntries(s.players.map((id:string)=>[id,nextHeads[id].row===s.food.row&&nextHeads[id].col===s.food.col]));
    const crashed=new Set<string>();
    for(const id of s.players){const head=nextHeads[id],body=s.snakes[id],hitsWall=head.row<0||head.row>=s.height||head.col<0||head.col>=s.width,ownBody=body.slice(0,eats[id]?undefined:-1),opponent=s.players.find((otherId:string)=>otherId!==id)!,opponentBody=s.snakes[opponent].slice(0,eats[opponent]?undefined:-1),hitsBody=[...ownBody,...opponentBody].some((part:Point)=>part.row===head.row&&part.col===head.col);if(hitsWall||hitsBody)crashed.add(id);}
    const [first,second]=s.players,headA=nextHeads[first],headB=nextHeads[second];
    if((headA.row===headB.row&&headA.col===headB.col)||(headA.row===s.snakes[second][0].row&&headA.col===s.snakes[second][0].col&&headB.row===s.snakes[first][0].row&&headB.col===s.snakes[first][0].col)){crashed.add(first);crashed.add(second);}
    if(crashed.size){const survivor=s.players.find((id:string)=>!crashed.has(id));return{...s,winnerId:crashed.size===1?survivor:undefined,draw:crashed.size===2};}
    const snakes:Record<string,Point[]>={};
    for(const id of s.players){const body=[nextHeads[id],...s.snakes[id]];if(!eats[id])body.pop();snakes[id]=body;}
    let food=s.food;
    if(s.players.some((id:string)=>eats[id])){const occupied=new Set(s.players.flatMap((id:string)=>snakes[id].map((part:Point)=>`${part.row},${part.col}`))),available:Point[]=[];for(let row=0;row<s.height;row++)for(let col=0;col<s.width;col++)if(!occupied.has(`${row},${col}`))available.push({row,col});food=available.length?available[Math.floor(Math.random()*available.length)]:s.food;}
    const filled=Object.values(snakes).reduce((total,body)=>total+body.length,0)>=s.width*s.height;
    return{...s,snakes,food,moves:s.moves+1,draw:filled||undefined};
  }
}

const FLEET:Point[]=[...Array.from({length:5},(_,i)=>({row:0,col:i})),...Array.from({length:4},(_,i)=>({row:2,col:i})),...Array.from({length:3},(_,i)=>({row:4,col:i})),...Array.from({length:3},(_,i)=>({row:6,col:i})),{row:7,col:6},{row:7,col:7}];
export class BattleshipEngine extends TurnEngine {
  readonly id="battleship" as const;
  createInitialState(ids:string[]){const players=this.players(ids);return{players,turnPlayerId:players[0],shots:{[players[0]]:[],[players[1]]:[]},hits:{[players[0]]:0,[players[1]]:0},lastShot:null};}
  validateInput(s:any,p:string,i:any){return s.turnPlayerId===p&&Number.isInteger(i?.row)&&i.row>=0&&i.row<8&&Number.isInteger(i?.col)&&i.col>=0&&i.col<8&&!s.shots[p].some((x:Point)=>x.row===i.row&&x.col===i.col);}
  applyInput(s:any,p:string,i:any){if(!this.validateInput(s,p,i))return s;const hit=FLEET.some((x)=>x.row===i.row&&x.col===i.col),shot={row:i.row,col:i.col,hit},shots={...s.shots,[p]:[...s.shots[p],shot]},hits={...s.hits,[p]:s.hits[p]+Number(hit)};return{...s,shots,hits,lastShot:{playerId:p,...shot},turnPlayerId:other(s,p),winnerId:hits[p]>=FLEET.length?p:undefined};}
}

type ChessPiece={owner:string;type:"K"|"Q"|"R"|"B"|"N"|"P"};
export class ChessEngine extends TurnEngine {
  readonly id="chess" as const;
  createInitialState(ids:string[]){const players=this.players(ids),board=Array(64).fill(null),back:ChessPiece["type"][]=["R","N","B","Q","K","B","N","R"];for(let c=0;c<8;c++){board[c]={owner:players[1],type:back[c]};board[8+c]={owner:players[1],type:"P"};board[48+c]={owner:players[0],type:"P"};board[56+c]={owner:players[0],type:back[c]};}return{players,board,turnPlayerId:players[0]};}
  validateInput(s:any,p:string,i:any){if(s.turnPlayerId!==p||!this.square(i?.from)||!this.square(i?.to))return false;const{row:r,col:c}=i.from,{row:nr,col:nc}=i.to,from=s.board[r*8+c] as ChessPiece|null,to=s.board[nr*8+nc] as ChessPiece|null;if(!from||from.owner!==p||to?.owner===p||(r===nr&&c===nc))return false;const dr=nr-r,dc=nc-c,ar=Math.abs(dr),ac=Math.abs(dc);let shape=false;if(from.type==="P"){const dir=p===s.players[0]?-1:1;shape=dc===0&&!to&&dr===dir||dc===0&&!to&&dr===2*dir&&r===(p===s.players[0]?6:1)&&!s.board[(r+dir)*8+c]||ac===1&&dr===dir&&Boolean(to);}else if(from.type==="N")shape=(ar===2&&ac===1)||(ar===1&&ac===2);else if(from.type==="K")shape=ar<=1&&ac<=1;else if(from.type==="R")shape=dr===0||dc===0;else if(from.type==="B")shape=ar===ac;else shape=dr===0||dc===0||ar===ac;if(!shape)return false;if(from.type!=="N"&&this.blocked(s.board,r,c,nr,nc))return false;return true;}
  applyInput(s:any,p:string,i:any){if(!this.validateInput(s,p,i))return s;const board=[...s.board],from=i.from.row*8+i.from.col,to=i.to.row*8+i.to.col,captured=board[to];board[to]=board[from];board[from]=null;if(board[to].type==="P"&&(i.to.row===0||i.to.row===7))board[to]={...board[to],type:"Q"};const next={...s,board,moves:(s.moves??0)+1,turnPlayerId:other(s,p)};if(captured?.type==="K")next.winnerId=p;return next;}
  private square(p:any):p is Point{return Number.isInteger(p?.row)&&p.row>=0&&p.row<8&&Number.isInteger(p?.col)&&p.col>=0&&p.col<8;}
  private blocked(board:any[],r:number,c:number,nr:number,nc:number){const dr=Math.sign(nr-r),dc=Math.sign(nc-c);let y=r+dr,x=c+dc;while(y!==nr||x!==nc){if(board[y*8+x])return true;y+=dr;x+=dc;}return false;}
}

const SHAPES=[[[1,0],[1,1],[1,2],[1,3]],[[0,0],[0,1],[1,0],[1,1]],[[0,1],[1,0],[1,1],[1,2]],[[0,1],[0,2],[1,0],[1,1]],[[0,0],[0,1],[1,1],[1,2]],[[0,0],[1,0],[1,1],[1,2]],[[0,2],[1,0],[1,1],[1,2]]];
function tetrisShape(pieceIndex:number,rotation:number){let shape=SHAPES[pieceIndex%SHAPES.length].map(([r,c])=>[r,c]);for(let turn=0;turn<rotation;turn++){const maxRow=Math.max(...shape.map(([r])=>r));shape=shape.map(([r,c])=>[c,maxRow-r]);const minRow=Math.min(...shape.map(([r])=>r)),minCol=Math.min(...shape.map(([,c])=>c));shape=shape.map(([r,c])=>[r-minRow,c-minCol]);}const minRow=Math.min(...shape.map(([r])=>r)),minCol=Math.min(...shape.map(([,c])=>c));return shape.map(([r,c])=>[r-minRow,c-minCol]);}
export class TetrisBattleEngine extends TurnEngine {
  readonly id="tetris-battle" as const;
  private readonly gravityInterval=520;
  createInitialState(ids:string[]){const players=this.players(ids),boards:any={},lines:any={},scores:any={},levels:any={},piecesPlaced:any={},activePieces:any={},heldPieces:any={},holdUsed:any={},gravityMs:any={};for(const id of players){boards[id]=Array(200).fill(null);lines[id]=0;scores[id]=0;levels[id]=1;piecesPlaced[id]=0;activePieces[id]={type:0,rotation:0,x:3,y:0};heldPieces[id]=null;holdUsed[id]=false;gravityMs[id]=0;}return{players,boards,lines,scores,levels,piecesPlaced,activePieces,heldPieces,holdUsed,gravityMs,moves:0};}
  validateInput(s:any,p:string,i:any){return s.players.includes(p)&&!s.winnerId&&s.activePieces?.[p]&&["left","right","down","hard-drop","rotate","hold"].includes(i?.action);}
  applyInput(s:any,p:string,i:any){if(!this.validateInput(s,p,i))return s;const next={...s,boards:{...s.boards,[p]:[...s.boards[p]]},activePieces:{...s.activePieces},heldPieces:{...s.heldPieces},holdUsed:{...s.holdUsed},gravityMs:{...s.gravityMs},moves:(s.moves??0)+1};const piece={...next.activePieces[p]},board=next.boards[p];if(i.action==="hold"){if(next.holdUsed[p])return s;const held=next.heldPieces[p];next.heldPieces[p]=piece.type;if(held===null){next.piecesPlaced={...next.piecesPlaced,[p]:next.piecesPlaced[p]+1};piece.type=next.piecesPlaced[p]%SHAPES.length;}else piece.type=held;piece.x=3;piece.y=0;piece.rotation=0;if(!this.fits(board,piece))return{...next,winnerId:other(s,p)};next.activePieces[p]=piece;next.holdUsed[p]=true;return next;}if(i.action==="left"||i.action==="right"){const moved={...piece,x:piece.x+(i.action==="left"?-1:1)};if(this.fits(board,moved))next.activePieces[p]=moved;}else if(i.action==="rotate"){const rotation=(piece.rotation+1)%4;for(const offset of [0,-1,1,-2,2]){const rotated={...piece,rotation,x:piece.x+offset};if(this.fits(board,rotated)){next.activePieces[p]=rotated;break;}}}else if(i.action==="hard-drop"){while(this.fits(board,{...piece,y:piece.y+1}))piece.y++;next.activePieces[p]=piece;return this.lockPiece(next,p);}else if(i.action==="down"){if(this.fits(board,{...piece,y:piece.y+1}))next.activePieces[p]={...piece,y:piece.y+1};else return this.lockPiece(next,p);}return next;}
  update(s:any,deltaMs:number){if(s.winnerId)return s;let next={...s,gravityMs:{...s.gravityMs}};for(const p of next.players){next.gravityMs[p]=(next.gravityMs[p]??0)+deltaMs;let interval=Math.max(160,this.gravityInterval-(next.levels[p]-1)*100);while(next.gravityMs[p]>=interval&&!next.winnerId){next.gravityMs[p]-=interval;const piece=next.activePieces[p],board=next.boards[p];if(this.fits(board,{...piece,y:piece.y+1})){next={...next,activePieces:{...next.activePieces,[p]:{...piece,y:piece.y+1}}};}else next=this.lockPiece({...next,boards:{...next.boards,[p]:[...board]},activePieces:{...next.activePieces}},p);interval=Math.max(160,this.gravityInterval-(next.levels[p]-1)*100);}}return next;}
  private fits(board:any[],piece:any){const shape=tetrisShape(piece.type,piece.rotation);return shape.every(([dy,dx])=>{const row=piece.y+dy,col=piece.x+dx;return row>=0&&row<20&&col>=0&&col<10&&board[row*10+col]===null;});}
  private lockPiece(s:any,p:string){const piece=s.activePieces[p],board=s.boards[p],shape=tetrisShape(piece.type,piece.rotation);for(const[dy,dx]of shape){const row=piece.y+dy,col=piece.x+dx;if(row<0)return{...s,winnerId:other(s,p)};board[row*10+col]=String(piece.type);}const remaining:any[]=[];let cleared=0;for(let row=0;row<20;row++){const cells=board.slice(row*10,row*10+10);if(cells.every(Boolean))cleared++;else remaining.push(...cells);}while(remaining.length<200)remaining.unshift(...Array(10).fill(null));const lines={...s.lines,[p]:s.lines[p]+cleared},scores={...s.scores,[p]:s.scores[p]+([0,100,300,500,800][cleared]??0)},levels={...s.levels,[p]:Math.floor((s.lines[p]+cleared)/2)+1},piecesPlaced={...s.piecesPlaced,[p]:s.piecesPlaced[p]+1},type=piecesPlaced[p]%SHAPES.length,spawn={type,rotation:0,x:3,y:0},activePieces={...s.activePieces,[p]:spawn},holdUsed={...s.holdUsed,[p]:false},next={...s,boards:{...s.boards,[p]:remaining},lines,scores,levels,piecesPlaced,activePieces,holdUsed,pieceIndex:(s.pieceIndex??0)+1};if(lines[p]>=5)return{...next,winnerId:p};if(!this.fits(remaining,spawn))return{...next,winnerId:other(s,p)};return next;}
}

const RACE_TEXTS=[
  "A calm mind can find a clear path through even the busiest day.",
  "Small steps taken with care can lead to remarkable discoveries.",
  "Bright stars appear when the evening sky grows quiet and clear.",
  "Practice turns a difficult challenge into a skill you can trust.",
  "Curious people ask good questions and listen closely to the answers.",
  "A friendly game is more fun when everyone gets a fair chance.",
  "Rain tapped softly on the window while the warm tea began to cool.",
  "The clever fox crossed the meadow before the sun slipped away.",
  "Good teamwork starts when each person shares what they notice.",
  "Learning something new takes patience, focus, and a little courage.",
  "The old map led the travelers toward a quiet village by the sea.",
  "Fresh ideas often appear after taking a short break and a deep breath.",
];
export class TypingRaceEngine extends TurnEngine {
  readonly id="typing-race" as const;
  private lastText?:string;
  createInitialState(ids:string[]){const players=this.players(ids),choices=RACE_TEXTS.filter((text)=>text!==this.lastText),text=choices[Math.floor(Math.random()*choices.length)];this.lastText=text;return{players,turnPlayerId:players[0],text,progress:{[players[0]]:"",[players[1]]:""},winnerId:undefined};}
  validateInput(s:any,p:string,i:any){return s.players.includes(p)&&!s.winnerId&&typeof i?.text==="string"&&i.text.length>=s.progress[p].length&&i.text.length<=s.text.length&&i.text===s.text.slice(0,i.text.length)&&i.text.startsWith(s.progress[p]);}
  applyInput(s:any,p:string,i:any){if(!this.validateInput(s,p,i))return s;const progress={...s.progress,[p]:i.text};return{...s,progress,winnerId:i.text===s.text?p:undefined};}
}

export class TankBattleEngine extends TurnEngine {
  readonly id="tank-battle" as const;
  createInitialState(ids:string[]){const players=this.players(ids);return{players,turnPlayerId:players[0],tanks:{[players[0]]:{row:7,col:0,direction:"up",health:1},[players[1]]:{row:0,col:7,direction:"down",health:1}}};}
  validateInput(s:any,p:string,i:any){return s.turnPlayerId===p&&["move","left","right","fire"].includes(i?.action);}
  applyInput(s:any,p:string,i:any){if(!this.validateInput(s,p,i))return s;const tanks={...s.tanks,[p]:{...s.tanks[p]}},tank=tanks[p],dirs=["up","right","down","left"],turn=dirs.indexOf(tank.direction);if(i.action==="left")tank.direction=dirs[(turn+3)%4];if(i.action==="right")tank.direction=dirs[(turn+1)%4];if(i.action==="move"){const delta=TANK_DELTAS[tank.direction];const row=tank.row+delta[0],col=tank.col+delta[1];if(row>=0&&row<8&&col>=0&&col<8&&!Object.values(tanks).some((x:any)=>x.row===row&&x.col===col)){tank.row=row;tank.col=col;}}let winnerId; if(i.action==="fire"){const foe=tanks[other(s,p)],delta=TANK_DELTAS[tank.direction];let row=tank.row+delta[0],col=tank.col+delta[1];while(row>=0&&row<8&&col>=0&&col<8){if(row===foe.row&&col===foe.col){winnerId=p;break;}row+=delta[0];col+=delta[1];}}return{...s,tanks,moves:(s.moves??0)+1,turnPlayerId:other(s,p),winnerId};}
}
