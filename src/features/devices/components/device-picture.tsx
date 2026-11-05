import { Package } from 'lucide-react'
import { deviceTypes } from '../devices'

/** Local illustrations keep the design preview independent of remote image services. */
export function DevicePicture({ type }: { type: string }) {
  if (!deviceTypes.some((known) => known === type))
    return (
      <div
        role="img"
        aria-label={`${type} device`}
        className="device-picture flex items-center justify-center"
      >
        <Package size={64} className="text-muted" />
      </div>
    )
  return (
    <svg
      viewBox="0 0 280 170"
      className="device-picture"
      role="img"
      aria-label={`${type} device illustration`}
    >
      <ellipse cx="140" cy="151" rx="78" ry="9" fill="currentColor" opacity=".08" />
      <g stroke="#acb8c7" strokeWidth="1.5" strokeLinejoin="round">
        {type === 'Blood pressure' ? (
          <>
            <path d="M177 106c59 25 64-31 37-36" fill="none" stroke="#718096" strokeWidth="5" />
            <path d="M197 38l42 10-9 63-39-12z" fill="#54627a" stroke="#46536a" />
            <path d="M205 43l24 6-7 49-24-6z" fill="#6d7c95" stroke="none" />
            <path
              d="M69 42Q72 28 88 30l77 9q14 2 17 18l11 71q2 16-14 18l-96-3q-17 0-19-16z"
              fill="#e5eaf0"
            />
            <path d="M78 39l84 9 11 65-99-4z" fill="#fbfcfe" />
            <path d="M88 49l65 6 4 43-73-4z" fill="#cbdedc" />
            <text x="95" y="75" fontSize="23" fill="#364c53" stroke="none" fontFamily="monospace">
              120
            </text>
            <text x="122" y="91" fontSize="14" fill="#364c53" stroke="none" fontFamily="monospace">
              80
            </text>
            <circle cx="133" cy="126" r="9" fill="var(--accent)" stroke="none" />
            <path d="M98 124h9m49 2h9" stroke="#8792a3" strokeWidth="4" strokeLinecap="round" />
          </>
        ) : type === 'Weight' ? (
          <>
            <path
              d="M78 31h124q12 0 14 14l11 88q1 14-14 15H67q-14-1-13-15l11-88q1-14 13-14z"
              fill="#e6ecf0"
            />
            <path
              d="M80 36h120q8 0 9 10l9 83q0 10-10 10H72q-10 0-10-10l9-83q1-10 9-10z"
              fill="#f8fafc"
            />
            <rect x="110" y="46" width="61" height="31" rx="5" fill="#cbdedc" />
            <text x="118" y="67" fontSize="21" fill="#364c53" stroke="none" fontFamily="monospace">
              72.5
            </text>
            <path d="M84 87h29v36H81zm84 0h29l3 36h-32z" fill="#d4dce5" stroke="none" />
          </>
        ) : type === 'Oximeter' ? (
          <>
            <path
              d="M107 39q-22 0-25 23l-5 57q-2 21 21 27l51 1q25-2 30-25l8-49q2-20-18-26z"
              fill="#dbe3ec"
            />
            <path
              d="M112 29q-18-1-21 17l-5 57q-2 15 14 19l51 2q17-1 21-18l9-49q2-15-13-20z"
              fill="var(--accent)"
              stroke="none"
            />
            <path d="M111 44l51 7-6 45-52-4z" fill="#243348" stroke="#394b60" />
            <text x="112" y="68" fontSize="20" fill="#91f2e2" stroke="none" fontFamily="monospace">
              98
            </text>
            <text x="127" y="85" fontSize="12" fill="#bcd8ee" stroke="none" fontFamily="monospace">
              72
            </text>
            <circle cx="132" cy="110" r="4" fill="#f8fafc" stroke="none" />
          </>
        ) : type === 'Blood glucose' ? (
          <>
            <rect x="127" y="10" width="25" height="47" rx="3" fill="#f8fafc" />
            <path d="M132 10v19m6-19v19m7-19v19" stroke="#d1b06f" strokeWidth="3" />
            <rect x="95" y="42" width="90" height="106" rx="24" fill="#e4eaf1" />
            <path d="M106 64q0-10 10-10h48q10 0 10 10v45h-68z" fill="#cbdedc" />
            <text x="114" y="88" fontSize="27" fill="#364c53" stroke="none" fontFamily="monospace">
              105
            </text>
            <text x="132" y="103" fontSize="8" fill="#364c53" stroke="none">
              mg/dL
            </text>
            <circle cx="140" cy="128" r="9" fill="var(--accent)" stroke="none" />
          </>
        ) : (
          <g transform="rotate(25 140 85)">
            <rect x="124" y="17" width="33" height="121" rx="16" fill="#e8edf3" />
            <path d="M124 43q0-26 16-26t17 26v10h-33z" fill="var(--accent)" stroke="none" />
            <rect x="131" y="61" width="19" height="40" rx="3" fill="#cbdedc" />
            <text
              x="140"
              y="90"
              transform="rotate(-90 140 90)"
              fontSize="11"
              fill="#364c53"
              stroke="none"
              fontFamily="monospace"
            >
              36.8
            </text>
            <circle cx="140" cy="113" r="4" fill="var(--accent)" stroke="none" />
            <path d="M136 138v13q4 7 8 0v-13" fill="#b9c4d1" />
          </g>
        )}
      </g>
    </svg>
  )
}
