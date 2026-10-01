import React from 'react';

interface AIInsightsPanelProps {
  symbol: string;
}

export function AIInsightsPanel({ symbol }: AIInsightsPanelProps) {
  // In a real app, this would be fetched from the backend /api/insights/:symbol
  const prediction = {
    direction: 'Long',
    confidence_score: 78.4,
    summary_text: `Algorithmic synthesis observes sustained accumulation above the intraday VWAP benchmark. Technical confluence with opening range expansion and positive sector momentum indicates favorable conditions for upward continuation. Model confidence remains contingent upon the invalidation stop.`,
    sentiment_score: 2.4,
    sentiment_label: 'Moderately Bullish',
    factors: [
      { label: 'Technical Action', score: 84, color: 'bg-secondary', note: 'Bullish Confluence' },
      { label: 'Orderflow Delta', score: 81, color: 'bg-secondary', note: 'Positive Delta Pressure' },
      { label: 'Sector', score: 68, color: 'bg-secondary', note: 'Sympathetic Lift' },
      { label: 'Spread Friction', score: 95, color: 'bg-primary-container', note: 'Optimal <0.02%' },
    ],
    news: [
      'Retail margin expand (+0.82)',
      'Refinery crack spreads (+0.64)'
    ]
  };

  const isBullish = prediction.direction === 'Long';
  const colorToken = isBullish ? 'var(--color-long)' : 'var(--color-short)';
  const bgToken = isBullish ? 'var(--color-long-soft)' : 'var(--color-short-soft)';

  return (
    <section className="rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-space-lg shadow-sm flex flex-col gap-space-md">
      {/* Card Header */}
      <div className="flex items-center justify-between pb-space-sm border-b border-outline-variant/30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
          </div>
          <div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold tracking-tight">AI Insights &amp; Sentiment</h2>
            <p className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Multi-Factor Probabilistic Synthesis</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-md bg-surface-container text-on-surface-variant border border-outline-variant/40 font-body-sm text-[11px] flex items-center gap-1 font-medium">
            <span className="material-symbols-outlined text-[13px] text-primary">psychology</span>
            Powered by Gemini
          </span>
        </div>
      </div>

      {/* Gauge + Quantitative Prediction Block */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-space-md items-center bg-surface-container-low/60 rounded-xl p-space-md border border-outline-variant/20">
        {/* Calibrated Arc Visualizer */}
        <div className="sm:col-span-5 flex flex-col items-center justify-center">
          <div className="relative w-40 h-24 flex items-end justify-center overflow-hidden">
            <svg className="w-36 h-20" fill="none" viewBox="0 0 160 90">
              <path d="M 15 80 A 65 65 0 0 1 145 80" stroke="var(--color-surface-container)" strokeLinecap="round" strokeWidth="12" />
              <path d="M 15 80 A 65 65 0 0 1 42 35" stroke="var(--color-risk-soft)" strokeLinecap="round" strokeWidth="12" />
              <path d="M 44 33 A 65 65 0 0 1 116 33" stroke="var(--color-warning-soft)" strokeWidth="12" />
              <path 
                className="transition-all duration-1000" 
                d="M 15 80 A 65 65 0 0 1 138 52" 
                stroke={colorToken} 
                strokeDasharray="204" 
                strokeDashoffset="44" 
                strokeLinecap="round" 
                strokeWidth="12" 
              />
            </svg>
            <div className="absolute bottom-0 flex flex-col items-center leading-none">
              <span className="font-label-numeric-lg text-[1.65rem] font-bold text-on-surface tracking-tight">{prediction.confidence_score}%</span>
              <span className="font-label-caps text-[9px] text-outline uppercase font-semibold mt-0.5">Model Score</span>
            </div>
          </div>
          
          <div className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white`} style={{ backgroundColor: colorToken }}>
            <span className="material-symbols-outlined text-[15px] font-bold">north</span>
            <span className="font-label-caps text-label-caps uppercase font-bold tracking-wide">{prediction.direction} · High Confluence</span>
          </div>
          <span className="mt-2 text-center font-body-sm text-[11px] text-on-surface-variant">
            Bearish (&lt;35%) · Neutral (35-65%) · Bullish (&gt;65%)
          </span>
        </div>

        {/* Factor Breakdown Matrix */}
        <div className="sm:col-span-7 flex flex-col gap-2">
          <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Sub-Model Verification Factors</span>
          <div className="grid grid-cols-2 gap-2">
            {prediction.factors.map((factor, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/30 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="font-body-sm text-[11px] text-on-surface-variant truncate">{factor.label}</span>
                  <span className="font-label-numeric-sm text-label-numeric-sm font-bold" style={{ color: colorToken }}>{factor.score}%</span>
                </div>
                <div className="mt-1 w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
                  <div className={`h-1.5 rounded-full ${factor.color}`} style={{ width: `${factor.score}%`, backgroundColor: colorToken }}></div>
                </div>
                <span className="mt-1 font-label-caps text-[9px] font-semibold truncate" style={{ color: colorToken }}>{factor.note}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* News Sentiment Synthesis Row */}
      <div className="p-space-sm rounded-lg bg-surface-container-low border border-outline-variant/30 flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-sm">
          <span className="px-2 py-0.5 rounded font-label-caps text-label-caps font-bold text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
            SENTIMENT SCORE +{prediction.sentiment_score}
          </span>
          <div className="flex flex-col">
            <span className="font-body-sm text-body-sm text-on-surface font-medium">News Sentiment: {prediction.sentiment_label}</span>
            <span className="font-body-sm text-[11px] text-on-surface-variant">Alpha Vantage NLP API (evaluated news headlines)</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {prediction.news.map((item, idx) => (
            <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container-lowest border border-outline-variant/30 font-label-numeric-sm text-[11px] text-on-surface">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: colorToken }}></span>
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Factual Non-Sensational AI Executive Narrative */}
      <div className="rounded-lg bg-surface-container p-3.5 border border-outline-variant/40 flex gap-3">
        <span className="material-symbols-outlined text-[20px] shrink-0 mt-0.5" style={{ color: 'var(--color-primary)' }}>summarize</span>
        <div className="flex flex-col gap-1 text-on-surface">
          <span className="font-label-caps text-label-caps uppercase font-bold" style={{ color: 'var(--color-primary)' }}>Systematic Synthesis Note</span>
          <p className="font-body-md text-body-md leading-relaxed text-on-surface">
            {prediction.summary_text}
          </p>
        </div>
      </div>

      {/* Transparency & Governance Footer */}
      <div className="pt-space-xs border-t border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-y-2">
        <div className="flex items-center gap-2 text-on-surface-variant font-body-sm text-[11px]">
          <span className="material-symbols-outlined text-[14px]">history</span>
          <span>Last updated: just now · Gemini AI Synthesis</span>
        </div>
      </div>
      
      {/* Institutional Regulatory Disclaimer */}
      <div className="px-space-sm py-1.5 rounded bg-surface border border-outline-variant/20 text-on-surface-variant font-body-sm text-[11px] leading-tight flex items-start gap-2">
        <span className="material-symbols-outlined text-[15px] text-outline shrink-0 mt-0.5">verified</span>
        <span><strong>Personal Decision Support Only:</strong> Predictions are probabilistic quantitative outputs generated for personal scenario testing. They do not constitute investment advice.</span>
      </div>
    </section>
  );
}
