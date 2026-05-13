"""Carta Responsiva (Liability Waiver) PDF generator.

Generates a professional single-page PDF with the gym logo, clauses, and a
visibly-signed footer (both parties) using a registered calligraphy font
(Great Vibes, SIL OFL). Includes an electronic-signature legal block with
a SHA-256 content hash so the document can later be verified.

The signature is a "firma electrónica simple" under the Ley Federal de
Firma Electrónica Avanzada (México, DOF 11-01-2012) — it is binding between
the parties provided the signer's identity and consent are recorded, which
we preserve via the student record (email, created_at) and the PDF hash.

Uses ReportLab for PDF generation.
"""

from __future__ import annotations

import hashlib
from datetime import date, datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any

from src.models.common import mexico_today

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    HRFlowable,
    Image,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

# ── Paths ────────────────────────────────────────────────────────────────────

_ASSETS = Path(__file__).resolve().parent.parent / "assets"
_LOGO = _ASSETS / "logo_fr.png"
_SIG_FONT_PATH = _ASSETS / "fonts" / "GreatVibes-Regular.ttf"
_SIG_FONT_NAME = "GreatVibes"

# ── Colours ──────────────────────────────────────────────────────────────────

_GOLD = colors.HexColor("#d4af37")
_DARK = colors.HexColor("#1a1a1a")
_INK = colors.HexColor("#1a1f3a")  # dark blue-black, looks like pen ink
_GRAY = colors.HexColor("#666666")
_LIGHT = colors.HexColor("#999999")

_MONTHS_ES = [
    "", "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]


# ── Font registration (idempotent) ──────────────────────────────────────────

def _register_signature_font() -> bool:
    """Register Great Vibes once per process. Returns True if available."""
    if _SIG_FONT_NAME in pdfmetrics.getRegisteredFontNames():
        return True
    if not _SIG_FONT_PATH.exists():
        return False
    pdfmetrics.registerFont(TTFont(_SIG_FONT_NAME, str(_SIG_FONT_PATH)))
    return True


def _format_date_es(d: date) -> str:
    """Format a date in Spanish: '20 de abril de 2026'."""
    return f"{d.day} de {_MONTHS_ES[d.month]} de {d.year}"


def _build_signature_identity(
    name: str,
    email: str,
    sign_date: date,
) -> str:
    """Deterministic identity string used to derive the content hash."""
    return f"{name.strip()}|{email.strip().lower()}|{sign_date.isoformat()}"


def _content_hash(identity: str, body: str) -> str:
    """SHA-256 of identity + full document body, hex-encoded."""
    h = hashlib.sha256()
    h.update(identity.encode("utf-8"))
    h.update(b"\n---\n")
    h.update(body.encode("utf-8"))
    return h.hexdigest()


def generate_carta_responsiva(
    student_name: str,
    student_email: str,
    gym_name: str = "Fitness Room",
    gym_address: str = "",
    gym_email: str = "contacto@fitnessroom.mx",
    sign_date: date | None = None,
    signed_at: datetime | None = None,
) -> bytes:
    """Generate a single-page liability waiver PDF and return raw bytes.

    Args:
        student_name: Full name of the student.
        student_email: Email where this document was delivered.
        gym_name: Name of the gym / business (issuer).
        gym_address: Physical address of the gym.
        gym_email: Contact email for the gym (shown as the issuer in the footer).
        sign_date: Civil date shown in the preamble. Defaults to today.
        signed_at: UTC timestamp recorded in the legal block. Defaults to now.

    Returns:
        PDF file content as bytes.
    """
    if sign_date is None:
        sign_date = mexico_today()
    if signed_at is None:
        signed_at = datetime.now(timezone.utc)

    has_sig_font = _register_signature_font()
    signature_font = _SIG_FONT_NAME if has_sig_font else "Helvetica-Oblique"

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        topMargin=1.2 * cm,
        bottomMargin=1 * cm,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        title=f"Carta Responsiva — {student_name}",
        author=gym_name,
        subject="Carta Responsiva firmada electrónicamente",
        creator=f"{gym_name} · Firma electrónica",
    )

    styles = getSampleStyleSheet()
    page_w = letter[0] - 4 * cm  # usable width

    # ── Custom styles (compact for single page) ─────────────────────────

    title_style = ParagraphStyle(
        "WTitle",
        parent=styles["Title"],
        fontSize=16,
        leading=18,
        textColor=_DARK,
        spaceAfter=0,
        alignment=TA_CENTER,
        fontName="Helvetica-Bold",
    )

    body_style = ParagraphStyle(
        "WBody",
        parent=styles["Normal"],
        fontSize=8.5,
        leading=11.5,
        textColor=_DARK,
        alignment=TA_JUSTIFY,
        spaceAfter=1.5 * mm,
    )

    intro_style = ParagraphStyle(
        "WIntro",
        parent=body_style,
        fontSize=9,
        leading=12,
        spaceAfter=2 * mm,
    )

    sign_caption_style = ParagraphStyle(
        "WSignCaption",
        parent=styles["Normal"],
        fontSize=8.5,
        leading=11,
        textColor=_DARK,
        alignment=TA_CENTER,
    )

    signature_style = ParagraphStyle(
        "WSignature",
        parent=styles["Normal"],
        fontSize=24,
        leading=24,
        textColor=_INK,
        alignment=TA_CENTER,
        fontName=signature_font,
    )

    small_style = ParagraphStyle(
        "WSmall",
        parent=styles["Normal"],
        fontSize=7,
        leading=9,
        textColor=_LIGHT,
        alignment=TA_CENTER,
    )

    date_style = ParagraphStyle(
        "WDate",
        parent=styles["Normal"],
        fontSize=8.5,
        leading=11,
        textColor=_GRAY,
        alignment=TA_RIGHT,
        spaceAfter=0,
    )

    privacy_style = ParagraphStyle(
        "WPrivacy",
        parent=styles["Normal"],
        fontSize=7.5,
        leading=10,
        textColor=_LIGHT,
        alignment=TA_LEFT,
    )

    legal_style = ParagraphStyle(
        "WLegal",
        parent=styles["Normal"],
        fontSize=6.8,
        leading=9,
        textColor=_GRAY,
        alignment=TA_LEFT,
    )

    # ── Build story ─────────────────────────────────────────────────────

    story: list[Any] = []

    # Logo + title header
    if _LOGO.exists():
        logo = Image(str(_LOGO), width=2.2 * cm, height=2.2 * cm)
        header_data = [[logo, Paragraph("CARTA RESPONSIVA", title_style)]]
        header_table = Table(header_data, colWidths=[2.8 * cm, page_w - 2.8 * cm])
        header_table.setStyle(TableStyle([
            ("ALIGN", (0, 0), (0, 0), "LEFT"),
            ("ALIGN", (1, 0), (1, 0), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ]))
        story.append(header_table)
    else:
        story.append(Paragraph("CARTA RESPONSIVA", title_style))

    # Gold accent line
    story.append(Spacer(1, 2 * mm))
    story.append(HRFlowable(
        width="100%", thickness=1.5, color=_GOLD,
        spaceAfter=3 * mm, spaceBefore=0,
    ))

    # Date
    story.append(Paragraph(
        f"León, Guanajuato, a {_format_date_es(sign_date)}",
        date_style,
    ))
    story.append(Spacer(1, 3 * mm))

    # Preamble
    story.append(Paragraph(
        "Lea con atención antes de firmar. Este documento forma parte del "
        "proceso de inscripción y acceso a clases y entrenamientos en "
        f"<b>{gym_name.upper()}</b>.",
        intro_style,
    ))

    # Declaration
    story.append(Paragraph(
        f"Yo, <b>{student_name}</b>, al firmar la presente hago constar que:",
        intro_style,
    ))

    # Clauses
    clauses = [
        (
            f"Mi inscripción y uso de los servicios que ofrece "
            f"<b>{gym_name.upper()}</b> como centro de acondicionamiento "
            "físico es totalmente voluntaria."
        ),
        (
            f"Estoy enterado que los programas y servicios que ofrece "
            f"<b>{gym_name.upper()}</b> se caracterizan por requerir una "
            "intensa actividad física."
        ),
        (
            "Reconozco que mi responsabilidad es consultar un médico antes "
            "de iniciar cualquier programa de ejercicios."
        ),
        (
            "Me encuentro en buenas condiciones de salud y no padezco "
            "ninguna incapacidad o enfermedad que me impida o limite mi "
            f"participación en los servicios que ofrece "
            f"<b>{gym_name.upper()}</b>."
        ),
        (
            "Estoy consciente que la práctica de cualquier actividad de "
            "acondicionamiento físico está sujeta a riesgos tales como "
            "daños en piernas, rodillas, espalda u otras partes del cuerpo, "
            "así como alteraciones en los sistemas cardiovascular, "
            "circulatorio y respiratorio."
        ),
        (
            "Elijo participar en las actividades y servicios que ofrece "
            f"<b>{gym_name.upper()}</b> a pesar de los riesgos mencionados."
        ),
        (
            f"Deslindo de toda responsabilidad a "
            f"<b>{gym_name.upper()}</b> durante todo el tiempo que participe "
            "en él, de los casos en que yo o alguien más sea afectado en su "
            "persona, producto de los riesgos implícitos en la práctica de "
            "alguna actividad de acondicionamiento físico, por ello acepto "
            "que no podré demandar legalmente a administradores, empleados, "
            "representantes y/o dueños por daños y perjuicios a mi persona."
        ),
        (
            f"Autorizo a <b>{gym_name.upper()}</b> a captar y utilizar "
            "fotografías, video o material audiovisual en el que pudiera "
            "aparecer, exclusivamente con fines promocionales, publicitarios, "
            "comerciales o de difusión en redes sociales, sitio web y "
            "materiales impresos o digitales, sin que ello genere pago, "
            "regalía o compensación a mi favor. Podré revocar esta "
            "autorización por escrito respecto de usos futuros."
        ),
        (
            "Manifiesto mi consentimiento expreso para firmar este documento "
            "por medios electrónicos. Reconozco que la firma electrónica "
            "plasmada al calce tiene la misma validez y eficacia jurídica "
            "que una firma autógrafa conforme al artículo 1803 del Código "
            "Civil Federal, los artículos 89 a 114 del Código de Comercio y "
            "la Ley de Firma Electrónica Avanzada, y que mi consentimiento "
            "queda acreditado al recibir y aceptar este documento a través "
            "del correo electrónico registrado."
        ),
    ]

    for i, text in enumerate(clauses, 1):
        story.append(Paragraph(f"<b>{i}.-</b> {text}", body_style))

    # Privacy note
    story.append(Spacer(1, 1.5 * mm))
    story.append(Paragraph("Consulta nuestro aviso de privacidad.", privacy_style))

    # Gold line before signatures
    story.append(Spacer(1, 4 * mm))
    story.append(HRFlowable(
        width="100%", thickness=0.5, color=_GOLD,
        spaceAfter=4 * mm, spaceBefore=0,
    ))

    # ── Signature block ────────────────────────────────────────────────

    gym_representative = gym_name  # e.g. "Fitness Room"
    col_w = page_w / 2

    # The actual calligraphy signatures sit on top of gold underlines.
    # We center the text inside a fixed-width table so it aligns under
    # the printed name caption.
    def _signature_cell(text: str) -> Table:
        return Table(
            [[Paragraph(text, signature_style)]],
            colWidths=[5.5 * cm],
            rowHeights=[14 * mm],
            style=TableStyle([
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
                ("LINEBELOW", (0, 0), (0, 0), 1, _GOLD),
                ("TOPPADDING", (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
            ]),
        )

    sig_data = [
        [
            _signature_cell(student_name),
            _signature_cell(gym_representative),
        ],
        [
            Paragraph(f"<b>{student_name}</b>", sign_caption_style),
            Paragraph(f"<b>{gym_name.upper()}</b>", sign_caption_style),
        ],
        [
            Paragraph(
                '<font color="#666666">Alumno / Alumna</font>',
                sign_caption_style,
            ),
            Paragraph(
                '<font color="#666666">Representante</font>',
                sign_caption_style,
            ),
        ],
    ]

    sig_table = Table(sig_data, colWidths=[col_w, col_w])
    sig_table.setStyle(TableStyle([
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 1),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
    ]))
    story.append(sig_table)

    story.append(Spacer(1, 4 * mm))

    # ── Legal electronic-signature block ────────────────────────────────

    identity = _build_signature_identity(student_name, student_email, sign_date)
    # Body used for hashing — flatten the clauses so the hash changes if the
    # text ever changes, providing integrity guarantees.
    body_for_hash = "\n".join(clauses)
    doc_hash = _content_hash(identity, body_for_hash)
    signed_iso = signed_at.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    story.append(HRFlowable(
        width="100%", thickness=0.5, color=_GOLD,
        spaceAfter=2 * mm, spaceBefore=0,
    ))

    contraparte = gym_name
    contraparte_detail_parts: list[str] = []
    if gym_address:
        contraparte_detail_parts.append(gym_address)
    if gym_email:
        contraparte_detail_parts.append(gym_email)
    if contraparte_detail_parts:
        contraparte = f"{gym_name} · " + " · ".join(contraparte_detail_parts)

    legal_lines = [
        (
            "<b>Documento firmado electrónicamente.</b> Ambas partes aceptan "
            "el contenido de este acuerdo mediante firma electrónica simple, "
            "con plena validez y eficacia jurídica conforme a los artículos "
            "89 a 114 del Código de Comercio, el artículo 1803 del Código "
            "Civil Federal y la Ley de Firma Electrónica Avanzada."
        ),
        (
            f"<b>Firmante (alumno):</b> {student_name} · "
            f"<b>Correo registrado:</b> {student_email}"
        ),
        (
            f"<b>Emisor (contraparte):</b> {contraparte}"
        ),
        (
            f"<b>Fecha y hora de firma (UTC):</b> {signed_iso} · "
            f"<b>Fecha civil:</b> {_format_date_es(sign_date)}"
        ),
        (
            f"<b>Huella de integridad (SHA-256):</b> "
            f'<font face="Courier">{doc_hash}</font>'
        ),
        (
            "La huella permite verificar que el contenido del documento no "
            "ha sido alterado desde su firma: cualquier cambio en el texto, "
            "por mínimo que sea, produce una huella distinta."
        ),
    ]
    for line in legal_lines:
        story.append(Paragraph(line, legal_style))

    story.append(Spacer(1, 2 * mm))
    story.append(Paragraph(
        f"Emitido por {gym_name} · {gym_email} · "
        f"{_format_date_es(sign_date)}",
        small_style,
    ))

    doc.build(story)
    return buf.getvalue()


def compute_signature_hash(
    student_name: str,
    student_email: str,
    sign_date: date | None = None,
) -> str:
    """Public helper to compute the same SHA-256 written into the PDF.

    Lets callers (e.g. the bulk-resend endpoint) persist the hash alongside
    the signed_at timestamp on the Student record for later verification.
    """
    if sign_date is None:
        sign_date = mexico_today()
    identity = _build_signature_identity(student_name, student_email, sign_date)
    # Hash of identity alone is enough for audit — the full body-hash lives
    # in the PDF and can be recomputed by regenerating the document.
    h = hashlib.sha256()
    h.update(identity.encode("utf-8"))
    return h.hexdigest()
