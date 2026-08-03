import logging
from html import escape
from datetime import datetime

logger = logging.getLogger(__name__)

def generate_invoice_email(invoice):
    """
    Generates plain-text message and rich responsive HTML for an Invoice payment receipt.
    """
    guest = invoice.guest
    guest_name = (guest.name or guest.username or "Valued Guest").strip()
    invoice_id = f"INV-{invoice.id:04d}" if isinstance(invoice.id, int) else f"INV-{invoice.id}"
    created_date = invoice.created_at.strftime('%B %d, %Y at %I:%M %p') if invoice.created_at else datetime.now().strftime('%B %d, %Y')
    
    room_charges = float(invoice.room_charges or 0.0)
    food_charges = float(invoice.food_charges or 0.0)
    tax_amount = float(invoice.tax_amount or 0.0)
    total_amount = float(invoice.total_amount or 0.0)
    guest_type = (invoice.guest_type_at_billing or "Guest").replace('_', ' ').title()

    # Gather stay / booking info if available
    booking = invoice.booking
    booking_info_html = ""
    booking_info_text = ""
    if booking:
        room_no = booking.room.room_number if booking.room else "N/A"
        room_type = booking.room.get_room_type_display() if booking.room else "Standard"
        check_in = booking.check_in_date.strftime('%b %d, %Y') if booking.check_in_date else "N/A"
        check_out = booking.check_out_date.strftime('%b %d, %Y') if booking.check_out_date else "N/A"
        
        booking_info_text = f"Stay Details:\n- Room: Room {room_no} ({room_type})\n- Stay Duration: {check_in} to {check_out}\n\n"
        booking_info_html = f"""
        <!-- STAY DETAILS CARD -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
            <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 8px;">
                🏨 Stay Summary
            </div>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size: 14px; color: #334155;">
                <tr>
                    <td style="padding: 4px 0; font-weight: 600;">Room:</td>
                    <td align="right" style="padding: 4px 0; font-weight: 700; color: #0f172a;">Room {escape(str(room_no))} ({escape(str(room_type))})</td>
                </tr>
                <tr>
                    <td style="padding: 4px 0; font-weight: 600;">Check-in:</td>
                    <td align="right" style="padding: 4px 0; color: #475569;">{escape(str(check_in))}</td>
                </tr>
                <tr>
                    <td style="padding: 4px 0; font-weight: 600;">Check-out:</td>
                    <td align="right" style="padding: 4px 0; color: #475569;">{escape(str(check_out))}</td>
                </tr>
            </table>
        </div>
        """

    # Food & Beverage Itemized breakdown if food orders exist
    food_items_html = ""
    food_items_text = ""
    if invoice.orders.exists():
        food_item_rows = []
        food_item_text_list = []
        for order in invoice.orders.all():
            for item in order.items.filter(status='SERVED'):
                item_name = item.menu_item.name
                qty = item.quantity
                price = float(item.price_at_order)
                sub = qty * price
                food_item_rows.append(f"""
                <tr>
                    <td style="padding: 6px 18px 6px 28px; color: #64748b; font-size: 13px;">
                        ↳ {qty}x {escape(item_name)}
                    </td>
                    <td align="right" style="padding: 6px 18px; color: #475569; font-size: 13px;">
                        ${sub:.2f}
                    </td>
                </tr>
                """)
                food_item_text_list.append(f"  * {qty}x {item_name} @ ${price:.2f} = ${sub:.2f}")
        
        if food_item_rows:
            food_items_html = "".join(food_item_rows)
            food_items_text = "Food & Beverage Items:\n" + "\n".join(food_item_text_list) + "\n\n"

    # Build plain text message
    text_message = f"""Dear {guest_name},

Thank you for choosing Smart Hotel & Resort. Your payment has been successfully received and processed.

==================================================
              OFFICIAL PAYMENT RECEIPT
==================================================
Receipt Reference : {invoice_id}
Date & Time       : {created_date}
Guest Name        : {guest_name}
Billing Category  : {guest_type}
Payment Status    : PAID (Confirmed)

{booking_info_text}{food_items_text}CHARGE BREAKDOWN:
--------------------------------------------------
"""
    if room_charges > 0:
        text_message += f"Room Charges            : ${room_charges:.2f}\n"
    if food_charges > 0:
        text_message += f"Food & Beverage Charges : ${food_charges:.2f}\n"
    text_message += f"Taxes & Fees (10%)      : ${tax_amount:.2f}\n"
    text_message += f"--------------------------------------------------\n"
    text_message += f"TOTAL AMOUNT PAID       : ${total_amount:.2f}\n"
    text_message += f"==================================================\n\n"
    text_message += f"We hope your stay or dining experience was extraordinary. Please keep this email as your official digital invoice.\n\n"
    text_message += f"Warm regards,\nSmart Hotel & Resort Management\n24/7 Concierge Support | support@smarthotel.com\n"

    # Build High-End Responsive HTML Message
    html_message = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt - {escape(invoice_id)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc; -webkit-font-smoothing: antialiased;">
  
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; padding: 40px 16px;">
    <tr>
      <td align="center">
        
        <!-- MAIN CONTAINER CARD -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #1e293b; border-radius: 20px; overflow: hidden; border: 1px solid #334155; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
          
          <!-- HERO BRAND HEADER -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%); padding: 36px 32px; text-align: center; border-bottom: 1px solid rgba(99, 102, 241, 0.3);">
              <div style="display: inline-block; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(165, 180, 252, 0.3); border-radius: 999px; padding: 6px 16px; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #a5b4fc; margin-bottom: 12px;">
                ✨ Smart Hotel & Resort
              </div>
              <h1 style="margin: 8px 0 4px; font-size: 28px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">Payment Receipt</h1>
              <p style="margin: 0; font-size: 14px; color: #94a3b8;">Receipt Reference: <span style="color: #a5b4fc; font-weight: 700;">{escape(invoice_id)}</span></p>
              
              <!-- PAID BADGE -->
              <div style="margin-top: 20px; display: inline-block;">
                <span style="background: #064e3b; border: 1px solid #10b981; color: #34d399; font-size: 13px; font-weight: 700; padding: 8px 20px; border-radius: 999px; display: inline-flex; align-items: center;">
                  <span style="display: inline-block; width: 8px; height: 8px; background-color: #34d399; border-radius: 50%; margin-right: 8px;"></span>
                  PAID & CONFIRMED
                </span>
              </div>
            </td>
          </tr>
          
          <!-- BODY CONTENT -->
          <tr>
            <td style="padding: 32px; background-color: #ffffff; color: #0f172a;">
              
              <!-- GREETING -->
              <h2 style="margin: 0 0 12px; font-size: 20px; font-weight: 700; color: #0f172a;">Dear {escape(guest_name)},</h2>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #475569;">
                Thank you for choosing <strong>Smart Hotel</strong>. We have received your payment in full. Below is your detailed digital receipt for your records.
              </p>
              
              <!-- METRICS GRID TABLE -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; border-collapse: separate; border-spacing: 8px 0;">
                <tr>
                  <td width="33%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; text-align: center;">
                    <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 4px;">Billing Date</div>
                    <div style="font-size: 13px; font-weight: 700; color: #0f172a;">{escape(created_date)}</div>
                  </td>
                  <td width="33%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; text-align: center;">
                    <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 4px;">Category</div>
                    <div style="font-size: 13px; font-weight: 700; color: #6366f1;">{escape(guest_type)}</div>
                  </td>
                  <td width="33%" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; text-align: center;">
                    <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 4px;">Status</div>
                    <div style="font-size: 13px; font-weight: 700; color: #059669;">Paid</div>
                  </td>
                </tr>
              </table>
              
              {booking_info_html}
              
              <!-- CHARGES TABLE -->
              <div style="border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; margin-bottom: 28px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse; width: 100%;">
                  <thead>
                    <tr style="background-color: #f1f5f9;">
                      <th align="left" style="padding: 14px 18px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: #475569; font-weight: 700;">Description</th>
                      <th align="right" style="padding: 14px 18px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: #475569; font-weight: 700;">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    """
    
    if room_charges > 0:
        html_message += f"""
                    <tr style="border-top: 1px solid #e2e8f0;">
                      <td style="padding: 14px 18px; font-size: 14px; color: #1e293b; font-weight: 600;">
                        🏨 Room & Lodging Accommodation
                      </td>
                      <td align="right" style="padding: 14px 18px; font-size: 14px; color: #0f172a; font-weight: 700;">
                        ${room_charges:.2f}
                      </td>
                    </tr>
        """
        
    if food_charges > 0:
        html_message += f"""
                    <tr style="border-top: 1px solid #e2e8f0;">
                      <td style="padding: 14px 18px; font-size: 14px; color: #1e293b; font-weight: 600;">
                        🍽️ Food & Beverage Dining
                      </td>
                      <td align="right" style="padding: 14px 18px; font-size: 14px; color: #0f172a; font-weight: 700;">
                        ${food_charges:.2f}
                      </td>
                    </tr>
                    {food_items_html}
        """

    html_message += f"""
                    <tr style="border-top: 1px solid #e2e8f0; background-color: #fafafa;">
                      <td style="padding: 12px 18px; font-size: 14px; color: #64748b;">
                        Government Taxes & Fees (10%)
                      </td>
                      <td align="right" style="padding: 12px 18px; font-size: 14px; color: #475569; font-weight: 600;">
                        ${tax_amount:.2f}
                      </td>
                    </tr>
                    <tr style="border-top: 2px solid #0f172a; background: #f8fafc;">
                      <td style="padding: 18px; font-size: 16px; font-weight: 800; color: #0f172a;">
                        TOTAL PAID
                      </td>
                      <td align="right" style="padding: 18px; font-size: 24px; font-weight: 900; color: #4f46e5;">
                        ${total_amount:.2f}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <!-- INTERACTIVE ACTION CTA BOX -->
              <div style="background: linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%); border: 1px solid #c7d2fe; border-radius: 14px; padding: 22px; text-align: center; margin-bottom: 28px;">
                <h3 style="margin: 0 0 6px; font-size: 16px; font-weight: 700; color: #1e1b4b;">How was your experience?</h3>
                <p style="margin: 0 0 16px; font-size: 13px; color: #4338ca;">We'd love to hear your feedback on your stay or meal with us.</p>
                
                <div>
                  <a href="https://smart-hotel-frontend.onrender.com" target="_blank" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 10px 22px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.3); margin: 4px;">
                    ⭐ Rate Your Experience
                  </a>
                  <a href="https://smart-hotel-frontend.onrender.com" target="_blank" style="display: inline-block; background: #ffffff; color: #4f46e5; border: 1px solid #c7d2fe; text-decoration: none; font-size: 13px; font-weight: 700; padding: 10px 22px; border-radius: 8px; margin: 4px;">
                    🛎️ View Hotel Services
                  </a>
                </div>
              </div>
              
              <p style="margin: 0 0 8px; font-size: 13px; color: #64748b; line-height: 1.6;">
                Please retain this digital confirmation as official proof of payment. For any inquiries, feel free to reply directly to this email or reach our Concierge Desk.
              </p>
              
              <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0; font-size: 14px; font-weight: 700; color: #0f172a;">Warm regards,</p>
                <p style="margin: 2px 0 0; font-size: 14px; color: #4f46e5; font-weight: 600;">Smart Hotel & Resort Management Team</p>
              </div>

            </td>
          </tr>
          
          <!-- FOOTER -->
          <tr>
            <td style="background-color: #0f172a; padding: 24px 32px; text-align: center; color: #64748b; font-size: 12px; line-height: 1.5;">
              <p style="margin: 0 0 6px; color: #94a3b8; font-weight: 600;">Smart Hotel Hospitality Management System</p>
              <p style="margin: 0;">This email was sent to <span style="color: #cbd5e1;">{escape(guest.email or guest.username)}</span> for transaction {escape(invoice_id)}.</p>
              <p style="margin: 8px 0 0; font-size: 11px; color: #475569;">© 2026 Smart Hotel Inc. All rights reserved.</p>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>

</body>
</html>
"""

    return text_message, html_message
