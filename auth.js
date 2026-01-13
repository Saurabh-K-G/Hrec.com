const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'hrec_secret_key_2024_secure';
const JWT_EXPIRES_IN = '24h';

const dbPath = path.join(__dirname, '..', 'hrec_users.db');

// Validation middleware
const validateRegistration = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('firstName').trim().isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').trim().isLength({ min: 1 }).withMessage('Last name is required'),
  body('phone').optional().isMobilePhone().withMessage('Please provide a valid phone number'),
  body('department').optional().trim(),
  body('position').optional().trim()
];

const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

// Helper function to get database connection
const getDb = () => {
  return new sqlite3.Database(dbPath);
};

// Helper function to generate JWT token
const generateToken = (userId, email, role, department, position) => {
  return jwt.sign(
    { userId, email, role, department, position },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Register new user
router.post('/register', validateRegistration, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      phone, 
      department = 'General',
      position = 'Employee'
    } = req.body;

    // Check if user already exists
    const db = getDb();
    
    db.get('SELECT id FROM users WHERE email = ?', [email], async (err, row) => {
      if (err) {
        console.error('Database error:', err);
        db.close();
        return res.status(500).json({
          success: false,
          message: 'Database error occurred'
        });
      }

      if (row) {
        db.close();
        return res.status(409).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      try {
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new user
        db.run(
          'INSERT INTO users (email, password, firstName, lastName, phone, department, position) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [email, hashedPassword, firstName, lastName, phone || null, department, position],
          function(err) {
            if (err) {
              console.error('Error inserting user:', err);
              db.close();
              return res.status(500).json({
                success: false,
                message: 'Error creating user account'
              });
            }

            // Generate token
            const token = generateToken(this.lastID, email, 'employee', department, position);

            db.close();
            res.status(201).json({
              success: true,
              message: 'User registered successfully',
              data: {
                userId: this.lastID,
                email,
                firstName,
                lastName,
                phone,
                department,
                position,
                role: 'employee',
                token
              }
            });
          }
        );
      } catch (hashError) {
        console.error('Password hashing error:', hashError);
        db.close();
        res.status(500).json({
          success: false,
          message: 'Error processing password'
        });
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Login user
router.post('/login', validateLogin, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    const db = getDb();

    db.get(
      'SELECT id, email, password, firstName, lastName, role, department, position, isActive FROM users WHERE email = ?',
      [email],
      async (err, user) => {
        if (err) {
          console.error('Database error:', err);
          db.close();
          return res.status(500).json({
            success: false,
            message: 'Database error occurred'
          });
        }

        if (!user) {
          db.close();
          return res.status(401).json({
            success: false,
            message: 'Invalid email or password'
          });
        }

        if (!user.isActive) {
          db.close();
          return res.status(401).json({
            success: false,
            message: 'Account is deactivated'
          });
        }

        try {
          // Verify password
          const isValidPassword = await bcrypt.compare(password, user.password);
          
          if (!isValidPassword) {
            db.close();
            return res.status(401).json({
              success: false,
              message: 'Invalid email or password'
            });
          }

          // Generate token
          const token = generateToken(user.id, user.email, user.role, user.department, user.position);

          db.close();
          res.json({
            success: true,
            message: 'Login successful',
            data: {
              userId: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role,
              department: user.department,
              position: user.position,
              token
            }
          });
        } catch (bcryptError) {
          console.error('Password verification error:', bcryptError);
          db.close();
          res.status(500).json({
            success: false,
            message: 'Error verifying password'
          });
        }
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user profile
router.get('/profile', authenticateToken, (req, res) => {
  const db = getDb();

  db.get(
    'SELECT id, email, firstName, lastName, phone, birthdate, age, avatar, role, department, position, createdAt FROM users WHERE id = ?',
    [req.user.userId],
    (err, user) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'Database error occurred'
        });
      }

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: user
      });
    }
  );

  db.close();
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('firstName').optional().trim().isLength({ min: 1 }).withMessage('First name cannot be empty'),
  body('lastName').optional().trim().isLength({ min: 1 }).withMessage('Last name cannot be empty'),
  body('phone').optional().isMobilePhone().withMessage('Please provide a valid phone number'),
  body('birthdate').optional().isISO8601().withMessage('Please provide a valid birthdate'),
  body('age').optional().isInt({ min: 0, max: 120 }).withMessage('Please provide a valid age')
], (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { firstName, lastName, phone, birthdate, age } = req.body;
    const updates = [];
    const values = [];

    if (firstName) {
      updates.push('firstName = ?');
      values.push(firstName);
    }
    if (lastName) {
      updates.push('lastName = ?');
      values.push(lastName);
    }
    if (phone !== undefined) {
      updates.push('phone = ?');
      values.push(phone);
    }
    if (birthdate) {
      updates.push('birthdate = ?');
      values.push(birthdate);
    }
    if (age !== undefined) {
      updates.push('age = ?');
      values.push(age);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    updates.push('updatedAt = CURRENT_TIMESTAMP');
    values.push(req.user.userId);

    const db = getDb();

    db.run(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values,
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            message: 'Error updating profile'
          });
        }

        res.json({
          success: true,
          message: 'Profile updated successfully'
        });
      }
    );

    db.close();
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Change password
router.put('/change-password', authenticateToken, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const db = getDb();

    db.get(
      'SELECT password FROM users WHERE id = ?',
      [req.user.userId],
      async (err, user) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            message: 'Database error occurred'
          });
        }

        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'User not found'
          });
        }

        try {
          // Verify current password
          const isValidPassword = await bcrypt.compare(currentPassword, user.password);
          
          if (!isValidPassword) {
            return res.status(401).json({
              success: false,
              message: 'Current password is incorrect'
            });
          }

          // Hash new password
          const hashedNewPassword = await bcrypt.hash(newPassword, 10);

          // Update password
          db.run(
            'UPDATE users SET password = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
            [hashedNewPassword, req.user.userId],
            function(err) {
              if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                  success: false,
                  message: 'Error updating password'
                });
              }

              res.json({
                success: true,
                message: 'Password changed successfully'
              });
            }
          );
        } catch (bcryptError) {
          console.error('Password verification error:', bcryptError);
          res.status(500).json({
            success: false,
            message: 'Error processing password'
          });
        }
      }
    );

    db.close();
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Logout (client-side token removal, but we can track it)
router.post('/logout', authenticateToken, (req, res) => {
  // In a more advanced implementation, you might want to blacklist the token
  // For now, we'll just return success since JWT tokens are stateless
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;
