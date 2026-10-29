function Block({ shape = '' }: { shape?: string }) {
  return <span className={`readings-skeleton-block ${shape}`} />
}

function DatePlaceholder() {
  return (
    <div className="readings-skeleton-group">
      <Block shape="readings-skeleton-calendar" />
      <div className="readings-skeleton-stack">
        <Block shape="readings-skeleton-line-short" />
        <Block shape="readings-skeleton-line-small" />
      </div>
    </div>
  )
}

export function ReadingsSkeleton() {
  return (
    <div role="status" aria-label="Loading device readings" className="readings-skeleton">
      <span className="sr-only">Loading device readings…</span>
      <div className="overflow-x-auto" aria-hidden="true">
        <table className="readings-table readings-skeleton-table">
          <thead>
            <tr>
              {['Reading', 'Device', 'Patient', 'Recorded', 'Received', 'Details'].map((label) => (
                <th key={label} scope="col">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }, (_, index) => (
              <tr key={index}>
                <td>
                  <div className="readings-skeleton-group readings-skeleton-measurement">
                    <Block shape="readings-skeleton-icon" />
                    <div className="readings-skeleton-stack">
                      <Block shape="readings-skeleton-line-short" />
                      <Block shape="readings-skeleton-value" />
                      <Block shape="readings-skeleton-line-small" />
                    </div>
                  </div>
                  <Block shape="readings-skeleton-id" />
                </td>
                <td>
                  <div className="readings-skeleton-stack">
                    <Block shape="readings-skeleton-brand" />
                    <Block shape="readings-skeleton-line-short" />
                    <Block shape="readings-skeleton-line" />
                  </div>
                </td>
                <td>
                  <div className="readings-skeleton-group">
                    <Block shape="readings-skeleton-avatar" />
                    <div className="readings-skeleton-stack">
                      <Block shape="readings-skeleton-line-short" />
                      <Block shape="readings-skeleton-line" />
                    </div>
                  </div>
                </td>
                <td>
                  <DatePlaceholder />
                </td>
                <td>
                  <DatePlaceholder />
                </td>
                <td>
                  <Block shape="readings-skeleton-button" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="readings-pagination" aria-hidden="true">
        <Block shape="readings-skeleton-line" />
        <div className="readings-skeleton-group">
          <Block shape="readings-skeleton-line" />
          <Block shape="readings-skeleton-button" />
          <Block shape="readings-skeleton-button" />
        </div>
      </div>
    </div>
  )
}
