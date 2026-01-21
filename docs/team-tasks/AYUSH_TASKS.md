# 👨‍💻 Ayush - Database Expert Tasks

## 🎯 Role: Database Expert (DB + Infrastructure Focus)

### Primary Ownership
**Data Layer, Reliability & Performance**

---

## ✅ Critical Components

### 1. Database Optimizations
**Priority: HIGH | Timeline: Week 1-2**

- [ ] **Index Strategy Implementation**
  - [ ] Analyze slow queries using Supabase query performance
  - [ ] Create composite indexes for frequently joined tables
  - [ ] Implement partial indexes for filtered queries
  - [ ] Document index strategy in `db/optimizations.md`

- [ ] **Query Optimization & Analysis**
  - [ ] Run EXPLAIN ANALYZE on critical endpoints
  - [ ] Optimize N+1 queries in repositories
  - [ ] Add query result caching where appropriate
  - [ ] Create performance benchmarks

- [ ] **Connection Pooling Configuration**
  - [ ] Configure Supabase connection limits
  - [ ] Implement connection retry logic
  - [ ] Monitor connection pool metrics
  - [ ] Document best practices for repository usage

### 2. Transaction Management
**Priority: HIGH | Timeline: Week 2-3**

- [ ] **Cross-Module Transaction Handling**
  - [ ] Design transaction boundaries for multi-module operations
  - [ ] Implement transaction wrapper utilities
  - [ ] Add rollback logic for failed operations
  - [ ] Test transaction isolation levels

- [ ] **Saga Pattern Design**
  - [ ] Identify long-running transactions
  - [ ] Design compensation logic for rollbacks
  - [ ] Implement saga coordinator service
  - [ ] Document saga patterns in use

### 3. Multi-Tenancy Enforcement
**Priority: CRITICAL | Timeline: Week 1**

- [ ] **RLS Policies**
  - [ ] Review existing RLS policies on all tables
  - [ ] Implement tenant_id enforcement across schema
  - [ ] Create RLS policy templates
  - [ ] Test data isolation between tenants
  - [ ] Document RLS implementation

- [ ] **Data Isolation Guarantees**
  - [ ] Audit all database queries for tenant safety
  - [ ] Add tenant_id checks in repository layer
  - [ ] Create automated tests for isolation
  - [ ] Write security audit report

---

## 📋 Important Features

### 4. Audit Logging Schema
**Priority: MEDIUM | Timeline: Week 3**

- [ ] Design audit_logs table schema
- [ ] Implement triggers for automatic logging
- [ ] Create audit log query utilities
- [ ] Add retention policy configuration
- [ ] Build audit log dashboard API

### 5. Backup & Disaster Recovery
**Priority: HIGH | Timeline: Week 2**

- [ ] **Backup Strategy**
  - [ ] Configure automated Supabase backups
  - [ ] Test point-in-time recovery
  - [ ] Document backup schedule
  - [ ] Create restore procedures

- [ ] **Disaster Recovery Planning**
  - [ ] Write disaster recovery SOP
  - [ ] Define RPO/RTO targets
  - [ ] Create failover procedures
  - [ ] Test recovery scenarios

### 6. Data Export/Import Pipelines
**Priority: LOW | Timeline: Week 4**

- [ ] Design bulk export utilities
- [ ] Implement CSV/JSON export APIs
- [ ] Create data import validation
- [ ] Build migration tools for data transfer

---

## 📦 Deliverables

### Documentation
- [ ] `db/optimizations.md` - Indexing and query optimization guide
- [ ] `db/rls-policies.sql` - All RLS policy definitions
- [ ] `db/transaction-patterns.md` - Transaction design patterns
- [ ] `db/backup-restore-sop.md` - Backup and recovery procedures

### Code
- [ ] `src/shared/database/transactions.ts` - Transaction utilities
- [ ] `src/shared/database/audit.ts` - Audit logging helpers
- [ ] SQL migration scripts in `database/migrations/`
- [ ] Repository optimization examples

### Testing
- [ ] Performance benchmarks
- [ ] RLS isolation tests
- [ ] Transaction rollback tests
- [ ] Disaster recovery drills

---

## 🔗 Dependencies & Collaboration

### Works Closely With:
- **Paritosh**: Redis caching strategies, query optimization
- **Mayur**: Transaction boundaries in use cases, API performance

### Needs Approval From:
- **Mayur**: Architecture decisions, schema changes

### Blocks:
- All team members depend on DB optimizations for performance

---

## 📊 Success Metrics

- [ ] All critical queries < 100ms response time
- [ ] Zero data leakage between tenants (RLS audit pass)
- [ ] 99.9% database uptime
- [ ] Successful disaster recovery drill
- [ ] All tables properly indexed (no seq scans on large tables)

---

## 🛠️ Tools & Resources

- **Supabase Studio** - Schema management
- **pgAdmin** - Query analysis
- **Grafana** - Performance monitoring
- **SQL Files**: `database/` directory

---

## ⚠️ Critical Rules

1. ❌ **No schema changes** without migration scripts
2. ❌ **No production queries** without EXPLAIN analysis
3. ✅ **Always test RLS** before deployment
4. ✅ **Document all indexes** with rationale
5. ✅ **Backup before major changes**
