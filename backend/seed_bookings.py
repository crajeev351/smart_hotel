"""
seed_bookings.py — DISABLED

Demo bookings are no longer auto-created on startup.
Bookings are transient business data that should be created through the
Reception panel UI, not re-seeded on every deploy/restart.

Previously, this script created 3 demo BOOKED entries on every startup
(whenever the bookings table was empty), causing:
  1. AutoUpdateBookingStatusMiddleware to auto-check-in those bookings
  2. 3 rooms to revert to OCCUPIED on every restart
  3. Cloud sync to propagate stale data back to local

To seed test bookings manually, use the Reception panel or Django admin.
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

print("seed_bookings.py: Skipped. Demo bookings are no longer auto-created on startup.")

