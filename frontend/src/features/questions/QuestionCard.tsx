import { Link } from "react-router-dom";
import type { PublicQuestion } from "./types";

interface Props {
  question: PublicQuestion;
  isOwner: boolean;
  onDelete?: (id: number) => void;
}

export function QuestionCard({ question, isOwner, onDelete }: Props) {
  return (
    <article className="question-card">
      <div className="question-card-meta">
        <span>{question.category}</span>
        <span>{question.difficulty}</span>
        <span>{question.type.replace(/_/g, " ")}</span>
      </div>

      <h2>
        <Link to={`/questions/${question.id}`}>{question.prompt}</Link>
      </h2>

      <p>
        By{" "}
        <Link to={`/users/${question.ownerId}`}>{question.ownerUsername}</Link>
      </p>

      <div className="question-card-actions">
        <Link to={`/questions/${question.id}`}>View question</Link>

        {isOwner && (
          <>
            <Link to={`/questions/${question.id}/edit`}>Edit</Link>
            {onDelete && (
              <button type="button" onClick={() => onDelete(question.id)}>
                Delete
              </button>
            )}
          </>
        )}
      </div>
    </article>
  );
}
