const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/auth');

// All order routes are protected
router.post('/', authMiddleware, orderController.createOrder);
router.get('/user/orders', authMiddleware, orderController.getUserOrders);
router.get('/:id', authMiddleware, orderController.getOrderById);
router.put('/:id/complete', authMiddleware, orderController.completeOrder);
router.put('/:id/cancel', authMiddleware, orderController.cancelOrder);

module.exports = router;