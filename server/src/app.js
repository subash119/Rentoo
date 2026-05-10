const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const rentalRoutes = require('./routes/rentalRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const rentalRequestRoutes = require('./routes/rentalRequestRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const { createUploadDir } = require('./createUploadDir');

const app = express();

// Create uploads directory if it doesn't exist
createUploadDir();

// Enable CORS for all routes
const corsOptions = {
  origin: ['http://localhost:5173', 'https://rentoo-one.vercel.app'],
  credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Middleware
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/v1/rental-requests', rentalRequestRoutes);
app.use('/api/v1/reviews', reviewRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  // Log all registered routes
  console.log('\nRegistered Routes:');
  app._router.stack.forEach(r => {
    if (r.route && r.route.path) {
      console.log(`${Object.keys(r.route.methods)} ${r.route.path}`);
    } else if (r.name === 'router') {
      r.handle.stack.forEach(layer => {
        if (layer.route) {
          const methods = Object.keys(layer.route.methods);
          console.log(`${methods} ${r.regexp} ${layer.route.path}`);
        }
      });
    }
  });
});

module.exports = app;
