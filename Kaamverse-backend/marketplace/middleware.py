from django.http import JsonResponse

from .models import AuditLog, PlatformSetting


class MaintenanceModeMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith("/api/") and request.path not in {"/api/health/", "/api/auth/token/", "/api/auth/token/refresh/"}:
            setting = PlatformSetting.objects.filter(key="maintenance-mode").values_list("value", flat=True).first() or {}
            user = getattr(request, "user", None)
            if setting.get("enabled") and not (user and user.is_authenticated):
                try:
                    from rest_framework_simplejwt.authentication import JWTAuthentication

                    authenticated = JWTAuthentication().authenticate(request)
                    if authenticated:
                        user = authenticated[0]
                        request.user = user
                except Exception:
                    user = None
            is_admin = bool(user and user.is_authenticated and getattr(user, "role", "") == "admin")
            if setting.get("enabled") and not is_admin:
                return JsonResponse({"error": {"code": "maintenance_mode", "detail": "KaamVerse is temporarily under maintenance. Please try again shortly."}}, status=503)
        return self.get_response(request)


class AuditLogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if request.path.startswith("/api/") and request.method not in {"GET", "HEAD", "OPTIONS"}:
            forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
            ip = forwarded.split(",")[0].strip() if forwarded else request.META.get("REMOTE_ADDR")
            actor = request.user if getattr(request, "user", None) and request.user.is_authenticated else None
            try:
                AuditLog.objects.create(
                    actor=actor,
                    action=f"{request.method} {request.resolver_match.url_name if request.resolver_match else request.path}",
                    method=request.method,
                    path=request.path[:255],
                    status_code=response.status_code,
                    ip_address=ip,
                    user_agent=request.META.get("HTTP_USER_AGENT", "")[:255],
                )
            except Exception:
                pass
        return response
