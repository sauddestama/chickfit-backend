const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Compress and resize image
const processImage = async (imageBuffer, options = {}) => {
    try {
        const {
            maxWidth = 1024,
            maxHeight = 1024,
            quality = 80,
            format = 'jpeg'
        } = options;

        // Process image with Sharp
        let processedBuffer = await sharp(imageBuffer)
            .resize(maxWidth, maxHeight, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ quality: quality })
            .toBuffer();

        // Check if processed image meets size requirements
        const maxSize = parseInt(process.env.MAX_IMAGE_SIZE) || 1048576; // 1MB
        if (processedBuffer.length > maxSize) {
            // Reduce quality further if still too large
            let reduceQuality = quality - 10;
            while (processedBuffer.length > maxSize && reduceQuality > 10) {
                processedBuffer = await sharp(imageBuffer)
                    .resize(maxWidth, maxHeight, {
                        fit: 'inside',
                        withoutEnlargement: true
                    })
                    .jpeg({ quality: reduceQuality })
                    .toBuffer();
                reduceQuality -= 10;
            }
            
            // If still too large, reduce dimensions
            if (processedBuffer.length > maxSize) {
                const newWidth = Math.floor(maxWidth * 0.8);
                const newHeight = Math.floor(maxHeight * 0.8);
                processedBuffer = await sharp(imageBuffer)
                    .resize(newWidth, newHeight, {
                        fit: 'inside',
                        withoutEnlargement: true
                    })
                    .jpeg({ quality: 70 })
                    .toBuffer();
            }
        }

        return {
            success: true,
            buffer: processedBuffer,
            metadata: await sharp(processedBuffer).metadata()
        };

    } catch (error) {
        console.error('Image processing error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Generate unique filename
const generateFileName = (originalName, userId = null) => {
    const timestamp = Date.now();
    const uuid = uuidv4().split('-')[0]; // Use first part of UUID
    const extension = path.extname(originalName).toLowerCase() || '.jpg';
    
    if (userId) {
        return `${userId}_${timestamp}_${uuid}${extension}`;
    }
    
    return `${timestamp}_${uuid}${extension}`;
};

// Validate image file
const validateImage = async (imageBuffer) => {
    try {
        const metadata = await sharp(imageBuffer).metadata();
        
        // Check if it's a valid image
        if (!metadata.format) {
            return {
                valid: false,
                error: 'Invalid image format'
            };
        }

        // Check image dimensions (minimum requirements)
        const minWidth = 100;
        const minHeight = 100;
        const maxWidth = 4000;
        const maxHeight = 4000;

        if (metadata.width < minWidth || metadata.height < minHeight) {
            return {
                valid: false,
                error: `Image too small. Minimum dimensions: ${minWidth}x${minHeight}px`
            };
        }

        if (metadata.width > maxWidth || metadata.height > maxHeight) {
            return {
                valid: false,
                error: `Image too large. Maximum dimensions: ${maxWidth}x${maxHeight}px`
            };
        }

        return {
            valid: true,
            metadata: metadata
        };

    } catch (error) {
        console.error('Image validation error:', error);
        return {
            valid: false,
            error: 'Failed to validate image'
        };
    }
};

// Convert image to base64 for ML service
const imageToBase64 = (imageBuffer) => {
    try {
        return imageBuffer.toString('base64');
    } catch (error) {
        console.error('Base64 conversion error:', error);
        return null;
    }
};

// Create thumbnail
const createThumbnail = async (imageBuffer, size = 200) => {
    try {
        const thumbnailBuffer = await sharp(imageBuffer)
            .resize(size, size, {
                fit: 'cover',
                position: 'center'
            })
            .jpeg({ quality: 80 })
            .toBuffer();

        return {
            success: true,
            buffer: thumbnailBuffer
        };

    } catch (error) {
        console.error('Thumbnail creation error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

// Extract image metadata for analysis
const getImageAnalysis = async (imageBuffer) => {
    try {
        const metadata = await sharp(imageBuffer).metadata();
        const stats = await sharp(imageBuffer).stats();

        return {
            success: true,
            analysis: {
                format: metadata.format,
                width: metadata.width,
                height: metadata.height,
                channels: metadata.channels,
                density: metadata.density,
                hasAlpha: metadata.hasAlpha,
                isProgressive: metadata.isProgressive,
                size: imageBuffer.length,
                colorSpace: metadata.space,
                brightness: stats.channels ? stats.channels[0].mean : null,
                contrast: stats.channels ? stats.channels[0].stdev : null
            }
        };

    } catch (error) {
        console.error('Image analysis error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

module.exports = {
    processImage,
    generateFileName,
    validateImage,
    imageToBase64,
    createThumbnail,
    getImageAnalysis
};