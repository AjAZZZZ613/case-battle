// Order Controller
const Order = require('../models/Order');
const Item = require('../models/Item');
const User = require('../models/User');

const COMMISSION_PERCENTAGE = 0.08; // 8% commission

// Create order (purchase item)
exports.createOrder = async (req, res) => {
  try {
    const { itemId, paymentMethod } = req.body;

    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (!item.isAvailable) {
      return res.status(400).json({ error: 'Item is not available' });
    }

    // Calculate commission
    const commission = item.price * COMMISSION_PERCENTAGE;
    const sellerAmount = item.price - commission;

    const order = new Order({
      buyer: req.userId,
      seller: item.seller,
      item: itemId,
      price: item.price,
      commission,
      paymentMethod,
      transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });

    await order.save();

    // Update item status
    item.isAvailable = false;
    await item.save();

    // Update seller balance
    await User.findByIdAndUpdate(
      item.seller,
      {
        $inc: { balance: sellerAmount, totalSales: 1 }
      }
    );

    res.status(201).json({
      message: 'Order created successfully',
      order,
      sellerAmount,
      commission
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get user orders
exports.getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      $or: [{ buyer: req.userId }, { seller: req.userId }]
    })
      .populate('buyer', 'username avatar')
      .populate('seller', 'username avatar')
      .populate('item', 'name price image weapon')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('buyer', 'username email avatar')
      .populate('seller', 'username email avatar')
      .populate('item', 'name price image weapon exterior');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user is buyer or seller
    if (order.buyer._id.toString() !== req.userId && order.seller._id.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Complete order
exports.completeOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.seller.toString() !== req.userId) {
      return res.status(403).json({ error: 'Only seller can complete order' });
    }

    order.status = 'completed';
    order.completedAt = new Date();
    await order.save();

    res.json({ message: 'Order completed', order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Cancel order
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.status === 'completed') {
      return res.status(400).json({ error: 'Cannot cancel completed order' });
    }

    order.status = 'cancelled';
    await order.save();

    // Restore item availability
    await Item.findByIdAndUpdate(order.item, { isAvailable: true });

    // Refund seller
    await User.findByIdAndUpdate(
      order.seller,
      {
        $inc: { balance: -order.price }
      }
    );

    res.json({ message: 'Order cancelled', order });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
