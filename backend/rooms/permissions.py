from rest_framework import permissions

class IsAdmin(permissions.BasePermission):
    """
    Allows access only to Admin users.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'ADMIN'

class IsReceptionistOrAdmin(permissions.BasePermission):
    """
    Allows access only to Receptionists and Admins.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ['ADMIN', 'RECEPTION']

class IsWaiterOrAdmin(permissions.BasePermission):
    """
    Allows access only to Waiters and Admins.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ['ADMIN', 'WAITER']

class IsKitchenOrAdmin(permissions.BasePermission):
    """
    Allows access only to Kitchen Staff and Admins.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ['ADMIN', 'KITCHEN']

class IsBookingOwnerOrStaff(permissions.BasePermission):
    """
    Guests can only access their own bookings. Receptionists and Admins can access all bookings.
    """
    def has_object_permission(self, request, view, obj):
        if request.user.role in ['ADMIN', 'RECEPTION']:
            return True
        return obj.guest == request.user

