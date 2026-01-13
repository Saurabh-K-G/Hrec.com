# Hrec HR Authentication System

A complete authentication and user management system for the Hrec HR application with login, registration, and database integration.

## Features

### 🔐 Authentication System
- **User Registration** - Secure account creation with HR-specific fields
- **User Login** - JWT-based authentication with role management
- **Password Security** - Bcrypt hashing with strength indicators
- **Session Management** - Secure token-based sessions
- **Profile Management** - Complete user profile with HR data

### 🛡️ Security Features
- **Rate Limiting** - Protection against brute force attacks
- **Input Validation** - Server and client-side validation
- **Password Hashing** - Secure bcrypt implementation
- **JWT Tokens** - Stateless authentication with role-based access
- **CORS Protection** - Cross-origin request security
- **Helmet Security** - HTTP header security

### 👥 Role-Based Access Control
- **Admin** - Full system access and management
- **HR Manager** - HR functions and employee management
- **Employee** - Basic access to personal profile and assessments

### 📊 HR-Specific Features
- **Employee Profiles** - Department, position, and personal information
- **Quiz Assessment System** - Create and manage employee assessments
- **Recruitment Management** - Job posting and application tracking
- **Analytics Dashboard** - Performance metrics and insights

### 🎨 User Interface
- **Modern Design** - Clean, responsive interface matching Hrec branding
- **Dark/Light Theme** - Theme switching support
- **Mobile Responsive** - Optimized for all devices
- **Accessibility** - WCAG compliant design
- **Real-time Validation** - Instant feedback on form inputs

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **SQLite** - Lightweight database
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **express-validator** - Input validation
- **helmet** - Security middleware
- **cors** - Cross-origin resource sharing
- **express-rate-limit** - Rate limiting

### Frontend
- **Vanilla JavaScript** - No framework dependencies
- **CSS3** - Modern styling with CSS Grid/Flexbox
- **HTML5** - Semantic markup
- **Fetch API** - HTTP requests
- **Local Storage** - Client-side token storage

## Installation

1. **Clone or download the project files**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Initialize the database**
   ```bash
   npm run init-db
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Or start the production server**
   ```bash
   npm start
   ```

The server will start on `http://localhost:3000`

## Default Test Accounts

After running `npm run init-db`, you'll have these test accounts:

### Admin Account
- **Email:** admin@hrec.com
- **Password:** Admin123!
- **Role:** Admin (Full system access)

### HR Manager Account
- **Email:** hr@hrec.com
- **Password:** HR123!
- **Role:** HR Manager (HR functions access)

### Employee Account
- **Email:** employee@hrec.com
- **Password:** Employee123!
- **Role:** Employee (Basic access)

## File Structure

```
Hrec/
├── server.js              # Main server file
├── init-db.js            # Database initialization
├── package.json          # Dependencies and scripts
├── routes/
│   ├── auth.js           # Authentication routes
│   └── hr.js             # HR system routes
├── middleware/
│   └── auth.js           # Authentication middleware
├── hrec_users.db         # SQLite database (created after init-db)
├── login.html            # Login page
├── register.html         # Registration page
├── auth-styles.css       # Authentication page styles
├── auth.js               # Frontend authentication logic
├── auth-integration.js   # Authentication integration for existing pages
├── 404.html             # Error page
├── [existing Hrec files]
│   ├── index.html       # Main dashboard
│   ├── hr.html          # HR assessment system
│   ├── profile.html     # User profile
│   ├── recruitment.html # Recruitment management
│   ├── styles.css       # Main styles
│   └── ...
└── README.md            # This file
```

## API Endpoints

### Authentication Routes (`/api/auth/`)

- **POST /register** - Register new user
- **POST /login** - User login
- **GET /profile** - Get user profile (protected)
- **PUT /profile** - Update user profile (protected)
- **POST /logout** - User logout (protected)
- **PUT /change-password** - Change password (protected)

### HR System Routes (`/api/hr/`) - Protected

- **GET /questions** - Get quiz questions
- **POST /questions** - Add new quiz question
- **PUT /questions/:id** - Update quiz question
- **DELETE /questions/:id** - Delete quiz question
- **POST /quiz-results** - Save quiz result
- **GET /quiz-results** - Get user's quiz results
- **GET /quiz-results/all** - Get all quiz results (admin/HR only)
- **GET /dashboard-stats** - Get dashboard statistics
- **GET /recruitment** - Get recruitment positions
- **POST /recruitment** - Add new recruitment position

### Example API Usage

#### Register a new employee
```javascript
fetch('/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'new.employee@company.com',
    password: 'password123',
    firstName: 'Jane',
    lastName: 'Smith',
    phone: '+1234567890',
    department: 'Marketing',
    position: 'Marketing Specialist'
  })
});
```

#### Login
```javascript
fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'employee@hrec.com',
    password: 'Employee123!'
  })
});
```

#### Add quiz question (requires authentication)
```javascript
fetch('/api/hr/questions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  },
  body: JSON.stringify({
    category: 'hr',
    question: 'What is the primary role of HR?',
    options: ['Manage finances', 'Develop products', 'Manage human resources', 'Handle marketing'],
    correctIndex: 2
  })
});
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
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
);
```

### Quiz Questions Table
```sql
CREATE TABLE quiz_questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  options TEXT NOT NULL,
  correctIndex INTEGER NOT NULL,
  createdBy INTEGER,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (createdBy) REFERENCES users (id)
);
```

### Quiz Results Table
```sql
CREATE TABLE quiz_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL,
  score INTEGER NOT NULL,
  totalQuestions INTEGER NOT NULL,
  timeSpent INTEGER,
  answers TEXT,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
);
```

### Recruitment Table
```sql
CREATE TABLE recruitment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  department TEXT NOT NULL,
  description TEXT,
  requirements TEXT,
  status TEXT DEFAULT 'open',
  createdBy INTEGER,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (createdBy) REFERENCES users (id)
);
```

## Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your_super_secure_secret_key_here
```

## Security Features

### Rate Limiting
- Authentication endpoints: 5 requests per 15 minutes
- General endpoints: 100 requests per 15 minutes

### Password Requirements
- Minimum 6 characters
- Strength indicator on registration
- Bcrypt hashing with salt rounds

### Token Security
- JWT tokens with 24-hour expiration
- Secure token storage in localStorage
- Automatic token validation
- Role-based access control

## Development

### Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run init-db` - Initialize database with sample data

### Adding New Features
1. Create new routes in `routes/` directory
2. Add middleware in `middleware/` directory
3. Update frontend JavaScript files as needed
4. Add corresponding CSS styles

## Integration with Existing Hrec System

The authentication system seamlessly integrates with your existing Hrec HR application:

1. **Protected Routes** - All existing pages now require authentication
2. **User Menu** - Added user dropdown with profile and logout options
3. **Role-Based Access** - Different access levels for admin, HR managers, and employees
4. **Session Management** - Automatic login state management across pages
5. **Profile Integration** - User data is available throughout the application

## Deployment

### Production Setup
1. Set `NODE_ENV=production`
2. Use a strong `JWT_SECRET`
3. Consider using a production database (PostgreSQL, MySQL)
4. Set up reverse proxy (nginx)
5. Enable HTTPS
6. Configure environment variables

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run init-db
EXPOSE 3000
CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support or questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

**Hrec HR System** - Streamlining HR management with secure authentication and comprehensive employee tools.
