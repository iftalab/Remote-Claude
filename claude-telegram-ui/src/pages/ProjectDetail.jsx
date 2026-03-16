import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getProjects, updateProjects, getTasks, getHistory } from '../api.js'
import eyeIcon from '../assets/icons/eye.svg'
import eyeSlashIcon from '../assets/icons/eye-slash.svg'

export default function ProjectDetail() {
  const { name } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('settings')

  useEffect(() => {
    loadProject()
  }, [name])

  async function loadProject() {
    try {
      setLoading(true)
      setError(null)
      const projects = await getProjects()
      const found = projects.find(p => p.name === name)

      if (!found) {
        setError('Project not found')
      } else {
        setProject(found)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">Loading project...</div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error || 'Project not found'}</p>
        <Link to="/" className="mt-2 text-blue-600 hover:text-blue-800 underline">
          ← Back to Projects
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link to="/" className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-800 font-medium transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Projects</span>
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6 bg-white/70 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/50 p-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <div className="flex items-center space-x-2 mt-1">
              <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <p className="text-gray-600 font-mono text-xs truncate">{project.dir}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <TabButton
            active={activeTab === 'settings'}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </TabButton>
          <TabButton
            active={activeTab === 'persona'}
            onClick={() => setActiveTab('persona')}
          >
            Persona
          </TabButton>
          <TabButton
            active={activeTab === 'tasks'}
            onClick={() => setActiveTab('tasks')}
          >
            Tasks
          </TabButton>
          <TabButton
            active={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
          >
            History
          </TabButton>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[600px]">
        {activeTab === 'settings' && <SettingsTab project={project} onUpdate={loadProject} navigate={navigate} />}
        {activeTab === 'persona' && <PersonaTab project={project} onUpdate={loadProject} />}
        {activeTab === 'tasks' && <TasksTab projectName={project.name} />}
        {activeTab === 'history' && <HistoryTab projectName={project.name} />}
      </div>
    </div>
  )
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`
        py-3 px-1 border-b-2 font-semibold text-sm transition-all duration-200
        ${active
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }
      `}
    >
      {children}
    </button>
  )
}

function SettingsTab({ project, onUpdate, navigate }) {
  const [formData, setFormData] = useState({
    name: project.name,
    token: project.token,
    dir: project.dir,
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [showToken, setShowToken] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  async function handleSave() {
    try {
      setSaving(true)
      setMessage(null)

      const originalName = project.name
      const nameChanged = formData.name !== originalName

      const projects = await getProjects()
      const updated = projects.map(p =>
        p.name === originalName ? { ...p, ...formData } : p
      )

      await updateProjects(updated)
      setMessage({ type: 'success', text: 'Settings saved successfully' })

      // Navigate to new URL if name changed
      if (nameChanged) {
        navigate(`/projects/${encodeURIComponent(formData.name)}`)
      } else {
        onUpdate()
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  async function handleBrowseDirectory() {
    try {
      if ('showDirectoryPicker' in window) {
        const dirHandle = await window.showDirectoryPicker()
        // We can't get the full path in browser for security reasons
        // But we can at least show the directory name
        setFormData({ ...formData, dir: dirHandle.name })
        setMessage({
          type: 'error',
          text: 'Note: Browser security prevents accessing full path. Please type the full path manually.'
        })
      } else {
        setMessage({
          type: 'error',
          text: 'Directory picker is not supported in this browser. Please type the path manually.'
        })
      }
    } catch (err) {
      // User cancelled or error occurred
      if (err.name !== 'AbortError') {
        setMessage({ type: 'error', text: err.message })
      }
    }
  }

  async function handleDelete() {
    try {
      setSaving(true)
      setMessage(null)

      const projects = await getProjects()
      const updated = projects.filter(p => p.name !== project.name)

      await updateProjects(updated)
      navigate('/')
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
      setSaving(false)
    }
  }

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/50 p-6 max-w-2xl">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Project Settings</h2>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          message.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Project Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Bot Token
          </label>
          <div className="relative">
            <input
              type={showToken ? "text" : "password"}
              value={formData.token}
              onChange={(e) => setFormData({ ...formData, token: e.target.value })}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              aria-label={showToken ? "Hide token" : "Show token"}
            >
              <img
                src={showToken ? eyeSlashIcon : eyeIcon}
                alt={showToken ? "Hide" : "Show"}
                className="h-5 w-5"
              />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Directory Path
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.dir}
              onChange={(e) => setFormData({ ...formData, dir: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={handleBrowseDirectory}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 whitespace-nowrap font-medium"
            >
              Browse...
            </button>
          </div>
        </div>

        <div className="flex gap-3 pt-4 mt-2 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2.5 px-5 rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={() => setShowDeleteDialog(true)}
            disabled={saving}
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-2.5 px-5 rounded-lg transition-colors"
          >
            Delete Project
          </button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6 transform animate-scaleIn">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Project</h2>
            <p className="text-gray-600 text-sm mb-6">
              Are you sure you want to delete <strong className="text-gray-900">{project.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={saving}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
              >
                {saving ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setShowDeleteDialog(false)}
                disabled={saving}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PersonaTab({ project, onUpdate }) {
  const [persona, setPersona] = useState(project.persona || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  async function handleSave() {
    try {
      setSaving(true)
      setMessage(null)

      const projects = await getProjects()
      const updated = projects.map(p =>
        p.name === project.name ? { ...p, persona } : p
      )

      await updateProjects(updated)
      setMessage({ type: 'success', text: 'Persona saved successfully' })
      onUpdate()
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/50 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Persona</h2>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          message.type === 'success'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      <textarea
        value={persona}
        onChange={(e) => setPersona(e.target.value)}
        rows={20}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        placeholder="Enter persona text..."
      />

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-gray-600">
          {persona.length} characters
        </span>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2.5 px-5 rounded-lg transition-colors"
        >
          {saving ? 'Saving...' : 'Save Persona'}
        </button>
      </div>

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          The persona is injected once when the Claude process starts. Use <code className="bg-blue-100 px-1.5 py-0.5 rounded font-mono text-xs">/reset</code> in Telegram to reload after changes.
        </p>
      </div>
    </div>
  )
}

function TasksTab({ projectName }) {
  const [tasks, setTasks] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadTasks()
  }, [projectName])

  async function loadTasks() {
    try {
      setLoading(true)
      setError(null)
      const data = await getTasks(projectName)
      setTasks(data.content)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/50 p-12 text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Loading tasks...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/50 p-6">
        <div className="flex items-center space-x-3 text-red-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-medium">Error loading tasks: {error}</p>
        </div>
      </div>
    )
  }

  if (!tasks) {
    return (
      <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/50 p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No tasks yet</h3>
        <p className="text-gray-600 text-sm max-w-md mx-auto">
          No TASKS.md file found in this project. Tasks will appear here once the agent creates a TASKS.md file.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Tasks</h2>
        <button
          onClick={loadTasks}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
        <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed">
          {tasks}
        </pre>
      </div>

      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">
          Read only — tasks are managed by the agent
        </p>
      </div>
    </div>
  )
}

function HistoryTab({ projectName }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadHistory()
  }, [projectName])

  async function loadHistory() {
    try {
      setLoading(true)
      setError(null)
      const data = await getHistory(projectName)
      setHistory(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/50 p-12 text-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Loading history...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/50 p-6">
        <div className="flex items-center space-x-3 text-red-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-medium">Error loading history: {error}</p>
        </div>
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/50 p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No history yet</h3>
        <p className="text-gray-600 text-sm max-w-md mx-auto">
          Start a conversation with your bot on Telegram and the history will appear here.
        </p>
      </div>
    )
  }

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-xl shadow-md border border-gray-200/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Conversation History</h2>
        <button
          onClick={loadHistory}
          className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {history.map((msg, i) => {
          const isError = msg.error || msg.content.startsWith('ERROR:')
          const isUser = msg.role === 'user'

          return (
            <div key={i} className={`rounded-lg p-4 ${
              isError ? 'bg-red-50 border-l-4 border-red-500' :
              isUser ? 'bg-blue-50 border-l-4 border-blue-500' :
              'bg-gray-50 border-l-4 border-green-500'
            }`}>
              <div className="flex items-center space-x-3 mb-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isError ? 'bg-red-200 text-red-800' :
                  isUser ? 'bg-blue-200 text-blue-800' :
                  'bg-green-200 text-green-800'
                }`}>
                  {isError ? 'Error' : isUser ? 'You' : 'Assistant'}
                </span>
                <span className="text-xs text-gray-500">{formatTimestamp(msg.timestamp)}</span>
              </div>
              <div className="text-gray-900 text-sm whitespace-pre-wrap break-words font-mono">
                {msg.content}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
