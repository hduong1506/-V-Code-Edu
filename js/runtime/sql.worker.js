/* V-Code Edu — SQL runtime: real SQLite (sql.js, WebAssembly, vendored for offline use) inside a Web Worker.
   Each run starts from a fresh sample database so lessons are reproducible. */

let SQL = null;

const SAMPLE_DB = `
CREATE TABLE lop (ma_lop TEXT PRIMARY KEY, ten_lop TEXT NOT NULL, khoi INTEGER NOT NULL);
CREATE TABLE hoc_sinh (id INTEGER PRIMARY KEY, ho_ten TEXT NOT NULL, gioi_tinh TEXT, ngay_sinh TEXT, ma_lop TEXT REFERENCES lop(ma_lop));
CREATE TABLE mon_hoc (ma_mon TEXT PRIMARY KEY, ten_mon TEXT NOT NULL);
CREATE TABLE diem (id INTEGER PRIMARY KEY, hoc_sinh_id INTEGER REFERENCES hoc_sinh(id), ma_mon TEXT REFERENCES mon_hoc(ma_mon), diem REAL);
INSERT INTO lop VALUES ('10A1','Lớp 10A1',10),('10A2','Lớp 10A2',10),('11B1','Lớp 11B1',11);
INSERT INTO hoc_sinh VALUES
 (1,'Nguyễn Minh An','Nam','2009-03-12','10A1'),(2,'Trần Thu Hà','Nữ','2009-07-25','10A1'),
 (3,'Lê Quốc Bảo','Nam','2009-11-02','10A2'),(4,'Phạm Ngọc Lan','Nữ','2009-01-18','10A2'),
 (5,'Hoàng Gia Huy','Nam','2008-05-30','11B1'),(6,'Vũ Khánh Linh','Nữ','2008-09-14','11B1'),
 (7,'Đặng Tuấn Kiệt','Nam','2009-12-21','10A1'),(8,'Bùi Phương Thảo','Nữ','2008-02-08','11B1');
INSERT INTO mon_hoc VALUES ('TIN','Tin học'),('TOAN','Toán'),('VAN','Ngữ văn');
INSERT INTO diem (hoc_sinh_id, ma_mon, diem) VALUES
 (1,'TIN',9.5),(1,'TOAN',8.0),(1,'VAN',7.0),(2,'TIN',8.5),(2,'TOAN',9.0),(2,'VAN',8.5),
 (3,'TIN',7.0),(3,'TOAN',6.5),(3,'VAN',8.0),(4,'TIN',9.0),(4,'TOAN',7.5),(4,'VAN',9.0),
 (5,'TIN',10.0),(5,'TOAN',9.5),(5,'VAN',6.0),(6,'TIN',8.0),(6,'TOAN',8.5),(6,'VAN',9.5),
 (7,'TIN',6.5),(7,'TOAN',7.0),(7,'VAN',7.5),(8,'TIN',9.0),(8,'TOAN',8.0),(8,'VAN',8.0);
`;

async function ensure() {
  if (SQL) return SQL;
  const base = new URL('../../vendor/sqljs/', self.location.href).href;
  importScripts(`${base}sql-wasm.js`);
  SQL = await self.initSqlJs({ locateFile: (f) => `${base}${f}` });
  return SQL;
}

function formatTable(res) {
  const { columns, values } = res;
  const rows = values.map((r) => r.map((v) => (v === null ? 'NULL' : String(v))));
  const widths = columns.map((c, i) => Math.min(40, Math.max(String(c).length, ...rows.map((r) => r[i].length))));
  const line = `+${widths.map((w) => '-'.repeat(w + 2)).join('+')}+`;
  const fmtRow = (r) => `| ${r.map((v, i) => v.slice(0, 40).padEnd(widths[i])).join(' | ')} |`;
  return [line, fmtRow(columns), line, ...rows.map(fmtRow), line, `(${rows.length} dòng)`].join('\n');
}

self.onmessage = async (e) => {
  const { id, code, sample = true } = e.data || {};
  const t0 = performance.now();
  try {
    const S = await ensure();
    const db = new S.Database();
    if (sample) db.exec(SAMPLE_DB);
    const results = db.exec(String(code));
    const changes = db.getRowsModified();
    let out = results.map(formatTable).join('\n\n');
    if (!results.length) out = `Thực thi thành công. Số dòng bị thay đổi: ${changes}.`;
    self.postMessage({ type: 'stdout', id, data: `${out}\n` });
    self.postMessage({ type: 'tables', id, data: results });
    db.close();
    self.postMessage({ type: 'done', id, ok: true, durationMs: performance.now() - t0 });
  } catch (err) {
    self.postMessage({ type: 'done', id, ok: false, error: `Lỗi SQL: ${err?.message || err}`, durationMs: performance.now() - t0 });
  }
};
