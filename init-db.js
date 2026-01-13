const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'hrec_users.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to Hrec SQLite database.');
  }
});

// Create users table
const createUsersTable = () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      phone TEXT,
      birthdate DATE,
      age INTEGER,
      avatar TEXT,
      role TEXT DEFAULT 'employee',
      department TEXT DEFAULT 'General',
      position TEXT DEFAULT 'Employee',
      isActive BOOLEAN DEFAULT 1,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.run(sql, (err) => {
    if (err) {
      console.error('Error creating users table:', err.message);
    } else {
      console.log('✅ Users table created successfully');
    }
  });
};

// Create user sessions table
const createSessionsTable = () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS user_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expiresAt DATETIME NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
    )
  `;

  db.run(sql, (err) => {
    if (err) {
      console.error('Error creating sessions table:', err.message);
    } else {
      console.log('✅ Sessions table created successfully');
    }
  });
};

// Create quiz questions table
const createQuestionsTable = () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS quiz_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      question TEXT NOT NULL,
      options TEXT NOT NULL,
      correctIndex INTEGER NOT NULL,
      createdBy INTEGER,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (createdBy) REFERENCES users (id)
    )
  `;

  db.run(sql, (err) => {
    if (err) {
      console.error('Error creating quiz questions table:', err.message);
    } else {
      console.log('✅ Quiz questions table created successfully');
    }
  });
};

// Create quiz results table
const createResultsTable = () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS quiz_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      score INTEGER NOT NULL,
      totalQuestions INTEGER NOT NULL,
      timeSpent INTEGER,
      answers TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
    )
  `;

  db.run(sql, (err) => {
    if (err) {
      console.error('Error creating quiz results table:', err.message);
    } else {
      console.log('✅ Quiz results table created successfully');
    }
  });
};

// Create recruitment table
const createRecruitmentTable = () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS recruitment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      department TEXT NOT NULL,
      description TEXT,
      requirements TEXT,
      status TEXT DEFAULT 'open',
      createdBy INTEGER,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (createdBy) REFERENCES users (id)
    )
  `;

  db.run(sql, (err) => {
    if (err) {
      console.error('Error creating recruitment table:', err.message);
    } else {
      console.log('✅ Recruitment table created successfully');
    }
  });
};

// Create admin user
const createAdminUser = async () => {
  const adminEmail = 'admin@hrec.com';
  const adminPassword = 'Admin123!';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const sql = `
    INSERT OR IGNORE INTO users (email, password, firstName, lastName, role, department, position)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(sql, [adminEmail, hashedPassword, 'Admin', 'User', 'admin', 'IT', 'System Administrator'], function(err) {
    if (err) {
      console.error('Error creating admin user:', err.message);
    } else if (this.changes > 0) {
      console.log('✅ Admin user created successfully');
      console.log(`   Email: ${adminEmail}`);
      console.log(`   Password: ${adminPassword}`);
    } else {
      console.log('ℹ️  Admin user already exists');
    }
  });
};

// Create HR manager user
const createHRUser = async () => {
  const hrEmail = 'hr@hrec.com';
  const hrPassword = 'HR123!';
  const hashedPassword = await bcrypt.hash(hrPassword, 10);

  const sql = `
    INSERT OR IGNORE INTO users (email, password, firstName, lastName, role, department, position)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(sql, [hrEmail, hashedPassword, 'HR', 'Manager', 'hr_manager', 'Human Resources', 'HR Manager'], function(err) {
    if (err) {
      console.error('Error creating HR user:', err.message);
    } else if (this.changes > 0) {
      console.log('✅ HR Manager user created successfully');
      console.log(`   Email: ${hrEmail}`);
      console.log(`   Password: ${hrPassword}`);
    } else {
      console.log('ℹ️  HR Manager user already exists');
    }
  });
};

// Create sample employee user
const createEmployeeUser = async () => {
  const empEmail = 'employee@hrec.com';
  const empPassword = 'Employee123!';
  const hashedPassword = await bcrypt.hash(empPassword, 10);

  const sql = `
    INSERT OR IGNORE INTO users (email, password, firstName, lastName, phone, birthdate, age, role, department, position)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(sql, [
    empEmail, 
    hashedPassword, 
    'John', 
    'Doe', 
    '+1234567890', 
    '1990-05-15', 
    33, 
    'employee', 
    'Operations', 
    'Software Developer'
  ], function(err) {
    if (err) {
      console.error('Error creating employee user:', err.message);
    } else if (this.changes > 0) {
      console.log('✅ Employee user created successfully');
      console.log(`   Email: ${empEmail}`);
      console.log(`   Password: ${empPassword}`);
    } else {
      console.log('ℹ️  Employee user already exists');
    }
  });
};

// Seed sample quiz questions
const seedQuizQuestions = () => {
  const sampleQuestions = [
    {
      category: 'hr',
      question: 'What is the primary purpose of HR in an organization?',
      options: JSON.stringify(['Manage finances', 'Develop products', 'Manage human resources', 'Handle marketing']),
      correctIndex: 2,
      createdBy: 1
    },
    {
      category: 'ops',
      question: 'What does KPI stand for in operations?',
      options: JSON.stringify(['Key Performance Indicator', 'Key Process Information', 'Knowledge Process Integration', 'Key Project Initiative']),
      correctIndex: 0,
      createdBy: 1
    },
    {
      category: 'assessment',
      question: 'Which is NOT a type of assessment?',
      options: JSON.stringify(['Performance', 'Skills', 'Personality', 'Weather']),
      correctIndex: 3,
      createdBy: 1
    }
  ];

  sampleQuestions.forEach(q => {
    db.run(
      'INSERT OR IGNORE INTO quiz_questions (category, question, options, correctIndex, createdBy) VALUES (?, ?, ?, ?, ?)',
      [q.category, q.question, q.options, q.correctIndex, q.createdBy],
      function(err) {
        if (err) {
          console.error('Error inserting sample question:', err.message);
        }
      }
    );
  });

  console.log('✅ Sample quiz questions seeded');
};

// Initialize database
const initDatabase = async () => {
  try {
    console.log('🔧 Initializing Hrec database...');
    
    // Create tables
    createUsersTable();
    createSessionsTable();
    createQuestionsTable();
    createResultsTable();
    createRecruitmentTable();
    
    // Wait a bit for tables to be created
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Create default users
    await createAdminUser();
    await createHRUser();
    await createEmployeeUser();
    
    // Wait a bit for users to be created
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Seed sample data
    seedQuizQuestions();
    
    console.log('🎉 Hrec database initialization completed!');
    
  } catch (error) {
    console.error('❌ Error during database initialization:', error);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('Database connection closed.');
      }
    });
  }
};

// Run initialization
initDatabase();
