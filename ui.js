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
let undelete_tmp = null;
let undelete_btn = document.getElementById("undelete-btn");
let should_replay = false;

const default_opts = {
	board_size: 5,
	towers: "3",
	configuration: "mirrored",
	rules: {
		// friendly-footsoldiers
		fF: true,
		// buff-footsoldiers
		bF: true,
		// upgrade-footsoldiers
		uF: false,
		// stranded-footsoldiers
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
let opt_uis = [
	["configmirrored", 'mirrored'],
	["configrotated", 'rotated'],
	["boardlarge", 'large'],
	["boardsmall", 'small'],

	["towers3", 't3'],
	["towers2", 't2'],
	["towers2w", 't2w'],
	["towers1", 't1'],
	["towers2mr", 't2mr'],
	["towers2ml", 't2ml'],
	["towers3t", 't3t'],
	["towers3tc", 't3tc'],

	"friendly-footsoldiers",
	"buff-footsoldiers",
	"upgrade-footsoldiers",
	"stranded-footsoldiers",

	"garrisonshort",
	"garrisonlong",
	"garrisonboth",

	"buff-trebuchet",
	"buff-infantry",
];

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

function disable(id, val) {
	const el = typeof id == "string" ? document.getElementById(id) : id;
	if (el.tagName == "FIELDSET") {
		Array.from(el.querySelectorAll("input")).forEach(e=>e.disabled = val);
	} else if (el.tagName == "INPUT" || el.tagName == "BUTTON") {
		el.disabled = val;
	} else {
		console.dir("Attempted to disable unknown tag", el);
	}
}

function opt(option) {
	for (const o of opt_uis) {
		if (o instanceof Array && o[1] === option) {
			option = o[0];
		}
	}

	const el = document.getElementById(option);
	const pe = el.parentNode;
	if (pe.dataset.allow) {
		const d = Array.from(pe.querySelectorAll("input")).some(e=>e.checked);
		for (const id of pe.dataset.allow.split(' ')) {
			disable(id, !d);
		}
	}
	if (el.dataset.exclude) {
		// for all inputs in this fieldset, if they are not checked, clear
		// the disabled flag for all of their exclusions
		for (const other of pe.querySelectorAll("input[data-exclude]")) {
			if (!other.checked && other.dataset.exclude) {
				other.dataset.exclude.split(' ').forEach((id) =>
					disable(id, false));
			}
		}
		// for all inputs in this fieldset, if they are checked, apply the
		// disabled flag tor all of their exclusions
		for (const other of pe.querySelectorAll("input[data-exclude]")) {
			if (other.checked && other.dataset.exclude) {
				other.dataset.exclude.split(' ').forEach((id) =>
					disable(id, true));
			}
		}
		// strictly speaking this only works if the exclusions of each fieldset
		// are all disjoint but that is the case here

	}
	if (pe.dataset.exclude) {
		const d = Array.from(pe.querySelectorAll("input")).some(e=>e.checked);
		for (const id of pe.dataset.exclude.split(' ')) {
			disable(id, d);
		}
	}
}

function radio_set(id) {
	const el = document.getElementById(id);
	for (const node of document.getElementsByName(el.name)) {
		node.checked = false;
	}
	el.checked = true;
}

function valid_of(option, settings) {
	for (const s of settings) {
		if (option === s) {
			return s;
		}
	}
	return settings[0];
}

function normalize_opts(options) {
	let ret = {rules: {}};
	ret.configuration = valid_of(options.configuration,
		['mirrored', 'rotated']);
	ret.board_size = (options.board_size === 4 ? 4 : 5);
	ret.towers = valid_of(options.towers,
		['3', '2', '2w', '1', '3t', '3tc', '2mr', '2ml']);
	const rules = ['fF', 'bF', 'uF', 'sF', 'IB', 'bB'];
	for (const rule of rules) {
		ret.rules[rule] = options.rules[rule];
	}
	ret.rules.Gr = valid_of(options.rules.Gr, ['short', 'long', 'both']);
	return ret;
}

function reset_opts_ui(in_options, effective = true) {
	const options = normalize_opts(in_options);
	if (effective === true) {
		opts = window.structuredClone(options);
		console.dir(opts);
	}

	radio_set('config' + options.configuration);
	opt(options.configuration);

	const size = (options.board_size === 4 ? 'small' : 'large');
	radio_set('board' + size);
	opt(size);

	radio_set('towers' + opts.towers);
	opt('t' + opts.towers);

	radio_set('garrison'+opts.rules.Gr);
	opt('garrison'+opts.rules.Gr);

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
	setup_turn();
}

function format_player(player) {
	return icon_for("castle", player) + '<text>' + players[player] + '</text>';
}

function draw_icons() {
	for (let el of document.querySelectorAll(".icon")) {
		const name = el.innerHTML;
		el.replaceWith(create_element("img", "", ["inline-icon"],
			{src: `imgs/${name}.svg`, name: name}));
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

function notate_coords(space) {
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
	return letters[space.loc[0]] + letters[space.loc[1]];
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
	draw_pieces();
	write_title();
	movelist_title.innerText = "Possible Moves";
	highlight_spaces([]);
	if (move_index != 0 && undo_list[move_index - 1].verb == "win") {
		moves_el.hidden = true;
		gameover_el.hidden = false;
	} else {
		moves_el.hidden = false;
		gameover_el.hidden = true;
		moves = list_possible_moves(board, player, (phase == 2));
		display_moves(board, moves, moves_el);
	}
	disable("undo-btn", move_index === 0);
	disable("redo-btn", move_index === undo_list.length);
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

async function replay_game() {
	disable(replay_btn_el, true);
	disable(pause_btn_el, false);
	should_replay = true;

	while (move_index !== undo_list.length && should_replay) {
		const move = undo_list[move_index];
		let locs = [];
		for (const k in move) {
			if (k !== "verb") {
				locs.push(board[move[k].loc].id);
			}
		}
		highlight_spaces(locs);
		await sleep(delay_el.valueAsNumber);
		apply_move(board, move, false);
		move_index++;
		update();
	}

	disable(replay_btn_el, false);
	disable(pause_btn_el, true);
	should_replay = false;
}

function save_game() {
	saves.push(window.structuredClone({
		s_board: JSON.stringify(board),
		s_moves: undo_list,
		s_moves_avail: moves,
		s_move: move_index,
		s_playernames: {
			1: P1name_el.value,
			2: P2name_el.value
		},

		s_player: player,
		s_turn: turn,
		s_phase: phase,

		s_options: {
			...opts
		}
	}));
	display_saves();
}

async function load_game(number) {
	const restore = window.structuredClone(saves[number]);

	board = JSON.parse(restore.s_board);
	undo_list = restore.s_moves;
	moves = restore.s_moves_avail;
	move_index = restore.s_move;

	if (restore.s_playernames) {
		P1name_el.value = restore.s_playernames[1];
		P2name_el.value = restore.s_playernames[2];
		update_players();
	}

	player = restore.s_player;
	turn = restore.s_turn;
	phase = restore.s_phase;

	reset_opts_ui(restore.s_options);

	draw_board();
	setup_turn();
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
				P1name_el.value = gamestate.playernames[1];
				P2name_el.value = gamestate.playernames[2];
				update_players();
			}
			if (gamestate.options) {
				reset_opts_ui(gamestate.options);
			}
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

function update_rulestr() {
	document.getElementById('rules-share').value = JSON.stringify(opts);
}

function import_rules() {
	reset_opts_ui(JSON.parse(document.getElementById('rules-share').value));
	reset_game();
}

const style = (o)=>`${o.board_size*2+1}${o.configuration.at(0)}${o.towers}`;

function notation_str() {
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
		 + "style=" + style(opts) + "\n"
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
	undelete_tmp = [index, saves.splice(index, 1)[0]];
	disable(undelete_btn, false);
	display_saves();
}
function undelete() {
	saves.splice(undelete_tmp[0], 0, undelete_tmp[1]);
	disable(undelete_btn, true);
	undelete_tmp = null;
	display_saves();
}

function zip(a, b) {
	return Array.from(
				Array(Math.max(b.length, a.length)),
				(_, i) => [a[i], b[i]]);
}

function populate_move_row(table, classes, contents, transform) {
	let row = table.insertRow();
	for (const [idx, [cls, val]] of zip(classes, contents).entries()) {
		const c = row.insertCell();
		if (cls) {
			cls.split(' ').forEach(cl=>c.classList.add(cl));
		}
		let a = c.appendChild(document.createElement("a"));
		a.classList.add("move-item");
		a.innerHTML = val;
		transform(a, idx);
	}
	return row;
}

function display_moves(board, pmoves, list) {
	list.replaceChildren();
	for (const mv of pmoves) {
		let locs = [];
		for (const k in mv) {
			if (k !== "verb") {
				locs.push(board[mv[k].loc].id);
			}
		}
		let tr = format_move(mv);
		const classes = ["fill", "move-notation"];

		populate_move_row(list, classes, tr, a => {
			event_el(a, "mouseover", () => highlight_spaces(locs));
			event_el(a, "click", () => execute(mv));
		});
	}

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
				event_el(a, "click", () => goto(idx + 1));
			}
		};
	}

	let l_turn = 1;
	let l_player = 1;
	let l_phase = 2;
	timeline_el.replaceChildren();
	populate_move_row(timeline_el, classes,
							["1/1/1:", "<strong>&nbsp;Game begin</strong>", "-----"],
							ch_sel(-1));

	for (const [idx, mv] of undo_list.entries()) {
		let tr = format_move(mv, "past");
		let turn = l_turn + "/" + l_player + "/" + l_phase + ":";
		let long = format_player(l_player) + " " + tr[0];
		populate_move_row(timeline_el, classes, [turn, long, tr[1]], ch_sel(idx));

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
}

function display_saves() {
	localStorage.setItem("saves", JSON.stringify(saves));
	saves_el.replaceChildren();

	for (const [idx, g] of saves.entries()) {
		const label_p = (p, n) => `${icon_for("castle", p)}${encode(n[p])}`;
		const label_v = (ps) => `${label_p(1, ps)} vs. ${label_p(2, ps)}`;

		populate_move_row(saves_el, ["save-name fill", "save-rules fill", "move-idx delete"],
			[label_v(g.s_playernames	?? players),
			`${g.s_turn}/${g.s_player}/${g.s_phase} (${style(g.s_options)})`,
			`del`], (a, i) => {
				switch (i) {
				default:
					event_el(a, "click", ()=>load_game(idx));
					a.title = "Load saved game";
					break;
				case 2:
					a.classList.add("delete");
					event_el(a, "click", ()=>delete_game(idx));
					event_el(a, ["mouseover", "focus"], e =>
						event.target.parentElement.parentElement.classList.add("red")
					);
					event_el(a, ["mouseout", "blur"], e =>
						event.target.parentElement.parentElement.classList.remove("red")
					);
					a.title = "Delete saved game";
					break;
				}
			});
	}
}

function isJSON(str) {
	try {
		return (JSON.parse(str) && !!str);
	} catch (e) {
		return false;
	}
}

function validate_JSON_field(event) {
	const Field = event.target;
	const valid = isJSON(Field.value);
	if (!valid) {
		Field.setCustomValidity("Invalid JSON");
		for (const btn of Field.attributes['data-buttons'].value.split(' ')) {
			disable(btn, true);
		}
	} else {
		Field.setCustomValidity("");
		for (const btn of Field.attributes['data-buttons'].value.split(' ')) {
			disable(btn, false);
		}
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

function event_el (el, event, action) {
	if (event instanceof Array) {
		event.forEach(e=>el.addEventListener(e, action));
	} else {
		el.addEventListener(event, action);
	}
}
const event_id = (id, event, action) =>
	 event_el(document.getElementById(id), event, action);

function global_init() {
	for (let e of document.getElementsByTagName('textarea')) {
		if (e.classList.contains('json')) {
			event_el(e, 'change', validate_JSON_field);
		}
	}

	event_el(board_el, ["click", "mousemove"], highlight_from);

	event_id("undo-btn", "click", () => undo(true));
	event_id("redo-btn", "click", () => redo(true));
	event_id("moves-table", "mouseout", () => highlight_piece_moves(selected));
	event_id("game-replay", "click", replay_game);
	event_id("replay-pause", "click", () => { should_replay = false; });
	event_id("save-game", "click", save_game);
	event_el(undelete_btn, "click", undelete);
	event_id("defaults", "click", () => reset_opts_ui(default_opts, false));
	event_id("rules-current", "click", () => reset_opts_ui(opts, false));
	event_id("reset", "click", reset_game);

	event_id("P1-name", "change", update_players);
	event_id("P2-name", "change",update_players);
	event_id("import-rules", "click", import_rules);
	event_id("import-begin", "click", () => import_game_from_textbox(false));
	event_id("import-end", "click", () => import_game_from_textbox(true));
	event_id("moves-export-btn", "click",
		() => download("moves-export", game_state(), 'Honey-War-Log.json',
			'application/json'));
	event_id("note-export-btn", "click",
		() => download("note-export", notation_str(), 'Honey-War-Log.txt',
			'text/plain'));

	for (const o of opt_uis) {
		if (o instanceof Array) {
			event_id(o[0], "change", () => opt(o[1]));
		} else {
			event_id(o, "change", () => opt(o));
		}
	}

	if (localStorage.getItem("state")) {
		import_game(true, JSON.parse(localStorage.getItem("state")));
		// the game import function creates an extra checkpoint
		delete_game(saves.length - 1);
		undelete_tmp = null;
		disable(undelete_btn, true);
	} else {
		set_opts();
	}
	reset_opts_ui(opts, false);
	draw_icons();

	update_players();
	setup_turn();
}
global_init();
