const express = require('express');
const router = express.Router();
const { authenticateToken, requireVetOrAdmin } = require('../middleware/auth');
const { executeQuery } = require('../config/database');

// Get diagnosis history for user
router.get('/history/:userId', authenticateToken, async (req, res) => {
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
                d.id,
                d.label,
                d.confidence,
                d.verified_by,
                d.verified_at,
                d.created_at,
                i.filename,
                i.path,
                v.name as verified_by_name
            FROM diagnoses d
            JOIN images i ON d.image_id = i.id
            LEFT JOIN users v ON d.verified_by = v.id
            WHERE d.user_id = ?
            ORDER BY d.created_at DESC
        `;

        const result = await executeQuery(query, [userId]);
        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch diagnosis history'
            });
        }

        const diagnoses = result.data.map(diagnosis => ({
            id: diagnosis.id,
            label: diagnosis.label,
            confidence: diagnosis.confidence,
            verified: !!diagnosis.verified_by,
            verified_by: diagnosis.verified_by_name,
            verified_at: diagnosis.verified_at,
            created_at: diagnosis.created_at,
            image: {
                filename: diagnosis.filename,
                url: `https://storage.googleapis.com/${process.env.GOOGLE_CLOUD_BUCKET}/${diagnosis.path}`
            }
        }));

        res.status(200).json({
            success: true,
            data: { diagnoses }
        });

    } catch (error) {
        console.error('Get diagnosis history error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Verify diagnosis (veterinarian only)
router.put('/:id/verify', authenticateToken, requireVetOrAdmin, async (req, res) => {
    try {
        const diagnosisId = parseInt(req.params.id);
        const veterinarianId = req.user.id;

        const query = 'UPDATE diagnoses SET verified_by = ?, verified_at = NOW() WHERE id = ?';
        const result = await executeQuery(query, [veterinarianId, diagnosisId]);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to verify diagnosis'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Diagnosis verified successfully'
        });

    } catch (error) {
        console.error('Verify diagnosis error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;