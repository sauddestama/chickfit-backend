require('dotenv').config();
const mysql = require('mysql2/promise');
const axios = require('axios');

async function testConnections() {
    console.log('🔍 Testing all connections...\n');
    
    // Test Database
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT
        });
        
        const [rows] = await connection.execute('SELECT COUNT(*) as count FROM roles');
        console.log('✅ Database: SUCCESS');
        console.log(`   Roles count: ${rows[0].count}`);
        await connection.end();
    } catch (error) {
        console.log('❌ Database: FAILED');
        console.log(`   Error: ${error.message}`);
    }
    
    // Test ML Service
    try {
        const response = await axios.get(`${process.env.ML_SERVICE_URL}/model/info`);
        console.log('✅ ML Service: SUCCESS');
        console.log(`   Accuracy: ${response.data.model.accuracy * 100}%`);
        console.log(`   Classes: ${response.data.model.classes.join(', ')}`);
    } catch (error) {
        console.log('❌ ML Service: FAILED');
        console.log(`   Error: ${error.message}`);
    }
    
    // Test Google Cloud Storage
    try {
        const { Storage } = require('@google-cloud/storage');
        const storage = new Storage({
            projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
            keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        });
        
        const bucket = storage.bucket(process.env.GOOGLE_CLOUD_BUCKET);
        const [exists] = await bucket.exists();
        console.log('✅ Google Cloud Storage: SUCCESS');
        console.log(`   Bucket exists: ${exists}`);
    } catch (error) {
        console.log('❌ Google Cloud Storage: FAILED');
        console.log(`   Error: ${error.message}`);
    }
}

testConnections();