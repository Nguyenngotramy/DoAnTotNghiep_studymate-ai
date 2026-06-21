import { useEffect, useMemo, useState } from 'react'
import {
  majorGroupName,
  parseAdmissionProgramCsv,
  schoolSearchTerms,
  type AdmissionProgramRow,
} from '@/utils/admissionRecommendation'

let catalogPromise: Promise<AdmissionProgramRow[]> | null = null

function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = fetch('/data/nganh_dao_tao_hien_tai.csv?v=admission-20260621-v3')
      .then(response => {
        if (!response.ok) throw new Error('Không tải được danh mục trường và ngành')
        return response.text()
      })
      .then(parseAdmissionProgramCsv)
  }
  return catalogPromise
}

export function useAcademicCatalog(selectedSchool = '') {
  const [rows, setRows] = useState<AdmissionProgramRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    loadCatalog()
      .then(data => {
        if (active) setRows(data)
      })
      .catch(() => {
        if (active) setRows([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const schools = useMemo(
    () => [...new Set(rows.map(row => row.ten_truong).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'vi')),
    [rows],
  )

  const schoolSearchAliases = useMemo(() => Object.fromEntries(
    schools.map(school => {
      const row = rows.find(item => item.ten_truong === school)
      return [school, row ? schoolSearchTerms(row.ma_truong, row.ten_truong) : school]
    }),
  ), [rows, schools])

  const majors = useMemo(() => {
    const source = selectedSchool
      ? rows.filter(row => row.ten_truong === selectedSchool)
      : rows
    return [...new Set(source.map(row => majorGroupName(row.ten_nganh)).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'vi'))
  }, [rows, selectedSchool])

  return { schools, schoolSearchAliases, majors, loading }
}
