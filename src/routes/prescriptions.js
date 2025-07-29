const express = require('express');
const router = express.Router();
const { authenticateToken, requireVeterinarian } = require('../middleware/auth');
const { executeQuery } = require('../config/database');

// Get user's prescriptions
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
                p.id,
                p.medicine,
                p.usage_instructions,
                p.notes,
                p.status,
                p.created_at,
                d.label as diagnosis_label,
                doc.name as doctor_name
            FROM prescriptions p
            JOIN users doc ON p.doctor_id = doc.id
            LEFT JOIN diagnoses d ON p.diagnosis_id = d.id
            WHERE p.farmer_id = ?
            ORDER BY p.created_at DESC
        `;

        const result = await executeQuery(query, [userId]);
        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch prescriptions'
            });
        }

        res.status(200).json({
            success: true,
            data: { prescriptions: result.data }
        });

    } catch (error) {
        console.error('Get prescriptions error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Create prescription (veterinarian only)
router.post('/', authenticateToken, requireVeterinarian, async (req, res) => {
    try {
        const { diagnosis_id, farmer_id, consultation_id, medicine, usage_instructions, notes } = req.body;
        const doctor_id = req.user.id;

        const query = `
            INSERT INTO prescriptions (diagnosis_id, doctor_id, farmer_id, consultation_id, medicine, usage_instructions, notes, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'waiting', NOW())
        `;

        const result = await executeQuery(query, [diagnosis_id, doctor_id, farmer_id, consultation_id, medicine, usage_instructions, notes]);
        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to create prescription'
            });
        }

        res.status(201).json({
            success: true,
            message: 'Prescription created successfully',
            data: { prescription_id: result.data.insertId }
        });

    } catch (error) {
        console.error('Create prescription error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;