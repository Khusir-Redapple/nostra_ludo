const config = require('./../../config');
var { tableObject, gamePlayObject } = require('./tableObject');
var logger = require('../../api/service/logger');
const { sendMessage } = require('../../socket/controller/message_controllers');
const { Console } = require('console');
const { kill } = require('process');

class _Tables {
    constructor() {
        this.tables = tableObject;
        this.gamePlayData = gamePlayObject;
    }

    //create table for tournament
    createTableforTourney(table) {
        let playData = {
            room: table.room,
            created_at: table.created_at,
            data: {}
        };
        this.gamePlayData.push(playData);
        return new Promise((resolve) => {
            var table_i = {
                room: table.room,
                created_at: table.created_at,
                room_fee: table.room_fee,
                win_amount: table.win_amount,
                totalWinning: table.totalWinning,
                players_done: 0,
                players_won: 0,
                current_turn: 0,
                current_turn_type: 'roll',
                turn_start_at: 0,
                no_of_players: table.no_of_players,
                users: [],
               
            };
            let colour = [0,1,2,3]
            for (var pl = 0; pl < 4; pl++) {
                let random_number = Math.floor(Math.random() * colour.length);
                let random_colour = colour[random_number];
                colour.splice(random_number, 1); 
                console.log("Random colour is  : ",random_number,random_colour,colour,table_i.room )
                table_i.users[pl] = {
                    id: '',
                    numeric_id: '',
                    name: '',
                    profile_pic: '',
                    position: pl,
                    is_active: false,
                    is_done: false,
                    is_left: false,
                    is_joined:false,
                    rank: 0,
                    life: 3,
                    turn: 1,
                    dices_rolled: [],
                    bonus_dice: 0,
                    six_counts: 0,
                    tokens: [0,0,0,0],
                    points: 0,
                    bonusPoints: 0,
                    moves:0,
                    token_colour:random_colour
                };
                // console.log('BEFORE GENERATING TABLE', table_i.users[pl]);
            }
           
            this.tables.push(table_i);
            console.log('New table generated', table_i.room);
            resolve(table_i.room);
        });
    }

    // Check Seat Available
    checkSeatAvailable(room) {
        var count = 0;
        var noPlayers = 0;
        // console.log('ROOM', room);
        for (var i = 0; i < this.tables.length; i++) {
            // console.log('In loop---->', this.tables[i].room);
            if (this.tables[i].room == room) {
                noPlayers = this.tables[i].no_of_players;
                for (var pl = 0; pl < 4; pl++) {
                    if (this.tables[i].users[pl] && this.tables[i].users[pl].is_active) {
                        count++;
                    }
                }

                break;
            }
        }

        let current_time = new Date().getTime();
        let time_diff = (current_time - (this.tables[i] ? this.tables[i].created_at : 0)) / 1000;

        return { flag: count < noPlayers, timerStart: 240 - time_diff };
    }

    checkTournamentTable(room_fee, no_of_players) {
        for (var i = 0; i < this.tables.length; i++) {
            console.log('room_fee', room_fee, no_of_players);
            console.log('TABCHECK', i, this.tables[i]);

            if (
                this.tables[i].room_fee == room_fee &&
                this.tables[i].no_of_players == no_of_players
            ) {
                var count = 0;
                var noPlayers = this.tables[i].no_of_players;

                for (var pl = 0; pl < 4; pl++)
                    if (this.tables[i].users[pl] && this.tables[i].users[pl].is_active) count++;

                console.log('Tournament :Inside Function Count::', count);
                console.log('Tournament :Inside Function No of Pl::', noPlayers);
                console.log('Tournament :Inside Function Room::', this.tables[i].room);

                if (count < noPlayers) return { room: this.tables[i].room, timerStart: 60 };
            }
        }

        return false;
    }

    //Check Table Exists
    checkTableExists(room) {
        // for (var i = 0; i < this.tables.length; i++) {
        //     if (this.tables[i].room == room) {
        //         return {
        //             status: true,
        //             start_at: parseInt(this.tables[i].turn_start_at),
        //             current_turn: this.tables[i].current_turn,
        //         };
        //     }
        // }
        
        // New implementation
        this.tables.map(function(element,i) {
            if (this.tables[i].room == room) {
                return {
                    status: true,
                    start_at: parseInt(this.tables[i].turn_start_at),
                    current_turn: this.tables[i].current_turn,
                };
            }
        })
        return {
            status: false,
        };
    }

     //Seat on tournament table
    seatOnTableforTourney(room, user) {
        var index = this.tables.findIndex(function(data, i){
            return data.room == room
        });
        var filteredTable = this.tables.filter((x)=>x.room == room);
        if (filteredTable.length > 0) {
            var count = 0;
            var noPlayers = filteredTable[0].no_of_players;

            for (var pl = 0; pl < 4; pl++)
                if (filteredTable[0].users[pl] && filteredTable[0].users[pl].is_active) count++;

            if (count >= noPlayers) return false;

            var pos = -1;
            if (!filteredTable[0].users[0].is_active) {
                pos = 0;
            } else if (!filteredTable[0].users[2].is_active) {
                pos = 2;
            } else if (!filteredTable[0].users[1].is_active) {
                pos = 1;
            } else if (!filteredTable[0].users[3].is_active) {
                pos = 3;
            }

            if (pos == -1) return false;

            filteredTable[0].users[pos] = {
                id: user._id,
                numeric_id: user.numeric_id,
                name: user.name,
                profile_pic: user.profilepic || config.default_user_pic,
                position: pos,
                is_active: true,
                rank: 0,
                life: 3,
                turn: 0,
                dices_rolled: [],
                bonus_dice: 0,
                six_counts: 0,
                tokens: [0,0,0,0],
                points:0,
                bonusPoints:0,
                moves:0,
                token_colour: filteredTable[0].users[pos].token_colour
            };
            this.tables[index] = filteredTable[0];
            // if(pos == 2)  filteredTable[0].users[pos].tokens = [26,0,0,0];
            // console.log(filteredTable[0],filteredTable[0].users[pos],this.tables[index])
            return {
                table: filteredTable[0],
                pos: pos,
            };
        }
        return false;
    }
    setTableData(room, user){
        console.log("setTableData >>>",room, user.name,this.tables)
        for (var i = 0; i < this.tables.length; i++) {
            if (this.tables[i].room == room) {
                console.log("In Room >>")
                for (var pl = 0; pl < this.tables[i].users.length; pl++) {
                    // console.log(this.tables[i].users[pl].id == user._id,this.tables[i].users[pl].id ,user._id)
                    if (this.tables[i].users[pl].id == user._id.toString()) {
                        this.tables[i].users[pl].is_joined = true;
                        console.log("In user >>",pl)
                        return true;
                    }
                }                               
            }
        }
    }
    tableInfo(){
        console.log('AlreadyPlaying Started >>',this.tables.length);
        for (var i = 0; i < this.tables.length; i++) {
            console.log('totaltables', this.tables[i]);
        }
    }
    //To check user already playing in another room / table
    alreadyPlaying(id) {
        console.log('AlreadyPlaying Started >>', id,this.tables.length);
        for (var i = 0; i < this.tables.length; i++) {
            // console.log('AlreadyPlaying Started >>',  this.tables[i]);
            for (var pl = 0; pl < this.tables[i].users.length; pl++) {
                if (this.tables[i].users[pl].id) {
                    if (this.tables[i].users[pl].id.toString() == id.toString() && !this.tables[i].users[pl].is_left) {
                        // console.log('You are playing on this table', this.tables[i]);
                        return true;
                    }
                }
            }
        }
        return false;
    }
    alreadyPlayingTable(id) {
        // console.log('AlreadyPlaying Started >>', id);
        for (var i = 0; i < this.tables.length; i++) {
            for (var pl = 0; pl < this.tables[i].users.length; pl++) {
                if (this.tables[i].users[pl].id) {
                    if (this.tables[i].users[pl].id.toString() == id.toString() && !this.tables[i].users[pl].is_left) {
                        // console.log('You are playing on this table', this.tables[i]);

                        var curr_ = new Date().getTime();
                        var diff = (curr_ - this.tables[i].turn_start_at) / 1000;
                        var diff_ = (curr_ - this.tables[i].created_at) / 1000;
                        var diffT= (curr_ - this.tables[i].game_started_at) / 1000;
                        let timeToAdd = config.gameTime * 60;
                        // let gamecompleteTime = timeToAdd.getTime() - curr_ ;
                        console.log('[alreadyPlayingTable]- ', curr_, this.tables[i].turn_start_at, 30 - diff,timeToAdd,diffT,timeToAdd-diffT);
                        var rez = {
                            status: 1,
                            table: this.tables[i],
                            turn_start_at:  config.turnTimer - diff,//10 - diff,
                            timerStart: 60 - diff_ ,
                            game_started: !(this.tables[i].turn_start_at == 0),
                            current_turn: this.tables[i].current_turn,
                            current_turn_type: this.tables[i].current_turn_type,
                            position: this.tables[i].users[pl].position,
                            dices_rolled: this.tables[i].users[this.tables[i].current_turn].dices_rolled,
                            timeToCompleteGame: timeToAdd + 8 - diffT
                        };
                        return rez;
                    }
                }
            }
        }
        var rez = {
            status: 0,
            message: "Table not found."
        };
        return rez;
    }
    
    getTokRoom(room, id) {
        // console.log('getTokRoom Started >>', id);
        for (var i = 0; i < this.tables.length; i++) {
            if (this.tables[i].room == room) {
                for (var pl = 0; pl < this.tables[i].users.length; pl++) {
                    if (this.tables[i].users[pl].id) {
                        if (
                            this.tables[i].users[pl].id.toString() == id.toString() &&
                            !this.tables[i].users[pl].is_left
                        ) {
                            // console.log('You are playing on this table', this.tables[i]);
                            var rez = {
                                status: 1,
                                tokens: this.tables[i].users.map((user) => {
                                    return {
                                        user_id: user.id,
                                        tokens: user.tokens,
                                    };
                                }),
                            };
                            return rez;
                        }
                    }
                }
            }
        }
        var rez = {
            status: 0,
        };
        return rez;
    }

    leaveIfPlaying(id) {
        // console.log('AlreadyPlaying Started >>', id);
        for (var i = 0; i < this.tables.length; i++) {
            for (var pl = 0; pl < this.tables[i].users.length; pl++) {
                if (this.tables[i].users[pl].id) {
                    if (this.tables[i].users[pl].id.toString() == id.toString()) {
                        // console.log('You are playing on this table', this.tables[i]);
                        return this.tables[i].room;
                    }
                }
            }
        }
        return false;
    }

    isRankOccupied(room, rank) {
        var startDate = new Date();
        var my_tab = this.tables.find((d) => d.room == room);
        // console.log("table finding time in isRankOccupied", ((new Date()) - startDate));

        return my_tab.users.some((u) => u.rank == rank);
    }

    //Leave Room
    leave(room, id) {
        console.log('Leave Room Started', id);
        for (var i = 0; i < this.tables.length; i++) {
            // console.log('TABLE FOUND - ',this.tables,id);
            if (this.tables[i].room == room) {
                console.log('TABLE FOUND - ',this.tables[i],id);
                for (var pl = 0; pl < this.tables[i].users.length; pl++) {
                    if (this.tables[i].users[pl].id.toString() == id.toString()) {
                        console.log('USER FOUND');
                        if (this.tables[i].turn_start_at == 0) {
                            this.tables[i].users[pl] = {
                                id: '',
                                numeric_id: '',
                                name: '',
                                profile_pic: '',
                                position: pl,
                                is_active: false,
                                is_done: false,
                                is_left: false,
                                rank: 0,
                                life: 0,
                                dices_rolled: [],
                                bonus_dice: 0,
                                six_counts: 0,
                                tokens: [0, 0, 0, 0],
                            };

                            var count = 0;
                            for (var k = 0; k < 4; k++) {
                                if (this.tables[i].users[k] && this.tables[i].users[k].is_active) {
                                    count++;
                                }
                            }
                            // console.log('Count-->', count);

                            if (count == 0) {
                                this.tables.splice(i, 1);
                            }

                            return {
                                res: false,
                                flag: 1,
                                remove: count == 0,
                            };
                        }
                        this.tables[i].users[pl].life = 0;
                        if (!this.tables[i].users[pl].is_done) {
                            this.tables[i].users[pl].is_left = true;
                            this.tables[i].users[pl].is_done = true;

                            let rank = this.tables[i].no_of_players;

                            while (this.isRankOccupied(room, rank)) {
                                rank--;
                                if (rank == 1) break;
                            }

                            this.tables[i].users[pl].rank = rank;

                            this.tables[i].players_done += 1;
                            return {
                                res: true,
                                position: pl,
                                rank: rank,
                            };
                        } else {
                            this.tables[i].users[pl].is_left = true;
                            return {
                                res: true,
                                position: pl,
                                rank: this.tables[i].users[pl].rank,
                            };
                        }
                    } else {
                        // console.log(this.tables[i].users[pl].id + ' != ' + id);
                    }
                }
                return {
                    res: false,
                };
            }
        }
        return {
            res: false,
        };
    }

    leaveIf(room, id) {
        // console.log('Leave Room Started', id);
        for (var i = 0; i < this.tables.length; i++) {
            if (this.tables[i].room == room) {
                // console.log('TABLE FOUND');
                for (var pl = 0; pl < this.tables[i].users.length; pl++) {
                    if (this.tables[i].users[pl].id == id) {
                        // console.log('USER FOUND');
                        if (this.tables[i].turn_start_at == 0) {
                            this.tables[i].users[pl] = {
                                id: '',
                                numeric_id: '',
                                name: '',
                                profile_pic: '',
                                position: pl,
                                is_active: false,
                                is_done: false,
                                is_left: false,
                                rank: 0,
                                life: 0,
                                dices_rolled: [],
                                bonus_dice: 0,
                                six_counts: 0,
                                tokens: [0, 0, 0, 0],
                            };

                            return {
                                res: false,
                                flag: 1,
                            };
                        }
                       
                    } 
                }
                return {
                    res: false,
                };
            }
        }
        return {
            res: false,
        };
    }
    //Start Game
    async tournamentStartGame(room) {
        for (var i = 0; i < this.tables.length; i++) {
            if (this.tables[i].room === room) {
                var canStart = await this.canStartGame(i);
                if (!canStart) return false;
                var dt = new Date();
                dt.setSeconds( dt.getSeconds() + 4);
                for (let pl = 0; pl < this.tables[i].users.length; pl++) {
                    if (this.tables[i].users[pl].is_active) {
                        this.tables[i].current_turn = pl;
                        this.tables[i].current_turn_type = 'roll';
                        this.tables[i].turn_start_at = new Date(dt).getTime(); //new Date().getTime();
                        console.log("Line 471 turn set : ", new Date(dt).getTime(),new Date(dt))
                        this.tables[i].game_started_at = new Date(dt).getTime();//new Date().getTime();
                        let DICE_ROLLED = this.rollDice();
                        this.tables[i].users[pl].turn = 1;

                        if(this.tables[i].users[pl].dices_rolled.length == 0)
                            this.tables[i].users[pl].dices_rolled.push(DICE_ROLLED);

                        var resObj = {
                            status: 1,
                            message: 'Done',
                            room: this.tables[i].room,
                            table: this.tables[i],
                            dice: DICE_ROLLED,
                            turn_start_at: config.turnTimer,
                            possition: pl,
                        };
                        this.sedAndResetGamePlayData(room);
                        return resObj;
                    }
                }
            
            }
        }

        return false;
    }

    //Abort Game
    async abortGame(room) {
        for (var i = 0; i < this.tables.length; i++) {
            if (this.tables[i].room == room) {
                this.tables.splice(i, 1);
                console.log('SPLICED', this.tables);
            }
        }

        return true;
    }

    //Can Start Game?
    async canStartGame(i) {
        var players = 0;
        for (let pl = 0; pl < this.tables[i].users.length; pl++) {
            if (this.tables[i].users[pl].is_active) players++;
        }

        if (players == this.tables[i].no_of_players) return true;
        else return false;
    }

    diceRolled(room, pos, DICE_ROLLED) {
        var index = this.tables.findIndex((x)=>x.room == room);
        if (index >= 0) {
            console.log("diceRolled - ",this.tables[index].users[pos].dices_rolled.length, this.tables[index].users[pos].dices_rolled)
            if(this.tables[index].users[pos].dices_rolled.length > 0)
                this.tables[index].users[pos].dices_rolled = [];
            this.tables[index].users[pos].dices_rolled.push(DICE_ROLLED);
            console.log('DICE ROLL UPDATED', this.tables[index].users[pos].dices_rolled);
        }
    }

    getBonus(room, id) {
        const table = this.tables.find((elem) => elem.room == room);

        if (!table) return 0;

        const me = table.users.find((elem) => elem.id == id);

        if (!me) return 0;
        else return me.bonus_dice;
    }

    useBonus(room, id) {
        for (let i = 0; i < this.tables.length; i++) {
            if (this.tables[i].room == room) {
                for (let j = 0; j < this.tables[i].users.length; j++) {
                    if (this.tables[i].users[j].id == id) {
                        if (this.tables[i].users[j].bonus_dice > 0) this.tables[i].users[j].bonus_dice--;
                    }
                }
            }
        }
    }

    addBonus(room, id, length,type) {
        for (let i = 0; i < this.tables.length; i++) {
            if (this.tables[i].room == room) {
                for (let j = 0; j < this.tables[i].users.length; j++) {
                    if (this.tables[i].users[j].id == id) {
                        this.tables[i].users[j].bonus_dice += length;
                        console.log('Bonus updated', this.tables[i].users[j].bonus_dice);
                        var gamePlayDataIndex = this.gamePlayData.findIndex((x)=>x.room == room);
                        this.gamePlayData[gamePlayDataIndex].data.extra_roll = 1
                        this.gamePlayData[gamePlayDataIndex].data.extra_roll_count += 1
                        this.gamePlayData[gamePlayDataIndex].data.extra_roll_reason.push(type)
                    }
                }
            }
        }        
    }
    addBonusPoints(room, id, points, length, type) {
        let bonusPoint = points * length;
        for (let i = 0; i < this.tables.length; i++) {
            if (this.tables[i].room == room) {
                for (let j = 0; j < this.tables[i].users.length; j++) {
                    if (this.tables[i].users[j].id == id) {
                        console.log('Before Bonus Points updated- ', this.tables[i].users[j].bonusPoints);
                        this.tables[i].users[j].bonusPoints += bonusPoint;
                        console.log('After Bonus Points updated- ', this.tables[i].users[j].bonusPoints);
                    }
                }
            }
        }
        var gamePlayDataIndex = this.gamePlayData.findIndex((x) => x.room == room);
        this.gamePlayData[gamePlayDataIndex].data[type] = bonusPoint;
        if(type == 'home_base_bonus'){
            this.gamePlayData[gamePlayDataIndex].data.home_base = 1;
            this.gamePlayData[gamePlayDataIndex].data.home_base = 1;
        }
    }
    addSix(room, id) {
        for (let i = 0; i < this.tables.length; i++) {
            // console.log("id we got", id)
            if (this.tables[i].room == room) {
                // console.log("room we got", room)
                for (let j = 0; j < this.tables[i].users.length; j++) {
                    // console.log("id we got", this.tables[i].users[j])
                    if (this.tables[i].users[j].id == id) {
                        this.tables[i].users[j].six_counts += 1;
                        console.log('Six updated', this.tables[i].users[j].six_counts);
                    }
                }
            }
        }
    }

    setSix(room, id) {
        for (let i = 0; i < this.tables.length; i++) {
            // console.log("id we got", id)
            if (this.tables[i].room == room) {
                // console.log("room we got", room)
                for (let j = 0; j < this.tables[i].users.length; j++) {
                    // console.log("id we got", this.tables[i].users[j].id,this.tables[i].users[j].six_counts)
                    if (this.tables[i].users[j].id == id) {
                        this.tables[i].users[j].six_counts = 0;
                        console.log('Six updated', this.tables[i].users[j].six_counts);
                    }
                }
            }
        }
    }

    getSix(room, id) {
        console.log("in six counts....");
        const table = this.tables.find((elem) => elem.room == room);

        if (!table) return 0;
        const me = table.users.find((elem) => elem.id == id);

        console.log("counts of six", me.six_counts, me);
        if (!me) return 0;
        else return me.six_counts;
    }



    scrapTurn(room, pos) {
        for (let i = 0; i < this.tables.length; i++) {
            if (this.tables[i].room == room) {
                this.tables[i].users[pos].dices_rolled = [];
            }
        }
    }

    getMyPosition(room, id) {
        const table = this.tables.find((elem) => elem.room == room);
 
        if (!table) return -1;

        const me = table.users.find((elem) => elem.id == id);
 
        return me ? table.users.indexOf(me) : -1;
    }

    getMyDice(room, id) {
        const table = this.tables.find((elem) => elem.room == room);
        // console.log("table finding time in getMyDice ", ((new Date()) - startDate));

        if (!table) return -1;

        const me = table.users.find((elem) => elem.id == id);
        let i = this.gamePlayData.findIndex((x)=>x.room == room);
        this.gamePlayData[i].data.roll.push(me ? me.dices_rolled[me.dices_rolled.length - 1] : -1);

        return me ? me.dices_rolled[me.dices_rolled.length - 1] : -1;
    }

    jackPot(room, id) {
        const table = this.tables.find((elem) => elem.room == room);

        if (!table) return false;

        const me = table.users.find((elem) => elem.id == id);

        if (!me) return false;
        return (
            me.dices_rolled.length == 3 && me.dices_rolled[0] == 6 && me.dices_rolled[1] == 6 && me.dices_rolled[2] == 6
        );
    }

    updateCurrentTurn(room, pos, type, prev, move) {
        for (let i = 0; i < this.tables.length; i++) {
            if (this.tables[i].room == room) {
                if (prev != -1) {
                    this.tables[i].users[prev].dices_rolled = [];
                    this.tables[i].users[pos].turn += 1;                    
                }
                if(move){
                    this.tables[i].current_turn_type = type; 
                    this.tables[i].current_turn = pos;
                }
                else{
                    this.tables[i].current_turn = pos;
                    this.tables[i].turn_start_at = new Date().getTime();
                    console.log("Line 701 turn set : ", new Date().getTime(),new Date())

                    this.tables[i].current_turn_type = type;
                }
                // console.log("updateCurrentTurn >>>>",move,this.tables[i])
            }
        }
        
    }
    updateCurrentTime(room) {
        for (let i = 0; i < this.tables.length; i++) {
            if (this.tables[i].room == room) {
                this.tables[i].turn_start_at = new Date().getTime();
                console.log("Line 714 turn set : ", new Date().getTime(),new Date())

                // console.log("updateCurrentTurn >>>>",this.tables[i].turn_start_at)
            }
        }
        
    }


    gePlayerDices(room, pos) {
        var index = this.tables.findIndex((x)=>x.room == room);
        if (index >= 0) {
            console.log("gePlayerDices - ",this.tables[index].users[pos])
            
            let i = this.gamePlayData.findIndex((x)=>x.room == room);
            console.log(this.gamePlayData[i], this.tables[index].users[pos].dices_rolled)
            this.gamePlayData[i].data.User =  this.tables[index].users[pos].numeric_id

            return this.tables[index].users[pos].dices_rolled;
        }
        
        return [];
    }
    async sedAndResetGamePlayData(room){
        // console.log("IN sedAndResetGamePlayData - ")
        let i = this.gamePlayData.findIndex((x)=>x.room == room);
        console.log(" this.gamePlayData  -- ", this.gamePlayData[i])
        const sqsData = await sendMessage(this.gamePlayData[i])
        // console.log("sqsData Data >>",sqsData)
        //send through SQS
        this.resetGamePlayData(i, room)
    }
    
    resetGamePlayData(i, room){
        var index = this.tables.findIndex((x)=>x.room == room);
        if (index >= 0) {
            let user = this.tables[index].users[this.tables[index].current_turn];
            console.log("Table >>",this.tables[index] )
            this.gamePlayData[i].data.User = user.numeric_id,
            this.gamePlayData[i].data.turn =  user.turn ,
            this.gamePlayData[i].data.roll = [] ,
            this.gamePlayData[i].data.pawn = 0 , 
            this.gamePlayData[i].data.move = 0 ,
            this.gamePlayData[i].data.total_move = 0 ,
            this.gamePlayData[i].data.cut = 0,
            this.gamePlayData[i].data.cut_player = 0 ,
            this.gamePlayData[i].data.cut_pawn = 0, 
            this.gamePlayData[i].data.cut_move = 0,
            this.gamePlayData[i].data.cut_bonus =0 ,
            this.gamePlayData[i].data.home_base = 0,
            this.gamePlayData[i].data.home_base_bonus =0 ,
            this.gamePlayData[i].data.extra_roll = 0 ,
            this.gamePlayData[i].data.extra_roll_count = 0,
            this.gamePlayData[i].data.extra_roll_reason = [],
            this.gamePlayData[i].data.checkpoint = 0,
            this.gamePlayData[i].data.player_score = user.points + user.bonusPoints ,
            this.gamePlayData[i].data.life_lost = 3 - user.life , 
            this.gamePlayData[i].data.lives_left = user.life ,
            this.gamePlayData[i].data.pawn_positions = user.tokens,
            this.gamePlayData[i].data.game_time = 0 ,
            this.gamePlayData[i].data.room_id = room, 
            this.gamePlayData[i].data.timestamp = new Date().getTime()  
            // console.log("this.gamePlayData[i] - ",this.gamePlayData[i])
        } 
    }
    clearDices(room, pos) {
        console.log("in the clear divces");
        for (let i = 0; i < this.tables.length; i++) {
            if (this.tables[i].room == room) {
                this.tables[i].users[pos].dices_rolled = [];
            }
        }
    }

    getNextPosition(room, pos) {
        for (let i = 0; i < this.tables.length; i++) {
            if (this.tables[i].room == room) {
                for (let j = pos + 1; j < this.tables[i].users.length; j++) {
                    if (this.tables[i].users[j].is_active && !this.tables[i].users[j].is_done) {
                        return j;
                    }
                }
                for (let j = 0; j < pos; j++) {
                    if (this.tables[i].users[j].is_active && !this.tables[i].users[j].is_done) {
                        return j;
                    }
                }
            }
        }
        return -1;
    }

    tourneyCanIKill(room, id, token_index, myPos) {
        var tab_pos = 0;
        for (let i = 0; i < this.tables.length; i++) {
            if (this.tables[i].room == room) {
                tab_pos = i;
            }
        }

        const actual_token_position = config.MOVE_PATH[myPos][this.tables[tab_pos].users[myPos].tokens[token_index]];
        console.log(
            'MAIN USER',
            myPos,
            'TOKEN',
            actual_token_position, // according to table calculated index
            'POSITION',
            this.tables[tab_pos].users[myPos].tokens[token_index] // acual index
        );
        if (actual_token_position == -1) return false;
        if (config.safeZone.includes(actual_token_position)) return false; //MAIN USER 2 TOKEN 38 POSITION 11

        var dead_possible = [];
        var i = tab_pos;
        for (let j = 0; j < this.tables[i].users.length; j++) {
            if (this.tables[i].users[j].id != id) {
                for (let k = 0; k < this.tables[i].users[j].tokens.length; k++) {
                    if (this.tables[i].users[j].tokens[k] != -1 && !this.tables[i].users[j].is_left) {
                        let other_token_position = config.MOVE_PATH[j][this.tables[i].users[j].tokens[k]];
                        console.log(
                            'KILLER',
                            'USER',
                            j,
                            'TOKEN',
                            this.tables[i].users[j].tokens[k],
                            'POSITION',
                            other_token_position,
                            'safeZone',
                            this.tables[i].users[j].tokens[k], 
                            this.tables[i].users[j].tokens[k] != config.starPosition[0]

                        );
                        if (other_token_position == actual_token_position && this.tables[i].users[j].tokens[k] != config.starPosition[0]) {
                            dead_possible.push({
                                user: j,
                                token: k,
                            });
                        }
                    }
                }
            }
        }

        console.log('DEAD POSSIBLE', dead_possible);
        
        var us = [];
        let safe_user = []
        
        for(let i=0; i<dead_possible.length; i++) {
            console.log("dead_possible.length : ",dead_possible.length)
            console.log("us : ",us, i)
            console.log("dead_possible[i].user : ",dead_possible[i].user)
            if (us.indexOf(dead_possible[i].user) > -1) {
                // dead_possible = dead_possible.filter((e) => e.user != dead_possible[i].user);
                safe_user.push(dead_possible[i].user)
                console.log("dead_possible : ",dead_possible , "safe_user >>",safe_user)
                // i = 0;
                // continue; 
            } else {
                console.log("else dead_possible[i].user : ",dead_possible[i].user)
                us.push(dead_possible[i].user);
            }
            // i++;
        }

        for(let i=0; i<safe_user.length; i++) {
            for(let j=0; j<dead_possible.length; j++){
                console.log("safe_user[i] >>>>", i , safe_user[i], "dead_possible[j].user >>>>", j, dead_possible[j].user)
                dead_possible = dead_possible.filter((e) => safe_user[i] != e.user);
            }
        } 

        console.log('After loop DEAD POSSIBLE Tourney' , dead_possible);
        if(dead_possible.length){
            var gamePlayDataIndex = this.gamePlayData.findIndex((x)=>x.room == room);
            this.gamePlayData[gamePlayDataIndex].data.cut = 1;
        } 

        for (i = 0; i < dead_possible.length; i++) {
            let checkPointActivated = false;
            let token_position = this.tables[tab_pos].users[dead_possible[i].user].tokens[dead_possible[i].token];
            console.log("Token Poisition - ",token_position)
            if(token_position >= config.starPosition[0])  checkPointActivated = true;
            console.log("My Points >>> ",this.tables[tab_pos].users[myPos].points,this.tables[tab_pos].users[dead_possible[i].user],checkPointActivated)
            // this.tables[tab_pos].users[dead_possible[i].user].points = this.tables[tab_pos].users[dead_possible[i].user].points - this.tables[tab_pos].users[dead_possible[i].user].tokens[dead_possible[i].token];
            dead_possible[i].checkPointActivated = checkPointActivated;
            this.gamePlayData[gamePlayDataIndex].data["cut_player "+i] = dead_possible[i].user;
            this.gamePlayData[gamePlayDataIndex].data["cut_pawn "+i]  = dead_possible[i].token;
            // console.log("this.gamePlayData[gamePlayDataIndex].data >",this.gamePlayData[gamePlayDataIndex].data)
            if(checkPointActivated){
                
                let cutPoint = this.tables[tab_pos].users[dead_possible[i].user].tokens[dead_possible[i].token];
                this.tables[tab_pos].users[dead_possible[i].user].tokens[dead_possible[i].token] = config.starPosition[0];
                dead_possible[i].tokenIndex = config.starPosition[0];
                dead_possible[i].movebleBox = cutPoint - config.starPosition[0];
                console.log("KILL TOKEN INDEX UPDATE _ ",this.tables[tab_pos].users[dead_possible[i].user].points,cutPoint, typeof cutPoint)
                this.tables[tab_pos].users[dead_possible[i].user].points = this.tables[tab_pos].users[dead_possible[i].user].points - cutPoint + config.starPosition[0];
                console.log("AFTER KILL TOKEN INDEX UPDATE _",this.tables[tab_pos].users[dead_possible[i].user].tokens[dead_possible[i].token],this.tables[tab_pos].users[dead_possible[i].user].points )
                this.gamePlayData[gamePlayDataIndex].data["cut_move "+i] = cutPoint + " - " + config.starPosition[0];
            }
            else{ 
                dead_possible[i].movebleBox = this.tables[tab_pos].users[dead_possible[i].user].tokens[dead_possible[i].token];
                this.tables[tab_pos].users[dead_possible[i].user].points -= this.tables[tab_pos].users[dead_possible[i].user].tokens[dead_possible[i].token]; //commented above line and replace with this line
                this.tables[tab_pos].users[dead_possible[i].user].tokens[dead_possible[i].token] = 0;
                dead_possible[i].tokenIndex = 0;
                this.gamePlayData[gamePlayDataIndex].data["cut_move "+i] = dead_possible[i].movebleBox + " - 0"
                
            }
            console.log("My Points >>> ",this.tables[tab_pos].users[myPos].points,this.tables[tab_pos].users[dead_possible[i].user].points,this.tables[tab_pos].users[dead_possible[i].user].tokens)
        }
        console.log("dead_possible >new>>>",dead_possible)
        return dead_possible.length > 0 ? dead_possible : false;
    }

    isMovePossible(room, id) {

        const table = this.tables.find((elem) => elem.room == room);

        if (!table) return false;

        const me = table.users.find((elem) => elem.id == id);

        if (!me) return false;

        for (let k = 0; k < me.tokens.length; k++) {
            for (const dice_value of me.dices_rolled) {
                if (me.tokens[k] != 56 && me.tokens[k] + dice_value <= 56) {
                    return true;
                }
            }
        }

        return false;
    }

    isMovePossibleExact(dice_value, room, id, token_index) {
        const table = this.tables.find((elem) => elem.room == room);
        // console.log("table finding time in isMovePossibleExact", ((new Date()) - startDate));

        if (!table) return false;
        const me = table.users.find((elem) => elem.id == id);
        // console.log("table finding time in isMovePossibleExact ", ((new Date()) - startDate));

        if (!me) return false;

        if (me.dices_rolled.indexOf(dice_value) == -1) return false;

        for (let k = 0; k < me.tokens.length; k++) {
            if (me.tokens[token_index] == -1) {
                return dice_value == 1 || dice_value == 6;
            } else {
                return !(me.tokens[token_index] + dice_value > 56);
            }
        }
    }

    setGameTime(room, time) {
        console.log("setGameTime : ",room, time)
        if(time < 0) time = 0;
        let gameTime = config.gameTime * 60 - time;
        let minutes = Math.floor(gameTime / 60);
        let seconds = gameTime - minutes * 60;
        var gamePlayDataIndex = this.gamePlayData.findIndex((x)=>x.room == room);
        console.log("GAMETIME :", minutes + ":" + seconds)
        this.gamePlayData[gamePlayDataIndex].data.game_time = minutes + ":" + seconds;
        return true;
    }

    makeMoveForTournament(dice_value, room, id, token_index) {
        for (let i = 0; i < this.tables.length; i++) {
            if (this.tables[i].room == room) {
                for (let j = 0; j < this.tables[i].users.length; j++) {
                    if (this.tables[i].users[j].id == id) {
                        console.log('PENDING DICES BEFORE', this.tables[i].users[j].dices_rolled,this.tables[i].users[j].points,dice_value);

                        if (this.tables[i].users[j].tokens[token_index] + dice_value <= 56) {
                            this.tables[i].users[j].tokens[token_index] += dice_value;
                            //Update points for tournament
                            this.tables[i].users[j].points =  this.tables[i].users[j].points+ dice_value;
                            
                            this.tables[i].users[j].dices_rolled.splice(
                                this.tables[i].users[j].dices_rolled.indexOf(dice_value),
                                1
                            );
                            console.log('PENDING DICES AFTER', this.tables[i].users[j].dices_rolled,this.tables[i].users[j].points);
                            var gamePlayDataIndex = this.gamePlayData.findIndex((x)=>x.room == room);
                            this.gamePlayData[gamePlayDataIndex].data.pawn = token_index + 1
                            this.gamePlayData[gamePlayDataIndex].data.move = dice_value
                            this.gamePlayData[gamePlayDataIndex].data.points = dice_value
                            this.gamePlayData[gamePlayDataIndex].data.total_move += dice_value
                            this.gamePlayData[gamePlayDataIndex].data.player_score = this.tables[i].users[j].points + this.tables[i].users[j].bonusPoint
                            this.gamePlayData[gamePlayDataIndex].data.pawn_positions = this.tables[i].users[j].tokens
                            // console.log("GAME PLAY DATA > ", this.gamePlayData[gamePlayDataIndex])
                            return {token_position:this.tables[i].users[j].tokens[token_index],points:this.tables[i].users[j].points,bonusPoints: this.tables[i].users[j].bonusPoints };
                        } else {
                            this.tables[i].users[j].dices_rolled.splice(
                                this.tables[i].users[j].dices_rolled.indexOf(dice_value),
                                1
                            );
                            console.log('PENDING DICES AFTER', this.tables[i].users[j].dices_rolled,this.tables[i].users[j].points);
                            return {token_position:this.tables[i].users[j].tokens[token_index],points:this.tables[i].users[j].points,bonusPoints: this.tables[i].users[j].bonusPoints};
                        }
                    }
                }
            }
        }
        return -1;
    }
    EndOfTournament(room,amount) {
        console.log("room,amount >>",room,amount[1])
        for (let i = 0; i < this.tables.length; i++) {
            let pointArray = [];
            let winner = []
            if (this.tables[i].room == room) {
                for (let j = 0; j < this.tables[i].users.length; j++) {
                    pointArray.push(this.tables[i].users[j].points + this.tables[i].users[j].bonusPoints );
                }
                console.log("pointArray >>>",pointArray)
                var maxPoints = (Math.max(...pointArray));
                console.log("maxPoints >>>",maxPoints)
                var count = 0;
                let point = pointArray;
                point.sort((a, b) => b-a);
                let otherRank;
                this.tables[i].users.forEach(function(user) {  
                    console.log("Points ....",user.points , user.bonusPoints,maxPoints ,point)
                    if(user.points + user.bonusPoints == maxPoints){
                        count ++,
                        otherRank = 1
                    }
                    // else{
                    //     for(let j=1; j<=point.length; j++){
                    //         if(point[j] == user.points + user.bonusPoints) otherRank = j;
                    //     }
                    // }                     
                });
                // if(count > 1) amount = amount/count; //tie case
               
                for (let k = 0; k < this.tables[i].users.length; k++) {
                    for(let j=0 ; j< point.length; j++){
                        console.log("HERE - ",point[j], this.tables[i].users[k].points + this.tables[i].users[k].bonusPoints)
                        if(point[j] == this.tables[i].users[k].points + this.tables[i].users[k].bonusPoints) 
                        {
                            otherRank = j+1;
                            break;
                        };
                    }
                    let winAmount = 0; 
                    if(typeof amount != 'undefined' && otherRank == 1 && amount[1]) {
                        winAmount =  otherRank == 1 ? amount[1] : 0;
                    }else if(typeof amount != 'undefined' && otherRank == 2 && amount[2]) {
                        winAmount =  otherRank == 2 ? amount[2] : 0;
                    } else if(typeof amount != 'undefined' && otherRank == 3 && amount[3]) {
                        winAmount =  otherRank == 3 ? amount[3] : 0;
                    }
                    console.log("User's final rank ::::",  otherRank)
                    if(this.tables[i].users[k].points + this.tables[i].users[k].bonusPoints  == maxPoints){
                        this.tables[i].players_won += 1;
                        this.tables[i].players_done += 1;
                        this.tables[i].users[k].is_done = true;
                        this.tables[i].users[k].rank = 1;//this.tables[i].players_won;
                        winner.push({
                            player_index: this.tables[i].users[k].position,
                            name: this.tables[i].users[k].name,
                            numeric_id: this.tables[i].users[k].numeric_id,
                            rank: 1,//this.tables[i].users[k].rank,
                            id: this.tables[i].users[k].id,
                            amount: winAmount,
                            score: this.tables[i].users[k].points + this.tables[i].users[k].bonusPoints
                        });                    
                    }else{  
                                            
                        this.tables[i].players_done += 1;
                        this.tables[i].users[k].is_done = true;
                        this.tables[i].users[k].rank = otherRank;
                        winner.push({
                            player_index: this.tables[i].users[k].position,
                            name: this.tables[i].users[k].name,
                            numeric_id: this.tables[i].users[k].numeric_id,
                            rank: otherRank,
                            id: this.tables[i].users[k].id,
                            amount: winAmount,
                            score: this.tables[i].users[k].points + this.tables[i].users[k].bonusPoints
                        });   
                    }
                } 
                this.tables = this.tables.filter((t) => t.room != room);
                console.log("winner >>>",winner,this.tables)
                return winner;          
            }
        }
        return false;
    }
    allHome(room, id) {
        var sum = 0;
        for (let i = 0; i < this.tables.length; i++) {
            if (this.tables[i].room == room) {
                for (let j = 0; j < this.tables[i].users.length; j++) {
                    if (this.tables[i].users[j].id == id) {
                        // console.log('Tokens:', this.tables[i].users[j].tokens);
                        for (var z = 0; z < 4; z++) {
                            sum = sum + this.tables[i].users[j].tokens[z];
                        }

                        if (sum == 224) {
                            this.tables[i].players_won += 1;
                            this.tables[i].players_done += 1;
                            this.tables[i].users[j].is_done = true;
                            this.tables[i].users[j].rank = this.tables[i].players_won;
                            return {
                                rank: this.tables[i].players_won,
                                position: this.tables[i].users[j].position,
                            };
                        }
                        return false;
                    }
                }
            }
        }
        return false;
    }
    calculateUserRank(i, userData) {
        let pointArray = []
        for (let j = 0; j < this.tables[i].users.length; j++) {
            pointArray.push(this.tables[i].users[j].points + this.tables[i].users[j].bonusPoints );
        }
        console.log("calculateUserRank pointArray >>>",pointArray)
        var maxPoints = (Math.max(...pointArray));
        console.log("calculateUserRank maxPoints >>>",maxPoints)
        let point = pointArray;
        point.sort((a, b) => b-a);
       
        for (let k = 0; k < this.tables[i].users.length; k++) {
            for(let j=0 ; j< point.length; j++){
                console.log("calculateUserRank HERE - ",point[j], this.tables[i].users[k].points + this.tables[i].users[k].bonusPoints)
                if(point[j] == this.tables[i].users[k].points + this.tables[i].users[k].bonusPoints && userData.id == this.tables[i].users[k].id) 
                {
                    this.tables[i].users[k].rank = j+1;
                    break;
                };
            }
        }
    }
    isThisTheEnd(room,win_amount) {
        console.log("isThisTheEnd>> ",room,win_amount)
        var rank = [];
        for (let i = 0; i < this.tables.length; i++) {
            if (this.tables[i].room == room) {
                for (let j = 0; j < this.tables[i].users.length; j++) {
                    let amount = 0 ;
                    if(this.tables[i].users[j].rank == 0 && this.tables[i].users[j].numeric_id != '') this.calculateUserRank(i, this.tables[i].users[j])
                    if(typeof win_amount != 'undefined' && this.tables[i].users[j].rank == 1 && win_amount[1]) {
                        amount =  this.tables[i].users[j].rank == 1 ? win_amount[1] : 0;
                    }else if(typeof win_amount != 'undefined' && this.tables[i].users[j].rank == 2 && win_amount[2]) {
                        amount =  this.tables[i].users[j].rank == 2 ? win_amount[2] : 0;
                    } else if(typeof win_amount != 'undefined' && this.tables[i].users[j].rank == 3 && win_amount[3]) {
                        amount =  this.tables[i].users[j].rank == 3 ? win_amount[3] : 0;
                    }
                    console.log("for score >>>>",this.tables[i].users[j])
                    rank.push({
                        player_index: this.tables[i].users[j].position,
                        name: this.tables[i].users[j].name,
                        numeric_id: this.tables[i].users[j].numeric_id,
                        rank: this.tables[i].users[j].rank,
                        amount: amount,
                        id: this.tables[i].users[j].id,
                        score:this.tables[i].users[j].points + this.tables[i].users[j].bonusPoints
                    });
                }
 
                if (this.tables[i].no_of_players == 2 || this.tables[i].no_of_players == 3) {
                    if (this.tables[i].players_won == 1) {
                        this.tables = this.tables.filter((t) => t.room != room);
                        console.log('After Splice::',room);
                        console.log('End rank::', rank);
                        console.log('Tables::',this.tables);
                        return rank;
                    } else return false;
                }
                else if (this.tables[i].no_of_players == 4) {
                    if (this.tables[i].players_won == 2) {
                        this.tables = this.tables.filter((t) => t.room != room);
                        console.log("this.tables  >>0>",this.tables ,rank)
                        return rank;
                    } else if (this.tables[i].players_done >= 3 && this.tables[i].players_won == 1) {
                        for (let j = 0; j < this.tables[i].users.length; j++) {
                            if (this.tables[i].users[j].is_active && !this.tables[i].users[j].is_done) {
                                this.tables[i].players_won += 1;
                                this.tables[i].players_done += 1;
                                this.tables[i].users[j].is_done = true;
                                this.tables[i].users[j].rank = this.tables[i].players_won;
                                
                            }
                        }

                        rank = [];
                        for (let j = 0; j < this.tables[i].users.length; j++) {
                            // let amount = 0 ;
                            // if(typeof win_amount != 'undefined') amount =  this.tables[i].users[j].rank == 1 ? win_amount : 0;
                            let amount = 0 ;
                            if(typeof win_amount != 'undefined' && this.tables[i].users[j].rank == 1 && win_amount[1]) {
                                amount =  this.tables[i].users[j].rank == 1 ? win_amount[1] : 0;
                            }else if(typeof win_amount != 'undefined' && this.tables[i].users[j].rank == 2 && win_amount[2]) {
                                amount =  this.tables[i].users[j].rank == 2 ? win_amount[2] : 0;
                            } else if(typeof win_amount != 'undefined' && this.tables[i].users[j].rank == 3 && win_amount[3]) {
                                amount =  this.tables[i].users[j].rank == 3 ? win_amount[3] : 0;
                            }
                            rank.push({
                                player_index: this.tables[i].users[j].position,
                                name: this.tables[i].users[j].name,
                                numeric_id: this.tables[i].users[j].numeric_id,
                                rank: this.tables[i].users[j].rank,
                                amount: amount,
                                id: this.tables[i].users[j].id,
                                score:this.tables[i].users[j].points + this.tables[i].users[j].bonusPoints
                            });
                        }
                        this.tables = this.tables.filter((t) => t.room != room);
                        console.log("this.tables  >1>>",this.tables,rank )
                        return rank;
                    } else return false;
                }
            }
        }
        return false;
    }

    checkOnlyPlayerLeft(room) {
        // console.log('CHECKING PLAYERS LEFT');
        for (let i = 0; i < this.tables.length; i++) {
            if (this.tables[i].room == room) {
                console.log("checkOnlyPlayerLeft : Step 1: ")
                if (this.tables[i].no_of_players - this.tables[i].players_done == 1) {
                    console.log("checkOnlyPlayerLeft : Step 2: ")
                    for (let j = 0; j < this.tables[i].users.length; j++) {
                        // console.log('USER', this.tables[i].users[j]);
                        console.log("checkOnlyPlayerLeft : Step 3: ", this.tables[i].users[j].is_active ,!this.tables[i].users[j].is_done ,!this.tables[i].users[j].is_left)
                        if (
                            this.tables[i].users[j].is_active &&
                            !this.tables[i].users[j].is_done &&
                            !this.tables[i].users[j].is_left
                        ) {
                            this.tables[i].players_won += 1;
                            this.tables[i].players_done += 1;
                            this.tables[i].users[j].is_done = true;
                            this.tables[i].users[j].rank = this.tables[i].players_won;
                            return true;
                        }
                        console.log('table found', this.tables);
                    }
                    return true;
                }
            }
        }
        return false;
    }

    isCurrentTurnMine(room, position) {
        const table = this.tables.find((elem) => elem.room == room);

        if (!table) return false;

        return table.current_turn == position;
    }

    getMyLife(room, id) {
        const table = this.tables.find((elem) => elem.room == room);

        if (!table) return 0;

        const me = table.users.find((elem) => elem.id == id);

        if (!me) return 0;
        return me.life;
    }

    deductLife(room, id) {
        for (let i = 0; i < this.tables.length; i++) {
            if (this.tables[i].room == room) {
                for (let j = 0; j < this.tables[i].users.length; j++) {
                    if (this.tables[i].users[j].id == id) {
                        this.tables[i].users[j].life--;
                    }
                }
            }
        }
        var gamePlayDataIndex = this.gamePlayData.findIndex((x)=>x.room == room);
        console.log("this.gamePlayData[gamePlayDataIndex].data.life_lost0 >",this.gamePlayData[gamePlayDataIndex].data.life_lost,this.gamePlayData[gamePlayDataIndex].data.lives_left)
        this.gamePlayData[gamePlayDataIndex].data.life_lost += 1
        this.gamePlayData[gamePlayDataIndex].data.lives_left -= 1
        console.log("this.gamePlayData[gamePlayDataIndex].data.life_lost1 >",this.gamePlayData[gamePlayDataIndex].data.life_lost,this.gamePlayData[gamePlayDataIndex].data.lives_left)

    }

    getMyIdByPosition(room, position) {
        const table = this.tables.find((elem) => elem.room == room);

        if (!table) return 0;
        return table.users[position] ? table.users[position].id : -1;
    }

    getTokens(room) {
        var table = this.tables.find((elem) => elem.room == room);
        if (!table) {
            // console.log("TOKENS NOT FOUND", room, tables.length);
            return [];
        }
        var tokens = table.users.map((user) => {
            return {
                user_id: user.id,
                tokens: user.tokens,
                points:user.points
            };
        });
        // console.log("TOKENS RETURNED", tokens);
        return tokens;
    }
    getPoints(room){
        let table = this.tables.find((elem) => elem.room == room);
        if (!table) {
            // console.log("TOKENS NOT FOUND", room, tables.length);
            return [];
        }
        var points = table.users.map((user) => {
            return {
                user_id: user.id,
                score:user.points + user.bonusPoints ,
                points:user.points,
                bonusPoints:user.bonusPoints
            };
        });
        return points;
    }

    rollDice() {
        // let dices = [6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6];
        // return dices[Math.floor(Math.random() * dices.length)];

        return Math.floor(Math.random() * 6) + 1;
    }

    objectId() {
        const os = require('os');
        const crypto = require('crypto');

        const seconds = Math.floor(new Date() / 1000).toString(16);
        const machineId = crypto.createHash('md5').update(os.hostname()).digest('hex').slice(0, 6);
        const processId = process.pid.toString(16).slice(0, 4).padStart(4, '0');
        const counter = process.hrtime()[1].toString(16).slice(0, 6).padStart(6, '0');

        return seconds + machineId + processId + counter;
    }
    checkPointActive(room, myPos) {
        console.log("checkPointActive -- ")
        let tab_pos = 0;
        let checkPointActivated = false;
        for (let i = 0; i < this.tables.length; i++) {
            if (this.tables[i].room == room) {
                tab_pos = i;
            }
        }
        console.log("checkPointActive 1 - ",tab_pos,myPos)
        for (let k = 0; k < this.tables[tab_pos].users[myPos].tokens.length; k++) {
            console.log("this.tables[tab_pos].users[myPos].tokens[k] - ",this.tables[tab_pos].users[myPos].tokens[k])
            if (this.tables[tab_pos].users[myPos].tokens[k] != -1) {
                
                let token_position = this.tables[tab_pos].users[myPos].tokens[k];
                console.log("token position - ",token_position,config.starPosition[0])
                if(token_position >= config.starPosition[0])  checkPointActivated = true;
                console.log(
                    'checkPointActivated',
                    checkPointActivated,
                    'token_position',
                    token_position,
                );

            }
        }
        var gamePlayDataIndex = this.gamePlayData.findIndex((x)=>x.room == room);
        this.gamePlayData[gamePlayDataIndex].data.checkpoint =  checkPointActivated ? true : false;
        return checkPointActivated;
    }
}

module.exports = {
    _Tables,
};
