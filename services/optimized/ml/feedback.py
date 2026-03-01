"""
Feedback collection and processing for adaptive learning.

Collects stakeholder feedback on generated timetables and aggregates
it into actionable metrics for constraint weight adjustment.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional
from datetime import datetime
from collections import defaultdict
import numpy as np
from enum import Enum


class StakeholderType(Enum):
    """Types of stakeholders providing feedback."""
    FACULTY = "faculty"
    STUDENT = "student"
    ADMIN = "admin"


@dataclass
class ConstraintFeedback:
    """Feedback on a specific constraint."""
    constraint_name: str
    satisfaction_score: float  # 1-5 scale
    violation_count: int = 0
    comments: Optional[str] = None
    
    def __post_init__(self):
        """Validate satisfaction score."""
        if not 1.0 <= self.satisfaction_score <= 5.0:
            raise ValueError(f"Satisfaction score must be between 1 and 5, got {self.satisfaction_score}")


@dataclass
class StakeholderFeedback:
    """Complete feedback from one stakeholder."""
    id: str
    solution_id: str
    stakeholder_type: StakeholderType
    stakeholder_id: str
    overall_rating: float  # 1-5 scale
    constraint_ratings: List[ConstraintFeedback] = field(default_factory=list)
    specific_issues: List[str] = field(default_factory=list)
    suggestions: List[str] = field(default_factory=list)
    timestamp: datetime = field(default_factory=datetime.now)
    
    def __post_init__(self):
        """Validate overall rating."""
        if not 1.0 <= self.overall_rating <= 5.0:
            raise ValueError(f"Overall rating must be between 1 and 5, got {self.overall_rating}")


@dataclass
class FeedbackSummary:
    """Aggregated feedback summary."""
    solution_id: str
    total_responses: int
    average_rating: float
    constraint_scores: Dict[str, float]  # constraint_name -> avg_score
    common_issues: Dict[str, int]  # issue -> frequency
    stakeholder_breakdown: Dict[str, float]  # type -> avg_rating
    feedback_ids: List[str]
    created_at: datetime = field(default_factory=datetime.now)


class FeedbackCollector:
    """Collects and processes stakeholder feedback."""
    
    def __init__(self):
        """Initialize feedback collector."""
        self.feedbacks: Dict[str, List[StakeholderFeedback]] = defaultdict(list)
    
    def collect_feedback(self, feedback: StakeholderFeedback) -> None:
        """Store a single feedback entry.
        
        Args:
            feedback: Stakeholder feedback to store
        """
        self.feedbacks[feedback.solution_id].append(feedback)
    
    def collect_faculty_feedback(
        self,
        solution_id: str,
        faculty_id: str,
        overall_rating: float,
        constraint_ratings: Optional[Dict[str, float]] = None,
        issues: Optional[List[str]] = None,
        suggestions: Optional[List[str]] = None
    ) -> StakeholderFeedback:
        """Collect feedback from faculty member.
        
        Args:
            solution_id: ID of the solution being rated
            faculty_id: Faculty member ID
            overall_rating: Overall satisfaction (1-5)
            constraint_ratings: Optional ratings per constraint
            issues: Optional list of specific issues
            suggestions: Optional improvement suggestions
            
        Returns:
            Created feedback object
        """
        constraint_feedbacks = []
        if constraint_ratings:
            for constraint, score in constraint_ratings.items():
                constraint_feedbacks.append(
                    ConstraintFeedback(
                        constraint_name=constraint,
                        satisfaction_score=score
                    )
                )
        
        feedback = StakeholderFeedback(
            id=f"fb_{faculty_id}_{solution_id}_{datetime.now().timestamp()}",
            solution_id=solution_id,
            stakeholder_type=StakeholderType.FACULTY,
            stakeholder_id=faculty_id,
            overall_rating=overall_rating,
            constraint_ratings=constraint_feedbacks,
            specific_issues=issues or [],
            suggestions=suggestions or []
        )
        
        self.collect_feedback(feedback)
        return feedback
    
    def collect_student_feedback(
        self,
        solution_id: str,
        student_id: str,
        overall_rating: float,
        constraint_ratings: Optional[Dict[str, float]] = None,
        issues: Optional[List[str]] = None
    ) -> StakeholderFeedback:
        """Collect feedback from student.
        
        Args:
            solution_id: ID of the solution being rated
            student_id: Student ID
            overall_rating: Overall satisfaction (1-5)
            constraint_ratings: Optional ratings per constraint
            issues: Optional list of specific issues
            
        Returns:
            Created feedback object
        """
        constraint_feedbacks = []
        if constraint_ratings:
            for constraint, score in constraint_ratings.items():
                constraint_feedbacks.append(
                    ConstraintFeedback(
                        constraint_name=constraint,
                        satisfaction_score=score
                    )
                )
        
        feedback = StakeholderFeedback(
            id=f"fb_{student_id}_{solution_id}_{datetime.now().timestamp()}",
            solution_id=solution_id,
            stakeholder_type=StakeholderType.STUDENT,
            stakeholder_id=student_id,
            overall_rating=overall_rating,
            constraint_ratings=constraint_feedbacks,
            specific_issues=issues or []
        )
        
        self.collect_feedback(feedback)
        return feedback
    
    def aggregate_feedback(self, solution_id: str) -> Optional[FeedbackSummary]:
        """Aggregate all feedback for a solution.
        
        Args:
            solution_id: Solution to aggregate feedback for
            
        Returns:
            FeedbackSummary if feedback exists, None otherwise
        """
        feedbacks = self.feedbacks.get(solution_id, [])
        
        if not feedbacks:
            return None
        
        # Calculate average rating
        ratings = [f.overall_rating for f in feedbacks]
        avg_rating = np.mean(ratings)
        
        # Aggregate constraint scores
        constraint_scores = defaultdict(list)
        for feedback in feedbacks:
            for constraint_fb in feedback.constraint_ratings:
                constraint_scores[constraint_fb.constraint_name].append(
                    constraint_fb.satisfaction_score
                )
        
        avg_constraint_scores = {
            constraint: np.mean(scores)
            for constraint, scores in constraint_scores.items()
        }
        
        # Count common issues
        issue_counts = defaultdict(int)
        for feedback in feedbacks:
            for issue in feedback.specific_issues:
                issue_counts[issue] += 1
        
        # Breakdown by stakeholder type
        stakeholder_ratings = defaultdict(list)
        for feedback in feedbacks:
            stakeholder_ratings[feedback.stakeholder_type.value].append(
                feedback.overall_rating
            )
        
        stakeholder_breakdown = {
            stype: np.mean(ratings)
            for stype, ratings in stakeholder_ratings.items()
        }
        
        return FeedbackSummary(
            solution_id=solution_id,
            total_responses=len(feedbacks),
            average_rating=float(avg_rating),
            constraint_scores=avg_constraint_scores,
            common_issues=dict(issue_counts),
            stakeholder_breakdown=stakeholder_breakdown,
            feedback_ids=[f.id for f in feedbacks]
        )
    
    def get_feedback_for_solution(self, solution_id: str) -> List[StakeholderFeedback]:
        """Get all feedback for a specific solution.
        
        Args:
            solution_id: Solution ID
            
        Returns:
            List of feedback entries
        """
        return self.feedbacks.get(solution_id, [])
    
    def get_all_solutions_with_feedback(self) -> List[str]:
        """Get list of solution IDs that have feedback.
        
        Returns:
            List of solution IDs
        """
        return list(self.feedbacks.keys())
    
    def clear_feedback(self, solution_id: Optional[str] = None) -> None:
        """Clear feedback from memory.
        
        Args:
            solution_id: Specific solution to clear, or None to clear all
        """
        if solution_id:
            self.feedbacks.pop(solution_id, None)
        else:
            self.feedbacks.clear()


def create_sample_feedback(solution_id: str) -> List[StakeholderFeedback]:
    """Create sample feedback for testing.
    
    Args:
        solution_id: Solution ID to create feedback for
        
    Returns:
        List of sample feedback entries
    """
    feedbacks = []
    
    # Faculty feedback
    feedbacks.append(StakeholderFeedback(
        id=f"fb_fac1_{solution_id}",
        solution_id=solution_id,
        stakeholder_type=StakeholderType.FACULTY,
        stakeholder_id="faculty_001",
        overall_rating=4.5,
        constraint_ratings=[
            ConstraintFeedback("faculty_preference", 4.8),
            ConstraintFeedback("workload_balance", 4.2),
        ],
        specific_issues=["Back-to-back classes on different floors"],
        suggestions=["Group classes by building"]
    ))
    
    # Student feedback
    feedbacks.append(StakeholderFeedback(
        id=f"fb_stu1_{solution_id}",
        solution_id=solution_id,
        stakeholder_type=StakeholderType.STUDENT,
        stakeholder_id="student_001",
        overall_rating=3.8,
        constraint_ratings=[
            ConstraintFeedback("student_gaps", 3.5),
            ConstraintFeedback("course_grouping", 4.0),
        ],
        specific_issues=["Too many gaps between classes"]
    ))
    
    # Admin feedback
    feedbacks.append(StakeholderFeedback(
        id=f"fb_admin1_{solution_id}",
        solution_id=solution_id,
        stakeholder_type=StakeholderType.ADMIN,
        stakeholder_id="admin_001",
        overall_rating=4.2,
        constraint_ratings=[
            ConstraintFeedback("room_utilization", 4.5),
        ],
        suggestions=["Excellent room utilization"]
    ))
    
    return feedbacks
