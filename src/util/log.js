const debug = require('console-debug');


const console = new debug({
    uncaughtExceptionCatch: true,
    logToFile:              true,
    colors:                 true,
    consoleFilter:          [],
    logFilter:              []
});


const logAppState = (app, message) => console.info(app + ' ' + message);

const logPlayerInfo = (player, message) => console.info(player.email + ' ' + message);

const logCardInfo = card => console.info(card.type_id + ' ' + (card.played ? 'played' : 'skipped'));


module.exports = {
    appState: logAppState,
    playerInfo: logPlayerInfo,
    cardInfo: logCardInfo
};