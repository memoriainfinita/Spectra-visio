import { noticeStore } from '../app/notices'
import { useStore } from './useStore'

// The app's notices, announced to screen readers as they come.
export function Notices() {
  const notice = useStore(noticeStore)
  return (
    <div className="notices" role="status">
      {notice && <p key={notice.id}>{notice.text}</p>}
    </div>
  )
}
