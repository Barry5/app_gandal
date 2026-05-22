# PostgreSQL Database Configuration for Savoir-App

## Database Setup

1. **Install PostgreSQL** (if not already installed)
   ```bash
   # Ubuntu/Debian
   sudo apt update && sudo apt install postgresql postgresql-contrib
   
   # macOS
   brew install postgresql
   brew services start postgresql
   ```

2. **Create Database and User**
   ```bash
   sudo -u postgres psql
   
   CREATE DATABASE savoir_app;
   CREATE USER savoir_user WITH ENCRYPTED PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE savoir_app TO savoir_user;
   \q
   ```

3. **Environment Variables**
   Create a `.env` file in `apps/api/`:
   ```env
   DATABASE_URL=postgresql://savoir_user:your_password@localhost:5432/savoir_app
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   APP_URL=http://localhost:3000
   PAYSTACK_SECRET_KEY=your_paystack_key
   ```

## Running Migrations

From the monorepo root:

```bash
cd packages/db
npx drizzle-kit generate
npx drizzle-kit push
```

Or with the npm scripts:
```bash
npm run db:generate
npm run db:push
```

## Schema Overview

The database includes these main tables:
- `users` - All users (formateurs and apprenants)
- `creators` - Formateur profiles with plans
- `courses` - Course information
- `modules` - Course chapters
- `lessons` - Individual lessons (video, text, pdf, quiz)
- `quiz_questions` - Questions for quiz lessons
- `enrollments` - Student course enrollments
- `lesson_progress` - Individual lesson progress tracking
- `quiz_attempts` - Quiz attempt history
- `certificates` - Course completion certificates
- `discussions` - Forum discussions per lesson
- `notifications` - User notifications
- `payments` - Payment records
- `ai_conversations` - AI tutoring conversations
- `course_ratings` - Course reviews and ratings

## Indexes

Key indexes for performance:
- `idx_users_email` - Fast user lookup by email
- `idx_courses_creator` - Courses by creator
- `idx_courses_status` - Published courses filter
- `idx_enrollments_user` - User enrollments
- `idx_enrollments_course` - Course students
- `idx_progress_user` - User progress queries
- `idx_discussions_lesson` - Lesson discussions

## Row Level Security (RLS)

For production, consider implementing Row Level Security:
- Users can only access their own data
- Creators can only modify their own courses
- Enrollments are validated against payment status