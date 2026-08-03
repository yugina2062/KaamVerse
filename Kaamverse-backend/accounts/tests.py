import tempfile
import re

from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken

from .models import EmployerProfile, LoginActivity, SecuritySession, SeekerProfile, User, VerificationSubmission


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class AuthenticationTests(APITestCase):
    @override_settings(DEBUG=True)
    def test_registration_login_and_me(self):
        registration = self.client.post(
            reverse("register"),
            {
                "email": "student@example.com",
                "password": "StrongPass@123",
                "first_name": "Student",
                "last_name": "User",
                "phone": "+9779811111111",
                "role": User.Role.SEEKER,
                "profile": {
                    "skills": ["React", "Figma"],
                    "preferred_location": "Kathmandu",
                },
            },
            format="json",
        )
        self.assertEqual(registration.status_code, status.HTTP_201_CREATED)
        self.assertEqual(registration.data["role"], User.Role.SEEKER)

        login = self.client.post(
            reverse("token"),
            {"email": "student@example.com", "password": "StrongPass@123"},
            format="json",
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        self.assertIn("access", login.data)

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {login.data["access"]}')
        email_send = self.client.post(reverse("email-verification-send"), {}, format="json")
        self.assertEqual(email_send.status_code, status.HTTP_200_OK)
        code_match = re.search(r"\b(\d{6})\b", mail.outbox[-1].body)
        self.assertIsNotNone(code_match)
        email_confirm = self.client.post(
            reverse("email-verification-confirm"),
            {"code": code_match.group(1)},
            format="json",
        )
        self.assertEqual(email_confirm.status_code, status.HTTP_200_OK)

        phone_send = self.client.post(reverse("phone-verification-send"), {}, format="json")
        phone_confirm = self.client.post(
            reverse("phone-verification-confirm"),
            {"code": phone_send.data["development_code"]},
            format="json",
        )
        self.assertEqual(phone_confirm.status_code, status.HTTP_200_OK)

        profile = self.client.get(reverse("me"))
        self.assertEqual(profile.status_code, status.HTTP_200_OK)
        self.assertEqual(profile.data["seeker_profile"]["skills"], ["React", "Figma"])
        self.assertTrue(profile.data["is_email_verified"])
        self.assertTrue(profile.data["is_phone_verified"])

    def test_verification_document_upload_validation(self):
        user = User.objects.create_user(
            email="verification@example.com",
            password="StrongPass@123",
            role=User.Role.SEEKER,
        )
        self.client.force_authenticate(user)

        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            response = self.client.post(
                reverse("verification-list"),
                {
                    "document_type": "nid_front",
                    "document": SimpleUploadedFile("citizenship.jpg", b"test-image", content_type="image/jpeg"),
                },
                format="multipart",
            )
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)
            self.assertEqual(VerificationSubmission.objects.filter(user=user).count(), 1)

            invalid = self.client.post(
                reverse("verification-list"),
                {
                    "document_type": "nid_back",
                    "document": SimpleUploadedFile("payload.exe", b"invalid", content_type="application/octet-stream"),
                },
                format="multipart",
            )
            self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)

            face_submission = self.client.post(
                reverse("verification-list"),
                {
                    "document_type": "face_selfie",
                    "document": SimpleUploadedFile("selfie.jpg", b"test-image", content_type="image/jpeg"),
                },
                format="multipart",
            )
            self.assertEqual(face_submission.status_code, status.HTTP_400_BAD_REQUEST)

    def test_seeker_profile_availability_and_resume(self):
        user = User.objects.create_user(
            email="profile@example.com",
            password="StrongPass@123",
            role=User.Role.SEEKER,
        )
        SeekerProfile.objects.create(user=user)
        self.client.force_authenticate(user)
        update = self.client.patch(
            reverse("me"),
            {
                "first_name": "Updated",
                "seeker_profile": {
                    "bio": "Frontend engineer",
                    "availability": {"Monday": "evening"},
                    "preferred_location": "Kathmandu",
                },
            },
            format="json",
        )
        self.assertEqual(update.status_code, status.HTTP_200_OK)
        self.assertEqual(update.data["seeker_profile"]["availability"]["Monday"], "evening")

        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            upload = self.client.post(
                reverse("resume"),
                {"resume": SimpleUploadedFile("resume.pdf", b"test-pdf", content_type="application/pdf")},
                format="multipart",
            )
            self.assertEqual(upload.status_code, status.HTTP_200_OK)
            self.assertTrue(upload.data["seeker_profile"]["resume"])

            removed = self.client.delete(reverse("resume"))
            self.assertEqual(removed.status_code, status.HTTP_204_NO_CONTENT)

    def test_employer_can_save_exact_worker_wanted_schedule(self):
        user = User.objects.create_user(
            email="employer-schedule@example.com",
            password="StrongPass@123",
            role=User.Role.EMPLOYER,
        )
        EmployerProfile.objects.create(user=user, business_name="Schedule Test")
        self.client.force_authenticate(user)
        schedule = {
            "Monday": "13:00-15:00",
            "Wednesday": "09:30-12:30",
        }
        response = self.client.patch(
            reverse("me"),
            {"employer_profile": {"wanted_schedule": schedule}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["employer_profile"]["wanted_schedule"], schedule)
        user.employer_profile.refresh_from_db()
        self.assertEqual(user.employer_profile.wanted_schedule, schedule)

    def test_admin_can_suspend_user_and_review_verification(self):
        admin = User.objects.create_superuser(email="admin@example.com", password="Admin@12345")
        seeker = User.objects.create_user(email="review@example.com", password="StrongPass@123", role=User.Role.SEEKER)
        SeekerProfile.objects.create(user=seeker)
        self.client.force_authenticate(admin)

        users = self.client.get(reverse("user-management-list"))
        self.assertEqual(users.status_code, status.HTTP_200_OK)
        suspended = self.client.post(reverse("user-management-suspend", args=[seeker.pk]), {}, format="json")
        self.assertEqual(suspended.status_code, status.HTTP_200_OK)
        seeker.refresh_from_db()
        self.assertFalse(seeker.is_active)

        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            verification = VerificationSubmission.objects.create(
                user=seeker,
                document_type="identity",
                document=SimpleUploadedFile("identity.pdf", b"test-pdf", content_type="application/pdf"),
            )
            reviewed = self.client.post(
                reverse("verification-review", args=[verification.pk]),
                {"status": VerificationSubmission.Status.APPROVED, "notes": "Document checked."},
                format="json",
            )
            self.assertEqual(reviewed.status_code, status.HTTP_200_OK)
            verification.refresh_from_db()
            self.assertEqual(verification.status, VerificationSubmission.Status.APPROVED)

    def test_authenticated_user_can_change_password(self):
        user = User.objects.create_user(email="password@example.com", password="OldPass@123", role=User.Role.SEEKER)
        SeekerProfile.objects.create(user=user)
        self.client.force_authenticate(user)
        changed = self.client.post(
            reverse("password-change"),
            {"current_password": "OldPass@123", "new_password": "NewPass@456"},
            format="json",
        )
        self.assertEqual(changed.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.check_password("NewPass@456"))

    def test_two_factor_login_session_history_and_revocation(self):
        user = User.objects.create_user(email="secure@example.com", password="SecurePass@123", role=User.Role.EMPLOYER)
        EmployerProfile.objects.create(user=user, business_name="Secure Employer")

        login = self.client.post(reverse("token"), {"email": user.email, "password": "SecurePass@123"}, format="json")
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {login.data["access"]}')
        overview = self.client.get(reverse("security-overview"))
        self.assertEqual(overview.status_code, status.HTTP_200_OK)
        self.assertEqual(len(overview.data["sessions"]), 1)
        self.assertEqual(len(overview.data["login_history"]), 1)

        sent = self.client.post(reverse("two-factor-send"), {}, format="json")
        self.assertEqual(sent.status_code, status.HTTP_200_OK)
        setup_code = re.search(r"\b(\d{6})\b", mail.outbox[-1].body).group(1)
        enabled = self.client.post(reverse("two-factor-confirm"), {"code": setup_code}, format="json")
        self.assertEqual(enabled.status_code, status.HTTP_200_OK)

        unauthenticated = self.client_class()
        challenge = unauthenticated.post(reverse("token"), {"email": user.email, "password": "SecurePass@123"}, format="json")
        self.assertEqual(challenge.status_code, status.HTTP_400_BAD_REQUEST)
        login_code = re.search(r"\b(\d{6})\b", mail.outbox[-1].body).group(1)
        verified_login = unauthenticated.post(reverse("token"), {"email": user.email, "password": "SecurePass@123", "two_factor_code": login_code}, format="json")
        self.assertEqual(verified_login.status_code, status.HTTP_200_OK)

        unauthenticated.credentials(HTTP_AUTHORIZATION=f'Bearer {verified_login.data["access"]}')
        disabled = unauthenticated.post(reverse("two-factor-disable"), {"password": "SecurePass@123"}, format="json")
        self.assertEqual(disabled.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertFalse(user.two_factor_enabled)

        session_id = overview.data["sessions"][0]["id"]
        revoked = self.client.delete(reverse("security-session-detail", args=[session_id]))
        self.assertEqual(revoked.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(self.client.get(reverse("me")).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_security_overview_backfills_legacy_token_session_and_history(self):
        user = User.objects.create_user(email="legacy@example.com", password="SecurePass@123", role=User.Role.SEEKER)
        SeekerProfile.objects.create(user=user)
        token = AccessToken.for_user(user)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}", HTTP_USER_AGENT="KaamVerse Test Browser")

        overview = self.client.get(reverse("security-overview"))

        self.assertEqual(overview.status_code, status.HTTP_200_OK)
        self.assertEqual(len(overview.data["sessions"]), 1)
        self.assertTrue(overview.data["sessions"][0]["current"])
        self.assertEqual(len(overview.data["login_history"]), 1)
        self.assertEqual(SecuritySession.objects.filter(user=user).count(), 1)
        self.assertEqual(LoginActivity.objects.filter(user=user).count(), 1)

    def test_password_reset_code_changes_password(self):
        user = User.objects.create_user(email="reset@example.com", password="OldPass@123", role=User.Role.SEEKER)
        SeekerProfile.objects.create(user=user)
        requested = self.client.post(reverse("password-reset-request"), {"email": user.email}, format="json")
        self.assertEqual(requested.status_code, status.HTTP_200_OK)
        code_match = re.search(r"\b(\d{6})\b", mail.outbox[-1].body)
        self.assertIsNotNone(code_match)
        confirmed = self.client.post(reverse("password-reset-confirm"), {"email": user.email, "code": code_match.group(1), "new_password": "ResetPass@456"}, format="json")
        self.assertEqual(confirmed.status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertTrue(user.check_password("ResetPass@456"))

    def test_profile_date_and_avatar_are_persisted(self):
        user = User.objects.create_user(email="profile@example.com", password="StrongPass@123", role=User.Role.SEEKER)
        SeekerProfile.objects.create(user=user)
        self.client.force_authenticate(user)
        updated = self.client.patch(reverse("me"), {"date_of_birth": "2001-05-20"}, format="json")
        self.assertEqual(updated.status_code, status.HTTP_200_OK)
        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            avatar = SimpleUploadedFile("avatar.png", b"small-image-payload", content_type="image/png")
            uploaded = self.client.post(reverse("avatar"), {"avatar": avatar}, format="multipart")
            self.assertEqual(uploaded.status_code, status.HTTP_200_OK)
            user.refresh_from_db()
            self.assertEqual(str(user.date_of_birth), "2001-05-20")
            self.assertTrue(bool(user.avatar))
