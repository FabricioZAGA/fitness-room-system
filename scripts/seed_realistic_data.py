#!/usr/bin/env python3
"""Seed DynamoDB with realistic data simulating 1 month of system usage.

This script generates:
- 5 instructors with different specialties
- 25 students with various membership statuses
- Classes for a full month (daily classes)
- Reservations and waitlist entries
- Check-ins from past month
"""

import os
import sys
import random
from datetime import datetime, date, time, timedelta
from decimal import Decimal

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

import boto3
from src.models.student import StudentCreate, StudentDynamoItem, StudentStatus
from src.models.instructor import InstructorCreate, InstructorDynamoItem, InstructorStatus
from src.models.membership import MembershipCreate, MembershipDynamoItem, MembershipType, MembershipStatus
from src.models.class_model import ClassCreate, ClassDynamoItem, ClassType
from src.models.reservation import ReservationCreate, ReservationDynamoItem, ReservationStatus
from src.models.checkin import CheckinDynamoItem, CheckinReason
from src.models.common import utc_now


# Configuration
AWS_PROFILE = "salle-cajas"
TABLE_NAME = "fitness-room-dev"
REGION = "us-east-1"

# Realistic data
FIRST_NAMES = [
    "María", "José", "Ana", "Carlos", "Laura", "Miguel", "Carmen", "Francisco",
    "Isabel", "Antonio", "Elena", "Manuel", "Sofía", "Javier", "Lucía",
    "Diego", "Valentina", "Pedro", "Alejandra", "Luis", "Fernanda",
    "Roberto", "Patricia", "Ricardo", "Daniela", "Andrés"
]

LAST_NAMES = [
    "García", "Martínez", "López", "Sánchez", "González", "Hernández", "Pérez", "Rodríguez",
    "Fernández", "Gómez", "Díaz", "Ruiz", "Morales", "Ramírez", "Torres",
    "Flores", "Reyes", "Jiménez", "Cruz", "Vargas", "Mendoza"
]

CLASS_TYPES = [
    ClassType.ZUMBA,
    ClassType.STRONG,
    ClassType.YOGA,
    ClassType.HIIT,
    ClassType.PILATES,
    ClassType.CYCLING
]

MEMBERSHIP_TYPES = [
    MembershipType.MONTHLY,
    MembershipType.QUARTERLY,
    MembershipType.SEMI_ANNUAL,
    MembershipType.ANNUAL,
    MembershipType.CLASS_PACK_10,
    MembershipType.CLASS_PACK_20
]

INSTRUCTOR_SPECIALTIES = [
    ["zumba", "dance"],
    ["strong", "hiit", "functional"],
    ["yoga", "pilates", "stretching"],
    ["cycling", "cardio"],
    ["hiit", "boxing", "crossfit"]
]


def get_dynamodb():
    """Get DynamoDB client."""
    session = boto3.Session(profile_name=AWS_PROFILE, region_name=REGION)
    return session.resource('dynamodb')


def generate_email(first_name: str, last_name: str) -> str:
    """Generate realistic email."""
    domains = ["gmail.com", "hotmail.com", "yahoo.com", "outlook.com"]
    return f"{first_name.lower()}.{last_name.lower()}@{random.choice(domains)}"


def generate_phone() -> str:
    """Generate Mexican phone number."""
    return f"+52 55 {random.randint(1000, 9999)} {random.randint(1000, 9999)}"


def seed_instructors(dynamodb, count=5):
    """Seed instructors."""
    table = dynamodb.Table(TABLE_NAME)
    instructors = []

    print(f"🏋️  Seeding {count} instructors...")

    for i in range(count):
        first_name = random.choice(FIRST_NAMES)
        last_name = random.choice(LAST_NAMES)
        
        instructor_data = InstructorCreate(
            first_name=first_name,
            last_name=last_name,
            email=generate_email(first_name, last_name),
            phone=generate_phone(),
            specialties=INSTRUCTOR_SPECIALTIES[i % len(INSTRUCTOR_SPECIALTIES)],
            bio=f"Instructor certificado con {random.randint(2, 10)} años de experiencia en fitness.",
            photo_url=None,
            hourly_rate=float(Decimal(str(round(random.uniform(200, 500), 2))))
        )

        item = InstructorDynamoItem.from_create(instructor_data)
        # Convert to dict and handle Decimal conversion
        item_dict = item.model_dump(mode="json")
        # DynamoDB doesn't support float, convert to string for Decimal
        for key, value in item_dict.items():
            if isinstance(value, float):
                item_dict[key] = str(Decimal(str(value)))
        
        table.put_item(Item=item_dict)
        instructors.append(item)
        print(f"  ✓ {first_name} {last_name} - {', '.join(item.specialties)}")

    return instructors


def seed_students(dynamodb, count=25):
    """Seed students."""
    table = dynamodb.Table(TABLE_NAME)
    students = []

    print(f"\n👥 Seeding {count} students...")

    for i in range(count):
        first_name = random.choice(FIRST_NAMES)
        last_name = random.choice(LAST_NAMES)
        
        # Distribute statuses realistically
        status_weights = [0.6, 0.2, 0.1, 0.1]  # active, inactive, new, founder
        status = random.choices(
            [StudentStatus.ACTIVE, StudentStatus.INACTIVE, StudentStatus.NEW, StudentStatus.FOUNDER],
            weights=status_weights
        )[0]

        student_data = StudentCreate(
            first_name=first_name,
            last_name=last_name,
            email=generate_email(first_name, last_name),
            phone=generate_phone(),
            status=status,
            notes=f"Cliente desde {random.randint(2020, 2024)}" if random.random() > 0.5 else None
        )

        item = StudentDynamoItem.from_create(student_data)
        table.put_item(Item=item.model_dump(mode="json"))
        students.append(item)
        print(f"  ✓ {first_name} {last_name} - {status.value}")

    return students


def seed_memberships(dynamodb, students):
    """Seed memberships for students."""
    table = dynamodb.Table(TABLE_NAME)
    memberships = []

    print(f"\n💳 Seeding memberships for {len(students)} students...")

    today = date.today()

    for student in students:
        # Only active/new/founder students get memberships
        if student.status not in [StudentStatus.ACTIVE, StudentStatus.NEW, StudentStatus.FOUNDER]:
            continue

        # Select membership type
        mem_type = random.choice(MEMBERSHIP_TYPES)

        # Calculate dates based on membership type
        if mem_type == MembershipType.MONTHLY:
            start_date = today - timedelta(days=random.randint(1, 30))
            end_date = start_date + timedelta(days=30)
            price = 1200
            classes_total = None
        elif mem_type == MembershipType.QUARTERLY:
            start_date = today - timedelta(days=random.randint(1, 90))
            end_date = start_date + timedelta(days=90)
            price = 3200
            classes_total = None
        elif mem_type == MembershipType.SEMI_ANNUAL:
            start_date = today - timedelta(days=random.randint(1, 180))
            end_date = start_date + timedelta(days=180)
            price = 5800
            classes_total = None
        elif mem_type == MembershipType.ANNUAL:
            start_date = today - timedelta(days=random.randint(1, 365))
            end_date = start_date + timedelta(days=365)
            price = 10000
            classes_total = None
        elif mem_type == MembershipType.CLASS_PACK_10:
            start_date = today - timedelta(days=random.randint(1, 60))
            end_date = start_date + timedelta(days=90)
            price = 2500
            classes_total = 10
        else:  # CLASS_PACK_20
            start_date = today - timedelta(days=random.randint(1, 60))
            end_date = start_date + timedelta(days=120)
            price = 4500
            classes_total = 20

        # Some memberships might be expired
        if random.random() < 0.1:
            end_date = today - timedelta(days=random.randint(1, 30))
            status = MembershipStatus.EXPIRED
        else:
            status = MembershipStatus.ACTIVE

        membership_data = MembershipCreate(
            student_id=student.student_id,
            membership_type=mem_type,
            start_date=start_date,
            end_date=end_date,
            price_paid=float(Decimal(str(price))),
            classes_total=classes_total,
            notes=None
        )

        item = MembershipDynamoItem.from_create(membership_data)
        # Update status if expired
        if status == MembershipStatus.EXPIRED:
            item.status = status.value
            item.GSI3SK = None  # Remove active membership marker

        # Convert to dict and handle Decimal conversion
        item_dict = item.model_dump(mode="json")
        for key, value in item_dict.items():
            if isinstance(value, float):
                item_dict[key] = str(Decimal(str(value)))

        table.put_item(Item=item_dict)
        memberships.append(item)
        print(f"  ✓ {student.first_name} {student.last_name} - {mem_type.value} ({status.value})")

    return memberships


def seed_classes(dynamodb, instructors, days=30):
    """Seed classes for a month."""
    table = dynamodb.Table(TABLE_NAME)
    classes = []

    print(f"\n📅 Seeding classes for {days} days...")

    today = date.today()
    start_date = today - timedelta(days=days)

    for day in range(days):
        class_date = start_date + timedelta(days=day)
        
        # Skip Sundays (closed)
        if class_date.weekday() == 6:
            continue

        # 3-5 classes per day
        num_classes = random.randint(3, 5)

        for _ in range(num_classes):
            instructor = random.choice(instructors)
            class_type = random.choice(CLASS_TYPES)
            
            # Time slots: morning (6-10), afternoon (12-14), evening (17-21)
            time_slot = random.choice([
                time(6, 0), time(7, 0), time(8, 0), time(9, 0),
                time(12, 0), time(13, 0), time(14, 0),
                time(17, 0), time(18, 0), time(19, 0), time(20, 0)
            ])

            class_data = ClassCreate(
                class_type=class_type,
                instructor_name=f"{instructor.first_name} {instructor.last_name}",
                class_date=class_date,
                start_time=time_slot,
                duration_minutes=random.choice([45, 60, 90]),
                capacity=random.choice([15, 20, 25]),
                location=random.choice(["Studio A", "Studio B", "Studio C"]),
                description=f"Clase de {class_type.value} con {instructor.first_name}",
                class_link=None
            )

            item = ClassDynamoItem.from_create(class_data)
            
            # Add instructor_id for GSI2
            item.GSI2PK = f"INSTRUCTOR#{instructor.instructor_id}"
            
            table.put_item(Item=item.model_dump(mode="json"))
            classes.append(item)

    print(f"  ✓ {len(classes)} classes created")
    return classes


def seed_reservations(dynamodb, students, classes):
    """Seed reservations for classes."""
    table = dynamodb.Table(TABLE_NAME)
    reservations = []

    print(f"\n🎫 Seeding reservations...")

    # Only active students make reservations
    active_students = [s for s in students if s.status == StudentStatus.ACTIVE]

    for cls in classes:
        # Skip cancelled classes
        if cls.is_cancelled:
            continue

        # Random number of reservations (0 to capacity-2)
        num_reservations = random.randint(0, max(0, cls.capacity - 2))
        
        # Select random students
        selected_students = random.sample(active_students, min(num_reservations, len(active_students)))

        for student in selected_students:
            reservation_data = ReservationCreate(
                student_id=student.student_id,
                class_id=cls.class_id
            )

            item = ReservationDynamoItem.from_create(reservation_data, cls.class_date)
            
            # Some reservations might be cancelled or attended
            if random.random() < 0.15:
                item.status = ReservationStatus.CANCELLED.value
            elif random.random() < 0.2 and cls.class_date < str(date.today()):
                item.status = ReservationStatus.ATTENDED.value

            table.put_item(Item=item.model_dump(mode="json"))
            reservations.append(item)

            # Update class reservations count
            if item.status == ReservationStatus.CONFIRMED.value:
                cls.reservations_count += 1
                table.update_item(
                    Key={"PK": cls.PK, "SK": cls.SK},
                    UpdateExpression="SET reservations_count = :rc",
                    ExpressionAttributeValues={":rc": cls.reservations_count}
                )

    print(f"  ✓ {len(reservations)} reservations created")
    return reservations


def seed_checkins(dynamodb, students):
    """Seed check-ins from past month."""
    table = dynamodb.Table(TABLE_NAME)
    checkins = []

    print(f"\n🔐 Seeding check-ins...")

    # Only active students check in
    active_students = [s for s in students if s.status == StudentStatus.ACTIVE]

    for student in active_students:
        # 3-10 check-ins per student in the past month
        num_checkins = random.randint(3, 10)

        for _ in range(num_checkins):
            # Random time in past month
            days_ago = random.randint(1, 30)
            checkin_time = datetime.now() - timedelta(days=days_ago, hours=random.randint(6, 21))

            # Determine if can enter based on random factors
            can_enter = random.random() < 0.9  # 90% can enter
            if can_enter:
                reason = random.choice([
                    CheckinReason.ALL_GOOD,
                    CheckinReason.EXPIRING_SOON
                ])
            else:
                reason = random.choice([
                    CheckinReason.EXPIRED,
                    CheckinReason.NO_MEMBERSHIP,
                    CheckinReason.INACTIVE
                ])

            item = CheckinDynamoItem.create(
                student_id=student.student_id,
                can_enter=can_enter,
                reason=reason
            )

            # Override timestamp
            item.checked_in_at = checkin_time.isoformat()
            item.SK = f"CHECKIN#{checkin_time.isoformat()}"

            table.put_item(Item=item.model_dump(mode="json"))
            checkins.append(item)

    print(f"  ✓ {len(checkins)} check-ins created")
    return checkins


def main():
    """Main seeding function."""
    print("=" * 60)
    print("🌱 SEEDING REALISTIC DATA FOR FITNESS ROOM SYSTEM")
    print("=" * 60)
    print(f"Table: {TABLE_NAME}")
    print(f"Profile: {AWS_PROFILE}")
    print(f"Region: {REGION}")
    print("=" * 60)

    dynamodb = get_dynamodb()

    try:
        # Seed instructors
        instructors = seed_instructors(dynamodb, count=5)

        # Seed students
        students = seed_students(dynamodb, count=25)

        # Seed memberships
        memberships = seed_memberships(dynamodb, students)

        # Seed classes (past 30 days)
        classes = seed_classes(dynamodb, instructors, days=30)

        # Seed reservations
        reservations = seed_reservations(dynamodb, students, classes)

        # Seed check-ins
        checkins = seed_checkins(dynamodb, students)

        print("\n" + "=" * 60)
        print("✅ SEEDING COMPLETED SUCCESSFULLY")
        print("=" * 60)
        print(f"📊 Summary:")
        print(f"  - Instructors: {len(instructors)}")
        print(f"  - Students: {len(students)}")
        print(f"  - Memberships: {len(memberships)}")
        print(f"  - Classes: {len(classes)}")
        print(f"  - Reservations: {len(reservations)}")
        print(f"  - Check-ins: {len(checkins)}")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Error during seeding: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
