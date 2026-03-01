# 🔄 Pipeline Architecture in Academic Compass Scheduling System

## Overview
The system uses **multiple interconnected pipelines** at different levels. Each pipeline has specific responsibilities and they work together for end-to-end optimization.

---

## 📊 **1. HYBRID SOLVER PIPELINE** (Primary Optimization)

**Location:** `solvers/hybrid_ga_cpsat.py`

```
Input: SchedulingContext
  ↓
┌─────────────────────────────────────┐
│  PHASE 1: GA EXPLORATION (40%)      │
│  - Population initialization        │
│  - Evolutionary operators           │
│  - Fitness evaluation               │
│  - Convergence tracking             │
└─────────────────────────────────────┘
  ↓ (best solution as warm start)
┌─────────────────────────────────────┐
│  PHASE 2: CP-SAT REFINEMENT (60%)   │
│  - Constraint modeling              │
│  - Warm start from GA               │
│  - Exact optimization               │
│  - Solution polishing               │
└─────────────────────────────────────┘
  ↓
Output: Optimized Solution (assignments + metadata)
```

**Why Pipeline Here?**
- **Exploration first, exploitation later**: GA explores diverse solutions, CP-SAT refines the best
- **Complementary strengths**: GA handles non-linear patterns, CP-SAT ensures constraint satisfaction
- **Time efficiency**: 40/60 split optimizes quality vs time trade-off

---

## 🧠 **2. ML PREDICTION PIPELINE** (Intelligence Layer)

**Location:** `ml/predictor.py`, `ml/features.py`

```
Input: Solution + Context
  ↓
┌─────────────────────────────────────┐
│  STEP 1: Feature Extraction         │
│  - Time features (utilization)      │
│  - Room features (capacity)         │
│  - Faculty features (load)          │
│  - Batch features (distribution)    │
│  - Constraint features (violations) │
│  - Pattern features (regularity)    │
│  Total: 89 features                 │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│  STEP 2: Quality Prediction         │
│  - Gradient Boosting Model          │
│  - 100 decision trees               │
│  - Quality score (0.0-1.0)          │
│  - Confidence score                 │
└─────────────────────────────────────┘
  ↓
Output: Predicted quality + confidence
```

**Why Pipeline Here?**
- **Raw data → actionable insights**: Transform complex solution data into single quality metric
- **Reusable features**: Same features used for prediction, pattern mining, and adaptation
- **Fast evaluation**: Predict quality in milliseconds vs minutes of solving

**Integration Points:**
- Used in Hybrid solver to reduce CP-SAT timeout if quality already high
- Used in ML-guided population initialization
- Used for solution comparison and selection

---

## 📈 **3. PATTERN MINING PIPELINE** (Learning Layer)

**Location:** `ml/patterns.py`

```
Input: Historical solutions (5+ solutions)
  ↓
┌─────────────────────────────────────┐
│  STEP 1: Pattern Discovery          │
│  - Faculty-subject patterns         │
│  - Temporal patterns (time prefs)   │
│  - Room usage patterns              │
│  - Batch distribution patterns      │
│  - Sequential patterns              │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│  STEP 2: Pattern Scoring            │
│  - Support (frequency)              │
│  - Confidence (reliability)         │
│  - Quality correlation              │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│  STEP 3: Pattern Application        │
│  - Guide future optimizations       │
│  - Warm start initialization        │
│  - Constraint weight adjustment     │
└─────────────────────────────────────┘
  ↓
Output: Actionable patterns + recommendations
```

**Why Pipeline Here?**
- **Data → knowledge → action**: Multi-stage transformation from raw solutions to optimization guidance
- **Cumulative learning**: Patterns improve over time as more data is collected
- **Explainability**: Patterns show WHY certain assignments work better

---

## 🔄 **4. ADAPTIVE WEIGHT PIPELINE** (Continuous Improvement)

**Location:** `ml/adaptive_weights.py`

```
Input: Solution + feedback + current weights
  ↓
┌─────────────────────────────────────┐
│  STEP 1: Violation Analysis         │
│  - Count violations by type         │
│  - Measure severity                 │
│  - Track trends                     │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│  STEP 2: Weight Adjustment          │
│  - Increase weight if violations ↑  │
│  - Decrease weight if violations ↓  │
│  - EMA smoothing (α=0.3)            │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│  STEP 3: Weight Application         │
│  - Update solver config             │
│  - Re-optimize if needed            │
└─────────────────────────────────────┘
  ↓
Output: Updated constraint weights
```

**Why Pipeline Here?**
- **Feedback loop**: Violations → adjustments → better solutions → less violations
- **Gradual adaptation**: EMA prevents over-correction from single bad solution
- **Automatic tuning**: No manual intervention needed

---

## 🎯 **5. END-TO-END OPTIMIZATION PIPELINE** (Complete Workflow)

**Location:** `demo_hybrid_pipeline.py`, API endpoints

```
┌═════════════════════════════════════════════════════════════════┐
│                    INPUT: Scheduling Requirements                │
│         (Faculty, Rooms, Subjects, Batches, Constraints)        │
└═════════════════════════════════════════════════════════════════┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 1: Data Validation & Context Creation                    │
│  - Validate inputs                                              │
│  - Build SchedulingContext                                      │
│  - Initialize solvers                                           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 2: Hybrid Optimization (GA → CP-SAT)                     │
│  - Run GA exploration (40% time)                                │
│  - Run CP-SAT refinement (60% time)                             │
│  - Track metadata                                               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 3: Solution Enhancement                                  │
│  - Extract 89 features                                          │
│  - Calculate quality metrics                                    │
│  - Validate constraints                                         │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 4: ML Learning (if predictor exists)                     │
│  - Update quality predictor                                     │
│  - Mine new patterns                                            │
│  - Adjust constraint weights                                    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  STAGE 5: Solution Storage & Feedback                           │
│  - Store solution in database                                   │
│  - Collect user feedback                                        │
│  - Trigger incremental learning                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌═════════════════════════════════════════════════════════════════┐
│              OUTPUT: Complete Timetable + Analytics              │
│    (Assignments, Quality Score, Patterns, Recommendations)      │
└═════════════════════════════════════════════════════════════════┘
```

**Why Complete Pipeline?**
- **Separation of concerns**: Each stage has single responsibility
- **Modularity**: Stages can be tested/optimized independently
- **Observability**: Track progress at each stage
- **Fault tolerance**: Stages can fail gracefully without breaking entire flow

---

## 🔧 **6. DATA PREPROCESSING PIPELINE** (Before Optimization)

**Location:** Context creation, data validation

```
Raw Input Data
  ↓
┌─────────────────────────────────────┐
│  STEP 1: Validation                 │
│  - Check required fields            │
│  - Validate relationships           │
│  - Ensure data consistency          │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│  STEP 2: Normalization              │
│  - Standardize IDs                  │
│  - Convert time formats             │
│  - Map qualifications               │
└─────────────────────────────────────┘
  ↓
┌─────────────────────────────────────┐
│  STEP 3: Enrichment                 │
│  - Calculate derived fields         │
│  - Build lookup maps                │
│  - Generate constraints             │
└─────────────────────────────────────┘
  ↓
Clean SchedulingContext
```

---

## 📊 **Pipeline Performance Comparison**

| Pipeline | Input | Output | Time | Purpose |
|----------|-------|--------|------|---------|
| **Hybrid Solver** | Context | Solution | 60-300s | Primary optimization |
| **ML Prediction** | Solution | Quality | <1s | Fast evaluation |
| **Pattern Mining** | 5+ Solutions | Patterns | 2-5s | Knowledge extraction |
| **Adaptive Weights** | Solution + Feedback | Weights | <1s | Continuous tuning |
| **End-to-End** | Raw Data | Timetable | 60-400s | Complete workflow |

---

## 🎯 **Key Pipeline Benefits**

### 1. **Modularity**
- Each pipeline can be tested independently
- Easy to swap components (e.g., replace GA with different algorithm)
- Clear interfaces between stages

### 2. **Observability**
- Track progress at each stage
- Measure performance per pipeline
- Debug specific components

### 3. **Scalability**
- Parallelize independent pipelines
- Cache intermediate results
- Batch processing where applicable

### 4. **Maintainability**
- Single responsibility per pipeline
- Clear data flow
- Easy to document and understand

### 5. **Flexibility**
- Skip optional stages (e.g., ML if not trained)
- Configure timeout/quality trade-offs
- Adapt to different problem sizes

---

## 🚀 **Usage Example**

```python
# Complete pipeline example
from solvers.hybrid_ga_cpsat import HybridGACPSATSolver
from ml.predictor import QualityPredictor
from ml.features import FeatureExtractor
from ml.patterns import PatternMiner

# STEP 1: Create context (Data preprocessing pipeline)
context = create_scheduling_context(raw_data)

# STEP 2: Train ML predictor (if historical data exists)
predictor = QualityPredictor(context)
if historical_solutions:
    predictor.fit(historical_solutions)

# STEP 3: Run hybrid optimization (Hybrid solver pipeline)
hybrid = HybridGACPSATSolver(context, ml_predictor=predictor)
solution = hybrid.solve(timeout=120, ga_ratio=0.4)

# STEP 4: Extract features (Feature extraction pipeline)
extractor = FeatureExtractor(context)
features = extractor.extract(solution)

# STEP 5: Mine patterns (Pattern mining pipeline)
miner = PatternMiner(context)
patterns = miner.mine_patterns([solution] + historical_solutions)

# STEP 6: Get hybrid performance stats
stats = hybrid.get_performance_stats()
print(f"GA Quality: {stats['ga_quality']:.4f}")
print(f"Final Quality: {stats['final_quality']:.4f}")
print(f"Improvement: {stats['improvement']:.2%}")
```

---

## 📝 **Pipeline Files Reference**

| Pipeline | Primary File | Supporting Files |
|----------|-------------|------------------|
| Hybrid Solver | `solvers/hybrid_ga_cpsat.py` | `solvers/genetic_algorithm.py` |
| ML Prediction | `ml/predictor.py` | `ml/features.py` |
| Pattern Mining | `ml/patterns.py` | - |
| Adaptive Weights | `ml/adaptive_weights.py` | - |
| End-to-End | `demo_hybrid_pipeline.py` | All above |
| Data Preprocessing | `core/context.py` | `core/models.py` |

---

## 🎓 **When to Use Each Pipeline**

### Use **Hybrid Solver Pipeline** when:
- Need high-quality timetable
- Have medium/large problem (1000+ assignments)
- Want balance of exploration + optimization
- Time budget: 60-300 seconds

### Use **ML Prediction Pipeline** when:
- Need fast quality estimation
- Comparing multiple solutions
- Making real-time decisions
- Time budget: <1 second

### Use **Pattern Mining Pipeline** when:
- Have 5+ historical solutions
- Want to learn from past success
- Need explainable insights
- Time budget: 2-5 seconds

### Use **Adaptive Weights Pipeline** when:
- Getting consistent violations
- Want automatic tuning
- Have user feedback
- Time budget: <1 second

### Use **End-to-End Pipeline** when:
- Full production deployment
- Need complete workflow
- Want all features enabled
- Time budget: 60-400 seconds

---

## ✅ **Current Implementation Status**

| Pipeline | Status | Tests | Coverage |
|----------|--------|-------|----------|
| Hybrid Solver | ✅ Implemented | 13 tests | 76% |
| ML Prediction | ✅ Implemented | 12 tests | 94% |
| Pattern Mining | ✅ Implemented | 10 tests | 100% |
| Adaptive Weights | ✅ Implemented | 8 tests | 95% |
| End-to-End | ✅ Demo Ready | Manual | N/A |
| Data Preprocessing | ✅ Implemented | Integrated | 98% |

---

## 🔮 **Future Pipeline Enhancements**

1. **Incremental Learning Pipeline** - Update ML models online without full retraining
2. **Multi-Objective Pipeline** - Optimize for multiple goals simultaneously
3. **Feedback Loop Pipeline** - Automated adjustment based on user satisfaction
4. **Parallel Pipeline Execution** - Run multiple solvers concurrently
5. **Real-time Monitoring Pipeline** - Track performance metrics live

---

**Version:** 2.0.0 (Hybrid GA+CPSAT)  
**Last Updated:** February 6, 2026  
**Maintained By:** Academic Compass Team
