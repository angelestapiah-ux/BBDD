// Dump de los excels de gastos para replicar su estructura
import ExcelJS from 'exceljs'

for (const ruta of process.argv.slice(2)) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(ruta)
  console.log(`\n═══ ${ruta} ═══`)
  for (const ws of wb.worksheets) {
    console.log(`\n— Hoja: ${ws.name} (${ws.rowCount} filas)`)
    let n = 0
    ws.eachRow({ includeEmpty: false }, (row, i) => {
      if (n++ > 14) return
      const vals = row.values.slice(1).map(v => {
        if (v == null) return ''
        if (typeof v === 'object' && v.result !== undefined) return v.result
        if (typeof v === 'object' && v.richText) return v.richText.map(t => t.text).join('')
        if (v instanceof Date) return v.toISOString().slice(0, 10)
        return v
      })
      console.log(`  [${i}] ${JSON.stringify(vals)}`)
    })
  }
}
