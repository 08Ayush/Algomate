# Academic Campus

> Modern Academic Campus Management System with modular monolithic architecture

[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)

---

## 📚 Documentation

**All documentation is now organized in the [`/docs`](./docs) folder.**

### Quick Links

- **[📖 Full Documentation Index](./docs/README.md)** - Start here for complete navigation
- **[🏗️ Architecture](./docs/architecture/ARCHITECTURE.md)** - System design & structure
- **[🔄 Migration Guide](./docs/migration/walkthrough.md)** - Modular architecture migration
- **[📊 API Documentation](http://localhost:3000/api-docs)** - Interactive Swagger UI
- **[📝 ADRs](./docs/architecture/decisions/)** - Architecture Decision Records

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

**Environment Variables:** Copy `.env.example` to `.env.local` and configure.

---

## 📁 Project Structure

```
academic_campass_2025/
├── docs/                      # 📚 All documentation
│   ├── architecture/         # System design, ADRs, diagrams
│   ├── migration/            # Migration guides
│   ├── project/              # Setup & deployment guides  
│   ├── api/                  # API specifications
│   └── legacy-fixes/         # Historical fixes
│
├── src/
│   ├── app/                  # Next.js app router
│   │   └── api/             # API routes
│   ├── modules/              # Business logic modules
│   │   ├── elective/        # NEP elective management
│   │   ├── timetable/       # Timetable workflows
│   │   ├── batch/           # Student batch management
│   │   ├── classroom/       # Classroom resources
│   │   └── course/          # Course management
│   └── shared/               # Shared infrastructure
│       ├── database/        # Database clients
│       ├── middleware/      # Auth middleware
│       ├── cache/           # Caching layer
│       ├── events/          # Event bus
│       ├── logging/         # Structured logging
│       └── metrics/         # Prometheus metrics
│
├── __tests__/                # Test suites
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   └── e2e/                 # End-to-end tests
│
└── public/                   # Static assets
```

---

## ✨ Features

### Core Functionality
- ✅ **Timetable Management** - AI-powered scheduling with CP-SAT algorithm
- ✅ **NEP Elective System** - Student subject choice & allocation
- ✅ **Batch Management** - Student cohort tracking
- ✅ **Event Management** - Campus events & registrations
- ✅ **Notifications** - Real-time alerts & updates

### Architecture Features
- ✅ **Modular Monolithic** - Clean separation of concerns
- ✅ **Domain-Driven Design** - Business logic in modules
- ✅ **Repository Pattern** - Abstracted data access
- ✅ **Event-Driven** - Inter-module communication
- ✅ **Caching** - Redis with memory fallback
- ✅ **Observability** - Logging, metrics, tracing

### Quality & Testing
- ✅ **Type-Safe** - Full TypeScript + Zod validation
- ✅ **Tested** - Unit, integration & E2E tests
- ✅ **Documented** - OpenAPI/Swagger + ADRs
- ✅ **Monitored** - Prometheus metrics

---

## 🏗️ Architecture

Built with **modular monolithic architecture**:

- **15 Modules** organized by business domain
- **Clean Architecture** with domain/application/infrastructure layers
- **Repository Pattern** for data access abstraction
- **Use Case Pattern** for business logic encapsulation
- **Event Bus** for loose coupling between modules

**[Read full architecture docs →](./docs/architecture/ARCHITECTURE.md)**

---

## 📊 API Documentation

Interactive API documentation available at:
- **Development:** http://localhost:3000/api-docs
- **Metrics:** http://localhost:3000/api/metrics

**[Read API docs →](./docs/api/openapi.yaml)**

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

**[Read testing guide →](./docs/testing/README.md)**

---

## 🔧 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 15, React 19 |
| **Language** | TypeScript 5 |
| **Database** | Supabase (PostgreSQL) |
| **Validation** | Zod |
| **Testing** | Vitest, Playwright |
| **Caching** | Redis / In-Memory |
| **Logging** | Pino |
| **Metrics** | Prometheus |
| **UI** | Tailwind CSS |

---

## 📈 Status

**✅ Production Ready**

- 31 routes migrated to modular architecture
- 15 modules with clean boundaries
- Comprehensive test coverage
- Full observability stack
- Complete documentation

---

## 📝 License

[Your License Here]

---

## 🤝 Contributing

1. Read [Architecture Docs](./docs/architecture/)
2. Check [ADRs](./docs/architecture/decisions/)
3. Follow module structure
4. Write tests
5. Update documentation

---

## 📞 Support

- **Documentation:** [`/docs`](./docs)
- **Issues:** [GitHub Issues](#)
- **Email:** support@academiccampus.edu

---

**Built with ❤️ by the Academic Campus Team**
