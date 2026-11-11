"use client"
import * as React from "react"
import { apiFetch } from "@/lib/api/apiFetch"

// spec 0027 AC-12: the Scorecard's "too few trades" threshold, saved per user.

export function ScorecardMinSampleSetting() {
  const [value, setValue] = React.useState("")
  const [status, setStatus] = React.useState<"loading" | "idle" | "saving" | "saved" | "error">("loading")
  const [message, setMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    apiFetch("/api/v1/settings/scorecard")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Request failed (${r.status})`))))
      .then((d: { minSample: number }) => {
        setValue(String(d.minSample))
        setStatus("idle")
      })
      .catch(() => {
        setStatus("error")
        setMessage("Couldn't load the current value.")
      })
  }, [])

  const n = Number(value)
  const valid = Number.isInteger(n) && n >= 5

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    setStatus("saving")
    setMessage(null)
    const res = await apiFetch("/api/v1/settings/scorecard", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ minSample: n }),
    })
    if (res.ok) {
      setStatus("saved")
    } else {
      const body = await res.json().catch(() => null)
      setStatus("error")
      setMessage(body?.message ?? "Couldn't save.")
    }
  }

  return (
    <form onSubmit={save} className="bg-surface border border-border-subtle rounded-xl p-space-md shadow-sm flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1 flex-1 min-w-[220px]">
        <label htmlFor="scorecard-min-sample" className="font-semibold text-text-primary text-body-sm">
          Scorecard minimum sample
        </label>
        <p id="scorecard-min-sample-help" className="text-body-xs text-text-secondary">
          Rows with fewer closed trades than this are flagged &quot;too few trades&quot;. Whole number, 5 or more.
        </p>
      </div>
      <input
        id="scorecard-min-sample"
        type="number"
        inputMode="numeric"
        min={5}
        step={1}
        value={value}
        disabled={status === "loading"}
        aria-describedby="scorecard-min-sample-help"
        aria-invalid={value !== "" && !valid}
        onChange={(e) => {
          setValue(e.target.value)
          setStatus("idle")
        }}
        className="h-11 w-24 rounded-lg border border-border-strong bg-surface px-3 font-label-code text-text-primary"
      />
      <button
        type="submit"
        disabled={!valid || status === "saving" || status === "loading"}
        className="min-h-11 px-4 rounded-lg bg-accent-primary text-white font-semibold disabled:opacity-50"
      >
        {status === "saving" ? "Saving…" : "Save"}
      </button>
      <p role="status" className="basis-full text-body-xs text-text-secondary">
        {status === "saved" ? "Saved. The Scorecard uses it on its next load." : message ?? ""}
      </p>
    </form>
  )
}
