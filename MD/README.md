# Academic Compass

A modern, professional landing page for Academic Compass - empowering students to navigate their educational journey with personalized guidance, resources, and tools for academic success.

## 🚀 Features

- **Professional Landing Page**: Modern, responsive design with gradient backgrounds and smooth animations
- **TypeScript Frontend & Backend**: Full-stack TypeScript implementation with type safety
- **Next.js 15**: Latest Next.js with App Router and Turbopack for fast development
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **API Routes**: RESTful API endpoints for student management and recommendations
- **Responsive Design**: Mobile-first approach with dark mode support
- **Modern Components**: Reusable React components with clean architecture

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes with TypeScript
- **Styling**: Tailwind CSS with custom gradients and animations
- **Development**: Turbopack for fast hot reloading
- **Linting**: ESLint with Next.js configuration

## 🚀 Getting Started

First, clone the repository and install dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or the port shown in your terminal) with your browser to see the result.

## 📁 Project Structure

```
src/
├── app/
│   ├── api/                   # API Routes
│   │   ├── auth/             # Authentication endpoints
│   │   └── admin/            # Admin management endpoints
│   ├── admin/                # Admin dashboard pages
│   ├── faculty/              # Faculty dashboard pages
│   ├── student/              # Student dashboard pages
│   ├── login/                # Login page
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout component
│   └── page.tsx              # Landing page
├── components/               # Reusable React components
│   ├── Header.tsx           # Navigation header with auth
│   └── ...
├── contexts/                # React Context providers
│   └── ThemeContext.tsx     # Dark mode theme provider
└── lib/                     # Utility libraries
    └── supabase.ts          # Supabase client & types

database/                    # 🗄️ SQL Scripts & Schema
├── schema.sql              # Original database schema
├── new_schema.sql          # Enhanced schema
├── fix-*.sql               # Database fix scripts
├── insert-*.sql            # Data insertion scripts
├── verify-*.sql            # Verification scripts
├── README.md               # Database documentation
└── README-SQL-SCRIPTS.md   # SQL scripts guide

scripts/                    # 🔧 Utility JavaScript Scripts
├── check-*.js             # Verification scripts
├── debug-*.js             # Debugging tools
├── fix-*.js               # Database fix scripts
├── setup-*.js             # Setup & initialization
├── test-*.js              # Testing scripts
└── README.md              # Scripts documentation

refrance/                  # Reference implementations
public/                    # Static assets
```

## 🔌 API Endpoints

### Students API (`/api/students`)
- `GET /api/students` - Retrieve students with optional filtering
- `POST /api/students` - Create a new student profile

### Recommendations API (`/api/recommendations`)
- `POST /api/recommendations` - Generate personalized course and career recommendations

## 🎨 Design Features

- **Gradient Backgrounds**: Beautiful blue-to-purple gradients throughout
- **Glassmorphism Effects**: Modern backdrop blur effects
- **Smooth Animations**: Hover effects and transitions
- **Responsive Grid Layouts**: Adaptive layouts for all screen sizes
- **Professional Typography**: Clean, readable font choices
- **Interactive Components**: Engaging user interface elements

## 🚀 Deployment

### Build the project:

```bash
npm run build
```

### Start the production server:

```bash
npm start
```

The project is optimized for deployment on Vercel, Netlify, or any other modern hosting platform.

## � Organized Folders

### 🗄️ `database/` - SQL Scripts & Schema
All SQL files for database management are organized here:
- Schema definitions (`schema.sql`, `new_schema.sql`)
- Setup scripts (`setup-*.sql`)
- Fix scripts (`fix-*.sql`)
- Data insertion (`insert-*.sql`)
- Verification scripts (`verify-*.sql`)

📖 **See**: `database/README-SQL-SCRIPTS.md` for detailed documentation

### 🔧 `scripts/` - Utility Scripts
All JavaScript utility scripts are organized here:
- Authentication scripts (`check-admin-role.js`, `create-admin.js`)
- Debugging tools (`debug-*.js`)
- Database management (`fix-*.js`, `deploy-schema.js`)
- Testing utilities (`test-*.js`)
- Setup scripts (`setup-*.js`)

📖 **See**: `scripts/README.md` for detailed documentation

### 🎨 `refrance/` - Reference Files
Reference implementations and examples from previous versions.

## 🗄️ Database Setup

1. **Create Supabase Project**: [supabase.com/dashboard](https://supabase.com/dashboard)
2. **Run Schema**: Execute `database/new_schema.sql` in SQL Editor
3. **Setup Permissions**: Run `database/complete_schema_with_permissions.sql`
4. **Insert Data**: Run `database/insert_full_cse_curriculum.sql`
5. **Configure Environment**: Add Supabase credentials to `.env.local`

For detailed instructions, see `database/README.md`

## 🔧 Utility Scripts

Run scripts from the project root:

```bash
# Check admin role
node scripts/check-admin-role.js

# Show system summary
node scripts/show-system-summary.js

# Fix admin access
node scripts/fix-admin-access-level.js
```

**Note**: Scripts require Supabase credentials in `.env.local`

## �📝 Customization

The landing page is fully customizable:

1. **Branding**: Update colors, fonts, and logo in the components
2. **Content**: Modify text content in each component
3. **API**: Extend the API routes for additional functionality
4. **Styling**: Customize Tailwind CSS classes or add custom CSS

## 🔧 Development

- **Hot Reloading**: Turbopack provides instant updates during development
- **Type Safety**: Full TypeScript support with strict type checking
- **Code Quality**: ESLint configuration for consistent code style
- **Modern Features**: Latest React and Next.js features

## 📄 License

This project is created for educational and demonstration purposes.
