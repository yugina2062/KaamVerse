from collections.abc import Iterable


def normalize(values: Iterable[str]) -> set[str]:
    return {str(value).strip().lower() for value in values if str(value).strip()}


def recommendation_score(user, job) -> int:
    if not hasattr(user, "seeker_profile"):
        return 0

    profile = user.seeker_profile
    seeker_skills = normalize(profile.skills)
    job_skills = normalize(job.skills)
    skill_score = 0
    if job_skills:
        skill_score = round(60 * len(seeker_skills & job_skills) / len(job_skills))

    location_score = 0
    if profile.preferred_location:
        preferred = profile.preferred_location.lower()
        if preferred in job.location.lower() or job.work_mode == "remote":
            location_score = 20

    type_score = 0
    if not profile.preferred_job_types or job.employment_type in profile.preferred_job_types:
        type_score = 10

    schedule_score = 0
    preferred_shifts = normalize(profile.availability.get("shifts", [])) if isinstance(profile.availability, dict) else set()
    if not preferred_shifts or job.shift_type in preferred_shifts or job.shift_type == "flexible":
        schedule_score = 10

    return min(100, skill_score + location_score + type_score + schedule_score)
