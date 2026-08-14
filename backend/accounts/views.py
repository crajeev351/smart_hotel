from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import CustomUser
from .serializers import UserSerializer
from .email_utils import EmailConfigurationError, send_configured_mail


def login_page(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')

        user = authenticate(request, username=username, password=password)

        if user is not None:
            login(request, user)
            return redirect('categories')
        else:
            return render(request, 'login.html', {'error': 'Invalid credentials'})

    return render(request, 'login.html')


def logout_page(request):
    logout(request)
    return redirect('login')


from rest_framework.permissions import IsAuthenticated, AllowAny

class UserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all()
    serializer_class = UserSerializer

    def get_permissions(self):
        if self.action in ['create', 'send_checkin_otp', 'verify_checkin_otp']:
            return [AllowAny()]
        return super().get_permissions()

    def get_throttles(self):
        if self.action in ['send_checkin_otp', 'verify_checkin_otp']:
            return [BurstRateThrottle()]
        return super().get_throttles()

    def perform_create(self, serializer):
        role = serializer.validated_data.get('role', 'GUEST')
        email = serializer.validated_data.get('email', '')
        phone = serializer.validated_data.get('phone', '')

        is_admin = self.request.user and (self.request.user.role == 'ADMIN' or self.request.user.is_staff)

        if role == 'GUEST' and not is_admin:
            from .models import OTPVerification
            from django.utils import timezone
            from rest_framework.exceptions import ValidationError

            # Check if there is a verified OTP record
            otp_record = OTPVerification.objects.filter(
                email=email.strip().lower(),
                phone=phone.strip(),
                is_verified=True
            ).order_by('-created_at').first()

            if not otp_record:
                raise ValidationError({"error": "Guest identity must be verified via OTP first."})

            # If verified, the user should be active immediately
            user = serializer.save(is_active=True)

            # Consume the verification record
            otp_record.is_verified = False
            otp_record.save()
        else:
            serializer.save()

    def perform_update(self, serializer):
        if self.request.user.role != 'ADMIN':
            role = serializer.instance.role
            email = serializer.validated_data.get('email', serializer.instance.email)
            phone = serializer.validated_data.get('phone', serializer.instance.phone)

            if role == 'GUEST' and (email.strip().lower() != serializer.instance.email.strip().lower() or phone.strip() != serializer.instance.phone.strip()):
                from .models import OTPVerification
                from rest_framework.exceptions import ValidationError

                otp_record = OTPVerification.objects.filter(
                    email=email.strip().lower(),
                    phone=phone.strip(),
                    is_verified=True
                ).order_by('-created_at').first()

                if not otp_record:
                    raise ValidationError({"error": "Guest identity verification required for email/phone changes."})

                otp_record.is_verified = False
                otp_record.save()

        serializer.save()

    @action(detail=False, methods=['post'], url_path='send-checkin-otp')
    def send_checkin_otp(self, request):
        email = request.data.get('email')
        phone = request.data.get('phone')

        if not email or not phone:
            return Response({"error": "Email and phone number are required."}, status=status.HTTP_400_BAD_REQUEST)

        import random
        from django.utils import timezone
        from .models import OTPVerification

        otp = f"{random.randint(100000, 999999)}"

        # Save OTPVerification
        OTPVerification.objects.update_or_create(
            email=email.strip().lower(),
            phone=phone.strip(),
            defaults={'code': otp, 'is_verified': False, 'created_at': timezone.now()}
        )

        # Send Email
        try:
            subject = "Smart Hotel Check-In Verification Code"
            message = f"""Dear Guest,

To complete your registration and room check-in, please provide the receptionist with the following verification code:

Verification Code: {otp}

This code is valid for 10 minutes.

Best regards,
Smart Hotel Management Team"""
            send_configured_mail(
                subject=subject,
                message=message,
                recipient_list=[email],
            )
            return Response({"message": f"Verification code sent to {email}."}, status=status.HTTP_200_OK)
        except EmailConfigurationError as e:
            print(f"Email configuration error while sending check-in OTP: {e}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            print(f"Failed to send check-in OTP: {e}")
            return Response({"error": f"Failed to send email: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='verify-checkin-otp')
    def verify_checkin_otp(self, request):
        email = request.data.get('email')
        phone = request.data.get('phone')
        otp = request.data.get('otp')

        if not email or not phone or not otp:
            return Response({"error": "Email, phone, and OTP code are required."}, status=status.HTTP_400_BAD_REQUEST)

        from .models import OTPVerification
        from django.utils import timezone
        from datetime import timedelta

        otp_record = OTPVerification.objects.filter(
            email=email.strip().lower(),
            phone=phone.strip(),
            code=otp.strip()
        ).order_by('-created_at').first()

        if not otp_record:
            return Response({"error": "Invalid verification code."}, status=status.HTTP_400_BAD_REQUEST)

        # Check expiry (10 minutes)
        expiry = otp_record.created_at + timedelta(minutes=10)
        if timezone.now() > expiry:
            return Response({"error": "Verification code has expired."}, status=status.HTTP_400_BAD_REQUEST)

        # Set as verified
        otp_record.is_verified = True
        otp_record.save()

        return Response({"verified": True, "message": "Email and phone verified successfully."}, status=status.HTTP_200_OK)

    def destroy(self, request, *args, **kwargs):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Only system administrators can delete user accounts.'}, status=status.HTTP_403_FORBIDDEN)
        
        user_to_delete = self.get_object()
        if request.user.id == user_to_delete.id:
            return Response({'error': 'You cannot delete your own account while logged in.'}, status=status.HTTP_400_BAD_REQUEST)
            
        return super().destroy(request, *args, **kwargs)


    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)

    # 🔴 Deactivate API (PATCH)
    @action(detail=True, methods=['patch'])
    def deactivate(self, request, pk=None):
        user = self.get_object()
        user.is_active = False
        user.save()
        return Response({'message': 'User deactivated'}, status=status.HTTP_200_OK)

    # ✉️ Bulk Marketing Campaign (POST)
    @action(detail=False, methods=['post'], url_path='marketing-campaign')
    def send_marketing_campaign(self, request):
        title = request.data.get('title')
        message = request.data.get('message')
        sender_email = request.data.get('sender_email')
        sender_app_password = request.data.get('sender_app_password')

        if not title or not message or not sender_email or not sender_app_password:
            return Response({'error': 'title, message, sender_email, and sender_app_password are required'}, status=status.HTTP_400_BAD_REQUEST)

        # Get all active guests with an email
        guests = CustomUser.objects.filter(role='GUEST', is_active=True).exclude(email='')
        emails = [g.email for g in guests]

        if not emails:
            return Response({'message': 'No active guest email addresses found.'}, status=status.HTTP_200_OK)

        try:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart

            # Create a dynamic SMTP connection using the sender's own credentials
            smtp_server = smtplib.SMTP('smtp.gmail.com', 587)
            smtp_server.ehlo()
            smtp_server.starttls()
            smtp_server.login(sender_email, sender_app_password)

            sent_count = 0
            failed_emails = []

            for recipient in emails:
                try:
                    msg = MIMEMultipart()
                    msg['From'] = f'Smart Hotel <{sender_email}>'
                    msg['To'] = recipient
                    msg['Subject'] = title
                    msg['Reply-To'] = sender_email
                    msg.attach(MIMEText(message, 'plain'))

                    smtp_server.sendmail(sender_email, recipient, msg.as_string())
                    sent_count += 1
                except Exception:
                    failed_emails.append(recipient)

            smtp_server.quit()

            if failed_emails:
                return Response({
                    'message': f'Campaign sent to {sent_count} guests. Failed for {len(failed_emails)}: {", ".join(failed_emails)}'
                }, status=status.HTTP_200_OK)

            return Response({'message': f'Campaign sent successfully from {sender_email} to {sent_count} guests!'}, status=status.HTTP_200_OK)

        except smtplib.SMTPAuthenticationError:
            return Response({
                'error': f'Authentication failed for {sender_email}. Make sure you are using a valid Gmail App Password (not your regular password). Generate one at: Google Account → Security → 2-Step Verification → App passwords.'
            }, status=status.HTTP_401_UNAUTHORIZED)
        except Exception as e:
            return Response({'error': f'Failed to dispatch campaign: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


from rest_framework_simplejwt.views import TokenObtainPairView
from django.utils import timezone
from datetime import timedelta
import random

from .throttles import BurstRateThrottle
from .serializers import CustomTokenObtainPairSerializer, UserSerializer

from rest_framework_simplejwt.tokens import RefreshToken

class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [BurstRateThrottle]

    def post(self, request, *args, **kwargs):
        username = request.data.get('username')
        password = request.data.get('password')
        otp_code = request.data.get('otp')

        if not username or not password:
            return Response({"detail": "Username and password are required."}, status=status.HTTP_400_BAD_REQUEST)

        # 1. Lookup user by username or email (case-insensitive)
        user_obj = CustomUser.objects.filter(username__iexact=str(username).strip()).first()
        if not user_obj:
            user_obj = CustomUser.objects.filter(email__iexact=str(username).strip()).first()

        if not user_obj:
            return Response({"detail": "No active account found with the given credentials"}, status=status.HTTP_401_UNAUTHORIZED)

        # 2. Authenticate credentials (password check)
        if not user_obj.check_password(password):
            return Response({"detail": "No active account found with the given credentials"}, status=status.HTTP_401_UNAUTHORIZED)

        user = user_obj

        # If user is inactive, check if it's a guest with a pending registration/login verification OTP
        if not user.is_active:
            if user.role == 'GUEST' and user.otp_code:
                pass
            else:
                return Response({"detail": "User account is deactivated."}, status=status.HTTP_400_BAD_REQUEST)

        # 3. Handle GUEST role OTP verification
        if user.role == 'GUEST':
            if otp_code:
                if not user.otp_code or user.otp_code != otp_code:
                    return Response({"detail": "Invalid OTP verification code."}, status=status.HTTP_400_BAD_REQUEST)
                
                if user.otp_created_at:
                    expiry = user.otp_created_at + timedelta(minutes=10)
                    if timezone.now() > expiry:
                        return Response({"detail": "OTP has expired. Please try logging in again."}, status=status.HTTP_400_BAD_REQUEST)
                
                user.is_active = True
                user.otp_code = None
                user.otp_created_at = None
                user.save()
            else:
                otp = f"{random.randint(100000, 999999)}"
                user.otp_code = otp
                user.otp_created_at = timezone.now()
                user.save()

                try:
                    subject = "Smart Hotel - Login Verification OTP"
                    message = f"Dear {user.name or user.username},\n\nYour verification code: {otp}\n\nValid for 5 minutes."
                    send_configured_mail(
                        subject=subject,
                        message=message,
                        recipient_list=[user.email],
                    )
                    return Response({
                        "otp_required": True,
                        "email": user.email,
                        "message": "A security verification OTP code has been sent to your registered email."
                    }, status=status.HTTP_200_OK)
                except EmailConfigurationError as e:
                    print(f"Email configuration error while sending login OTP: {e}")
                    return Response({
                        "detail": str(e)
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                except Exception as e:
                    print(f"Failed to send OTP email: {e}")
                    return Response({
                        "detail": "Failed to send verification email. Please contact reception."
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # 4. Generate SimpleJWT tokens directly (prevents serializer validation 400 errors)
        refresh = RefreshToken.for_user(user)
        refresh['role'] = user.role
        refresh['username'] = user.username
        refresh['name'] = user.name
        refresh['email'] = user.email

        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user).data
        }, status=status.HTTP_200_OK)
