# Office Shuffle

เว็บสุ่มรายชื่อเข้ากับรูปแบบวันเข้าออฟฟิศคงที่ 9 รูปแบบ ใช้งานได้โดยไม่ต้องติดตั้งแพ็กเกจ

## เปิดใช้งาน

เปิด `index.html` ในเว็บเบราว์เซอร์ หรือรัน local server:

```powershell
python -m http.server 8080 --directory office-roster
```

แล้วเปิด http://localhost:8080

รายชื่อ วันที่สุ่ม และผลสุ่มล่าสุดจะบันทึกใน `localStorage` ของเบราว์เซอร์
