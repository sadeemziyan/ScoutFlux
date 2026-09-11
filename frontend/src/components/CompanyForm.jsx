import { useState } from 'react'
import { Button, Field, TextInput, TextArea, Panel } from './ui'

const EMPTY_COMPETITOR = { name: '', urlsText: '', githubOrg: '' }

function CompanyForm({ onSubmit }) {
  const [userCompany, setUserCompany] = useState('')
  const [competitors, setCompetitors] = useState([{ ...EMPTY_COMPETITOR }])

  function updateCompetitor(index, field, value) {
    setCompetitors((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    )
  }

  function addCompetitor() {
    setCompetitors((prev) => [...prev, { ...EMPTY_COMPETITOR }])
  }

  function removeCompetitor(index) {
    setCompetitors((prev) => prev.filter((_, i) => i !== index))
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit({
      user_company: userCompany,
      competitors: competitors.map((c) => ({
        name: c.name,
        urls: c.urlsText
          .split('\n')
          .map((url) => url.trim())
          .filter((url) => url.length > 0),
        github_org: c.githubOrg.trim() || null,
      })),
    })
  }

  return (
    <div className="max-w-[38rem]">
      <header className="mb-7">
        <h1 className="font-serif text-[1.75rem] font-semibold leading-tight text-ink">
          Track a competitor
        </h1>
        <p className="text-[0.9375rem] text-slate mt-1.5 leading-relaxed">
          Point the agents at the pages worth watching. Blog, pricing and careers
          pages give the strongest signal, since that is where product, pricing and
          hiring changes surface first.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-7">
        <Field
          label="Your company"
          id="user-company"
          hint="Used to label the briefings filed for you."
        >
          {(props) => (
            <TextInput
              {...props}
              type="text"
              value={userCompany}
              onChange={(e) => setUserCompany(e.target.value)}
              required
            />
          )}
        </Field>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-[0.875rem] font-medium text-ink shrink-0">
              Competitors
            </h2>
            <span className="h-px bg-rule flex-1" aria-hidden="true" />
            <span data-numeric className="text-[0.8125rem] text-slate shrink-0">
              {competitors.length}
            </span>
          </div>

          {competitors.map((competitor, index) => (
            <Panel key={index} as="fieldset" className="p-5">
              <legend className="sr-only">Competitor {index + 1}</legend>

              <div className="flex items-baseline justify-between gap-3 mb-4">
                <span className="font-serif text-[1rem] font-semibold text-ink">
                  {competitor.name.trim() || `Competitor ${index + 1}`}
                </span>
                {competitors.length > 1 && (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => removeCompetitor(index)}
                  >
                    Remove
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                <Field label="Name" id={`competitor-name-${index}`}>
                  {(props) => (
                    <TextInput
                      {...props}
                      type="text"
                      value={competitor.name}
                      onChange={(e) => updateCompetitor(index, 'name', e.target.value)}
                      required
                    />
                  )}
                </Field>

                <Field
                  label="Pages to watch"
                  id={`competitor-urls-${index}`}
                  hint="One URL per line."
                >
                  {(props) => (
                    <TextArea
                      {...props}
                      rows={4}
                      value={competitor.urlsText}
                      onChange={(e) => updateCompetitor(index, 'urlsText', e.target.value)}
                      required
                      placeholder={'https://example.com/blog\nhttps://example.com/pricing\nhttps://example.com/careers'}
                      className={`${props.className} leading-relaxed resize-y`}
                    />
                  )}
                </Field>

                <Field
                  label="GitHub organization"
                  id={`competitor-github-${index}`}
                  hint="Optional. Adds public repository and commit activity to the briefing."
                >
                  {(props) => (
                    <TextInput
                      {...props}
                      type="text"
                      value={competitor.githubOrg}
                      onChange={(e) => updateCompetitor(index, 'githubOrg', e.target.value)}
                      placeholder="makenotion"
                    />
                  )}
                </Field>
              </div>
            </Panel>
          ))}

          <Button type="button" variant="secondary" size="sm" onClick={addCompetitor}>
            Add another competitor
          </Button>
        </div>

        <div className="border-t border-rule pt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button type="submit">Start tracking</Button>
          <p className="text-[0.8125rem] text-slate">
            The first run scrapes every page listed and can take a few minutes.
          </p>
        </div>
      </form>
    </div>
  )
}

export default CompanyForm
