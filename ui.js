"use strict";
const board_el = document.getElementById('board');
const header_el = document.getElementById('turn');
const move_list = document.getElementById('moves');
const timeline_el = document.getElementById('timeline');
const saves_el = document.getElementById('saves');
const replay_btn_el = document.getElementById('game-replay');
const pause_btn_el = document.getElementById('replay-pause');
const delay_el = document.getElementById('replay-delay');
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
    tower_cavalry: "TC"
};
const enemy_of = [0, 2, 1];
var turn = 1;
var player = 1;
var phase = 2;
var moves = [];
var undo_list = [];
var move_index = 0;
var saves = JSON.parse(localStorage.getItem("saves")) || [];
var should_replay = false;

var opts = {
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

function apply_listeners() {
    for (let e of document.getElementsByTagName('textarea')) {
        if (e.classList.contains('json')) {
            e.addEventListener('change', () => validate_JSON_field(e));
        }
    }
}
apply_listeners();

function set_opts() {
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
        '3','2','2w','1',
        '3t','3tc',
        '2mr','2ml'
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
    update_rulestr();
    console.dir(opts);
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
        '3','2','2w','1',
        '3t','3tc',
        '2mr','2ml'
    ];
    let set = false;
    for (const code of tower_settings) {
        if (options.towers === code) {
            document.getElementById('towers' + code).checked = true;
            opts.towers = code;
            set = true;
            opt('t'+code);
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
        document.getElementById(id).checked = opts.rules[rule];
        if (opts.rules[rule]) {
            opt(id);
        }
    }

    update_rulestr();
    console.dir(opts);
}

var board = make_board();

var players = {1: "Player 1", 2: "Player 2"};

function encode(s) {
    return s.replace(/./g, function(c) {
        return"&#"+c.charCodeAt(0)+";"
    });
}

function update_players() {
    players[1] = encode(document.getElementById("P1-name").value);
    players[2] = encode(document.getElementById("P2-name").value);
    write_title();
}

function format_player(player) {
    return icon_for("castle", player) + '<text>' + players[player] + '</text>';
}

function draw_icons() {
    for (let el of document.getElementsByClassName("icon")) {
        const name = el.innerHTML;
        el.innerHTML = '<img class="inline-icon" src="imgs/' + name + '.svg" />';
    }
}

set_opts();
if (localStorage.getItem("state")) {
    import_game(true, JSON.parse(localStorage.getItem("state")));
    // the game import function creates an extra checkpoint
    delete_game(saves.length - 1);
}
reset_opts_ui(opts);
draw_icons();

function write_title() {
    header_el.innerHTML = "Turn " + turn
                        + ", " + format_player(player)
                        + ", Phase " + phase;
}

function setup_turn() {
    draw_pieces(document.getElementById("board_pieces"), board);
    write_title();
    document.getElementById("movelist-title").innerHTML = "Possible Moves";
    highlight_spaces([]);
    moves = list_possible_moves(board, player, (phase==2));
    display_moves(board, moves, move_list);
    show_timeline();
    show_saves();
    if (move_index != 0 && undo_list[move_index-1].verb == "win") {
        move_list.innerHTML = "Game Over";
    }
    localStorage.setItem("state", game_state());
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
    apply_move(board, undo_list[move_index-1], true);
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
            1: document.getElementById("P1-name").value,
            2: document.getElementById("P2-name").value
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
update_players();
setup_turn();

function download(text, name, type) {
    let a = document.getElementById("moves_export");
    let file = new Blob([text], {type: type});
    a.href = URL.createObjectURL(file);
    a.download = name;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function export_game() {
    download(game_state(), 'Honey-War-Log.json', 'application/json');
}

function import_game(step, gamestate) {
    if (gamestate) {
        reset_game();
        let moveslist;
        if (gamestate instanceof Array) {
            moveslist = gamestate;
        } else {
            moveslist = gamestate.moveslist;
            if (gamestate.playernames) {
                document.getElementById("P1-name").value = gamestate.playernames[1];
                document.getElementById("P2-name").value = gamestate.playernames[2];
                update_players();
            }
            if (gamestate.options) {
                reset_opts_ui(gamestate.options);
                /*opts = gamestate.options;
                update_rulestr();*/
            }/* else {
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
        if (step) {
            for (const move of moveslist) {
                /* if (slowmode) {
                   } */
                apply_move(board, move, false);
                undo_list.push(move);
                move_index++;
                update_turninfo();
            }
        } else {
            undo_list = gamestate.moveslist;
        }
        setup_turn();
    }
}
function import_game_from_textbox(step) {
    const gamestate = JSON.parse(document.getElementById("input_area").value);
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
        update();
        move_index++;
    }

    replay_btn_el.disabled = false;
    pause_btn_el.disabled = true;
    should_replay = false;
}

function save_game() {
    saves.push({
        s_board: JSON.stringify(board),
        s_moves: undo_list,
        s_moves_avail: moves,
        s_move: move_index,

        s_player: player,
        s_turn: turn,
        s_phase: phase,

        s_options: {...opts}
    });
    show_saves();
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

    setup_turn();
}

function update_rulestr() {
    document.getElementById('rules-share').value
        = JSON.stringify(opts);
}

function import_rules() {
    reset_opts_ui(JSON.parse(document.getElementById('rules-share').value));
    reset_game();
}

function delete_game(index) {
    saves.splice(index, 1);
    show_saves();
}

function show_timeline() {
    let l_turn = 1;
    let l_player = 1;
    let l_phase = 2;
    let s = "<ol><li><a class='move-item "
          + (move_index === 0 ? "selected" : "")
          + "' onclick='goto(0)'>Game begin</a></li>";

    for (const [idx, mv] of undo_list.entries()) {
        s += "<li><a class='move-item "
           + (move_index === idx + 1 ? "selected" : "")
           + "' onclick='goto(" + (idx+1) + ")'>"
           + l_turn + "/" + l_player + "/" + l_phase + ":"
           + format_player(l_player) + " " + format_move(mv, "past")
           + "</a>";

        s += "</li>";

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
    s += "</ol>";
    timeline_el.innerHTML = s;
}

function show_saves() {
    localStorage.setItem("saves", JSON.stringify(saves));
    let s = "<ol>";

    for (const [idx, g] of saves.entries()) {
        s += "<li><div><a class='move-item' onclick='load_game(" + idx + ")'>Turn "
           + g.s_turn + "," + format_player(g.s_player) + ", Phase " + g.s_phase
           + "</a><a class='move-item delete' onclick='delete_game("
           + idx + ")'>(delete)</a></div></li>";
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
