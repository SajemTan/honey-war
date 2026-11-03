"use strict";

const verbs = {
	move: {
		past: "moved"
	},
	attack: {
		past: "attacked"
	},
	destroy: {
		past: "destroyed"
	},
	garrison: {
		past: "garrisoned"
	},
	win: {
		past: "won"
	}
}

function* iterate_board(player) {
	const bound = opts.board_size;
	if (player !== 1) {
		for (let x = bound; x >= -bound; x--) {
			let y0 = -bound;
			let y1 = bound;
			if (x < 0) {
				y1 += x;
			}
			if (x > 0) {
				y0 += x;
			}
			for (let y = y1; y >= y0; y--) {
				yield [x, y];
			}
		}
	} else {
		for (let x = -bound; x <= bound; x++) {
			let y0 = -bound;
			let y1 = bound;
			if (x < 0) {
				y1 += x;
			}
			if (x > 0) {
				y0 += x;
			}
			for (let y = y0; y <= y1; y++) {
				yield [x, y];
			}
		}
	}
}

function set_piece_symmetric(board, pos, piece, player = 1) {
	if (opts.board_size === 4 && pos[0] > 0 && pos[1] > 0) {
		pos = [pos[0] - 1, pos[1] - 1];
	}
	const [a, b] = pos;
	const opposite = function() {
		if (opts.configuration === "rotated") {
			return [-a, -b];
		} else if (opts.configuration === "mirrored") {
			return [-b, -a];
		} else {
			return pos;
		}
	}();

	board[pos].piece = {
		player: player,
		piece: piece
	};
	if (!are_same_coords(pos, opposite)) {
		board[opposite].piece = {
			player: enemy_of[player],
			piece: piece
		};
	}
}

const tower_arrangements = {
	"3": [
		[2, -2], [0, 0], [-2, 2]
	],
	"2": [
		[1, -1], [-1, 1]
	],
	"2w": [
		[2, -2], [-2, 2]
	],
	"1": [
		[0, 0]
	],
	"3t": [
		[2, -1], [0, 0], [-2, 1]
	],
	"3tc": [
		[1, -2], [0, 0], [-1, 2]
	],
	"2mr": [
		[-1, 1], [2, -2]
	],
	"2ml": [
		[-2, 2], [1, -1]
	],
};

let origin_x;
let origin_y;

function scale_board() {
	const scale_factor = (2*opts.board_size+1)/(11);
	let viewbox = board_el.viewBox.baseVal;
	viewbox.height = Math.round(500*scale_factor/2)*2;
	viewbox.width = Math.round(485*scale_factor/2)*2;
	origin_y = viewbox.height/2;
	origin_x = viewbox.width/2;
}

const hex_w = 50;
const hex_h = 44;
function coords_for_pos(x, y) {
	const dx_x = 35;
	const dx_y = -dx_x;
	const dy = 20;
	const cx = (dx_x * x) + (dx_y * y) + origin_x;
	const cy = (dy * x) + (dy * y) + origin_y;
	const sx = cx - hex_w/2;
	const sy = cy - hex_h/2;
	return {
		sx: sx,
		sy: sy,
		cx: cx,
		cy: cy,
	};
}

const colors = ["green", "purple", "orange"];

function draw_board() {
	scale_board();
	spaces_el.replaceChildren();
	pieces_el.replaceChildren();

	function make_dots(sx, sy, cx, cy, coord, c_id, dist, rot) {
		const rots = {
			tr: -60.35,
			tl: -119.65,
			bl: 119.65,
			br: 60.35
		};
		return create_element("image", `dots${coord}${c_id}`, ["space"],
			{x: sx, y: sy, width: 50, href: `imgs/dots${dist}.svg`,
			transform: `rotate(${rots[rot]} ${cx} ${cy})`},
			svg_ns);
	}
	for (const [x, y] of iterate_board()) {
		const c_id = x + "_" + y;
		let coords = coords_for_pos(x, y);
		const sx = coords.sx;
		const sy = coords.sy;
		const cx = coords.cx;
		const cy = coords.cy;
		let g_el = spaces_el.insertAdjacentElement("beforeend",
			create_element('g', 'g' + c_id, [],
				{'data-x': x, 'data-y': y}, svg_ns));
		g_el.insertAdjacentElement("beforeend",
			create_element("image", 'space' + c_id, ["space"],
				{x: sx, y: sy, width: 50,
				href: `imgs/${colors[(y + x + 12) % 3]}.svg`}, svg_ns));
		if (x > 0) {
			g_el.insertAdjacentElement("beforeend",
				make_dots(sx, sy, cx, cy, 'x', c_id, x, 'tr'));
		} else if (x < 0) {
			g_el.insertAdjacentElement("beforeend",
				make_dots(sx, sy, cx, cy, 'x', c_id, x, 'br'));
		}
		if (y > 0) {
			g_el.insertAdjacentElement("beforeend",
				make_dots(sx, sy, cx, cy, 'y', c_id, -y, 'tl'));
		} else if (y < 0) {
			g_el.insertAdjacentElement("beforeend",
				make_dots(sx, sy, cx, cy, 'y', c_id, -y, 'bl'));
		}
	}
}

function make_board() {
	draw_board();
	let board = new Map();

	for (const [x, y] of iterate_board()) {
		const c_id = x + "_" + y;
		let coords = coords_for_pos(x, y);
		const space = {
			q: y - Math.abs(x),
			color: colors[(y + x + 12) % 3],
			x: x,
			y: y,
			sx: coords.sx,
			sy: coords.sy,
			piece: {
				player: 0,
				piece: ""
			},
			id: "space" + c_id
		}
		board[[x, y]] = space;
	}
	// no player
	for (const pos of tower_arrangements[opts.towers]) {
		board[pos].piece.piece = "tower";
	}

	// foot soldiers
	for (const [a, b] of [
			[1, 5],
			[1, 4],
			[2, 4],
			[2, 3],
			[3, 4]
		]) {
		// take advantage of symmetry
		set_piece_symmetric(board, [a, b], "footsoldier");
		set_piece_symmetric(board, [b, a], "footsoldier");
	}
	if (opts.board_size === 5) {
		set_piece_symmetric(board, [2, 2], "footsoldier");
	}

	// infantry and cavalry are in opposite places left/right
	for (const [a, b] of [
			[2, 5],
			[4, 5],
			[5, 3]
		]) {
		set_piece_symmetric(board, [a, b], "infantry");
		set_piece_symmetric(board, [b, a], "cavalry");
	}

	// singles
	set_piece_symmetric(board, [3, 3], "trebuchet");
	set_piece_symmetric(board, [4, 4], "castle");
	set_piece_symmetric(board, [5, 5], "chariot");

	return board;
}

const html_ns = "http://www.w3.org/1999/xhtml";
const svg_ns = "http://www.w3.org/2000/svg"
function create_element(tag, id="", classes=[], attrs={}, namespace=html_ns) {
	const el = document.createElementNS(namespace, tag);
	if (id) {
		el.id = id;
	}
	for (const cl of classes) {
		el.classList.add(cl);
	}
	for (const [attr, val] of Object.entries(attrs)) {
		el.setAttribute(attr, val);
	}
	return el;
}

function draw_pieces() {
	const svg = pieces_el;
	svg.replaceChildren();
	for (const [x,y] of iterate_board()) {
		const space = board[[x,y]];
		let coords = coords_for_pos(x, y);
		const sx = coords.sx;
		const sy = coords.sy;
		if (space.piece.player !== 0 || space.piece.piece === "tower") {
			let lab = "";
			if (space.piece.player) {
				lab += space.piece.player;
			}
			if (space.piece.piece === "castle" && space.piece.health === 1) {
				lab += symbols["castle_damaged"];
			} else {
				lab += symbols[space.piece.piece];
			}
			let id = space.id + '-' + space.piece.piece;
			let piece_image = svg.insertAdjacentElement("beforeend",
				create_element("image", id, ["piece"],
									{x: sx, y: sy, width: 50, href: `imgs/${lab}.svg`},
									svg_ns));
			event_el(piece_image, ["mousemove", "click"], highlight_from);
		}
	}
}

function exists(board, pos) {
	return board.hasOwnProperty(pos);
}

function are_same_coords(a, b) {
	return a[0] === b[0] && a[1] === b[1];
}

function empty(board, pos) {
	return exists(board, pos) &&
		board[pos].piece.player === 0 &&
		board[pos].piece.piece === "";
}

function enemy(board, pos, player) {
	return exists(board, pos) && board[pos].piece.player === enemy_of[player];
}

function friendly(board, pos, player) {
	return exists(board, pos) && !enemy(board, pos, player);
}

function counterattack_damage(board, pos) {
	if (!exists(board, pos)) {
		return 0;
	} else if (board[pos].piece.piece === "castle") {
		return 2;
	} else if (board[pos].piece.piece === "garrison") {
		return 1;
	} else {
		return 0;
	}
}

function is_at(board, piece, pos) {
	return exists(board, pos) && board[pos].piece.piece === piece;
}

function copy_piece(pc) {
	let ret = {};
	for (const k in pc) {
		ret[k] = pc[k];
	}
	return ret;
}

function make_move(board, from_pos, to_pos) {
	const blank = {
		player: 0,
		piece: ""
	};
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
	if (opts.rules.uF && board[from_pos].piece.piece === 'footsoldier') {
		const player = board[from_pos].piece.player;
		const bound = opts.board_size * (player === 1 ? -1 : 1);
		if (to_pos[0] === bound || to_pos[1] === bound) {
			return {
				verb: "move",
				source: {
					loc: from_pos,
					was: copy_piece(board[from_pos].piece),
					is: blank
				},
				dest: {
					loc: to_pos,
					was: copy_piece(board[to_pos].piece),
					is: {
						player: player,
						piece: "infantry"
					}
				}
			};
		}
	}

	return {
		verb: "move",
		source: {
			loc: from_pos,
			was: copy_piece(board[from_pos].piece),
			is: blank
		},
		dest: {
			loc: to_pos,
			was: copy_piece(board[to_pos].piece),
			is: copy_piece(board[from_pos].piece)
		}
	};
}

function make_attack(board, from_pos, to_pos, attack_pos) {
	const blank = {
		player: 0,
		piece: ""
	};
	let ret = make_move(board, from_pos, to_pos);
	ret.verb = "attack";
	ret.attack = {
		loc: attack_pos,
		was: copy_piece(board[attack_pos].piece),
		is: blank
	};
	if (ret.source.was.piece === "trebuchet") {
		delete ret.dest;
		ret.source.is = ret.source.was;
		if (ret.attack.was.piece === "infantry") {
			if (opts.rules.IB) {
				ret.attack.is = {
					player: ret.attack.was.player,
					piece: "footsoldier"
				};
			} else {
				ret.verb = "destroy";
			}
		} else if (ret.attack.was.piece === "garrison") {
			ret.verb = "destroy";
		} else if (ret.attack.was.piece === "castle") {
			ret.verb = "win";
		}
	} else if (ret.attack.was.piece === "infantry") {
		ret.attack.is = {
			player: ret.attack.was.player,
			piece: "footsoldier"
		};
	} else if (ret.attack.was.piece === "castle") {
		if (ret.attack.was.health === 1) {
			ret = {
				verb: "win",
				source: ret.source,
				attack: {
					loc: attack_pos,
					was: copy_piece(ret.attack.was),
					is: blank
				}
			};
		} else {
			delete ret.dest;
			ret.attack.is = copy_piece(ret.attack.was);
			ret.attack.is.health = 1;
			ret.source.is = blank;
		}
	} else if (ret.attack.was.piece === "garrison") {
		if (ret.source.was.piece !== "infantry") {
			delete ret.dest;
		} else {
			ret.dest.is.piece = "footsoldier";
		}

		ret.source.is = blank;
		ret.attack.is = {
			player: 0,
			piece: "tower"
		};
	}
	return ret;
}

function make_cavalry_move(board, from_pos, to_pos) {
	let mv = make_move(board, from_pos, to_pos.dest);
	mv.dest.via = to_pos.via;
	return mv;
}
function make_cavalry_attack(board, from_pos, to_pos, attack_pos) {
	let mv = make_attack(board, from_pos, to_pos.dest ?? to_pos, attack_pos.dest ?? attack_pos);
	mv.attack.via = attack_pos.via;
	if (mv.dest) {
		mv.dest.via = to_pos.via;
	}
	return mv;
}

function list_adjacent([x, y], player) {
	const a1 = [
		[x - 1, y - 1],
		[x, y - 1],
		[x + 1, y]
	];
	const a2 = [
		[x + 1, y + 1],
		[x, y + 1],
		[x - 1, y]
	];
	if (player !== 2) {
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
					board[pos2].color !== board[pos0].color) {
					continue;
				}
				if (!locs.some(l=>are_same_coords(l.dest, pos2))) {
					locs.push({dest: pos2, via: pos1});
				}
			}
		}
	}
	return locs;
}

function list_moves_for_piece(board, player, is_phase_2, pos) {
	let pmoves = [];
	const forward = (player === 1 ? -1 : 1);
	const [x, y] = pos;
	const piece = board[pos].piece;
	if (piece.player !== player) {
		return [];
	}
	if (piece.piece === "footsoldier") {
		const back = [-forward, -forward];
		const DF = [
			[forward, 0],
			[0, forward]
		];
		for (const [dx, dy] of(opts.rules.bF ? [...DF, back] : DF)) {
			const dist = [
				pos,
				[x + dx, y + dy],
				[x + dx * 2, y + dy * 2]
			];
			if (empty(board, dist[1])) {
				pmoves.push(make_move(board, pos, dist[1]));
			}
			if (is_phase_2 && opts.rules.fF &&
					!are_same_coords([dx, dy], back) &&
					exists(board, dist[1]) && empty(board, dist[2]) &&
					board[dist[1]].piece.player === player) {
				pmoves.push(make_move(board, pos, dist[2]));
			} else if (is_phase_2 &&
					enemy(board, dist[1], player) &&
					(empty(board, dist[2]) ||
						counterattack_damage(board, dist[1]))) {
				pmoves.push(make_attack(board, pos, dist[2], dist[1]));
			} else if (is_phase_2 && empty(board, dist[2]) &&
					is_at(board, "tower", dist[1])) {
				let mv = make_attack(board, pos, dist[2], dist[1]);
				mv.dest.is.piece = "infantry";
				pmoves.push(mv);
			}
		}
		if (is_phase_2 && opts.rules.sF &&
				(x == forward * opts.board_size ||
				 y == forward * opts.board_size)) {
			for (const [dx, dy] of DF) {
				const loc = [x - dx, y - dy];
				if (exists(board, loc)) {
//					console.log("footsoldier at " + x + "," + y +
//						" looking for enemy castle at " + (x - dx) + "," + (
//							y - dy));
//					console.log("\te:" + enemy(board, loc, player) + "; c:" +
//						is_at(board, "castle", loc) + "; p:" +
//						JSON.stringify(board[loc].piece));
					if (enemy(board, loc, player) && is_at(board, "castle", loc)) {
//						console.log("Found a castle!");
						pmoves.push(make_attack(board, pos, pos, loc));
					} else {
//						console.log("Didn't find a castle.");
					}
				}
			}
		}
	} else if (piece.piece === "infantry") {
		for (const [dx, dy] of list_adjacent([0, 0], player)) {
			const dist = [
				pos,
				[x + dx, y + dy],
				[x + dx * 2, y + dy * 2]
			];
			if (empty(board, dist[1])) {
				pmoves.push(make_move(board, pos, dist[1]));
				if (dx + dy === forward && empty(board, dist[2])) {
					pmoves.push(make_move(board, pos, dist[2]));
				}
			}
		}
		if (is_phase_2) {
			for (const [dx, dy] of list_adjacent([0, 0], player)) {
				const dist = [
					pos,
					[x + dx, y + dy],
					[x + dx * 2, y + dy * 2],
					[x + dx * 3, y + dy * 3]
				];
				if (enemy(board, dist[1], player) && (empty(board, dist[2]) ||
						counterattack_damage(board, dist[1]) === 2)) {
					pmoves.push(make_attack(board, pos, dist[2], dist[1]));
				} else if (is_at(board, "tower", dist[1])) {
					let mv = make_move(board, pos, dist[1]);
					mv.verb = "garrison";
					mv.dest.is.piece = "garrison";
					pmoves.push(mv);
				} else if (dx + dy === forward && empty(board, dist[1])) {
					if (enemy(board, dist[2], player) && (empty(board, dist[
								3]) ||
							counterattack_damage(board, dist[2]) === 2)) {
						pmoves.push(make_attack(board, pos, dist[3], dist[2]));
					} else if (is_at(board, "tower", dist[2])) {
						let mv = make_move(board, pos, dist[2]);
						mv.verb = "garrison";
						mv.dest.is.piece = "garrison";
						pmoves.push(mv);
					}
				}
			}
		}
	} else if (piece.piece === "cavalry") {
		for (const step1 of cavalry_moves(board, pos, player)) {
			const d1 = step1.dest;
			if (empty(board, d1)) {
				pmoves.push(make_cavalry_move(board, pos, step1));
			} else if (is_phase_2 && enemy(board, d1, player)) {
				if (counterattack_damage(board, d1)) {
					// don't show fictitious landing positions if attacking castle
					pmoves.push(make_cavalry_attack(board, pos, pos, step1));
				} else {
					for (const step2 of cavalry_moves(board, d1, player)) {
						if (empty(board, step2.dest) ||
							are_same_coords(pos, step2.dest)) {
							pmoves.push(make_cavalry_attack(board, pos, step2, step1));
						}
					}
				}
			} else if (is_phase_2 && exists(board, d1) &&
				is_at(board, "tower", d1)) {
				let mv = make_cavalry_move(board, pos, step1);
				mv.verb = "garrison";
				mv.dest.is.piece = "garrison";
				pmoves.push(mv);
			}
		}
	} else if (piece.piece === "chariot") {
		for (const dir of list_adjacent([0, 0], player)) {
			for (let d = 1;; d++) {
				const l = [dir[0] * d + x, dir[1] * d + y];
				const ln = [dir[0] * (d + 1) + x, dir[1] * (d + 1) + y];
				if (empty(board, l)) {
					pmoves.push(make_move(board, pos, l));
				} else if (is_phase_2 && enemy(board, l, player) &&
					(empty(board, ln) ||
						counterattack_damage(board, l))) {
					pmoves.push(make_attack(board, pos, ln, l));
					break;
				} else {
					break;
				}
			}
		}
	} else if (piece.piece === "trebuchet" && (is_phase_2 || opts.rules.bB)) {
		for (const [dx, dy] of list_adjacent([0, 0], player)) {
			const dist = [
				pos,
				[x + dx, y + dy],
				[x + dx * 2, y + dy * 2]
			];
			if (empty(board, dist[1])) {
				pmoves.push(make_move(board, pos, dist[1]));
			}
			if (is_phase_2 &&
					exists(board, dist[2]) && !empty(board, dist[2]) &&
					board[dist[2]].piece.player !== player) {
				pmoves.push(make_attack(board, pos, pos, dist[2]));
			}
		}
	} else if (is_phase_2 && piece.piece === "castle") {
		for (const loc of list_adjacent(pos, player)) {
			if (enemy(board, loc, player)) {
				pmoves.push(make_attack(board, pos, pos, loc));
			}
		}
	} else if (is_phase_2 && piece.piece === "garrison") {
		for (const [dx, dy] of list_adjacent([0, 0], player)) {
			let dist = [];
			const short = [x + dx, y + dy];
			const long = [x + 2 * dx, y + 2 * dy];
			switch (opts.rules.Gr) {
				case 'short':
				default:
					dist = [short];
					break;
				case 'long':
					dist = [long];
					break;
				case 'both':
					dist = [short, long];
					break;
			}
			for (const loc of dist) {
				if (enemy(board, loc, player)) {
					pmoves.push(make_attack(board, pos, pos, loc));
				}
			}
		}
	}
	return pmoves;
}

function list_possible_moves(board, player, is_phase_2) {
	let pmoves = [];
	for (const pos of iterate_board(player)) {
		let piece_moves = list_moves_for_piece(board, player, is_phase_2, pos);
		pmoves.push(...piece_moves);
	}
	// Show winning moves at the very top of the move list
	return pmoves.sort(function(a, b) {
		if (a.verb === "win") {
			if (b.verb === "win") {
				return 0;
			} else {
				return -1;
			}
		} else if (b.verb === "win") {
			return 1;
		} else {
			return 0;
		}
	});
}

function dist(x1, y1, x2, y2) {
	return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
}

function get_pos_from_coords(x, y) {
	let min_dist = Number("Infinity");
	let ret = undefined;
	const piece_radius = document.getElementById(board[[0,0]].id
		).getBoundingClientRect().width/2;
	for (const pos of iterate_board()) {
		const el = document.getElementById(board[pos].id);
		let er = el.getBoundingClientRect();
		let d = dist(x, y, er.x + er.width / 2, er.y + er.height / 2);
		if (d < min_dist && d < piece_radius) {
			min_dist = d;
			ret = pos;
		}
	}
	return ret;
}

function highlight_spaces(ids) {
	// clear all existing highlights
	for (let ls of document.getElementsByClassName("space")) {
		ls.setAttribute("href", ls.getAttribute("href").replace("-hl", ""));
	}
	for (const id of ids) {
		if (id === undefined) {
			continue;
		}
		//console.log(`id: ${id}`);
		let el = document.getElementById(id);
		el.setAttribute("href", el.getAttribute("href").replace(/(?<!hl).svg/,
			"-hl.svg"));
	}
}

let selected = undefined;

function highlight_piece_moves(pos) {
	if (pos) {
		const pmoves = list_moves_for_piece(board, player, (phase === 2), pos);
		const spaces = [board[pos].id];
		for (const move of pmoves) {
			if (move.attack) {
				spaces.push(board[move.attack.loc].id);
			}
			if (move.dest) {
				spaces.push(board[move.dest.loc].id);
			}
		}
		highlight_spaces(spaces);
		return pmoves;
	} else {
		highlight_spaces([]);
	}
	return [];
}
function highlight_from(event) {
	const pos = get_pos_from_coords(event.x, event.y);
	if (event.type === "mousemove") {
		if (!selected) {
			if (board[pos]) {
				highlight_spaces([board[pos].id]);
				if (board[pos].piece.player === player) {
					board_el.style.cursor = "pointer";
				} else {
					board_el.style.cursor = "crosshair";
				}
			} else {
				highlight_spaces([]);
				board_el.style.cursor = "";
			}
		}
	} else if (event.type === "click") {
		//console.log(`event: ${event}, pos: ${pos}`);
		selected = undefined;
		if (pos && board[pos].piece.player === player) {
			selected = pos;
			const pmoves = highlight_piece_moves(pos);
			movelist_title.innerText = "Selected Piece Moves";
			display_moves(board, pmoves, moves_el);
		} else {
			highlight_spaces([]);
			movelist_title.innerText = "Possible Moves";
			display_moves(board, list_possible_moves(board, player, (phase ==
					2)),
				moves_el);
		}
	}
}

function apply_move(board, move, undo) {
	for (const k in move) {
		if (k === "verb") {
			continue;
		}
		board[move[k].loc].piece = (undo ? move[k].was : move[k].is);
	}
}
