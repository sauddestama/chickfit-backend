const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const REQUEST_TIMEOUT = 30000; // 30 seconds

// Make prediction request to ML service
const predictImage = async (imageBase64) => {
    try {
        const response = await axios.post(
            `${ML_SERVICE_URL}/predict`,
            {
                image: imageBase64
            },
            {
                timeout: REQUEST_TIMEOUT,
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data && response.data.success) {
            return {
                success: true,
                predictions: response.data.predictions,
                model_info: response.data.model_info || null
            };
        } else {
            return {
                success: false,
                error: response.data.message || 'Prediction failed'
            };
        }

    } catch (error) {
        console.error('ML service prediction error:', error);
        return {
            success: false,
            error: error.response?.data?.message || 'ML service unavailable'
        };
    }
};

// Get ML service health status
const getMLServiceHealth = async () => {
    try {
        const response = await axios.get(
            `${ML_SERVICE_URL}/health`,
            { timeout: 5000 }
        );

        return {
            success: true,
            status: response.data.status,
            version: response.data.version || null
        };

    } catch (error) {
        console.error('ML service health check error:', error);
        return {
            success: false,
            error: 'ML service unavailable'
        };
    }
};

// Get current model information
const getModelInfo = async () => {
    try {
        const response = await axios.get(
            `${ML_SERVICE_URL}/model/info`,
            { timeout: 10000 }
        );

        return {
            success: true,
            model: response.data.model
        };

    } catch (error) {
        console.error('ML service model info error:', error);
        return {
            success: false,
            error: 'Failed to get model information'
        };
    }
};

// Trigger model retraining
const triggerRetraining = async (adminId, notes = '') => {
    try {
        const response = await axios.post(
            `${ML_SERVICE_URL}/retrain`,
            {
                admin_id: adminId,
                notes: notes
            },
            {
                timeout: 60000, // 1 minute for retraining trigger
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        return {
            success: true,
            message: response.data.message,
            task_id: response.data.task_id || null
        };

    } catch (error) {
        console.error('ML service retraining error:', error);
        return {
            success: false,
            error: error.response?.data?.message || 'Failed to trigger retraining'
        };
    }
};

// Process prediction results and determine label
const processPredictionResults = (predictions) => {
    try {
        // Find the class with highest confidence
        let maxConfidence = 0;
        let predictedLabel = 'Sehat'; // Default to healthy

        const classes = Object.keys(predictions);
        
        for (const className of classes) {
            const confidence = predictions[className];
            if (confidence > maxConfidence) {
                maxConfidence = confidence;
                predictedLabel = className;
            }
        }

        // Return structured result
        return {
            label: predictedLabel,
            confidence: maxConfidence,
            all_predictions: predictions,
            is_confident: maxConfidence >= 0.7 // Consider confident if > 70%
        };

    } catch (error) {
        console.error('Prediction processing error:', error);
        return {
            label: 'Sehat',
            confidence: 0.0,
            all_predictions: predictions,
            is_confident: false,
            error: 'Failed to process predictions'
        };
    }
};

// Validate prediction response format
const validatePredictionResponse = (predictions) => {
    const expectedClasses = ['Coccidiosis', 'ND', 'Sehat'];
    
    if (!predictions || typeof predictions !== 'object') {
        return false;
    }

    // Check if all expected classes are present
    for (const className of expectedClasses) {
        if (!(className in predictions)) {
            return false;
        }
        
        // Check if confidence is a valid number between 0 and 1
        const confidence = predictions[className];
        if (typeof confidence !== 'number' || confidence < 0 || confidence > 1) {
            return false;
        }
    }

    // Check if confidences sum to approximately 1 (allowing for floating point errors)
    const sum = Object.values(predictions).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1.0) > 0.01) {
        return false;
    }

    return true;
};

// Batch prediction for multiple images
const predictBatchImages = async (imageBase64Array) => {
    try {
        const response = await axios.post(
            `${ML_SERVICE_URL}/predict/batch`,
            {
                images: imageBase64Array
            },
            {
                timeout: 60000, // 1 minute for batch processing
                headers: {
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data && response.data.success) {
            return {
                success: true,
                predictions: response.data.predictions
            };
        } else {
            return {
                success: false,
                error: response.data.message || 'Batch prediction failed'
            };
        }

    } catch (error) {
        console.error('ML service batch prediction error:', error);
        return {
            success: false,
            error: error.response?.data?.message || 'ML service unavailable'
        };
    }
};

module.exports = {
    predictImage,
    getMLServiceHealth,
    getModelInfo,
    triggerRetraining,
    processPredictionResults,
    validatePredictionResponse,
    predictBatchImages
};