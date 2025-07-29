const mysql = require('mysql2/promise');

const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+00:00',
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
const testConnection = async () => {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Database connected successfully');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
};

// Execute query with error handling
const executeQuery = async (query, params = []) => {
    try {
        const [results] = await pool.execute(query, params);
        return { success: true, data: results };
    } catch (error) {
        console.error('Database query error:', error);
        return { success: false, error: error.message };
    }
};

// Get user by email (for authentication)
const getUserByEmail = async (email) => {
    const query = `
        SELECT u.*, r.name as role_name 
        FROM users u 
        JOIN roles r ON u.role_id = r.id 
        WHERE u.email = ?
    `;
    return executeQuery(query, [email]);
};

// Get user by ID
const getUserById = async (id) => {
    const query = `
        SELECT u.*, r.name as role_name 
        FROM users u 
        JOIN roles r ON u.role_id = r.id 
        WHERE u.id = ?
    `;
    return executeQuery(query, [id]);
};

// Create new user
const createUser = async (userData) => {
    const { name, email, password_hash, role_id } = userData;
    const query = `
        INSERT INTO users (name, email, password_hash, role_id) 
        VALUES (?, ?, ?, ?)
    `;
    return executeQuery(query, [name, email, password_hash, role_id]);
};

// Get role by name
const getRoleByName = async (roleName) => {
    const query = 'SELECT * FROM roles WHERE name = ?';
    return executeQuery(query, [roleName]);
};

// Close database connection pool
const closePool = async () => {
    try {
        await pool.end();
        console.log('Database connection pool closed');
    } catch (error) {
        console.error('Error closing database pool:', error);
    }
};

module.exports = {
    pool,
    testConnection,
    executeQuery,
    getUserByEmail,
    getUserById,
    createUser,
    getRoleByName,
    closePool
};