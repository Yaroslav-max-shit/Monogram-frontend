import React, { useState } from 'react';
import { votePoll, closePoll } from '../utils/features';

interface Props {
  poll: any;
  messageId: number;
  currentUserId?: number;
  onTranslate?: () => void;
}

const PollView: React.FC<Props> = ({ poll, messageId, currentUserId, onTranslate }) => {
  const [voted, setVoted] = useState(false);
  const [results, setResults] = useState<Record<number, number>>({});
  const [totalVotes, setTotalVotes] = useState(0);
  const [isClosed, setIsClosed] = useState(poll.is_closed);

  const handleVote = async (idx: number) => {
    if (voted || isClosed) return;
    try {
      await votePoll(poll.poll_id, idx);
      setResults(prev => ({ ...prev, [idx]: (prev[idx] || 0) + 1 }));
      setTotalVotes(prev => prev + 1);
      setVoted(true);
    } catch {}
  };

  const handleClose = async () => {
    if (!confirm('Закрыть опрос?')) return;
    try {
      await closePoll(poll.poll_id);
      setIsClosed(true);
    } catch {}
  };

  const options = poll.options || [];
  const maxVotes = Math.max(1, ...Object.values(results));
  const isCreator = currentUserId && poll.creator_id === currentUserId;

  return (
    <div className="poll-view">
      <div className="poll-question">{poll.question}</div>
      {options.map((opt: string, idx: number) => {
        const count = results[idx] || 0;
        const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        const width = totalVotes > 0 ? (count / maxVotes) * 100 : 0;
        return (
          <div
            key={idx}
            className={`poll-option ${voted || isClosed ? 'poll-result' : ''}`}
            onClick={() => handleVote(idx)}
          >
            <div className="poll-option-bar" style={{ width: `${width}%` }} />
            <span className="poll-option-text">{opt}</span>
            {(voted || isClosed) && (
              <span className="poll-option-pct">{pct}%</span>
            )}
          </div>
        );
      })}
      {isClosed && <div className="poll-closed">Опрос завершён</div>}
      {isCreator && !isClosed && (
        <button 
          className="poll-close-btn" 
          onClick={handleClose}
          style={{
            marginTop: 8,
            padding: '6px 12px',
            background: 'transparent',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          Закрыть опрос
        </button>
      )}
    </div>
  );
};

export default PollView;
