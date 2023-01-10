var { User } = require('./../../api/models/user');
var Table = require('./../../api/models/table');
// var { Transaction } = require('./../../api/models/transaction');
var Service = require('./../../api/service');
var config = require('./../../config');
var localization = require('./../../api/service/localization');
const uniqid = require('uniqid');
var logger = require('../../api/service/logger');
var ObjectId = require('mongoose').Types.ObjectId;
var requestTemplate = require('../../api/service/request-template');
var _ = require('lodash');

const { _Tables } = require('../utils/_tables');
var _tab = new _Tables();


module.exports = {
    //Roll dice for tournament
    tournamntDiceRolled: async function (socket, params, id) {
          // INIT
        // console.log('DICE ROLLED', params);
        let isJackpot = false;
        var resObj = { callback: { status: 1, message: localization.success }, events: [] };

        // VALIDATE PARAMS
        if (!params) return { callback: { status: 0, message: localization.missingParamError } };
        if (!params.room) return { callback: { status: 0, message: localization.missingParamError } };

        // CHECK IF I EXIST IN THIS ROOM
        var myPos = await _tab.getMyPosition(params.room, id);
        console.log("position", myPos);
        if (myPos == -1) return { callback: { status: 0, message: localization.noDataFound } };
        let check = _tab.isCurrentTurnMine(params.room, myPos);
        if(!check){
            return { callback: { status: 0, message: localization.noDataFound } };
        }
        // GET DICE RANDOM
        var DICE_ROLLED = await _tab.getMyDice(params.room, id);
        console.log(socket.data_name, ' Rolled ', DICE_ROLLED);
        // console.log('MY DICE FOUND', DICE_ROLLED);

        if (DICE_ROLLED > 6 || DICE_ROLLED < 0) return { callback: { status: 0, message: localization.noDataFound } };

        resObj.callback.dice = DICE_ROLLED;
        let dices_rolled = await _tab.gePlayerDices(params.room, myPos);
        console.log("value got ", dices_rolled);
        let verify = dices_rolled.every((val, i, arr) => val === 6)
        console.log("verify", verify);
        if (verify && dices_rolled.length == 3) { isJackpot = true }
        dices_rolled = await _tab.gePlayerDices(params.room, myPos);
        console.log("value got ", dices_rolled);
        resObj.callback.dices_rolled = dices_rolled;

        // ADD DICEROLLED EVENT 
        let event = {
            type: 'room_excluding_me',
            delay: 0,//1500
            room: params.room,
            name: 'dice_rolled',
            data: {
                position: myPos,
                room: params.room,
                dice_value: DICE_ROLLED,
                dices_rolled: dices_rolled,
            },
        };
        // console.log('EVENT_PUSHED', event);
        resObj.events.push(event);
        var movePossible = await _tab.isMovePossible(params.room, id);
        // IF MOVE POSSIBLE FROM CURRENT DICES & Position

        const jackPOT = await _tab.jackPot(params.room, id);
        let sixCounts = await _tab.getSix(params.room, id);
        console.log("sixCounts : ", sixCounts);
        // IF 3 times 6
        
        if (sixCounts == 2 && dices_rolled[0] == 6) {
            //  SCRAP CURRENT DICES & PASS NEXT DICE_ROLL
            await _tab.scrapTurn(params.room, myPos);
            // DICE_ROLL TO NEXT
            let sixCounts =  await _tab.setSix(params.room, id);
            console.log("set six...0")
            let nextPos = await _tab.getNextPosition(params.room, myPos);
            await _tab.updateCurrentTurn(params.room, nextPos, 'roll', myPos);
            let DICE_ROLLED =  await _tab.rollDice();
            await _tab.diceRolled(params.room, nextPos, DICE_ROLLED);
            let dices_rolled = await _tab.gePlayerDices(params.room, nextPos);
            await _tab.sedAndResetGamePlayData(params.room);

            // SEND EVENT
            
            let event = {
                type: 'room_including_me',
                room: params.room,
                delay: 2000,//2200,
                name: 'make_diceroll',
                data: {
                    room: params.room,
                    position: nextPos,
                    tokens: await _tab.getTokens(params.room),
                    dice: DICE_ROLLED,
                    dices_rolled: dices_rolled,
                    turn_start_at: config.turnTimer,
                    extra_move_animation: false
                },
            };
            await _tab.clearDices(params.room, myPos);
            resObj.events.push(event);
        }
        if (movePossible) {
            console.log('[MOVE POSSIBLE DICE ROLLED]');
            let timer = 500; //1500
            var myPos = await _tab.getMyPosition(params.room, id);
            //  MAKE_MOVE TO ME
            let nextPos = await _tab.getNextPosition(params.room, myPos);        
            
            console.log("movePossible >>> sixcount >>",sixCounts , dices_rolled[0],myPos, dices_rolled)
            if(sixCounts == 2 && dices_rolled[0] == 6) await _tab.updateCurrentTurn(params.room, nextPos, 'roll', myPos);
            else await _tab.updateCurrentTurn(params.room, myPos, 'move', -1,1);
            let dices_roll = await _tab.gePlayerDices(params.room, myPos);    
            let event = {
                type: 'room_including_me',
                room: params.room,
                delay: timer,
                name: 'make_move',
                data: {
                    room: params.room,
                    position: myPos,
                    dices_rolled: dices_roll,
                    turn_start_at: config.turnTimer
                },
            };
            resObj.events.push(event);
        }
        // ELSE
        if (!movePossible && !jackPOT) {
            console.log('[MOVE IMPOSSIBLE DICE ROLLED]');
            if (DICE_ROLLED != 6) {
                console.log('[DICE ROLLED NOT SIX]');
                //  SCRAP CURRENT DICES & PASS NEXT DICE_ROLL
                await _tab.scrapTurn(params.room, myPos);
                // DICE_ROLL TO NEXT
                let timer = 1500;
                let nextPos = await _tab.getNextPosition(params.room, myPos);
                await _tab.updateCurrentTurn(params.room, nextPos, 'roll', myPos);
                let dices_rolled = await _tab.gePlayerDices(params.room, nextPos);
                let DICE_ROLLED = await _tab.rollDice();
                await _tab.diceRolled(params.room, nextPos, DICE_ROLLED);
                await _tab.sedAndResetGamePlayData(params.room);
                let event = {
                    type: 'room_including_me',
                    room: params.room,
                    delay: timer,
                    name: 'make_diceroll',
                    data: {
                        room: params.room,
                        position: nextPos,
                        tokens: _tab.getTokens(params.room),
                        dice: DICE_ROLLED,
                        dices_rolled: dices_rolled,
                        turn_start_at: config.turnTimer,
                        extra_move_animation:false
                    },
                };
                resObj.events.push(event);
            } else {
                console.log('[DICE ROLLED SIX]');
                // await _tab.addBonus(params.room, id, 1);
                // Send 'roll' to same player
                let DICE_ROLLED = await _tab.rollDice();
                var myPos = await _tab.getMyPosition(params.room, id);
                // console.log('[DICE ROLLED SIX]', DICE_ROLLED, myPos);
                await _tab.diceRolled(params.room, myPos, DICE_ROLLED);

                await _tab.updateCurrentTurn(params.room, myPos, 'roll', -1);
                let dices_rolled = await _tab.gePlayerDices(params.room, myPos);
                // console.log('[DICE ROLLED SIX]', dices_rolled);
                let event = {
                    type: 'room_including_me',
                    room: params.room,
                    delay: 2210,
                    name: 'make_diceroll',
                    data: {
                        room: params.room,
                        position: myPos,
                        tokens: await _tab.getTokens(params.room),
                        dice: DICE_ROLLED,
                        dices_rolled: dices_rolled,
                        turn_start_at: config.turnTimer,
                        extra_move_animation:true
                    },
                };

                resObj.events.push(event);
            }

        }
        let events = {
            type: 'room_including_me',
            room: params.room,
            delay: 1000,
            name: 'score_updated',
            data: {
                room: params.room,
                score_data : _tab.getPoints(params.room),
            },
        };
        resObj.events.push(events);
        return resObj;
    },

    //Move Made
    moveTourney: async function (params, id) {
        // console.log('Move Made', params);
        try {
            // VALIDATION
            if (!params) {
                 return { callback: { status: 0, message: localization.missingParamError } }; 

            } else if (!params.room) {
                return { callback: { status: 0, message: localization.missingParamError } };

            } else if (!params.token_index) {
                return { callback: { status: 0, message: localization.missingParamError } };

            } else if (!params.dice_value) {
                return { callback: { status: 0, message: localization.missingParamError } };

            } else if (parseInt(params.dice_value) > 6) {
                return { callback: { status: 0, message: localization.missingParamError } };
            }                  
            params.token_index = parseInt(params.token_index);
            params.dice_value = parseInt(params.dice_value);

            var resObj = { callback: { status: 1, message: localization.success }, events: [] };

            var myPos = await _tab.getMyPosition(params.room, id);
            if (myPos == -1) return { callback: { status: 0, message: localization.noDataFound } };
            let params_data = {
                room: params.room,
            };
            var checkTabel = await this.istableExists(params_data); // added to solve backword token movement 
            if(checkTabel.current_turn != myPos) {
                console.log("IN moveTourney IF - " ,checkTabel, myPos); //to handle token revert issue - NO1-I44
                return;
            }
            let diceVales = [];
            diceVales.push(params.dice_value)
            // const allEqual = diceVales => diceVales.every(v => v === 6);
            if (params.dice_value == 6) {

                console.log("in the params dice value 0................");
                _tab.addBonus(params.room, id, 1,'six'); //remove this for not giving 2nd turn on 6
                _tab.addSix(params.room, id, 1);
            }

            // Check if move is possible
            var movePossibleExact = _tab.isMovePossibleExact(
                params.dice_value,
                params.room,
                id,
                params.token_index
            );
            console.log('Tournament movePossible >>', movePossibleExact);
            var tableD = await Table.findOne({
                room: params.room,
            });
            const gameStartTime = tableD.game_started_at;
            let timeInsecond = (Math.round(new Date().getTime() / 1000) - Math.round(gameStartTime / 1000)); 
            console.log("timeInsecond > ",timeInsecond)
            const time = _tab.setGameTime(params.room, timeInsecond)
            console.log("after setGametime",time)
            if (!movePossibleExact) {
                console.log('[NOT MOVE IMPOSSIBLE EXACT]');
                if (params.dice_value != 6) {
                    // console.log('[DICE VALUE NOT SIX]');
                    // //  SCRAP CURRENT DICES & PASS NEXT DICE_ROLL
                    // let sixCounts = _tab.setSix(params.room, id);
                    // console.log("set six...1")
                    _tab.scrapTurn(params.room, myPos);
                    // DICE_ROLL TO NEXT
                    let nextPos = _tab.getNextPosition(params.room, myPos);
                    _tab.scrapTurn(params.room, nextPos);
                    _tab.updateCurrentTurn(params.room, nextPos, 'roll', myPos);
                    let dices_rolled = _tab.gePlayerDices(params.room, nextPos);
                    let DICE_ROLLED = _tab.rollDice();
                    _tab.diceRolled(params.room, nextPos, DICE_ROLLED);
                    // SEND EVENT

                    await _tab.sedAndResetGamePlayData(params.room);

                    let event = {
                        type: 'room_including_me',
                        room: params.room,
                        delay: 1500,
                        name: 'make_diceroll',
                        data: {
                            room: params.room,
                            position: nextPos,
                            tokens: _tab.getTokens(params.room),
                            dice: DICE_ROLLED,
                            dices_rolled: dices_rolled,
                            turn_start_at: config.turnTimer,
                            extra_move_animation:false
                        },
                    };
                    resObj.events.push(event);
                    const winnerData = await this.checkwinnerOfTournament(params.room);
                    console.log("Below Winner Data --1--",winnerData)
                    if(winnerData)  resObj.events.push(winnerData);
                } else {
                    console.log('[DICE VALUE SIX]');
                    // Send 'roll' to same player
                    await _tab.updateCurrentTurn(params.room, myPos, 'roll', -1);
                    let DICE_ROLLED = await _tab.rollDice();
                    // console.log('[DICE VALUE SIX]', DICE_ROLLED);
                    await _tab.diceRolled(params.room, myPos, DICE_ROLLED);
                    let dices_rolled = await _tab.gePlayerDices(params.room, myPos);
                    // console.log('[DICE VALUE SIX]', dices_rolled, myPos);
                    // SEND EVENT
                    let event = {
                        type: 'room_including_me',
                        room: params.room,
                        delay: 1500,
                        name: 'make_diceroll',
                        data: {
                            room: params.room,
                            position: myPos,
                            tokens: await _tab.getTokens(params.room),
                            dice: DICE_ROLLED,
                            dices_rolled: dices_rolled,
                            turn_start_at: config.turnTimer,
                            extra_move_animation:true
                        },
                    };

                    resObj.events.push(event);
                }

            } else {
                console.log('[MOVE POSSIBLE EXACT]');
                let moveBonusCheck = false;
               
                // Make move, Remove dicevalue & get CURRENT_POSITION of token
                var resp = _tab.makeMoveForTournament(params.dice_value, params.room, id, params.token_index);
                var token_position = resp.token_position;
                let dices_rolled = _tab.gePlayerDices(params.room, myPos);
                console.log('TOK POS----', token_position,dices_rolled);
                let checkPointActivated = _tab.checkPointActive(params.room, myPos);
                // let homeAnimation = (token_position == 56 ) : true ? false ;
                // Add move_made Event
                let moveMadeEvent = {
                    type: 'room_excluding_me' ,//'room_excluding_me',
                    room: params.room,
                    name: 'move_made',
                    data: {
                        room: params.room, 
                        player_index: myPos,
                        token_index: params.token_index,
                        dice_value: params.dice_value,
                        dices_rolled: dices_rolled,
                        // safeZoneAnimation:checkPointActivated, 
                        // homeAnimation: homeAnimation
                    },
                };
                resObj.events.push(moveMadeEvent);

                var killed = false;
                let killTimer = 4000;
                // if CURRENT_POSITION == 56
                if (token_position == 56) {
                    console.log('[BEFORE HOME]');
                    // Add Bonus
                    _tab.addBonus(params.room, id, 1,"Home");
                    _tab.addBonusPoints(params.room, id, 50 , 1, 'home_base_bonus')
                    // Check if allHome
                    const allHome = _tab.allHome(params.room, id);
                    if (allHome) {
                        // Add TurnComplete Event
                        let turnCompleteEvent = {
                            type: 'room_including_me',
                            room: params.room,
                            delay: 2000,
                            name: 'complete_turn',
                            data: {
                                room: params.room,
                                rank: allHome.rank,
                                player_position: allHome.position,
                            },
                        };
                        resObj.events.push(turnCompleteEvent);

                        // Check if EndGame Possible
                        var endGame = _tab.isThisTheEnd(params.room, tableD.win_amount);
                        if (endGame) {
                            // Update values in user wallets & table data [DB]
                            // console.log('tableD::', tableD);

                            if (tableD) {
                                for (let j = 0; j < endGame.length; j++) {
                                    for (let k = 0; k < tableD.players.length; k++) {
                                        if (endGame[j].id.toString() == tableD.players[k].id.toString()) {
                                            tableD.players[k].rank = endGame[j].rank;
                                            tableD.players[k].pl += endGame[j].amount;
                                        }
                                    }
                                }

                                tableD.game_completed_at = new Date().getTime();

                                tableD
                                    .save()
                                    .then((d) => { 
                                        // console.log(d);
                                    })
                                    .catch((e) => {
                                        // console.log('Error::', e);
                                    });
                            }

                            // Update values in user wallets & table data [DB]
                            let event = {
                                type: 'room_including_me',
                                room: params.room,
                                delay: 2000,
                                name: 'end_game',
                                data: {
                                    room: params.room,
                                    game_data: endGame,
                                },
                            };
                            resObj.events.push(event);
                            console.log("resObj >>>",resObj)
                            let reqData = await this.getEndGameData(event.data,tableD.room_fee);
                            console.log("reqData >>>>",reqData)
                            let startGame = await requestTemplate.post( `endgame`, reqData)
                            if(!startGame.isSuccess){
                                return { callback: { status: 0, message:startGame.error } };
                            }
                        }
                        // Else [!endGame]
                        else {
                            //  SCRAP CURRENT DICES & PASS NEXT DICE_ROLL
                            let sixCounts = _tab.setSix(params.room, id);
                            console.log("set six...2")
                            _tab.scrapTurn(params.room, myPos);
                            // DICE_ROLL TO NEXT
                            let nextPos = _tab.getNextPosition(params.room, myPos);
                            _tab.updateCurrentTurn(params.room, nextPos, 'roll', myPos);
                            let dices_rolled = _tab.gePlayerDices(params.room, nextPos);
                            let DICE_ROLLED = _tab.rollDice();
                            _tab.diceRolled(params.room, nextPos, DICE_ROLLED);

                            await _tab.sedAndResetGamePlayData(params.room);

                            // SEND EVENT
                            let event = {
                                type: 'room_including_me',
                                room: params.room,
                                delay: 1500,
                                name: 'make_diceroll',
                                data: {
                                    room: params.room,
                                    position: nextPos,
                                    tokens: _tab.getTokens(params.room),
                                    dice: DICE_ROLLED,
                                    dices_rolled: dices_rolled,
                                    turn_start_at: config.turnTimer,
                                    extra_move_animation:false
                                },
                            };
                            resObj.events.push(event);
                        }
                    }
                    // Else [!allHome]
                    else {
                        moveBonusCheck = true;
                    }
                }
                // Else [!56]
                else {                    
                    console.log('[BEFORE NOT HOME]');
                    // Check If Killing Possible (Kill & Get Tokens)
                    // 
                    console.log("can i kill true.........")
                    try {
                        var canIKill = _tab.tourneyCanIKill(params.room, id, params.token_index, myPos);
                        console.log("canIKill >>>",canIKill)
                        if (canIKill) {
                            console.log("canIKill true:::", canIKill[0])
                            if(canIKill[0].movebleBox < 15) killTimer = 2000;
                            // Send Token Killed Event
                            let event = {
                                type: 'room_including_me',
                                room: params.room,
                                delay: 1000,//800,
                                name: 'token_killed',
                                data: {
                                    room: params.room,
                                    dead_tokens: canIKill,
                                    kill_anim_timer: config.pawnMoveTimer
                                },
                            };
                            resObj.events.push(event);

                            // Add Bonus as much as Killed Token Length
                            let sixCounts = _tab.setSix(params.room, id);
                            _tab.addBonus(params.room, id, canIKill.length,"Kill");
                            _tab.addBonusPoints(params.room, id, 20, canIKill.length, 'cut_bonus')
                            moveBonusCheck = true;
                            killed = true;
                        }
                        // Else [!canIKill]
                        else {
                            moveBonusCheck = true;
                        }
                        console.log("Above Winner Data ----")
                        const winnerData = await this.checkwinnerOfTournament(params.room);
                        console.log("Below Winner Data ----",winnerData)
                        if(winnerData)  resObj.events.push(winnerData);
                    } catch (error) {
                        console.lof("CATCH ERROR _ ",error)
                    }
                    
                }

                // console.log('BONUS', moveBonusCheck);
                // IF moveBonusCheck
                if (moveBonusCheck) {
                    let movePossible = _tab.isMovePossible(params.room, id);
                    console.log('movePossible >>', movePossible);

                    let timer = 1500; //1500;
                    if (killed) timer = killTimer;//4000 //nostra 3000

                    // If Move Possible
                    if (movePossible) {
                        //  MAKE_MOVE TO ME
                        _tab.updateCurrentTurn(params.room, myPos, 'move', -1);
                        setTimeout(function(){
                            _tab.updateCurrentTime(params.room); /// to solve early leave deduction on token kill
                        },timer)
                       
                        let dices_rolled = _tab.gePlayerDices(params.room, myPos);
                        let event = {
                            type: 'room_including_me',
                            room: params.room,
                            delay: timer,
                            name: 'make_move',
                            data: {
                                room: params.room,
                                position: myPos,
                                dices_rolled: dices_rolled,
                                turn_start_at: config.turnTimer
                            },
                        };
                        resObj.events.push(event);
                    }
                    // Else [!movePossible]
                    else {
                        console.log("in the SCRAP TURNB");
                        // scrapTurn
                        // let sixCounts = await _tab.setSix(params.room, id);
                        // console.log("set six...3")
                        _tab.scrapTurn(params.room, myPos);

                        // Check If Bonus Pending
                        let pendingBonus = await _tab.getBonus(params.room, id);
                        console.log('GET BONUS', pendingBonus);
                        if (pendingBonus > 0) {
                            console.log("in the SCRAP TURNB 11");
                            // Deduct Bonus
                            _tab.useBonus(params.room, id);
                            // Send 'roll' to same player
                            _tab.updateCurrentTurn(params.room, myPos, 'roll', -1);
                            setTimeout(function(){
                                _tab.updateCurrentTime(params.room); /// to solve early leave deduction on token kill
                            },timer)
                            let dices_rolled = _tab.gePlayerDices(params.room, myPos);
                            let DICE_ROLLED = _tab.rollDice();
                            _tab.diceRolled(params.room, myPos, DICE_ROLLED);
                            // SEND EVENT
                            let event = {
                                type: 'room_including_me',
                                room: params.room,
                                delay: timer,
                                name: 'make_diceroll',
                                data: {
                                    room: params.room,
                                    position: myPos,
                                    tokens: _tab.getTokens(params.room),
                                    dice: DICE_ROLLED,
                                    dices_rolled: dices_rolled,
                                    turn_start_at: config.turnTimer,
                                    extra_move_animation:true
                                },
                            };
                            resObj.events.push(event);
                        }
                        // Else [!BonusPending]
                        else {
                            console.log("in the SCRAP TURNB 22");
                            //  SCRAP CURRENT DICES & PASS NEXT DICE_ROLL
                            let sixCounts = _tab.setSix(params.room, id);
                            console.log("set six...4")
                            _tab.scrapTurn(params.room, myPos);
                            let nextPos = _tab.getNextPosition(params.room, myPos);
                            _tab.updateCurrentTurn(params.room, nextPos, 'roll', myPos);
                            let dices_rolled = _tab.gePlayerDices(params.room, nextPos);
                            let DICE_ROLLED = _tab.rollDice();
                            _tab.diceRolled(params.room, nextPos, DICE_ROLLED);

                            await _tab.sedAndResetGamePlayData(params.room);
                            // SEND EVENT
                            let event = {
                                type: 'room_including_me',
                                room: params.room,
                                delay: timer,
                                name: 'make_diceroll',
                                data: {
                                    room: params.room,
                                    position: nextPos,
                                    tokens: _tab.getTokens(params.room),
                                    dice: DICE_ROLLED,
                                    dices_rolled: dices_rolled,
                                    turn_start_at: config.turnTimer,
                                    extra_move_animation:false
                                },
                            };
                            resObj.events.push(event);
                        }
                    }
                }
            }
            let event = { 
                type: 'room_including_me',
                room: params.room,
                name: 'score_updated',
                delay: 1500,
                data: {
                    room: params.room,
                    score_data : _tab.getPoints(params.room),
                },
            };
            resObj.events.push(event);
            // console.trace('[MOVE_MADE]', JSON.stringify(resObj));
            return resObj;
        } catch (err) {
            // console.log('ERROR', err);
        }
    },
    checkwinnerOfTournament: async function(room){
        var tableD = await Table.findOne({
            room: room,
        });
        if (tableD) {
            // console.log(tableD.no_of_players,tableD.win_amount)
            const gameStartTime = tableD.game_started_at;
            let timeInsecond = (Math.round(new Date().getTime() / 1000) - Math.round(gameStartTime / 1000));  
            var winnerInfo;  
            console.log("checkwinnerOfTournament >>>",tableD.win_amount,timeInsecond)
            if(timeInsecond >= config.gameTime * 60) {//300
                winnerInfo = _tab.EndOfTournament(tableD.room, tableD.win_amount); 
            }
            // console.log("Final winner Info >>",winnerInfo) 
            if(winnerInfo) {
                for (let j = 0; j < winnerInfo.length; j++) {
                    for (let k = 0; k < tableD.players.length; k++) {
                        if (winnerInfo[j].id.toString() == tableD.players[k].id.toString()) {
                            tableD.players[k].rank = winnerInfo[j].rank;
                            tableD.players[k].pl += winnerInfo[j].amount;
                            console.log('EG >1> ', winnerInfo[j].amount);
                        }
                    }
                }
                tableD.game_completed_at = new Date().getTime();
                
                tableD
                    .save()
                    .then((d) => {
                        console.log(d);
                    })
                    .catch((e) => {
                        console.log('Error::', e);
                    });
                
                // Update values in user wallets & table data [DB]
                let event = {
                    type: 'room_including_me',
                    room: room,
                    delay: 2000,
                    name: 'end_game',
                    data: {
                        room: room,
                        game_data: winnerInfo,
                    },
                };
                console.log("event >4>>>",event)
                let reqData = await this.getEndGameData(event.data,tableD.room_fee);
                console.log("reqData >>>>",reqData)
                let startGame = await requestTemplate.post(`endgame`, reqData)
                if(!startGame.isSuccess){
                    return { callback: { status: 0, message:startGame.error } };
                }
                return event;
            }
            if(timeInsecond < 0) timeInsecond = 0;
            return ({time: config.gameTime * 60 - timeInsecond});
            // resObj.events.push(event);      
        }
        return undefined;
    },
    // Quit Game / Leave Table
    leaveTable: async function (params, id, socket) {
        console.log('LeaveRequest Request IN', params);
        var refund = '';
        if (!Service.validateObjectId(id))
            return {
                callback: {
                    status: 0,
                    message: localization.missingParamError,
                    refund:refund
                },
            };

        var us = await User.findById(id);
        if (!params || !us)
            return {
                callback: {
                    status: 0,
                    message: localization.missingParamError,
                    refund:refund
                },
            };

        if (!params.room)
            return {
                callback: {
                    status: 0,
                    message: localization.missingParamError,
                    refund:refund
                },
            };

        var tableD = await Table.findOne({
            room: params.room,
        });
        if (!tableD)
            return {
                callback: {
                    status: 0,
                    message: localization.tableDoesNotExist,
                    refund:refund
                },
            };

        var rez = _tab.leave(params.room, id);
        console.log('LEAVE RES', rez); //2|socket  | [2022-04-13T11:01:02.572] [INFO] default - LEAVE RES { res: false, flag: 1, remove: true }
        
        if (!rez.res && rez.flag == 1) {
            // console.log('User Left Before Game Start');

            await Table.findByIdAndUpdate(tableD._id, {
                $pull: {
                    players: {
                        id: ObjectId(id),
                    },
                },
            });
        }
        else{
            let playerIndex = 0;
            for (let k = 0; k < tableD.players.length; k++) {
                if (id.toString() == tableD.players[k].id.toString()) {
                    playerIndex = k;
                }
            }
            await Table.update({
                "_id": tableD._id,
                "players.id": id
              },
              {
                "$set": {
                  "players.$.is_active": false
                }
              },
              {
                "new": true
              })
        }

        if(params && params.gameNotStarted &&  params.gameNotStarted == 'true'){
            // this.refundMoney(tableD,id);
            refund = localization.insufficientPlayer;
        }
        let reqData = {
                room: params.room,
                amount: tableD.room_fee.toString(),
                users : [{
                    "user_id": us.numeric_id,
                    "token": us.token,
                    "isRefund": params.isRefund ? params.isRefund  : false
                }]
            }

        await requestTemplate.post( `matchmakingFailed`, reqData) 
        if (!rez.res) {
            return {
                callback: {
                    status: 1,
                    message: refund != '' ? refund : localization.ServerError,
                    refund:refund
                },
                events: [
                    {
                        type: 'users_including_me',
                        room: params.room,
                        name: 'leaveTable',
                        users:[id],
                        data: {
                            room: params.room
                        },
                    },
                ],
            };
        } else {
            var rez_finalObj = {
                callback: {
                    status: 1,
                    message: localization.success,
                    refund:refund
                },
                events: [
                    {
                        type: 'room_excluding_me',
                        room: params.room,
                        name: 'playerLeft',
                        data: {
                            room: params.room,
                            position: rez.position,
                        },
                    },
                ],
            };
            
            var checkOnlyPlayerLeft = _tab.checkOnlyPlayerLeft(params.room);
            console.log("checkOnlyPlayerLeft - ",checkOnlyPlayerLeft)
            // CheckIfOnlyPlayerLeft
            if (checkOnlyPlayerLeft) {
                // Check if EndGame Possible
                let tableD = await Table.findOne({
                    room: params.room,
                });
                var endGame = _tab.isThisTheEnd(params.room,tableD.win_amount);
                console.log('endGame::', endGame);
                if (endGame) {
                    // Update values in user wallets & table data [DB]                 
                    // console.log('tableD::', tableD);

                    if (tableD) {
                        for (let j = 0; j < endGame.length; j++) {
                            for (let k = 0; k < tableD.players.length; k++) {
                                if (endGame[j].id.toString() == tableD.players[k].id.toString()) {
                                    tableD.players[k].rank = endGame[j].rank;
                                    tableD.players[k].pl += endGame[j].amount;                                    
                                }
                            }
                        }

                        tableD.game_completed_at = new Date().getTime();

                        tableD
                            .save()
                            .then((d) => {
                                // console.log(d);
                            })
                            .catch((e) => {
                                // console.log('Error::', e);
                            });
                    }

                    // Update values in user wallets & table data [DB]
                    let event = {
                        type: 'room_including_me',
                        room: params.room,
                        delay: 2000,
                        name: 'end_game',
                        data: {
                            room: params.room,
                            game_data: endGame,
                        },
                    };
                    rez_finalObj.events.push(event);
                    let reqData = await this.getEndGameData(event.data, tableD.room_fee);
                    console.log("reqData >>>>",reqData)
                    let startGame = await requestTemplate.post( `endgame`, reqData)
                    if(!startGame.isSuccess){
                        return { callback: { status: 0, message:startGame.error } };
                    }
                }
                // Else [!endGame]
                else {
                    let myPos = await _tab.getMyPosition(params.room, id);
                    //  SCRAP CURRENT DICES & PASS NEXT DICE_ROLL
                    _tab.scrapTurn(params.room, myPos);
                    // DICE_ROLL TO NEXT
                    let nextPos = _tab.getNextPosition(params.room, myPos);
                    _tab.updateCurrentTurn(params.room, nextPos, 'roll', myPos);
                    let dices_rolled = _tab.gePlayerDices(params.room, nextPos);
                    let DICE_ROLLED = _tab.rollDice();
                    _tab.diceRolled(params.room, nextPos, DICE_ROLLED);

                    await _tab.sedAndResetGamePlayData(params.room);
                    // SEND EVENT
                    let event = {
                        type: 'room_including_me',
                        room: params.room,
                        delay: 1500,
                        name: 'make_diceroll',
                        data: {
                            room: params.room,
                            position: nextPos,
                            tokens: _tab.getToken,
                            dices_rolled: dices_rolled,
                            dice: DICE_ROLLED,
                            turn_start_at: config.turnTimer,
                            extra_move_animation:false
                        },
                    };
                    rez_finalObj.events.push(event);
                }
            } else {
                let mypos = await _tab.getMyPosition(params.room, id);
                // console.log('My position::', mypos);

                if (mypos != -1) {
                    let check = _tab.isCurrentTurnMine(params.room, mypos);
                    if (check) {
                        //  SCRAP CURRENT DICES & PASS NEXT DICE_ROLL
                        _tab.scrapTurn(params.room, mypos);
                        // nextPosition find & add event dice_roll
                        let nextPos = await _tab.getNextPosition(params.room, mypos);
                        _tab.updateCurrentTurn(params.room, nextPos, 'roll', mypos);
                        let dices_rolled = _tab.gePlayerDices(params.room, nextPos);
                        let DICE_ROLLED = _tab.rollDice();
                        _tab.diceRolled(params.room, nextPos, DICE_ROLLED);

                        await _tab.sedAndResetGamePlayData(params.room);

                        let event = {
                            type: 'room_including_me',
                            room: params.room,
                            delay: 1500,
                            name: 'make_diceroll',
                            data: {
                                room: params.room,
                                position: nextPos,
                                tokens: _tab.getTokens(params.room),
                                dice: DICE_ROLLED,
                                dices_rolled: dices_rolled,
                                turn_start_at: config.turnTimer,
                                extra_move_animation:false
                            },
                        };

                        rez_finalObj.events.push(event);
                    }
                }
            }
            
            return rez_finalObj;
        }   
    },

    //Skip Turn
    skipTurn: async function (params, id) {
        console.log('Skip Turn Request', params);
        if (!params)
            return {
                callback: {
                    status: 0,
                    message: localization.missingParamError,
                },
            };
        if (!params.room)
            return {
                callback: {
                    status: 0,
                    message: localization.missingParamError,
                },
            };

        var mypos = await _tab.getMyPosition(params.room, id);
        // console.log('My position::', mypos);

        if (mypos != -1) {
            var check = _tab.isCurrentTurnMine(params.room, mypos);

            if (check) {
                _tab.deductLife(params.room, id);
                var checkLife = await _tab.getMyLife(params.room, id);

                // console.log('Current Life::', checkLife);

                if (checkLife == 0) {
                    //leave table and pass turn to next player
                    var rez = _tab.leave(params.room, id);
                    // console.log('REZ', rez);
                    if (!rez.res) {
                        return {
                            callback: {
                                status: 0,
                                message: localization.ServerError,
                            },
                        };
                    } else {
                        var rez_finalObj = {
                            callback: {
                                status: 2,
                                message: localization.success,
                            },
                            events: [
                                {
                                    type: 'room_including_me',
                                    room: params.room,
                                    name: 'playerLeft',
                                    delay: 500, //1500
                                    data: {
                                        room: params.room,
                                        position: rez.position,
                                    },
                                },
                            ],
                        };
                       
                        var checkOnlyPlayerLeft = _tab.checkOnlyPlayerLeft(params.room);
                        // CheckIfOnlyPlayerLeft
                        let tableD = await Table.findOne({
                            room: params.room,
                        });
                        var us = await User.findById(id);
                        let reqData = {
                            room: params.room,
                            amount: tableD.room_fee.toString(),
                            users : [{
                                "user_id": us.numeric_id,
                                "token": us.token,
                                "isRefund": params.isRefund ? params.isRefund  : false
                            }]
                        }
            
                        await requestTemplate.post( `matchmakingFailed`, reqData) 
                        if (checkOnlyPlayerLeft) {
                            // Check if EndGame Possible
                            var endGame = _tab.isThisTheEnd(params.room,tableD.win_amount);
                            if (endGame) {
                                // Update values in user wallets & table data [DB]
                                

                                // console.log('tableD::', tableD);

                                if (tableD) {
                                    for (let j = 0; j < endGame.length; j++) {
                                        for (let k = 0; k < tableD.players.length; k++) {
                                            if (endGame[j].id.toString() == tableD.players[k].id.toString()) {
                                                tableD.players[k].rank = endGame[j].rank;
                                                tableD.players[k].pl += endGame[j].amount;
                                            }
                                        }
                                    }

                                    tableD.game_completed_at = new Date().getTime();

                                    tableD
                                        .save()
                                        .then((d) => {
                                            // console.log(d);
                                        })
                                        .catch((e) => {
                                            // console.log('Error::', e);
                                        });
                                }

                                // Update values in user wallets & table data [DB]
                                let event = {
                                    type: 'room_including_me',
                                    room: params.room,
                                    delay: 2000,
                                    name: 'end_game',
                                    data: {
                                        room: params.room,
                                        game_data: endGame,
                                    },
                                };
                                rez_finalObj.events.push(event);
                                let reqData = await this.getEndGameData(event.data, tableD.room_fee);
                                console.log("reqData >>>>",reqData)
                                let startGame = await requestTemplate.post(`endgame`, reqData)
                                if(!startGame.isSuccess){
                                    return { callback: { status: 0, message:startGame.error } };
                                }
                            }
                            // Else [!endGame]
                            else {
                                let myPos = await _tab.getMyPosition(params.room, id);
                                //  SCRAP CURRENT DICES & PASS NEXT DICE_ROLL
                                _tab.scrapTurn(params.room, myPos);
                                // DICE_ROLL TO NEXT
                                let nextPos = _tab.getNextPosition(params.room, myPos);
                                _tab.updateCurrentTurn(params.room, nextPos, 'roll', myPos);
                                let dices_rolled = _tab.gePlayerDices(params.room, nextPos);
                                let DICE_ROLLED = _tab.rollDice();
                                _tab.diceRolled(params.room, nextPos, DICE_ROLLED);

                                await _tab.sedAndResetGamePlayData(params.room);

                                // SEND EVENT
                                let event = {
                                    type: 'room_including_me',
                                    room: params.room,
                                    delay: 1500, //1500
                                    name: 'make_diceroll',
                                    data: {
                                        room: params.room,
                                        position: nextPos,
                                        tokens: _tab.getTokens(params.room),
                                        dice: DICE_ROLLED,
                                        dices_rolled: dices_rolled,
                                        turn_start_at: config.turnTimer,
                                        extra_move_animation:false
                                    },
                                };
                                rez_finalObj.events.push(event);
                            }
                        } else {
                            let mypos = await _tab.getMyPosition(params.room, id);
                            // console.log('My position::', mypos);

                            if (mypos != -1) {
                                let check = _tab.isCurrentTurnMine(params.room, mypos);
                                if (check) {
                                    //  SCRAP CURRENT DICES & PASS NEXT DICE_ROLL
                                    _tab.scrapTurn(params.room, mypos);
                                    // nextPosition find & add event dice_roll
                                    let nextPos = await _tab.getNextPosition(params.room, mypos);
                                    _tab.updateCurrentTurn(params.room, nextPos, 'roll', mypos);
                                    let dices_rolled = _tab.gePlayerDices(params.room, nextPos);
                                    let DICE_ROLLED = _tab.rollDice();
                                    _tab.diceRolled(params.room, nextPos, DICE_ROLLED);

                                    await _tab.sedAndResetGamePlayData(params.room);

                                    let event = {
                                        type: 'room_including_me',
                                        room: params.room,
                                        delay: 500, //1500
                                        name: 'make_diceroll',
                                        data: {
                                            room: params.room,
                                            position: nextPos,
                                            tokens: _tab.getTokens(params.room),
                                            dice: DICE_ROLLED,
                                            dices_rolled: dices_rolled,
                                            turn_start_at: config.turnTimer,
                                            extra_move_animation:false
                                        },
                                    };

                                    rez_finalObj.events.push(event);
                                }
                            }
                        }

                        return rez_finalObj;
                    }
                } else {
                    var resObj = {
                        callback: {
                            status: 1,
                            message: localization.success,
                        },
                        events: [],
                    };

                    // _tab.deductLife(params.room, id);
                    var life_event = {
                        type: 'room_including_me',
                        room: params.room,
                        name: 'life_deduct',
                        data: {
                            room: params.room,
                            position: mypos,
                        },
                    };
                    resObj.events.push(life_event); 

                    //  SCRAP CURRENT DICES & PASS NEXT DICE_ROLL
                    _tab.scrapTurn(params.room, mypos);
                    let pendingBonus = await _tab.getBonus(params.room, id);
                        console.log('GET BONUS', pendingBonus);
                        if (pendingBonus > 0) {
                            console.log("in the SCRAP TURNB 11");
                            // Deduct Bonus
                            _tab.useBonus(params.room, id);
                            // Send 'roll' to same player
                            _tab.updateCurrentTurn(params.room, mypos, 'roll', -1);
                            let dices_rolled = _tab.gePlayerDices(params.room, mypos);
                            let DICE_ROLLED = _tab.rollDice();
                            _tab.diceRolled(params.room, mypos, DICE_ROLLED);
                            // SEND EVENT
                            let event = {
                                type: 'room_including_me',
                                room: params.room,
                                delay: 1500,
                                name: 'make_diceroll',
                                data: {
                                    room: params.room,
                                    position: mypos,
                                    tokens: _tab.getTokens(params.room),
                                    dice: DICE_ROLLED,
                                    dices_rolled: dices_rolled,
                                    turn_start_at: config.turnTimer,
                                    extra_move_animation:true
                                },
                            };
                            resObj.events.push(event);
                        }
                        // Else [!BonusPending]
                        else {
                            // nextPosition find & add event dice_roll
                            let nextPos = await _tab.getNextPosition(params.room, mypos);
                            _tab.updateCurrentTurn(params.room, nextPos, 'roll', mypos);
                            let dices_rolled = _tab.gePlayerDices(params.room, nextPos);
                            let DICE_ROLLED = _tab.rollDice();
                            _tab.diceRolled(params.room, nextPos, DICE_ROLLED);

                            await _tab.sedAndResetGamePlayData(params.room);
                            
                            let event = {
                                type: 'room_including_me',
                                room: params.room,
                                delay: 1500,//1500,
                                name: 'make_diceroll',
                                data: {
                                    room: params.room,
                                    position: nextPos,
                                    tokens: _tab.getTokens(params.room),
                                    dice: DICE_ROLLED,
                                    dices_rolled: dices_rolled,
                                    turn_start_at: config.turnTimer,
                                    extra_move_animation:false
                                },
                            };

                            resObj.events.push(event);
                        }

                    return resObj;
                }
            } else {
                return {
                    callback: {
                        status: 0,
                        message: localization.NotYourMoveError,
                    },
                };
            }
        } else {
            return {
                callback: {
                    status: 0,
                    message: localization.ServerError,
                },
            };
        }
    },


    checkLeaveTable: async function (id) {
        // console.log('check leave teable');
        var leaveIfPlaying = await _tab.leaveIfPlaying(id);

        if (leaveIfPlaying) {
            var rez = _tab.leaveIf(leaveIfPlaying, id);
            // console.log('REZ', rez);

            if (!rez.res && rez.flag == 1) {
                // console.log('User Left Before Game Start');
                let getTable = await Table.findOne({
                    room: leaveIfPlaying,
                });

                await Table.findByIdAndUpdate(getTable._id, {
                    $pull: {
                        players: {
                            id: ObjectId(id),
                        },
                    },
                });
            }
            return true;
        } else {
            return {
                callback: {
                    status: 0,
                    message: localization.tableDoesNotExist,
                },
            };
        }
    },

    startIfPossibleTournament: async function (params) {
        // console.log('StartIfPossible request IN', params);

        if (!params) return false;

        if (!params.room) return false;

        var start = await _tab.tournamentStartGame(params.room);
        // console.log('AFTER START ==>');
        
        let tableD = await Table.findOne({ room: params.room });
        if (tableD) {
            var dt = new Date();
            dt.setSeconds( dt.getSeconds() + 7);
            tableD.game_started_at = new Date(dt).getTime() ;
            tableD.turn_start_at = new Date(dt).getTime();
            await tableD.save();      
            console.log("startIfPossibleTournament Start Time- ",new Date(tableD.game_started_at),tableD.game_started_at)
            let  timeToAdd = new Date(new Date().getTime() + config.gameTime*60000);
            var seconds = (timeToAdd - new Date().getTime()) / 1000;  
            console.log(timeToAdd,new Date().getTime(),seconds)
            start.timeToCompleteGame = seconds;
        }
        return start;
    },


    abortGame: async function (table) {
        let nw = await Table.findOneAndUpdate(
            {
                room: table.room,
            },
            {
                $set: {
                    game_completed_at: new Date().getTime(),
                    players: [],
                },
            },
            {
                new: true,
            }
        );

        console.log('NW DONE', nw);

        await _tab.abortGame(table.room);
    },

    //Check Tabel Exists
    istableExists: async function (params) {
        // console.log('Check Tabel Exists Request >> ', params);
        if (!params && !params.room) {
            // console.log('missingParamError');
            return false;
        }
        // if (!params.room) {
        //     console.log('missingParamError');
        //     return false;
        // }

        var tabelCheck = _tab.checkTableExists(params.room);
        // console.log('Table Exists', tabelCheck);
        return tabelCheck;
    },

    getMyIdByPossition: async function (params, id) {
        // console.log('Request to get ID >>', params);
        if (!params) {
            // console.log('missingParamError');
            return false;
        }
        if (!params.room) {
            // console.log('missingParamError');
            return false;
        }

        var user_id = await _tab.getMyIdByPosition(params.room, id);
        return user_id;
    },

    reconnectIfPlaying: async function (id) {
        if (!Service.validateObjectId(id)) false;
        var us = await User.findById(id);

        var alreadyPlaying = _tab.alreadyPlayingTable(us._id);

        if (alreadyPlaying.status == 1) {
            var tab = await Table.findOne({ room: alreadyPlaying.table.room, 'players.id': id });
            if (!tab) {
                // FIX_2407 : ALREADY PLAYING
                console.log('DESTROY', alreadyPlaying.table.room);
                _tab.abortGame(alreadyPlaying.table.room);
                return {
                    status: 0,
                };
            } else{
                console.log(tab)
                alreadyPlaying.status = 1;
                return alreadyPlaying;
            } 
        } else {
            
            return alreadyPlaying;
        }

        // console.log('User Playing On Table', alreadyPlaying);
    },

    getTokens: async function (room, id) {
        if (!Service.validateObjectId(id)) false;
        var us = await User.findById(id);

        var alreadyPlaying = _tab.getTokRoom(room, us._id);

        // console.log('User Playing On Table', alreadyPlaying);
        return alreadyPlaying;
    },

    joinTournament: async function (params, myId) {
        console.log('Join tournament GAME', params,myId);

        params = _.pick(params, ['no_of_players', 'room_fee','winningAmount','totalWinning']);
        if (!params || !Service.validateObjectId(myId)){
            return {
                callback: {
                    status: 0,
                    message: localization.invalidRequestParams,
                },
            };
        }
        var us = await User.findById(myId);
        if (!us) {
            console.log('Deactivated from tournament');
            return {
                callback: {
                    status: 0,
                    message: localization.ServerError,
                },
            };
        }

        var alreadyPlaying = _tab.alreadyPlaying(us._id);
        if (alreadyPlaying) {
            console.log('alreadyPlaying');
            return {
                callback: {
                    status: 0,
                    message: localization.alreadyPlaying,
                },
            };
        }

        
        console.log("no_of_players >>> ",params.no_of_players,params.room_fee)
        if (_.isEmpty(params.no_of_players) || _.isEmpty(params.room_fee)){
            console.log("Inside IF - ",_.isEmpty(params.no_of_players),_.isEmpty(params.room_fee))
            return {
                callback: {
                    status: 0,
                    message: localization.invalidRequestParams,
                },
            };
        }
        var tableD = await Table.findOne({
            // tournamentId: params.tournamentId,
            'room_fee': params.room_fee,
            'players.id': ObjectId(myId),
            "game_completed_at": "-1"
        });
        console.log("Already Played in This Tournament ::::", tableD)
        if(tableD){
            let players = tableD.players;
            for(let i=0; i<players.length; i++){
                console.log("You are in This Tournament ::::", players[i].id == myId , players[i].id , myId, players[i].is_active)
                if(players[i].id == myId && players[i].is_active == true){
                    return {
                        callback: {
                            status: 0,
                            message: localization.invalidRequestParams,
                        },
                    };
                }
            }
        }
        //Check valid no of Palyer
        if (!config.noOfPlayersInTournament.includes(parseInt(params.no_of_players))) {
            return {
                callback: {
                    status: 0,
                    message: localization.ServerError,
                },
            };
        }

        var checkTourneyRes = _tab.checkTournamentTable(params.room_fee, params.no_of_players);
        console.log('Tabel Found::', checkTourneyRes,params.winningAmount);
        var isAnyTableEmpty = checkTourneyRes ? checkTourneyRes.room : false;
        let secTime = config.countDownTime;
        if(params.startTime) secTime = Math.round(params.startTime / 1000) - Math.round(new Date().getTime() / 1000) + 5;
        var timerStart = secTime;
        var tableX;

        if (!isAnyTableEmpty) {
            // console.log('No Public Table Found');
            var room = await Service.randomNumber(6);
            var data;
            while (true) {
                data = await Table.find({
                    room: room,
                });

                if (data.length > 0) room = await Service.randomNumber(6);
                else break;
            }
            
            if(params) {
                params.win_amount = params.winningAmount;
                params.totalWinning = params.totalWinning;
            }
            params.room = room;
            params.created_at = new Date().getTime();
            console.log("params >>>>",params)
            var table = new Table(params);
            tableX = await table.save();

            if (!tableX) {
                return {
                    callback: {
                        status: 0,
                        message: localization.ServerError,
                    },
                };
            }

            var room_code = await _tab.createTableforTourney(tableX);

            if (!room_code) {
                return {
                    callback: {
                        status: 0,
                        message: localization.ServerError,
                    },
                };
            }

            isAnyTabelEmpty = room_code;
        } else {
            tableX = await Table.findOne({
                room: isAnyTabelEmpty,
            });
            if (!tableX) {
                return {
                    callback: {
                        status: 0,
                        message: localization.ServerError,
                    },
                };
            }
        }

        //Tabel Found
        var us = await User.findById(myId);
        let optional = 0;
        console.log("seatOnTableforTourney >>>",us)
        var seatOnTable = _tab.seatOnTableforTourney(isAnyTabelEmpty, us, optional);

        if (seatOnTable) {
            var callbackRes = {
                status: 1,
                message: 'Done',
                table: seatOnTable.table,
                position: seatOnTable.pos,
                timerStart: timerStart,
            };

            var player = {
                id: us.id,
                fees:params.room_fee,
                is_active: true
            };

            let flag = false;

            for (let i = 0; i < tableX.players.length; i++) {
                if (tableX.players[i].id.toString() == player.id.toString()) {
                    console.log("i ->",i,tableX.players[i])
                    tableX.players[i] = player;
                    flag = true;
                    break;
                }
            }

            //Save Player to DB
            if (!flag) tableX.players.push(player);

            tableX.created_at = new Date().getTime();
            console.log("tableX >>",tableX)
            await tableX.save();
            
            return {
                callback: callbackRes,
                events: [
                    {
                        type: 'room_excluding_me',
                        room: isAnyTabelEmpty,
                        name: 'playerJoin',
                        data: {
                            room: isAnyTabelEmpty,
                            name: us.name,
                            profile: us.profilepic,
                            position: seatOnTable.pos,
                        },
                    },
                ],
            };
            
        } else {
            return {
                callback: {
                    status: 0,
                    message: 'Error joining game, please try again',
                },
            };
        }
    },
    getGameUsersData: async function (data) {
        
        let userData = data.table.users;
        console.log("getGameUsersData >",data,userData)
        let reqData = {
            room: data.room,
            amount: data.table.room_fee.toString(),
            users : []
        }
        for(let i=0;i<userData.length;i++){
            if(userData[i].id != ""){
                var us = await User.findById(userData[i].id);
                let json = {
                    "user_id": us.numeric_id,
                    "token": us.token
                }
                reqData.users.push(json)
            }
        }
        console.log("getGameUsersData >",reqData)
        return reqData;
    },
    getEndGameData: async function (data,room_fee) {
        let userData = data.game_data;
        let reqData = {
            room: data.room,
            amount: room_fee.toString(),
            users : []
        }
        console.log("getEndGameData > ",userData)
        for(let i=0;i<userData.length;i++){
            if(userData[i].id != ""){
                var us = await User.findById(userData[i].id);
                let json = {
                    "user_id": us.numeric_id,
                    "token": us.token,
                    "rank":  userData[i].rank,
                    "score": userData[i].score,
                    "winnings": userData[i].amount 
                }
                reqData.users.push(json)
            }
        }
        console.log("getEndGameData >",reqData)
        return reqData;
    },
};
