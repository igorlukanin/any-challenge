const debug = require('console-debug');


const console = new debug({
    uncaughtExceptionCatch: true,
    logToFile:              true,
    colors:                 true,
    consoleFilter:          [],
    logFilter:              []
});


const logAppState = (app, message) => console.info(app + ' ' + message);

const logPlayerInfo = (player, message) => console.info((player.email ? player.email : player) + ' ' + message);


module.exports = {
    appState: logAppState,
    playerInfo: logPlayerInfo
};