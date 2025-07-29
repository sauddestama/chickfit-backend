const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { executeQuery } = require('../config/database');

// Get all veterinarians (for consultation selection)
router.get('/veterinarians', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT id, name, specialization, rating, is_available 
            FROM users 
            WHERE role_id = (SELECT id FROM roles WHERE name = 'veterinarian')
            AND is_available = TRUE
            ORDER BY rating DESC
        `;
        
        const result = await executeQuery(query);
        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch veterinarians'
            });
        }

        res.status(200).json({
            success: true,
            data: { veterinarians: result.data }
        });

    } catch (error) {
        console.error('Get veterinarians error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;