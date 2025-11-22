const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../.env' });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: [
        "http://localhost:5173", 
        "http://localhost:3000",
        "https://your-vercel-app.vercel.app" // Ganti dengan URL Vercel Anda
    ],
    credentials: true
}));

// Database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'vinixport'
});

// Connect to database
db.connect((err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        return;
    }
    console.log('Connected to MySQL database');
});

// API Routes

// User Authentication
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], (err, results) => {
        if (err) {
            console.error('Database error during login:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = results[0];

        // In a real app, you would compare hashed password
        // For now, we're skipping password validation for demo purposes
        // In production, implement proper password comparison with bcrypt.compare
        res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                avatarUrl: user.avatar_url,
                title: user.title,
                bio: user.bio,
                role: user.role
            }
        });
    });
});

// Endpoint untuk membuat user demo (untuk pengujian)
app.post('/api/admin/create-demo-user', (req, res) => {
    const { name, email, title, bio, role } = req.body;

    // Hash password default
    const defaultPassword = '$2a$10$default_hash_for_demo'; // Dalam produksi, gunakan bcrypt.hash()

    // Cek apakah email sudah ada
    const checkQuery = 'SELECT * FROM users WHERE email = ?';
    db.query(checkQuery, [email], (err, results) => {
        if (err) {
            console.error('Database error during user check:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        if (results.length > 0) {
            return res.status(409).json({ message: 'User with this email already exists' });
        }

        // Buat user baru
        const insertQuery = 'INSERT INTO users (name, email, password, title, bio, role, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?)';
        const avatarUrl = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name);
        const values = [name, email, defaultPassword, title || 'New Member', bio || 'Tell us about yourself...', role || 'user', avatarUrl];

        db.query(insertQuery, values, (err, result) => {
            if (err) {
                console.error('Database error during user creation:', err);
                return res.status(500).json({ message: 'Database error' });
            }

            res.status(201).json({
                id: result.insertId,
                message: 'Demo user created successfully'
            });
        });
    });
});

// Endpoint untuk mendapatkan semua users
app.get('/api/admin/all-users', (req, res) => {
    const query = 'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC';

    db.query(query, (err, results) => {
        if (err) {
            console.error('Database error during users retrieval:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        res.json(results);
    });
});

app.post('/api/register', (req, res) => {
    const { name, email, password } = req.body;

    // Check if user already exists
    const checkQuery = 'SELECT * FROM users WHERE email = ?';
    db.query(checkQuery, [email], (err, results) => {
        if (err) {
            console.error('Database error during registration check:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        if (results.length > 0) {
            return res.status(409).json({ message: 'User with this email already exists' });
        }

        // Hash password
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                console.error('Error hashing password:', err);
                return res.status(500).json({ message: 'Error hashing password' });
            }

            const query = 'INSERT INTO users (name, email, password, title, bio, role) VALUES (?, ?, ?, ?, ?, ?)';
            const values = [name, email, hashedPassword, 'New Member', 'Tell us about yourself...', 'user'];

            db.query(query, values, (err, result) => {
                if (err) {
                    console.error('Database error during registration:', err);
                    return res.status(500).json({ message: 'Database error' });
                }

                res.status(201).json({
                    id: result.insertId,
                    message: 'Registration successful'
                });
            });
        });
    });
});

// Mentor Login
app.post('/api/mentors/login', (req, res) => {
    const { email, password } = req.body;

    // For demo purposes, we'll hardcode the mentor credentials
    // In production, you should verify credentials against the database
    if (email === 'mentor@vinixport.com' && password === 'mentor123') {
        // Check if mentor user exists in database, if not, create one
        const query = 'SELECT * FROM users WHERE email = ? AND role = "mentor"';
        db.query(query, [email], (err, results) => {
            if (err) {
                console.error('Database error during mentor login:', err);
                return res.status(500).json({ message: 'Database error' });
            }

            if (results.length > 0) {
                // Mentor exists in DB, return that user
                const mentor = results[0];
                res.json({
                    user: {
                        id: mentor.id,
                        name: mentor.name,
                        email: mentor.email,
                        avatarUrl: mentor.avatar_url,
                        title: mentor.title,
                        bio: mentor.bio,
                        role: mentor.role
                    }
                });
            } else {
                // Mentor doesn't exist in DB, create record (for demo purposes)
                const insertQuery = 'INSERT INTO users (name, email, avatar_url, title, bio, role) VALUES (?, ?, ?, ?, ?, ?)';
                const values = ['Mentor Expert', 'mentor@vinixport.com', 'https://i.pravatar.cc/150?u=vinix-mentor', 'Career Mentor', 'Senior industry mentor for VinixPort.', 'mentor'];

                db.query(insertQuery, values, (err, result) => {
                    if (err) {
                        console.error('Database error during mentor creation:', err);
                        return res.status(500).json({ message: 'Database error' });
                    }

                    res.json({
                        user: {
                            id: result.insertId,
                            name: 'Mentor Expert',
                            email: 'mentor@vinixport.com',
                            avatarUrl: 'https://i.pravatar.cc/150?u=vinix-mentor',
                            title: 'Career Mentor',
                            bio: 'Senior industry mentor for VinixPort.',
                            role: 'mentor'
                        }
                    });
                });
            }
        });
    } else {
        res.status(401).json({ message: 'Invalid mentor credentials' });
    }
});

// Portfolio Data
app.get('/api/portfolio/:userId', (req, res) => {
    const userId = req.params.userId;
    
    // Get projects
    const projectsQuery = 'SELECT * FROM projects WHERE user_id = ?';
    
    // Get certificates
    const certificatesQuery = 'SELECT * FROM certificates WHERE user_id = ?';
    
    db.query(projectsQuery, [userId], (err, projects) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }
        
        db.query(certificatesQuery, [userId], (err, certificates) => {
            if (err) {
                return res.status(500).json({ message: 'Database error' });
            }
            
            res.json({ projects, certificates });
        });
    });
});

// Projects
app.post('/api/projects', (req, res) => {
    const { userId, title, description, imageUrl, link, tags } = req.body;
    
    const query = 'INSERT INTO projects (user_id, title, description, image_url, link, tags) VALUES (?, ?, ?, ?, ?, ?)';
    const values = [userId, title, description, imageUrl, link, JSON.stringify(tags || [])];
    
    db.query(query, values, (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }
        
        const newProject = {
            id: result.insertId,
            user_id: userId,
            title,
            description,
            image_url: imageUrl,
            link,
            tags: tags || []
        };
        
        res.status(201).json(newProject);
    });
});

app.put('/api/projects/:id', (req, res) => {
    const id = req.params.id;
    const { title, description, imageUrl, link, tags } = req.body;
    
    const query = 'UPDATE projects SET title=?, description=?, image_url=?, link=?, tags=? WHERE id=?';
    const values = [title, description, imageUrl, link, JSON.stringify(tags || []), id];
    
    db.query(query, values, (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }
        
        res.json({ message: 'Project updated successfully' });
    });
});

app.delete('/api/projects/:id', (req, res) => {
    const id = req.params.id;
    
    const query = 'DELETE FROM projects WHERE id = ?';
    
    db.query(query, [id], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }
        
        res.json({ message: 'Project deleted successfully' });
    });
});

// Certificates
app.post('/api/certificates', (req, res) => {
    const { userId, title, issuer, date, imageUrl } = req.body;
    
    const query = 'INSERT INTO certificates (user_id, title, issuer, date, image_url) VALUES (?, ?, ?, ?, ?)';
    const values = [userId, title, issuer, date, imageUrl];
    
    db.query(query, values, (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }
        
        const newCertificate = {
            id: result.insertId,
            user_id: userId,
            title,
            issuer,
            date,
            image_url: imageUrl
        };
        
        res.status(201).json(newCertificate);
    });
});

app.put('/api/certificates/:id', (req, res) => {
    const id = req.params.id;
    const { title, issuer, date, imageUrl } = req.body;
    
    const query = 'UPDATE certificates SET title=?, issuer=?, date=?, image_url=? WHERE id=?';
    const values = [title, issuer, date, imageUrl, id];
    
    db.query(query, values, (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }
        
        res.json({ message: 'Certificate updated successfully' });
    });
});

app.delete('/api/certificates/:id', (req, res) => {
    const id = req.params.id;
    
    const query = 'DELETE FROM certificates WHERE id = ?';
    
    db.query(query, [id], (err, result) => {
        if (err) {
            return res.status(500).json({ message: 'Database error' });
        }
        
        res.json({ message: 'Certificate deleted successfully' });
    });
});

// Middleware sederhana untuk mendapatkan user ID dari header (dalam produksi, gunakan JWT)
const getAuthenticatedUserId = (req) => {
    // Dalam implementasi nyata, kita akan memverifikasi JWT token
    // Di sini kita menggunakan header sederhana untuk keperluan demo
    const userId = req.headers['x-user-id'];
    return userId ? parseInt(userId) : null;
};

// Review Requests
app.post('/api/review-requests', (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
        console.log('Authentication failed: No user ID in request header');
        return res.status(401).json({ message: 'Authentication required' });
    }

    const { menteeName, menteeEmail, portfolioUrl, notes, paymentAmount, paymentBank, paymentAccountName, paymentProofImage } = req.body;

    // Validasi bahwa nama dan email cocok dengan ID pengguna
    const userCheckQuery = 'SELECT * FROM users WHERE id = ? AND email = ?';
    db.query(userCheckQuery, [userId, menteeEmail], (err, results) => {
        if (err) {
            console.error('Database error during user verification:', err);
            return res.status(500).json({ message: 'Database error: ' + err.message });
        }

        if (results.length === 0) {
            console.log(`Unauthorized access attempt: ID ${userId} with email ${menteeEmail}`);
            return res.status(403).json({ message: 'Unauthorized: User data mismatch' });
        }

        console.log(`Creating review request for user ID ${userId}, email ${menteeEmail}`);

        const query = `INSERT INTO review_requests
                       (mentee_id, mentee_name, mentee_email, portfolio_url, notes,
                        payment_amount, payment_bank, payment_account_name, payment_proof_image,
                        payment_status, status)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const values = [userId, menteeName, menteeEmail, portfolioUrl, notes || null,
                        paymentAmount || null, paymentBank || null, paymentAccountName || null, paymentProofImage || null,
                        'waiting_verification', 'pending'];

        db.query(query, values, (err, result) => {
            if (err) {
                console.error('Database error during review request creation:', err);
                // Tambahkan informasi error yang lebih spesifik
                return res.status(500).json({
                    message: 'Database error: ' + err.message,
                    error: err.code,
                    sql: err.sql
                });
            }

            console.log(`Review request created successfully with ID: ${result.insertId}`);

            res.status(201).json({
                id: result.insertId,
                mentee_id: userId,
                mentee_name: menteeName,
                mentee_email: menteeEmail,
                portfolio_url: portfolioUrl,
                notes: notes || null,
                payment_amount: paymentAmount || null,
                payment_bank: paymentBank || null,
                payment_account_name: paymentAccountName || null,
                payment_proof_image: paymentProofImage || null,
                payment_status: 'waiting_verification',
                status: 'pending',
                created_at: new Date().toISOString()
            });
        });
    });
});

app.get('/api/review-requests', (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    // Check if user is mentor
    const userCheckQuery = 'SELECT role FROM users WHERE id = ?';
    db.query(userCheckQuery, [userId], (err, results) => {
        if (err) {
            console.error('Database error during user role verification:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(403).json({ message: 'User not found' });
        }

        const userRole = results[0].role;

        let query;
        let values = [];

        if (userRole === 'mentor') {
            // Mentor bisa melihat semua permintaan review
            query = `SELECT * FROM review_requests ORDER BY created_at DESC`;
        } else {
            // Pengguna biasa hanya bisa melihat permintaan review mereka sendiri
            query = `SELECT * FROM review_requests WHERE mentee_id = ? ORDER BY created_at DESC`;
            values = [userId];
        }

        db.query(query, values, (err, results) => {
            if (err) {
                console.error('Database error during review request retrieval:', err);
                return res.status(500).json({ message: 'Database error' });
            }

            // Format results to match frontend interface
            const formattedResults = results.map(req => ({
                id: req.id,
                menteeId: req.mentee_id,
                menteeName: req.mentee_name,
                menteeEmail: req.mentee_email,
                portfolioUrl: req.portfolio_url,
                notes: req.notes,
                paymentAmount: req.payment_amount,
                paymentBank: req.payment_bank,
                paymentAccountName: req.payment_account_name,
                paymentProofImage: req.payment_proof_image,
                paymentStatus: req.payment_status,
                status: req.status,
                mentorFeedback: req.mentor_feedback,
                createdAt: req.created_at
            }));

            res.json(formattedResults);
        });
    });
});

app.put('/api/review-requests/:id', (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    const id = req.params.id;
    const { status, mentorFeedback, paymentStatus } = req.body;

    // Check if user is mentor (only mentors can update review requests)
    const userCheckQuery = 'SELECT role FROM users WHERE id = ?';
    db.query(userCheckQuery, [userId], (err, results) => {
        if (err) {
            console.error('Database error during user role verification:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        if (results.length === 0 || results[0].role !== 'mentor') {
            return res.status(403).json({ message: 'Only mentors can update review requests' });
        }

        // Build dynamic query based on provided fields
        let query = 'UPDATE review_requests SET ';
        const values = [];

        if (status !== undefined) {
            query += 'status = ?, ';
            values.push(status);
        }

        if (mentorFeedback !== undefined) {
            query += 'mentor_feedback = ?, ';
            values.push(mentorFeedback);
        }

        if (paymentStatus !== undefined) {
            query += 'payment_status = ?, ';
            values.push(paymentStatus);
        }

        // Remove trailing comma and space, and add WHERE clause
        query = query.slice(0, -2) + ' WHERE id = ?';
        values.push(id);

        db.query(query, values, (err, result) => {
            if (err) {
                console.error('Database error during review request update:', err);
                return res.status(500).json({ message: 'Database error' });
            }

            res.json({ message: 'Review request updated successfully' });
        });
    });
});

// Users
app.put('/api/users/:id', (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    const id = req.params.id;
    const { name, email, avatarUrl, title, bio } = req.body;

    // Memastikan hanya pengguna yang sama yang bisa mengupdate profil
    if (userId != id) {
        return res.status(403).json({ message: 'Cannot update other user\'s profile' });
    }

    // Check if email is already used by another user
    const checkEmailQuery = 'SELECT id FROM users WHERE email = ? AND id != ?';
    db.query(checkEmailQuery, [email, id], (err, results) => {
        if (err) {
            console.error('Database error during email check:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        if (results.length > 0) {
            return res.status(409).json({ message: 'Email already in use by another user' });
        }

        const query = 'UPDATE users SET name=?, email=?, avatar_url=?, title=?, bio=? WHERE id=?';
        const values = [name, email, avatarUrl, title, bio, id];

        db.query(query, values, (err, result) => {
            if (err) {
                console.error('Database error during user update:', err);
                return res.status(500).json({ message: 'Database error' });
            }

            res.json({ message: 'User updated successfully' });
        });
    });
});

// Endpoint untuk mengisi data langsung ke database (untuk pengujian/development)
app.post('/api/admin/add-user', (req, res) => {
    const { name, email, title, bio, role, avatar_url } = req.body;

    // Validasi input
    if (!name || !email) {
        return res.status(400).json({ message: 'Nama dan email wajib diisi' });
    }

    const defaultPassword = '$2a$10$' + 'default_hash_here'; // Placeholder, dalam produksi gunakan bcrypt.hash()

    const query = `INSERT INTO users
                   (name, email, password, title, bio, role, avatar_url)
                   VALUES (?, ?, ?, ?, ?, ?, ?)`;

    const values = [
        name,
        email,
        defaultPassword, // Dalam produksi, hash password sebelum disimpan
        title || 'New Member',
        bio || 'Tell us about yourself...',
        role || 'user',
        avatar_url || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name)
    ];

    db.query(query, values, (err, result) => {
        if (err) {
            console.error('Database error during user creation:', err);
            return res.status(500).json({ message: 'Database error: ' + err.message });
        }

        res.status(201).json({
            id: result.insertId,
            message: 'User created successfully'
        });
    });
});

// Endpoint untuk mengisi data review request langsung ke database
app.post('/api/admin/add-review-request', (req, res) => {
    const { mentee_id, mentee_name, mentee_email, portfolio_url, notes,
            payment_amount, payment_bank, payment_account_name, payment_proof_image,
            payment_status, status, mentor_feedback } = req.body;

    // Validasi input
    if (!mentee_id || !mentee_name || !mentee_email || !portfolio_url) {
        return res.status(400).json({ message: 'Mentee ID, name, email, dan portfolio URL wajib diisi' });
    }

    // Validasi mentee_id ada di tabel users
    const userCheckQuery = 'SELECT id FROM users WHERE id = ?';
    db.query(userCheckQuery, [mentee_id], (err, results) => {
        if (err) {
            console.error('Database error during user verification:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Mentee ID tidak ditemukan di database' });
        }

        const query = `INSERT INTO review_requests
                       (mentee_id, mentee_name, mentee_email, portfolio_url, notes,
                        payment_amount, payment_bank, payment_account_name, payment_proof_image,
                        payment_status, status, mentor_feedback)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const values = [
            mentee_id, mentee_name, mentee_email, portfolio_url, notes || null,
            payment_amount || null, payment_bank || null, payment_account_name || null,
            payment_proof_image || null, payment_status || 'waiting_verification',
            status || 'pending', mentor_feedback || null
        ];

        db.query(query, values, (err, result) => {
            if (err) {
                console.error('Database error during review request creation:', err);
                return res.status(500).json({ message: 'Database error: ' + err.message });
            }

            res.status(201).json({
                id: result.insertId,
                message: 'Review request created successfully'
            });
        });
    });
});

// Endpoint untuk mendapatkan semua users (untuk ditampilkan di form)
app.get('/api/admin/users', (req, res) => {
    const query = 'SELECT id, name, email, role FROM users ORDER BY created_at DESC';

    db.query(query, (err, results) => {
        if (err) {
            console.error('Database error during users retrieval:', err);
            return res.status(500).json({ message: 'Database error' });
        }

        res.json(results);
    });
});

// Endpoint debug untuk memeriksa status koneksi dan otentikasi
app.get('/api/debug/status', (req, res) => {
    const userId = getAuthenticatedUserId(req);

    res.json({
        status: 'OK',
        database: 'Connected',
        userId: userId,
        timestamp: new Date().toISOString()
    });
});

// Endpoint debug untuk melihat user ID dari header
app.get('/api/debug/auth', (req, res) => {
    const userId = getAuthenticatedUserId(req);
    const authHeader = req.headers['x-user-id'];

    res.json({
        userId: userId,
        authHeader: authHeader,
        allHeaders: req.headers,
        message: userId ? 'User authenticated' : 'No user ID in header'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
