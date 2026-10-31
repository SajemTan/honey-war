"use strict";

const board_el = document.getElementById('board');
const spaces_el = document.getElementById("board_spaces");
const pieces_el = document.getElementById("board_pieces");
const header_el = document.getElementById('turn');
const movelist_title = document.getElementById('movelist-title');
const moves_el = document.getElementById('moves');
const gameover_el = document.getElementById('gameover');
const timeline_el = document.getElementById('timeline');
const saves_el = document.getElementById('saves');
const replay_btn_el = document.getElementById('game-replay');
const pause_btn_el = document.getElementById('replay-pause');
const delay_el = document.getElementById('replay-delay');
const P1name_el = document.getElementById('P1-name');
const P2name_el = document.getElementById('P2-name');

const symbols = {
	tower: "T",
	footsoldier: "F",
	infantry: "I",
	trebuchet: "B",
	castle: "C",
	castle_damaged: "D",
	cavalry: "K",
	chariot: "H",
	garrison: "G",
	tower_infantry: "TI",
	tower_cavalry: "TC",
	hex: "hex",
	hexG: "green",
	hexO: "orange",
	hexP: "purple",
};
const enemy_of = [0, 2, 1];
let turn = 1;
let player = 1;
let phase = 2;
let moves = [];
let undo_list = [];
let move_index = 0;
let saves = JSON.parse(localStorage.getItem("saves")) || [];
let should_replay = false;

const default_opts = {
	board_size: 5,
	towers: "3",
	configuration: "rotated",
	rules: {
		// friendly-footsoldiers
		fF: true,
		// buff-footsoldiers
		bF: true,
		// upgrade-footsoldiers
		uF: false,
		// stranded
		sF: false,
		// short, long, both = short&long
		Gr: "short",
		// buff-infantry
		IB: false,
		// buff-trebuchet
		bB: false
	}
};
let opts = window.structuredClone(default_opts);

function apply_listeners() {
	for (let e of document.getElementsByTagName('textarea')) {
		if (e.classList.contains('json')) {
			e.addEventListener('change', () => validate_JSON_field(e));
		}
	}
}
apply_listeners();

function set_opts() {
	opts = {rules: {}};
	if (document.getElementById('configrotated').checked) {
		opts.configuration = 'rotated';
	} else {
		document.getElementById('configmirrored').checked = true;
		opts.configuration = 'mirrored';
	}
	if (document.getElementById('boardsmall').checked) {
		opts.board_size = 4;
	} else {
		document.getElementById('boardlarge').checked = true;
		opts.board_size = 5;
	}
	const tower_settings = [
		'3', '2', '2w', '1',
		'3t', '3tc',
		'2mr', '2ml'
	];
	let set = false;
	for (const code of tower_settings) {
		if (document.getElementById('towers' + code).checked) {
			opts.towers = code;
			set = true;
			break;
		}
	}
	if (!set) {
		document.getElementById('towers3').checked = true;
		opts.towers = '3';
	}

	if (document.getElementById('garrisonlong').checked) {
		opts.rules.Gr = 'long';
	} else if (document.getElementById('garrisonboth').checked) {
		opts.rules.Gr = 'both';
	} else {
		document.getElementById('garrisonshort').checked = true;
		opts.rules.Gr = 'short';
	}

	const checkboxes = [
		['friendly-footsoldiers', 'fF'],
		['buff-footsoldiers', 'bF'],
		['upgrade-footsoldiers', 'uF'],
		['stranded-footsoldiers', 'sF'],
		['buff-infantry', 'IB'],
		['buff-trebuchet', 'bB']
	];

	for (const [id, rule] of checkboxes) {
		opts.rules[rule] = document.getElementById(id).checked;
	}
	if (opts.rules['bF'] || opts.rules['uF']) {
		opts.rules['sF'] = false;
	}

	update_rulestr();
	console.dir(opts);
}

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
			document.getElementById('stranded-footsoldiers').disabled = (
				document.getElementById('buff-footsoldiers').checked ||
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

function reset_opts_ui(options) {
	if (options.configuration === 'rotated') {
		document.getElementById('configrotated').checked = true;
		document.getElementById('configmirrored').checked = false;
		opts.configuration = 'rotated';
		opt('rotated');
	} else {
		document.getElementById('configmirrored').checked = true;
		document.getElementById('configrotated').checked = false;
		opts.configuration = 'mirrored';
		opt('mirrored');
	}
	if (options.board_size === 4) {
		document.getElementById('boardsmall').checked = true;
		document.getElementById('boardlarge').checked = false;
		opts.board_size = 4;
		opt('small');
	} else {
		document.getElementById('boardlarge').checked = true;
		document.getElementById('boardsmall').checked = false;
		opts.board_size = 5;
		opt('large');
	}
	const tower_settings = [
		'3', '2', '2w', '1',
		'3t', '3tc',
		'2mr', '2ml'
	];
	let set = false;
	for (const code of tower_settings) {
		if (options.towers === code) {
			document.getElementById('towers' + code).checked = true;
			opts.towers = code;
			set = true;
			opt('t' + code);
			break;
		} else {
			document.getElementById('towers' + code).checked = false;
		}
	}
	if (!set) {
		document.getElementById('towers3').checked = true;
		opts.towers = '3';
		opt('t3');
	}

	if (options.rules.Gr === 'long') {
		document.getElementById('garrisonlong').checked = true;
		document.getElementById('garrisonshort').checked = false;
		document.getElementById('garrisonboth').checked = false;
		opts.rules.Gr = 'long';
		opt('garrisonlong');
	} else if (options.rules.Gr === 'both') {
		document.getElementById('garrisonboth').checked = true;
		document.getElementById('garrisonlong').checked = false;
		document.getElementById('garrisonshort').checked = false;
		opts.rules.Gr = 'both';
		opt('garrisonboth');
	} else {
		document.getElementById('garrisonshort').checked = true;
		document.getElementById('garrisonlong').checked = false;
		document.getElementById('garrisonboth').checked = false;
		opts.rules.Gr = 'short';
		opt('garrisonshort');
	}

	const checkboxes = [
		['friendly-footsoldiers', 'fF'],
		['buff-footsoldiers', 'bF'],
		['upgrade-footsoldiers', 'uF'],
		['stranded-footsoldiers', 'sF'],
		['buff-infantry', 'IB'],
		['buff-trebuchet', 'bB']
	];

	for (const [id, rule] of checkboxes) {
		if (document.getElementById(id).disabled) {
			continue;
		}
		document.getElementById(id).checked = opts.rules[rule];
		if (opts.rules[rule]) {
			opt(id);
		}
	}

	update_rulestr();
	console.dir(opts);
}

let board = make_board();

let players = {
	1: "Player 1",
	2: "Player 2"
};

function encode(s) {
	return s.replace(/[^A-Za-z0-9 _.-]/g, function(c) {
		return "&#" + c.charCodeAt(0) + ";"
	});
}

function update_players() {
	players[1] = encode(P1name_el.value);
	players[2] = encode(P2name_el.value);
	write_title();
}

function format_player(player) {
	return icon_for("castle", player) + '<text>' + players[player] + '</text>';
}

function draw_icons() {
	for (let el of document.querySelectorAll(".icon")) {
		const name = el.innerHTML;
		el.replaceWith(create_element("img", "", ["inline-icon"],
			{src: `imgs/${name}.svg`, name: name}));
//		el.innerHTML = '<img class="inline-icon" src="imgs/' + name +
//			'.svg" name="' + name + '"/>';
	}
}

function write_title() {
	header_el.innerHTML = "Turn " + turn +
		", " + format_player(player) +
		", Phase " + phase;
}

function format_verb(verb, style, player) {
	let str;
	if (!style || style === "imperative") {
		str = verb;
	} else {
		str = verbs[verb][style];
	}

	if (str === "win") {
		return icon_for("castle", player) + "<span class='win'>Win</span>"
	}
	return "<span class='verb'>" + str + "</span>";
}

function icon_for(piece, player) {
	let s = "";
	if (player || piece === "tower") {
		let lab = "";
		if (player) {
			lab += player;
		}
		lab += symbols[piece];
		s += '<span class="hidden-space"> </span>';
		s += '<img class="inline-icon" src="imgs/' + lab + '.svg" />';
	}
	return s;
}

function format_piece(piece) {
	return icon_for(piece.piece, piece.player) +
		"<span class='piece'>" + piece.piece + "</span>";
}

function notate_coords(piece) {
	const letters = {
		'-5': 'v',
		'-4': 'w',
		'-3': 'x',
		'-2': 'y',
		'-1': 'z',
		'0': '-',
		'1': 'a',
		'2': 'b',
		'3': 'c',
		'4': 'd',
		'5': 'e',
	}
	return letters[piece.loc[0]] + letters[piece.loc[1]];
}

function notate_piece(space) {
	return {
		is: symbols[space.is.piece] + notate_coords(space),
		was: symbols[space.was.piece] + notate_coords(space),
	};
}

function format_move(mv, style) {
	let n = notate_piece(mv.source).was;
	let s = "";
	let player = mv.source.was.player;
	if (mv.verb === "move") {
		n += notate_coords(mv.dest);
		s += format_verb(mv.verb, style, player) +
			format_piece(mv.source.was) + " from " + mv.source.loc +
			" to " + mv.dest.loc;
	} else if (mv.verb === "attack" || mv.verb === "destroy") {
		if (mv.source.is.piece !== mv.source.was.piece) {
			n += '>';
		} else {
			n += '*';
		}
		n += notate_piece(mv.attack).was;
		s += format_verb(mv.verb, style, player) +
			format_piece(mv.attack.was) + " at " + mv.attack.loc +
			" with" + format_piece(mv.source.was) + " at " + mv.source.loc;
		if (mv.hasOwnProperty("dest")) {
			s += " landing at " + mv.dest.loc;
			if (mv.source.was.piece !== mv.dest.is.piece &&
				mv.dest.is.piece !== "") {
				s += " as " + format_piece(mv.dest.is);
				n += symbols[mv.dest.is.piece];
			}
			n += notate_coords(mv.dest);
		} else if (mv.source.was.piece === "cavalry" &&
			mv.attack.was.piece !== "castle" &&
			mv.attack.was.piece !== "garrison") {
			s += " and retreat";
		}
	} else if (mv.verb === "garrison") {
		n += '#' + notate_coords(mv.dest);
		//s += format_piece({piece: mv.verb, player: mv.source.was.player})
		s += format_verb(mv.verb, style, player) +
			format_piece(mv.dest.was) + " at " + mv.dest.loc +
			" with" + format_piece(mv.source.was) + " at " + mv.source.loc
	} else if (mv.verb === "win") {
		n += '!' + notate_coords(mv.attack);
		s += format_verb(mv.verb, style, player) +
			" with" + format_piece(mv.source.was) +
			" at " + mv.source.loc;
	} else {
		n += '?' + mv.verb;
		s += format_verb(mv.verb, style, player);
	}
	return [s, n];
}

function setup_turn() {
	draw_pieces(pieces_el, board);
	write_title();
	movelist_title.innerText = "Possible Moves";
	highlight_spaces([]);
	if (move_index != 0 && undo_list[move_index - 1].verb == "win") {
		//moves_el.innerHTML = "Game Over";
		moves_el.hidden = true;
		gameover_el.hidden = false;
	} else {
		moves_el.hidden = false;
		gameover_el.hidden = true;
		moves = list_possible_moves(board, player, (phase == 2));
		display_moves(board, moves, moves_el);
	}
	display_timeline();
	display_saves();
	localStorage.setItem("state", game_state());
	let log = document.getElementById("json_log_input");
	log.value = game_state();
	document.getElementById("note_log_area").value = notation_str();
}

function undo(setup_after) {
	if (turn === 1 && player === 1 && phase === 2) {
		return;
	} else if (phase === 2) {
		phase = 1;
	} else if (player === 2) {
		player = 1;
		phase = 2;
	} else {
		turn--;
		player = 2;
		phase = 2;
	}
	apply_move(board, undo_list[move_index - 1], true);
	move_index--;
	if (setup_after) {
		setup_turn();
	}
}

function redo(setup_after) {
	if (move_index < undo_list.length) {
		apply_move(board, undo_list[move_index], false);
		move_index++;
		update_turninfo();
	}
	if (setup_after) {
		setup_turn();
	}
}

function goto(position) {
	while (move_index !== position) {
		if (move_index > position) {
			undo(false);
		} else {
			redo(false);
		}
	}
	setup_turn();
}

function execute(move) {
	apply_move(board, move, false);
	while (move_index < undo_list.length) {
		undo_list.pop();
	}
	undo_list.push(move);
	move_index++;
	update();
}

function game_state() {
	return JSON.stringify({
		playernames: {
			1: P1name_el.value,
			2: P2name_el.value
		},
		session: "",
		moveslist: undo_list,
		boardstate: board,
		options: opts
	});
}

function update_turninfo() {
	phase++;
	if (phase === 3) {
		phase = 1;
		player++;
		if (player === 3) {
			player = 1;
			turn++;
		}
	}
}

function update() {
	update_turninfo();
	setup_turn();
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function import_game(end, gamestate) {
	if (gamestate) {
		reset_game();
		let moveslist;
		if (gamestate instanceof Array) {
			moveslist = gamestate;
		} else {
			moveslist = gamestate.moveslist;
			if (gamestate.playernames) {
				P1name_el.value = gamestate
					.playernames[1];
				P2name_el.value = gamestate
					.playernames[2];
				update_players();
			}
			if (gamestate.options) {
				reset_opts_ui(gamestate.options);
			}
			/* else {
				opts = {
					board_size: 5,
					towers: "3",
					configuration: "rotated",
					rules: {
						fF: true,
						bF: true,
						uF: false,
						sF: false,
						Gr: "short",
						IB: false,
						bB: false
					}
				}
			}*/
		}
		undo_list = gamestate.moveslist;
		if (end) {
			goto(undo_list.length);
		} else {
			replay_game();
		}
	}
}

function import_game_from_textbox(step) {
	const gamestate = JSON.parse(document.getElementById("json_log_input").value);
	import_game(step, gamestate);
}

async function replay_game() {
	replay_btn_el.disabled = true;
	pause_btn_el.disabled = false;
	should_replay = true;

	while (move_index !== undo_list.length && should_replay) {
		const move = undo_list[move_index];
		let locs = [];
		for (const k in move) {
			if (k != "verb") {
				locs.push(board[move[k].loc].id);
			}
		}
		highlight_spaces(locs);
		await sleep(delay_el.valueAsNumber);
		apply_move(board, move, false);
		move_index++;
		update();
	}

	replay_btn_el.disabled = false;
	pause_btn_el.disabled = true;
	should_replay = false;
}

function save_game() {
	saves.push(window.structuredClone({
		s_board: JSON.stringify(board),
		s_moves: undo_list,
		s_moves_avail: moves,
		s_move: move_index,

		s_player: player,
		s_turn: turn,
		s_phase: phase,

		s_options: {
			...opts
		}
	}));
	display_saves();
}

async function reset_game() {
	save_game();
	set_opts();
	board = make_board();
	player = 1;
	turn = 1;
	phase = 2;
	move_index = 0;
	undo_list = [];
	draw_board();
	setup_turn();
}

async function load_game(number) {
	const restore = saves[number];

	board = JSON.parse(restore.s_board);
	undo_list = restore.s_moves;
	moves = restore.s_moves_avail;
	move_index = restore.s_move;

	player = restore.s_player;
	turn = restore.s_turn;
	phase = restore.s_phase;

	reset_opts_ui(restore.s_options);
	set_opts();

	draw_board();
	setup_turn();
}

function update_rulestr() {
	document.getElementById('rules-share').value = JSON.stringify(opts);
}

function import_rules() {
	reset_opts_ui(JSON.parse(document.getElementById('rules-share').value));
	reset_game();
}

function notation_str() {
	const style = String(opts.board_size*2+1) + opts.configuration.at(0)
		 + opts.towers;
	let rules = "";
	for (const rule in opts.rules) {
		if (opts.rules[rule] !== default_opts.rules[rule]) {
			if (opts.rules[rule] === true) {
				rules += rule + " ";
			} else if (opts.rules[rule] === false) {
				rules += "-" + rule + " ";
			} else {
				rules += rule + "=" + opts.rules[rule] + " ";
			}
		}
	}
	let n = "version=0\n"
		 + "players=" + players[1] + ", " + players[2] + "\n"
		 + "style=" + style + "\n"
		 + "rules=" + rules + "\n\n"
		 + "1. -----";
	let l_turn = 1;
	let l_player = 1;
	let l_phase = 2;

	for (const [idx, mv] of undo_list.entries()) {
		if (l_player === 1 && l_phase === 1) {
			n += "\n" + l_turn + ". ";
		} else {
			n += " ";
		}

		let tr = format_move(mv, "past");

		n += tr[1];

		l_phase++;
		if (l_phase == 3) {
			l_phase = 1;
			l_player++;

			if (l_player == 3) {
				l_player = 1;
				l_turn++;
			}
		}
	}
	return n;
}

function delete_game(index) {
	saves.splice(index, 1);
	display_saves();
}
function zip(a, b) {
	return Array.from(
				Array(Math.max(b.length, a.length)),
				(_, i) => [a[i], b[i]]);
}

function populate_move_row(table, classes, contents, transform) {
	let row = table.insertRow();
	for (const [cl, val] of zip(classes, contents)) {
		const c = row.insertCell();
		c.classList.add(cl);
		let a = c.appendChild(document.createElement("a"));
		a.classList.add("move-item");
		a.innerHTML = val;
		transform(a);
	}
}

function display_moves(board, moves, list) {
	//let s = "";
	list.replaceChildren();
	for (const mv of moves) {
		let locs = [];
		for (const k in mv) {
			if (k !== "verb") {
				locs.push(board[mv[k].loc].id);
			}
		}
		let tr = format_move(mv);
		const classes = ["fill", "move-notation"];

		populate_move_row(list, classes, tr, a => {
									a.addEventListener("mouseover", () => {
																 highlight_spaces(locs);
															 });
									a.addEventListener("click", () => {
																 execute(mv);
															 });
								});

		//let a_html = "<a class='move-item'"
		//	 + " onmouseover='highlight_spaces(" + JSON.stringify(locs) + ");'" +
		//	 "onclick='execute(" + JSON.stringify(mv) + ");'"
		//	 + ">";
		//s += "<tr><td class='fill'>" + a_html + tr[0] +
		//	"</a></td><td class='move-notation'>" + a_html + tr[1] +
		//	"</a></td></tr>";
	}
	//list.innerHTML = s;

}

function a_html(idx, copy, text) {
	let a = "<a class='move-item";
	// console.log(move_index + ' ' + (idx + 1));
	if (move_index === idx + 1) {
		a += " selected'";
	} else {
		a += "' onclick='goto(" + (idx + 1) + ")'";
	}
	a += ">" + text + "</a>";
	return a;
}

function display_timeline() {
	const classes = ["move-idx", "fill", "move-notation"];
	function ch_sel(idx) {
		return a => {
			if (move_index == idx + 1) {
				a.classList.add("selected");
			} else {
				a.addEventListener("click", () => goto(idx + 1));
			}
		};
	}

	let l_turn = 1;
	let l_player = 1;
	let l_phase = 2;
	timeline_el.replaceChildren();
	populate_move_row(timeline_el, classes,
							["1/1/-:", "<strong>&nbsp;Game begin</strong>", "-----"],
							ch_sel(-1));

	//let s = "<tr><td class='move-idx'>1/1/-:</td>" +
	//	"<td>" + a_html(-1, false, "<strong>&nbsp;Game begin</strong>") +
	//	"</td><td class='move-notation'>-----</td></tr>";

	for (const [idx, mv] of undo_list.entries()) {
		let tr = format_move(mv, "past");
		let turn = l_turn + "/" + l_player + "/" + l_phase + ":";
		let long = format_player(l_player) + " " + tr[0];

		populate_move_row(timeline_el, classes, [turn, long, tr[1]], ch_sel(idx));

		//s += "<tr><td class='move-idx'>" + a_html(idx, false, turn) + "</td>" +
		//	"<td class='fill'>" + a_html(idx, false, long) + "</td>" +
		//	"<td class='move-notation'>" + a_html(idx, true, tr[1]) + "</td>";

		//s += "</tr></td>";

		l_phase++;
		if (l_phase == 3) {
			l_phase = 1;
			l_player++;

			if (l_player == 3) {
				l_player = 1;
				l_turn++;
			}
		}
	}
	//timeline_el.innerHTML = s;
}

function display_saves() {
	localStorage.setItem("saves", JSON.stringify(saves));
	let s = "<ol>";

	for (const [idx, g] of saves.entries()) {
		s += "<li><div><a class='move-item' onclick='load_game(" + idx +
			")'>Turn " +
			g.s_turn + "," + format_player(g.s_player) + ", Phase " + g
			.s_phase +
			"</a><a class='move-item delete' onclick='delete_game(" +
			idx + ")'>(delete)</a></div></li>";
	}

	s += "</ol>";

	saves_el.innerHTML = s;
}

function isJSON(str) {
	try {
		return (JSON.parse(str) && !!str);
	} catch (e) {
		return false;
	}
}

function validate_JSON_field(Field) {
	const valid = isJSON(Field.value);
	if (!valid) {
		Field.setCustomValidity("Invalid JSON");
	} else {
		Field.setCustomValidity("");
	}
}

function download(id, text, name, type) {
	let a = document.getElementById(id);
	let file = new Blob([text], {
		type: type
	});
	a.href = URL.createObjectURL(file);
	a.download = name;
}

function export_game() {
	download("moves_export", game_state(), 'Honey-War-Log.json',
		'application/json');
}

function export_notation() {
	download("note_export", notation_str(), 'Honey-War-Log.txt', 'text/plain');
}

function global_init() {
	board_el.addEventListener("click",
		(event) => highlight_from(event));
	board_el.addEventListener("mousemove",
		(event) => highlight_from(event));

	document.getElementById("undo-btn").addEventListener("click",
		() => undo(true));
	document.getElementById("redo-btn").addEventListener("click",
		() => redo(true));
	document.getElementById("moves-table").addEventListener("mouseout",
		() => highlight_spaces([]));
	document.getElementById("game-replay").addEventListener("click",
		() => replay_game());
	document.getElementById("replay-pause").addEventListener("click",
		() => { should_replay = false; });
	document.getElementById("save-game").addEventListener("click",
	   () => save_game());
	document.getElementById("reset").addEventListener("click",
	   () => reset_game());

	document.getElementById("P1-name").addEventListener("change",
	   () => update_players());
	document.getElementById("P2-name").addEventListener("change",
	   () => update_players());
	document.getElementById("configmirrored").addEventListener("change",
	   () => opt('mirrored'));
	document.getElementById("configrotated").addEventListener("change",
	   () => opt('rotated'));
	document.getElementById("boardlarge").addEventListener("change",
	   () => opt('large'));
	document.getElementById("boardsmall").addEventListener("change",
	   () => opt('small'));

	document.getElementById("towers3").addEventListener("change",
	   () => opt('t3'));
	document.getElementById("towers2").addEventListener("change",
	   () => opt('t2'));
	document.getElementById("towers2w").addEventListener("change",
	   () => opt('t2w'));
	document.getElementById("towers1").addEventListener("change",
	   () => opt('t1'));
	document.getElementById("towers2mr").addEventListener("change",
	   () => opt('t2mr'));
	document.getElementById("towers2ml").addEventListener("change",
	   () => opt('t2ml'));
	document.getElementById("towers3t").addEventListener("change",
	   () => opt('t3t'));
	document.getElementById("towers3tc").addEventListener("change",
	   () => opt('t3tc'));

	document.getElementById("friendly-footsoldiers").addEventListener("change",
	   () => opt('friendly-footsoldiers'));
	document.getElementById("buff-footsoldiers").addEventListener("change",
	   () => opt('buff-footsoldiers'));
	document.getElementById("upgrade-footsoldiers").addEventListener("change",
	   () => opt('upgrade-footsoldiers'));
	document.getElementById("stranded-footsoldiers").addEventListener("change",
	   () => opt('stranded-footsoldiers'));

	document.getElementById("garrisonshort").addEventListener("change",
	   () => opt('garrisonshort'));
	document.getElementById("garrisonlong").addEventListener("change",
	   () => opt('garrisonlong'));
	document.getElementById("garrisonboth").addEventListener("change",
	   () => opt('garrisonboth'));

	document.getElementById("buff-trebuchet").addEventListener("change",
	   () => opt('buff-trebuchet'));
	document.getElementById("buff-infantry").addEventListener("change",
	   () => opt('buff-infantry'));

	document.getElementById("import-rules").addEventListener("click",
	   () => import_rules());
	document.getElementById("import-begin").addEventListener("click",
		() => import_game_from_textbox(false));
	document.getElementById("import-end").addEventListener("click",
		() => import_game_from_textbox(true));
	document.getElementById("moves-export").children[0].addEventListener("click",
		() => download("moves-export", game_state(), 'Honey-War-Log.json',
			'application/json'));
	document.getElementById("note-export").children[0].addEventListener("click",
		() => download("note-export", notation_str(), 'Honey-War-Log.txt',
			'text/plain'));

	set_opts();
	if (localStorage.getItem("state")) {
		import_game(true, JSON.parse(localStorage.getItem("state")));
		// the game import function creates an extra checkpoint
		delete_game(saves.length - 1);
	}
	reset_opts_ui(opts);
	draw_icons();

	update_players();
	setup_turn();
}
global_init();
