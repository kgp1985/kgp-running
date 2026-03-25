/**
 * Generate a CSV template for training plan import.
 * This can be opened/saved as Excel.
 */
export function generatePlanTemplateCSV() {
  const headers = ['Date', 'Distance', 'WorkoutType', 'Notes', 'TargetPace']

  // Example rows starting from today + 1
  const today = new Date()
  const exampleRows = []

  for (let i = 1; i <= 3; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)

    if (i === 1) {
      exampleRows.push([dateStr, '5.0', 'easy', 'Morning run', '8:30'])
    } else if (i === 2) {
      exampleRows.push([dateStr, '7.5', 'tempo', 'Lactate threshold work', '7:30'])
    } else {
      exampleRows.push([dateStr, '', 'recovery', 'Light recovery jog', '9:00'])
    }
  }

  // Build CSV
  const lines = [headers.join(',')]
  for (const row of exampleRows) {
    lines.push(row.map(cell => {
      // Escape quotes and wrap if needed
      if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"'))) {
        return `"${cell.replace(/"/g, '""')}"`
      }
      return cell
    }).join(','))
  }

  return lines.join('\n')
}

/**
 * Trigger download of CSV as a file.
 */
export function downloadPlanTemplate(filename = 'plan_template.csv') {
  const csv = generatePlanTemplateCSV()
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
