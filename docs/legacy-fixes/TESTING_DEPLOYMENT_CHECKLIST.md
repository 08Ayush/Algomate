# Phase 4 & 5 Testing and Deployment Checklist

## 🎯 Testing Checklist

### Phase 4: Frontend Curriculum Builder

#### Installation & Setup
- [ ] Install `@dnd-kit` packages
  ```powershell
  npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
  ```
- [ ] Verify package.json includes all dependencies
- [ ] Start development server: `npm run dev`
- [ ] Access page at `http://localhost:3000/nep-curriculum`

#### CurriculumBuilder Component
- [ ] **Bucket Creation**
  - [ ] Click "Add Bucket" button
  - [ ] Enter bucket name (e.g., "Semester 1 Major Pool")
  - [ ] Verify bucket appears in right column
  - [ ] Delete bucket using "Remove" button

- [ ] **Drag and Drop**
  - [ ] Drag subject from left "Available Subjects" list
  - [ ] Drop into bucket zone
  - [ ] Verify subject appears in bucket
  - [ ] Drag subject back to available list
  - [ ] Verify subject returns to available subjects

- [ ] **Common Time Slot Toggle**
  - [ ] Toggle "Common Time Slot" switch ON
  - [ ] Verify switch changes color/state
  - [ ] Toggle switch OFF
  - [ ] Verify state persists when saving

- [ ] **Min/Max Selection Controls**
  - [ ] Click "-" button on Min Selection
  - [ ] Verify minimum doesn't go below 0
  - [ ] Click "+" button on Min Selection
  - [ ] Verify minimum increases
  - [ ] Click "-" button on Max Selection
  - [ ] Verify maximum doesn't go below minimum
  - [ ] Click "+" button on Max Selection
  - [ ] Verify maximum increases

- [ ] **Save to Database**
  - [ ] Create 2-3 buckets with subjects
  - [ ] Click "Save Buckets" button
  - [ ] Wait for success message
  - [ ] Refresh page
  - [ ] Verify buckets persist (check Supabase directly)

#### MockStudentGenerator Component
- [ ] **Student Generation**
  - [ ] Move slider to 50 students
  - [ ] Click "Generate Mock Students"
  - [ ] Wait for success message
  - [ ] Verify student count displays correctly

- [ ] **Enrollment Statistics**
  - [ ] Click "View Stats" button
  - [ ] Verify statistics table shows all subjects
  - [ ] Check enrollment counts are reasonable
  - [ ] Verify percentages add up correctly

- [ ] **Delete Mock Students**
  - [ ] Click "Delete All Mock Students"
  - [ ] Confirm deletion in dialog
  - [ ] Wait for success message
  - [ ] Click "View Stats" again
  - [ ] Verify counts are zero

#### Database Integration
- [ ] **Verify elective_buckets table**
  - [ ] Open Supabase dashboard
  - [ ] Check `elective_buckets` table
  - [ ] Verify bucket records exist with correct data

- [ ] **Verify student_course_selections table**
  - [ ] Check `student_course_selections` table
  - [ ] Verify selection records exist
  - [ ] Check subject_id foreign keys are valid

#### Error Handling
- [ ] Try saving empty bucket (should show warning)
- [ ] Try generating 0 students (should show error)
- [ ] Disconnect from internet, try saving (should show error)
- [ ] Check browser console for errors

---

### Phase 5: RL Optimization

#### Installation & Setup
- [ ] **Install Python dependencies**
  ```powershell
  .\.venv\Scripts\python -m pip install gymnasium stable-baselines3 torch numpy
  ```
- [ ] Verify all packages installed successfully
- [ ] Check virtual environment is activated

#### Environment Validation
- [ ] **Run quick start**
  ```powershell
  .\.venv\Scripts\python quick_start_rl.py
  ```
  - [ ] All 4 checks pass
  - [ ] Environment creates successfully
  - [ ] Sample steps execute without errors
  - [ ] Gymnasium compatibility confirmed

- [ ] **Run full test suite**
  ```powershell
  .\.venv\Scripts\python test_rl_environment.py
  ```
  - [ ] Test 1: Environment Creation ✓
  - [ ] Test 2: Environment Reset ✓
  - [ ] Test 3: Environment Step ✓
  - [ ] Test 4: Complete Episode ✓
  - [ ] Test 5: Gymnasium Compatibility ✓
  - [ ] Test 6: Reward Function ✓
  - [ ] Test 7: Parameter Bounds ✓

#### Training (Quick Test)
- [ ] **10k timesteps training**
  ```powershell
  .\.venv\Scripts\python services\rl\train_ga_optimizer.py --mode train --timesteps 10000
  ```
  - [ ] Training starts without errors
  - [ ] Progress bar shows updates
  - [ ] Checkpoints saved to `models/ppo_timetable_ga/`
  - [ ] Training completes successfully
  - [ ] Final model saved

- [ ] **TensorBoard monitoring**
  ```powershell
  .\.venv\Scripts\python -m tensorboard.main --logdir logs/ppo_timetable_ga
  ```
  - [ ] TensorBoard starts on port 6006
  - [ ] Open `http://localhost:6006`
  - [ ] Verify training curves visible
  - [ ] Check episode reward mean
  - [ ] Check policy loss values

#### Testing Trained Model
- [ ] **Test mode**
  ```powershell
  .\.venv\Scripts\python services\rl\train_ga_optimizer.py --mode test
  ```
  - [ ] Model loads successfully
  - [ ] 3 test episodes execute
  - [ ] Final fitness values displayed
  - [ ] Summary statistics shown

- [ ] **Compare mode**
  ```powershell
  .\.venv\Scripts\python services\rl\train_ga_optimizer.py --mode compare
  ```
  - [ ] Static GA runs successfully
  - [ ] RL-optimized GA runs successfully
  - [ ] Comparison results displayed
  - [ ] Verify RL shows improvement

#### Training (Full)
- [ ] **100k timesteps training** (optional, takes 1-2 hours)
  ```powershell
  .\.venv\Scripts\python services\rl\train_ga_optimizer.py --mode train --timesteps 100000
  ```
  - [ ] Training completes successfully
  - [ ] Final model achieves >80% success rate
  - [ ] Average episode reward > 100
  - [ ] Model saved to `models/ppo_timetable_ga/ppo_ga_optimizer_final.zip`

#### Performance Validation
- [ ] RL agent achieves higher fitness than static GA
- [ ] RL agent reaches 0.9 fitness faster
- [ ] RL agent uses fewer generations
- [ ] Training curves show improvement over time

---

## 🚀 Deployment Checklist

### Pre-Deployment

#### Code Review
- [ ] All Phase 4 components in `src/components/nep/`
- [ ] All Phase 5 components in `services/rl/`
- [ ] All test files present and passing
- [ ] Documentation complete

#### Dependencies
- [ ] `package.json` includes all Node.js packages
- [ ] `requirements.txt` includes all Python packages
- [ ] No conflicting versions
- [ ] Lock files updated (`package-lock.json`)

#### Configuration
- [ ] `.env` file configured correctly
- [ ] Supabase credentials valid
- [ ] Database migrations applied
- [ ] API endpoints tested

#### Testing
- [ ] All Phase 4 tests pass
- [ ] All Phase 5 tests pass
- [ ] Integration tests complete
- [ ] Performance benchmarks meet targets

### Database Migration

#### Phase 3 Schema Updates
- [ ] **Step 1: Enum values**
  ```sql
  -- Run in Supabase SQL Editor
  -- Copy contents of database/phase3_step1_enum.sql
  ```
  - [ ] TEACHING_PRACTICE enum value added
  - [ ] DISSERTATION enum value added
  - [ ] No errors in execution

- [ ] **Step 2: Schema changes**
  ```sql
  -- Run in Supabase SQL Editor
  -- Copy contents of database/phase3_step2_schema.sql
  ```
  - [ ] Special event columns added to subjects table
  - [ ] Views updated
  - [ ] Triggers created
  - [ ] No errors in execution

- [ ] Verify database schema matches expected structure

### Frontend Deployment

#### Build
- [ ] Run production build
  ```powershell
  npm run build
  ```
- [ ] No build errors
- [ ] No TypeScript errors
- [ ] Bundle size acceptable

#### Deployment Platform (Vercel/Netlify/etc.)
- [ ] Environment variables configured
- [ ] Build settings correct
- [ ] Domain configured
- [ ] SSL certificate active
- [ ] Deploy successful

#### Post-Deployment Frontend
- [ ] Visit production URL
- [ ] Test `/nep-curriculum` page
- [ ] Verify drag-and-drop works
- [ ] Test mock student generation
- [ ] Check Supabase connection
- [ ] Test on mobile devices
- [ ] Test on different browsers

### Backend Deployment

#### Python Environment Setup
- [ ] Python 3.11+ installed on server
- [ ] Virtual environment created
- [ ] All dependencies installed from `requirements.txt`
- [ ] OR-Tools working correctly

#### RL Model Deployment
- [ ] Trained model file exists
- [ ] Model size acceptable (<100MB)
- [ ] Model loads without errors
- [ ] GPU support configured (if available)

#### API Endpoints (if applicable)
- [ ] Scheduler endpoint working
- [ ] RL optimization endpoint working
- [ ] Authentication configured
- [ ] Rate limiting set up

### Integration Testing

#### End-to-End Workflow
1. [ ] **Create Curriculum**
   - [ ] Admin creates elective buckets
   - [ ] Admin assigns subjects to buckets
   - [ ] Configuration saved to database

2. [ ] **Generate Test Data**
   - [ ] Generate 100 mock students
   - [ ] Random course selections created
   - [ ] Enrollment statistics accurate

3. [ ] **Run Scheduler**
   - [ ] NEP scheduler fetches bucket data
   - [ ] CP-SAT solver generates timetable
   - [ ] Special events handled correctly
   - [ ] No conflicts detected

4. [ ] **RL Optimization**
   - [ ] RL agent loads successfully
   - [ ] GA parameters adjusted dynamically
   - [ ] Fitness improves over static GA
   - [ ] Timetable quality acceptable

#### Cross-Browser Testing
- [ ] Chrome (desktop)
- [ ] Firefox (desktop)
- [ ] Safari (desktop)
- [ ] Edge (desktop)
- [ ] Chrome (mobile)
- [ ] Safari (mobile)

#### Performance Testing
- [ ] Page load time < 3 seconds
- [ ] Drag-and-drop responsive
- [ ] Student generation < 5 seconds for 100 students
- [ ] Scheduler completes < 30 seconds for medium batch

### Documentation

#### User Documentation
- [ ] Admin guide for curriculum builder
- [ ] User guide for viewing timetables
- [ ] FAQ document
- [ ] Troubleshooting guide

#### Technical Documentation
- [ ] API documentation
- [ ] Database schema documentation
- [ ] Deployment guide
- [ ] Maintenance procedures

#### Training Materials
- [ ] Video tutorials for admins
- [ ] Screenshots/GIFs for key features
- [ ] Sample data for testing
- [ ] Training session scheduled

### Monitoring & Maintenance

#### Monitoring Setup
- [ ] Error tracking configured (Sentry/etc.)
- [ ] Performance monitoring active
- [ ] Database monitoring set up
- [ ] Alerts configured

#### Backup & Recovery
- [ ] Database backup scheduled
- [ ] Backup restoration tested
- [ ] Disaster recovery plan documented

#### Maintenance Schedule
- [ ] Weekly health checks planned
- [ ] Monthly performance reviews scheduled
- [ ] Quarterly dependency updates planned

---

## 📊 Success Criteria

### Phase 4 Success Metrics
- ✅ Curriculum builder fully functional
- ✅ Drag-and-drop works smoothly
- ✅ Mock student generation creates valid data
- ✅ Database integration error-free
- ✅ Zero critical bugs in production

### Phase 5 Success Metrics
- ✅ RL environment passes all 7 tests
- ✅ Training completes without errors
- ✅ RL agent achieves >80% success rate
- ✅ RL optimization improves fitness by >10%
- ✅ Integration with scheduler successful

### Overall Success Metrics
- ✅ All 5 phases complete
- ✅ All tests passing
- ✅ Documentation complete
- ✅ Deployed to production
- ✅ User acceptance achieved

---

## 🐛 Known Issues & Workarounds

### Phase 4 Issues
- **Issue**: Drag preview sometimes flickers
  - **Workaround**: Update `@dnd-kit` to latest version
  - **Status**: Minor, does not affect functionality

- **Issue**: Large subject lists may slow rendering
  - **Workaround**: Implement pagination or virtualization
  - **Status**: Only affects batches with 200+ subjects

### Phase 5 Issues
- **Issue**: Training on CPU is slow
  - **Workaround**: Use GPU or cloud training
  - **Status**: Expected behavior, not a bug

- **Issue**: Model file size (~50MB)
  - **Workaround**: Use model compression or ONNX export
  - **Status**: Acceptable for most deployments

---

## 📞 Support Contacts

- **Technical Lead**: [Name]
- **Database Admin**: [Name]
- **Frontend Developer**: [Name]
- **Backend Developer**: [Name]
- **Project Manager**: [Name]

---

## ✅ Final Sign-Off

### Development Team
- [ ] Frontend Developer: Code reviewed and tested
- [ ] Backend Developer: Code reviewed and tested
- [ ] QA Engineer: All tests passed
- [ ] Technical Lead: Architecture approved

### Stakeholders
- [ ] Product Owner: Features approved
- [ ] Project Manager: Timeline met
- [ ] Client: User acceptance complete

### Deployment Authorization
- [ ] Technical Lead: Production deployment approved
- [ ] Project Manager: Go-live authorized
- [ ] Date of Deployment: __________________
- [ ] Deployed By: __________________

---

**Status**: Phase 4 & 5 Complete - Ready for Testing ✅  
**Last Updated**: [Current Date]  
**Version**: 1.0.0
