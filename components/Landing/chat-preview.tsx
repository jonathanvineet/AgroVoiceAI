import type { LandingCopy } from './types'

// A still of the chat: one spoken Tamil question and its answer.
export default function ChatPreview({ copy }: { copy: LandingCopy['preview'] }) {
  return (
    <figure className="lv-chat" data-ui aria-label={copy.label}>
      <div className="lv-chat-head">
        <span>AgroVoiceAI</span>
        <span>{copy.district}</span>
      </div>

      <div className="lv-msg lv-msg-you">
        <p lang="ta">{copy.q}</p>
        {copy.qt && <small>{copy.qt}</small>}
      </div>
      <div className="lv-msg">
        <p>{copy.a}</p>
      </div>

      <div className="lv-chat-input">
        <span>{copy.speak}</span>
        <span className="lv-wave" aria-hidden="true">
          {Array.from({ length: 5 }, (_, i) => (
            <i key={i} style={{ animationDelay: `${i * 120}ms` }} />
          ))}
        </span>
      </div>
    </figure>
  )
}
