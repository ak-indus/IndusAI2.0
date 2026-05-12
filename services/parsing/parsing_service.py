import asyncio
import json
import os
import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from services.parsing.extractors import (
    extract_text_from_attachment,
    extract_text_from_html,
)

EXTRACTION_SYSTEM_PROMPT = """You are a document parsing assistant for an MRO (Maintenance, Repair, Operations) industrial distributor.
Extract structured data from the following document (which may be a purchase order, RFQ, inquiry, or return request).

Return ONLY valid JSON matching this exact schema:
{
  "document_type": "purchase_order" | "rfq" | "inquiry" | "return_request" | "general",
  "po_number": "string or null",
  "customer_name": "string or null",
  "customer_email": "string or null",
  "customer_phone": "string or null",
  "required_date": "YYYY-MM-DD or null",
  "shipping_address": "full address string or null",
  "billing_address": "full address string or null",
  "line_items": [
    {
      "description": "product description",
      "part_number": "manufacturer part number or SKU if found",
      "manufacturer": "manufacturer name if found",
      "quantity": number,
      "unit": "EA|BOX|CS|PK|FT|LB|GAL|etc",
      "requested_price": number or null
    }
  ],
  "special_instructions": "string or null",
  "payment_terms": "NET30|NET60|etc or null"
}

Rules:
- Extract ALL line items, even if formatting is inconsistent
- For quantities like "5 boxes of 12", calculate total units (60) and set unit to "EA"
- Part numbers may appear as SKU, P/N, Part#, Item#, Cat#, or similar
- If the document is not a recognizable business document, set document_type to "general"
- Return null for any field you cannot confidently extract
- Do NOT invent or guess data that is not in the document"""


class ParsingService:
    def __init__(self, db_manager, ai_service, product_service,
                 customer_service, pricing_service, logger):
        self.db = db_manager
        self.ai = ai_service
        self.product_service = product_service
        self.customer_service = customer_service
        self.pricing_service = pricing_service
        self.logger = logger
        self.storage_path = os.environ.get("ATTACHMENT_STORAGE_PATH", "/data/attachments")

    # ------------------------------------------------------------------
    # Ingest
    # ------------------------------------------------------------------

    async def ingest_message(
        self,
        channel: str,
        sender_id: str,
        sender_name: Optional[str] = None,
        subject: Optional[str] = None,
        body: str = "",
        html_body: Optional[str] = None,
        attachments_data: Optional[List[Dict]] = None,
    ) -> Optional[Dict[str, Any]]:
        if not self.db.pool:
            return None
        attachments_data = attachments_data or []
        try:
            async with self.db.pool.acquire() as conn:
                msg_id = await conn.fetchval(
                    """INSERT INTO inbound_messages
                       (channel, sender_id, sender_name, subject, body, html_body,
                        has_attachments, attachment_count, status, received_at)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'received',NOW())
                       RETURNING id""",
                    channel, sender_id, sender_name, subject,
                    body or "", html_body,
                    len(attachments_data) > 0, len(attachments_data),
                )

            stored_attachments = await self._store_attachments(str(msg_id), attachments_data)

            raw_parts = []
            if body:
                raw_parts.append(body)
            if html_body and not body:
                raw_parts.append(extract_text_from_html(html_body))
            for att in stored_attachments:
                if att.get("extracted_text"):
                    raw_parts.append(att["extracted_text"])

            raw_text = "\n\n---\n\n".join(raw_parts)

            doc = await self._parse_and_store(str(msg_id), raw_text)
            return doc

        except Exception as e:
            self.logger.error(f"Ingest failed: {e}")
            return {"error": str(e)}

    async def _store_attachments(self, message_id: str, attachments_data: List[Dict]) -> List[Dict]:
        results = []
        msg_dir = os.path.join(self.storage_path, message_id)
        os.makedirs(msg_dir, exist_ok=True)

        for att in attachments_data:
            filename = att.get("filename", "unknown")
            content_type = att.get("content_type", "application/octet-stream")
            file_content = att.get("content", b"")

            file_path = os.path.join(msg_dir, filename)
            with open(file_path, "wb") as f:
                if isinstance(file_content, str):
                    f.write(file_content.encode())
                else:
                    f.write(file_content)

            extracted_text, method = await asyncio.to_thread(
                extract_text_from_attachment, file_path, content_type
            )

            if self.db.pool:
                async with self.db.pool.acquire() as conn:
                    att_id = await conn.fetchval(
                        """INSERT INTO attachments
                           (inbound_message_id, filename, content_type, size_bytes,
                            storage_path, extracted_text, extraction_method)
                           VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id""",
                        uuid.UUID(message_id), filename, content_type,
                        len(file_content), file_path, extracted_text, method,
                    )

            results.append({
                "id": str(att_id) if self.db.pool else None,
                "filename": filename,
                "extracted_text": extracted_text,
                "method": method,
            })
        return results

    # ------------------------------------------------------------------
    # Parse
    # ------------------------------------------------------------------

    async def _parse_and_store(self, message_id: str, raw_text: str) -> Optional[Dict]:
        async with self.db.pool.acquire() as conn:
            await conn.execute(
                "UPDATE inbound_messages SET status='parsing' WHERE id=$1",
                uuid.UUID(message_id),
            )

        parsed_data = await self._claude_extract(raw_text)
        parsed_data = await self._resolve_entities(parsed_data)
        confidence, needs_review, reasons = self._score_confidence(parsed_data)

        try:
            async with self.db.pool.acquire() as conn:
                doc_id = await conn.fetchval(
                    """INSERT INTO parsed_documents
                       (inbound_message_id, document_type, parsed_data,
                        overall_confidence, needs_review, review_reasons,
                        status, raw_text)
                       VALUES ($1,$2,$3,$4,$5,$6,'pending_review',$7)
                       RETURNING id""",
                    uuid.UUID(message_id),
                    parsed_data.get("document_type", "general"),
                    json.dumps(parsed_data),
                    confidence,
                    needs_review,
                    reasons,
                    raw_text,
                )

                await conn.execute(
                    "UPDATE inbound_messages SET status='parsed' WHERE id=$1",
                    uuid.UUID(message_id),
                )

            return await self.get_parsed_document(str(doc_id))
        except Exception as e:
            self.logger.error(f"Parse store failed: {e}")
            return {"error": str(e)}

    async def _claude_extract(self, text: str) -> Dict[str, Any]:
        if not self.ai.client:
            self.logger.warning("AI client not available, returning empty extraction")
            return {"document_type": "general", "line_items": []}

        if not self.ai.circuit_breaker.can_execute():
            self.logger.warning("AI circuit breaker open, returning empty extraction")
            return {"document_type": "general", "line_items": []}

        model = getattr(self.ai.settings, 'ai_model', 'claude-sonnet-4-20250514')
        max_retries = 3
        retry_delay = 1.0
        truncated = text[:15000] if len(text) > 15000 else text

        for attempt in range(max_retries):
            try:
                message = await self.ai.client.messages.create(
                    model=model,
                    max_tokens=2000,
                    temperature=0.1,
                    system=EXTRACTION_SYSTEM_PROMPT,
                    messages=[{"role": "user", "content": f"Document text:\n\n{truncated}"}],
                )
                raw = message.content[0].text.strip()
                if raw.startswith("```"):
                    raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
                    raw = raw.rsplit("```", 1)[0]
                parsed = json.loads(raw)
                self.ai.circuit_breaker.record_success()
                return parsed

            except json.JSONDecodeError as e:
                self.logger.error(f"Claude returned invalid JSON (attempt {attempt+1}): {e}")
            except Exception as e:
                self.logger.error(f"Claude extraction failed (attempt {attempt+1}): {e}")

            if attempt < max_retries - 1:
                await asyncio.sleep(retry_delay * (2 ** attempt))

        self.ai.circuit_breaker.record_failure()
        return {"document_type": "general", "line_items": []}

    # ------------------------------------------------------------------
    # Entity Resolution
    # ------------------------------------------------------------------

    async def _resolve_entities(self, parsed_data: Dict[str, Any]) -> Dict[str, Any]:
        await self._resolve_customer(parsed_data)
        await self._resolve_line_items(parsed_data)
        return parsed_data

    async def _resolve_customer(self, parsed_data: Dict) -> None:
        email = parsed_data.get("customer_email")
        phone = parsed_data.get("customer_phone")
        name = parsed_data.get("customer_name")

        resolved_id = None
        confidence = 0.0

        if not self.db.pool:
            parsed_data["_customer_resolved"] = False
            parsed_data["_customer_confidence"] = 0.0
            return

        async with self.db.pool.acquire() as conn:
            if email:
                row = await conn.fetchrow(
                    "SELECT id, name, company FROM customers WHERE email=$1 AND is_active=TRUE", email
                )
                if row:
                    resolved_id = str(row["id"])
                    confidence = 1.0

            if not resolved_id and phone:
                row = await conn.fetchrow(
                    "SELECT id, name, company FROM customers WHERE phone=$1 AND is_active=TRUE", phone
                )
                if row:
                    resolved_id = str(row["id"])
                    confidence = 0.9

            if not resolved_id and name:
                row = await conn.fetchrow(
                    "SELECT id, name, company FROM customers WHERE "
                    "(name ILIKE $1 OR company ILIKE $1) AND is_active=TRUE",
                    f"%{name}%",
                )
                if row:
                    resolved_id = str(row["id"])
                    confidence = 0.7

        parsed_data["_customer_resolved_id"] = resolved_id
        parsed_data["_customer_resolved"] = resolved_id is not None
        parsed_data["_customer_confidence"] = confidence

    async def _resolve_line_items(self, parsed_data: Dict) -> None:
        items = parsed_data.get("line_items", [])
        if not items or not self.db.pool:
            return

        resolved_customer_id = parsed_data.get("_customer_resolved_id")

        for item in items:
            part = item.get("part_number", "")
            desc = item.get("description", "")
            mfr = item.get("manufacturer", "")

            product = None
            match_conf = 0.0

            async with self.db.pool.acquire() as conn:
                if part:
                    row = await conn.fetchrow(
                        "SELECT id, sku, name FROM products WHERE "
                        "(sku=$1 OR manufacturer_part_number=$1) AND is_active=TRUE",
                        part,
                    )
                    if row:
                        product = dict(row)
                        match_conf = 1.0

                if not product and part:
                    row = await conn.fetchrow(
                        "SELECT p.id, p.sku, p.name FROM product_cross_references cr "
                        "JOIN products p ON p.id=cr.product_id "
                        "WHERE cr.cross_ref_sku=$1 AND p.is_active=TRUE",
                        part,
                    )
                    if row:
                        product = dict(row)
                        match_conf = 0.85

                if not product and desc:
                    keywords = [w for w in desc.split() if len(w) > 2][:5]
                    if keywords:
                        pattern = "%".join(keywords)
                        row = await conn.fetchrow(
                            "SELECT id, sku, name FROM products WHERE "
                            "name ILIKE $1 AND is_active=TRUE LIMIT 1",
                            f"%{pattern}%",
                        )
                        if row:
                            product = dict(row)
                            match_conf = 0.6

                if not product and mfr and desc:
                    row = await conn.fetchrow(
                        "SELECT id, sku, name FROM products WHERE "
                        "manufacturer ILIKE $1 AND name ILIKE $2 AND is_active=TRUE LIMIT 1",
                        f"%{mfr}%", f"%{desc[:30]}%",
                    )
                    if row:
                        product = dict(row)
                        match_conf = 0.65

            if product:
                item["resolved_product_id"] = str(product["id"])
                item["resolved_sku"] = product["sku"]
                item["match_confidence"] = match_conf

                inv = await self._check_stock(str(product["id"]))
                item["in_stock"] = inv.get("available", 0) > 0 if inv else None

                if resolved_customer_id:
                    price = await self._get_price(str(product["id"]), resolved_customer_id, item.get("quantity", 1))
                    if price:
                        item["resolved_unit_price"] = price
            else:
                item["resolved_product_id"] = None
                item["resolved_sku"] = None
                item["match_confidence"] = 0.0
                item["in_stock"] = None

    async def _check_stock(self, product_id: str) -> Optional[Dict]:
        try:
            stock = await self.product_service.db.pool.acquire()
            try:
                row = await stock.fetchrow(
                    "SELECT quantity_on_hand, quantity_reserved FROM inventory "
                    "WHERE product_id=$1 AND warehouse_code='MAIN'",
                    uuid.UUID(product_id),
                )
                if row:
                    return {"available": float(row["quantity_on_hand"]) - float(row["quantity_reserved"])}
            finally:
                await self.product_service.db.pool.release(stock)
        except Exception:
            pass
        return None

    async def _get_price(self, product_id: str, customer_id: str, qty: float) -> Optional[float]:
        try:
            result = await self.pricing_service.get_price(product_id, customer_id, qty)
            if result and "customer_price" in result:
                return float(result["customer_price"])
        except Exception:
            pass
        return None

    # ------------------------------------------------------------------
    # Confidence Scoring
    # ------------------------------------------------------------------

    def _score_confidence(self, parsed_data: Dict) -> Tuple[float, bool, List[str]]:
        reasons = []
        scores = []

        customer_conf = parsed_data.get("_customer_confidence", 0.0)
        if customer_conf == 0:
            reasons.append("Customer not found in system")
        elif customer_conf < 0.9:
            reasons.append("Customer matched by name only (low confidence)")
        scores.append(customer_conf)

        items = parsed_data.get("line_items", [])
        if not items:
            reasons.append("No line items extracted")
            scores.append(0.0)
        else:
            for i, item in enumerate(items):
                mc = item.get("match_confidence", 0.0)
                if mc == 0:
                    reasons.append(f"Line {i+1}: product not matched ({item.get('description', 'unknown')[:40]})")
                elif mc < 0.8:
                    reasons.append(f"Line {i+1}: fuzzy match only ({item.get('description', 'unknown')[:40]})")
                scores.append(mc)

        doc_type = parsed_data.get("document_type", "general")
        if doc_type == "general":
            reasons.append("Document type unclear")
            scores.append(0.3)
        else:
            scores.append(1.0)

        overall = min(scores) if scores else 0.0
        needs_review = True
        return overall, needs_review, reasons

    # ------------------------------------------------------------------
    # Read / Query
    # ------------------------------------------------------------------

    async def get_parsed_document(self, doc_id: str) -> Optional[Dict[str, Any]]:
        if not self.db.pool:
            return None
        try:
            async with self.db.pool.acquire() as conn:
                row = await conn.fetchrow(
                    """SELECT pd.*, im.channel, im.sender_id, im.sender_name,
                              im.subject, im.body as original_body, im.html_body,
                              im.received_at
                       FROM parsed_documents pd
                       JOIN inbound_messages im ON im.id = pd.inbound_message_id
                       WHERE pd.id = $1""",
                    uuid.UUID(doc_id),
                )
                if not row:
                    return None

                atts = await conn.fetch(
                    "SELECT id, filename, content_type, size_bytes FROM attachments WHERE inbound_message_id=$1",
                    row["inbound_message_id"],
                )

                parsed_data = json.loads(row["parsed_data"]) if isinstance(row["parsed_data"], str) else row["parsed_data"]

                return {
                    "id": str(row["id"]),
                    "inbound_message_id": str(row["inbound_message_id"]),
                    "document_type": row["document_type"],
                    "parsed_data": parsed_data,
                    "overall_confidence": float(row["overall_confidence"]) if row["overall_confidence"] else 0,
                    "needs_review": row["needs_review"],
                    "review_reasons": list(row["review_reasons"]) if row["review_reasons"] else [],
                    "status": row["status"],
                    "assigned_to": row["assigned_to"],
                    "reviewed_by": row["reviewed_by"],
                    "reviewed_at": row["reviewed_at"].isoformat() if row["reviewed_at"] else None,
                    "review_edits": row["review_edits"],
                    "result_order_id": str(row["result_order_id"]) if row["result_order_id"] else None,
                    "result_quote_id": str(row["result_quote_id"]) if row["result_quote_id"] else None,
                    "raw_text": row["raw_text"],
                    "channel": row["channel"],
                    "sender_id": row["sender_id"],
                    "sender_name": row["sender_name"],
                    "subject": row["subject"],
                    "original_body": row["original_body"],
                    "html_body": row["html_body"],
                    "received_at": row["received_at"].isoformat() if row["received_at"] else None,
                    "created_at": row["created_at"].isoformat() if row["created_at"] else None,
                    "attachments": [
                        {
                            "id": str(a["id"]),
                            "filename": a["filename"],
                            "content_type": a["content_type"],
                            "size_bytes": a["size_bytes"],
                        }
                        for a in atts
                    ],
                }
        except Exception as e:
            self.logger.error(f"Get parsed document failed: {e}")
            return None

    async def list_review_queue(
        self,
        status: Optional[str] = None,
        assigned_to: Optional[str] = None,
        page: int = 1,
        page_size: int = 25,
    ) -> Tuple[List[Dict], int]:
        if not self.db.pool:
            return [], 0
        try:
            conditions = []
            params: list = []
            idx = 1

            if status:
                conditions.append(f"pd.status = ${idx}")
                params.append(status)
                idx += 1
            if assigned_to:
                conditions.append(f"pd.assigned_to = ${idx}")
                params.append(assigned_to)
                idx += 1

            where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
            offset = (page - 1) * page_size

            async with self.db.pool.acquire() as conn:
                total = await conn.fetchval(
                    f"SELECT COUNT(*) FROM parsed_documents pd {where}", *params
                )

                rows = await conn.fetch(
                    f"""SELECT pd.id, pd.inbound_message_id, pd.document_type,
                               pd.overall_confidence, pd.needs_review, pd.review_reasons,
                               pd.status, pd.assigned_to, pd.created_at, pd.parsed_data,
                               im.channel, im.sender_id, im.sender_name, im.subject,
                               c.name as customer_name, pd.result_order_id
                        FROM parsed_documents pd
                        JOIN inbound_messages im ON im.id = pd.inbound_message_id
                        LEFT JOIN customers c ON c.id = im.resolved_customer_id
                        {where}
                        ORDER BY pd.created_at DESC
                        LIMIT ${idx} OFFSET ${idx+1}""",
                    *params, page_size, offset,
                )

                items = []
                for r in rows:
                    pd_data = json.loads(r["parsed_data"]) if isinstance(r["parsed_data"], str) else r["parsed_data"]
                    items.append({
                        "id": str(r["id"]),
                        "inbound_message_id": str(r["inbound_message_id"]),
                        "document_type": r["document_type"],
                        "channel": r["channel"],
                        "sender_id": r["sender_id"],
                        "sender_name": r["sender_name"],
                        "subject": r["subject"],
                        "customer_name": r["customer_name"] or pd_data.get("customer_name"),
                        "overall_confidence": float(r["overall_confidence"]) if r["overall_confidence"] else 0,
                        "needs_review": r["needs_review"],
                        "review_reasons": list(r["review_reasons"]) if r["review_reasons"] else [],
                        "status": r["status"],
                        "assigned_to": r["assigned_to"],
                        "line_item_count": len(pd_data.get("line_items", [])),
                        "result_order_id": str(r["result_order_id"]) if r["result_order_id"] else None,
                        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                    })
                return items, total
        except Exception as e:
            self.logger.error(f"List review queue failed: {e}")
            return [], 0

    # ------------------------------------------------------------------
    # Approve / Reject / Assign
    # ------------------------------------------------------------------

    async def approve_document(self, doc_id: str, reviewed_by: str,
                               edits: Optional[Dict] = None) -> Optional[Dict]:
        if not self.db.pool:
            return None
        try:
            doc = await self.get_parsed_document(doc_id)
            if not doc:
                return {"error": "Document not found"}
            if doc["status"] not in ("pending_review", "in_review"):
                return {"error": f"Document status '{doc['status']}' cannot be approved"}

            parsed_data = doc["parsed_data"]
            if edits:
                parsed_data = self._merge_edits(parsed_data, edits)

            order = await self._create_order_from_parsed(parsed_data)
            if not order or order.get("error"):
                return {"error": order.get("error", "Order creation failed")}

            async with self.db.pool.acquire() as conn:
                await conn.execute(
                    """UPDATE parsed_documents
                       SET status='processed', reviewed_by=$1, reviewed_at=NOW(),
                           review_edits=$2, result_order_id=$3, parsed_data=$4,
                           updated_at=NOW()
                       WHERE id=$5""",
                    reviewed_by,
                    json.dumps(edits) if edits else None,
                    uuid.UUID(order["id"]),
                    json.dumps(parsed_data),
                    uuid.UUID(doc_id),
                )

            return {"status": "processed", "order": order}
        except Exception as e:
            self.logger.error(f"Approve failed: {e}")
            return {"error": str(e)}

    async def reject_document(self, doc_id: str, reviewed_by: str,
                              reason: str) -> Optional[Dict]:
        if not self.db.pool:
            return None
        try:
            async with self.db.pool.acquire() as conn:
                result = await conn.execute(
                    """UPDATE parsed_documents
                       SET status='rejected', reviewed_by=$1, reviewed_at=NOW(),
                           review_edits=$2, updated_at=NOW()
                       WHERE id=$3 AND status IN ('pending_review','in_review')""",
                    reviewed_by, json.dumps({"rejection_reason": reason}),
                    uuid.UUID(doc_id),
                )
                if "UPDATE 0" in result:
                    return {"error": "Document not found or already processed"}
            return {"status": "rejected", "reason": reason}
        except Exception as e:
            self.logger.error(f"Reject failed: {e}")
            return {"error": str(e)}

    async def assign_document(self, doc_id: str, assigned_to: str) -> Optional[Dict]:
        if not self.db.pool:
            return None
        try:
            async with self.db.pool.acquire() as conn:
                result = await conn.execute(
                    """UPDATE parsed_documents
                       SET assigned_to=$1, status='in_review', updated_at=NOW()
                       WHERE id=$2 AND status IN ('pending_review','in_review')""",
                    assigned_to, uuid.UUID(doc_id),
                )
                if "UPDATE 0" in result:
                    return {"error": "Document not found or already processed"}
            return {"status": "in_review", "assigned_to": assigned_to}
        except Exception as e:
            self.logger.error(f"Assign failed: {e}")
            return {"error": str(e)}

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _merge_edits(self, parsed_data: Dict, edits: Dict) -> Dict:
        merged = dict(parsed_data)
        for key, value in edits.items():
            if key == "line_items" and isinstance(value, list):
                merged["line_items"] = value
            else:
                merged[key] = value
        return merged

    async def _create_order_from_parsed(self, parsed_data: Dict) -> Optional[Dict]:
        from models.domain import OrderCreate, OrderLineCreate

        customer_id = parsed_data.get("_customer_resolved_id")
        if not customer_id:
            return {"error": "No customer resolved — cannot create order"}

        lines = []
        for item in parsed_data.get("line_items", []):
            product_id = item.get("resolved_product_id")
            if not product_id:
                continue
            lines.append(OrderLineCreate(
                product_id=product_id,
                quantity=Decimal(str(item.get("quantity", 1))),
                unit_price=Decimal(str(item["resolved_unit_price"])) if item.get("resolved_unit_price") else None,
                discount_percent=Decimal("0"),
            ))

        if not lines:
            return {"error": "No resolved line items — cannot create order"}

        from services.platform.order_service import OrderService
        order_data = OrderCreate(
            customer_id=customer_id,
            po_number=parsed_data.get("po_number"),
            required_date=None,
            ship_to_address=parsed_data.get("shipping_address"),
            bill_to_address=parsed_data.get("billing_address"),
            notes=parsed_data.get("special_instructions"),
            lines=lines,
        )

        from routes.platform import _svc
        order_service = _svc("order_service")
        return await order_service.create_order(order_data.model_dump())
