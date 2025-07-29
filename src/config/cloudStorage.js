const { Storage } = require('@google-cloud/storage');

// Initialize Google Cloud Storage
const storage = new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    // keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

const bucket = storage.bucket(process.env.GOOGLE_CLOUD_BUCKET);

// Upload file to Google Cloud Storage
const uploadFile = async (fileName, fileBuffer, contentType, folder = '') => {
    try {
        const filePath = folder ? `${folder}/${fileName}` : fileName;
        const file = bucket.file(filePath);

        const stream = file.createWriteStream({
            metadata: {
                contentType: contentType,
                cacheControl: 'public, max-age=31536000'
            },
            resumable: false
        });

        return new Promise((resolve, reject) => {
            stream.on('error', (error) => {
                console.error('Upload error:', error);
                reject(error);
            });

            stream.on('finish', async () => {
                try {
                    // Make the file publicly readable
                    console.log('File uploaded successfully (private access)');
                    const publicUrl = `https://storage.googleapis.com/${process.env.GOOGLE_CLOUD_BUCKET}/${filePath}`;
                    resolve({
                        success: true,
                        fileName: filePath,
                        publicUrl: publicUrl
                    });
                } catch (error) {
                    reject(error);
                }
            });

            stream.end(fileBuffer);
        });
    } catch (error) {
        console.error('Upload file error:', error);
        return { success: false, error: error.message };
    }
};

// Delete file from Google Cloud Storage
const deleteFile = async (fileName) => {
    try {
        await bucket.file(fileName).delete();
        return { success: true, message: 'File deleted successfully' };
    } catch (error) {
        console.error('Delete file error:', error);
        return { success: false, error: error.message };
    }
};

// Get signed URL for file upload
const getSignedUploadUrl = async (fileName, contentType, expires = 3600000) => {
    try {
        const file = bucket.file(fileName);
        const options = {
            version: 'v4',
            action: 'write',
            expires: Date.now() + expires,
            contentType: contentType
        };

        const [signedUrl] = await file.getSignedUrl(options);
        return { success: true, signedUrl };
    } catch (error) {
        console.error('Get signed URL error:', error);
        return { success: false, error: error.message };
    }
};

// Check if file exists
const fileExists = async (fileName) => {
    try {
        const [exists] = await bucket.file(fileName).exists();
        return { success: true, exists };
    } catch (error) {
        console.error('File exists check error:', error);
        return { success: false, error: error.message };
    }
};

// List files in a folder
const listFiles = async (prefix = '') => {
    try {
        const [files] = await bucket.getFiles({ prefix });
        const fileList = files.map(file => ({
            name: file.name,
            size: file.metadata.size,
            updated: file.metadata.updated,
            contentType: file.metadata.contentType
        }));
        return { success: true, files: fileList };
    } catch (error) {
        console.error('List files error:', error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    storage,
    bucket,
    uploadFile,
    deleteFile,
    getSignedUploadUrl,
    fileExists,
    listFiles
};