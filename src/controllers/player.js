const Promise = require('Promise');
const router = require('express').Router();
const events = require('../models/event');
const players = require('../models/player');


router.get('/:id', (req, res) => {
    const id = req.params.id;

    const thisPlayer = players.load(id);

    const theirEvents = thisPlayer
        .then(player => events.loadAllByPlayer(player.id));
    
    Promise
        .all([ thisPlayer, theirEvents ])
        .then(([ player, events ]) => res.render('player/one', { player, events }))
        .catch(err => res.render('errors/index', { err }));
});


module.exports = router;