const express = require('express');
const router = express.Router();
const User = require('../models/User');

// @route   POST api/auth/register
// @desc    Register a new user with ZKP public signals
router.post('/register', async (req, res) => {
  const { username, publicSignals } = req.body;

  try {
    let user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    user = new User({
      username,
      publicSignals,
    });

    await user.save();
    res.status(201).json({ msg: 'User registered successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/auth/login
// @desc    Login user by verifying ZKP proof (Stub)
router.post('/login', async (req, res) => {
  const { username, proof, publicSignals } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    // TODO: Implement SnarkJS verification logic here
    // For now, we'll just simulate a successful verification
    res.json({ msg: 'Proof received! Verification pending implementation.', userId: user._id });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
