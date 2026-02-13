const express = require('express');
const router = express.Router();
const newsController = require('../controllers/newsController');
const { auth } = require('../middleware/auth');

router.get('/', newsController.getAllNews);
router.post('/', auth, newsController.createNews);
router.put('/:id', auth, newsController.updateNews);
router.delete('/:id', auth, newsController.deleteNews);

module.exports = router;
