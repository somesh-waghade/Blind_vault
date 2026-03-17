const express = require('express');
const router = express.Router();
const Vault = require('../models/Vault');

// @route   GET api/vault
// @desc    Get the encrypted vault data
router.get('/:userId', async (req, res) => {
  try {
    const vault = await Vault.findOne({ userId: req.params.userId });
    if (!vault) {
      return res.status(404).json({ msg: 'Vault not found' });
    }
    res.json(vault);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   POST api/vault
// @desc    Update or create encrypted vault data
router.post('/', async (req, res) => {
  const { userId, encryptedData } = req.body;

  try {
    let vault = await Vault.findOne({ userId });

    if (vault) {
      // Update
      vault.encryptedData = encryptedData;
      vault.updatedAt = Date.now();
      await vault.save();
    } else {
      // Create
      vault = new Vault({
        userId,
        encryptedData,
      });
      await vault.save();
    }

    res.json(vault);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
