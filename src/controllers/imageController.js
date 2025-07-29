const { uploadFile } = require('../config/cloudStorage');
const { executeQuery } = require('../config/database');
const { 
    processImage, 
    generateFileName, 
    validateImage, 
    imageToBase64 
} = require('../utils/imageProcessor');
const { 
    predictImage, 
    processPredictionResults, 
    validatePredictionResponse 
} = require('../services/mlService');

// Upload image with automatic AI prediction
const uploadImageWithPrediction = async (req, res) => {
    try {
        const userId = req.user.id;
        const imageBuffer = req.file.buffer;
        const originalName = req.file.originalname;
        const mimeType = req.file.mimetype;

        // Validate image
        const validation = await validateImage(imageBuffer);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: validation.error
            });
        }

        // Process image (compress and resize)
        const processed = await processImage(imageBuffer);
        if (!processed.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to process image'
            });
        }

        // Generate unique filename
        const fileName = generateFileName(originalName, userId);

        // Convert to base64 for ML prediction
        const imageBase64 = imageToBase64(processed.buffer);
        if (!imageBase64) {
            return res.status(500).json({
                success: false,
                message: 'Failed to convert image for prediction'
            });
        }

        // Get AI prediction
        const predictionResult = await predictImage(imageBase64);
        if (!predictionResult.success) {
            return res.status(500).json({
                success: false,
                message: `Prediction failed: ${predictionResult.error}`
            });
        }

        // Validate prediction format
        if (!validatePredictionResponse(predictionResult.predictions)) {
            return res.status(500).json({
                success: false,
                message: 'Invalid prediction response format'
            });
        }

        // Process prediction results
        const processedPrediction = processPredictionResults(predictionResult.predictions);
        
        // Determine upload folder based on prediction
        const folder = `user_uploads/${processedPrediction.label}`;

        // Upload to Google Cloud Storage
        const uploadResult = await uploadFile(fileName, processed.buffer, mimeType, folder);
        if (!uploadResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to upload image to storage'
            });
        }

        // Save image metadata to database
        const imageInsertQuery = `
            INSERT INTO images (user_id, filename, path, source, uploaded_at) 
            VALUES (?, ?, ?, 'upload', NOW())
        `;
        const imageResult = await executeQuery(imageInsertQuery, [
            userId, 
            fileName, 
            uploadResult.fileName
        ]);

        if (!imageResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to save image metadata'
            });
        }

        const imageId = imageResult.data.insertId;

        // Get current model info (assuming we have a default model)
        const modelQuery = 'SELECT id FROM cnn_models ORDER BY trained_at DESC LIMIT 1';
        const modelResult = await executeQuery(modelQuery);
        const modelId = modelResult.success && modelResult.data.length > 0 ? 
            modelResult.data[0].id : null;

        // Save diagnosis result to database
        const diagnosisInsertQuery = `
            INSERT INTO diagnoses (user_id, model_id, image_id, label, confidence, created_at) 
            VALUES (?, ?, ?, ?, ?, NOW())
        `;
        const diagnosisResult = await executeQuery(diagnosisInsertQuery, [
            userId,
            modelId,
            imageId,
            processedPrediction.label,
            processedPrediction.confidence
        ]);

        if (!diagnosisResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to save diagnosis result'
            });
        }

        const diagnosisId = diagnosisResult.data.insertId;

        // Return success response with prediction results
        res.status(201).json({
            success: true,
            message: 'Image uploaded and analyzed successfully',
            data: {
                image: {
                    id: imageId,
                    filename: fileName,
                    url: uploadResult.publicUrl,
                    size: processed.buffer.length,
                    dimensions: {
                        width: processed.metadata.width,
                        height: processed.metadata.height
                    }
                },
                prediction: {
                    id: diagnosisId,
                    label: processedPrediction.label,
                    confidence: processedPrediction.confidence,
                    is_confident: processedPrediction.is_confident,
                    all_predictions: processedPrediction.all_predictions,
                    model_info: predictionResult.model_info
                }
            }
        });

    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during image upload'
        });
    }
};

// Get user's uploaded images history
const getImageHistory = async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Check authorization (user can only see their own images or admin can see all)
        if (req.user.id !== userId && req.user.role !== 'administrator') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Get total count
        const countQuery = 'SELECT COUNT(*) as total FROM images WHERE user_id = ?';
        const countResult = await executeQuery(countQuery, [userId]);
        const totalImages = countResult.success ? countResult.data[0].total : 0;

        // Get images with diagnosis information
        const imagesQuery = `
            SELECT 
                i.id,
                i.filename,
                i.path,
                i.uploaded_at,
                d.id as diagnosis_id,
                d.label,
                d.confidence,
                d.verified_by,
                d.verified_at,
                u.name as verified_by_name
            FROM images i
            LEFT JOIN diagnoses d ON i.id = d.image_id
            LEFT JOIN users u ON d.verified_by = u.id
            WHERE i.user_id = ?
            ORDER BY i.uploaded_at DESC
            LIMIT ? OFFSET ?
        `;

        const imagesResult = await executeQuery(imagesQuery, [userId, limit, offset]);
        if (!imagesResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch image history'
            });
        }

        const images = imagesResult.data.map(image => ({
            id: image.id,
            filename: image.filename,
            url: `https://storage.googleapis.com/${process.env.GOOGLE_CLOUD_BUCKET}/${image.path}`,
            uploaded_at: image.uploaded_at,
            diagnosis: image.diagnosis_id ? {
                id: image.diagnosis_id,
                label: image.label,
                confidence: image.confidence,
                verified: !!image.verified_by,
                verified_by: image.verified_by_name,
                verified_at: image.verified_at
            } : null
        }));

        res.status(200).json({
            success: true,
            data: {
                images,
                pagination: {
                    page,
                    limit,
                    total: totalImages,
                    pages: Math.ceil(totalImages / limit)
                }
            }
        });

    } catch (error) {
        console.error('Get image history error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching image history'
        });
    }
};

// Get specific image details
const getImageDetails = async (req, res) => {
    try {
        const imageId = parseInt(req.params.id);

        // Get image with diagnosis information
        const imageQuery = `
            SELECT 
                i.id,
                i.user_id,
                i.filename,
                i.path,
                i.uploaded_at,
                u.name as user_name,
                d.id as diagnosis_id,
                d.label,
                d.confidence,
                d.verified_by,
                d.verified_at,
                v.name as verified_by_name,
                m.name as model_name,
                m.version as model_version
            FROM images i
            JOIN users u ON i.user_id = u.id
            LEFT JOIN diagnoses d ON i.id = d.image_id
            LEFT JOIN users v ON d.verified_by = v.id
            LEFT JOIN cnn_models m ON d.model_id = m.id
            WHERE i.id = ?
        `;

        const imageResult = await executeQuery(imageQuery, [imageId]);
        if (!imageResult.success || imageResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Image not found'
            });
        }

        const image = imageResult.data[0];

        // Check authorization
        if (req.user.id !== image.user_id && req.user.role !== 'administrator') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                image: {
                    id: image.id,
                    filename: image.filename,
                    url: `https://storage.googleapis.com/${process.env.GOOGLE_CLOUD_BUCKET}/${image.path}`,
                    uploaded_at: image.uploaded_at,
                    user: {
                        id: image.user_id,
                        name: image.user_name
                    },
                    diagnosis: image.diagnosis_id ? {
                        id: image.diagnosis_id,
                        label: image.label,
                        confidence: image.confidence,
                        verified: !!image.verified_by,
                        verified_by: image.verified_by_name,
                        verified_at: image.verified_at,
                        model: {
                            name: image.model_name,
                            version: image.model_version
                        }
                    } : null
                }
            }
        });

    } catch (error) {
        console.error('Get image details error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching image details'
        });
    }
};

module.exports = {
    uploadImageWithPrediction,
    getImageHistory,
    getImageDetails
};