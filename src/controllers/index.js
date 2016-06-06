var router = require('express').Router(),

    db = require('../util/db');


router.get('/', (req, res) => res.render('index'));

router.use('/challenges', require('./challenge'));
router.use('/players', require('./player'));
router.use('/cards', require('./card'));


module.exports = router;