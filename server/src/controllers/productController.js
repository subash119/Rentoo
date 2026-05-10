const mongoose = require('mongoose');
const Product = require('../models/Product');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const RentalRequest = require('../models/RentalRequest');

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
}).array('images', 5);

const getImageUrl = (filename) => {
    return `${process.env.VITE_UPLOAD_URL || 'http://localhost:5000/uploads'}/products/${filename}`;
};

const deleteFile = async (filepath) => {
    try {
        await fs.unlink(filepath);
    } catch (error) {
        console.error(`Error deleting file ${filepath}:`, error);
    }
};

const validateProduct = (data) => {
    const errors = [];

    if (!data.name || data.name.trim().length < 3) {
        errors.push('Name must be at least 3 characters long');
    }
    if (!data.description || data.description.trim().length < 10) {
        errors.push('Description must be at least 10 characters long');
    }
    if (!data.dailyRate || isNaN(data.dailyRate) || data.dailyRate <= 0) {
        errors.push('Price must be a positive number');
    }
    if (!data.category || !['Electronics', 'Furniture', 'Tools', 'Sports', 'Others'].includes(data.category)) {
        errors.push('Invalid category');
    }
    if (data.condition && !['New', 'Like New', 'Good', 'Fair'].includes(data.condition)) {
        errors.push('Invalid condition');
    }

    return errors;
};

exports.createProduct = async (req, res) => {
    try {
        upload(req, res, async (err) => {
            if (err) {
                return res.status(400).json({ message: err.message });
            }

            let contactDetails = {};
            try {
                contactDetails = req.body.contactDetails ? JSON.parse(req.body.contactDetails) : {};
            } catch (e) {
                contactDetails = {};
            }

            const productData = {
                name: req.body.name,
                description: req.body.description,
                category: req.body.category,
                dailyRate: parseFloat(req.body.price),
                location: req.body.location,
                condition: req.body.condition,
                contactDetails,
                vendor: req.user._id,
                images: req.files ? req.files.map(file => getImageUrl(file.filename)) : []
            };

            const errors = validateProduct(productData);
            if (errors.length > 0) {
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

exports.getProducts = async (req, res) => {
    try {
        const {
            search, category, minPrice, maxPrice, condition,
            sortBy = 'createdAt', order = 'desc', page = 1, limit = 10
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
            query.dailyRate = {};
            if (minPrice) query.dailyRate.$gte = parseFloat(minPrice);
            if (maxPrice) query.dailyRate.$lte = parseFloat(maxPrice);
        }

        const products = await Product.find(query)
            .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('vendor', 'name email');

        const total = await Product.countDocuments(query);

        res.json({ products, total, pages: Math.ceil(total / limit) });
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ message: 'Error getting products' });
    }
};

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

        res.json(product);
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ message: 'Error getting product details' });
    }
};

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

            if (product.vendor.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Not authorized to update this product' });
            }

            const updateData = { ...req.body };

            if (updateData.price) {
                updateData.dailyRate = parseFloat(updateData.price);
                delete updateData.price;
            }

            if (req.files && req.files.length > 0) {
                for (const imageUrl of product.images) {
                    const filename = imageUrl.split('/').pop();
                    await deleteFile(path.join(__dirname, '../../uploads/products', filename));
                }
                updateData.images = req.files.map(file => getImageUrl(file.filename));
            }

            const errors = validateProduct({ ...product.toObject(), ...updateData });
            if (errors.length > 0) {
                if (req.files) {
                    for (const file of req.files) {
                        await deleteFile(file.path);
                    }
                }
                return res.status(400).json({ errors });
            }

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

exports.deleteProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        if (product.vendor.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this product' });
        }

        const activeRequests = await RentalRequest.find({
            product: req.params.id,
            status: { $in: ['pending', 'approved'] }
        });

        if (activeRequests.length > 0) {
            return res.status(400).json({ message: 'Cannot delete product with active rental requests' });
        }

        for (const imageUrl of product.images) {
            const filename = imageUrl.split('/').pop();
            await deleteFile(path.join(__dirname, '../../uploads/products', filename));
        }

        await product.deleteOne();
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ message: 'Error deleting product' });
    }
};