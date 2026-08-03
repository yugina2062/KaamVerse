import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '@/lib/api/client'
import type { ApiVerification, UserRole } from '@/lib/api/types'
import { useActionDialog } from '@/components/ui/ActionDialogs'
import { CoolIcon } from '@/components/ui/CoolIcon'

type DocumentOption = { type: string; label: string; description: string }

const seekerDocuments: DocumentOption[] = [
  { type: 'citizenship', label: 'NID / Citizenship', description: 'National ID, citizenship certificate, or passport' },
  { type: 'education_certificate', label: 'Education Certificate', description: 'Academic certificate relevant to your profile' },
  { type: 'professional_certificate', label: 'Professional Certificate', description: 'Training, licence, or professional qualification' },
]
const individualDocuments: DocumentOption[] = [
  { type: 'citizenship', label: 'NID / Citizenship', description: 'Identity document for the account holder' },
  { type: 'pan_vat', label: 'PAN / VAT Card', description: 'PAN or VAT registration where applicable' },
  { type: 'address_proof', label: 'Address Proof', description: 'Recent utility bill or official address document' },
]
const companyDocuments: DocumentOption[] = [
  { type: 'company_registration', label: 'Company Registration', description: 'Current company registration certificate' },
  { type: 'pan_vat', label: 'PAN / VAT Certificate', description: 'Company tax registration document' },
  { type: 'business_address', label: 'Business Address Proof', description: 'Official proof of the operating address' },
  { type: 'hr_identity', label: 'HR Representative ID', description: 'Identity document for the authorized representative' },
]

const documentAliases: Record<string, string[]> = {
  citizenship: ['citizenship', 'nid', 'nid_front', 'nid_back', 'passport'],
  pan_vat: ['pan_vat', 'pan', 'vat'],
  address_proof: ['address_proof', 'address', 'business_address'],
  business_address: ['business_address', 'address_proof', 'address'],
  company_registration: ['company_registration', 'registration', 'reg'],
  hr_identity: ['hr_identity', 'representative_identity', 'hr'],
}

function statusStyle(status?: ApiVerification['status']) {
  if (status === 'approved') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
  if (status === 'rejected') return 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
  if (status === 'pending') return 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
  return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
}

export function DocumentVerificationPanel({ role }: { role: UserRole }) {
  const dialog = useActionDialog()
  const fileInput = useRef<HTMLInputElement>(null)
  const [selectedType, setSelectedType] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [records, setRecords] = useState<ApiVerification[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const options = role === 'seeker' ? seekerDocuments : role === 'employer' ? companyDocuments : individualDocuments

  const load = async () => {
    setLoading(true)
    try { setRecords((await api.verifications.list()).results) }
    catch (error) { await dialog.alert({ title: 'Documents unavailable', message: error instanceof Error ? error.message : 'Please try again.', variant: 'danger' }) }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  const latest = useMemo(() => {
    const map = new Map<string, ApiVerification>()
    records.forEach(record => { if (!map.has(record.document_type)) map.set(record.document_type, record) })
    return map
  }, [records])
  const recordFor = (type: string) => (documentAliases[type] || [type]).map(alias => latest.get(alias)).find(Boolean)

  const upload = async () => {
    if (!selectedType || !selectedFile) {
      await dialog.alert({ title: 'Select a document', message: 'Choose a document type and a JPG, PNG, or PDF file first.', variant: 'warning' })
      return
    }
    setUploading(true)
    try {
      await api.verifications.submit(selectedType, selectedFile)
      setSelectedFile(null)
      if (fileInput.current) fileInput.current.value = ''
      await load()
      await dialog.alert({ title: 'Document submitted', message: 'Your file is stored securely and is now awaiting administrator review.', variant: 'success' })
    } catch (error) { await dialog.alert({ title: 'Upload failed', message: error instanceof Error ? error.message : 'Please use a JPG, PNG, or PDF up to 8 MB.', variant: 'danger' }) }
    finally { setUploading(false) }
  }

  return <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="mb-5"><h2 className="font-bold text-slate-900 dark:text-white">Document Verification</h2><p className="mt-1 text-sm text-slate-400">Upload identity or professional documents. Statuses below come directly from the verification API.</p></div>
    <div className="mb-5 grid gap-3 sm:grid-cols-2">
      {options.map(option => {
        const record = recordFor(option.type)
        return <button type="button" key={option.type} onClick={() => setSelectedType(option.type)} className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${selectedType === option.type ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40' : 'border-slate-200 hover:border-blue-300 dark:border-slate-700'}`}>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-slate-800"><CoolIcon name={option.type.includes('citizenship') || option.type.includes('identity') ? 'id-card' : 'document'} /></span>
          <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><strong className="text-sm text-slate-800 dark:text-slate-100">{option.label}</strong><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${statusStyle(record?.status)}`}>{record?.status || 'Not uploaded'}</span></span><span className="mt-1 block text-xs text-slate-400">{record?.status === 'rejected' && record.notes ? record.notes : option.description}</span></span>
        </button>
      })}
    </div>
    <div className="rounded-xl border-2 border-dashed border-slate-200 p-5 dark:border-slate-700">
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"><input ref={fileInput} type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" onChange={event => setSelectedFile(event.target.files?.[0] || null)} className="min-w-0 flex-1 text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-semibold file:text-blue-700"/><button type="button" disabled={uploading || loading || !selectedType || !selectedFile} onClick={() => void upload()} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 inline-flex items-center justify-center gap-2"><CoolIcon name="upload" className="h-4 w-4" />{uploading ? 'Uploading…' : 'Upload for review'}</button></div>
      <p className="mt-3 text-xs text-slate-400">JPG, PNG, or PDF · Maximum 8 MB · Select the matching document type above.</p>
    </div>
  </section>
}
