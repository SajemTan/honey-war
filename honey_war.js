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
			cx: c_x * 17.5 + 250,
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
		const space = board[k];
		const sx = space.cx - 25;
		const sy = space.cy - 22;
		s += '<image x="' + sx + '" y="' + sy + '" href="imgs/' + space.color 
		  + '.svg" class="space" id="' + space.id + '" width="50" />';
		if (space.piece.player != 0 || space.piece.piece == "tower") {
			let lab="";
			if (!space.piece.player == 0) {
				lab += space.piece.player;
			}
			lab += symbols[space.piece.piece];
			s += '<image x="' + sx + '" y="' + sy
			   + '" href="imgs/' + lab + '.svg" width="50" />';
		}
	}
	svg.innerHTML = s;
}

function exists(board, pos) {
	return board.hasOwnProperty(pos);
}

function are_same_coords(a, b) {
	return a[0] == b[0] && a[1] == b[1];
}

function empty(board, pos) {
	return exists(board, pos) &&
		board[pos].piece.player == 0 &&
		board[pos].piece.piece == "";
}

function enemy(board, pos, player) {
	return exists(board, pos) && board[pos].piece.player == (3-player);
}

function friendly(board, pos, player) {
	return exists(board, pos) && !enemy(board, pos, player);
}

function is_at(board, piece, pos) {
	return exists(board, pos) && board[pos].piece.piece == piece;
}

function copy_piece(pc) {
	let ret = {};
	for (const k in pc) {
		ret[k] = pc[k];
	}
	return ret;
}

function make_move(board, from_pos, to_pos) {
	if (are_same_coords(from_pos, to_pos)) {
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

function list_adjacent(pos, player) {
	const [x, y] = pos;
	const a1 = [[x-1,y-1],[x,y-1],[x+1,y]];
	const a2 = [[x+1,y+1],[x,y+1],[x-1,y]];
	if (player != 2) {
		return a1.concat(a2);
	} else {
		return a2.concat(a1);
	}
}

function cavalry_moves(board, pos0, player) {
	let locs = [];
	for (const pos1 of list_adjacent(pos0, player)) {
		if (friendly(board, pos1, player)) {
			for (const pos2 of list_adjacent(pos1, player)) {
				if (are_same_coords(pos0, pos2) || !exists(board, pos2) ||
				    board[pos2].color != board[pos0].color) {
					continue;
				}
				let already = false;
				for (const l of locs) {
					if (are_same_coords(l, pos2)) {
						already = true;
						break;
					}
				}
				if (!already) {
					locs.push(pos2);
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
			for (const [dx, dy] of [[forward, 0], [0, forward]]) {
				const dist = [
					pos,
					[x+dx  , y+dy  ],
					[x+dx*2, y+dy*2]];
				if (empty(board, dist[1])) {
					moves.push(make_move(board, pos, dist[1]));
				}
				if (is_phase_2 &&
				    enemy(board, dist[1], player) &&
				    (empty(board, dist[2]) ||
				     is_at(board, "castle", dist[1]))) {
					moves.push(make_attack(board, pos, dist[2], dist[1]));
				} else if (is_phase_2 &&
					        empty(board, dist[2]) &&
					        is_at(board, "tower", dist[1])) {
					let mv = make_attack(board, pos, dist[2], dist[1]);
					mv.dest.is.piece = "infantry";
					moves.push(mv);
				}
			}
		} else if (piece.piece == "infantry") {
			for (const [dx, dy] of list_adjacent([0,0], player)) {
				const dist = [
					pos,
					[x+dx  , y+dy  ],
					[x+dx*2, y+dy*2]];
				if (empty(board, dist[1])) {
					moves.push(make_move(board, pos, dist[1]));
					if (dx + dy == forward && empty(board, dist[2])) {
						moves.push(make_move(board, pos, dist[2]));
					}
				}
			}
			if (is_phase_2) {
				for (const [dx, dy] of list_adjacent([0,0], player)) {
					const dist = [
						pos,
						[x+dx  , y+dy  ],
						[x+dx*2, y+dy*2],
						[x+dx*3, y+dy*3]];
					if (enemy(board, dist[1], player) &&
					    (empty(board, dist[2]) ||
						  is_at(board, "castle", dist[1]))) {
						moves.push(make_attack(board, pos, dist[2], dist[1]));
					} else if (is_at(board, "tower", dist[1])) {
						let mv = make_move(board, pos, dist[1]);
						mv.verb = "garrison";
						mv.dest.is.piece = "garrison";
						moves.push(mv);
					} else if (dx + dy == forward &&
								  empty(board, dist[1])) {
						if (enemy(board, dist[2], player) &&
						    (empty(board, dist[3]) ||
						     is_at(board, "castle", dist[2]))) {
							moves.push(make_attack(board, pos, dist[3], dist[2]));
						} else if (is_at(board, "tower", dist[2])) {
							let mv = make_move(board, pos, dist[2]);
							mv.verb = "garrison";
							mv.dest.is.piece = "garrison";
							moves.push(mv);
						}
					}
				}
			}
		} else if (piece.piece == "trebuchet" && is_phase_2) {
			for (const [dx, dy] of list_adjacent([0,0], player)) {
				const dist = [
					pos,
					[x+dx  , y+dy  ],
					[x+dx*2, y+dy*2]];
				if (empty(board, dist[1])) {
					moves.push(make_move(board, pos, dist[1]));
				}
				if (exists(board, dist[2]) && !empty(board, dist[2]) &&
				    board[dist[2]].piece.player != player) {
					moves.push(make_attack(board, pos, pos, dist[2]));
				}
			}
		} else if (piece.piece == "cavalry") {
			for (const step1 of cavalry_moves(board, pos, player)) {
				const [x1, y1] = step1;
				if (empty(board, step1)) {
					moves.push(make_move(board, pos, step1));
				} else if (is_phase_2 && enemy(board, step1, player)) {
					if (is_at(board, "castle", step1)) {
						// don't show fictitious landing positions if attacking castle
						moves.push(make_attack(board, pos, pos, step1));
					} else {
						for (const step2 of cavalry_moves(board, step1, player)) {
							if (empty(board, step2) ||
								are_same_coords(step1, step2)) {
								moves.push(make_attack(board, pos, step2, step1));
							}
						}
					}
				} else if (is_phase_2 && exists(board, step1) &&
				           is_at(board, "tower", step1)) {
					let mv = make_move(board, pos, step1);
					mv.verb = "garrison";
					mv.dest.is.piece = "garrison";
					moves.push(mv);
				}
			}
		} else if (piece.piece == "chariot") {
			for (const dir of list_adjacent([0,0], player)) {
				for (let d = 1; ; d++) {
					const l = [dir[0]*d + x, dir[1]*d + y];
					const ln = [dir[0]*(d+1) + x, dir[1]*(d+1) + y];
					if (empty(board, l)) {
						moves.push(make_move(board, pos, l));
					} else if (is_phase_2 && enemy(board, l, player) &&
					           (empty(board, ln) ||
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
			for (const loc of list_adjacent(pos, player)) {
				if (enemy(board, loc, player)) {
					moves.push(make_attack(board, pos, pos, loc));
				}
			}
		}
	}
	return moves;
}

function highlight_spaces(ids) {
	for (let ls of document.getElementsByClassName("space")) {
		ls.setAttribute("href", ls.getAttribute("href").replace("-hl", ""));
	}
	for (const id of ids) {
		let el = document.getElementById(id);
		el.setAttribute("href", el.getAttribute("href").replace(/(?<!hl).svg/, "-hl.svg"));
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
		s += '<span class="hidden-space"> </span>';
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
	let i = 0;
	for (const mv of moves) {
		var locs = [];
		for (const k in mv) {
			if (k != "verb") {
				locs.push(board[mv[k].loc].id);
			}
		}
		s += "<li><a class='move-item' onmouseover='highlight_spaces("
		   + JSON.stringify(locs) + ");' onclick='update(" + i++ + ");'>";
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
