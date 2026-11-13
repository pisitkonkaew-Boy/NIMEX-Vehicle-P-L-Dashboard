# NIMEX Vehicle P&L Dashboard

หน้าเว็บผลประกอบการรถบริษัท อ่านข้อมูลจาก Google Sheet ผ่าน Apps Script

- ไม่มีตัวเลขใน repo นี้ ข้อมูลทั้งหมดอยู่ใน Google Sheet ห้ามนำ vpl-seed.json หรือไฟล์รายงานขึ้น repo
- ผู้ชมทั่วไปเปิดลิงก์ตามปกติ ผู้ดูแลเปิดด้วย `#admin` ต่อท้ายลิงก์แล้วใส่รหัส
- รหัสผู้ดูแลเก็บใน Script Properties ชื่อ `ADMIN_KEY` ของ Apps Script เท่านั้น
- ที่อยู่ระบบข้อมูลตั้งไว้ใน `config.js` เมื่อแก้หน้าเว็บให้เพิ่มเลข `VPL_V` เพื่อล้างแคช
- โค้ดฝั่ง Apps Script อยู่ใน `Code.gs.txt`
- ปุ่มแชร์/ส่งออก (Excel, PowerPoint, PNG, อินโฟกราฟิก A4 และ 16:9, ข้อความ LINE) อยู่ใน `share.js` โหลดเฉพาะผู้ดูแล
- เกณฑ์เกรด (อัตรากำไร %) ตั้งได้ในหน้าตั้งค่า เก็บในแท็บ Settings ของ Google Sheet
