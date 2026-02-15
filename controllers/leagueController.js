const League = require('../models/League');

exports.createLeague = async (req, res) => {
  try {
    const { name, description } = req.body;
    const newLeague = new League({ name, description });
    await newLeague.save();
    res.status(201).json(newLeague);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getLeagues = async (req, res) => {
  try {
    const leagues = await League.find().sort({ name: 1 });
    res.json(leagues);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteLeague = async (req, res) => {
  try {
    await League.findByIdAndDelete(req.params.id);
    res.json({ message: 'League deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateLeague = async (req, res) => {
  try {
    const { name, description } = req.body;
    const league = await League.findByIdAndUpdate(
      req.params.id,
      { name, description },
      { new: true }
    );
    res.json(league);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
