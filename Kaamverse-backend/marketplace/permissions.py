from rest_framework.permissions import BasePermission, SAFE_METHODS

from accounts.models import User


class IsAdministrator(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.Role.ADMIN


class IsEmployer(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in {
            User.Role.EMPLOYER,
            User.Role.EMPLOYER_INDIVIDUAL,
        }


class IsSeeker(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.Role.SEEKER


class IsOwnerOrAdministrator(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        if request.user.role == User.Role.ADMIN:
            return True
        owner = getattr(obj, "employer", None) or getattr(obj, "seeker", None) or getattr(obj, "reporter", None)
        return owner == request.user
