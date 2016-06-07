const config = require('config');
const router = require('express').Router();
const players = require('../models/player');


router.get('/:id', (req, res) => {
    const id = req.params.id;

    players
        .load(id)
        .then(player => res.render('player/one', {
            player,
            ws: {
                host: config.get('ws.host'),
                port: config.get('ws.port')
            }
        }))
        .catch(err => res.render('errors/index', { err }));
});


module.exports = router;