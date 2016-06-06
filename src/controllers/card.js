const Promise = require('Promise');
const router = require('express').Router();
const cards = require('../models/card');


const actions = [
    ['/:id/flip', cards.flip],
    ['/:id/play', cards.play],
    ['/:id/skip', cards.skip]
];

actions.forEach(action => {
    router.post(action[0], (req, res) => {
        const id = req.params.id;
        const input = req.body.input;

        action[1](id, input)
            .then(card => res.json(card))
            .catch(err => res.status(400).json(err));
    });
});


module.exports = router;