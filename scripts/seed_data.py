"""
Seed script — populates all DynamoDB tables with realistic gym data.
All dates are computed relative to today so the data is always current.

Activity window : TODAY - 42 days  →  TODAY + 14 days
Memberships     : varied start/end dates; some expiring soon, some active

Usage:
    python scripts/seed_data.py
    python scripts/seed_data.py --wipe   # drops all items before seeding

Requires the local dev server running:
    uvicorn src.main:app --reload --port 8000
"""

import argparse
import random
import sys
import time
from datetime import date, timedelta

import httpx

BASE_URL = "http://localhost:8000/api/v1"
HEADERS = {"Authorization": "Bearer local-dev-token", "Content-Type": "application/json"}
TODAY = date.today()
START_DATE = TODAY - timedelta(days=42)   # ~6 weeks of history
END_DATE   = TODAY + timedelta(days=14)   # 2 weeks of upcoming classes

# ─────────────────────────────────────────────
# Data fixtures
# ─────────────────────────────────────────────

INSTRUCTORS = [
    {"first_name": "Valeria", "last_name": "Mendoza", "email": "valeria.mendoza@fitness.com",
     "phone": "+52 55 1001 0001", "specialties": ["Zumba", "Aerobics", "Danza"],
     "bio": "10 años de experiencia en clases grupales de baile y ritmo latino."},
    {"first_name": "Carlos", "last_name": "Herrera", "email": "carlos.herrera@fitness.com",
     "phone": "+52 55 1001 0002", "specialties": ["CrossFit", "Funcional", "HIIT"],
     "bio": "Certificado CrossFit L2, especialista en fuerza funcional."},
    {"first_name": "Sofía", "last_name": "Ramírez", "email": "sofia.ramirez@fitness.com",
     "phone": "+52 55 1001 0003", "specialties": ["Yoga", "Pilates"],
     "bio": "Instructora RYT-200, enfoque en bienestar y movilidad."},
    {"first_name": "Miguel", "last_name": "Torres", "email": "miguel.torres@fitness.com",
     "phone": "+52 55 1001 0004", "specialties": ["Spinning", "Cycling"],
     "bio": "Ex ciclista profesional, 5 años en clases de cycling indoor."},
    {"first_name": "Lorena", "last_name": "Castillo", "email": "lorena.castillo@fitness.com",
     "phone": "+52 55 1001 0005", "specialties": ["HIIT", "Funcional", "Boxing"],
     "bio": "Especialista en entrenamiento de alto rendimiento y box fitness."},
    {"first_name": "Diego", "last_name": "Vega", "email": "diego.vega@fitness.com",
     "phone": "+52 55 1001 0006", "specialties": ["Pilates", "Yoga"],
     "bio": "Pilates mat y reformer, certificado por Balanced Body."},
]

STUDENTS = [
    {"first_name": "Ana", "last_name": "García", "email": "ana.garcia@email.com",
     "phone": "+52 55 2001 0001", "status": "founder"},
    {"first_name": "Luis", "last_name": "Martínez", "email": "luis.martinez@email.com",
     "phone": "+52 55 2001 0002", "status": "founder"},
    {"first_name": "María", "last_name": "López", "email": "maria.lopez@email.com",
     "phone": "+52 55 2001 0003", "status": "founder"},
    {"first_name": "Jorge", "last_name": "Rodríguez", "email": "jorge.rodriguez@email.com",
     "phone": "+52 55 2001 0004", "status": "active"},
    {"first_name": "Daniela", "last_name": "Sánchez", "email": "daniela.sanchez@email.com",
     "phone": "+52 55 2001 0005", "status": "active"},
    {"first_name": "Andrés", "last_name": "Pérez", "email": "andres.perez@email.com",
     "phone": "+52 55 2001 0006", "status": "active"},
    {"first_name": "Fernanda", "last_name": "Jiménez", "email": "fernanda.jimenez@email.com",
     "phone": "+52 55 2001 0007", "status": "active"},
    {"first_name": "Roberto", "last_name": "Flores", "email": "roberto.flores@email.com",
     "phone": "+52 55 2001 0008", "status": "active"},
    {"first_name": "Isabella", "last_name": "Moreno", "email": "isabella.moreno@email.com",
     "phone": "+52 55 2001 0009", "status": "active"},
    {"first_name": "Sebastián", "last_name": "Reyes", "email": "sebastian.reyes@email.com",
     "phone": "+52 55 2001 0010", "status": "active"},
    {"first_name": "Camila", "last_name": "Cruz", "email": "camila.cruz@email.com",
     "phone": "+52 55 2001 0011", "status": "active"},
    {"first_name": "Ricardo", "last_name": "Vargas", "email": "ricardo.vargas@email.com",
     "phone": "+52 55 2001 0012", "status": "active"},
    {"first_name": "Valentina", "last_name": "Ramos", "email": "valentina.ramos@email.com",
     "phone": "+52 55 2001 0013", "status": "active"},
    {"first_name": "Eduardo", "last_name": "Díaz", "email": "eduardo.diaz@email.com",
     "phone": "+52 55 2001 0014", "status": "active"},
    {"first_name": "Natalia", "last_name": "Herrera", "email": "natalia.herrera@email.com",
     "phone": "+52 55 2001 0015", "status": "active"},
    {"first_name": "Pablo", "last_name": "Torres", "email": "pablo.torres@email.com",
     "phone": "+52 55 2001 0016", "status": "active"},
    {"first_name": "Mariana", "last_name": "Gómez", "email": "mariana.gomez@email.com",
     "phone": "+52 55 2001 0017", "status": "active"},
    {"first_name": "Alejandro", "last_name": "Ortiz", "email": "alejandro.ortiz@email.com",
     "phone": "+52 55 2001 0018", "status": "new"},
    {"first_name": "Gabriela", "last_name": "Medina", "email": "gabriela.medina@email.com",
     "phone": "+52 55 2001 0019", "status": "new"},
    {"first_name": "Emilio", "last_name": "Chávez", "email": "emilio.chavez@email.com",
     "phone": "+52 55 2001 0020", "status": "new"},
    {"first_name": "Patricia", "last_name": "Ruiz", "email": "patricia.ruiz@email.com",
     "phone": "+52 55 2001 0021", "status": "inactive"},
    {"first_name": "Héctor", "last_name": "Mendoza", "email": "hector.mendoza@email.com",
     "phone": "+52 55 2001 0022", "status": "inactive"},
]

# Weekly class schedule template: (class_type, instructor_index, weekday 0=Mon, start_time, duration, capacity, location)
WEEKLY_SCHEDULE = [
    # Monday
    ("zumba",   0, 0, "07:00", 60, 20, "Sala A"),
    ("hiit",    4, 0, "08:30", 45, 15, "Sala B"),
    ("yoga",    2, 0, "18:00", 60, 12, "Sala Zen"),
    ("cycling", 3, 0, "19:00", 50, 18, "Sala Cycling"),
    # Tuesday
    ("pilates", 5, 1, "07:30", 55, 10, "Sala Zen"),
    ("strong",  1, 1, "09:00", 60, 15, "Sala B"),
    ("zumba",   0, 1, "18:30", 60, 20, "Sala A"),
    # Wednesday
    ("hiit",    4, 2, "07:00", 45, 15, "Sala B"),
    ("yoga",    2, 2, "09:00", 60, 12, "Sala Zen"),
    ("cycling", 3, 2, "18:00", 50, 18, "Sala Cycling"),
    ("strong",  1, 2, "19:00", 60, 15, "Sala B"),
    # Thursday
    ("zumba",   0, 3, "07:00", 60, 20, "Sala A"),
    ("pilates", 5, 3, "10:00", 55, 10, "Sala Zen"),
    ("hiit",    4, 3, "18:30", 45, 15, "Sala B"),
    # Friday
    ("yoga",    2, 4, "07:30", 60, 12, "Sala Zen"),
    ("cycling", 3, 4, "09:00", 50, 18, "Sala Cycling"),
    ("zumba",   0, 4, "18:00", 60, 20, "Sala A"),
    ("strong",  1, 4, "19:30", 60, 15, "Sala B"),
    # Saturday
    ("hiit",    4, 5, "08:00", 45, 20, "Sala B"),
    ("zumba",   0, 5, "09:30", 60, 25, "Sala A"),
    ("yoga",    2, 5, "11:00", 75, 15, "Sala Zen"),
    ("cycling", 3, 5, "17:00", 50, 18, "Sala Cycling"),
]

MEMBERSHIP_PLANS = [
    ("monthly", 599.0, 30),
    ("monthly", 599.0, 30),
    ("monthly", 599.0, 30),
    ("quarterly", 1599.0, 90),
    ("quarterly", 1599.0, 90),
    ("semi_annual", 2899.0, 180),
    ("annual", 5499.0, 365),
    ("class_pack_10", 899.0, 60),
    ("class_pack_20", 1599.0, 90),
]


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def post(path: str, payload: dict | None = None, params: dict | None = None) -> dict:
    """POST to API and return JSON; payload goes as JSON body, params as query string."""
    r = httpx.post(
        f"{BASE_URL}{path}",
        json=payload,
        params=params,
        headers=HEADERS,
        timeout=10,
    )
    if r.status_code not in (200, 201):
        print(f"  ✗ POST {path} → {r.status_code}: {r.text[:200]}")
        return {}
    return r.json()


def all_weekdays_between(start: date, end: date, weekday: int) -> list[date]:
    """Returns all dates between start and end matching given weekday (0=Mon)."""
    days = []
    current = start
    while current <= end:
        if current.weekday() == weekday:
            days.append(current)
        current += timedelta(days=1)
    return days


def pick_random_students(student_ids: list[str], min_fill: float, capacity: int) -> list[str]:
    """Pick a random subset of students to simulate realistic occupancy."""
    fill_pct = random.uniform(min_fill, min(min_fill + 0.4, 1.0))
    count = max(1, int(capacity * fill_pct))
    return random.sample(student_ids, min(count, len(student_ids)))


# ─────────────────────────────────────────────
# Seed steps
# ─────────────────────────────────────────────

def seed_instructors() -> list[str]:
    print("\n👨‍🏫 Creando instructores...")
    ids = []
    for inst in INSTRUCTORS:
        result = post("/instructors", inst)
        if result:
            ids.append(result["instructor_id"])
            print(f"  ✓ {inst['first_name']} {inst['last_name']} ({', '.join(inst['specialties'][:2])})")
        time.sleep(0.05)
    return ids


def seed_students() -> list[str]:
    print("\n👥 Creando miembros...")
    ids = []
    for student in STUDENTS:
        payload = {k: v for k, v in student.items() if k != "status"}
        result = post("/students", payload)
        if result:
            ids.append(result["student_id"])
            print(f"  ✓ {student['first_name']} {student['last_name']} ({student['status']})")
        time.sleep(0.05)
    return ids


def seed_memberships(student_ids: list[str]) -> None:
    print("\n💳 Creando membresías...")
    random.seed(42)

    # Build a distribution of start offsets (days ago) so we get a realistic mix:
    # - some members with memberships expiring VERY soon (3-10 days)
    # - some expiring in 10-30 days ("warning" zone)
    # - most with memberships valid for months ahead
    # - a few already expired (inactive context)
    start_offsets = (
        [355, 360, 358]                    # founders: annual, ~5 days left
        + [25, 20]                          # quarterly expiring very soon
        + [10, 15]                          # monthly expiring soon
        + [random.randint(20, 60) for _ in range(6)]  # mid-term
        + [random.randint(5,  30) for _ in range(6)]  # mostly recent
        + [random.randint(60, 90) for _ in range(5)]  # long-term
    )

    for i, student_id in enumerate(student_ids):
        # First 3 (founders) → annual; rest → varied
        if i < 3:
            plan = ("annual", 5499.0, 365)
        else:
            plan = random.choice(MEMBERSHIP_PLANS)

        membership_type, price, days = plan

        offset = start_offsets[i] if i < len(start_offsets) else random.randint(5, 60)
        membership_start = TODAY - timedelta(days=offset)
        membership_end = membership_start + timedelta(days=days)

        classes_total = None
        if "class_pack" in membership_type:
            classes_total = int(membership_type.split("_")[-1])

        payload: dict = {
            "student_id": student_id,
            "membership_type": membership_type,
            "start_date": membership_start.isoformat(),
            "end_date": membership_end.isoformat(),
            "price_paid": price,
        }
        if classes_total:
            payload["classes_total"] = classes_total

        result = post("/memberships", payload)
        if result:
            student_data = STUDENTS[i]
            print(f"  ✓ {student_data['first_name']} {student_data['last_name']} "
                  f"→ {membership_type} ({membership_start} – {membership_end})")
        time.sleep(0.05)


def seed_classes(instructor_ids: list[str]) -> list[dict]:
    """Generate one class per schedule slot per week between dates."""
    print("\n📅 Creando clases en calendario...")
    created_classes = []
    random.seed(99)

    for class_type, inst_idx, weekday, start_time, duration, capacity, location in WEEKLY_SCHEDULE:
        instructor_id = instructor_ids[inst_idx] if inst_idx < len(instructor_ids) else instructor_ids[0]
        instructor_data = INSTRUCTORS[inst_idx]
        instructor_name = f"{instructor_data['first_name']} {instructor_data['last_name']}"

        days = all_weekdays_between(START_DATE, END_DATE, weekday)
        for class_date in days:
            payload = {
                "class_type": class_type,
                "instructor_name": instructor_name,
                "class_date": class_date.isoformat(),
                "start_time": start_time,
                "duration_minutes": duration,
                "capacity": capacity,
                "location": location,
            }
            result = post("/classes", payload)
            if result:
                created_classes.append(result)

        print(f"  ✓ {class_type.upper():10} {start_time} {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][weekday]} "
              f"→ {len(days)} fechas")
        time.sleep(0.05)

    print(f"\n  Total clases creadas: {len(created_classes)}")
    return created_classes


def seed_reservations(student_ids: list[str], classes: list[dict]) -> None:
    """Create realistic reservations — past classes get attendance marked, future get confirmed."""
    print("\n📋 Creando reservaciones y asistencia...")
    today = date.today()
    random.seed(77)

    # Only create reservations for classes in the past (up to today) + upcoming
    confirmed_count = 0
    attended_count = 0
    waitlisted_count = 0

    # Group classes by date for progress tracking
    past_classes = [c for c in classes if date.fromisoformat(c["class_date"]) <= today]
    future_classes = [c for c in classes if date.fromisoformat(c["class_date"]) > today]

    # Past classes — fill with realistic attendance (60-95%)
    for cls in past_classes:
        capacity = cls["capacity"]
        # Popular classes (zumba, hiit, cycling) tend to fill up more
        is_popular = cls["class_type"] in ("zumba", "hiit", "cycling")
        min_fill = 0.65 if is_popular else 0.45

        attending_ids = pick_random_students(student_ids, min_fill, capacity)

        for student_id in attending_ids:
            res = post("/reservations", {
                "class_id": cls["class_id"],
                "student_id": student_id,
            })
            if not res:
                continue

            # Mark attendance randomly: 85% attended, 10% no-show, 5% leave as confirmed
            roll = random.random()
            if roll < 0.85:
                post(
                    f"/reservations/class/{cls['class_id']}/student/{student_id}/attendance",
                    params={"attended": "true"},
                )
                attended_count += 1
            elif roll < 0.95:
                post(
                    f"/reservations/class/{cls['class_id']}/student/{student_id}/attendance",
                    params={"attended": "false"},
                )
            else:
                confirmed_count += 1

        time.sleep(0.02)

    # Upcoming classes — fill with confirmed reservations (50-80%)
    for cls in future_classes:
        capacity = cls["capacity"]
        is_popular = cls["class_type"] in ("zumba", "hiit", "cycling")
        min_fill = 0.50 if is_popular else 0.30

        reserving_ids = pick_random_students(student_ids, min_fill, capacity)
        for student_id in reserving_ids:
            res = post("/reservations", {
                "class_id": cls["class_id"],
                "student_id": student_id,
            })
            if res:
                if res.get("status") == "confirmed":
                    confirmed_count += 1
                else:
                    waitlisted_count += 1

        time.sleep(0.02)

    print(f"  ✓ {attended_count} asistencias registradas")
    print(f"  ✓ {confirmed_count} reservaciones confirmadas (futuras)")
    print(f"  ✓ {waitlisted_count} en lista de espera")


# ─────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────

def check_server() -> bool:
    try:
        r = httpx.get("http://localhost:8000/health", timeout=3)
        return r.status_code == 200
    except Exception:
        return False


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed fitness room database")
    parser.add_argument("--wipe", action="store_true", help="Not implemented — wipe manually")
    args = parser.parse_args()

    print("🏋️  Fitness Room — Seed Script")
    print(f"   Período: {START_DATE} → {END_DATE}  (relativo a hoy: {TODAY})")
    print(f"   Hoy    : {TODAY}")
    print(f"   Servidor: {BASE_URL}")

    if not check_server():
        print("\n❌ No se puede conectar al servidor. Asegúrate de que corra en localhost:8000")
        sys.exit(1)

    print("\n✅ Servidor conectado\n")

    if args.wipe:
        print("⚠️  --wipe: limpieza manual necesaria (reinicia DynamoDB local y vuelve a correr)")
        sys.exit(0)

    random.seed(42)

    instructor_ids = seed_instructors()
    student_ids = seed_students()
    seed_memberships(student_ids)
    classes = seed_classes(instructor_ids)
    seed_reservations(student_ids, classes)

    print("\n" + "─" * 50)
    print("✅ Seed completado exitosamente")
    print(f"   Instructores : {len(instructor_ids)}")
    print(f"   Miembros     : {len(student_ids)}")
    print(f"   Membresías   : {len(student_ids)}")
    print(f"   Clases       : {len(classes)}")
    print("─" * 50)


if __name__ == "__main__":
    main()
