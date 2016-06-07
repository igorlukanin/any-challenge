const debug = require('console-debug');


const console = new debug({
    uncaughtExceptionCatch: true,
    logToFile:              true,
    colors:                 true,
    consoleFilter:          [],
    logFilter:              []
});


const logAppState = (app, message) => console.info(app + ' ' + message);

const logPlayerInfo = (playerId, message) => console.info(playerId + ' ' + message);


module.exports = {
    appState: logAppState,
    playerInfo: logPlayerInfo
};