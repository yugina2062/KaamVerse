import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { api, ApiError } from '@/lib/api/client'
import type { ApiConversation, ApiMessage, ApiUser } from '@/lib/api/types'
import { showToast } from '@/components/ui/SystemFeedback'

type MessageFilter = 'all' | 'jobs' | 'unread' | 'groups'

function displayName(user: ApiUser | undefined) {
  if (!user) return 'KaamVerse user'
  return `${user.first_name} ${user.last_name}`.trim() || user.employer_profile?.business_name || user.email
}

function initials(user: ApiUser | undefined) {
  return displayName(user).split(/\s+/).slice(0, 2).map(value => value[0]).join('').toUpperCase() || 'KV'
}

function avatarUrl(user: ApiUser | undefined) {
  return user?.avatar || ''
}

function roleLabel(user: ApiUser | undefined) {
  if (!user) return 'KaamVerse member'
  if (user.role === 'seeker') return user.seeker_profile?.headline || 'Jobseeker'
  if (user.role === 'employer') return user.employer_profile?.business_name || 'Company employer'
  if (user.role === 'employer-individual') return 'Individual employer'
  return 'Administrator'
}

function messageTime(value: string) {
  const date = new Date(value)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function Avatar({ user, size = 'md' }: { user: ApiUser | undefined; size?: 'sm' | 'md' | 'lg' }) {
  const classes = size === 'lg' ? 'w-16 h-16 text-lg' : size === 'sm' ? 'w-8 h-8 text-[10px]' : 'w-11 h-11 text-xs'
  return avatarUrl(user) ? (
    <img src={avatarUrl(user)} alt={displayName(user)} className={`${classes} rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm shrink-0`} />
  ) : (
    <div className={`${classes} rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-extrabold shrink-0`}>{initials(user)}</div>
  )
}

export function MessagesWorkspace() {
  const [me, setMe] = useState<ApiUser | null>(null)
  const [conversations, setConversations] = useState<ApiConversation[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ApiMessage[]>([])
  const [draft, setDraft] = useState('')
  const [attachment, setAttachment] = useState<File | null>(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<MessageFilter>('all')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messageEndRef = useRef<HTMLDivElement>(null)
  const workspaceRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  useLayoutEffect(() => {
    let element: HTMLElement | null = workspaceRef.current
    while (element) {
      if (element.scrollTop) element.scrollTop = 0
      element = element.parentElement
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])

  const loadConversations = async (selectFirst = false) => {
    try {
      const page = await api.conversations.list()
      setConversations(page.results)
      setActiveId(current => current ?? (selectFirst ? page.results[0]?.id ?? null : null))
    } catch (error) {
      showToast('error', 'Messages unavailable', error instanceof ApiError ? error.message : 'Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (conversationId: number) => {
    try {
      const result = await api.conversations.messages(conversationId)
      setMessages(result)
      setConversations(current => current.map(item => item.id === conversationId ? { ...item, unread_count: 0 } : item))
    } catch (error) {
      showToast('error', 'Conversation unavailable', error instanceof ApiError ? error.message : 'Please try again.')
    }
  }

  useEffect(() => {
    api.auth.me().then(setMe).catch(() => undefined)
    void loadConversations(true)
    const timer = window.setInterval(() => void loadConversations(), 10000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!activeId) {
      setMessages([])
      return
    }
    void loadMessages(activeId)
    const timer = window.setInterval(() => void loadMessages(activeId), 8000)
    return () => window.clearInterval(timer)
  }, [activeId])

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!recording) return
    const timer = window.setInterval(() => setRecordingSeconds(value => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [recording])

  useEffect(() => () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
    mediaStreamRef.current?.getTracks().forEach(track => track.stop())
  }, [])

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      showToast('warning', 'Voice recording unavailable', 'This browser does not support microphone recording.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      mediaStreamRef.current = stream
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []
      recorder.ondataavailable = event => { if (event.data.size) audioChunksRef.current.push(event.data) }
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm'
        const extension = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'm4a' : 'webm'
        const blob = new Blob(audioChunksRef.current, { type: mimeType })
        if (blob.size) setAttachment(new File([blob], `voice-message-${Date.now()}.${extension}`, { type: mimeType }))
        stream.getTracks().forEach(track => track.stop())
        mediaStreamRef.current = null
      }
      setRecordingSeconds(0)
      setRecording(true)
      recorder.start()
    } catch {
      showToast('error', 'Microphone access denied', 'Allow microphone access in the browser to record a voice message.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
    setRecording(false)
  }

  const send = async () => {
    const body = draft.trim()
    if ((!body && !attachment) || !activeId || sending) return
    const pendingFile = attachment
    setDraft('')
    setAttachment(null)
    setSending(true)
    try {
      const sent = await api.conversations.send(activeId, body, pendingFile)
      setMessages(current => [...current, sent])
      await loadConversations()
    } catch (error) {
      setDraft(body)
      setAttachment(pendingFile)
      showToast('error', 'Message not sent', error instanceof ApiError ? error.message : 'Please try again.')
    } finally {
      setSending(false)
    }
  }

  const filteredConversations = useMemo(() => {
    const unique = new Map<string, ApiConversation>()
    conversations.forEach(conversation => {
      const participantKey = conversation.participants.map(user => user.id).sort((a, b) => a - b).join('-')
      const key = `${participantKey}:${conversation.job ?? 'none'}:${conversation.subject.trim().toLowerCase()}`
      if (!unique.has(key)) unique.set(key, conversation)
    })
    return Array.from(unique.values()).filter(conversation => {
    const names = conversation.participants.map(displayName).join(' ')
    const content = `${names} ${conversation.subject} ${conversation.last_message?.body || ''}`.toLowerCase()
    if (search.trim() && !content.includes(search.trim().toLowerCase())) return false
    if (filter === 'jobs' && !conversation.job) return false
    if (filter === 'unread' && conversation.unread_count < 1) return false
    if (filter === 'groups' && conversation.participants.length < 3) return false
    return true
    })
  }, [conversations, filter, search])

  const active = conversations.find(item => item.id === activeId)
  const other = active?.participants.find(user => user.id !== me?.id)
  const sharedFiles = messages.filter(message => message.attachment)

  const startVoiceCall = () => {
    if (!active) return
    window.open(`https://meet.jit.si/KaamVerse-Voice-${active.id}#config.startAudioOnly=true&config.startWithVideoMuted=true`, '_blank', 'noopener,noreferrer')
    showToast('info', 'Voice call opened', 'The secure browser call opened in a new tab.')
  }

  const startVideoCall = () => {
    if (active) window.open(`https://meet.jit.si/KaamVerse-Conversation-${active.id}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div ref={workspaceRef} className="sticky top-0 h-[calc(100vh-4rem)] bg-slate-50 dark:bg-slate-950">
      <div className={`relative h-full min-h-[36rem] grid grid-cols-[18rem_minmax(0,1fr)] ${showDetails ? 'lg:grid-cols-[18rem_minmax(0,1fr)_17rem]' : 'lg:grid-cols-[18rem_minmax(0,1fr)]'} overflow-hidden border-y border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900`}>
        <aside className="border-r border-slate-100 dark:border-slate-800 flex flex-col min-w-0">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search conversations..." className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1">
              {([['all', 'All'], ['jobs', 'Jobs'], ['unread', 'Unread'], ['groups', 'Groups']] as const).map(([id, label]) => (
                <button key={id} onClick={() => setFilter(id)} className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap ${filter === id ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300'}`}>{label}</button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && <p className="p-5 text-sm text-slate-400">Loading conversations...</p>}
            {filteredConversations.map(conversation => {
              const person = conversation.participants.find(user => user.id !== me?.id)
              const selected = activeId === conversation.id
              return (
                <button key={conversation.id} onClick={() => setActiveId(conversation.id)} className={`w-full px-3 py-3.5 text-left border-b border-slate-100 dark:border-slate-800 transition-colors ${selected ? 'bg-blue-50 dark:bg-blue-950/50 border-l-[3px] border-l-blue-600' : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-l-[3px] border-l-transparent'}`}>
                  <div className="flex items-start gap-3">
                    <div className="relative"><Avatar user={person} />{person?.is_active && <span className="absolute right-0 bottom-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2"><p className="text-xs font-bold text-slate-900 dark:text-white truncate">{displayName(person)}</p><span className="text-[10px] text-slate-400 shrink-0">{conversation.last_message ? messageTime(conversation.last_message.created_at) : ''}</span></div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-1"><span className="font-semibold text-blue-600">{conversation.subject || roleLabel(person)}</span></p>
                      <div className="flex items-center gap-2 mt-1"><p className="text-[11px] text-slate-400 truncate flex-1">{conversation.last_message?.attachment_name ? `📎 ${conversation.last_message.attachment_name}` : conversation.last_message?.body || 'Start the conversation'}</p>{conversation.unread_count > 0 && <span className="min-w-5 h-5 px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">{conversation.unread_count}</span>}</div>
                    </div>
                  </div>
                </button>
              )
            })}
            {!loading && !filteredConversations.length && <div className="p-8 text-center"><p className="text-sm font-semibold text-slate-600 dark:text-slate-300">No conversations found</p><p className="text-xs text-slate-400 mt-1">Try another filter or start a conversation from a job or profile.</p></div>}
          </div>
        </aside>

        <main className="min-w-0 flex flex-col bg-slate-50/60 dark:bg-slate-950/50">
          {active ? (
            <>
              <header className="sticky top-0 z-20 h-16 px-5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3">
                <Avatar user={other} size="sm" />
                <div className="min-w-0"><h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">{displayName(other)}</h2><p className="text-[11px] text-emerald-500 truncate">Online now</p></div>
                <div className="ml-auto flex items-center gap-1">
                  <button onClick={startVoiceCall} title="Start voice call" aria-label="Start voice call" className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5.25C3 4.56 3.56 4 4.25 4h2.1c.6 0 1.12.42 1.23 1.01l.5 2.7a1.25 1.25 0 0 1-.36 1.13l-1.5 1.5a15.5 15.5 0 0 0 7.44 7.44l1.5-1.5c.3-.3.72-.43 1.13-.36l2.7.5c.59.11 1.01.63 1.01 1.23v2.1c0 .69-.56 1.25-1.25 1.25H18C9.72 21 3 14.28 3 6V5.25Z"/></svg></button>
                  <button onClick={startVideoCall} title="Start video call" aria-label="Start video call" className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="6" width="13" height="12" rx="2"/><path strokeLinecap="round" strokeLinejoin="round" d="m16 10 5-3v10l-5-3"/></svg></button>
                  <button onClick={() => setShowDetails(value => !value)} title="Conversation details" aria-label="Toggle conversation details" aria-pressed={showDetails} className={`w-9 h-9 rounded-xl flex items-center justify-center hover:bg-blue-50 dark:hover:bg-blue-950 ${showDetails ? 'text-blue-600 bg-blue-50 dark:bg-blue-950' : 'text-slate-400'}`}><svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg></button>
                </div>
              </header>

              <div className="flex-1 overflow-y-auto px-4 sm:px-7 py-5 space-y-4">
                <div className="flex items-center gap-3"><span className="h-px bg-slate-200 dark:bg-slate-800 flex-1"/><span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Conversation</span><span className="h-px bg-slate-200 dark:bg-slate-800 flex-1"/></div>
                {messages.map(message => {
                  const mine = message.sender === me?.id
                  const sender = active.participants.find(user => user.id === message.sender)
                  return (
                    <div key={message.id} className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                      {!mine && <Avatar user={sender} size="sm" />}
                      <div className={`max-w-[78%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                        {message.body && <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${mine ? 'bg-blue-600 text-white rounded-br-md' : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-md'}`}>{message.body}</div>}
                        {message.attachment && /\.(webm|mp3|wav|ogg|m4a)$/i.test(message.attachment_name || message.attachment) ? <div className={`mt-1 min-w-64 px-3 py-3 rounded-xl border ${mine ? 'bg-blue-700 border-blue-500 text-white' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}><p className="text-[10px] font-bold mb-2">Voice message</p><audio controls preload="metadata" src={message.attachment} className="h-9 w-full" /></div> : message.attachment && <a href={message.attachment} target="_blank" rel="noreferrer" className={`mt-1 w-full min-w-56 px-3 py-3 rounded-xl border flex items-center gap-3 transition-colors ${mine ? 'bg-blue-700 border-blue-500 text-white hover:bg-blue-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300'}`}><span className={`w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold ${mine ? 'bg-white/15' : 'bg-red-50 text-red-600'}`}>DOC</span><span className="min-w-0 flex-1"><span className="block text-xs font-bold truncate">{message.attachment_name || 'Shared file'}</span><span className={`block text-[10px] mt-0.5 ${mine ? 'text-blue-100' : 'text-slate-400'}`}>Open or download attachment</span></span><span aria-hidden>↓</span></a>}
                        <span className="text-[10px] text-slate-400 mt-1 px-1">{messageTime(message.created_at)}{mine ? ' · Sent' : ''}</span>
                      </div>
                    </div>
                  )
                })}
                {!messages.length && <div className="h-full flex items-center justify-center text-center"><div><p className="text-3xl">💬</p><p className="font-bold text-slate-700 dark:text-slate-200 mt-2">Start the conversation</p><p className="text-xs text-slate-400 mt-1">Messages and files are stored securely.</p></div></div>}
                <div ref={messageEndRef} />
              </div>

              <footer className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                {attachment && <div className="mb-2 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center gap-2 text-xs"><span>📎</span><span className="truncate flex-1 font-semibold text-blue-700 dark:text-blue-300">{attachment.name}</span><button onClick={() => setAttachment(null)} className="text-slate-400 hover:text-red-500" aria-label="Remove attachment">×</button></div>}
                <div className="flex items-end gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 p-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-950">
                  <input ref={fileInputRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt" onChange={event => setAttachment(event.target.files?.[0] || null)} />
                  <button onClick={() => fileInputRef.current?.click()} className="w-9 h-9 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 flex items-center justify-center" title="Attach a file" aria-label="Attach a file">＋</button>
                  <textarea value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send() } }} rows={1} maxLength={5000} placeholder={`Message ${displayName(other)}...`} className="flex-1 min-h-9 max-h-28 resize-none bg-transparent px-2 py-2 text-sm text-slate-900 dark:text-white outline-none" />
                  <button onClick={() => recording ? stopRecording() : void startRecording()} className={`w-9 h-9 rounded-xl flex items-center justify-center ${recording ? 'bg-red-50 text-red-600 animate-pulse' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950'}`} title={recording ? `Stop recording (${recordingSeconds}s)` : 'Record voice message'} aria-label={recording ? 'Stop recording' : 'Record voice message'}><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="9" y="3" width="6" height="11" rx="3"/><path strokeLinecap="round" d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/></svg></button>
                  <button onClick={() => void send()} disabled={sending || (!draft.trim() && !attachment)} className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white flex items-center justify-center shadow-sm" aria-label="Send message"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="m4 4 16 8-16 8 3-8-3-8Z"/><path d="M7 12h13"/></svg></button>
                </div>
                <p className="text-center text-[9px] uppercase tracking-widest text-slate-300 mt-2">Press Enter to send · Shift + Enter for a new line</p>
              </footer>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-center p-8"><div><div className="text-5xl mb-3">💬</div><p className="font-semibold text-slate-700 dark:text-slate-200">Select a conversation</p><p className="text-sm text-slate-400 mt-1">Your messages will appear here.</p></div></div>
          )}
        </main>

        {showDetails && <aside className="absolute inset-y-0 right-0 z-30 w-[17rem] lg:static lg:w-auto flex border-l border-slate-100 dark:border-slate-800 flex-col overflow-y-auto bg-white dark:bg-slate-900 shadow-2xl lg:shadow-none">
          {active && <>
            <div className="relative p-5 text-center border-b border-slate-100 dark:border-slate-800"><button onClick={() => setShowDetails(false)} aria-label="Close conversation details" className="absolute right-3 top-3 w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800">×</button><div className="flex justify-center"><Avatar user={other} size="lg" /></div><h3 className="font-bold text-slate-900 dark:text-white mt-3">{displayName(other)}</h3><p className="text-xs text-slate-400 mt-1">{roleLabel(other)}</p><div className="flex justify-center gap-2 mt-3"><span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700">Verified</span><span className="text-[10px] font-bold px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700">Trust {other?.trust_score ?? 0}</span></div></div>
            <div className="p-4 border-b border-slate-100 dark:border-slate-800"><h4 className="text-[11px] uppercase tracking-wider font-extrabold text-slate-500">Call controls</h4><div className="grid grid-cols-2 gap-2 mt-3"><button onClick={startVoiceCall} className="py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600">Voice call</button><button onClick={startVideoCall} className="py-2 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-700">Video call</button></div></div>
            <div className="p-4 border-b border-slate-100 dark:border-slate-800"><h4 className="text-[11px] uppercase tracking-wider font-extrabold text-slate-500">Conversation details</h4><dl className="mt-3 space-y-2 text-xs"><div><dt className="text-slate-400">Subject</dt><dd className="font-semibold text-slate-700 dark:text-slate-200 mt-0.5">{active.subject || 'General conversation'}</dd></div>{active.job && <div><dt className="text-slate-400">Related job</dt><dd className="font-semibold text-blue-600 mt-0.5">Job #{active.job}</dd></div>}</dl></div>
            <div className="p-4 border-b border-slate-100 dark:border-slate-800"><div className="flex items-center justify-between"><h4 className="text-[11px] uppercase tracking-wider font-extrabold text-slate-500">Shared files</h4><span className="text-[10px] text-slate-400">{sharedFiles.length}</span></div><div className="space-y-2 mt-3">{sharedFiles.slice(-6).reverse().map(file => <a key={file.id} href={file.attachment || '#'} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"><span className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-sm">📄</span><span className="min-w-0"><span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">{file.attachment_name}</span><span className="block text-[9px] text-slate-400 mt-0.5">{messageTime(file.created_at)}</span></span></a>)}{!sharedFiles.length && <p className="text-xs text-slate-400 py-3">No files shared yet.</p>}</div></div>
            <div className="p-4"><h4 className="text-[11px] uppercase tracking-wider font-extrabold text-slate-500">Participants ({active.participants.length})</h4><div className="space-y-3 mt-3">{active.participants.map(participant => <div key={participant.id} className="flex items-center gap-2"><Avatar user={participant} size="sm"/><div className="min-w-0"><p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{participant.id === me?.id ? 'You' : displayName(participant)}</p><p className="text-[10px] text-slate-400 truncate">{roleLabel(participant)}</p></div></div>)}</div></div>
          </>}
        </aside>}
      </div>
    </div>
  )
}
