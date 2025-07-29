const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { executeQuery } = require('../config/database');

// Get all published articles
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT 
                a.id,
                a.title,
                a.content,
                a.thumbnail_url,
                a.created_at,
                u.name as author_name
            FROM articles a
            JOIN users u ON a.admin_id = u.id
            WHERE a.published = TRUE
            ORDER BY a.created_at DESC
        `;

        const result = await executeQuery(query);
        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch articles'
            });
        }

        res.status(200).json({
            success: true,
            data: { articles: result.data }
        });

    } catch (error) {
        console.error('Get articles error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get specific article
router.get('/:id', async (req, res) => {
    try {
        const articleId = parseInt(req.params.id);

        const query = `
            SELECT 
                a.id,
                a.title,
                a.content,
                a.thumbnail_url,
                a.created_at,
                u.name as author_name
            FROM articles a
            JOIN users u ON a.admin_id = u.id
            WHERE a.id = ? AND a.published = TRUE
        `;

        const result = await executeQuery(query, [articleId]);
        if (!result.success || result.data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Article not found'
            });
        }

        res.status(200).json({
            success: true,
            data: { article: result.data[0] }
        });

    } catch (error) {
        console.error('Get article error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Create article (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { title, content, thumbnail_url, published = false } = req.body;
        const admin_id = req.user.id;

        const query = `
            INSERT INTO articles (admin_id, title, content, thumbnail_url, published, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        `;

        const result = await executeQuery(query, [admin_id, title, content, thumbnail_url, published]);
        if (!result.success) {
            return res.status(500).json({
                success: false,
                message: 'Failed to create article'
            });
        }

        res.status(201).json({
            success: true,
            message: 'Article created successfully',
            data: { article_id: result.data.insertId }
        });

    } catch (error) {
        console.error('Create article error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;