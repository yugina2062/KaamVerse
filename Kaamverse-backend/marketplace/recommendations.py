from collections.abc import Iterable


def normalize(values: Iterable[str]) -> set[str]:
    return {str(value).strip().lower() for value in values if str(value).strip()}


# ── Content-Based Scoring ──────────────────────────────────────────────────────


def _experience_score(user, job) -> int:
    """Score based on past applications and interaction history (max 20)."""
    from .models import Application, UserInteraction

    score = 0

    # Category affinity: has the user applied to jobs in this category?
    applied_categories = set(
        Application.objects.filter(seeker=user)
        .values_list("job__category", flat=True)
    )
    if job.category and job.category in applied_categories:
        score += 8

    # Employer familiarity: has the user interacted with this employer before?
    interacted_employers = set(
        UserInteraction.objects.filter(user=user)
        .values_list("job__employer_id", flat=True)
    )
    if job.employer_id in interacted_employers:
        score += 4

    # Skill growth: jobs with skills the user has + new skills to learn
    seeker_skills = normalize(user.seeker_profile.skills)
    job_skills = normalize(job.skills)
    if seeker_skills and job_skills:
        overlap = len(seeker_skills & job_skills)
        new_skills = len(job_skills - seeker_skills)
        if overlap > 0 and new_skills > 0:
            score += min(8, round(8 * overlap / len(job_skills)))

    return min(20, score)


def content_based_score(user, job) -> dict:
    """Score a job against the seeker's profile (max 100).

    Returns a breakdown dict with individual factor scores.
    """
    if not hasattr(user, "seeker_profile"):
        return {"total": 0, "skills": 0, "location": 0, "job_type": 0, "schedule": 0, "experience": 0}

    profile = user.seeker_profile

    # Skills overlap (max 40)
    seeker_skills = normalize(profile.skills)
    job_skills = normalize(job.skills)
    skill_score = round(40 * len(seeker_skills & job_skills) / len(job_skills)) if job_skills else 0

    # Location match (max 20)
    location_score = 0
    if profile.preferred_location:
        preferred = profile.preferred_location.lower()
        if preferred in job.location.lower() or job.work_mode == "remote":
            location_score = 20

    # Job type preference (max 10)
    type_score = 0
    if not profile.preferred_job_types or job.employment_type in profile.preferred_job_types:
        type_score = 10

    # Schedule/shift (max 10)
    schedule_score = 0
    preferred_shifts = normalize(profile.availability.get("shifts", [])) if isinstance(profile.availability, dict) else set()
    if not preferred_shifts or job.shift_type in preferred_shifts or job.shift_type == "flexible":
        schedule_score = 10

    # Experience signal (max 20)
    experience = _experience_score(user, job)

    total = min(100, skill_score + location_score + type_score + schedule_score + experience)
    return {
        "total": total,
        "skills": skill_score,
        "location": location_score,
        "job_type": type_score,
        "schedule": schedule_score,
        "experience": experience,
    }


# ── Collaborative Filtering ───────────────────────────────────────────────────


def collaborative_score(user, job) -> dict:
    """Item-based collaborative filtering (max 100).

    Finds users with similar interaction patterns and scores the job
    by how many of those similar users also interacted with it.
    """
    from .models import UserInteraction

    empty = {"total": 0, "similar_user_count": 0}

    # Step 1: Jobs this user has interacted with
    my_job_ids = set(
        UserInteraction.objects.filter(user=user)
        .values_list("job_id", flat=True)
    )
    if not my_job_ids:
        return empty

    # Step 2: Other users who interacted with the same jobs
    similar_user_ids = set(
        UserInteraction.objects.filter(job_id__in=my_job_ids)
        .exclude(user=user)
        .values_list("user_id", flat=True)
        .distinct()
    )
    if not similar_user_ids:
        return empty

    # Step 3: How many similar users interacted with THIS job?
    overlap = (
        UserInteraction.objects.filter(user_id__in=similar_user_ids, job=job)
        .values("user_id")
        .distinct()
        .count()
    )

    total = min(100, round(overlap / len(similar_user_ids) * 100))
    return {"total": total, "similar_user_count": overlap}


# ── Hybrid Score ───────────────────────────────────────────────────────────────

CONTENT_WEIGHT = 0.6
COLLABORATIVE_WEIGHT = 0.4


def hybrid_recommendation_score(user, job) -> dict:
    """Blend content-based and collaborative filtering scores.

    Returns a full breakdown dict used by both the API response
    and the frontend "Why?" explanation.
    """
    cb = content_based_score(user, job)
    cf = collaborative_score(user, job)

    total = round(cb["total"] * CONTENT_WEIGHT + cf["total"] * COLLABORATIVE_WEIGHT)
    total = min(100, max(0, total))

    return {
        "total": total,
        "content_total": cb["total"],
        "collaborative_total": cf["total"],
        "skills": cb["skills"],
        "location": cb["location"],
        "job_type": cb["job_type"],
        "schedule": cb["schedule"],
        "experience": cb["experience"],
        "similar_users": cf["total"],
        "similar_user_count": cf["similar_user_count"],
    }


# ── Backward-compatible wrapper ────────────────────────────────────────────────


def recommendation_score(user, job) -> int:
    """Return only the integer total for call sites that expect an int."""
    return hybrid_recommendation_score(user, job)["total"]
