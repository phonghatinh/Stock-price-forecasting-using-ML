import asyncio
import pymysql
from app.core.database import init_db
from app.config import settings

async def main():
    # Connect to MySQL server to create database
    connection = pymysql.connect(
        host='localhost',
        user='root',
        password='12345',
        port=3306
    )
    with connection.cursor() as cursor:
        cursor.execute("CREATE DATABASE IF NOT EXISTS fiinquant CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
    connection.commit()
    connection.close()

    # Now run init_db
    await init_db()

if __name__ == "__main__":
    asyncio.run(main())
