# Task 2: Production-Ready Hybrid Algorithm Pipeline Design

**Date:** January 24, 2026  
**Architect:** ML Ops Engineering  
**Project:** Academic Compass - NEP 2020 Timetable Scheduler

---

## Executive Summary

This document presents a production-ready pipeline architecture for implementing the hybrid CP-SAT + Genetic Algorithm scheduling system. The design bridges the existing Python CP-SAT solver with a new GA optimizer, integrated into the Next.js application via subprocess communication.

---

## 1. Pipeline Architecture

### 1.1 High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HYBRID SCHEDULING PIPELINE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Next.js │───▶│    Python    │───▶│    Python    │───▶│   Supabase   │  │
│  │   API    │    │   CP-SAT     │    │      GA      │    │   Database   │  │
│  │  (POST)  │    │   Solver     │    │  Optimizer   │    │    (Save)    │  │
│  └──────────┘    └──────────────┘    └──────────────┘    └──────────────┘  │
│       │                │                    │                    │          │
│       ▼                ▼                    ▼                    ▼          │
│  ┌──────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  batch_id │    │  N Feasible  │    │ Best Solution│    │ scheduled_   │  │
│  │  config   │    │  Solutions   │    │ (Optimized)  │    │ classes      │  │
│  └──────────┘    └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                                             │
│  Phase 1: INITIALIZING → Phase 2: CP_SAT → Phase 3: GA → Phase 4: COMPLETE │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Phase Breakdown

| Phase | Component | Input | Output | Duration |
|-------|-----------|-------|--------|----------|
| 1 | API Validation | `batch_id`, config | Task created | <1s |
| 2 | CP-SAT Solver | Batch data from DB | N feasible solutions | 5-30s |
| 3 | GA Optimizer | CP-SAT solutions | 1 optimized solution | 30-120s |
| 4 | Persistence | Best solution | DB records | <2s |

---

## 2. Proposed File Structure

```
academic_compass_2025/
├── services/
│   └── scheduler/
│       ├── __init__.py                    # Package initialization
│       ├── nep_scheduler.py               # ✅ EXISTS - CP-SAT solver
│       ├── genetic_optimizer.py           # 🆕 CREATE - DEAP-based GA
│       ├── hybrid_orchestrator.py         # 🆕 CREATE - Main pipeline entry
│       ├── fitness_calculator.py          # 🆕 CREATE - Soft constraint scoring
│       ├── chromosome_encoder.py          # 🆕 CREATE - Timetable ↔ chromosome
│       ├── config.py                      # 🆕 CREATE - Algorithm hyperparameters
│       └── utils/
│           ├── __init__.py
│           ├── db_client.py               # 🆕 CREATE - Shared Supabase client
│           └── logger.py                  # 🆕 CREATE - Structured logging
│
├── src/app/api/
│   └── scheduler/
│       ├── generate/
│       │   └── route.ts                   # 🆕 CREATE - Subprocess bridge
│       ├── status/
│       │   └── [taskId]/
│       │       └── route.ts               # 🆕 CREATE - Progress polling
│       └── solutions/
│           └── [taskId]/
│               └── route.ts               # 🆕 CREATE - Fetch results
│
└── requirements.txt                        # 🔄 UPDATE - Add deap>=1.4.0
```

---

## 3. Component Specifications

### 3.1 `hybrid_orchestrator.py` (Main Entry Point)

**Purpose:** Coordinate CP-SAT and GA phases, output JSON to stdout

```python
"""
Hybrid Orchestrator - Production Pipeline Entry Point
Usage: python hybrid_orchestrator.py --batch-id <UUID> [options]
"""

import argparse
import json
import sys
from nep_scheduler import NEPScheduler
from genetic_optimizer import GeneticOptimizer
from config import PipelineConfig

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--batch-id', required=True)
    parser.add_argument('--cpsat-solutions', type=int, default=10)
    parser.add_argument('--ga-generations', type=int, default=100)
    parser.add_argument('--ga-population', type=int, default=50)
    parser.add_argument('--time-limit', type=int, default=300)
    args = parser.parse_args()

    result = {
        'batch_id': args.batch_id,
        'phase': 'INITIALIZING',
        'progress': 0
    }

    try:
        # Phase 1: CP-SAT
        result['phase'] = 'CP_SAT'
        scheduler = NEPScheduler.from_env()
        cpsat_solutions = scheduler.generate_n_solutions(
            args.batch_id, 
            n=args.cpsat_solutions
        )

        # Phase 2: GA
        result['phase'] = 'GA'
        optimizer = GeneticOptimizer(
            initial_population=cpsat_solutions,
            generations=args.ga_generations,
            population_size=args.ga_population
        )
        best_solution = optimizer.evolve()

        # Phase 3: Complete
        result['phase'] = 'COMPLETED'
        result['success'] = True
        result['solution'] = best_solution
        result['metrics'] = optimizer.get_metrics()

    except Exception as e:
        result['phase'] = 'FAILED'
        result['success'] = False
        result['error'] = str(e)

    print(json.dumps(result))
    sys.exit(0 if result.get('success') else 1)

if __name__ == '__main__':
    main()
```

### 3.2 `genetic_optimizer.py` (GA Implementation)

**Purpose:** Evolve CP-SAT solutions to optimize soft constraints

```python
"""
Genetic Algorithm Optimizer using DEAP
Optimizes soft constraints while maintaining CP-SAT hard constraint satisfaction
"""

from deap import base, creator, tools, algorithms
import random
from typing import List, Dict, Any
from fitness_calculator import FitnessCalculator
from chromosome_encoder import ChromosomeEncoder

class GeneticOptimizer:
    def __init__(
        self,
        initial_population: List[Dict],
        generations: int = 100,
        population_size: int = 50,
        mutation_rate: float = 0.1,
        crossover_rate: float = 0.8,
        elitism_rate: float = 0.1
    ):
        self.initial_population = initial_population
        self.generations = generations
        self.population_size = population_size
        self.mutation_rate = mutation_rate
        self.crossover_rate = crossover_rate
        self.elitism_rate = elitism_rate
        
        self.encoder = ChromosomeEncoder()
        self.fitness_calc = FitnessCalculator()
        self.metrics = {'generations': [], 'best_fitness': []}
        
        self._setup_deap()

    def _setup_deap(self):
        """Configure DEAP toolbox"""
        # Fitness: Maximize (higher = better)
        creator.create("FitnessMax", base.Fitness, weights=(1.0,))
        creator.create("Individual", list, fitness=creator.FitnessMax)
        
        self.toolbox = base.Toolbox()
        
        # Genetic operators
        self.toolbox.register("mate", self._crossover_timeslots)
        self.toolbox.register("mutate", self._mutate_slot_swap)
        self.toolbox.register("select", tools.selTournament, tournsize=5)
        self.toolbox.register("evaluate", self._evaluate_fitness)

    def _crossover_timeslots(self, ind1, ind2):
        """Two-point crossover on time slot assignments"""
        # ... implementation
        return ind1, ind2

    def _mutate_slot_swap(self, individual):
        """Swap two random time slot assignments"""
        # ... implementation
        return individual,

    def _evaluate_fitness(self, individual):
        """Calculate fitness based on soft constraints"""
        timetable = self.encoder.decode(individual)
        score = self.fitness_calc.calculate(timetable)
        return (score,)

    def evolve(self) -> Dict[str, Any]:
        """Run genetic algorithm evolution"""
        # Convert CP-SAT solutions to chromosomes
        population = [
            creator.Individual(self.encoder.encode(sol))
            for sol in self.initial_population
        ]
        
        # Extend population if needed
        while len(population) < self.population_size:
            population.append(self._generate_variant(random.choice(population)))
        
        # Evolution loop
        for gen in range(self.generations):
            # Evaluate fitness
            fitnesses = map(self.toolbox.evaluate, population)
            for ind, fit in zip(population, fitnesses):
                ind.fitness.values = fit
            
            # Selection
            elite_size = int(self.elitism_rate * len(population))
            elite = tools.selBest(population, elite_size)
            
            offspring = self.toolbox.select(population, len(population) - elite_size)
            offspring = list(map(self.toolbox.clone, offspring))
            
            # Crossover
            for child1, child2 in zip(offspring[::2], offspring[1::2]):
                if random.random() < self.crossover_rate:
                    self.toolbox.mate(child1, child2)
                    del child1.fitness.values
                    del child2.fitness.values
            
            # Mutation
            for mutant in offspring:
                if random.random() < self.mutation_rate:
                    self.toolbox.mutate(mutant)
                    del mutant.fitness.values
            
            # New population
            population[:] = elite + offspring
            
            # Track metrics
            best = tools.selBest(population, 1)[0]
            self.metrics['generations'].append(gen)
            self.metrics['best_fitness'].append(best.fitness.values[0])
        
        # Return best solution
        best_individual = tools.selBest(population, 1)[0]
        return self.encoder.decode(best_individual)
```

### 3.3 `fitness_calculator.py` (Soft Constraint Scoring)

**Purpose:** Calculate fitness score based on constraint_rules table

```python
"""
Fitness Calculator - Evaluates timetable quality based on soft constraints
Loads constraint weights from database constraint_rules table
"""

from typing import Dict, Any, List
from utils.db_client import get_supabase_client

class FitnessCalculator:
    def __init__(self):
        self.constraints = self._load_constraints()
        
    def _load_constraints(self) -> List[Dict]:
        """Load soft constraints from database"""
        client = get_supabase_client()
        response = client.table('constraint_rules') \
            .select('*') \
            .eq('rule_type', 'SOFT') \
            .eq('is_active', True) \
            .execute()
        return response.data
    
    def calculate(self, timetable: Dict[str, Any]) -> float:
        """
        Calculate total fitness score for a timetable
        Higher score = better timetable
        """
        total_score = 0.0
        max_possible = 0.0
        
        for constraint in self.constraints:
            weight = constraint['weight']
            max_possible += weight
            
            rule_name = constraint['rule_name']
            params = constraint.get('rule_parameters', {})
            
            # Evaluate each constraint type
            if rule_name == 'distribute_subjects_evenly':
                score = self._eval_subject_distribution(timetable) * weight
            elif rule_name == 'faculty_preferred_time_slots':
                score = self._eval_faculty_preferences(timetable) * weight
            elif rule_name == 'avoid_first_last_slot_labs':
                score = self._eval_lab_placement(timetable) * weight
            elif rule_name == 'lunch_break_consideration':
                score = self._eval_lunch_breaks(timetable) * weight
            elif rule_name == 'balanced_faculty_workload':
                score = self._eval_workload_balance(timetable) * weight
            else:
                score = 0
                
            total_score += score
        
        # Normalize to 0-100 scale
        return (total_score / max_possible) * 100 if max_possible > 0 else 0
    
    def _eval_subject_distribution(self, timetable: Dict) -> float:
        """Score 0-1 based on how evenly subjects are distributed across days"""
        # Implementation: Calculate variance of subjects per day
        # Lower variance = higher score
        pass
    
    def _eval_faculty_preferences(self, timetable: Dict) -> float:
        """Score 0-1 based on how many classes match faculty preferred slots"""
        pass
    
    def _eval_lab_placement(self, timetable: Dict) -> float:
        """Score 0-1, penalize labs in first/last slots"""
        pass
    
    def _eval_lunch_breaks(self, timetable: Dict) -> float:
        """Score 0-1 based on lunch break availability"""
        pass
    
    def _eval_workload_balance(self, timetable: Dict) -> float:
        """Score 0-1 based on faculty teaching hours variance"""
        pass
```

### 3.4 `chromosome_encoder.py` (Encoding/Decoding)

**Purpose:** Convert between timetable dict and GA chromosome format

```python
"""
Chromosome Encoder - Converts timetable ↔ genetic representation
Encoding: [subject_1_slot, subject_1_room, subject_2_slot, subject_2_room, ...]
"""

from typing import Dict, List, Any

class ChromosomeEncoder:
    def __init__(self, time_slots: List = None, classrooms: List = None):
        self.time_slots = time_slots or []
        self.classrooms = classrooms or []
        self.subject_order = []  # Fixed ordering of subjects
    
    def encode(self, timetable: Dict[str, Any]) -> List[int]:
        """
        Convert timetable solution to chromosome (list of integers)
        
        Chromosome structure:
        [slot_idx_1, room_idx_1, slot_idx_2, room_idx_2, ...]
        """
        chromosome = []
        
        # Sort classes by subject_id for consistent ordering
        classes = sorted(
            timetable.get('scheduled_classes', []),
            key=lambda x: x['subject_id']
        )
        
        for cls in classes:
            # Find index of time slot
            slot_idx = next(
                (i for i, ts in enumerate(self.time_slots) 
                 if ts['id'] == cls['time_slot_id']),
                0
            )
            # Find index of classroom
            room_idx = next(
                (i for i, cr in enumerate(self.classrooms) 
                 if cr['id'] == cls['classroom_id']),
                0
            )
            chromosome.extend([slot_idx, room_idx])
        
        return chromosome
    
    def decode(self, chromosome: List[int]) -> Dict[str, Any]:
        """
        Convert chromosome back to timetable solution
        """
        scheduled_classes = []
        
        for i in range(0, len(chromosome), 2):
            slot_idx = chromosome[i]
            room_idx = chromosome[i + 1]
            subject_id = self.subject_order[i // 2]
            
            scheduled_classes.append({
                'subject_id': subject_id,
                'time_slot_id': self.time_slots[slot_idx]['id'],
                'classroom_id': self.classrooms[room_idx]['id'],
                # ... other fields
            })
        
        return {'scheduled_classes': scheduled_classes}
```

### 3.5 TypeScript API Bridge (`src/app/api/scheduler/generate/route.ts`)

**Purpose:** Spawn Python subprocess and handle results

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { batch_id, config } = await request.json();

    // 1. Create task record
    const { data: task } = await supabase
      .from('timetable_generation_tasks')
      .insert({
        batch_id,
        task_name: `Schedule Batch ${batch_id}`,
        status: 'PENDING',
        current_phase: 'INITIALIZING',
        algorithm_config: config
      })
      .select()
      .single();

    // 2. Spawn Python process
    const pythonProcess = spawn('python', [
      'services/scheduler/hybrid_orchestrator.py',
      '--batch-id', batch_id,
      '--cpsat-solutions', config?.cpsat?.maxSolutions || '10',
      '--ga-generations', config?.ga?.maxGenerations || '100',
      '--ga-population', config?.ga?.populationSize || '50'
    ], {
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1'
      }
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      // Update progress in DB based on stderr logs
    });

    // 3. Wait for completion
    const exitCode = await new Promise<number>((resolve) => {
      pythonProcess.on('close', resolve);
    });

    // 4. Parse result
    const result = JSON.parse(stdout);

    if (result.success) {
      // Save solution to database
      await saveSolutionToDatabase(task.id, result.solution);
      
      await supabase
        .from('timetable_generation_tasks')
        .update({
          status: 'COMPLETED',
          current_phase: 'COMPLETED',
          progress: 100,
          best_fitness_score: result.metrics.final_fitness
        })
        .eq('id', task.id);
    } else {
      await supabase
        .from('timetable_generation_tasks')
        .update({
          status: 'FAILED',
          current_phase: 'FAILED',
          error_details: result.error
        })
        .eq('id', task.id);
    }

    return NextResponse.json({
      success: result.success,
      task_id: task.id,
      ...result
    });

  } catch (error) {
    console.error('Scheduler error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function saveSolutionToDatabase(taskId: string, solution: any) {
  // Insert into generated_timetables and scheduled_classes
  // ... implementation
}
```

---

## 4. Configuration Management

### 4.1 `config.py` (Algorithm Hyperparameters)

```python
"""
Pipeline Configuration - Algorithm Hyperparameters
"""

from dataclasses import dataclass
from typing import Optional

@dataclass
class CPSATConfig:
    max_solutions: int = 10
    timeout_seconds: int = 30
    use_prefiltering: bool = True
    enable_parallel_search: bool = True

@dataclass
class GAConfig:
    population_size: int = 50
    max_generations: int = 100
    mutation_rate: float = 0.1
    crossover_rate: float = 0.8
    elitism_rate: float = 0.1
    tournament_size: int = 5
    convergence_threshold: float = 0.001
    stagnation_limit: int = 20

@dataclass
class PipelineConfig:
    cpsat: CPSATConfig = None
    ga: GAConfig = None
    max_total_time_seconds: int = 300
    save_intermediate_results: bool = False
    
    def __post_init__(self):
        self.cpsat = self.cpsat or CPSATConfig()
        self.ga = self.ga or GAConfig()
```

---

## 5. Deployment Considerations

### 5.1 Environment Setup

```bash
# Install Python dependencies
pip install -r requirements.txt

# Required in requirements.txt
ortools>=9.7.0
supabase>=2.0.0
deap>=1.4.0           # 🆕 ADD THIS
python-dotenv>=1.0.0
numpy>=1.24.0
```

### 5.2 Environment Variables

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
PYTHON_PATH=/path/to/python  # Optional: specific Python interpreter
```

### 5.3 Vercel Deployment Note

⚠️ **Vercel does not support Python processes.** For production:

| Option | Recommendation |
|--------|---------------|
| Self-hosted | ✅ Best for full control |
| Railway/Render | ✅ Supports Python + Node |
| AWS Lambda | ⚠️ Requires separate Python Lambda |
| Modal.com | ✅ GPU-accelerated Python |

---

## 6. Monitoring & Observability

### 6.1 Progress Tracking

```typescript
// Poll for status
GET /api/scheduler/status/{taskId}

// Response
{
  "task_id": "uuid",
  "status": "RUNNING",
  "current_phase": "GA",
  "progress": 65,
  "current_message": "Generation 65/100, Best Fitness: 87.3"
}
```

### 6.2 Metrics Collection

| Metric | Source | Storage |
|--------|--------|---------|
| CP-SAT solve time | `solver.WallTime()` | `algorithm_execution_metrics` |
| GA generations | Evolution loop | `algorithm_execution_metrics` |
| Fitness progression | Each generation | `ga_best_fitness_per_generation` |
| Constraint violations | `FitnessCalculator` | `constraint_violations` JSONB |

---

*Document Version: 1.0*  
*Last Updated: January 24, 2026*
