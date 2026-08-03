from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ApplicationViewSet,
    AuditLogViewSet,
    BookingViewSet,
    ConversationViewSet,
    DashboardView,
    FraudReportViewSet,
    JobViewSet,
    NotificationViewSet,
    NotificationBroadcastViewSet,
    RecommendationView,
    SavedJobViewSet,
    SavedTalentViewSet,
    PlatformSettingViewSet,
    PublicStatsView,
    ServiceListingViewSet,
    TalentViewSet,
    UserActionViewSet,
    WorkerReviewViewSet,
)

router = DefaultRouter()
router.register("jobs", JobViewSet, basename="job")
router.register("applications", ApplicationViewSet, basename="application")
router.register("saved-jobs", SavedJobViewSet, basename="saved-job")
router.register("saved-talent", SavedTalentViewSet, basename="saved-talent")
router.register("fraud-reports", FraudReportViewSet, basename="fraud-report")
router.register("notifications", NotificationViewSet, basename="notification")
router.register("notification-broadcasts", NotificationBroadcastViewSet, basename="notification-broadcast")
router.register("conversations", ConversationViewSet, basename="conversation")
router.register("talent", TalentViewSet, basename="talent")
router.register("services", ServiceListingViewSet, basename="service-listing")
router.register("bookings", BookingViewSet, basename="booking")
router.register("audit-logs", AuditLogViewSet, basename="audit-log")
router.register("platform-settings", PlatformSettingViewSet, basename="platform-setting")
router.register("user-actions", UserActionViewSet, basename="user-action")
router.register("worker-reviews", WorkerReviewViewSet, basename="worker-review")

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("public-stats/", PublicStatsView.as_view(), name="public-stats"),
    path("recommendations/", RecommendationView.as_view(), name="recommendations"),
    path("", include(router.urls)),
]
