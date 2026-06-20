import { useEffect, useMemo, useState } from 'react'
import {
  parseAdmissionProgramCsv,
  type AdmissionProgramRow,
} from '@/utils/admissionRecommendation'

let catalogPromise: Promise<AdmissionProgramRow[]> | null = null

function loadCatalog() {
  if (!catalogPromise) {
    catalogPromise = fetch('/data/nganh_dao_tao_hien_tai.csv?v=onboarding-20260620')
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

  const majors = useMemo(() => {
    const source = selectedSchool
      ? rows.filter(row => row.ten_truong === selectedSchool)
      : rows
    return [...new Set(source.map(row => row.ten_nganh).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'vi'))
  }, [rows, selectedSchool])

  return { schools, majors, loading }
}
