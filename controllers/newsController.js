const News = require('../models/News');

exports.getAllNews = async (req, res) => {
    try {
        const news = await News.find().sort({ date: -1 });
        res.json(news);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createNews = async (req, res) => {
    try {
        const news = new News(req.body);
        const savedNews = await news.save();
        res.status(201).json(savedNews);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.updateNews = async (req, res) => {
    try {
        const updatedNews = await News.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedNews);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.deleteNews = async (req, res) => {
    try {
        await News.findByIdAndDelete(req.params.id);
        res.json({ message: 'News deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
