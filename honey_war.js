function make_board() {
	var board = {};
	var colors = ["green", "purple", "orange"];
	var dx_x = 2;
	var dx_y = 1;
	var dy_x = -2;
	var dy_y = 1;
	var id = 0;
	for (let x = -5; x <= 5; x++) {
		let y0 = -5;
		let y1 = 5;
		if (x < 0) { y1 += x; }
		if (x > 0) { y0 += x; }
		for (let y = y0; y <= y1; y++) {
			let c_x = (dx_x * x) + (dy_x * y);
			let c_y = (dx_y * x) + (dy_y * y);
			board[[x,y]] = {
				q: y-Math.abs(x),
				color: colors[(y+x+12)%3],
				cx: c_x * 20 + 250,
				cy: c_y * 20 + 250,
				piece: {player: 0, piece: ""},
				id: "space" + id
			}
			id++;
		}
	}
	// no player
	board[[-2,2]].piece.piece = "tower";
	board[[2,-2]].piece.piece = "tower";
	board[[0,0]].piece.piece = "tower";

	// foot soldiers
	var foot_locs = [[1,5],[1,4],[2,4],[2,3],[3,4],[2,2]];
	for (let i = 0; i < foot_locs.length; i++) {
		let a = foot_locs[i][0];
		let b = foot_locs[i][1];
		board[[a,b]].piece = {player: 1, piece: "footsoldier"};
		board[[b,a]].piece = {player: 1, piece: "footsoldier"};
		board[[-a,-b]].piece = {player: 2, piece: "footsoldier"};
		board[[-b,-a]].piece = {player: 2, piece: "footsoldier"};
	}

	// infantry
	var inf_locs = [[2,5],[4,5],[5,3]];
	for (let i = 0; i < inf_locs.length; i++) {
		let a = inf_locs[i][0];
		let b = inf_locs[i][1];
		board[[a,b]].piece = {player: 1, piece: "infantry"};
		board[[-a,-b]].piece = {player: 2, piece: "infantry"};
	}

	// trebuchets
	board[[3,3]].piece = {player: 1, piece: "trebuchet"};
	board[[-3,-3]].piece = {player: 2, piece: "trebuchet"};

	// castles
	board[[4,4]].piece = {player: 1, piece: "castle", health: 2};
	board[[-4,-4]].piece = {player: 2, piece: "castle", health: 2};

	// cavalry
	board[[3,5]].piece = {player: 1, piece: "cavalry"};
	board[[5,4]].piece = {player: 1, piece: "cavalry"};
	board[[5,2]].piece = {player: 1, piece: "cavalry"};
	board[[-3,-5]].piece = {player: 2, piece: "cavalry"};
	board[[-5,-4]].piece = {player: 2, piece: "cavalry"};
	board[[-5,-2]].piece = {player: 2, piece: "cavalry"};

	// chariot
	board[[5,5]].piece = {player: 1, piece: "chariot"};
	board[[-5,-5]].piece = {player: 2, piece: "chariot"};

	return board;
}

function draw_board(svg, board, pieces) {
	var symbols = {
		tower: "T",
		footsoldier: "F",
		infantry: "I",
		trebuchet: "B",
		castle: "C",
		cavalry: "K",
		chariot: "H",
		garrison: "G",
		tower_infantry: "TI",
		tower_cavalry: "TC"
	};
	var s = "";
	for (let k in board) {
		s += '<circle class="space" cx="' + board[k].cx + '" cy="' + board[k].cy + '" fill="' + board[k].color + '" id="' + board[k].id + '" r="20"/>';
		if (board[k].piece.player != 0 || board[k].piece.piece == "tower") {
			let lab = "";
			let x = board[k].cx - 10;
			if (!board[k].piece.player == 0) {
				lab += board[k].piece.player;
			}
			lab += symbols[board[k].piece.piece];
			s += '<image x="' + (x - 15.5) + '" y="' + (board[k].cy - 22) + '" href="imgs/' + lab + '.svg" width="50" />';
		}
	}
	svg.innerHTML = s;
}

function exists(board, x, y) {
	return board.hasOwnProperty([x,y]);
}

function empty(board, x, y) {
	return exists(board, x,y) &&
		board[[x,y]].piece.player == 0 &&
		board[[x,y]].piece.piece == "";
}

function friendly(board, x, y, player) {
	return exists(board, x,y) && board[[x,y]].piece.player == player;
}

function enemy(board, x, y, player) {
	return exists(board, x,y) && board[[x,y]].piece.player == (3-player);
}

function copy_piece(pc) {
	var ret = {};
	for (let k in pc) {
		ret[k] = pc[k];
	}
	return ret;
}

function make_move(board, from_pos, to_pos) {
	if (from_pos[0] == to_pos[0] && from_pos[1] == to_pos[1]) {
		return {
			verb: "move",
			source: {
				loc: from_pos,
				was: copy_piece(board[from_pos].piece),
				is: copy_piece(board[from_pos].piece)
			}
		};
	}
	return {
		verb: "move",
		source: {
			loc: from_pos,
			was: copy_piece(board[from_pos].piece),
			is: {player: 0, piece: ""}
		},
		dest: {
			loc: to_pos,
			was: copy_piece(board[to_pos].piece),
			is: copy_piece(board[from_pos].piece)
		}
	};
}

function make_attack(board, from_pos, to_pos, attack_pos) {
	var ret = make_move(board, from_pos, to_pos);
	ret.verb = "attack";
	ret.attack = {
		loc: attack_pos,
		was: copy_piece(board[attack_pos].piece),
		is: {player: 0, piece: ""}
	};
	if (ret.source.was.piece == "trebuchet") {
		delete ret.dest;
		ret.source.is = ret.source.was;
		if (ret.attack.was.piece == "castle") {
			ret.verb = "win";
		}
	} else if (ret.attack.was.piece == "infantry") {
		ret.attack.is = {
			player: ret.attack.was.player,
			piece: "footsoldier"
		};
	} else if (ret.attack.was.piece == "castle") {
		if (ret.attack.was.health == 1) {
			ret = {
				verb: "win",
				source: ret.source,
				attack: {
					loc: attack_pos,
					was: copy_piece(ret.attack.was),
					is: {player: 0, piece: ""}
				}
			};
		} else {
			delete ret.dest;
			ret.attack.is = copy_piece(ret.attack.was);
			ret.attack.is.health = 1;
		}
	} else if (ret.attack.was.piece == "garrison") {
		ret.attack.is = {player: 0, piece: "tower"};
	}
	return ret;
}

function list_adjacent(x, y) {
	return [[x+1,y],[x-1,y],[x+1,y+1],[x-1,y-1],[x,y+1],[x,y-1]];
}

function cavalry_moves(board, x0, y0, player) {
	var locs = [];
	var step1 = list_adjacent(x0, y0);
	for (let i = 0; i < step1.length; i++) {
		let x1 = step1[i][0];
		let y1 = step1[i][1];
		if (empty(board, x1, y1) || friendly(board, x1, y1, player)) {
			let step2 = list_adjacent(x1, y1);
			for (let j = 0; j < step2.length; j++) {
				let x2 = step2[j][0];
				let y2 = step2[j][1];
				if ((x2 == x0 && y2 == y0) || !exists(board, x2, y2) ||
					board[[x2,y2]].color != board[[x0,y0]].color) {
					continue;
				}
				let already = false;
				for (let k = 0; k < locs.length; k++) {
					if (locs[k][0] == x2 && locs[k][1] == y2) {
						already = true;
						break;
					}
				}
				if (!already) {
					locs.push([x2,y2]);
				}
			}
		}
	}
	return locs;
}

function list_possible_moves(board, player, is_phase_2) {
	var moves = [];
	var forward = (player == 1 ? -1 : 1);
	for (let pos in board) {
		let piece = board[pos].piece;
		if (piece.player != player) { continue; }
		let x = parseInt(pos.split(',')[0]);
		let y = parseInt(pos.split(',')[1]);
		pos = [x,y];
		if (piece.piece == "footsoldier") {
			let locs = [[x+forward,y],[x,y+forward]];
			let alocs = [[x+(2*forward),y],[x,y+(2*forward)]];
			for (let i = 0; i < locs.length; i++) {
				if (empty(board, locs[i][0], locs[i][1])) {
					moves.push(make_move(board, pos, locs[i]));
				}
				if (is_phase_2 &&
					enemy(board, locs[i][0], locs[i][1], player) &&
					empty(board, alocs[i][0], alocs[i][1])) {
					moves.push(make_attack(board, pos, alocs[i], locs[i]));
				} else if (is_phase_2 &&
						   empty(board, alocs[i][0], alocs[i][1]) &&
						   board[locs[i]].piece.piece == "tower") {
					let mv = make_attack(board, pos, alocs[i], locs[i]);
					mv.dest.is.piece = "infantry";
					moves.push(mv);
				}
			}
		} else if (piece.piece == "infantry") {
			let locs = list_adjacent(x, y);
			for (let i = 0; i < locs.length; i++) {
				if (empty(board, locs[i][0], locs[i][1])) {
					moves.push(make_move(board, pos, locs[i]));
				}
			}
			if (is_phase_2) {
				let dirs = list_adjacent(0,0);
				for (let i = 0; i < dirs.length; i++) {
					let dx = dirs[i][0];
					let dy = dirs[i][1];
					if (enemy(board, x+dx, y+dy, player) &&
						empty(board, x+(2*dx), y+(2*dy))) {
						moves.push(make_attack(board, pos, [x+(2*dx), y+(2*dy)],
											   [x+dx, y+dy]));
					} else if (empty(board, x+dx, y+dy) &&
							   enemy(board, x+(2*dx), y+(2*dy), player) &&
							   empty(board, x+(3*dx), y+(3*dy))) {
						moves.push(make_attack(board, pos, [x+(3*dx), y+(3*dy)],
											   [x+(2*dx), y+(2*dy)]));
					} else if (exists(board, x+dx, y+dy) &&
							   board[[x+dx,y+dy]].piece.piece == "tower") {
						let mv = make_move(board, pos, [x+dx,y+dy]);
						mv.verb = "garrison";
						mv.dest.is.piece = "garrison";
						moves.push(mv);
					}
				}
			}
		} else if (piece.piece == "trebuchet" && is_phase_2) {
			let dirs = list_adjacent(0, 0);
			for (let i = 0; i < dirs.length; i++) {
				let dx = dirs[i][0];
				let dy = dirs[i][1];
				if (empty(board, x+dx, y+dy)) {
					moves.push(make_move(board, pos, [x+dx, y+dy]));
				}
				let aloc = [x+(2*dx), y+(2*dy)];
				if (exists(board, aloc[0], aloc[1]) &&
					!empty(board, aloc[0], aloc[1]) &&
					board[aloc].piece.player != player) {
					moves.push(make_attack(board, pos, pos, aloc));
				}
			}
		} else if (piece.piece == "cavalry") {
			let step1 = cavalry_moves(board, x, y, player);
			for (let i = 0; i < step1.length; i++) {
				let x1 = step1[i][0];
				let y1 = step1[i][1];
				if (empty(board, x1, y1)) {
					moves.push(make_move(board, pos, step1[i]));
				} else if (is_phase_2 && enemy(board, x1, y1, player)) {
					let step2 = cavalry_moves(board, x1, y1, player);
					for (let j = 0; j < step2.length; j++) {
						if (empty(board, step2[j][0], step2[j][1]) ||
							(step2[j][0] == x && step2[j][1] == y)) {
							moves.push(make_attack(board, pos, step2[j],
												   step1[i]));
						}
					}
				} else if (is_phase_2 && exists(board, x1, y1) &&
						   board[[x1,y1]].piece.piece == "tower") {
					let mv = make_move(board, pos, step1[i]);
					mv.verb = "garrison";
					mv.dest.is.piece = "garrison";
					moves.push(mv);
				}
			}
		} else if (piece.piece == "chariot") {
			let dirs = list_adjacent(0,0);
			for (let i = 0; i < dirs.length; i++) {
				for (let d = 1; ; d++) {
					let l = [dirs[i][0]*d + x, dirs[i][1]*d + y];
					let ln = [dirs[i][0]*(d+1) + x, dirs[i][1]*(d+1) + y];
					if (empty(board, l[0], l[1])) {
						moves.push(make_move(board, pos, l));
					} else if (enemy(board, l[0], l[1], player) &&
							   empty(board, ln[0], ln[1])) {
						moves.push(make_attack(board, pos, ln, l));
						break;
					} else {
						break;
					}
				}
			}
		} else if (is_phase_2 && piece.piece == "garrison") {
			let locs = list_adjacent(x,y);
			for (let i = 0; i < locs.length; i++) {
				if (enemy(board, locs[i][0], locs[i][1], player)) {
					moves.push(make_attack(board, pos, pos, locs[i]));
				}
			}
		}
	}
	return moves;
}

function highlight_spaces(ids) {
	var ls = document.getElementsByClassName("space");
	for (let i = 0; i < ls.length; i++) {
		ls[i].setAttribute("stroke-width", "0");
	}
	for (let i = 0; i < ids.length; i++) {
		let el = document.getElementById(ids[i]);
		el.setAttribute("stroke-width", "4");
		el.setAttribute("stroke", "black");
	}
}

function display_moves(board, moves, list) {
	var s = "<ol onmouseout='highlight_spaces([]);'>";
	for (let i = 0; i < moves.length; i++) {
		let mv = moves[i];
		let locs = [];
		for (let k in mv) {
			if (k != "verb") {
				locs.push(board[mv[k].loc].id);
			}
		}
		s += "<li onmouseover='highlight_spaces(" + JSON.stringify(locs) + ");' onclick='update(" + i + ");'><em>" + mv.verb + "</em>";
		if (mv.verb == "move") {
			s += " <em>" + mv.source.was.piece + "</em> from " + mv.source.loc + " to " + mv.dest.loc;
		} else if (mv.verb == "attack") {
			s += " <em>" + mv.attack.was.piece + "</em> at " + mv.attack.loc;
			s += " with <em>" + mv.source.was.piece + "</em> at " + mv.source.loc;
			if (mv.hasOwnProperty("dest")) {
				s += " landing at " + mv.dest.loc;
			}
		} else if (mv.verb == "garrison") {
			s += " <em>" + mv.source.was.piece + "</em> from " + mv.source.loc + " to " + mv.dest.loc;
		}
		s += '</li>';
	}
	s += '</ol>';
	list.innerHTML = s;
}

function apply_move(board, move, undo) {
	for (let k in move) {
		if (k == "verb") { continue; }
		board[move[k].loc].piece = (undo ? move[k].was : move[k].is);
	}
}
