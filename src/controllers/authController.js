const bcrypt = require('bcryptjs');
const { generateToken } = require('../config/auth');
const { 
    executeQuery, 
    getUserByEmail, 
    getUserById, 
    createUser, 
    getRoleByName 
} = require('../config/database');

// User registration
const register = async (req, res) => {
    try {
        const { name, email, password, role, specialization } = req.body;

        // Check if user already exists
        const existingUser = await getUserByEmail(email);
        if (existingUser.success && existingUser.data.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'User with this email already exists'
            });
        }

        // Get role ID
        const roleResult = await getRoleByName(role);
        if (!roleResult.success || roleResult.data.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role specified'
            });
        }

        const roleId = roleResult.data[0].id;

        // Hash password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create user data
        const userData = {
            name,
            email,
            password_hash: passwordHash,
            role_id: roleId
        };

        // Create user
        const createResult = await createUser(userData);
        if (!createResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to create user account'
            });
        }

        const userId = createResult.data.insertId;

        // Update veterinarian specialization if applicable
        if (role === 'veterinarian' && specialization) {
            const updateQuery = 'UPDATE users SET specialization = ? WHERE id = ?';
            await executeQuery(updateQuery, [specialization, userId]);
        }

        // Generate JWT token
        const tokenPayload = {
            userId: userId,
            email: email,
            role: role
        };

        const token = generateToken(tokenPayload);

        // Get created user data
        const newUser = await getUserById(userId);
        const user = newUser.data[0];

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role_name,
                    specialization: user.specialization,
                    created_at: user.created_at
                }
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during registration'
        });
    }
};

// User login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Get user by email
        const userResult = await getUserByEmail(email);
        if (!userResult.success || userResult.data.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = userResult.data[0];

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Generate JWT token
        const tokenPayload = {
            userId: user.id,
            email: user.email,
            role: user.role_name
        };

        const token = generateToken(tokenPayload);

        res.status(200).json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role_name,
                    specialization: user.specialization,
                    rating: user.rating,
                    is_available: user.is_available,
                    created_at: user.created_at
                }
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during login'
        });
    }
};

// Get current user profile
const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const userResult = await getUserById(userId);
        if (!userResult.success || userResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = userResult.data[0];

        res.status(200).json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role_name,
                    specialization: user.specialization,
                    rating: user.rating,
                    is_available: user.is_available,
                    created_at: user.created_at
                }
            }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching profile'
        });
    }
};

// Update user profile
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, specialization, is_available } = req.body;

        // Build update query dynamically
        const updateFields = [];
        const updateValues = [];

        if (name !== undefined) {
            updateFields.push('name = ?');
            updateValues.push(name);
        }

        if (specialization !== undefined && req.user.role === 'veterinarian') {
            updateFields.push('specialization = ?');
            updateValues.push(specialization);
        }

        if (is_available !== undefined && req.user.role === 'veterinarian') {
            updateFields.push('is_available = ?');
            updateValues.push(is_available);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid fields provided for update'
            });
        }

        updateValues.push(userId);

        const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
        const updateResult = await executeQuery(updateQuery, updateValues);

        if (!updateResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update profile'
            });
        }

        // Get updated user data
        const updatedUser = await getUserById(userId);
        const user = updatedUser.data[0];

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role_name,
                    specialization: user.specialization,
                    rating: user.rating,
                    is_available: user.is_available,
                    created_at: user.created_at
                }
            }
        });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while updating profile'
        });
    }
};

// Change password
const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        // Get current user
        const userResult = await getUserById(userId);
        if (!userResult.success || userResult.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = userResult.data[0];

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const saltRounds = 10;
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

        // Update password
        const updateQuery = 'UPDATE users SET password_hash = ? WHERE id = ?';
        const updateResult = await executeQuery(updateQuery, [newPasswordHash, userId]);

        if (!updateResult.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to update password'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while changing password'
        });
    }
};

module.exports = {
    register,
    login,
    getProfile,
    updateProfile,
    changePassword
};