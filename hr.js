const express = require('express');
const { body, validationResult } = require('express-validator');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const router = express.Router();
const dbPath = path.join(__dirname, '..', 'hrec_users.db');

// Helper function to get database connection
const getDb = () => {
  return new sqlite3.Database(dbPath);
};

// Get all quiz questions
router.get('/questions', (req, res) => {
  const db = getDb();
  const { category } = req.query;

  let sql = 'SELECT * FROM quiz_questions';
  let params = [];

  if (category && category !== 'all') {
    sql += ' WHERE category = ?';
    params.push(category);
  }

  sql += ' ORDER BY createdAt DESC';

  db.all(sql, params, (err, questions) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        success: false,
        message: 'Database error occurred'
      });
    }

    // Parse options from JSON string
    const parsedQuestions = questions.map(q => ({
      ...q,
      options: JSON.parse(q.options)
    }));

    res.json({
      success: true,
      data: parsedQuestions
    });
  });

  db.close();
});

// Add new quiz question
router.post('/questions', [
  body('category').notEmpty().withMessage('Category is required'),
  body('question').notEmpty().withMessage('Question text is required'),
  body('options').isArray({ min: 4, max: 4 }).withMessage('Exactly 4 options are required'),
  body('correctIndex').isInt({ min: 0, max: 3 }).withMessage('Correct index must be between 0 and 3')
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

    const { category, question, options, correctIndex } = req.body;
    const db = getDb();

    db.run(
      'INSERT INTO quiz_questions (category, question, options, correctIndex, createdBy) VALUES (?, ?, ?, ?, ?)',
      [category, question, JSON.stringify(options), correctIndex, req.user.userId],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            message: 'Error saving question'
          });
        }

        res.status(201).json({
          success: true,
          message: 'Question added successfully',
          data: {
            id: this.lastID,
            category,
            question,
            options,
            correctIndex
          }
        });
      }
    );

    db.close();
  } catch (error) {
    console.error('Add question error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update quiz question
router.put('/questions/:id', [
  body('category').optional().notEmpty().withMessage('Category cannot be empty'),
  body('question').optional().notEmpty().withMessage('Question text cannot be empty'),
  body('options').optional().isArray({ min: 4, max: 4 }).withMessage('Exactly 4 options are required'),
  body('correctIndex').optional().isInt({ min: 0, max: 3 }).withMessage('Correct index must be between 0 and 3')
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

    const { id } = req.params;
    const { category, question, options, correctIndex } = req.body;
    const updates = [];
    const values = [];

    if (category) {
      updates.push('category = ?');
      values.push(category);
    }
    if (question) {
      updates.push('question = ?');
      values.push(question);
    }
    if (options) {
      updates.push('options = ?');
      values.push(JSON.stringify(options));
    }
    if (correctIndex !== undefined) {
      updates.push('correctIndex = ?');
      values.push(correctIndex);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    values.push(id);

    const db = getDb();

    db.run(
      `UPDATE quiz_questions SET ${updates.join(', ')} WHERE id = ?`,
      values,
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            message: 'Error updating question'
          });
        }

        if (this.changes === 0) {
          return res.status(404).json({
            success: false,
            message: 'Question not found'
          });
        }

        res.json({
          success: true,
          message: 'Question updated successfully'
        });
      }
    );

    db.close();
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete quiz question
router.delete('/questions/:id', (req, res) => {
  const { id } = req.params;
  const db = getDb();

  db.run('DELETE FROM quiz_questions WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        success: false,
        message: 'Error deleting question'
      });
    }

    if (this.changes === 0) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    res.json({
      success: true,
      message: 'Question deleted successfully'
    });
  });

  db.close();
});

// Save quiz result
router.post('/quiz-results', [
  body('score').isInt({ min: 0 }).withMessage('Score must be a non-negative integer'),
  body('totalQuestions').isInt({ min: 1 }).withMessage('Total questions must be a positive integer'),
  body('timeSpent').optional().isInt({ min: 0 }).withMessage('Time spent must be a non-negative integer'),
  body('answers').isArray().withMessage('Answers must be an array')
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

    const { score, totalQuestions, timeSpent = 0, answers } = req.body;
    const db = getDb();

    db.run(
      'INSERT INTO quiz_results (userId, score, totalQuestions, timeSpent, answers) VALUES (?, ?, ?, ?, ?)',
      [req.user.userId, score, totalQuestions, timeSpent, JSON.stringify(answers)],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            message: 'Error saving quiz result'
          });
        }

        res.status(201).json({
          success: true,
          message: 'Quiz result saved successfully',
          data: {
            id: this.lastID,
            score,
            totalQuestions,
            timeSpent,
            percentage: Math.round((score / totalQuestions) * 100)
          }
        });
      }
    );

    db.close();
  } catch (error) {
    console.error('Save quiz result error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user's quiz results
router.get('/quiz-results', (req, res) => {
  const db = getDb();

  db.all(
    'SELECT * FROM quiz_results WHERE userId = ? ORDER BY createdAt DESC',
    [req.user.userId],
    (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'Database error occurred'
        });
      }

      // Parse answers from JSON string and calculate percentage
      const parsedResults = results.map(result => ({
        ...result,
        answers: JSON.parse(result.answers),
        percentage: Math.round((result.score / result.totalQuestions) * 100)
      }));

      res.json({
        success: true,
        data: parsedResults
      });
    }
  );

  db.close();
});

// Get all quiz results (admin only)
router.get('/quiz-results/all', (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin' && req.user.role !== 'hr_manager') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin or HR Manager role required.'
    });
  }

  const db = getDb();

  db.all(
    `SELECT qr.*, u.firstName, u.lastName, u.email, u.department 
     FROM quiz_results qr 
     JOIN users u ON qr.userId = u.id 
     ORDER BY qr.createdAt DESC`,
    [],
    (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'Database error occurred'
        });
      }

      // Parse answers from JSON string and calculate percentage
      const parsedResults = results.map(result => ({
        ...result,
        answers: JSON.parse(result.answers),
        percentage: Math.round((result.score / result.totalQuestions) * 100)
      }));

      res.json({
        success: true,
        data: parsedResults
      });
    }
  );

  db.close();
});

// Get dashboard statistics
router.get('/dashboard-stats', (req, res) => {
  const db = getDb();

  // Get total users count
  db.get('SELECT COUNT(*) as totalUsers FROM users WHERE isActive = 1', [], (err, userCount) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        success: false,
        message: 'Database error occurred'
      });
    }

    // Get total questions count
    db.get('SELECT COUNT(*) as totalQuestions FROM quiz_questions', [], (err, questionCount) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'Database error occurred'
        });
      }

      // Get total quiz attempts
      db.get('SELECT COUNT(*) as totalAttempts FROM quiz_results', [], (err, attemptCount) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            message: 'Database error occurred'
          });
        }

        // Get average score
        db.get('SELECT AVG(score * 100.0 / totalQuestions) as avgScore FROM quiz_results', [], (err, avgScore) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
              success: false,
              message: 'Database error occurred'
            });
          }

          db.close();

          res.json({
            success: true,
            data: {
              totalUsers: userCount.totalUsers,
              totalQuestions: questionCount.totalQuestions,
              totalAttempts: attemptCount.totalAttempts,
              averageScore: Math.round(avgScore.avgScore || 0)
            }
          });
        });
      });
    });
  });
});

// Get recruitment positions
router.get('/recruitment', (req, res) => {
  const db = getDb();

  db.all(
    'SELECT r.*, u.firstName, u.lastName FROM recruitment r LEFT JOIN users u ON r.createdBy = u.id ORDER BY r.createdAt DESC',
    [],
    (err, positions) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          message: 'Database error occurred'
        });
      }

      res.json({
        success: true,
        data: positions
      });
    }
  );

  db.close();
});

// Add new recruitment position
router.post('/recruitment', [
  body('title').notEmpty().withMessage('Job title is required'),
  body('department').notEmpty().withMessage('Department is required'),
  body('description').optional().trim(),
  body('requirements').optional().trim(),
  body('status').optional().isIn(['open', 'closed', 'on_hold']).withMessage('Invalid status')
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

    const { title, department, description, requirements, status = 'open' } = req.body;
    const db = getDb();

    db.run(
      'INSERT INTO recruitment (title, department, description, requirements, status, createdBy) VALUES (?, ?, ?, ?, ?, ?)',
      [title, department, description, requirements, status, req.user.userId],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            message: 'Error saving recruitment position'
          });
        }

        res.status(201).json({
          success: true,
          message: 'Recruitment position added successfully',
          data: {
            id: this.lastID,
            title,
            department,
            description,
            requirements,
            status
          }
        });
      }
    );

    db.close();
  } catch (error) {
    console.error('Add recruitment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

module.exports = router;
