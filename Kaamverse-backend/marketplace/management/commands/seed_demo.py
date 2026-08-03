from django.core.management.base import BaseCommand
from django.db import transaction

from accounts.models import EmployerProfile, SeekerProfile, User
from marketplace.models import Job, ServiceListing


class Command(BaseCommand):
    help = "Create idempotent development accounts and approved jobs."

    @transaction.atomic
    def handle(self, *args, **options):
        admin, created = User.objects.get_or_create(
            email="admin@kaamverse.local",
            defaults={
                "first_name": "KaamVerse",
                "last_name": "Admin",
                "role": User.Role.ADMIN,
                "is_staff": True,
                "is_superuser": True,
                "is_email_verified": True,
                "trust_score": 100,
                "verification_level": 4,
            },
        )
        if created:
            admin.set_password("Admin@12345")
            admin.save()

        employer, created = User.objects.get_or_create(
            email="employer@kaamverse.local",
            defaults={
                "first_name": "Leapfrog",
                "last_name": "Technology",
                "role": User.Role.EMPLOYER,
                "phone": "+9779800000001",
                "is_email_verified": True,
                "is_phone_verified": True,
                "trust_score": 98,
                "verification_level": 4,
            },
        )
        if created:
            employer.set_password("Employer@12345")
            employer.save()
        EmployerProfile.objects.update_or_create(
            user=employer,
            defaults={
                "business_name": "Leapfrog Technology Nepal",
                "registration_number": "DEMO-REG-001",
                "pan_vat_number": "DEMO-PAN-001",
                "contact_person": "HR Team",
                "industry": "Software & Technology",
                "company_size": "201-500 employees",
                "website": "https://www.lftechnology.com",
                "address": "Charkhal, Dillibazar",
                "city": "Kathmandu",
                "verification_status": EmployerProfile.VerificationStatus.APPROVED,
            },
        )

        individual_employer, created = User.objects.get_or_create(
            email="individual@kaamverse.local",
            defaults={
                "first_name": "Suman",
                "last_name": "Karki",
                "role": User.Role.EMPLOYER_INDIVIDUAL,
                "phone": "+9779800000003",
                "is_email_verified": True,
                "is_phone_verified": True,
                "trust_score": 90,
                "verification_level": 3,
            },
        )
        if created:
            individual_employer.set_password("Individual@12345")
            individual_employer.save()
        EmployerProfile.objects.update_or_create(
            user=individual_employer,
            defaults={
                "business_name": "Suman Karki Household",
                "registration_number": "",
                "pan_vat_number": "",
                "contact_person": "Suman Karki",
                "industry": "Household Services",
                "company_size": "Individual",
                "website": "",
                "address": "Baneshwor",
                "city": "Kathmandu",
                "verification_status": EmployerProfile.VerificationStatus.APPROVED,
            },
        )

        seeker, created = User.objects.get_or_create(
            email="seeker@kaamverse.local",
            defaults={
                "first_name": "Aarav",
                "last_name": "Sharma",
                "role": User.Role.SEEKER,
                "phone": "+9779800000002",
                "is_email_verified": True,
                "is_phone_verified": True,
                "trust_score": 86,
                "verification_level": 2,
            },
        )
        if created:
            seeker.set_password("Seeker@12345")
            seeker.save()
        SeekerProfile.objects.update_or_create(
            user=seeker,
            defaults={
                "education": "Bachelor in Computer Science",
                "skills": ["React", "JavaScript", "TypeScript", "Figma"],
                "preferred_job_types": ["part-time", "freelance"],
                "availability": {"Monday": "13:00-18:00", "Wednesday": "13:00-18:00", "Saturday": "09:00-17:00"},
                "preferred_location": "Kathmandu",
                "profile_completion": 82,
            },
        )

        jobs = [
            {
                "title": "Part-Time React Developer",
                "description": "Build accessible React interfaces for a Nepal-based product team. Flexible hours for students and early-career developers.",
                "employment_type": "part-time",
                "work_mode": "hybrid",
                "shift_type": "evening",
                "location": "Kathmandu",
                "skills": ["React", "TypeScript", "Tailwind CSS"],
                "salary_min": 35000,
                "salary_max": 55000,
                "salary_period": "month",
                "is_urgent": True,
            },
            {
                "title": "Junior UI/UX Designer",
                "description": "Support user research, wireframing, and high-fidelity interface design for web and mobile products.",
                "employment_type": "part-time",
                "work_mode": "onsite",
                "shift_type": "day",
                "location": "Lalitpur",
                "skills": ["Figma", "UI Design", "User Research"],
                "salary_min": 25000,
                "salary_max": 40000,
                "salary_period": "month",
            },
            {
                "title": "Freelance Content Writer",
                "description": "Write clear English and Nepali content for technology and employment campaigns.",
                "employment_type": "freelance",
                "work_mode": "remote",
                "shift_type": "flexible",
                "location": "Remote - Nepal",
                "skills": ["Content Writing", "English", "Nepali"],
                "salary_min": 1500,
                "salary_max": 3000,
                "salary_period": "project",
            },
        ]
        for payload in jobs:
            Job.objects.update_or_create(
                employer=employer,
                title=payload["title"],
                defaults={**payload, "status": Job.Status.APPROVED, "approved_by": admin},
            )

        services = [
            {"title": "React website support", "category": "Web Development", "description": "Frontend development, bug fixes, accessibility improvements and React mentoring.", "location": "Kathmandu / Remote", "price": 2500, "price_unit": "hour"},
            {"title": "Figma UI design", "category": "Design", "description": "Responsive web and mobile interface design with reusable Figma components.", "location": "Remote - Nepal", "price": 2000, "price_unit": "hour"},
        ]
        for payload in services:
            ServiceListing.objects.update_or_create(
                provider=seeker,
                title=payload["title"],
                defaults={**payload, "availability": seeker.seeker_profile.availability, "status": ServiceListing.Status.ACTIVE},
            )

        self.stdout.write(self.style.SUCCESS("Demo accounts and jobs are ready."))
        self.stdout.write("Admin: admin@kaamverse.local / Admin@12345")
        self.stdout.write("Employer: employer@kaamverse.local / Employer@12345")
        self.stdout.write("Individual employer: individual@kaamverse.local / Individual@12345")
        self.stdout.write("Seeker: seeker@kaamverse.local / Seeker@12345")
