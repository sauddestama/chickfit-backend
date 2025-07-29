const jwt = require('jsonwebtoken');

// JWT configuration
const jwtConfig = {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRE || '24h',
    issuer: 'chickfit-api',
    audience: 'chickfit-mobile-app'
};

// Generate JWT token
const generateToken = (payload) => {
    try {
        return jwt.sign(payload, jwtConfig.secret, {
            expiresIn: jwtConfig.expiresIn,
            issuer: jwtConfig.issuer,
            audience: jwtConfig.audience
        });
    } catch (error) {
        console.error('Token generation error:', error);
        throw new Error('Failed to generate token');
    }
};

// Verify JWT token
const verifyToken = (token) => {
    try {
        return jwt.verify(token, jwtConfig.secret, {
            issuer: jwtConfig.issuer,
            audience: jwtConfig.audience
        });
    } catch (error) {
        console.error('Token verification error:', error);
        throw new Error('Invalid token');
    }
};

// Decode JWT token without verification (for expired token info)
const decodeToken = (token) => {
    try {
        return jwt.decode(token, { complete: true });
    } catch (error) {
        console.error('Token decode error:', error);
        return null;
    }
};

// Extract token from request headers
const extractTokenFromHeader = (authHeader) => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null;
    }
    return authHeader.substring(7); // Remove 'Bearer ' prefix
};

// Check if token is expired
const isTokenExpired = (token) => {
    try {
        const decoded = decodeToken(token);
        if (!decoded || !decoded.payload.exp) {
            return true;
        }
        return Date.now() >= decoded.payload.exp * 1000;
    } catch (error) {
        return true;
    }
};

// Generate refresh token (longer expiry)
const generateRefreshToken = (payload) => {
    try {
        return jwt.sign(payload, jwtConfig.secret, {
            expiresIn: '7d', // 7 days for refresh token
            issuer: jwtConfig.issuer,
            audience: jwtConfig.audience
        });
    } catch (error) {
        console.error('Refresh token generation error:', error);
        throw new Error('Failed to generate refresh token');
    }
};

module.exports = {
    jwtConfig,
    generateToken,
    verifyToken,
    decodeToken,
    extractTokenFromHeader,
    isTokenExpired,
    generateRefreshToken
};