import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { getHistory } from "../../api/sessions";

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

function getHistoryRecords(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (data === null || typeof data !== "object") {
    return [];
  }

  const response = data as Record<string, unknown>;

  for (const key of ["items", "sessions", "history", "results", "data"]) {
    if (Array.isArray(response[key])) {
      return response[key];
    }
  }

  return [data];
}

function HistoryPage() {
  const [displayName, setDisplayName] = useState("");
  const [searchedName, setSearchedName] = useState("");
  const [historyData, setHistoryData] = useState<unknown>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchHistory() {
      if (!searchedName) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setHistoryData(null);

      try {
        const data = await getHistory<unknown>(searchedName);

        if (!cancelled) {
          setHistoryData(data);
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load practice history.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [searchedName, retryCount]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = displayName.trim();

    if (!name) {
      setError("Please enter your display name.");
      return;
    }

    setError(null);
    setSearchedName(name);
    setRetryCount((count) => count + 1);
  }

  const records = getHistoryRecords(historyData);

  return (
    <section>
      <h1>Practice History</h1>
      <p>Review your previous interview sessions.</p>

      <form onSubmit={handleSearch}>
        <label htmlFor="displayName">Display Name</label>

        <input
          id="displayName"
          type="text"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Enter your display name"
          required
        />

        <button type="submit" disabled={loading}>
          Search History
        </button>
      </form>

      <p>
        Privacy note: History lookup uses your display name, not an
        authenticated account. Avoid using sensitive personal information.
      </p>

      {loading ? (
        <p>Loading practice history...</p>
      ) : error ? (
        <div>
          <p role="alert">{error}</p>

          {searchedName && (
            <button onClick={() => setRetryCount((count) => count + 1)}>
              Try Again
            </button>
          )}
        </div>
      ) : searchedName && historyData !== null ? (
        records.length === 0 ? (
          <p>No practice sessions found for this display name.</p>
        ) : (
          <div>
            <h2>Previous Sessions</h2>

            {records.map((record, index) => {
              const session =
                record !== null && typeof record === "object"
                  ? (record as Record<string, unknown>)
                  : null;

              const id = session
                ? (session.id ?? session.sessionId ?? session.session_id)
                : null;

              return (
                <article key={String(id ?? index)}>
                  <h3>Session {String(id ?? index + 1)}</h3>

                  <DataValue value={record} />

                  {typeof id === "number" ||
                  (typeof id === "string" && /^\d+$/.test(id)) ? (
                    <Link to={`/results/${id}`}>View Results</Link>
                  ) : null}
                </article>
              );
            })}
          </div>
        )
      ) : (
        <p>Enter your display name to find previous sessions.</p>
      )}
    </section>
  );
}

export default HistoryPage;
