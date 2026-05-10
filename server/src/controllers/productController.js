const mongoose = require('mongoose');
const Product = require('../models/Product');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const RentalRequest = require('../models/RentalRequest');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/products');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        // Clean the original filename
        const cleanFileName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${uniqueSuffix}-${cleanFileName}`);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('Only image files (jpeg, jpg, png, webp) are allowed!'));
        }
    }
}).array('images', 5); // Allow up to 5 images

// Helper function to get image URL
const getImageUrl = (filename) => {
    return `http://localhost:5000/uploads/products/${filename}`;
};

// Helper function to delete file
const deleteFile = async (filepath) => {
    try {
        await fs.unlink(filepath);
    } catch (error) {
        console.error(`Error deleting file ${filepath}:`, error);
    }
};

// Validate product data
const validateProduct = (data) => {
    const errors = [];

    if (!data.name || data.name.trim().length < 3) {
        errors.push('Name must be at least 3 characters long');
    }

    if (!data.description || data.description.trim().length < 10) {
        errors.push('Description must be at least 10 characters long');
    }

    if (!data.price || isNaN(data.price) || data.price <= 0) {
        errors.push('Price must be a positive number');
    }

    if (!data.category || !['Electronics', 'Furniture', 'Fashion', 'Books', 'Sports', 'Others'].includes(data.category)) {
        errors.push('Invalid category');
    }

    if (data.condition && !['New', 'Like New', 'Good', 'Fair'].includes(data.condition)) {
        errors.push('Invalid condition');
    }

    return errors;
};

// Create a new product
exports.createProduct = async (req, res) => {
    try {
        upload(req, res, async (err) => {
            if (err) {
                return res.status(400).json({ message: err.message });
            }

            const productData = {
                ...req.body,
                vendor: req.user._id,
                price: parseFloat(req.body.price),
                images: req.files ? req.files.map(file => getImageUrl(file.filename)) : []
            };

            // Validate product data
            const errors = validateProduct(productData);
            if (errors.length > 0) {
                // Delete uploaded files if validation fails
                if (req.files) {
                    for (const file of req.files) {
                        await deleteFile(file.path);
                    }
                }
                return res.status(400).json({ errors });
            }

            const product = new Product(productData);
            await product.save();

            res.status(201).json(product);
        });
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ message: 'Error creating product' });
    }
};

// Get all products (with filters)
exports.getProducts = async (req, res) => {
    try {
        const {
            search,
            category,
            minPrice,
            maxPrice,
            condition,
            sortBy = 'createdAt',
            order = 'desc',
            page = 1,
            limit = 10
        } = req.query;

        const query = {};

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        if (category) query.category = category;
        if (condition) query.condition = condition;
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseFloat(minPrice);
            if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }

        const products = await Product.find(query)
            .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('vendor', 'name email');

        const total = await Product.countDocuments(query);

        res.json({
            products,
            total,
            pages: Math.ceil(total / limit)
        });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ message: 'Error getting products' });
    }
};

// Get vendor's products
exports.getVendorProducts = async (req, res) => {
    try {
        const products = await Product.find({ vendor: req.user._id })
            .sort({ createdAt: -1 })
            .populate('vendor', 'name email');
        res.json(products);
    } catch (error) {
        console.error('Get vendor products error:', error);
        res.status(500).json({ message: 'Error getting vendor products' });
    }
};

// Get single product
exports.getProduct = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ message: 'Invalid product ID' });
        }

        const product = await Product.findById(req.params.id)
            .populate('vendor', 'name email');

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Transform image URLs
        if (product.images) {
            product.images = product.images.map(image => 
                image.startsWith('http') ? image : `/uploads/products/${image}`
            );
        }

        res.json(product);
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ message: 'Error getting product details' });
    }
};

// Update product
exports.updateProduct = async (req, res) => {
    try {
        upload(req, res, async (err) => {
            if (err) {
                return res.status(400).json({ message: err.message });
            }

            const product = await Product.findById(req.params.id);
            if (!product) {
                return res.status(404).json({ message: 'Product not found' });
            }

            // Check if user is the vendor
            if (product.vendor.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Not authorized to update this product' });
            }

            const updateData = { ...req.body };

            // Handle price update
            if (updateData.price) {
                updateData.price = parseFloat(updateData.price);
            }

            // Handle image updates
            if (req.files && req.files.length > 0) {
                // Delete old images
                for (const imageUrl of product.images) {
                    const filename = imageUrl.split('/').pop();
                    await deleteFile(path.join(__dirname, '../../uploads/products', filename));
                }
                // Add new images
                updateData.images = req.files.map(file => getImageUrl(file.filename));
            }

            // Validate updated data
            const errors = validateProduct({ ...product.toObject(), ...updateData });
            if (errors.length > 0) {
                // Delete newly uploaded files if validation fails
                if (req.files) {
                    for (const file of req.files) {
                        await deleteFile(file.path);
                    }
                }
                return res.status(400).json({ errors });
            }

            // Update product
            const updatedProduct = await Product.findByIdAndUpdate(
                req.params.id,
                { $set: updateData },
                { new: true }
            ).populate('vendor', 'name email');

            res.json(updatedProduct);
        });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ message: 'Error updating product' });
    }
};

// Delete product
exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if user is the vendor
        if (product.vendor.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this product' });
        }

        // Check for active rental requests
        const activeRequests = await RentalRequest.find({
            product: req.params.id,
            status: { $in: ['pending', 'approved'] }
        });

        if (activeRequests.length > 0) {
            return res.status(400).json({
                message: 'Cannot delete product with active rental requests'
            });
        }

        // Delete product images
        for (const imageUrl of product.images) {
            const filename = imageUrl.split('/').pop();
            await deleteFile(path.join(__dirname, '../../uploads/products', filename));
        }

        // Delete the product
        await product.deleteOne();

        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ message: 'Error deleting product' });
    }
};