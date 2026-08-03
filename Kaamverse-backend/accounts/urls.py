from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView

from .views import (
    AvatarView,
    EmailVerificationConfirmView,
    EmailVerificationSendView,
    KaamverseTokenObtainPairView,
    MeView,
    PasswordChangeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    SessionTokenRefreshView,
    SecurityOverviewView,
    SecuritySessionDetailView,
    LoginHistoryClearView,
    TwoFactorConfirmView,
    TwoFactorDisableView,
    TwoFactorSendView,
    ResumeView,
    PhoneVerificationConfirmView,
    PhoneVerificationSendView,
    RegisterView,
    UserManagementViewSet,
    VerificationSubmissionViewSet,
)

router = DefaultRouter()
router.register("verifications", VerificationSubmissionViewSet, basename="verification")
router.register("users", UserManagementViewSet, basename="user-management")

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("token/", KaamverseTokenObtainPairView.as_view(), name="token"),
    path("token/refresh/", SessionTokenRefreshView.as_view(), name="token-refresh"),
    path("token/verify/", TokenVerifyView.as_view(), name="token-verify"),
    path("me/", MeView.as_view(), name="me"),
    path("me/password/", PasswordChangeView.as_view(), name="password-change"),
    path("me/security/", SecurityOverviewView.as_view(), name="security-overview"),
    path("me/security/sessions/<uuid:session_id>/", SecuritySessionDetailView.as_view(), name="security-session-detail"),
    path("me/security/login-history/", LoginHistoryClearView.as_view(), name="login-history-clear"),
    path("me/security/2fa/send/", TwoFactorSendView.as_view(), name="two-factor-send"),
    path("me/security/2fa/confirm/", TwoFactorConfirmView.as_view(), name="two-factor-confirm"),
    path("me/security/2fa/disable/", TwoFactorDisableView.as_view(), name="two-factor-disable"),
    path("password/reset/request/", PasswordResetRequestView.as_view(), name="password-reset-request"),
    path("password/reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("me/resume/", ResumeView.as_view(), name="resume"),
    path("me/avatar/", AvatarView.as_view(), name="avatar"),
    path("verification/email/send/", EmailVerificationSendView.as_view(), name="email-verification-send"),
    path("verification/email/confirm/", EmailVerificationConfirmView.as_view(), name="email-verification-confirm"),
    path("verification/phone/send/", PhoneVerificationSendView.as_view(), name="phone-verification-send"),
    path("verification/phone/confirm/", PhoneVerificationConfirmView.as_view(), name="phone-verification-confirm"),
    path("", include(router.urls)),
]
