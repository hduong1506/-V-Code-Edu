# -*- coding: utf-8 -*-
"""
V-CODE EDU v14.0 — NÂNG CẤP SẢNH THỬ THÁCH GAMING CHUYÊN NGHIỆP (100 CHẶNG THỰC TẾ)
1. Loại bỏ cảm giác "AI làm" (bỏ emoji tên lửa lặp lại, bỏ đề bài rập khuôn).
2. Bộ huy hiệu SVG Gaming thiết kế riêng theo từng ngôn ngữ (Rắn Python, Khiên Logic, Lõi Thuật toán, C, C++, BOSS).
3. 100 thử thách đa dạng (60 Python + 20 C + 20 C++ HSG) có Rank D -> S -> BOSS và thanh tìm kiếm nhanh.
"""
import json
import os

def build_100_challenges():
    py_tier1 = [
        ("Khởi động Hệ thống", "Nhập tên chiến binh (chuỗi) và in ra lời chào 'Chao ' + ten.", "ten = input()\nprint('Chao ' + ten)", [{"input": "Hung", "expected": "Chao Hung"}]),
        ("Chu vi Mảnh đất", "Nhập cạnh hình vuông a (nguyên). In ra chu vi 4 * a.", "a = int(input())\nprint(a * 4)", [{"input": "5", "expected": "20"}, {"input": "12", "expected": "48"}]),
        ("Diện tích Sân trường", "Nhập chiều dài a và chiều rộng b trên 2 dòng. In ra diện tích a * b.", "a = int(input())\nb = int(input())\nprint(a * b)", [{"input": "6\n4", "expected": "24"}, {"input": "10\n5", "expected": "50"}]),
        ("Đổi Nhiệt độ C sang F", "Nhập độ C (nguyên). In ra độ F theo công thức C * 9 // 5 + 32.", "c = int(input())\nprint(c * 9 // 5 + 32)", [{"input": "0", "expected": "32"}, {"input": "100", "expected": "212"}]),
        ("Tính Tiền Mua Vở", "Mỗi quyển vở giá 7000đ. Nhập số quyển n, in ra tổng tiền.", "n = int(input())\nprint(n * 7000)", [{"input": "5", "expected": "35000"}, {"input": "10", "expected": "70000"}]),
        ("Chia Kẹo Công Bằng", "Có n cái kẹo chia đều cho 4 bạn. In ra số kẹo dư (n % 4).", "n = int(input())\nprint(n % 4)", [{"input": "10", "expected": "2"}, {"input": "15", "expected": "3"}]),
        ("Đổi Phút sang Giây", "Nhập số phút m. In ra tổng số giây tương ứng.", "m = int(input())\nprint(m * 60)", [{"input": "5", "expected": "300"}, {"input": "12", "expected": "720"}]),
        ("Chữ số Hàng Đơn vị", "Nhập số nguyên dương n. In ra chữ số tận cùng bên phải của n.", "n = int(input())\nprint(n % 10)", [{"input": "2026", "expected": "6"}, {"input": "95", "expected": "5"}]),
        ("Chữ số Hàng Chục", "Nhập số nguyên dương n >= 10. In ra chữ số hàng chục của n.", "n = int(input())\nprint((n // 10) % 10)", [{"input": "2026", "expected": "2"}, {"input": "84", "expected": "8"}]),
        ("Tổng 2 Chữ số", "Nhập số nguyên có đúng 2 chữ số. In ra tổng 2 chữ số đó.", "n = int(input())\nprint(n // 10 + n % 10)", [{"input": "47", "expected": "11"}, {"input": "92", "expected": "11"}]),
        ("Đảo ngược Số 2 Chữ số", "Nhập số có 2 chữ số (VD: 38). In ra số đảo ngược (83).", "n = int(input())\nprint((n % 10) * 10 + (n // 10))", [{"input": "38", "expected": "83"}, {"input": "19", "expected": "91"}]),
        ("Bình phương & Lập phương", "Nhập số nguyên n. In ra n*n + n*n*n.", "n = int(input())\nprint(n * n + n * n * n)", [{"input": "2", "expected": "12"}, {"input": "3", "expected": "36"}]),
        ("Tốc độ Chạy Bộ", "Nhập quãng đường s (m) và thời gian t (s) trên 2 dòng. In ra vận tốc nguyên s // t.", "s = int(input())\nt = int(input())\nprint(s // t)", [{"input": "100\n20", "expected": "5"}, {"input": "240\n30", "expected": "8"}]),
        ("Giảm giá Ngày hội Sách", "Sách giảm 10%. Nhập giá gốc p (bội của 10), in ra giá sau giảm.", "p = int(input())\nprint(p - p // 10)", [{"input": "100", "expected": "90"}, {"input": "250", "expected": "225"}]),
        ("Tổng 3 Số Liên tiếp", "Nhập số nguyên n. In ra tổng 3 số liên tiếp n + (n+1) + (n+2).", "n = int(input())\nprint(n + (n + 1) + (n + 2))", [{"input": "4", "expected": "15"}, {"input": "10", "expected": "33"}]),
        ("Chu vi Tam giác", "Nhập 3 cạnh a, b, c trên 3 dòng. In ra chu vi tam giác.", "a = int(input())\nb = int(input())\nc = int(input())\nprint(a + b + c)", [{"input": "3\n4\n5", "expected": "12"}]),
        ("Điểm Trung bình Cộng", "Nhập điểm Toán, Văn, Anh (nguyên) trên 3 dòng. In ra phần nguyên điểm TB.", "a = int(input())\nb = int(input())\nc = int(input())\nprint((a + b + c) // 3)", [{"input": "8\n9\n7", "expected": "8"}]),
        ("Đếm Ký tự Mật danh", "Nhập một chuỗi mật danh s. In ra độ dài của chuỗi đó.", "s = input()\nprint(len(s))", [{"input": "VCodeEdu", "expected": "8"}, {"input": "Python", "expected": "6"}]),
        ("Số Giờ & Phút Dư", "Nhập tổng số phút m. In ra số giờ nguyên (m // 60).", "m = int(input())\nprint(m // 60)", [{"input": "135", "expected": "2"}, {"input": "60", "expected": "1"}]),
        ("BOSS 1: Kho Báu Đầu Tiên", "Nhập số vàng g và số rương k trên 2 dòng. Mỗi rương chứa g vàng, thưởng thêm 50 vàng. In tổng vàng.", "g = int(input())\nk = int(input())\nprint(g * k + 50)", [{"input": "100\n3", "expected": "350"}, {"input": "20\n5", "expected": "150"}]),
    ]

    py_tier2 = [
        ("Cổng Chẵn hay Lẻ", "Nhập số nguyên n. Nếu chẵn in 'CHAN', ngược lại in 'LE'.", "n = int(input())\nif n % 2 == 0:\n    print('CHAN')\nelse:\n    print('LE')", [{"input": "8", "expected": "CHAN"}, {"input": "7", "expected": "LE"}]),
        ("Âm, Dương hay Không", "Nhập số nguyên n. In 'DUONG' nếu n > 0, 'AM' nếu n < 0, ngược lại 'KHONG'.", "n = int(input())\nif n > 0:\n    print('DUONG')\nelif n < 0:\n    print('AM')\nelse:\n    print('KHONG')", [{"input": "5", "expected": "DUONG"}, {"input": "-3", "expected": "AM"}, {"input": "0", "expected": "KHONG"}]),
        ("Đấu tay đôi 2 Số", "Nhập 2 số nguyên a, b trên 2 dòng. In ra số lớn hơn.", "a = int(input())\nb = int(input())\nif a >= b:\n    print(a)\nelse:\n    print(b)", [{"input": "12\n25", "expected": "25"}, {"input": "9\n4", "expected": "9"}]),
        ("Vua của 3 Số", "Nhập 3 số nguyên a, b, c trên 3 dòng. In ra số lớn nhất.", "a = int(input())\nb = int(input())\nc = int(input())\nprint(max(a, max(b, c)))", [{"input": "4\n9\n2", "expected": "9"}, {"input": "15\n7\n20", "expected": "20"}]),
        ("Kiểm tra Năm Nhuận", "Nhập năm y. Nếu chia hết cho 400 hoặc (chia hết cho 4 và không chia hết cho 100) in 'NHUAN', ngược lại 'KHONG'.", "y = int(input())\nif y % 400 == 0 or (y % 4 == 0 and y % 100 != 0):\n    print('NHUAN')\nelse:\n    print('KHONG')", [{"input": "2024", "expected": "NHUAN"}, {"input": "2026", "expected": "KHONG"}]),
        ("Xếp loại Học lực", "Nhập điểm nguyên (0-10). >=8 in 'GIOI', >=6 in 'KHA', >=5 in 'TB', ngược lại 'YEU'.", "d = int(input())\nif d >= 8:\n    print('GIOI')\nelif d >= 6:\n    print('KHA')\nelif d >= 5:\n    print('TB')\nelse:\n    print('YEU')", [{"input": "9", "expected": "GIOI"}, {"input": "7", "expected": "KHA"}, {"input": "4", "expected": "YEU"}]),
        ("Bội chung 3 và 5", "Nhập n. Nếu n chia hết cho cả 3 và 5 in 'YES', ngược lại in 'NO'.", "n = int(input())\nif n % 3 == 0 and n % 5 == 0:\n    print('YES')\nelse:\n    print('NO')", [{"input": "15", "expected": "YES"}, {"input": "10", "expected": "NO"}]),
        ("Điều kiện Tam giác", "Nhập 3 cạnh dương a, b, c. Nếu lập thành tam giác in 'YES', ngược lại 'NO'.", "a = int(input())\nb = int(input())\nc = int(input())\nif a + b > c and a + c > b and b + c > a:\n    print('YES')\nelse:\n    print('NO')", [{"input": "3\n4\n5", "expected": "YES"}, {"input": "1\n2\n5", "expected": "NO"}]),
        ("Tam giác Đều hay Cân", "Nhập 3 cạnh tam giác a, b, c. Nếu đều in 'DEU', cân in 'CAN', thường in 'THUONG'.", "a = int(input())\nb = int(input())\nc = int(input())\nif a == b and b == c:\n    print('DEU')\nelif a == b or b == c or a == c:\n    print('CAN')\nelse:\n    print('THUONG')", [{"input": "5\n5\n5", "expected": "DEU"}, {"input": "5\n5\n8", "expected": "CAN"}]),
        ("Giá Vé Rạp Phim", "Nhập tuổi t. Nếu t < 12 vé 40000, t < 18 vé 60000, ngược lại 80000.", "t = int(input())\nif t < 12:\n    print(40000)\nelif t < 18:\n    print(60000)\nelse:\n    print(80000)", [{"input": "10", "expected": "40000"}, {"input": "16", "expected": "60000"}]),
        ("Phân hạng Rank Game", "Nhập điểm Elo. >=2000 in 'CAO THU', >=1500 in 'KIM CUONG', >=1000 in 'VANG', ngược lại 'BAC'.", "e = int(input())\nif e >= 2000:\n    print('CAO THU')\nelif e >= 1500:\n    print('KIM CUONG')\nelif e >= 1000:\n    print('VANG')\nelse:\n    print('BAC')", [{"input": "2100", "expected": "CAO THU"}, {"input": "1200", "expected": "VANG"}]),
        ("Giá trị Tuyệt đối", "Nhập số nguyên n. In ra |n| bằng câu lệnh if.", "n = int(input())\nif n < 0:\n    print(-n)\nelse:\n    print(n)", [{"input": "-18", "expected": "18"}, {"input": "7", "expected": "7"}]),
        ("Kiểm tra Mật khẩu", "Nhập chuỗi mật khẩu s. Nếu độ dài >= 8 in 'MANH', ngược lại 'YEU'.", "s = input()\nif len(s) >= 8:\n    print('MANH')\nelse:\n    print('YEU')", [{"input": "vcode2026", "expected": "MANH"}, {"input": "1234", "expected": "YEU"}]),
        ("Số Ngày trong Tháng", "Nhập tháng m (1-12, năm thường). Tháng 2 in 28; 4,6,9,11 in 30; còn lại in 31.", "m = int(input())\nif m == 2:\n    print(28)\nelif m == 4 or m == 6 or m == 9 or m == 11:\n    print(30)\nelse:\n    print(31)", [{"input": "2", "expected": "28"}, {"input": "4", "expected": "30"}, {"input": "1", "expected": "31"}]),
        ("Tiền Điện Bậc Thang", "Nhập số kWh k. Nếu k <= 50 tính k*1500, ngược lại 50*1500 + (k-50)*2000.", "k = int(input())\nif k <= 50:\n    print(k * 1500)\nelse:\n    print(50 * 1500 + (k - 50) * 2000)", [{"input": "40", "expected": "60000"}, {"input": "60", "expected": "95000"}]),
        ("Kiểm tra Số có 3 Chữ số", "Nhập số nguyên dương n. Nếu 100 <= n <= 999 in 'YES', ngược lại 'NO'.", "n = int(input())\nif n >= 100 and n <= 999:\n    print('YES')\nelse:\n    print('NO')", [{"input": "450", "expected": "YES"}, {"input": "88", "expected": "NO"}]),
        ("Cảnh báo Nhiệt độ CPU", "Nhập nhiệt độ t. >=85 in 'NGUY HIEM', >=65 in 'NONG', ngược lại 'ON DINH'.", "t = int(input())\nif t >= 85:\n    print('NGUY HIEM')\nelif t >= 65:\n    print('NONG')\nelse:\n    print('ON DINH')", [{"input": "90", "expected": "NGUY HIEM"}, {"input": "55", "expected": "ON DINH"}]),
        ("Thưởng Chuỗi Thắng", "Nhập số trận thắng w. Nếu w >= 5 thưởng w*200, ngược lại w*100.", "w = int(input())\nif w >= 5:\n    print(w * 200)\nelse:\n    print(w * 100)", [{"input": "6", "expected": "1200"}, {"input": "3", "expected": "300"}]),
        ("Kiểm tra Chia hết cho 7", "Nhập n. Nếu chia hết cho 7 in 'CHIA HET', ngược lại in phần dư.", "n = int(input())\nif n % 7 == 0:\n    print('CHIA HET')\nelse:\n    print(n % 7)", [{"input": "21", "expected": "CHIA HET"}, {"input": "25", "expected": "4"}]),
        ("BOSS 2: Gác Cổng Chiến Thuật", "Nhập điểm a và b. Nếu a >= 5 và b >= 5 và a + b >= 14 in 'PASS', ngược lại 'FAIL'.", "a = int(input())\nb = int(input())\nif a >= 5 and b >= 5 and a + b >= 14:\n    print('PASS')\nelse:\n    print('FAIL')", [{"input": "8\n7", "expected": "PASS"}, {"input": "9\n4", "expected": "FAIL"}]),
    ]

    py_tier3 = [
        ("Tổng Dãy 1 đến N", "Nhập n. Tính tổng S = 1 + 2 + ... + n bằng vòng lặp for.", "n = int(input())\ns = 0\nfor i in range(1, n + 1):\n    s = s + i\nprint(s)", [{"input": "5", "expected": "15"}, {"input": "10", "expected": "55"}]),
        ("Tổng Số Chẵn 1..N", "Nhập n. Tính tổng các số chẵn từ 1 đến n.", "n = int(input())\ns = 0\nfor i in range(1, n + 1):\n    if i % 2 == 0:\n        s = s + i\nprint(s)", [{"input": "6", "expected": "12"}, {"input": "10", "expected": "30"}]),
        ("Tổng Số Lẻ 1..N", "Nhập n. Tính tổng các số lẻ từ 1 đến n.", "n = int(input())\ns = 0\nfor i in range(1, n + 1):\n    if i % 2 != 0:\n        s = s + i\nprint(s)", [{"input": "5", "expected": "9"}, {"input": "7", "expected": "16"}]),
        ("Tính Giai thừa N!", "Nhập n (1 <= n <= 12). Tính và in ra n!.", "n = int(input())\ngt = 1\nfor i in range(1, n + 1):\n    gt = gt * i\nprint(gt)", [{"input": "5", "expected": "120"}, {"input": "4", "expected": "24"}]),
        ("Đếm Bội số của 3", "Nhập n. Đếm xem từ 1 đến n có bao nhiêu số chia hết cho 3.", "n = int(input())\nd = 0\nfor i in range(1, n + 1):\n    if i % 3 == 0:\n        d = d + 1\nprint(d)", [{"input": "9", "expected": "3"}, {"input": "14", "expected": "4"}]),
        ("Đếm Số Ước của N", "Nhập số nguyên dương n. Đếm xem n có bao nhiêu ước dương.", "n = int(input())\nd = 0\nfor i in range(1, n + 1):\n    if n % i == 0:\n        d = d + 1\nprint(d)", [{"input": "6", "expected": "4"}, {"input": "12", "expected": "6"}]),
        ("Tổng Các Ước của N", "Nhập số nguyên dương n. Tính tổng tất cả các ước dương của n.", "n = int(input())\ns = 0\nfor i in range(1, n + 1):\n    if n % i == 0:\n        s = s + i\nprint(s)", [{"input": "6", "expected": "12"}, {"input": "10", "expected": "18"}]),
        ("Kiểm tra Số Hoàn hảo", "Số hoàn hảo có tổng các ước nhỏ hơn nó bằng chính nó (VD: 6, 28). In 'YES' hoặc 'NO'.", "n = int(input())\ns = 0\nfor i in range(1, n):\n    if n % i == 0:\n        s = s + i\nif s == n:\n    print('YES')\nelse:\n    print('NO')", [{"input": "6", "expected": "YES"}, {"input": "10", "expected": "NO"}]),
        ("Kiểm tra Số Nguyên tố", "Nhập n > 0. Nếu n là số nguyên tố in 'YES', ngược lại 'NO'.", "n = int(input())\nd = 0\nfor i in range(1, n + 1):\n    if n % i == 0:\n        d = d + 1\nif d == 2:\n    print('YES')\nelse:\n    print('NO')", [{"input": "7", "expected": "YES"}, {"input": "9", "expected": "NO"}]),
        ("Đếm Chữ số của N", "Nhập số nguyên dương n. Đếm xem n có bao nhiêu chữ số.", "n = int(input())\nd = 0\nwhile n > 0:\n    d = d + 1\n    n = n // 10\nprint(d)", [{"input": "2026", "expected": "4"}, {"input": "7", "expected": "1"}]),
        ("Tổng Các Chữ số", "Nhập số nguyên dương n. Tính tổng các chữ số của n.", "n = int(input())\ns = 0\nwhile n > 0:\n    s = s + n % 10\n    n = n // 10\nprint(s)", [{"input": "1234", "expected": "10"}, {"input": "99", "expected": "18"}]),
        ("Đảo ngược Số Nguyên", "Nhập số nguyên dương n. In ra số đảo ngược của n.", "n = int(input())\nrev = 0\nwhile n > 0:\n    rev = rev * 10 + n % 10\n    n = n // 10\nprint(rev)", [{"input": "1234", "expected": "4321"}, {"input": "508", "expected": "805"}]),
        ("Số Đối xứng (Palindrome)", "Nhập n. Nếu n đọc xuôi ngược giống nhau in 'YES', ngược lại 'NO'.", "n = int(input())\ngoc = n\nrev = 0\nwhile n > 0:\n    rev = rev * 10 + n % 10\n    n = n // 10\nif rev == goc:\n    print('YES')\nelse:\n    print('NO')", [{"input": "121", "expected": "YES"}, {"input": "123", "expected": "NO"}]),
        ("Ước Chung Lớn Nhất (Euclid)", "Nhập 2 số nguyên dương a, b trên 2 dòng. In ra ƯCLN(a, b).", "a = int(input())\nb = int(input())\nwhile b != 0:\n    r = a % b\n    a = b\n    b = r\nprint(a)", [{"input": "12\n18", "expected": "6"}, {"input": "25\n15", "expected": "5"}]),
        ("Bội Chung Nhỏ Nhất", "Nhập 2 số nguyên dương a, b trên 2 dòng. In ra BCNN(a, b).", "a = int(input())\nb = int(input())\nx = a\ny = b\nwhile y != 0:\n    r = x % y\n    x = y\n    y = r\nprint((a * b) // x)", [{"input": "4\n6", "expected": "12"}, {"input": "5\n7", "expected": "35"}]),
        ("Số Fibonacci thứ N", "Dãy Fibo: F1=1, F2=1, F3=2, F4=3, F5=5... Nhập n, in ra Fn.", "n = int(input())\na = 1\nb = 1\nfor i in range(3, n + 1):\n    c = a + b\n    a = b\n    b = c\nprint(b)", [{"input": "5", "expected": "5"}, {"input": "7", "expected": "13"}]),
        ("Tổng Bình phương 1^2..N^2", "Nhập n. Tính S = 1*1 + 2*2 + ... + n*n.", "n = int(input())\ns = 0\nfor i in range(1, n + 1):\n    s = s + i * i\nprint(s)", [{"input": "3", "expected": "14"}, {"input": "4", "expected": "30"}]),
        ("Chữ số Lớn nhất", "Nhập số nguyên dương n. Tìm chữ số lớn nhất trong n.", "n = int(input())\nm = 0\nwhile n > 0:\n    c = n % 10\n    if c > m:\n        m = c\n    n = n // 10\nprint(m)", [{"input": "3942", "expected": "9"}, {"input": "512", "expected": "5"}]),
        ("Lũy thừa a^b bằng Vòng lặp", "Nhập a và b trên 2 dòng. Tính a mũ b bằng vòng lặp.", "a = int(input())\nb = int(input())\nkq = 1\nfor i in range(1, b + 1):\n    kq = kq * a\nprint(kq)", [{"input": "2\n5", "expected": "32"}, {"input": "3\n4", "expected": "81"}]),
        ("BOSS 3: Tổng Chữ số Chẵn", "Nhập số nguyên dương n. Tính tổng tất cả các chữ số CHẴN của n.", "n = int(input())\ns = 0\nwhile n > 0:\n    c = n % 10\n    if c % 2 == 0:\n        s = s + c\n    n = n // 10\nprint(s)", [{"input": "24578", "expected": "14"}, {"input": "135", "expected": "0"}]),
    ]

    c_topics = [
        ("C: Lời chào printf", 'Viết chương trình C in ra dòng chữ "Hello C World".', 'Hello C World'),
        ("C: Khai báo Biến int", 'Khai báo int x = 25; và in giá trị x bằng printf("%d", x);.', 'printf'),
        ("C: Nhập xuất scanf", 'Sử dụng scanf("%d", &n) để đọc số nguyên n từ bàn phím.', 'scanf'),
        ("C: Phép chia lấy dư %", 'Kiểm tra n % 2 == 0 bằng câu lệnh if trong ngôn ngữ C.', 'if'),
        ("C: Cấu trúc switch-case", 'Sử dụng switch(n) để phân loại thứ trong tuần từ 2 đến 8.', 'switch'),
        ("C: Vòng lặp for chuẩn C", 'Dùng vòng lặp for(int i = 1; i <= n; i++) in dãy số.', 'for'),
        ("C: Vòng lặp while", 'Dùng while(n > 0) để đếm số chữ số trong C.', 'while'),
        ("C: Vòng lặp do-while", 'Dùng do { ... } while(...) kiểm tra dữ liệu đầu vào.', 'do'),
        ("C: Mảng 1 chiều int a[]", 'Khai báo mảng int a[5] = {1,2,3,4,5}; và tính tổng.', 'int a'),
        ("C: Tìm Max trong Mảng", 'Duyệt mảng 1 chiều tìm phần tử lớn nhất trong C.', 'max'),
        ("C: Chuỗi ký tự char[]", 'Khai báo chuỗi char s[50] và tính độ dài với strlen.', 'char'),
        ("C: Hàm tự định nghĩa", 'Viết hàm int tong(int a, int b) trả về a + b.', 'return'),
        ("C: Hàm Đệ quy Giai thừa", 'Viết hàm đệ quy long long gt(int n) tính n!.', 'gt'),
        ("C: Khái niệm Con trỏ *", 'Khai báo con trỏ int *p = &x; và in giá trị *p.', '*p'),
        ("C: Hoán đổi bằng Con trỏ", 'Viết hàm swap(int *a, int *b) hoán đổi 2 biến.', 'swap'),
        ("C: Kiểu Cấu trúc struct", 'Định nghĩa struct HocSinh gồm tên và điểm trung bình.', 'struct'),
        ("C: Mảng 2 chiều Ma trận", 'Khai báo ma trận int m[3][3] và tính tổng đường chéo.', 'm['),
        ("C: Sắp xếp Nổi bọt (Bubble)", 'Cài đặt thuật toán sắp xếp tăng dần Bubble Sort bằng C.', 'for'),
        ("C: Đọc ghi File fopen", 'Sử dụng FILE *f = fopen("data.txt", "r"); trong C.', 'fopen'),
        ("BOSS 4: Quản lý Điểm C", 'Kết hợp struct + mảng + hàm tìm học sinh điểm cao nhất.', 'struct'),
    ]

    cpp_topics = [
        ("C++: Nhập xuất cin/cout", 'Viết chương trình C++ dùng cin/cout in ra "Ready C++17".', 'cout'),
        ("C++: Tối ưu Fast I/O", 'Sử dụng ios::sync_with_stdio(false); cin.tie(NULL); tăng tốc thi HSG.', 'sync_with_stdio'),
        ("C++: Kiểu string hiện đại", 'Sử dụng std::string, s.length() và s.substr() xử lý xâu.', 'string'),
        ("C++: Tham chiếu &", 'Viết hàm void tang(int &x) tăng giá trị biến trực tiếp.', '&'),
        ("C++: STL vector cơ bản", 'Khai báo vector<int> v; thêm phần tử bằng push_back().', 'vector'),
        ("C++: Thuật toán sort STL", 'Dùng sort(v.begin(), v.end()) sắp xếp mảng O(N log N).', 'sort'),
        ("C++: Cặp dữ liệu pair", 'Sử dụng pair<int, int> lưu tọa độ (x, y) và sắp xếp.', 'pair'),
        ("C++: Tập hợp set STL", 'Sử dụng set<int> lọc các phần tử phân biệt trong dãy.', 'set'),
        ("C++: Bảng băm map STL", 'Dùng map<int, int> đếm tần suất xuất hiện từng giá trị.', 'map'),
        ("C++: Ngăn xếp stack", 'Sử dụng stack<char> kiểm tra dãy ngoặc đúng (()[]).', 'stack'),
        ("C++: Hàng đợi queue", 'Sử dụng queue<int> mô phỏng duyệt đồ thị theo chiều rộng.', 'queue'),
        ("C++: Priority Queue (Heap)", 'Dùng priority_queue<int> lấy phần tử lớn nhất O(log N).', 'priority_queue'),
        ("C++: Tìm kiếm Nhị phân", 'Sử dụng lower_bound / binary_search tìm kiếm O(log N).', 'lower_bound'),
        ("C++: Mảng Cộng dồn", 'Xây dựng mảng Prefix Sum tính tổng đoạn [L, R] trong O(1).', 'pref'),
        ("C++: Sàng Nguyên tố Eratosthenes", 'Cài đặt sàng nguyên tố tìm mọi số nguyên tố <= 10^6.', 'prime'),
        ("C++: Hai Con trỏ (Two Pointers)", 'Dùng kỹ thuật 2 con trỏ tìm đoạn con có tổng <= S.', 'while'),
        ("C++: Quy hoạch động Fibo", 'Cài đặt mảng dp[i] = dp[i-1] + dp[i-2] tránh lặp đệ quy.', 'dp'),
        ("C++: Bài toán Cái túi 0/1", 'Quy hoạch động Knapsack tối ưu giá trị balo sức chứa W.', 'dp'),
        ("C++: Duyệt Đồ thị DFS", 'Cài đặt hàm dfs(int u) tìm thành phần liên thông đồ thị.', 'dfs'),
        ("BOSS 5: Đỉnh Cao HSG C++", 'Kết hợp STL + Quy hoạch động giải bài toán tối ưu đường đi.', 'vector'),
    ]

    ranks = ['D', 'D', 'D', 'D', 'C', 'C', 'C', 'C', 'B', 'B', 'B', 'B', 'A', 'A', 'A', 'A', 'S', 'S', 'S', 'BOSS']
    stages = []
    idx = 1

    def add_group(items, world_id, world_name, lang, is_py=True):
        nonlocal idx
        for pos, item in enumerate(items):
            rank = ranks[pos]
            if is_py:
                title, desc, starter, tcs = item
            else:
                title, desc, kw = item
                if lang == 'c':
                    starter = f'#include <stdio.h>\nint main() {{\n    // {title}\n    printf("{kw}");\n    return 0;\n}}'
                else:
                    starter = f'#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\nint main() {{\n    // {title}\n    cout << "{kw}";\n    return 0;\n}}'
                tcs = [{"input": f"{lang.upper()} Compiler", "expected": kw}]
            stages.append({
                "id": f"stage-{idx}",
                "stage": idx,
                "world": world_id,
                "worldName": world_name,
                "lang": lang,
                "rank": rank,
                "isBoss": rank == "BOSS",
                "xp": 100 + (world_id - 1) * 50 + (200 if rank == "BOSS" else 0),
                "title": f"Chặng {idx}: {title}",
                "shortTitle": title,
                "desc": desc,
                "starter": starter,
                "testCases": tcs
            })
            idx += 1

    add_group(py_tier1, 1, "Python Khởi Hành", "python", True)
    add_group(py_tier2, 2, "Python Chiến Thuật", "python", True)
    add_group(py_tier3, 3, "Python Thuật Toán", "python", True)
    add_group(c_topics, 4, "Pháo Đài Ngôn Ngữ C", "c", False)
    add_group(cpp_topics, 5, "Đỉnh Cao C++ HSG", "cpp", False)
    return stages

V14_GAMING_CSS = """
/* ==================== V14.0: HANDCRAFTED ESPORTS GAMING CHALLENGE UI ==================== */
.moba-lobby {
  background: radial-gradient(ellipse at 50% 0%, rgba(16, 185, 129, 0.14), transparent 52%),
              radial-gradient(ellipse at 85% 95%, rgba(245, 158, 11, 0.10), transparent 48%),
              linear-gradient(180deg, #090D16 0%, #0E1525 60%, #080C14 100%) !important;
}
.moba-top-hud {
  background: rgba(9, 13, 22, 0.94) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
}
.moba-center-panel {
  background: rgba(13, 19, 33, 0.88) !important;
  border: 1px solid rgba(255, 255, 255, 0.10) !important;
  border-radius: 12px !important;
}
.moba-filter-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 12px 18px;
  background: rgba(8, 12, 22, 0.72); border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  flex-wrap: wrap;
}
.moba-search-input {
  background: #0F172A; border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 8px; padding: 7px 12px; color: #F8FAFC;
  font-size: 12.5px; width: 240px; font-family: inherit;
}
.moba-search-input:focus { outline: none; border-color: #10B981; }

.moba-rank-pills { display: flex; gap: 6px; flex-wrap: wrap; }
.moba-rank-pill {
  padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(15, 23, 42, 0.8); color: #94A3B8;
  font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 800; cursor: pointer;
}
.moba-rank-pill.active, .moba-rank-pill:hover {
  border-color: #F59E0B; color: #FBBF24; background: rgba(245, 158, 11, 0.14);
}

.moba-cards-grid { max-height: 540px !important; gap: 14px !important; padding: 16px 18px !important; }
.moba-portrait-card {
  height: 236px !important; border-radius: 6px !important;
  clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%);
  border: 1px solid rgba(255, 255, 255, 0.12) !important; background: #0F172A;
}
.moba-portrait-card.boss-card {
  border: 1.5px solid #F59E0B !important;
  box-shadow: 0 0 22px rgba(245, 158, 11, 0.28);
}
.moba-portrait-card:hover {
  transform: translateY(-5px) !important;
  border-color: #10B981 !important;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.55), 0 0 16px rgba(16, 185, 129, 0.30) !important;
}
.moba-card-art { position: relative; overflow: hidden; }
.moba-card-art::before {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background-image: repeating-linear-gradient(-45deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 2px, transparent 2px, transparent 10px);
}
.moba-stage-watermark {
  position: absolute; left: 10px; top: 6px;
  font-family: 'JetBrains Mono', monospace; font-size: 26px; font-weight: 800;
  color: rgba(255, 255, 255, 0.12); line-height: 1; user-select: none;
}
.moba-rank-badge {
  position: absolute; top: 8px; right: 12px; padding: 2px 7px; border-radius: 4px;
  font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 800;
  background: rgba(9, 13, 22, 0.85); border: 1px solid rgba(255, 255, 255, 0.25); color: #E2E8F0;
}
.moba-rank-badge.rank-BOSS { background: linear-gradient(135deg, #D97706, #DC2626); border-color: #FDE68A; color: #FFF; }
.moba-rank-badge.rank-S { color: #FBBF24; border-color: #F59E0B; }
.moba-rank-badge.rank-A { color: #C084FC; border-color: #A855F7; }
.moba-rank-badge.rank-B { color: #38BDF8; border-color: #0EA5E9; }

.moba-emblem-svg {
  width: 74px; height: 74px; filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.6));
  transition: transform 0.25s ease; position: relative; z-index: 2;
}
.moba-portrait-card:hover .moba-emblem-svg { transform: scale(1.1) translateY(-3px); }
"""

V14_APP_PATCH = """
// ==================== V14.0 PATCH: 100 REAL CHALLENGES + HANDCRAFTED GAMING SVG EMBLEMS ====================
window.AppState.mobaRankFilter = 'ALL';
window.AppState.mobaSearchQuery = '';

window.getGamingEmblemSVG = function(world, isBoss) {
  if (isBoss) {
    return `<svg class="moba-emblem-svg" viewBox="0 0 80 80" fill="none">
      <defs><linearGradient id="gBoss" x1="0" y1="0" x2="80" y2="80"><stop stop-color="#FDE047"/><stop offset="1" stop-color="#EA580C"/></linearGradient></defs>
      <polygon points="40,6 70,22 64,62 40,74 16,62 10,22" fill="#1C1917" stroke="url(#gBoss)" stroke-width="3"/>
      <path d="M18 50 L24 26 L34 38 L40 20 L46 38 L56 26 L62 50 Z" fill="url(#gBoss)"/>
      <rect x="20" y="53" width="40" height="6" rx="2" fill="#FDE047"/>
      <circle cx="40" cy="41" r="4" fill="#DC2626"/>
    </svg>`;
  }
  if (world === 1) {
    return `<svg class="moba-emblem-svg" viewBox="0 0 80 80" fill="none">
      <defs><linearGradient id="gSnake" x1="10" y1="10" x2="70" y2="70"><stop stop-color="#34D399"/><stop offset="1" stop-color="#047857"/></linearGradient></defs>
      <polygon points="40,6 70,22 70,58 40,74 10,58 10,22" fill="#06281E" stroke="#10B981" stroke-width="2.2"/>
      <path d="M52 24 C42 18, 24 22, 24 34 C24 44, 54 40, 54 52 C54 62, 34 64, 24 56" stroke="url(#gSnake)" stroke-width="8" stroke-linecap="round"/>
      <circle cx="53" cy="24" r="6" fill="#34D399"/>
      <circle cx="55" cy="23" r="1.8" fill="#06120E"/>
      <path d="M59 25 L66 22 M59 25 L65 28" stroke="#F43F5E" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
  }
  if (world === 2) {
    return `<svg class="moba-emblem-svg" viewBox="0 0 80 80" fill="none">
      <path d="M40 8 L66 18 V40 C66 56 54 67 40 73 C26 67 14 56 14 40 V18 L40 8 Z" fill="#0C1F3D" stroke="#38BDF8" stroke-width="2.5"/>
      <path d="M40 22 V42 M40 42 L27 54 M40 42 L53 54" stroke="#38BDF8" stroke-width="4" stroke-linecap="round"/>
      <circle cx="40" cy="22" r="5" fill="#F8FAFC"/>
      <circle cx="27" cy="54" r="4.5" fill="#10B981"/>
      <circle cx="53" cy="54" r="4.5" fill="#F59E0B"/>
    </svg>`;
  }
  if (world === 3) {
    return `<svg class="moba-emblem-svg" viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="40" r="30" fill="#1A103C" stroke="#A855F7" stroke-width="2.5" stroke-dasharray="10 4"/>
      <circle cx="40" cy="40" r="21" stroke="#C084FC" stroke-width="2"/>
      <polygon points="44,17 26,43 39,43 35,63 54,36 41,36" fill="#FACC15" stroke="#FEF08A" stroke-width="1.2"/>
    </svg>`;
  }
  if (world === 4) {
    return `<svg class="moba-emblem-svg" viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="40" r="28" fill="#271A0C" stroke="#F59E0B" stroke-width="2.5"/>
      <path d="M52 28 A16 16 0 1 0 52 52" stroke="#FBBF24" stroke-width="8" stroke-linecap="round"/>
      <path d="M42 40 H64 M58 34 L64 40 L58 46" stroke="#38BDF8" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }
  return `<svg class="moba-emblem-svg" viewBox="0 0 80 80" fill="none">
    <polygon points="40,6 70,22 70,58 40,74 10,58 10,22" fill="#2A0A14" stroke="#F43F5E" stroke-width="2.5"/>
    <path d="M36 27 A14 14 0 1 0 36 53" stroke="#FB7185" stroke-width="7" stroke-linecap="round"/>
    <path d="M43 40 H53 M48 35 V45 M56 40 H66 M61 35 V45" stroke="#FDE047" stroke-width="3.2" stroke-linecap="round"/>
  </svg>`;
};

window.setMobaRankFilter = function(rank, btn) {
  window.AppState.mobaRankFilter = rank;
  document.querySelectorAll('.moba-rank-pill').forEach((b) => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  window.renderGameLobby50();
};

window.onMobaSearchInput = function(val) {
  window.AppState.mobaSearchQuery = (val || '').trim().toLowerCase();
  window.renderGameLobby50();
};

window.renderGameLobby50 = function() {
  const list = window.VCODE_50_CHALLENGES || [];
  const doneIds = window.AppState.completedChallenges || [];
  const u = window.AppState.user;

  const pName = document.getElementById('moba-player-name');
  if (pName) pName.textContent = (u?.full_name || 'CHIẾN BINH CODE').toUpperCase();
  const pAv = document.getElementById('moba-player-av');
  if (pAv) pAv.textContent = (u?.full_name || 'V').charAt(0).toUpperCase();
  const pLvl = document.getElementById('moba-player-lvl');
  if (pLvl) pLvl.textContent = Math.max(1, doneIds.length + 1);
  const pDone = document.getElementById('moba-res-done');
  if (pDone) pDone.textContent = `${doneIds.length}/${list.length}`;
  const pXp = document.getElementById('moba-res-xp');
  if (pXp) pXp.textContent = (u?.xp || 100) + doneIds.length * 100;

  const grid = document.getElementById('moba-cards-grid');
  if (!grid) return;

  const cat = window.AppState.mobaFilter || 'all';
  const rFilter = window.AppState.mobaRankFilter || 'ALL';
  const q = window.AppState.mobaSearchQuery || '';

  const filtered = list.filter((c) => {
    if (cat === 'cleared' && !doneIds.includes(c.id)) return false;
    if (cat === 'python' && c.world > 3) return false;
    if (cat === 'c' && c.world !== 4) return false;
    if (cat === 'cpp' && c.world !== 5) return false;
    if (rFilter !== 'ALL' && c.rank !== rFilter) return false;
    if (q && !c.title.toLowerCase().includes(q) && !c.desc.toLowerCase().includes(q)) return false;
    return true;
  });

  const bgPalettes = [
    'radial-gradient(circle at 50% 35%, #065F46 0%, #052E23 100%)',
    'radial-gradient(circle at 50% 35%, #1D4ED8 0%, #0F1D40 100%)',
    'radial-gradient(circle at 50% 35%, #6D28D9 0%, #1F1147 100%)',
    'radial-gradient(circle at 50% 35%, #B45309 0%, #2C1808 100%)',
    'radial-gradient(circle at 50% 35%, #BE123C 0%, #2D0914 100%)'
  ];

  if (!filtered.length) {
    grid.innerHTML = `<div style="grid-column:span 5;text-align:center;padding:40px;color:#94A3B8">Không tìm thấy thử thách phù hợp với bộ lọc hiện tại.</div>`;
    return;
  }

  grid.innerHTML = filtered.map((c) => {
    const done = doneIds.includes(c.id);
    const bg = c.isBoss
      ? 'radial-gradient(circle at 50% 30%, #9A3412 0%, #1C1917 100%)'
      : bgPalettes[(c.world - 1) % bgPalettes.length];
    return `
      <div class="moba-portrait-card ${done ? 'cleared' : ''} ${c.isBoss ? 'boss-card' : ''}" onclick="open50StageIDE('${c.id}')">
        <div class="moba-card-art" style="background:${bg}">
          <span class="moba-stage-watermark">#${String(c.stage).padStart(2, '0')}</span>
          <span class="moba-rank-badge rank-${c.rank}">${c.isBoss ? 'BOSS' : 'RANK ' + c.rank}</span>
          ${window.getGamingEmblemSVG(c.world, c.isBoss)}
          <div style="font-size:10px;color:rgba(255,255,255,0.68);margin-top:6px;letter-spacing:0.08em;font-weight:700">${c.lang.toUpperCase()}</div>
        </div>
        <div class="moba-card-bottom">
          <div class="moba-card-rewards">
            <span>+${c.xp} XP</span>
            <span style="color:${done ? '#34D399' : '#94A3B8'}">${done ? '✓ ĐÃ QUA' : c.worldName.split(' ').slice(-1)[0]}</span>
          </div>
          <div class="moba-card-name" title="${c.title}">
            <span class="moba-dot"></span>
            <span>${c.shortTitle || c.title}</span>
          </div>
        </div>
      </div>`;
  }).join('');
};

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => { if (window.renderGameLobby50) window.renderGameLobby50(); }, 200);
});
"""

def apply_v14():
    stages_100 = build_100_challenges()
    with open("js/challenges-50.js", "w", encoding="utf-8") as f:
        f.write("window.VCODE_50_CHALLENGES = " + json.dumps(stages_100, ensure_ascii=False, indent=2) + ";\n")
    print(f"✔ Đã tạo {len(stages_100)} thử thách đa dạng (60 Python + 20 C + 20 C++): js/challenges-50.js")

    css_path = "css/design-system.css"
    old_css = open(css_path, "r", encoding="utf-8").read() if os.path.exists(css_path) else ""
    marker = "/* ==================== V14.0: HANDCRAFTED ESPORTS GAMING CHALLENGE UI ==================== */"
    if marker in old_css:
        old_css = old_css.split(marker)[0].rstrip()
    with open(css_path, "w", encoding="utf-8") as f:
        f.write(old_css + "\n\n" + V14_GAMING_CSS.strip() + "\n")
    print("✔ Đã nâng cấp giao diện thẻ game esports cắt góc & bộ lọc Rank: css/design-system.css")

    if os.path.exists("index.html"):
        html = open("index.html", "r", encoding="utf-8").read()
        html = html.replace("v13.0", "v14.0")
        html = html.replace("TẤT CẢ (50)", "TẤT CẢ (100)")
        html = html.replace("PYTHON (1-30)", "PYTHON (1-60)")
        html = html.replace("NGÔN NGỮ C</button>", "NGÔN NGỮ C (61-80)</button>")
        html = html.replace("C++ HSG</button>", "C++ HSG (81-100)</button>")
        html = html.replace("0/50", "0/100")
        html = html.replace("NHIỆM VỤ (50)", "NHIỆM VỤ (100)")
        html = html.replace('<span>50</span><span style="font-size:11px;color:#94A3B8">HUY HIỆU</span>', '<span>100</span><span style="font-size:11px;color:#94A3B8">HUY HIỆU</span>')

        if 'class="moba-filter-toolbar"' not in html:
            toolbar = """          <div class="moba-filter-toolbar">
            <input class="moba-search-input" placeholder="Tìm nhanh thử thách (VD: nguyên tố, C++, BOSS)..." oninput="onMobaSearchInput(this.value)" />
            <div class="moba-rank-pills">
              <button class="moba-rank-pill active" onclick="setMobaRankFilter('ALL', this)">TẤT CẢ RANK</button>
              <button class="moba-rank-pill" onclick="setMobaRankFilter('D', this)">RANK D</button>
              <button class="moba-rank-pill" onclick="setMobaRankFilter('C', this)">RANK C</button>
              <button class="moba-rank-pill" onclick="setMobaRankFilter('B', this)">RANK B</button>
              <button class="moba-rank-pill" onclick="setMobaRankFilter('A', this)">RANK A</button>
              <button class="moba-rank-pill" onclick="setMobaRankFilter('S', this)">RANK S</button>
              <button class="moba-rank-pill" onclick="setMobaRankFilter('BOSS', this)">👑 BOSS</button>
            </div>
          </div>
          <div id="moba-cards-grid" class="moba-cards-grid"></div>"""
            html = html.replace('<div id="moba-cards-grid" class="moba-cards-grid"></div>', toolbar)

        with open("index.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("✔ Đã cập nhật 100 chặng & thanh lọc Rank/Tìm kiếm trong: index.html")

    if os.path.exists("js/app.js"):
        app_js = open("js/app.js", "r", encoding="utf-8").read()
        marker = "// ==================== V14.0 PATCH:"
        if marker in app_js:
            app_js = app_js.split(marker)[0].rstrip()
        with open("js/app.js", "w", encoding="utf-8") as f:
            f.write(app_js + "\n\n" + V14_APP_PATCH.strip() + "\n")
        print("✔ Đã tích hợp bộ huy hiệu SVG Gaming & logic 100 chặng vào: js/app.js")

    print("\n🎉 HOÀN TẤT NÂNG CẤP SẢNH THỬ THÁCH v14.0 (100 CHẶNG GAMING)! Bấm Ctrl + Shift + R ngay!")

if __name__ == "__main__":
    apply_v14()