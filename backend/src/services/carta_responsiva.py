"""Carta Responsiva (Liability Waiver) PDF generator.

Generates a professional single-page PDF with the gym logo, student name,
date, and signature placeholders.  Returned as bytes ready to attach to
an email.

Uses ReportLab for PDF generation.
"""

from __future__ import annotations

from datetime import date
from io import BytesIO
from pathlib import Path
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
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

# ── Colours ──────────────────────────────────────────────────────────────────

_GOLD = colors.HexColor("#d4af37")
_DARK = colors.HexColor("#1a1a1a")
_GRAY = colors.HexColor("#666666")
_LIGHT = colors.HexColor("#999999")

_MONTHS_ES = [
    "", "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]


def _format_date_es(d: date) -> str:
    """Format a date in Spanish: '20 de abril de 2026'."""
    return f"{d.day} de {_MONTHS_ES[d.month]} de {d.year}"


def generate_carta_responsiva(
    student_name: str,
    student_email: str,
    gym_name: str = "Fitness Room",
    gym_address: str = "",
    sign_date: date | None = None,
) -> bytes:
    """Generate a single-page liability waiver PDF and return raw bytes.

    Args:
        student_name: Full name of the student.
        student_email: Email of the student (shown as digital ID).
        gym_name: Name of the gym / business.
        gym_address: Physical address of the gym.
        sign_date: Date of signing. Defaults to today.

    Returns:
        PDF file content as bytes.
    """
    if sign_date is None:
        sign_date = date.today()

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

    sign_style = ParagraphStyle(
        "WSign",
        parent=styles["Normal"],
        fontSize=8.5,
        leading=11,
        textColor=_DARK,
        alignment=TA_CENTER,
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
        f"Ciudad de México, a {_format_date_es(sign_date)}",
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

    # Signature block
    col_w = page_w / 2
    sig_data = [
        [
            Paragraph("", sign_style),
            Paragraph("", sign_style),
        ],
        [
            # Gold signature lines via a nested table
            Table(
                [[""]], colWidths=[5.5 * cm],
                style=TableStyle([
                    ("LINEBELOW", (0, 0), (0, 0), 1, _GOLD),
                    ("TOPPADDING", (0, 0), (0, 0), 12 * mm),
                    ("BOTTOMPADDING", (0, 0), (0, 0), 1),
                ]),
            ),
            Table(
                [[""]], colWidths=[5.5 * cm],
                style=TableStyle([
                    ("LINEBELOW", (0, 0), (0, 0), 1, _GOLD),
                    ("TOPPADDING", (0, 0), (0, 0), 12 * mm),
                    ("BOTTOMPADDING", (0, 0), (0, 0), 1),
                ]),
            ),
        ],
        [
            Paragraph(f"<b>{student_name}</b>", sign_style),
            Paragraph(f"<b>{gym_name.upper()}</b>", sign_style),
        ],
        [
            Paragraph(
                '<font color="#666666">Alumno / Alumna</font>',
                sign_style,
            ),
            Paragraph(
                '<font color="#666666">Representante</font>',
                sign_style,
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

    # Thin gold line at bottom
    story.append(HRFlowable(
        width="100%", thickness=0.5, color=_GOLD,
        spaceAfter=2 * mm, spaceBefore=0,
    ))

    # Digital signature footer
    story.append(Paragraph(
        f"Documento firmado digitalmente · {student_email} · "
        f"{_format_date_es(sign_date)}",
        small_style,
    ))

    doc.build(story)
    return buf.getvalue()
