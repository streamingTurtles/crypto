function ApplicationStatus({ health }) {
  return (
    <section>
      <h2>Application Status</h2>

      {health ? (
        <p>
          API:{' '}
          <strong>
            {health.status}
          </strong>
          {' - '}
          {health.service}
        </p>
      ) : (
        <p>Checking API...</p>
      )}
    </section>
  )
}

export default ApplicationStatus
