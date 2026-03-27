"""
Recreates the local DynamoDB table with all GSIs (GSI1, GSI2, GSI3).
Run this ONCE before starting development or when resetting local data.

Usage:
    python scripts/setup_local_db.py          # create / verify table
    python scripts/setup_local_db.py --reset  # delete and recreate
"""

import argparse
import time

import boto3
from botocore.exceptions import ClientError

ENDPOINT = "http://localhost:8001"
REGION = "us-east-1"
TABLE_NAME = "fitness-room-local"

# Dummy credentials required by DynamoDB Local
SESSION = boto3.Session(
    aws_access_key_id="local",
    aws_secret_access_key="local",
    region_name=REGION,
)
client = SESSION.client("dynamodb", endpoint_url=ENDPOINT)


def table_exists() -> bool:
    try:
        client.describe_table(TableName=TABLE_NAME)
        return True
    except ClientError as e:
        if e.response["Error"]["Code"] == "ResourceNotFoundException":
            return False
        raise


def delete_table() -> None:
    print(f"🗑  Eliminando tabla '{TABLE_NAME}'...")
    client.delete_table(TableName=TABLE_NAME)
    waiter = client.get_waiter("table_not_exists")
    waiter.wait(TableName=TABLE_NAME)
    print("   Tabla eliminada.")


def create_table() -> None:
    print(f"🛠  Creando tabla '{TABLE_NAME}' con GSI1, GSI2, GSI3...")
    client.create_table(
        TableName=TABLE_NAME,
        BillingMode="PAY_PER_REQUEST",
        AttributeDefinitions=[
            {"AttributeName": "PK",     "AttributeType": "S"},
            {"AttributeName": "SK",     "AttributeType": "S"},
            {"AttributeName": "GSI1PK", "AttributeType": "S"},
            {"AttributeName": "GSI1SK", "AttributeType": "S"},
            {"AttributeName": "GSI2PK", "AttributeType": "S"},
            {"AttributeName": "GSI2SK", "AttributeType": "S"},
            {"AttributeName": "GSI3PK", "AttributeType": "S"},
            {"AttributeName": "GSI3SK", "AttributeType": "S"},
        ],
        KeySchema=[
            {"AttributeName": "PK", "KeyType": "HASH"},
            {"AttributeName": "SK", "KeyType": "RANGE"},
        ],
        GlobalSecondaryIndexes=[
            {
                "IndexName": "GSI1",
                "KeySchema": [
                    {"AttributeName": "GSI1PK", "KeyType": "HASH"},
                    {"AttributeName": "GSI1SK", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
            {
                "IndexName": "GSI2",
                "KeySchema": [
                    {"AttributeName": "GSI2PK", "KeyType": "HASH"},
                    {"AttributeName": "GSI2SK", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
            {
                "IndexName": "GSI3",
                "KeySchema": [
                    {"AttributeName": "GSI3PK", "KeyType": "HASH"},
                    {"AttributeName": "GSI3SK", "KeyType": "RANGE"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
        ],
    )

    # Wait until ACTIVE
    print("   Esperando que la tabla esté activa...")
    for _ in range(20):
        try:
            resp = client.describe_table(TableName=TABLE_NAME)
            if resp["Table"]["TableStatus"] == "ACTIVE":
                break
        except ClientError:
            pass
        time.sleep(0.5)

    print(f"   ✅ Tabla '{TABLE_NAME}' lista con GSI1, GSI2, GSI3.")


def show_table_info() -> None:
    resp = client.describe_table(TableName=TABLE_NAME)
    gsis = resp["Table"].get("GlobalSecondaryIndexes", [])
    print(f"\n📋 Tabla: {TABLE_NAME}")
    print(f"   Estado: {resp['Table']['TableStatus']}")
    print(f"   GSIs  : {[g['IndexName'] for g in gsis]}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--reset", action="store_true",
                        help="Elimina y recrea la tabla (borra todos los datos)")
    args = parser.parse_args()

    print("🏋️  Fitness Room — Setup Local DB")
    print(f"   DynamoDB Local: {ENDPOINT}\n")

    try:
        client.list_tables()
    except Exception:
        print("❌ No se puede conectar a DynamoDB Local en", ENDPOINT)
        print("   Asegúrate de que Docker / DynamoDB Local está corriendo.")
        return

    exists = table_exists()

    if args.reset and exists:
        delete_table()
        exists = False

    if not exists:
        create_table()
    else:
        print(f"ℹ  La tabla '{TABLE_NAME}' ya existe.")

    show_table_info()


if __name__ == "__main__":
    main()
