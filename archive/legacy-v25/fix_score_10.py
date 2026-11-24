# -*- coding: utf-8 -*-
import os

# 1. Đổi công thức chấm tự động thang 100 -> thang 10
if os.path.exists("js/ide-engine.js"):
    s = open("js/ide-engine.js", "r", encoding="utf-8").read()
    s = s.replace("Math.round((passed / total) * 100)", "Math.round((passed / total) * 100) / 10")
    open("js/ide-engine.js", "w", encoding="utf-8").write(s)
    print("✔ Đã đổi công thức chấm tự động sang thang 10 trong js/ide-engine.js")

# 2. Đổi hiển thị /100 -> /10, giới hạn chấm điểm (0-10, cho phép nhập 0.25) & Điểm TB lấy 1 số thập phân
for path in ["js/v18-engine.js", "js/v19-polish.js"]:
    if os.path.exists(path):
        s = open(path, "r", encoding="utf-8").read()
        s = s.replace("'/100'", "'/10'").replace("/100", "/10")
        s = s.replace("(0-100)", "(0-10)")
        s = s.replace('max="100"', 'max="10" step="0.25"')
        s = s.replace(
            "Math.round(asgSubs.reduce((acc, s) => acc + Number(s.teacher_score ?? s.score ?? 0), 0) / asgSubs.length)",
            "Number((asgSubs.reduce((acc, s) => acc + Number(s.teacher_score ?? s.score ?? 0), 0) / asgSubs.length).toFixed(1))"
        )
        open(path, "w", encoding="utf-8").write(s)
        print(f"✔ Đã chuyển thang điểm 10 trong {path}")

# 3. Đổi bảng điểm minh họa ở Trang chủ
if os.path.exists("index.html"):
    s = open("index.html", "r", encoding="utf-8").read()
    s = s.replace("100/100", "10/10").replace("90/100", "9/10").replace("0/100", "0/10")
    open("index.html", "w", encoding="utf-8").write(s)
    print("✔ Đã cập nhật bảng điểm minh họa thang 10 trong index.html")

print("\nXONG! Hãy chạy git push để cập nhật lên GitHub.")