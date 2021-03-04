"use strict";

function* iterate_board(player) {
	const bound = opts.board_size;
	if (player != 1) {
		for (let x = bound; x >= -bound; x--) {
			let y0 = -bound;
			let y1 = bound;
			if (x < 0) { y1 += x; }
			if (x > 0) { y0 += x; }
			for (let y = y1; y >= y0; y--) {
				yield [x, y];
			}
		}
	} else {
		for (let x = -bound; x <= bound; x++) {
			let y0 = -bound;
			let y1 = bound;
			if (x < 0) { y1 += x; }
			if (x > 0) { y0 += x; }
			for (let y = y0; y <= y1; y++) {
				yield [x, y];
			}
		}
	}
}

function set_piece_symmetric(board, pos, piece, player = 1) {
	if (opts.board_size == 4 && pos[0] > 0 && pos[1] > 0) {
		pos = [pos[0]-1,pos[1]-1];
	}
	const [a,b] = pos;
	const opposite = function(){
		if (opts.configuration == "rotated") {
			return [-a,-b];
		} else if (opts.configuration == "mirrored") {
			return [-b,-a];
		} else {
			return pos;
		}
	}();

	board[pos].piece = {player: player, piece: piece};
	if (!are_same_coords(pos, opposite)) {
		board[opposite].piece = {player: enemy_of[player], piece: piece};
	}
}

const tower_arrangements = {
	"3": [[2,-2],[0,0],[-2,2]],
	"2": [[1,-1],[-1,1]],
	"2w": [[2,-2],[-2,2]],
	"1": [[0,0]],
	"3t": [[2,-1],[0,0],[-2,1]],
	"3tc": [[1,-2],[0,0],[-1,2]],
	"2mr": [[-1,1],[2,-2]],
	"2ml": [[-2,2],[1,-1]]
};

function opt(option) {
	switch (option) {
	case 'mirrored':
		document.getElementById('towers3t').disabled = true;
		document.getElementById('towers3tc').disabled = true;

		document.getElementById('towers2mr').disabled = false;
		document.getElementById('towers2ml').disabled = false;
		break;
	case 'rotated':
		document.getElementById('towers2mr').disabled = true;
		document.getElementById('towers2ml').disabled = true;

		document.getElementById('towers3t').disabled = false;
		document.getElementById('towers3tc').disabled = false;
		break;
	case 'large':
		//document.getElementById('towers3').disabled = false;
		//document.getElementById('towers2w').disabled = false;
		break;
	case 'small':
		//document.getElementById('towers3').disabled = true;
		//document.getElementById('towers2w').disabled = true;
		break;
	case 't3':
	case 't2':
	case 't2w':
	case 't1':
		document.getElementById('configmirrored').disabled = false;
		document.getElementById('configrotated').disabled = false;
		break;
	case 't3t':
	case 't3tc':
		document.getElementById('configmirrored').disabled = true;
		document.getElementById('configrotated').disabled = false;
		break;
	case 't2mr':
	case 't2ml':
		document.getElementById('configrotated').disabled = true;
		document.getElementById('configmirrored').disabled = false;
		break;
	case 'friendly-footsoldiers':
	case 'stranded-footsoldiers':
		break;
	case 'buff-footsoldiers':
	case 'upgrade-footsoldiers':
		document.getElementById('stranded-footsoldiers').disabled
				= (document.getElementById('buff-footsoldiers').checked ||
					document.getElementById('upgrade-footsoldiers').checked);
		break;
	case 'garrisonshort':
	case 'garrisonlong':
	case 'garrisonboth':
	case 'buff-trebuchet':
	case 'buff-infantry':
		break;
	default:
		console.log('Unknown option toggled: "' + option + '"');
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
	for (const pos of tower_arrangements[opts.towers]) {
		board[pos].piece.piece = "tower";
	}

	// foot soldiers
	for (const [a, b] of [[1,5],[1,4],[2,4],[2,3],[3,4]]) {
		// take advantage of symmetry
		set_piece_symmetric(board, [a,b], "footsoldier");
		set_piece_symmetric(board, [b,a], "footsoldier");
	}
	if (opts.board_size == 5) {
		set_piece_symmetric(board, [2,2], "footsoldier");
	}

	// infantry and cavalry are in opposite places left/right
	for (const [a, b] of [[2,5],[4,5],[5,3]]) {
		set_piece_symmetric(board, [a,b], "infantry");
		set_piece_symmetric(board, [b,a], "cavalry");
	}

	// singles
	set_piece_symmetric(board, [3,3], "trebuchet");
	set_piece_symmetric(board, [4,4], "castle");
	set_piece_symmetric(board, [5,5], "chariot");

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
			if (space.piece.piece == "castle" && space.piece.health == 1) {
				lab += symbols["castle_damaged"];
			} else {
				lab += symbols[space.piece.piece];
			}
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
	return exists(board, pos) && board[pos].piece.player == enemy_of[player];
}

function friendly(board, pos, player) {
	return exists(board, pos) && !enemy(board, pos, player);
}

function counterattack_damage(board, pos) {
	if (!exists(board, pos)) {
		return 0;
	} else if (board[pos].piece.piece == "castle") {
		return 2;
	} else if (board[pos].piece.piece == "garrison") {
		return 1;
	} else {
		return 0;
	}
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
		if (ret.attack.was.piece == "infantry") {
			if (opts.rules.IB) {
				ret.attack.is = {player: ret.attack.was.player, piece: "footsoldier"};
			} else {
				ret.verb = "destroy";
			}
		} else if (ret.attack.was.piece == "garrison") {
			ret.verb = "destroy";
		} else if (ret.attack.was.piece == "castle") {
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
			ret.source.is = {player: 0, piece: ""};
		}
	} else if (ret.attack.was.piece == "garrison") {
		if (ret.source.was.piece != "infantry") {
			delete ret.dest;
		} else {
			ret.dest.is.piece = "footsoldier";
		}

		ret.source.is = {player: 0, piece: ""};
		ret.attack.is = {player: 0, piece: "tower"};
	}
	return ret;
}

function list_adjacent(pos, player) {
	const [x, y] = pos;
	const a1 = [[x-1,y-1],[x,y-1],[x+1,y]];
	const a2 = [[x+1,y+1],[x,y+1],[x-1,y]];
	if (player != 2) {
		return [...a1, ...a2];
	} else {
		return [...a2, ...a1];
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
			const back = [-forward, -forward];
			for (const [dx, dy] of [[forward, 0], [0, forward], back]) {
				const dist = [
					pos,
					[x+dx  , y+dy  ],
					[x+dx*2, y+dy*2]];
				if (empty(board, dist[1])) {
					moves.push(make_move(board, pos, dist[1]));
				}
				if (is_phase_2 && empty(board, dist[2])
				    && exists(board, dist[1])
				    && board[dist[1]].piece.player == player
				    && !are_same_coords([dx,dy], back)) {
					moves.push(make_move(board, pos, dist[2]));
				} else if (is_phase_2 &&
				    enemy(board, dist[1], player) &&
				    (empty(board, dist[2]) ||
				     counterattack_damage(board, dist[1]))) {
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
						  counterattack_damage(board, dist[1]) == 2)) {
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
						     counterattack_damage(board, dist[2]) == 2)) {
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
		} else if (piece.piece == "cavalry") {
			for (const step1 of cavalry_moves(board, pos, player)) {
				const [x1, y1] = step1;
				if (empty(board, step1)) {
					moves.push(make_move(board, pos, step1));
				} else if (is_phase_2 && enemy(board, step1, player)) {
					if (counterattack_damage(board, step1)) {
						// don't show fictitious landing positions if attacking castle
						moves.push(make_attack(board, pos, pos, step1));
					} else {
						for (const step2 of cavalry_moves(board, step1, player)) {
							if (empty(board, step2) ||
								are_same_coords(pos, step2)) {
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
					            counterattack_damage(board, l))) {
						moves.push(make_attack(board, pos, ln, l));
						break;
					} else {
						break;
					}
				}
			}
		} else if (piece.piece == "trebuchet" && (is_phase_2 || opts.rules.bB)) {
			for (const [dx, dy] of list_adjacent([0,0], player)) {
				const dist = [
					pos,
					[x+dx  , y+dy  ],
					[x+dx*2, y+dy*2]];
				if (empty(board, dist[1])) {
					moves.push(make_move(board, pos, dist[1]));
				}
				if (is_phase_2 &&
				    exists(board, dist[2]) && !empty(board, dist[2]) &&
				    board[dist[2]].piece.player != player) {
					moves.push(make_attack(board, pos, pos, dist[2]));
				}
			}
		} else if (is_phase_2 && piece.piece == "castle") {
			for (const loc of list_adjacent(pos, player)) {
				if (enemy(board, loc, player)) {
					moves.push(make_attack(board, pos, pos, loc));
				}
			}
		} else if (is_phase_2 && piece.piece == "garrison") {
		  for (const [dx,dy] of list_adjacent([0,0], player)) {
			  let dist = [];
			  switch (opts.rules.Gr) {
			  case 'both':
				  dist.push([x+dx,y+dy]);
			  case 'long':
				  dist.push([x+2*dx,y+2*dy]);
				  break;
			  case 'short':
			  default:
				  dist = [[x+dx,y+dy]];
				  break;
			  }
			  for (const loc of dist) {
				  if (enemy(board, loc, player)) {
					  moves.push(make_attack(board, pos, pos, loc));
				  }
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
		   + JSON.stringify(locs) + ");' onclick='execute(" + i++ + ");'>";
		if (mv.verb == "move") {
			s += format_verb(mv.verb) + format_piece(mv.source.was)
			   + " from " + mv.source.loc + " to " + mv.dest.loc;
		} else if (mv.verb == "attack" || mv.verb == "destroy") {
			s += format_verb(mv.verb)
			   + format_piece(mv.attack.was) + " at " + mv.attack.loc
			   + " with" + format_piece(mv.source.was) + " at " + mv.source.loc;
			if (mv.hasOwnProperty("dest")) {
				s += " landing at " + mv.dest.loc;
				if (mv.source.was.piece != mv.dest.is.piece &&
						mv.dest.is.piece != "") {
					s += " as " + format_piece(mv.dest.is);
				}
			} else if (mv.source.was.piece == "cavalry"
			           && mv.attack.was.piece != "castle"
						  && mv.attack.was.piece != "garrison") {
				s += " and retreat";
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
