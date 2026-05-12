import asyncio
from typing import Any, Dict, Optional

import httpx

from metrics.metrics import ERROR_COUNTER


class EmailSender:
    def __init__(self, settings, logger):
        self.settings = settings
        self.logger = logger
        self.client = httpx.AsyncClient(timeout=30.0)
        self.api_key = getattr(settings, "sendgrid_api_key", None)

    async def send(
        self,
        to_email: str,
        subject: str,
        text_body: str,
        html_body: Optional[str] = None,
        from_email: Optional[str] = None,
    ) -> bool:
        if not self.api_key:
            self.logger.warning("SendGrid API key not configured, skipping email send")
            return True

        sender = from_email or getattr(self.settings, "support_email", "noreply@mroplatform.com")

        payload: Dict[str, Any] = {
            "personalizations": [{"to": [{"email": to_email}]}],
            "from": {"email": sender},
            "subject": subject,
            "content": [{"type": "text/plain", "value": text_body}],
        }
        if html_body:
            payload["content"].append({"type": "text/html", "value": html_body})

        max_retries = 3
        retry_delay = 1.0

        for attempt in range(max_retries):
            try:
                resp = await self.client.post(
                    "https://api.sendgrid.com/v3/mail/send",
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                )
                if resp.status_code in (200, 201, 202):
                    self.logger.info(f"Email sent to {to_email}: {subject}")
                    return True

                if resp.status_code == 429:
                    retry_delay *= 2
                elif resp.status_code < 500:
                    self.logger.error(f"SendGrid client error {resp.status_code}: {resp.text}")
                    break

            except Exception as e:
                self.logger.error(f"Email send failed (attempt {attempt+1}): {e}")

            if attempt < max_retries - 1:
                await asyncio.sleep(retry_delay * (2 ** attempt))

        ERROR_COUNTER.labels(error_type="email_send").inc()
        return False

    async def send_order_confirmation(self, to_email: str, order_data: Dict) -> bool:
        order_num = order_data.get("order_number", "N/A")
        total = order_data.get("total_amount", 0)
        lines = order_data.get("lines", [])

        line_text = "\n".join(
            f"  - {l.get('sku', 'N/A')}: {l.get('description', '')} x{l.get('quantity', 0)} @ ${l.get('unit_price', 0):.2f}"
            for l in lines
        )

        text = (
            f"Your order {order_num} has been received and confirmed.\n\n"
            f"Order Total: ${total:,.2f}\n\n"
            f"Items:\n{line_text}\n\n"
            "We will notify you when your order ships.\n\n"
            "Thank you for your business."
        )

        return await self.send(
            to_email=to_email,
            subject=f"Order Confirmation - {order_num}",
            text_body=text,
        )

    async def send_rejection_notice(self, to_email: str, reason: str) -> bool:
        text = (
            "Thank you for your inquiry. Unfortunately, we were unable to process "
            "your request at this time.\n\n"
            f"Reason: {reason}\n\n"
            "Please contact our team for assistance."
        )

        return await self.send(
            to_email=to_email,
            subject="Order Request Update",
            text_body=text,
        )

    async def close(self):
        await self.client.aclose()
