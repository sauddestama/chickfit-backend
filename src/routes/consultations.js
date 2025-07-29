const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { executeQuery } = require('../config/database');

// Get user's consultations
router.get('/:userId', authenticateToken, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        
        // Check authorization
        if (req.user.id !== userId && req.user.role !== 'administrator') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const query = `
            SELECT 
                c.id,
                c.status,
                c.created_at,
                f.name as farmer_name,
                v.name as veterinarian_name,
                d.label as diagnosis_label
            FROM consultations c
            JOIN users f ON c.farmer_id = f.id
            JOIN users v ON c.veterinarian_id = v.id
            LEFT JOIN diagnoses d ON c.diagnosis_id = d.id
            WHERE c.farmer_id = ? OR c.veterinarian_id = ?
            ORDER BY c.created_at DESC
        `;

        const result = await executeQuery(query, [userId, userId]);
        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch consultations'
            });
        }

        res.status(200).json({
            success: true,
            data: { consultations: result.data }
        });

    } catch (error) {
        console.error('Get consultations error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Create new consultation
router.post('/', authenticateToken, async (req, res) => {
    try {
        const { veterinarian_id, diagnosis_id } = req.body;
        const farmer_id = req.user.id;

        // Check if farmer role
        if (req.user.role !== 'farmer') {
            return res.status(403).json({
                success: false,
                message: 'Only farmers can create consultations'
            });
        }

        const query = `
            INSERT INTO consultations (farmer_id, veterinarian_id, diagnosis_id, status, created_at)
            VALUES (?, ?, ?, 'open', NOW())
        `;

        const result = await executeQuery(query, [farmer_id, veterinarian_id, diagnosis_id]);
        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to create consultation'
            });
        }

        res.status(201).json({
            success: true,
            message: 'Consultation created successfully',
            data: { consultation_id: result.data.insertId }
        });

    } catch (error) {
        console.error('Create consultation error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;