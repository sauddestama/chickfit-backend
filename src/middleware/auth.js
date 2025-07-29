const { verifyToken, extractTokenFromHeader } = require('../config/auth');
const { getUserById } = require('../config/database');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = extractTokenFromHeader(authHeader);

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token is required'
            });
        }

        // Verify token
        const decoded = verifyToken(token);
        
        // Get user from database
        const userResult = await getUserById(decoded.userId);
        if (!userResult.success || !userResult.data.length) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token - user not found'
            });
        }

        // Add user data to request object
        req.user = {
            id: userResult.data[0].id,
            email: userResult.data[0].email,
            name: userResult.data[0].name,
            role: userResult.data[0].role_name,
            role_id: userResult.data[0].role_id
        };

        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

// Middleware to check user role
const authorizeRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
            });
        }

        next();
    };
};

// Middleware to check if user is farmer
const requireFarmer = authorizeRole('farmer');

// Middleware to check if user is veterinarian
const requireVeterinarian = authorizeRole('veterinarian');

// Middleware to check if user is administrator
const requireAdmin = authorizeRole('administrator');

// Middleware to check if user is veterinarian or admin
const requireVetOrAdmin = authorizeRole('veterinarian', 'administrator');

// Middleware to check if user owns the resource or is admin
const requireOwnerOrAdmin = (userIdField = 'userId') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const requestedUserId = parseInt(req.params[userIdField] || req.body[userIdField]);
        const isOwner = req.user.id === requestedUserId;
        const isAdmin = req.user.role === 'administrator';

        if (!isOwner && !isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You can only access your own resources.'
            });
        }

        next();
    };
};

// Optional authentication - doesn't fail if no token provided
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = extractTokenFromHeader(authHeader);

        if (token) {
            const decoded = verifyToken(token);
            const userResult = await getUserById(decoded.userId);
            
            if (userResult.success && userResult.data.length > 0) {
                req.user = {
                    id: userResult.data[0].id,
                    email: userResult.data[0].email,
                    name: userResult.data[0].name,
                    role: userResult.data[0].role_name,
                    role_id: userResult.data[0].role_id
                };
            }
        }

        next();
    } catch (error) {
        // Continue without authentication if token is invalid
        next();
    }
};

module.exports = {
    authenticateToken,
    authorizeRole,
    requireFarmer,
    requireVeterinarian,
    requireAdmin,
    requireVetOrAdmin,
    requireOwnerOrAdmin,
    optionalAuth
};