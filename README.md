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
│   ├── api/
│   │   ├── students/          # Student management API
│   │   └── recommendations/   # AI-powered recommendations API
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout component
│   └── page.tsx              # Home page
└── components/
    ├── Header.tsx            # Navigation header
    ├── Hero.tsx              # Hero section
    ├── Features.tsx          # Features showcase
    ├── About.tsx             # About section
    ├── CTA.tsx               # Call-to-action section
    └── Footer.tsx            # Footer component
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

## 📝 Customization

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
