import psycopg2
from faker import Faker
import random
from datetime import datetime, timedelta

DB_URI = "postgresql://postgres.emqvfcnhoilofkhiruou:DataLens2026password@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"

fake = Faker('zh_CN')

def create_tables(cursor):
    print("正在创建数据库表...")
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            user_id SERIAL PRIMARY KEY,
            username VARCHAR(50) NOT NULL,
            city VARCHAR(50),
            register_date DATE
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS products (
            product_id SERIAL PRIMARY KEY,
            product_name VARCHAR(100) NOT NULL,
            category VARCHAR(50),
            price DECIMAL(10, 2)
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            order_id SERIAL PRIMARY KEY,
            user_id INT REFERENCES users(user_id),
            product_id INT REFERENCES products(product_id),
            quantity INT,
            total_amount DECIMAL(10, 2),
            order_date DATE
        )
    """)
    print("表结构创建完成！")

def insert_mock_data(cursor):
    print("正在生成并插入测试数据...")
    
    users_data = [(fake.name(), fake.city_name(), fake.date_between(start_date='-1y', end_date='today')) for _ in range(30)]
    cursor.executemany("INSERT INTO users (username, city, register_date) VALUES (%s, %s, %s)", users_data)
    
    categories = ['3C数码', '美妆护肤', '家居日用', '零食生鲜']
    products_data = []
    for _ in range(10):
        products_data.append((fake.word() + "pro款", random.choice(categories), round(random.uniform(50, 5000), 2)))
    cursor.executemany("INSERT INTO products (product_name, category, price) VALUES (%s, %s, %s)", products_data)
    
    orders_data = []
    for _ in range(100):
        user_id = random.randint(1, 30)
        product_id = random.randint(1, 10)
        quantity = random.randint(1, 5)

        total_amount = round(random.uniform(50, 20000), 2) 
        order_date = fake.date_between(start_date='-6m', end_date='today')
        orders_data.append((user_id, product_id, quantity, total_amount, order_date))
    
    cursor.executemany("INSERT INTO orders (user_id, product_id, quantity, total_amount, order_date) VALUES (%s, %s, %s, %s, %s)", orders_data)
    print("100条订单数据插入成功！")

def main():
    try:

        conn = psycopg2.connect(DB_URI)
        cursor = conn.cursor()
        
        cursor.execute("DROP TABLE IF EXISTS orders, products, users CASCADE;")
        
        create_tables(cursor)
        insert_mock_data(cursor)
        
        conn.commit()
        print("全部任务执行完毕，连接已关闭。")
        
    except Exception as e:
        print(f"发生错误: {e}")
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    main()