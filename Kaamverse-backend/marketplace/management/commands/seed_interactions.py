import random

from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import EmployerProfile, SeekerProfile, User
from marketplace.models import Application, Job, UserInteraction


# ── Seeker clusters ────────────────────────────────────────────────────────────

SEEKERS = [
    # Tech cluster
    {"email": "bikash@kaamverse.local", "first": "Bikash", "last": "Thapa", "skills": ["React", "TypeScript", "Node.js"], "location": "Kathmandu", "types": ["part-time", "freelance"]},
    {"email": "deepa@kaamverse.local", "first": "Deepa", "last": "Maharjan", "skills": ["Python", "Django", "PostgreSQL"], "location": "Kathmandu", "types": ["part-time"]},
    {"email": "roshan@kaamverse.local", "first": "Roshan", "last": "Rai", "skills": ["React", "TypeScript", "Flutter", "Dart"], "location": "Kathmandu", "types": ["part-time", "freelance"]},
    {"email": "nisha@kaamverse.local", "first": "Nisha", "last": "Tamang", "skills": ["Python", "Node.js", "Django"], "location": "Lalitpur", "types": ["part-time"]},
    {"email": "prashant@kaamverse.local", "first": "Prashant", "last": "Shrestha", "skills": ["React", "JavaScript", "Node.js", "MongoDB"], "location": "Kathmandu", "types": ["freelance"]},
    # Design cluster
    {"email": "sarita@kaamverse.local", "first": "Sarita", "last": "Shakya", "skills": ["Figma", "UI Design", "User Research"], "location": "Lalitpur", "types": ["part-time"]},
    {"email": "manish@kaamverse.local", "first": "Manish", "last": "Joshi", "skills": ["Photoshop", "Illustration", "Canva"], "location": "Kathmandu", "types": ["freelance"]},
    {"email": "priya@kaamverse.local", "first": "Priya", "last": "Khadka", "skills": ["Figma", "UI Design", "Photoshop"], "location": "Lalitpur", "types": ["part-time", "freelance"]},
    {"email": "arun@kaamverse.local", "first": "Arun", "last": "Limbu", "skills": ["UI Design", "User Research", "Illustration"], "location": "Kathmandu", "types": ["part-time"]},
    # Hospitality cluster
    {"email": "binod@kaamverse.local", "first": "Binod", "last": "Gurung", "skills": ["Cooking", "Customer Service", "Nepali"], "location": "Kathmandu", "types": ["part-time", "gig"]},
    {"email": "sushila@kaamverse.local", "first": "Sushila", "last": "Magar", "skills": ["Housekeeping", "Cleaning", "Customer Service"], "location": "Kathmandu", "types": ["part-time", "gig"]},
    {"email": "dipak@kaamverse.local", "first": "Dipak", "last": "KC", "skills": ["Customer Service", "English", "Nepali"], "location": "Kathmandu", "types": ["part-time"]},
    {"email": "rekha@kaamverse.local", "first": "Rekha", "last": "Bhatt", "skills": ["Cooking", "Housekeeping", "Nepali"], "location": "Bhaktapur", "types": ["gig"]},
    # Education cluster
    {"email": "sunita@kaamverse.local", "first": "Sunita", "last": "Poudel", "skills": ["English", "Teaching", "Nepali"], "location": "Bhaktapur", "types": ["part-time"]},
    {"email": "rajesh@kaamverse.local", "first": "Rajesh", "last": "Adhikari", "skills": ["Mathematics", "Tutoring", "English"], "location": "Kathmandu", "types": ["part-time", "freelance"]},
    {"email": "kamala@kaamverse.local", "first": "Kamala", "last": "Dhakal", "skills": ["English", "Teaching", "Mathematics"], "location": "Lalitpur", "types": ["part-time"]},
    {"email": "mohan@kaamverse.local", "first": "Mohan", "last": "Bhandari", "skills": ["Tutoring", "Mathematics", "Nepali"], "location": "Bhaktapur", "types": ["freelance"]},
    # Marketing cluster
    {"email": "anita@kaamverse.local", "first": "Anita", "last": "Basnet", "skills": ["Content Writing", "SEO", "Social Media"], "location": "Kathmandu", "types": ["freelance"]},
    {"email": "suraj@kaamverse.local", "first": "Suraj", "last": "Pandey", "skills": ["Social Media", "SEO", "English"], "location": "Kathmandu", "types": ["freelance", "part-time"]},
    {"email": "laxmi@kaamverse.local", "first": "Laxmi", "last": "Karki", "skills": ["Content Writing", "English", "Nepali"], "location": "Lalitpur", "types": ["freelance"]},
]

# ── Additional jobs ────────────────────────────────────────────────────────────

EXTRA_JOBS = [
    {"title": "Python Backend Developer", "category": "Technology", "description": "Build scalable REST APIs using Django and PostgreSQL for a Nepal-based fintech startup.", "employment_type": "part-time", "work_mode": "hybrid", "shift_type": "day", "location": "Kathmandu", "skills": ["Python", "Django", "PostgreSQL"], "salary_min": 40000, "salary_max": 65000, "salary_period": "month"},
    {"title": "Flutter Mobile Developer", "category": "Technology", "description": "Develop cross-platform mobile applications using Flutter and Dart for local businesses.", "employment_type": "part-time", "work_mode": "onsite", "shift_type": "flexible", "location": "Kathmandu", "skills": ["Flutter", "Dart", "Firebase"], "salary_min": 35000, "salary_max": 55000, "salary_period": "month"},
    {"title": "Full Stack JavaScript Developer", "category": "Technology", "description": "Work on React frontends and Node.js backends for a growing SaaS product.", "employment_type": "freelance", "work_mode": "remote", "shift_type": "flexible", "location": "Remote - Nepal", "skills": ["React", "Node.js", "MongoDB", "JavaScript"], "salary_min": 2000, "salary_max": 4000, "salary_period": "project"},
    {"title": "Graphic Designer", "category": "Design", "description": "Create visual content for marketing campaigns and product packaging.", "employment_type": "freelance", "work_mode": "remote", "shift_type": "flexible", "location": "Remote - Nepal", "skills": ["Photoshop", "Illustration", "Canva"], "salary_min": 1500, "salary_max": 3000, "salary_period": "project"},
    {"title": "Hotel Receptionist", "category": "Hospitality", "description": "Greet guests, manage bookings, and provide excellent front-desk service at a boutique hotel.", "employment_type": "part-time", "work_mode": "onsite", "shift_type": "morning", "location": "Kathmandu", "skills": ["Customer Service", "English", "Nepali"], "salary_min": 18000, "salary_max": 25000, "salary_period": "month"},
    {"title": "Part-Time Housekeeper", "category": "Hospitality", "description": "Maintain cleanliness in residential properties across the Kathmandu valley.", "employment_type": "gig", "work_mode": "onsite", "shift_type": "morning", "location": "Kathmandu", "skills": ["Housekeeping", "Cleaning"], "salary_min": 800, "salary_max": 1200, "salary_period": "day"},
    {"title": "Math Tutor", "category": "Education", "description": "Provide mathematics tutoring for SEE and grade 11-12 students.", "employment_type": "part-time", "work_mode": "hybrid", "shift_type": "evening", "location": "Bhaktapur", "skills": ["Mathematics", "Tutoring"], "salary_min": 15000, "salary_max": 25000, "salary_period": "month"},
    {"title": "English Language Teacher", "category": "Education", "description": "Teach conversational English and grammar to adult learners at a language centre.", "employment_type": "part-time", "work_mode": "onsite", "shift_type": "day", "location": "Lalitpur", "skills": ["English", "Teaching", "Nepali"], "salary_min": 20000, "salary_max": 30000, "salary_period": "month"},
    {"title": "Social Media Manager", "category": "Marketing", "description": "Plan and execute social media strategies for Nepali brands across Facebook, Instagram, and TikTok.", "employment_type": "freelance", "work_mode": "remote", "shift_type": "flexible", "location": "Remote - Nepal", "skills": ["Social Media", "SEO", "Content Writing"], "salary_min": 2000, "salary_max": 5000, "salary_period": "project"},
]

# ── Cluster → job mapping for interaction generation ──────────────────────────

CLUSTER_JOBS = {
    "tech": ["Part-Time React Developer", "Python Backend Developer", "Flutter Mobile Developer", "Full Stack JavaScript Developer"],
    "design": ["Junior UI/UX Designer", "Graphic Designer"],
    "hospitality": ["Hotel Receptionist", "Part-Time Housekeeper"],
    "education": ["Math Tutor", "English Language Teacher"],
    "marketing": ["Freelance Content Writer", "Social Media Manager"],
}

SEEKER_CLUSTER = {}
for s in SEEKERS:
    skills_lower = {sk.lower() for sk in s["skills"]}
    if skills_lower & {"react", "typescript", "node.js", "python", "django", "flutter", "javascript", "mongodb", "dart"}:
        SEEKER_CLUSTER[s["email"]] = "tech"
    elif skills_lower & {"figma", "ui design", "photoshop", "illustration", "canva", "user research"}:
        SEEKER_CLUSTER[s["email"]] = "design"
    elif skills_lower & {"cooking", "housekeeping", "cleaning", "customer service"}:
        SEEKER_CLUSTER[s["email"]] = "hospitality"
    elif skills_lower & {"mathematics", "tutoring", "teaching"}:
        SEEKER_CLUSTER[s["email"]] = "education"
    else:
        SEEKER_CLUSTER[s["email"]] = "marketing"

# Cross-cluster jobs each seeker might browse (light exploration)
CROSS_CLUSTER = {
    "tech": ["Junior UI/UX Designer", "Freelance Content Writer"],
    "design": ["Part-Time React Developer", "Freelance Content Writer"],
    "hospitality": ["English Language Teacher"],
    "education": ["Hotel Receptionist", "Freelance Content Writer"],
    "marketing": ["Junior UI/UX Designer", "English Language Teacher"],
}


class Command(BaseCommand):
    help = "Seed interaction data for collaborative filtering demo."

    @transaction.atomic
    def handle(self, *args, **options):
        random.seed(42)  # Reproducible results

        admin = User.objects.filter(role=User.Role.ADMIN).first()
        employer = User.objects.filter(role=User.Role.EMPLOYER).first()
        individual_employer = User.objects.filter(role=User.Role.EMPLOYER_INDIVIDUAL).first()
        if not admin or not employer:
            self.stderr.write(self.style.ERROR("Run 'seed_demo' first to create base accounts."))
            return

        # ── Create extra jobs ──────────────────────────────────────────────
        job_employer_map = {}
        for payload in EXTRA_JOBS:
            emp = individual_employer if payload["category"] in ("Hospitality", "Education") else employer
            job, _ = Job.objects.update_or_create(
                employer=emp or employer,
                title=payload["title"],
                defaults={**payload, "status": Job.Status.APPROVED, "approved_by": admin},
            )
            job_employer_map[payload["title"]] = job

        # Cache all jobs by title
        all_jobs = {j.title: j for j in Job.objects.filter(status=Job.Status.APPROVED)}

        # ── Create seeker accounts ─────────────────────────────────────────
        seeker_objects = {}
        phone_counter = 9800001000
        for s in SEEKERS:
            user, created = User.objects.get_or_create(
                email=s["email"],
                defaults={
                    "first_name": s["first"],
                    "last_name": s["last"],
                    "role": User.Role.SEEKER,
                    "phone": f"+977{phone_counter}",
                    "is_email_verified": True,
                    "trust_score": random.randint(40, 88),
                    "verification_level": random.randint(1, 3),
                },
            )
            if created:
                user.set_password("Seeker@12345")
                user.save()
                phone_counter += 1
            SeekerProfile.objects.update_or_create(
                user=user,
                defaults={
                    "skills": s["skills"],
                    "preferred_job_types": s["types"],
                    "preferred_location": s["location"],
                    "profile_completion": random.randint(55, 90),
                },
            )
            seeker_objects[s["email"]] = user

        # Also include the existing demo seeker
        demo_seeker = User.objects.filter(email="seeker@kaamverse.local").first()
        if demo_seeker:
            seeker_objects["seeker@kaamverse.local"] = demo_seeker
            SEEKER_CLUSTER["seeker@kaamverse.local"] = "tech"

        # ── Generate interactions ──────────────────────────────────────────
        interaction_count = 0
        application_count = 0

        for email, user in seeker_objects.items():
            cluster = SEEKER_CLUSTER.get(email, "marketing")
            in_cluster_titles = CLUSTER_JOBS.get(cluster, [])
            cross_titles = CROSS_CLUSTER.get(cluster, [])

            # In-cluster: view all, save 1-2, apply to 1
            in_cluster_jobs = [all_jobs[t] for t in in_cluster_titles if t in all_jobs]
            for job in in_cluster_jobs:
                UserInteraction.objects.get_or_create(user=user, job=job, kind=UserInteraction.Kind.VIEW)
                interaction_count += 1

            # Save 1-2 in-cluster jobs
            save_count = min(len(in_cluster_jobs), random.randint(1, 2))
            for job in random.sample(in_cluster_jobs, save_count):
                UserInteraction.objects.get_or_create(user=user, job=job, kind=UserInteraction.Kind.SAVE)
                interaction_count += 1

            # Apply to 1 in-cluster job
            if in_cluster_jobs:
                apply_job = random.choice(in_cluster_jobs)
                UserInteraction.objects.get_or_create(user=user, job=apply_job, kind=UserInteraction.Kind.APPLY)
                interaction_count += 1
                Application.objects.get_or_create(
                    job=apply_job,
                    seeker=user,
                    defaults={"cover_letter": f"I am interested in the {apply_job.title} role.", "status": Application.Status.SUBMITTED},
                )
                application_count += 1

            # Cross-cluster: view 1-2 jobs from adjacent categories
            cross_jobs = [all_jobs[t] for t in cross_titles if t in all_jobs]
            browse_count = min(len(cross_jobs), random.randint(1, 2))
            for job in random.sample(cross_jobs, browse_count):
                UserInteraction.objects.get_or_create(user=user, job=job, kind=UserInteraction.Kind.VIEW)
                interaction_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {len(seeker_objects)} seekers, {len(EXTRA_JOBS)} extra jobs, "
            f"{interaction_count} interactions, {application_count} applications."
        ))
