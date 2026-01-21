# PyGram 2025 - Algorithm Pseudocode
## Complete Pseudocode for CP-SAT, Genetic Algorithm, and Hybrid Timetable Generation

This document provides detailed pseudocode for the three algorithms used in PyGram 2025 timetable generation system, designed to work with the main-production-schema.sql database structure.

---

## 1. CP-SAT (Constraint Programming with SAT) Algorithm

### CP-SAT Core Algorithm Pseudocode

```pseudocode
ALGORITHM: CP_SAT_Timetable_Generator

INPUT:
    - batch_id: UUID (target batch for timetable generation)
    - semester: INTEGER (semester number)
    - academic_year: STRING (e.g., "2025-26") 
    - config: CP_SAT_CONFIG (timeout, max_solutions, etc.)

OUTPUT:
    - solutions: LIST of TIMETABLE_SOLUTION
    - execution_metrics: CP_SAT_METRICS

BEGIN CP_SAT_Timetable_Generator:

    // 1. DATA COLLECTION PHASE
    FUNCTION collect_algorithm_data(batch_id, semester):
        // Query algorithm helper views from schema
        faculty_data = QUERY algorithm_faculty_data WHERE department_id = batch.department_id
        subject_data = QUERY algorithm_subject_data WHERE department_id = batch.department_id  
        batch_curriculum = QUERY algorithm_batch_curriculum WHERE batch_id = batch_id
        time_slots = QUERY algorithm_time_slots WHERE is_active = TRUE
        classrooms = QUERY classrooms WHERE is_available = TRUE
        constraint_rules = QUERY constraint_rules WHERE is_active = TRUE AND rule_type = 'HARD'
        
        RETURN (faculty_data, subject_data, batch_curriculum, time_slots, classrooms, constraint_rules)
    END FUNCTION

    // 2. VARIABLE CREATION PHASE  
    FUNCTION create_cp_sat_variables(data):
        model = CREATE_CP_SAT_MODEL()
        variables = EMPTY_DICTIONARY()
        
        // Create decision variables: X[f,s,c,t] = 1 if faculty f teaches subject s in classroom c at time t
        FOR EACH faculty f IN faculty_data:
            FOR EACH subject s IN subject_data WHERE f can teach s:
                FOR EACH classroom c IN classrooms WHERE c matches s requirements:
                    FOR EACH time_slot t IN time_slots WHERE f is available at t:
                        variable_name = f"X_{f.id}_{s.id}_{c.id}_{t.id}"
                        variables[variable_name] = model.new_bool_var(variable_name)
        
        RETURN (model, variables)
    END FUNCTION

    // 3. CONSTRAINT GENERATION PHASE
    FUNCTION add_hard_constraints(model, variables, data):
        
        // CONSTRAINT 1: No faculty double booking
        FOR EACH faculty f IN faculty_data:
            FOR EACH time_slot t IN time_slots:
                constraint_vars = []
                FOR EACH variable X_f_s_c_t WHERE faculty = f AND time = t:
                    constraint_vars.APPEND(X_f_s_c_t)
                model.add(sum(constraint_vars) <= 1)  // Faculty can teach at most 1 class at time t
        
        // CONSTRAINT 2: No classroom double booking  
        FOR EACH classroom c IN classrooms:
            FOR EACH time_slot t IN time_slots:
                constraint_vars = []
                FOR EACH variable X_f_s_c_t WHERE classroom = c AND time = t:
                    constraint_vars.APPEND(X_f_s_c_t)
                model.add(sum(constraint_vars) <= 1)  // Classroom can host at most 1 class at time t
        
        // CONSTRAINT 3: Batch curriculum requirements
        FOR EACH batch_subject bs IN batch_curriculum:
            constraint_vars = []
            FOR EACH variable X_f_s_c_t WHERE subject = bs.subject_id:
                constraint_vars.APPEND(X_f_s_c_t)
            // Must schedule exactly required_hours_per_week classes for this subject
            model.add(sum(constraint_vars) == bs.required_hours_per_week)
        
        // CONSTRAINT 4: Faculty qualification requirements
        FOR EACH variable X_f_s_c_t IN variables:
            IF faculty f is NOT qualified to teach subject s:
                model.add(X_f_s_c_t == 0)  // Force to 0 if not qualified
        
        // CONSTRAINT 5: Faculty availability constraints
        FOR EACH variable X_f_s_c_t IN variables:
            IF faculty f is NOT available at time t:
                model.add(X_f_s_c_t == 0)  // Force to 0 if not available
        
        // CONSTRAINT 6: Room requirements matching
        FOR EACH variable X_f_s_c_t IN variables:
            IF subject s requires_lab AND classroom c does NOT have_lab_equipment:
                model.add(X_f_s_c_t == 0)  // Force to 0 if room doesn't match requirements
            IF subject s requires_projector AND classroom c does NOT have_projector:
                model.add(X_f_s_c_t == 0)
        
        // CONSTRAINT 7: Faculty workload limits
        FOR EACH faculty f IN faculty_data:
            daily_vars = []
            FOR EACH day d IN ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']:
                FOR EACH variable X_f_s_c_t WHERE faculty = f AND time.day = d:
                    daily_vars.APPEND(X_f_s_c_t)
                model.add(sum(daily_vars) <= f.max_hours_per_day)
    END FUNCTION

    // 4. OBJECTIVE FUNCTION PHASE
    FUNCTION add_optimization_objective(model, variables, data):
        objective_terms = []
        
        // Maximize faculty proficiency matching
        FOR EACH variable X_f_s_c_t IN variables:
            proficiency = GET_PROFICIENCY(faculty=f, subject=s)
            preference = GET_PREFERENCE(faculty=f, subject=s)
            time_preference = GET_TIME_PREFERENCE(faculty=f, time=t)
            classroom_priority = GET_CLASSROOM_PRIORITY(classroom=c)
            
            weight = (proficiency * 10) + (preference * 5) + (time_preference * 3) + classroom_priority
            objective_terms.APPEND(weight * X_f_s_c_t)
        
        model.maximize(sum(objective_terms))
    END FUNCTION

    // 5. SOLVING PHASE
    FUNCTION solve_cp_sat_model(model, config):
        solver = CP_SAT_SOLVER()
        solver.parameters.max_time_in_seconds = config.timeout_minutes * 60
        solver.parameters.enumerate_all_solutions = FALSE
        solver.parameters.num_search_workers = config.parallel_workers
        
        solutions = []
        status = solver.solve(model)
        
        IF status == OPTIMAL OR status == FEASIBLE:
            solution = extract_solution(solver, variables)
            solutions.APPEND(solution)
            
            // Try to find additional solutions
            WHILE solutions.count < config.max_solutions AND solver.solve(model) == FEASIBLE:
                solution = extract_solution(solver, variables)
                solutions.APPEND(solution)
                // Add constraint to exclude this solution
                model.add_exclusion_constraint(solution)
        
        metrics = {
            'variables_created': len(variables),
            'constraints_generated': model.constraint_count(),
            'solutions_found': len(solutions),  
            'execution_time_ms': solver.wall_time(),
            'memory_usage_mb': solver.memory_usage()
        }
        
        RETURN (solutions, metrics)
    END FUNCTION

    // 6. SOLUTION EXTRACTION PHASE
    FUNCTION extract_solution(solver, variables):
        timetable = EMPTY_TIMETABLE()
        fitness_score = 0
        
        FOR EACH variable_name, variable IN variables:
            IF solver.value(variable) == 1:  // This assignment is selected
                (faculty_id, subject_id, classroom_id, time_slot_id) = PARSE_VARIABLE_NAME(variable_name)
                
                class_assignment = {
                    'faculty_id': faculty_id,
                    'subject_id': subject_id,
                    'classroom_id': classroom_id,
                    'time_slot_id': time_slot_id,
                    'variable_id': variable_name,
                    'assignment_score': CALCULATE_ASSIGNMENT_SCORE(faculty_id, subject_id, classroom_id, time_slot_id)
                }
                
                timetable.assignments.APPEND(class_assignment)
                fitness_score += class_assignment.assignment_score
        
        timetable.fitness_score = fitness_score
        timetable.generation_method = 'CP_SAT_ONLY'
        
        RETURN timetable
    END FUNCTION

    // MAIN EXECUTION
    START_TIME = CURRENT_TIME()
    
    // Execute algorithm phases
    data = collect_algorithm_data(batch_id, semester)
    (model, variables) = create_cp_sat_variables(data)
    add_hard_constraints(model, variables, data)
    add_optimization_objective(model, variables, data)
    (solutions, metrics) = solve_cp_sat_model(model, config)
    
    EXECUTION_TIME = CURRENT_TIME() - START_TIME
    metrics['total_execution_time_ms'] = EXECUTION_TIME
    
    RETURN (solutions, metrics)

END CP_SAT_Timetable_Generator
```

---

## 2. Genetic Algorithm (GA) Pseudocode

### Genetic Algorithm Core Pseudocode

```pseudocode
ALGORITHM: GA_Timetable_Generator

INPUT:
    - batch_id: UUID (target batch for timetable generation)
    - semester: INTEGER (semester number)  
    - academic_year: STRING (e.g., "2025-26")
    - config: GA_CONFIG (population_size, generations, mutation_rate, etc.)
    - initial_solutions: LIST (optional CP-SAT solutions for seeding)

OUTPUT:
    - best_solution: TIMETABLE_SOLUTION
    - execution_metrics: GA_METRICS

BEGIN GA_Timetable_Generator:

    // 1. DATA COLLECTION (Same as CP-SAT)
    FUNCTION collect_algorithm_data(batch_id, semester):
        // ... same as CP-SAT data collection ...
        RETURN (faculty_data, subject_data, batch_curriculum, time_slots, classrooms, constraint_rules)
    END FUNCTION

    // 2. CHROMOSOME REPRESENTATION
    STRUCTURE Chromosome:
        genes: LIST of GENE  // Each gene represents one class assignment
        fitness_score: FLOAT
        constraint_violations: INTEGER
        is_valid: BOOLEAN
    END STRUCTURE
    
    STRUCTURE Gene:
        subject_id: UUID
        faculty_id: UUID  
        classroom_id: UUID
        time_slot_id: UUID
        credit_hour_number: INTEGER  // Which hour of the subject (1st, 2nd, etc.)
    END STRUCTURE

    // 3. POPULATION INITIALIZATION
    FUNCTION initialize_population(data, config, initial_solutions):
        population = []
        
        // Seed population with CP-SAT solutions if available
        IF initial_solutions IS NOT EMPTY:
            FOR EACH solution IN initial_solutions:
                chromosome = convert_solution_to_chromosome(solution)
                population.APPEND(chromosome)
        
        // Generate remaining random individuals
        WHILE population.size() < config.population_size:
            chromosome = create_random_chromosome(data)
            chromosome.fitness_score = evaluate_fitness(chromosome, data)
            population.APPEND(chromosome)
        
        RETURN population
    END FUNCTION

    // 4. RANDOM CHROMOSOME CREATION
    FUNCTION create_random_chromosome(data):
        chromosome = NEW Chromosome()
        
        // For each required class in batch curriculum
        FOR EACH batch_subject bs IN batch_curriculum:
            FOR hour_number = 1 TO bs.required_hours_per_week:
                gene = NEW Gene()
                gene.subject_id = bs.subject_id
                gene.credit_hour_number = hour_number
                
                // Randomly select qualified faculty
                qualified_faculty = GET_QUALIFIED_FACULTY(bs.subject_id)
                gene.faculty_id = RANDOM_CHOICE(qualified_faculty)
                
                // Randomly select suitable classroom
                suitable_classrooms = GET_SUITABLE_CLASSROOMS(bs.subject_id)
                gene.classroom_id = RANDOM_CHOICE(suitable_classrooms)
                
                // Randomly select available time slot
                available_slots = GET_AVAILABLE_SLOTS(gene.faculty_id)
                gene.time_slot_id = RANDOM_CHOICE(available_slots)
                
                chromosome.genes.APPEND(gene)
                
        RETURN chromosome
    END FUNCTION

    // 5. FITNESS EVALUATION
    FUNCTION evaluate_fitness(chromosome, data):
        fitness = 0
        violations = 0
        
        // HARD CONSTRAINT PENALTIES (Heavy negative weights)
        
        // Check faculty double booking
        faculty_time_map = {}
        FOR EACH gene IN chromosome.genes:
            key = (gene.faculty_id, gene.time_slot_id)
            IF key IN faculty_time_map:
                violations += 1
                fitness -= 10000  // Heavy penalty
            ELSE:
                faculty_time_map[key] = gene
        
        // Check classroom double booking  
        classroom_time_map = {}
        FOR EACH gene IN chromosome.genes:
            key = (gene.classroom_id, gene.time_slot_id)
            IF key IN classroom_time_map:
                violations += 1
                fitness -= 10000  // Heavy penalty
            ELSE:
                classroom_time_map[key] = gene
        
        // Check faculty qualifications
        FOR EACH gene IN chromosome.genes:
            IF NOT is_faculty_qualified(gene.faculty_id, gene.subject_id):
                violations += 1
                fitness -= 10000  // Heavy penalty
        
        // Check faculty availability
        FOR EACH gene IN chromosome.genes:
            IF NOT is_faculty_available(gene.faculty_id, gene.time_slot_id):
                violations += 1
                fitness -= 10000  // Heavy penalty
        
        // SOFT CONSTRAINT REWARDS (Positive weights)
        
        // Reward faculty proficiency matching
        FOR EACH gene IN chromosome.genes:
            proficiency = GET_PROFICIENCY(gene.faculty_id, gene.subject_id)
            fitness += proficiency * 10
        
        // Reward faculty preferences
        FOR EACH gene IN chromosome.genes:
            preference = GET_PREFERENCE(gene.faculty_id, gene.subject_id)
            fitness += preference * 5
        
        // Reward time preferences
        FOR EACH gene IN chromosome.genes:
            time_pref = GET_TIME_PREFERENCE(gene.faculty_id, gene.time_slot_id)
            fitness += time_pref * 3
        
        // Reward classroom priority
        FOR EACH gene IN chromosome.genes:
            classroom_priority = GET_CLASSROOM_PRIORITY(gene.classroom_id)
            fitness += classroom_priority * 2
        
        // Reward workload balance
        faculty_workload = CALCULATE_FACULTY_WORKLOAD(chromosome)
        workload_balance_score = CALCULATE_WORKLOAD_BALANCE(faculty_workload)
        fitness += workload_balance_score * 20
        
        chromosome.fitness_score = fitness
        chromosome.constraint_violations = violations
        chromosome.is_valid = (violations == 0)
        
        RETURN fitness
    END FUNCTION

    // 6. SELECTION MECHANISMS
    FUNCTION tournament_selection(population, tournament_size):
        tournament = []
        FOR i = 1 TO tournament_size:
            random_individual = RANDOM_CHOICE(population)
            tournament.APPEND(random_individual)
        
        // Return best individual from tournament
        RETURN MAX(tournament, key=fitness_score)
    END FUNCTION

    // 7. CROSSOVER OPERATIONS
    FUNCTION crossover(parent1, parent2, data):
        IF RANDOM() > config.crossover_rate:
            RETURN (parent1, parent2)  // No crossover
        
        // Subject-based crossover - preserve subject integrity
        offspring1 = NEW Chromosome()
        offspring2 = NEW Chromosome()
        
        subjects = GET_UNIQUE_SUBJECTS(parent1.genes + parent2.genes)
        
        FOR EACH subject IN subjects:
            parent1_genes = GET_GENES_FOR_SUBJECT(parent1, subject)
            parent2_genes = GET_GENES_FOR_SUBJECT(parent2, subject)
            
            IF RANDOM() < 0.5:
                offspring1.genes.EXTEND(parent1_genes)
                offspring2.genes.EXTEND(parent2_genes)
            ELSE:
                offspring1.genes.EXTEND(parent2_genes)
                offspring2.genes.EXTEND(parent1_genes)
        
        // Evaluate fitness of offspring
        offspring1.fitness_score = evaluate_fitness(offspring1, data)
        offspring2.fitness_score = evaluate_fitness(offspring2, data)
        
        RETURN (offspring1, offspring2)
    END FUNCTION

    // 8. MUTATION OPERATIONS
    FUNCTION mutate(chromosome, data):
        IF RANDOM() > config.mutation_rate:
            RETURN chromosome  // No mutation
        
        mutated = COPY(chromosome)
        
        // Select random gene to mutate
        gene_index = RANDOM_INTEGER(0, len(mutated.genes) - 1)
        gene = mutated.genes[gene_index]
        
        // Choose mutation type randomly
        mutation_type = RANDOM_CHOICE(['faculty', 'classroom', 'time_slot'])
        
        IF mutation_type == 'faculty':
            qualified_faculty = GET_QUALIFIED_FACULTY(gene.subject_id)
            gene.faculty_id = RANDOM_CHOICE(qualified_faculty)
        
        ELIF mutation_type == 'classroom':
            suitable_classrooms = GET_SUITABLE_CLASSROOMS(gene.subject_id)
            gene.classroom_id = RANDOM_CHOICE(suitable_classrooms)
        
        ELIF mutation_type == 'time_slot':
            available_slots = GET_AVAILABLE_SLOTS(gene.faculty_id)
            gene.time_slot_id = RANDOM_CHOICE(available_slots)
        
        // Re-evaluate fitness after mutation
        mutated.fitness_score = evaluate_fitness(mutated, data)
        
        RETURN mutated
    END FUNCTION

    // 9. MAIN GA EVOLUTION LOOP
    FUNCTION evolve_population(population, data, config):
        generation_metrics = []
        
        FOR generation = 1 TO config.max_generations:
            
            // Track generation statistics
            generation_stats = {
                'generation': generation,
                'best_fitness': MAX(population, key=fitness_score).fitness_score,
                'average_fitness': AVERAGE(population, key=fitness_score),
                'valid_individuals': COUNT(population WHERE is_valid == TRUE)
            }
            
            new_population = []
            
            // Elitism - Keep best individuals
            elite_count = INT(config.population_size * config.elitism_rate)
            elite = TOP_N(population, elite_count, key=fitness_score)
            new_population.EXTEND(elite)
            
            // Generate offspring to fill remaining population
            WHILE len(new_population) < config.population_size:
                
                // Selection
                parent1 = tournament_selection(population, config.tournament_size)
                parent2 = tournament_selection(population, config.tournament_size)
                
                // Crossover
                (offspring1, offspring2) = crossover(parent1, parent2, data)
                
                // Mutation
                offspring1 = mutate(offspring1, data)
                offspring2 = mutate(offspring2, data)
                
                new_population.APPEND(offspring1)
                IF len(new_population) < config.population_size:
                    new_population.APPEND(offspring2)
            
            population = new_population
            generation_metrics.APPEND(generation_stats)
            
            // Early termination if perfect solution found
            best_individual = MAX(population, key=fitness_score)
            IF best_individual.constraint_violations == 0 AND best_individual.fitness_score >= config.target_fitness:
                BREAK
        
        RETURN (population, generation_metrics)
    END FUNCTION

    // MAIN EXECUTION
    START_TIME = CURRENT_TIME()
    
    // Execute GA phases
    data = collect_algorithm_data(batch_id, semester)
    population = initialize_population(data, config, initial_solutions)
    (final_population, generation_metrics) = evolve_population(population, data, config)
    
    best_solution = MAX(final_population, key=fitness_score)
    
    EXECUTION_TIME = CURRENT_TIME() - START_TIME
    
    metrics = {
        'initial_population_size': config.population_size,
        'generations_completed': len(generation_metrics),
        'best_fitness': best_solution.fitness_score,
        'constraint_violations': best_solution.constraint_violations,
        'execution_time_ms': EXECUTION_TIME,
        'generation_details': generation_metrics
    }
    
    RETURN (best_solution, metrics)

END GA_Timetable_Generator
```

---

## 3. Hybrid Algorithm (CP-SAT + GA) Pseudocode

### Hybrid Algorithm Integration Pseudocode

```pseudocode
ALGORITHM: Hybrid_Timetable_Generator

INPUT:
    - batch_id: UUID (target batch for timetable generation)
    - semester: INTEGER (semester number)
    - academic_year: STRING (e.g., "2025-26")
    - hybrid_config: HYBRID_CONFIG (contains both CP-SAT and GA configurations)

OUTPUT:
    - best_solution: TIMETABLE_SOLUTION
    - execution_metrics: HYBRID_METRICS

BEGIN Hybrid_Timetable_Generator:

    // 1. ALGORITHM CONFIGURATION
    STRUCTURE HybridConfig:
        cpsat_config: CP_SAT_CONFIG {
            timeout_minutes: 5,
            max_solutions: 10,
            parallel_workers: 4,
            use_prefiltering: TRUE
        }
        ga_config: GA_CONFIG {
            population_size: 50,
            max_generations: 100,
            mutation_rate: 0.1,
            crossover_rate: 0.8,
            elitism_rate: 0.1,
            tournament_size: 5
        }
        hybrid_strategy: STRING  // 'sequential', 'parallel', 'iterative'
        max_total_time_minutes: 10
        quality_threshold: FLOAT  // Switch from CP-SAT to GA if quality below threshold
    END STRUCTURE

    // 2. SEQUENTIAL HYBRID STRATEGY
    FUNCTION sequential_hybrid_approach(batch_id, semester, hybrid_config):
        
        PHASE_1: "CP-SAT Initial Solutions Generation"
        
        UPDATE_TASK_STATUS(batch_id, 'RUNNING', 'CP_SAT', 'Generating initial solutions with CP-SAT...')
        
        START_TIME_CPSAT = CURRENT_TIME()
        
        // Run CP-SAT to get multiple high-quality initial solutions
        (cpsat_solutions, cpsat_metrics) = CP_SAT_Timetable_Generator(
            batch_id, semester, academic_year, hybrid_config.cpsat_config
        )
        
        CPSAT_TIME = CURRENT_TIME() - START_TIME_CPSAT
        
        // Log CP-SAT phase metrics
        INSERT INTO algorithm_execution_metrics (
            generation_task_id: current_task_id,
            cpsat_variables_created: cpsat_metrics.variables_created,
            cpsat_constraints_generated: cpsat_metrics.constraints_generated,
            cpsat_solutions_found: cpsat_metrics.solutions_found,
            cpsat_execution_time_ms: cpsat_metrics.execution_time_ms,
            cpsat_memory_usage_mb: cpsat_metrics.memory_usage_mb
        )
        
        IF cpsat_solutions IS EMPTY:
            // CP-SAT failed to find solutions - try GA from scratch
            UPDATE_TASK_STATUS(batch_id, 'RUNNING', 'GA', 'CP-SAT found no solutions, starting GA from scratch...')
            initial_population = []
        ELSE:
            UPDATE_TASK_STATUS(batch_id, 'RUNNING', 'GA', f'CP-SAT found {len(cpsat_solutions)} solutions, evolving with GA...')
            initial_population = cpsat_solutions
        
        PHASE_2: "Genetic Algorithm Optimization"
        
        START_TIME_GA = CURRENT_TIME()
        
        // Use CP-SAT solutions to seed GA population
        (best_solution, ga_metrics) = GA_Timetable_Generator(
            batch_id, semester, academic_year, hybrid_config.ga_config, initial_population
        )
        
        GA_TIME = CURRENT_TIME() - START_TIME_GA
        
        // Log GA phase metrics  
        UPDATE algorithm_execution_metrics SET (
            ga_initial_population_size: ga_metrics.initial_population_size,
            ga_generations_completed: ga_metrics.generations_completed,
            ga_best_fitness: ga_metrics.best_fitness,
            ga_execution_time_ms: ga_metrics.execution_time_ms,
            total_execution_time_ms: CPSAT_TIME + GA_TIME
        ) WHERE generation_task_id = current_task_id
        
        RETURN (best_solution, combine_metrics(cpsat_metrics, ga_metrics))
    END FUNCTION

    // 3. PARALLEL HYBRID STRATEGY  
    FUNCTION parallel_hybrid_approach(batch_id, semester, hybrid_config):
        
        UPDATE_TASK_STATUS(batch_id, 'RUNNING', 'HYBRID', 'Running CP-SAT and GA in parallel...')
        
        // Start both algorithms in parallel threads
        THREAD_1: cpsat_thread = SPAWN_THREAD(
            CP_SAT_Timetable_Generator(batch_id, semester, academic_year, hybrid_config.cpsat_config)
        )
        
        THREAD_2: ga_thread = SPAWN_THREAD(
            GA_Timetable_Generator(batch_id, semester, academic_year, hybrid_config.ga_config, [])
        )
        
        best_solution = NULL
        best_fitness = -INFINITY
        
        // Monitor both threads and take best result
        WHILE BOTH_THREADS_RUNNING AND ELAPSED_TIME < hybrid_config.max_total_time_minutes:
            
            IF cpsat_thread.has_solution():
                cpsat_solution = cpsat_thread.get_best_solution()
                IF cpsat_solution.fitness_score > best_fitness:
                    best_solution = cpsat_solution
                    best_fitness = cpsat_solution.fitness_score
            
            IF ga_thread.has_solution():
                ga_solution = ga_thread.get_best_solution()
                IF ga_solution.fitness_score > best_fitness:
                    best_solution = ga_solution
                    best_fitness = ga_solution.fitness_score
            
            // Early termination if perfect solution found
            IF best_solution IS NOT NULL AND best_solution.constraint_violations == 0:
                TERMINATE_THREADS(cpsat_thread, ga_thread)
                BREAK
            
            SLEEP(1000)  // Check every second
        
        // Clean up threads
        TERMINATE_THREADS(cpsat_thread, ga_thread)
        cpsat_metrics = cpsat_thread.get_metrics()
        ga_metrics = ga_thread.get_metrics()
        
        RETURN (best_solution, combine_metrics(cpsat_metrics, ga_metrics))
    END FUNCTION

    // 4. ITERATIVE HYBRID STRATEGY
    FUNCTION iterative_hybrid_approach(batch_id, semester, hybrid_config):
        
        iteration = 1
        best_solution = NULL
        best_fitness = -INFINITY
        all_solutions = []
        
        WHILE ELAPSED_TIME < hybrid_config.max_total_time_minutes:
            
            UPDATE_TASK_STATUS(batch_id, 'RUNNING', 'HYBRID', f'Iteration {iteration}: CP-SAT phase...')
            
            // Phase 1: Generate solutions with CP-SAT
            (cpsat_solutions, cpsat_metrics) = CP_SAT_Timetable_Generator(
                batch_id, semester, academic_year, hybrid_config.cpsat_config
            )
            
            all_solutions.EXTEND(cpsat_solutions)
            
            // Phase 2: Evolve solutions with GA
            IF cpsat_solutions IS NOT EMPTY:
                UPDATE_TASK_STATUS(batch_id, 'RUNNING', 'HYBRID', f'Iteration {iteration}: GA phase...')
                
                (ga_solution, ga_metrics) = GA_Timetable_Generator(
                    batch_id, semester, academic_year, hybrid_config.ga_config, cpsat_solutions
                )
                
                all_solutions.APPEND(ga_solution)
                
                IF ga_solution.fitness_score > best_fitness:
                    best_solution = ga_solution
                    best_fitness = ga_solution.fitness_score
            
            // Phase 3: Diversification - modify constraints for next iteration
            IF iteration > 1:
                hybrid_config.cpsat_config = modify_cpsat_constraints(hybrid_config.cpsat_config, best_solution)
                hybrid_config.ga_config.mutation_rate *= 1.1  // Increase exploration
            
            iteration += 1
            
            // Early termination conditions
            IF best_solution IS NOT NULL AND best_solution.constraint_violations == 0:
                UPDATE_TASK_STATUS(batch_id, 'RUNNING', 'FINALIZING', 'Perfect solution found, finalizing...')
                BREAK
        
        RETURN (best_solution, aggregate_metrics(all_solutions))
    END FUNCTION

    // 5. SOLUTION QUALITY ASSESSMENT
    FUNCTION assess_solution_quality(solution, data):
        quality_metrics = {
            'constraint_satisfaction_rate': 0,
            'faculty_utilization_rate': 0,
            'classroom_utilization_rate': 0,
            'preference_satisfaction_score': 0,
            'workload_balance_score': 0,
            'overall_quality_score': 0
        }
        
        // Calculate constraint satisfaction
        total_constraints = COUNT_HARD_CONSTRAINTS(data)
        violated_constraints = solution.constraint_violations
        quality_metrics.constraint_satisfaction_rate = (total_constraints - violated_constraints) / total_constraints * 100
        
        // Calculate resource utilization
        quality_metrics.faculty_utilization_rate = CALCULATE_FACULTY_UTILIZATION(solution, data)
        quality_metrics.classroom_utilization_rate = CALCULATE_CLASSROOM_UTILIZATION(solution, data)
        
        // Calculate preference satisfaction
        quality_metrics.preference_satisfaction_score = CALCULATE_PREFERENCE_SATISFACTION(solution, data)
        
        // Calculate workload balance
        quality_metrics.workload_balance_score = CALCULATE_WORKLOAD_BALANCE(solution, data)
        
        // Overall quality score (weighted combination)
        quality_metrics.overall_quality_score = (
            quality_metrics.constraint_satisfaction_rate * 0.4 +
            quality_metrics.faculty_utilization_rate * 0.2 +
            quality_metrics.classroom_utilization_rate * 0.1 +
            quality_metrics.preference_satisfaction_score * 0.2 +
            quality_metrics.workload_balance_score * 0.1
        )
        
        RETURN quality_metrics
    END FUNCTION

    // 6. ADAPTIVE STRATEGY SELECTION
    FUNCTION select_hybrid_strategy(batch_id, data, hybrid_config):
        
        // Analyze problem complexity
        faculty_count = COUNT(data.faculty_data)
        subject_count = COUNT(data.subject_data)
        time_slot_count = COUNT(data.time_slots)
        classroom_count = COUNT(data.classrooms)
        
        problem_size = faculty_count * subject_count * time_slot_count * classroom_count
        constraint_density = COUNT_CONSTRAINTS(data) / problem_size
        
        // Select strategy based on problem characteristics
        IF problem_size < 10000 AND constraint_density < 0.3:
            // Small, loosely constrained problem - CP-SAT likely sufficient
            RETURN 'sequential'  // CP-SAT first, then GA for optimization
        
        ELIF problem_size > 100000 OR constraint_density > 0.7:
            // Large or highly constrained problem - parallel approach
            RETURN 'parallel'  // Run both simultaneously
        
        ELSE:
            // Medium complexity - iterative refinement
            RETURN 'iterative'  // Multiple CP-SAT + GA cycles
    END FUNCTION

    // MAIN HYBRID EXECUTION
    START_TIME = CURRENT_TIME()
    
    // Update task status
    UPDATE_TASK_STATUS(batch_id, 'RUNNING', 'INITIALIZING', 'Starting hybrid algorithm...')
    
    // Collect algorithm data
    data = collect_algorithm_data(batch_id, semester)
    
    // Select optimal hybrid strategy
    strategy = select_hybrid_strategy(batch_id, data, hybrid_config)
    
    // Execute selected strategy
    IF strategy == 'sequential':
        (best_solution, metrics) = sequential_hybrid_approach(batch_id, semester, hybrid_config)
    ELIF strategy == 'parallel':
        (best_solution, metrics) = parallel_hybrid_approach(batch_id, semester, hybrid_config)
    ELIF strategy == 'iterative':
        (best_solution, metrics) = iterative_hybrid_approach(batch_id, semester, hybrid_config)
    
    // Final solution assessment
    UPDATE_TASK_STATUS(batch_id, 'RUNNING', 'FINALIZING', 'Assessing solution quality...')
    quality_metrics = assess_solution_quality(best_solution, data)
    
    // Store final results in database
    timetable_id = STORE_TIMETABLE(best_solution, batch_id, semester, academic_year)
    STORE_SCHEDULED_CLASSES(best_solution.assignments, timetable_id)
    
    EXECUTION_TIME = CURRENT_TIME() - START_TIME
    
    // Final metrics compilation
    final_metrics = {
        'strategy_used': strategy,
        'total_execution_time_ms': EXECUTION_TIME,
        'best_fitness_score': best_solution.fitness_score,
        'constraint_violations': best_solution.constraint_violations,
        'quality_metrics': quality_metrics,
        'cpsat_metrics': metrics.cpsat_metrics,
        'ga_metrics': metrics.ga_metrics
    }
    
    UPDATE_TASK_STATUS(batch_id, 'COMPLETED', 'COMPLETED', f'Hybrid algorithm completed successfully. Quality: {quality_metrics.overall_quality_score}%')
    
    RETURN (best_solution, final_metrics)

END Hybrid_Timetable_Generator
```

---

## 4. Database Integration Points

### Key Schema Tables Used by Algorithms

```sql
-- Algorithm reads from these views for data collection
SELECT * FROM algorithm_faculty_data;      -- Faculty info with qualifications
SELECT * FROM algorithm_subject_data;      -- Subject requirements  
SELECT * FROM algorithm_batch_curriculum;  -- What needs to be scheduled
SELECT * FROM algorithm_time_slots;        -- Available time slots

-- Algorithm writes to these tables for execution tracking  
INSERT INTO timetable_generation_tasks (...);  -- Track algorithm execution
INSERT INTO generated_timetables (...);        -- Store complete solutions
INSERT INTO scheduled_classes (...);           -- Store individual assignments
INSERT INTO algorithm_execution_metrics (...); -- Store performance metrics
```

### Real-time Status Updates

```sql
-- Update task progress during algorithm execution
UPDATE timetable_generation_tasks SET 
    status = 'RUNNING',
    current_phase = 'CP_SAT', 
    progress = 45,
    current_message = 'Generating CP-SAT constraints...'
WHERE id = task_id;
```

---

## 5. Integration with PyGram 2025 Architecture

### Algorithm Service API Integration

```pseudocode
// API endpoint for timetable generation
POST /api/timetables/generate
{
    "batch_id": "uuid",
    "semester": 3,
    "academic_year": "2025-26",
    "algorithm": "hybrid",  // 'cpsat', 'ga', 'hybrid'
    "config": {
        "cpsat": { "timeout_minutes": 5, "max_solutions": 10 },
        "ga": { "population_size": 50, "max_generations": 100 },
        "hybrid": { "strategy": "sequential", "max_total_time_minutes": 10 }
    }
}

RESPONSE:
{
    "task_id": "uuid",
    "status": "RUNNING", 
    "message": "Hybrid algorithm started successfully"
}
```

This pseudocode provides the complete algorithmic foundation for PyGram 2025's intelligent timetable generation system, designed to work seamlessly with your main-production-schema.sql database structure.