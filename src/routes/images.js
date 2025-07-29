const express = require('express');
const router = express.Router();
const { 
    uploadImageWithPrediction, 
    getImageHistory, 
    getImageDetails 
} = require('../controllers/imageController');
const { authenticateToken, requireOwnerOrAdmin } = require('../middleware/auth');
const { handleImageUpload } = require('../middleware/upload');
const { validate, idParamSchema, paginationSchema } = require('../middleware/validation');

// Routes
router.post('/upload', 
    authenticateToken, 
    handleImageUpload, 
    uploadImageWithPrediction
);

router.get('/history/:userId', 
    authenticateToken, 
    validate(idParamSchema, 'params'),
    validate(paginationSchema, 'query'),
    requireOwnerOrAdmin('userId'),
    getImageHistory
);

router.get('/:id', 
    authenticateToken, 
    validate(idParamSchema, 'params'),
    getImageDetails
);

module.exports = router;