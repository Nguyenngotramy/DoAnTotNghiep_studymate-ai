/**
 * Utility functions for importing and exporting flashcards in various formats
 * Supports Anki CSV and Quizlet formats
 */

export interface FlashcardExportData {
  question: string
  answer: string
}

/**
 * Export flashcards to Anki CSV format
 * Anki CSV format: "front","back","tags"
 */
export function exportToAnkiCSV(cards: FlashcardExportData[], deckName: string): string {
  const header = '#separator:tab\n#html:true\n#tags:true\n'
  const rows = cards.map(card => {
    const question = card.question.replace(/"/g, '""')
    const answer = card.answer.replace(/"/g, '""')
    const tags = deckName.replace(/\s+/g, '_')
    return `"${question}"\t"${answer}"\t"${tags}"`
  })
  return header + rows.join('\n')
}

/**
 * Export flashcards to Quizlet format
 * Quizlet format: tab-separated "term\tdefinition"
 */
export function exportToQuizlet(cards: FlashcardExportData[]): string {
  return cards.map(card => {
    const term = card.question.replace(/\t/g, ' ')
    const definition = card.answer.replace(/\t/g, ' ')
    return `${term}\t${definition}`
  }).join('\n')
}

/**
 * Export flashcards to simple CSV format (generic)
 */
export function exportToCSV(cards: FlashcardExportData[]): string {
  const header = 'Question,Answer\n'
  const rows = cards.map(card => {
    const question = card.question.replace(/"/g, '""')
    const answer = card.answer.replace(/"/g, '""')
    return `"${question}","${answer}"`
  })
  return header + rows.join('\n')
}

/**
 * Import flashcards from Anki CSV format
 */
export function importFromAnkiCSV(csvContent: string): FlashcardExportData[] {
  const lines = csvContent.split('\n').filter(line => line.trim() && !line.startsWith('#'))
  const cards: FlashcardExportData[] = []

  lines.forEach(line => {
    // Handle tab-separated format
    if (line.includes('\t')) {
      const parts = line.split('\t')
      if (parts.length >= 2) {
        const question = parts[0].replace(/^"|"$/g, '').replace(/""/g, '"')
        const answer = parts[1].replace(/^"|"$/g, '').replace(/""/g, '"')
        if (question && answer) {
          cards.push({ question, answer })
        }
      }
    } else {
      // Handle comma-separated format
      const parts = line.split(',')
      if (parts.length >= 2) {
        const question = parts[0].replace(/^"|"$/g, '').replace(/""/g, '"')
        const answer = parts[1].replace(/^"|"$/g, '').replace(/""/g, '"')
        if (question && answer) {
          cards.push({ question, answer })
        }
      }
    }
  })

  return cards
}

/**
 * Import flashcards from Quizlet format (tab-separated)
 */
export function importFromQuizlet(content: string): FlashcardExportData[] {
  const lines = content.split('\n').filter(line => line.trim())
  const cards: FlashcardExportData[] = []

  lines.forEach(line => {
    const parts = line.split('\t')
    if (parts.length >= 2) {
      const term = parts[0].trim()
      const definition = parts[1].trim()
      if (term && definition) {
        cards.push({ question: term, answer: definition })
      }
    }
  })

  return cards
}

/**
 * Import flashcards from simple CSV format
 */
export function importFromCSV(csvContent: string): FlashcardExportData[] {
  const lines = csvContent.split('\n').filter(line => line.trim())
  const cards: FlashcardExportData[] = []

  // Skip header if it exists
  const startIndex = lines[0].toLowerCase().includes('question') ? 1 : 0

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i]
    const parts = line.split(',')
    if (parts.length >= 2) {
      const question = parts[0].replace(/^"|"$/g, '').replace(/""/g, '"')
      const answer = parts[1].replace(/^"|"$/g, '').replace(/""/g, '"')
      if (question && answer) {
        cards.push({ question, answer })
      }
    }
  }

  return cards
}

/**
 * Download content as a file
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/csv') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Read file content
 */
export function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target?.result as string)
    reader.onerror = reject
    reader.readAsText(file)
  })
}
