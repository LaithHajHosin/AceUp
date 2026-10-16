import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getSessionResults } from "../../api/sessions";

function DataValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span>—</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span>No items</span>;
    }

    return (
      <ul>
        {value.map((item, index) => (
          <li key={index}>
            <DataValue value={item} />
          </li>
        ))}
      </ul>
    );
  }

  if (typeof value === "object") {
    return (
      <dl>
        {Object.entries(value as Record<string, unknown>).map(([key, item]) => (
          <div key={key}>
            <dt>{key.replace(/([A-Z])/g, " $1")}</dt>
            <dd>
              <DataValue value={item} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  return <>{String(value)}</>;
}

function ResultsPage() {
  const { sessionId } = useParams();
  const numericSessionId = Number(sessionId);

  const isValidSessionId =
    Boolean(sessionId) &&
    Number.isInteger(numericSessionId) &&
    numericSessionId > 0;

  const [results, setResults] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchResults() {
      if (!isValidSessionId) {
        setResults(null);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setResults(null);

      try {
        const data = await getSessionResults<unknown>(numericSessionId);

        if (!cancelled) {
          setResults(data);
        }
      } catch {
        if (!cancelled) {
          setError(
            "Failed to load results. The session may not have ended yet.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchResults();

    return () => {
      cancelled = true;
    };
  }, [sessionId, numericSessionId, isValidSessionId, retryCount]);

  return (
    <section>
      <h1>Interview Results</h1>
      <p>Review your interview performance.</p>

      {!isValidSessionId ? (
        <p>Invalid session ID. Please check the URL.</p>
      ) : loading ? (
        <p>Loading results...</p>
      ) : error ? (
        <div>
          <p role="alert">{error}</p>
          <button onClick={() => setRetryCount((count) => count + 1)}>
            Try Again
          </button>
        </div>
      ) : results === null ? (
        <p>No results data was returned.</p>
      ) : (
        <div>
          <h2>Session #{numericSessionId}</h2>
          <DataValue value={results} />
        </div>
      )}

      <p>
        <Link to="/history">View Practice History</Link>
      </p>
    </section>
  );
}

export default ResultsPage;
