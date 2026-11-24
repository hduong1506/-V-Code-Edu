from backend.database.base import Base
from backend.database.connection import engine

def init_database(reset_schema: bool = False):
    if reset_schema:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    init_database(reset_schema=False)
    print("✔ Đã khởi tạo CSDL sạch (không tạo lớp mẫu mặc định)!")
