const db = require('../config/db');

// Get all posts
exports.getAllPosts = (req, res) => {
    const query = 'SELECT * FROM posts ORDER BY created_at DESC';
    
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching posts:', err);
            return res.status(500).json({ message: 'Error fetching posts' });
        }
        res.json(results);
    });
};

// Get single post
exports.getPost = (req, res) => {
    const query = 'SELECT * FROM posts WHERE id = ?';
    
    db.query(query, [req.params.id], (err, results) => {
        if (err) {
            console.error('Error fetching post:', err);
            return res.status(500).json({ message: 'Error fetching post' });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.json(results[0]);
    });
};

// Create new post
exports.createPost = (req, res) => {
    const { title, content, type, author } = req.body;
    const query = 'INSERT INTO posts (title, content, type, author) VALUES (?, ?, ?, ?)';
    
    db.query(query, [title, content, type, author], (err, results) => {
        if (err) {
            console.error('Error creating post:', err);
            return res.status(400).json({ message: 'Error creating post' });
        }
        
        // Fetch the newly created post
        const newPostQuery = 'SELECT * FROM posts WHERE id = ?';
        db.query(newPostQuery, [results.insertId], (err, postResults) => {
            if (err) {
                console.error('Error fetching new post:', err);
                return res.status(500).json({ message: 'Post created but error fetching details' });
            }
            res.status(201).json(postResults[0]);
        });
    });
};

// Update post
exports.updatePost = (req, res) => {
    const { title, content, type } = req.body;
    const query = 'UPDATE posts SET title = ?, content = ?, type = ? WHERE id = ?';
    
    db.query(query, [title, content, type, req.params.id], (err, results) => {
        if (err) {
            console.error('Error updating post:', err);
            return res.status(400).json({ message: 'Error updating post' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'Post not found' });
        }
        
        // Fetch the updated post
        const updatedPostQuery = 'SELECT * FROM posts WHERE id = ?';
        db.query(updatedPostQuery, [req.params.id], (err, postResults) => {
            if (err) {
                console.error('Error fetching updated post:', err);
                return res.status(500).json({ message: 'Post updated but error fetching details' });
            }
            res.json(postResults[0]);
        });
    });
};

// Delete post
exports.deletePost = (req, res) => {
    const query = 'DELETE FROM posts WHERE id = ?';
    
    db.query(query, [req.params.id], (err, results) => {
        if (err) {
            console.error('Error deleting post:', err);
            return res.status(500).json({ message: 'Error deleting post' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'Post not found' });
        }
        res.json({ message: 'Post deleted successfully' });
    });
};