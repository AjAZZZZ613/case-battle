// Item Controller
const Item = require('../models/Item');

// Get all items with filters
exports.getAllItems = async (req, res) => {
  try {
    const { weapon, rarity, exterior, minPrice, maxPrice, page = 1, limit = 20 } = req.query;

    let filter = { isAvailable: true };

    if (weapon) filter.weapon = weapon;
    if (rarity) filter.rarity = rarity;
    if (exterior) filter.exterior = exterior;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = minPrice;
      if (maxPrice) filter.price.$lte = maxPrice;
    }

    const items = await Item.find(filter)
      .populate('seller', 'username rating avatar')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Item.countDocuments(filter);

    res.json({
      items,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get item by ID
exports.getItemById = async (req, res) => {
  try {
    const item = await Item.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).populate('seller', 'username rating avatar balance totalSales');

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create new item listing
exports.createItem = async (req, res) => {
  try {
    const { name, exterior, rarity, price, image, weapon, floatValue } = req.body;

    const item = new Item({
      name,
      exterior,
      rarity,
      price,
      image,
      weapon,
      floatValue,
      seller: req.userId
    });

    await item.save();
    res.status(201).json({ message: 'Item created', item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update item
exports.updateItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (item.seller.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { price, exterior } = req.body;
    if (price) item.price = price;
    if (exterior) item.exterior = exterior;

    await item.save();
    res.json({ message: 'Item updated', item });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Delete item
exports.deleteItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (item.seller.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await Item.findByIdAndDelete(req.params.id);
    res.json({ message: 'Item deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};