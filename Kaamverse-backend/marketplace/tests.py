import tempfile

from django.test import override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import EmployerProfile, SeekerProfile, User
from .models import Application, Booking, Conversation, FraudReport, Job, Notification, PlatformSetting, SavedJob, SavedTalent, ServiceListing, WorkerReview


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class MarketplaceFlowTests(APITestCase):
    def setUp(self):
        self.employer = User.objects.create_user(
            email="employer@example.com", password="Employer@123", role=User.Role.EMPLOYER
        )
        EmployerProfile.objects.create(
            user=self.employer,
            business_name="Verified Company",
            verification_status=EmployerProfile.VerificationStatus.APPROVED,
        )
        self.seeker = User.objects.create_user(
            email="seeker@example.com", password="Seeker@123", role=User.Role.SEEKER
        )
        SeekerProfile.objects.create(
            user=self.seeker,
            skills=["React", "TypeScript"],
            preferred_job_types=["part-time"],
            preferred_location="Kathmandu",
            availability={"shifts": ["evening"]},
        )
        self.job = Job.objects.create(
            employer=self.employer,
            title="React Assistant",
            description="Part-time React work",
            employment_type="part-time",
            work_mode="hybrid",
            shift_type="evening",
            location="Kathmandu",
            skills=["React", "TypeScript"],
            status=Job.Status.APPROVED,
        )

    def test_seeker_can_recommend_apply_save_and_report(self):
        self.client.force_authenticate(self.seeker)

        recommendations = self.client.get(reverse("recommendations"))
        self.assertEqual(recommendations.status_code, status.HTTP_200_OK)
        self.assertEqual(recommendations.data[0]["id"], self.job.id)
        self.assertGreaterEqual(recommendations.data[0]["match_percentage"], 90)

        application = self.client.post(
            reverse("application-list"), {"job_id": self.job.id, "cover_letter": "I am interested."}, format="json"
        )
        self.assertEqual(application.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Application.objects.filter(job=self.job, seeker=self.seeker).exists())
        self.assertTrue(Notification.objects.filter(recipient=self.employer, category="application").exists())
        self.assertTrue(Notification.objects.filter(recipient=self.seeker, title="Application submitted").exists())

        saved = self.client.post(reverse("saved-job-toggle"), {"job_id": self.job.id}, format="json")
        self.assertEqual(saved.status_code, status.HTTP_201_CREATED)
        self.assertTrue(SavedJob.objects.filter(job=self.job, seeker=self.seeker).exists())

        report = self.client.post(
            reverse("fraud-report-list"),
            {"job": self.job.id, "reason": "other", "description": "Please review this listing."},
            format="json",
        )
        self.assertEqual(report.status_code, status.HTTP_201_CREATED)
        self.assertTrue(FraudReport.objects.filter(job=self.job, reporter=self.seeker).exists())

        conversation_report = self.client.post(
            reverse("fraud-report-list"),
            {"reason": "other", "description": "Please investigate this conversation."},
            format="json",
        )
        self.assertEqual(conversation_report.status_code, status.HTTP_201_CREATED)

    def test_employer_can_find_talent_message_and_book_real_service(self):
        self.client.force_authenticate(self.employer)
        talent = self.client.get(reverse("talent-list"))
        self.assertEqual(talent.status_code, status.HTTP_200_OK)
        self.assertEqual(talent.data["results"][0]["id"], self.seeker.id)

        saved_talent = self.client.post(reverse("saved-talent-toggle"), {"talent_id": self.seeker.id}, format="json")
        self.assertEqual(saved_talent.status_code, status.HTTP_201_CREATED)
        self.assertTrue(SavedTalent.objects.filter(employer=self.employer, talent=self.seeker).exists())
        report = self.client.post(
            reverse("fraud-report-list"),
            {"reported_user": self.seeker.id, "reason": "other", "description": "Please review this profile."},
            format="json",
        )
        self.assertEqual(report.status_code, status.HTTP_201_CREATED)

        conversation = self.client.post(reverse("conversation-list"), {"participant_id": self.seeker.id, "subject": "React opportunity"}, format="json")
        self.assertEqual(conversation.status_code, status.HTTP_201_CREATED)
        sent = self.client.post(reverse("conversation-messages", args=[conversation.data["id"]]), {"body": "Are you available Monday?"}, format="json")
        self.assertEqual(sent.status_code, status.HTTP_201_CREATED)
        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            attachment = SimpleUploadedFile("interview-brief.txt", b"Interview at 2 PM", content_type="text/plain")
            shared = self.client.post(
                reverse("conversation-messages", args=[conversation.data["id"]]),
                {"body": "Please review the brief.", "attachment": attachment},
                format="multipart",
            )
            self.assertEqual(shared.status_code, status.HTTP_201_CREATED)
            self.assertEqual(shared.data["attachment_name"], "interview-brief.txt")
            self.assertTrue(shared.data["attachment"])
            voice = SimpleUploadedFile("voice-message.webm", b"test-audio", content_type="audio/webm")
            voice_shared = self.client.post(
                reverse("conversation-messages", args=[conversation.data["id"]]),
                {"attachment": voice},
                format="multipart",
            )
            self.assertEqual(voice_shared.status_code, status.HTTP_201_CREATED)
            self.assertEqual(voice_shared.data["attachment_name"], "voice-message.webm")
        self.assertTrue(Conversation.objects.filter(pk=conversation.data["id"], participants=self.seeker).exists())
        self.assertTrue(Notification.objects.filter(recipient=self.seeker, category="message").exists())

        service = ServiceListing.objects.create(provider=self.seeker, title="React support", category="Development", description="Bug fixes", price=1500, availability={"Monday": "09:00-17:00"})
        booking = self.client.post(reverse("booking-list"), {"service": service.id, "scheduled_date": "2026-08-10", "start_time": "13:00", "end_time": "15:00"}, format="json")
        self.assertEqual(booking.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Booking.objects.filter(pk=booking.data["id"], client=self.employer).exists())
        self.assertTrue(Notification.objects.filter(recipient=self.seeker, category="booking").exists())

    def test_admin_broadcast_and_job_approval_create_notifications(self):
        admin = User.objects.create_superuser(email="broadcast-admin@example.com", password="Admin@12345")
        self.client.force_authenticate(admin)
        broadcast = self.client.post(reverse("notification-broadcast-list"), {"audience": "seekers", "category": "warning", "title": "Safety warning", "message": "Never pay an employer before starting work.", "send_email": True, "is_marketing": False}, format="json")
        self.assertEqual(broadcast.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Notification.objects.filter(recipient=self.seeker, title="Safety warning").exists())

        pending = Job.objects.create(employer=self.employer, title="TypeScript Assistant", description="React TypeScript role", employment_type="part-time", work_mode="hybrid", shift_type="evening", location="Kathmandu", skills=["React", "TypeScript"], status=Job.Status.PENDING)
        approved = self.client.post(reverse("job-moderate", args=[pending.id]), {"status": "approved"}, format="json")
        self.assertEqual(approved.status_code, status.HTTP_200_OK)
        self.assertTrue(Notification.objects.filter(recipient=self.employer, category="job-moderation").exists())
        self.assertTrue(Notification.objects.filter(recipient=self.seeker, category="similar-job").exists())

    def test_category_filter_and_filled_position_remove_job_from_marketplace(self):
        self.job.category = "Technology"
        self.job.positions = 1
        self.job.save(update_fields=("category", "positions", "updated_at"))
        Job.objects.create(
            employer=self.employer,
            title="Design Assistant",
            category="Design",
            description="Part-time design work",
            employment_type="part-time",
            location="Kathmandu",
            status=Job.Status.APPROVED,
        )
        filtered = self.client.get(reverse("job-list"), {"category": "Technology"})
        self.assertEqual(filtered.status_code, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in filtered.data["results"]], [self.job.id])

        application = Application.objects.create(job=self.job, seeker=self.seeker)
        self.client.force_authenticate(self.employer)
        accepted = self.client.post(reverse("application-update-status", args=[application.id]), {"status": "accepted"}, format="json")
        self.assertEqual(accepted.status_code, status.HTTP_200_OK)
        self.job.refresh_from_db()
        self.assertEqual(self.job.status, Job.Status.CLOSED)
        dashboard = self.client.get(reverse("dashboard"))
        self.assertEqual(dashboard.status_code, status.HTTP_200_OK)
        self.assertEqual(dashboard.data["applications"], 1)
        self.assertEqual(dashboard.data["accepted_hires"], 1)
        self.assertTrue(Notification.objects.filter(recipient=self.seeker, category="application-status").exists())
        self.assertTrue(Notification.objects.filter(recipient=self.employer, category="hiring").exists())
        self.assertEqual(dashboard.data["active_jobs"], 1)
        review = self.client.post(
            reverse("worker-review-list"),
            {"worker": self.seeker.id, "application": application.id, "rating": 5, "feedback": "Reliable and professional."},
            format="json",
        )
        self.assertEqual(review.status_code, status.HTTP_201_CREATED)
        self.assertTrue(WorkerReview.objects.filter(application=application, worker=self.seeker).exists())
        self.assertTrue(Notification.objects.filter(recipient=self.seeker, category="worker-review").exists())
        public_ids = [item["id"] for item in self.client.get(reverse("job-list")).data["results"]]
        self.assertNotIn(self.job.id, public_ids)

    def test_admin_can_delete_marketplace_content(self):
        admin = User.objects.create_superuser(email="content-admin@example.com", password="Admin@12345")
        self.client.force_authenticate(admin)
        response = self.client.delete(reverse("job-detail", args=[self.job.id]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Job.objects.filter(pk=self.job.id).exists())

    def test_maintenance_mode_blocks_public_users_but_admin_can_disable_it(self):
        admin = User.objects.create_superuser(email="maintenance-admin@example.com", password="Admin@12345")
        setting = PlatformSetting.objects.create(
            key="maintenance-mode",
            value={"enabled": True},
            updated_by=admin,
        )

        public_client = APIClient()
        self.assertEqual(public_client.get(reverse("job-list")).status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

        admin_client = APIClient()
        admin_token = RefreshToken.for_user(admin).access_token
        admin_client.credentials(HTTP_AUTHORIZATION=f"Bearer {admin_token}")
        self.assertEqual(admin_client.get(reverse("dashboard")).status_code, status.HTTP_200_OK)
        disabled = admin_client.patch(
            reverse("platform-setting-detail", args=[setting.key]),
            {"value": {"enabled": False}},
            format="json",
        )
        self.assertEqual(disabled.status_code, status.HTTP_200_OK)
        self.assertEqual(public_client.get(reverse("job-list")).status_code, status.HTTP_200_OK)
