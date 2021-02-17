"use strict";

function* iterate_board(player) {
	if (player != 1) {
		for (let x = 5; x >= -5; x--) {
			let y0 = -5;
			let y1 = 5;
			if (x < 0) { y1 += x; }
			if (x > 0) { y0 += x; }
			for (let y = y1; y >= y0; y--) {
				yield [x, y];
			}
		}
	} else {
		for (let x = -5; x <= 5; x++) {
			let y0 = -5;
			let y1 = 5;
			if (x < 0) { y1 += x; }
			if (x > 0) { y0 += x; }
			for (let y = y0; y <= y1; y++) {
				yield [x, y];
			}
		}
	}
}

function make_board() {
	let board = new Map();
	const colors = ["green", "purple", "orange"];
	const dx_x = 2;
	const dx_y = 1;
	const dy_x = -2;
	const dy_y = 1;
	let id = 0;
	for (const [x, y] of iterate_board()) {
		const c_x = (dx_x * x) + (dy_x * y);
		const c_y = (dx_y * x) + (dy_y * y);
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

	// no player
	board[[-2,2]].piece.piece = "tower";
	board[[2,-2]].piece.piece = "tower";
	board[[0,0]].piece.piece = "tower";

	// foot soldiers
	for (const [a, b] of [[1,5],[1,4],[2,4],[2,3],[3,4],[2,2]]) {
		// take advantage of symmetry
		board[[a,b]].piece = {player: 1, piece: "footsoldier"};
		board[[b,a]].piece = {player: 1, piece: "footsoldier"};
		board[[-a,-b]].piece = {player: 2, piece: "footsoldier"};
		board[[-b,-a]].piece = {player: 2, piece: "footsoldier"};
	}

	// infantry
	for (const [a, b] of [[2,5],[4,5],[5,3]]) {
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

function draw_board(svg, board) {
	let s = "";
	for (const k of iterate_board()) {
		s += '<circle class="space" cx="' + board[k].cx + '" cy="' + board[k].cy + '" fill="' + board[k].color + '" id="' + board[k].id + '" r="20"/>';
		if (board[k].piece.player != 0 || board[k].piece.piece == "tower") {
			let lab = "";
			const x = board[k].cx - 10;
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

function is_at(board, piece, x, y) {
	if (y !== undefined) {
		return exists(board, x, y) && board[[x,y]].piece.piece == piece;
	} else {
		return exists(board, x[0], x[1]) && board[x].piece.piece == piece;
	}
}

function copy_piece(pc) {
	let ret = {};
	for (const k in pc) {
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
	let ret = make_move(board, from_pos, to_pos);
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

function list_adjacent(x, y, player) {
	//return [[x+1,y],[x-1,y],[x+1,y+1],[x-1,y-1],[x,y+1],[x,y-1]];
	const a1 = [[x-1,y-1],[x,y-1],[x+1,y]];
	const a2 = [[x+1,y+1],[x,y+1],[x-1,y]];
	if (player != 2) {
		return a1.concat(a2);
	} else {
		return a2.concat(a1);
	}
}

function cavalry_moves(board, x0, y0, player) {
	let locs = [];
	for (const [x1, y1] of list_adjacent(x0, y0, player)) {
		if (empty(board, x1, y1) || friendly(board, x1, y1, player)) {
			for (const [x2, y2] of list_adjacent(x1, y1, player)) {
				if ((x2 == x0 && y2 == y0) || !exists(board, x2, y2) ||
					board[[x2,y2]].color != board[[x0,y0]].color) {
					continue;
				}
				let already = false;
				for (const [lx, ly] of locs) {
					if (lx == x2 && ly == y2) {
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
	let moves = [];
	const forward = (player == 1 ? -1 : 1);
	for (const pos of iterate_board(player)) {
		const [x, y] = pos;
		const piece = board[pos].piece;
		if (piece.player != player) { continue; }
		if (piece.piece == "footsoldier") {
			const locs = [[x+forward,y],[x,y+forward]];
			const alocs = [[x+(2*forward),y],[x,y+(2*forward)]];
			for (let i = 0; i < locs.length; i++) {
				const loc = locs[i];
				const aloc = alocs[i];
				if (empty(board, loc[0], loc[1])) {
					moves.push(make_move(board, pos, loc));
				}
				if (is_phase_2 &&
				    enemy(board, loc[0], loc[1], player) &&
				    (empty(board, aloc[0], aloc[1]) ||
					  is_at(board, "castle", loc))) {
					moves.push(make_attack(board, pos, aloc, loc));
				} else if (is_phase_2 &&
						   empty(board, aloc[0], aloc[1]) &&
						   is_at(board, "tower", loc)) {
					let mv = make_attack(board, pos, aloc, loc);
					mv.dest.is.piece = "infantry";
					moves.push(mv);
				}
			}
		} else if (piece.piece == "infantry") {
			for (const [dx, dy] of list_adjacent(0,0, player)) {
				if (empty(board, x+dx, y+dy)) {
					moves.push(make_move(board, pos, [x+dx, y+dy]));
					if (dx + dy == forward && empty(board, x+(2*dx), y+(2*dy))) {
						moves.push(make_move(board, pos, [x+(2*dx), y+(2*dy)]));
					}
				}
			}
			if (is_phase_2) {
				for (const [dx, dy] of list_adjacent(0,0, player)) {
					if (enemy(board, x+dx, y+dy, player) &&
					    (empty(board, x+(2*dx), y+(2*dy)) ||
					     is_at(board, "castle", x+dx, y+dy))) {
						moves.push(make_attack(board, pos, [x+(2*dx), y+(2*dy)],
						                       [x+dx, y+dy]));
					} else if (is_at(board, "tower", x+dx, y+dy)) {
						let mv = make_move(board, pos, [x+dx, y+dy]);
						mv.verb = "garrison";
						mv.dest.is.piece = "garrison";
						moves.push(mv);
					} else if (dx + dy == forward &&
								  empty(board, x+dx, y+dy)) {
						if (enemy(board, x+(2*dx), y+(2*dy), player) &&
						    (empty(board, x+(3*dx), y+(3*dy)) ||
						     is_at(board, "castle", x+(2*dx), y+(2*dy)))) {
							moves.push(make_attack(board, pos, [x+(3*dx), y+(3*dy)],
							                       [x+(2*dx), y+(2*dy)]));
						} else if (is_at(board, "tower", x+(2*dx), y+(2*dy))) {
							let mv = make_move(board, pos, [x+(2*dx), y+(2*dy)]);
							mv.verb = "garrison";
							mv.dest.is.piece = "garrison";
							moves.push(mv);
						}
					}
				}
			}
		} else if (piece.piece == "trebuchet" && is_phase_2) {
			for (const [dx, dy] of list_adjacent(0,0, player)) {
				if (empty(board, x+dx, y+dy)) {
					moves.push(make_move(board, pos, [x+dx, y+dy]));
				}
				const aloc = [x+(2*dx), y+(2*dy)];
				if (exists(board, aloc[0], aloc[1]) &&
					!empty(board, aloc[0], aloc[1]) &&
					board[aloc].piece.player != player) {
					moves.push(make_attack(board, pos, pos, aloc));
				}
			}
		} else if (piece.piece == "cavalry") {
			for (const step1 of cavalry_moves(board, x, y, player)) {
				const [x1, y1] = step1;
				if (empty(board, x1, y1)) {
					moves.push(make_move(board, pos, step1));
				} else if (is_phase_2 && enemy(board, x1, y1, player)) {
					if (is_at(board, "castle", x1, y1)) {
						// don't show fictitious landing positions if attacking castle
						moves.push(make_attack(board, pos, pos, step1));
					} else {
						;
						for (const step2 of cavalry_moves(board, x1, y1, player)) {
							if (empty(board, step2[0], step2[1]) ||
								(step2[0] == x && step2[1] == y)) {
								moves.push(make_attack(board, pos, step2, step1));
							}
						}
					}
				} else if (is_phase_2 && exists(board, x1, y1) &&
				           is_at(board, "tower", x1, y1)) {
					let mv = make_move(board, pos, step1);
					mv.verb = "garrison";
					mv.dest.is.piece = "garrison";
					moves.push(mv);
				}
			}
		} else if (piece.piece == "chariot") {
			for (const dir of list_adjacent(0,0, player)) {
				for (let d = 1; ; d++) {
					const l = [dir[0]*d + x, dir[1]*d + y];
					const ln = [dir[0]*(d+1) + x, dir[1]*(d+1) + y];
					if (empty(board, l[0], l[1])) {
						moves.push(make_move(board, pos, l));
					} else if (is_phase_2 && enemy(board, l[0], l[1], player) &&
					           (empty(board, ln[0], ln[1]) ||
					            is_at(board, "castle", l))) {
						moves.push(make_attack(board, pos, ln, l));
						break;
					} else {
						break;
					}
				}
			}
		} else if (is_phase_2
		           && (piece.piece == "garrison" || piece.piece == "castle")) {
			for (const loc of list_adjacent(x,y, player)) {
				if (enemy(board, loc[0], loc[1], player)) {
					moves.push(make_attack(board, pos, pos, loc));
				}
			}
		}
	}
	return moves;
}

function highlight_spaces(ids) {
	;
	for (let ls of document.getElementsByClassName("space")) {
		ls.setAttribute("stroke-width", "0");
	}
	for (const id of ids) {
		let el = document.getElementById(id);
		el.setAttribute("stroke-width", "4");
		el.setAttribute("stroke", "black");
	}
}

function format_verb(str) {
	if (str == "win") { return icon_for("castle", player) + "<span class='win'>Win</span>" }
	return "<span class='verb'>" + str + "</span>";
}

function icon_for(piece, player) {
	let s = "";
	if (player != 0 || piece == "tower") {
		var lab = "";
		if (!player == 0) {
			lab += player;
		}
		lab += symbols[piece];
		s += '<span style="display: inline-block;"> </span>';
		s += '<img class="inline-icon" src="imgs/' + lab + '.svg" />';
	}
	return s;
}

function format_piece(piece) {
	return icon_for(piece.piece, piece.player)
	       + "<span class='piece'>" + piece.piece + "</span>";
}

function display_moves(board, moves, list) {
	var s = "<ol onmouseout='highlight_spaces([]);'>";
	for (let i = 0; i < moves.length; i++) {
		let mv = moves[i];
		var locs = [];
		for (const k in mv) {
			if (k != "verb") {
				locs.push(board[mv[k].loc].id);
			}
		}
		s += "<li><a class='move-item' onmouseover='highlight_spaces("
		   + JSON.stringify(locs) + ");' onclick='update(" + i + ");'>";
		if (mv.verb == "move") {
			s += format_verb(mv.verb) + format_piece(mv.source.was)
			   + " from " + mv.source.loc + " to " + mv.dest.loc;
		} else if (mv.verb == "attack") {
			s += format_verb(mv.verb)
			   + format_piece(mv.attack.was) + " at " + mv.attack.loc
			   + " with" + format_piece(mv.source.was) + " at " + mv.source.loc;
			if (mv.hasOwnProperty("dest")) {
				s += " landing at " + mv.dest.loc;
			} else if (mv.source.was.piece == "cavalry") {
				s += " and retreat"
			}
		} else if (mv.verb == "garrison") {
			//s += format_piece({piece: mv.verb, player: mv.source.was.player})
			s += format_verb(mv.verb)
			   + format_piece(mv.dest.was) + " at " + mv.dest.loc
			   + " with" + format_piece(mv.source.was) + " at " + mv.source.loc
		} else if (mv.verb == "win") {
			s += format_verb(mv.verb) + " with" + format_piece(mv.source.was)
			   + " at " + mv.source.loc;
		} else {
			s += format_verb(mv.verb);
		}

		s += '</a></li>';
	}
	s += '</ol>';
	list.innerHTML = s;
}

function apply_move(board, move, undo) {
	for (const k in move) {
		if (k == "verb") { continue; }
		board[move[k].loc].piece = (undo ? move[k].was : move[k].is);
	}
}
