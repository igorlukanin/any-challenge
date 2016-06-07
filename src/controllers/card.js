const router = require('express').Router();
const cards = require('../models/card');


const actions = [
    ['/:id/play', cards.play],
    ['/:id/flip', cards.flip],
    ['/:id/win', cards.win],
    ['/:id/loose', cards.loose],
    ['/:id/flip-as-competitor', cards.flipAsCompetitor],
    ['/:id/win-as-competitor', cards.winAsCompetitor],
    ['/:id/loose-as-competitor', cards.looseAsCompetitor],
];

actions.forEach(action => {
    router.post(action[0], (req, res) => {
        const id = req.params.id;
        const input = req.body.input;

        action[1](id, input)
            .then(card => res.status(200).send())
            .catch(err => res.status(400).json(err));
    });
});


module.exports = router;