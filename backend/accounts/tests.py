from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from django.core import mail
from datetime import timedelta
from django.utils import timezone

User = get_user_model()

class GuestOTPAuthTests(APITestCase):
    def setUp(self):
        # Create an admin user
        self.admin_user = User.objects.create_user(
            username='admin_test',
            email='admin@smarthotel.com',
            name='Admin User',
            phone='1234567890',
            role='ADMIN',
            password='AdminPassword123!'
        )

        # Create a guest user
        self.guest_user = User.objects.create_user(
            username='guest_test',
            email='guest@gmail.com',
            name='Guest User',
            phone='0987654321',
            role='GUEST',
            password='GuestPassword123!'
        )

        self.token_url = '/api/token/'

    def test_admin_login_bypasses_otp(self):
        """Admin and other staff users should obtain JWT tokens immediately without OTP."""
        response = self.client.post(self.token_url, {
            'username': 'admin_test',
            'password': 'AdminPassword123!'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertNotIn('otp_required', response.data)

    def test_guest_login_initiates_otp(self):
        """Guest login first step should trigger OTP generation, send email, and return otp_required."""
        response = self.client.post(self.token_url, {
            'username': 'guest_test',
            'password': 'GuestPassword123!'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('otp_required'))
        self.assertEqual(response.data.get('email'), 'guest@gmail.com')
        self.assertIn('sent to your registered email', response.data.get('message'))

        # Check that OTP is stored in database
        self.guest_user.refresh_from_db()
        self.assertIsNotNone(self.guest_user.otp_code)
        self.assertEqual(len(self.guest_user.otp_code), 6)
        self.assertTrue(self.guest_user.otp_code.isdigit())

        # Check that verification email was sent
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('Smart Hotel - Login Verification OTP', mail.outbox[0].subject)
        self.assertIn(self.guest_user.otp_code, mail.outbox[0].body)

    def test_guest_login_verifies_otp_success(self):
        """Guest providing correct OTP on second step should successfully obtain JWT tokens."""
        # Initiate login to generate OTP
        self.client.post(self.token_url, {
            'username': 'guest_test',
            'password': 'GuestPassword123!'
        })
        self.guest_user.refresh_from_db()
        otp = self.guest_user.otp_code

        # Verify correct OTP
        response = self.client.post(self.token_url, {
            'username': 'guest_test',
            'password': 'GuestPassword123!',
            'otp': otp
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

        # Check OTP cleared from database
        self.guest_user.refresh_from_db()
        self.assertIsNone(self.guest_user.otp_code)
        self.assertIsNone(self.guest_user.otp_created_at)

    def test_guest_login_fails_with_invalid_otp(self):
        """Guest providing incorrect OTP should receive 400 Bad Request."""
        # Initiate login
        self.client.post(self.token_url, {
            'username': 'guest_test',
            'password': 'GuestPassword123!'
        })

        # Verify incorrect OTP
        response = self.client.post(self.token_url, {
            'username': 'guest_test',
            'password': 'GuestPassword123!',
            'otp': '999999' # Wrong OTP
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Invalid OTP', response.data.get('detail'))

    def test_guest_login_fails_with_expired_otp(self):
        """Guest providing correct but expired OTP should receive 400 Bad Request."""
        self.client.post(self.token_url, {
            'username': 'guest_test',
            'password': 'GuestPassword123!'
        })
        self.guest_user.refresh_from_db()
        otp = self.guest_user.otp_code

        # Artificially expire OTP by setting created_at 11 minutes in the past
        self.guest_user.otp_created_at = timezone.now() - timedelta(minutes=11)
        self.guest_user.save()

        # Verify expired OTP
        response = self.client.post(self.token_url, {
            'username': 'guest_test',
            'password': 'GuestPassword123!',
            'otp': otp
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('expired', response.data.get('detail'))

    def test_guest_registration_without_otp_fails(self):
        """A guest registration without prior email/phone verification should fail with 400 Bad Request."""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post('/api/users/', {
            'username': 'unverified_guest',
            'email': 'unverified@gmail.com',
            'name': 'Unverified Guest',
            'phone': '1112223333',
            'role': 'GUEST',
            'guest_type': 'BOTH',
            'password': 'TempPassword123!'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Guest identity must be verified via OTP first', response.data.get('error', ''))

    def test_guest_registration_with_otp_success(self):
        """A guest registration with prior email/phone verification should succeed and the account should be active immediately."""
        self.client.force_authenticate(user=self.admin_user)
        # 1. Trigger OTP send
        response = self.client.post('/api/users/send-checkin-otp/', {
            'email': 'newguest@gmail.com',
            'phone': '5551234'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Retrieve OTP code from database
        from accounts.models import OTPVerification
        otp_record = OTPVerification.objects.filter(email='newguest@gmail.com', phone='5551234').first()
        self.assertIsNotNone(otp_record)
        self.assertFalse(otp_record.is_verified)

        # 2. Verify OTP
        response = self.client.post('/api/users/verify-checkin-otp/', {
            'email': 'newguest@gmail.com',
            'phone': '5551234',
            'otp': otp_record.code
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get('verified'))

        # 3. Register user
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post('/api/users/', {
            'username': 'new_guest_1',
            'email': 'newguest@gmail.com',
            'name': 'New Guest Name',
            'phone': '5551234',
            'role': 'GUEST',
            'guest_type': 'BOTH',
            'password': 'NewGuestPassword123!'
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        # 4. Verify account is active and OTP record consumed
        user_id = response.data.get('id')
        new_user = User.objects.get(id=user_id)
        self.assertTrue(new_user.is_active)

        otp_record.refresh_from_db()
        self.assertFalse(otp_record.is_verified)


class GuestOTPThrottleTests(APITestCase):
    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        self.token_url = '/api/token/'
        self.guest_user = User.objects.create_user(
            username='throttle_guest',
            email='throttle@gmail.com',
            name='Throttle Guest',
            phone='9999999999',
            role='GUEST',
            password='Password123!'
        )

    def test_burst_rate_throttle_on_login(self):
        """Requesting login more than 10 times in a minute should trigger 429 Too Many Requests."""
        for i in range(10):
            response = self.client.post(self.token_url, {
                'username': 'throttle_guest',
                'password': 'WrongPassword!'
            })
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # 11th request should exceed the limit and return 429
        response = self.client.post(self.token_url, {
            'username': 'throttle_guest',
            'password': 'WrongPassword!'
        })
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
        self.assertIn('Request was throttled', response.data.get('detail', ''))

