import { useState } from 'react'

function CompanyForm({ onSubmit }) {
  const [userCompany, setUserCompany] = useState('')
  const [competitors, setCompetitors] = useState([{ name: '', urlsText: '', githubOrg: '' }])

  function updateCompetitor(index, field, value) {
    const updated = [...competitors]
    updated[index] = { ...updated[index], [field]: value }
    setCompetitors(updated)
  }

  function addCompetitor() {
    setCompetitors([...competitors, { name: '', urlsText: '', githubOrg: '' }])
  }

  function removeCompetitor(index) {
    setCompetitors(competitors.filter((_, i) => i !== index))
  }

  function handleSubmit(e) {
    e.preventDefault()

    const payload = {
      user_company: userCompany,
      competitors: competitors.map((c) => ({
        name: c.name,
        urls: c.urlsText
          .split('\n')
          .map((url) => url.trim())
          .filter((url) => url.length > 0),
        github_org: c.githubOrg.trim() || null,
      })),
    }

    onSubmit(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto p-6 space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Your company name
        </label>
        <input
          type="text"
          value={userCompany}
          onChange={(e) => setUserCompany(e.target.value)}
          required
          className="w-full border border-gray-300 rounded-md px-3 py-2"
        />
      </div>

      {competitors.map((competitor, index) => (
        <div key={index} className="border border-gray-200 rounded-md p-4 space-y-3">
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-gray-700">
              Competitor {index + 1}
            </label>
            {competitors.length > 1 && (
              <button
                type="button"
                onClick={() => removeCompetitor(index)}
                className="text-sm text-red-600 hover:underline"
              >
                Remove
              </button>
            )}
          </div>

          <input
            type="text"
            placeholder="Competitor name"
            value={competitor.name}
            onChange={(e) => updateCompetitor(index, 'name', e.target.value)}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2"
          />

          <textarea
            placeholder="One URL per line (blog, pricing, careers, etc.)"
            value={competitor.urlsText}
            onChange={(e) => updateCompetitor(index, 'urlsText', e.target.value)}
            required
            rows={4}
            className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm"
          />
          
          <input
            type="text"
            placeholder="GitHub organization or username (optional), e.g. makenotion"
            value={competitor.githubOrg}
            onChange={(e) => updateCompetitor(index, 'githubOrg', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
          
        </div>
      ))}

      <button
        type="button"
        onClick={addCompetitor}
        className="text-sm text-blue-600 hover:underline"
      >
        + Add another competitor
      </button>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white font-medium py-2 rounded-md hover:bg-blue-700"
      >
        Start tracking
      </button>
    </form>
  )
}

export default CompanyForm