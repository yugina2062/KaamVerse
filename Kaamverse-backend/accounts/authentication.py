from django.utils import timezone
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed

from .models import SecuritySession


class SessionJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        authenticated = super().authenticate(request)
        if authenticated is None:
            return None

        user, validated_token = authenticated
        session_id = validated_token.get("session_id")
        if session_id:
            SecuritySession.objects.filter(
                id=session_id,
                user=user,
                revoked_at__isnull=True,
                expires_at__gt=timezone.now(),
            ).update(last_seen_at=timezone.now())
        return user, validated_token

    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        session_id = validated_token.get("session_id")
        if session_id and not SecuritySession.objects.filter(
            id=session_id,
            user=user,
            revoked_at__isnull=True,
            expires_at__gt=timezone.now(),
        ).exists():
            raise AuthenticationFailed("This session has been revoked. Sign in again.")
        return user
