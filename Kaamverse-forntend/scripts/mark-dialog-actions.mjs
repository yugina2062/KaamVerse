import { readFileSync, writeFileSync } from 'node:fs'

const files = [
  'src/features/marketing/MarketingExperience.tsx',
  'src/features/dashboards/admin/AdminDashboard.tsx',
  'src/features/dashboards/company-employer/EmployerDashboard.tsx',
  'src/features/dashboards/job-seeker/JobSeekerDashboard.tsx',
  'src/features/dashboards/individual-employer/IndividualEmployerDashboard.tsx',
]

for (const file of files) {
  const source = readFileSync(file, 'utf8')
  const updated = source.replace(/<button\b[\s\S]*?>/g, tag => {
    if (/\bonClick\s*=/.test(tag) || /\btype=["']submit["']/.test(tag) || /\bdata-action-dialog\b/.test(tag)) return tag
    return tag.replace('<button', '<button data-action-dialog')
  })
  writeFileSync(file, updated)
}

console.log('Marked inactive prototype buttons for accessible dialog feedback.')
