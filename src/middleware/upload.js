const multer = require('multer');
const path = require('path');

// Configure multer for memory storage
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (req, file, cb) => {
    // Check if file is an image
    if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed'), false);
    }

    // Check allowed image types
    const allowedTypes = process.env.ALLOWED_IMAGE_TYPES.split(',');
    if (!allowedTypes.includes(file.mimetype)) {
        return cb(new Error(`Only ${allowedTypes.join(', ')} files are allowed`), false);
    }

    cb(null, true);
};

// Configure multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_IMAGE_SIZE) || 1048576, // 1MB default
        files: 1 // Only allow single file upload
    },
    fileFilter: fileFilter
});

// Middleware for single image upload
const uploadSingle = upload.single('image');

// Enhanced upload middleware with error handling
const handleImageUpload = (req, res, next) => {
    uploadSingle(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: `File size too large. Maximum size is ${Math.round(parseInt(process.env.MAX_IMAGE_SIZE) / 1024 / 1024)}MB`
                });
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({
                    success: false,
                    message: 'Only one file is allowed per upload'
                });
            }
            return res.status(400).json({
                success: false,
                message: `Upload error: ${err.message}`
            });
        } else if (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }

        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file uploaded'
            });
        }

        next();
    });
};

// Middleware for multiple file upload (if needed later)
const uploadMultiple = upload.array('images', 5);

const handleMultipleImageUpload = (req, res, next) => {
    uploadMultiple(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: `File size too large. Maximum size is ${Math.round(parseInt(process.env.MAX_IMAGE_SIZE) / 1024 / 1024)}MB`
                });
            }
            if (err.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({
                    success: false,
                    message: 'Maximum 5 files allowed per upload'
                });
            }
            return res.status(400).json({
                success: false,
                message: `Upload error: ${err.message}`
            });
        } else if (err) {
            return res.status(400).json({
                success: false,
                message: err.message
            });
        }

        // Check if files were uploaded
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No image files uploaded'
            });
        }

        next();
    });
};

module.exports = {
    upload,
    uploadSingle,
    handleImageUpload,
    uploadMultiple,
    handleMultipleImageUpload
};