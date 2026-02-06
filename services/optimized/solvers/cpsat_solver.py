"""Enhanced CP-SAT solver implementation."""

from ortools.sat.python import cp_model
import logging
from typing import List, Dict, Tuple

from solvers.base_solver import BaseSolver, SolverResult
from core.models import Solution, Assignment, TimeSlot, ConstraintViolation, ConstraintType
from core.context import SchedulingContext
from core.config import SolverConfig


class EnhancedCPSATSolver(BaseSolver):
    """Enhanced CP-SAT solver with better constraint modeling."""
    
    def __init__(self, context: SchedulingContext, config: SolverConfig):
        super().__init__(context, config)
        self.model = cp_model.CpModel()
        self.solver = cp_model.CpSolver()
        self.variables: Dict = {}
    
    def solve(self) -> SolverResult:
        """Solve using Google OR-Tools CP-SAT."""
        start_time = self._start_timing()
        
        try:
            # Validate context
            if not self._validate_context():
                return SolverResult(
                    solution=None,
                    success=False,
                    execution_time=self._end_timing(start_time),
                    error_message="Context validation failed"
                )
            
            self.logger.info("Building CP-SAT model...")
            
            # Create variables
            self._create_variables()
            
            # Add constraints
            self._add_hard_constraints()
            self._add_soft_constraints()
            
            # Configure solver
            self.solver.parameters.max_time_in_seconds = self.timeout
            self.solver.parameters.num_search_workers = self.config.parameters.get('num_search_workers', 8)
            self.solver.parameters.random_seed = self.config.parameters.get('random_seed', 42)
            
            self.logger.info(f"Solving with timeout={self.timeout}s...")
            
            # Solve
            status = self.solver.Solve(self.model)
            
            execution_time = self._end_timing(start_time)
            
            if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
                solution = self._extract_solution()
                solution.execution_time = execution_time
                solution.solver_name = self.name
                solution.metadata = {
                    'status': 'OPTIMAL' if status == cp_model.OPTIMAL else 'FEASIBLE',
                    'objective_value': self.solver.ObjectiveValue(),
                    'wall_time': self.solver.WallTime(),
                }
                
                result = SolverResult(
                    solution=solution,
                    success=True,
                    execution_time=execution_time,
                )
                
                self._log_result(result)
                return result
            
            else:
                error_msg = f"No solution found. Status: {self.solver.StatusName(status)}"
                self.logger.warning(error_msg)
                
                return SolverResult(
                    solution=self._create_empty_solution(),
                    success=False,
                    execution_time=execution_time,
                    error_message=error_msg
                )
        
        except Exception as e:
            self.logger.exception(f"CP-SAT solver failed: {e}")
            return SolverResult(
                solution=None,
                success=False,
                execution_time=self._end_timing(start_time),
                error_message=str(e)
            )
    
    def _create_variables(self):
        """Create decision variables for the model."""
        self.logger.debug("Creating variables...")
        
        # Variables: x[batch_id, subject_id, faculty_id, room_id, slot_id] = 0/1
        for batch in self.context.batches:
            for subject_id in batch.subjects:
                subject = self.context.get_subject(subject_id)
                if not subject:
                    continue
                
                # Find qualified faculty
                qualified_faculty = [f for f in self.context.faculty if f.can_teach(subject)]
                
                # Find suitable rooms
                suitable_rooms = [r for r in self.context.rooms if r.supports_subject(subject)]
                
                # Create variables for each valid combination
                for faculty in qualified_faculty:
                    for room in suitable_rooms:
                        for slot in self.context.time_slots:
                            # Skip if lab subject but not lab slot (or vice versa)
                            if subject.is_lab and not slot.is_lab_slot:
                                continue
                            
                            key = (batch.id, subject.id, faculty.id, room.id, slot.id)
                            self.variables[key] = self.model.NewBoolVar(f'x_{key}')
        
        self.logger.debug(f"Created {len(self.variables)} variables")
    
    def _add_hard_constraints(self):
        """Add hard constraints to the model."""
        self.logger.debug("Adding hard constraints...")
        
        # 1. Each subject must be scheduled for required hours
        for batch in self.context.batches:
            for subject_id in batch.subjects:
                subject = self.context.get_subject(subject_id)
                if subject:
                    relevant_vars = [
                        var for key, var in self.variables.items()
                        if key[0] == batch.id and key[1] == subject.id
                    ]
                    if relevant_vars:
                        self.model.Add(sum(relevant_vars) == subject.hours_per_week)
        
        # 2. No faculty overlap
        for faculty in self.context.faculty:
            for slot in self.context.time_slots:
                relevant_vars = [
                    var for key, var in self.variables.items()
                    if key[2] == faculty.id and key[4] == slot.id
                ]
                if relevant_vars:
                    self.model.Add(sum(relevant_vars) <= 1)
        
        # 3. No room overlap
        for room in self.context.rooms:
            for slot in self.context.time_slots:
                relevant_vars = [
                    var for key, var in self.variables.items()
                    if key[3] == room.id and key[4] == slot.id
                ]
                if relevant_vars:
                    self.model.Add(sum(relevant_vars) <= 1)
        
        # 4. No batch overlap
        for batch in self.context.batches:
            for slot in self.context.time_slots:
                relevant_vars = [
                    var for key, var in self.variables.items()
                    if key[0] == batch.id and key[4] == slot.id
                ]
                if relevant_vars:
                    self.model.Add(sum(relevant_vars) <= 1)
        
        # 5. Faculty availability constraints
        for faculty in self.context.faculty:
            for slot_id in faculty.unavailable_slots:
                relevant_vars = [
                    var for key, var in self.variables.items()
                    if key[2] == faculty.id and key[4] == slot_id
                ]
                for var in relevant_vars:
                    self.model.Add(var == 0)
        
        self.logger.debug("Hard constraints added")
    
    def _add_soft_constraints(self):
        """Add soft constraints as weighted objectives."""
        self.logger.debug("Adding soft constraints...")
        
        objective_terms = []
        
        # Faculty preferences
        for faculty in self.context.faculty:
            weight = int(100 * faculty.rank_weight)
            for slot_id in faculty.preferred_time_slots:
                relevant_vars = [
                    var for key, var in self.variables.items()
                    if key[2] == faculty.id and key[4] == slot_id
                ]
                for var in relevant_vars:
                    objective_terms.append(var * weight)
        
        # Room utilization
        for room in self.context.rooms:
            for slot in self.context.time_slots:
                relevant_vars = [
                    var for key, var in self.variables.items()
                    if key[3] == room.id and key[4] == slot.id
                ]
                if relevant_vars:
                    # Reward room usage (promotes efficient utilization)
                    objective_terms.extend([var * 10 for var in relevant_vars])
        
        # Maximize objective
        if objective_terms:
            self.model.Maximize(sum(objective_terms))
        
        self.logger.debug("Soft constraints added")
    
    def _extract_solution(self) -> Solution:
        """Extract solution from CP-SAT solver."""
        assignments = []
        
        for key, var in self.variables.items():
            if self.solver.Value(var) == 1:
                batch_id, subject_id, faculty_id, room_id, slot_id = key
                
                time_slot = self.context.get_time_slot(slot_id)
                subject = self.context.get_subject(subject_id)
                
                assignment = Assignment(
                    id=f"{batch_id}_{subject_id}_{slot_id}",
                    batch_id=batch_id,
                    subject_id=subject_id,
                    faculty_id=faculty_id,
                    room_id=room_id,
                    time_slot=time_slot,
                    is_lab_session=subject.is_lab if subject else False,
                )
                assignments.append(assignment)
        
        solution = Solution(
            assignments=assignments,
            quality_score=self.solver.ObjectiveValue() if self.solver.ObjectiveValue() else 0.0,
        )
        
        # Calculate constraint violations
        solution.constraint_violations = self._calculate_violations(solution)
        
        return solution
    
    def _calculate_violations(self, solution: Solution) -> List[ConstraintViolation]:
        """Calculate constraint violations for the solution."""
        violations = []
        
        # Check for overlaps (should be zero with hard constraints)
        # Check faculty load balance
        faculty_loads = {}
        for assignment in solution.assignments:
            faculty_loads[assignment.faculty_id] = faculty_loads.get(assignment.faculty_id, 0) + 1
        
        for faculty_id, load in faculty_loads.items():
            faculty = self.context.get_faculty(faculty_id)
            if faculty:
                if load < faculty.min_hours_per_week:
                    violations.append(ConstraintViolation(
                        constraint_type=ConstraintType.FACULTY_LOAD_BALANCE,
                        severity=0.3,
                        description=f"Faculty {faculty.name} under-loaded: {load}/{faculty.min_hours_per_week}"
                    ))
                elif load > faculty.max_hours_per_week:
                    violations.append(ConstraintViolation(
                        constraint_type=ConstraintType.FACULTY_LOAD_BALANCE,
                        severity=0.7,
                        description=f"Faculty {faculty.name} over-loaded: {load}/{faculty.max_hours_per_week}"
                    ))
        
        return violations
