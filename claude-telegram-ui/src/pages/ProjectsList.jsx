import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getProjects, updateProjects, getBotInfo } from '../api.js'
import AddProjectDialog from '../components/AddProjectDialog.jsx'

export default function ProjectsList() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showAddDialog, setShowAddDialog] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    try {
      setLoading(true)
      setError(null)
      const data = await getProjects()
      setProjects(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleAddProject(newProject) {
    // Check if project name already exists
    if (projects.some(p => p.name === newProject.name)) {
      throw new Error('A project with this name already exists')
    }

    // Add new project to the list
    const updatedProjects = [...projects, newProject]
    await updateProjects(updatedProjects)

    // Reload projects
    await loadProjects()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">Loading projects...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error loading projects: {error}</p>
        <button
          onClick={loadProjects}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Projects
          </h1>
          <p className="text-gray-600 mt-2">Manage your Claude-Telegram bridge projects</p>
        </div>
        <button
          onClick={() => setShowAddDialog(true)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Project</span>
        </button>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">Get started by creating your first Claude-Telegram bridge project</p>
          <button
            onClick={() => setShowAddDialog(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
          >
            Add Your First Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.name} project={project} />
          ))}
        </div>
      )}

      {/* Add Project Dialog */}
      <AddProjectDialog
        isOpen={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onAdd={handleAddProject}
      />
    </div>
  )
}

function ProjectCard({ project }) {
  const [botInfo, setBotInfo] = useState(null)
  const [loadingBot, setLoadingBot] = useState(true)

  useEffect(() => {
    async function fetchBotInfo() {
      try {
        setLoadingBot(true)
        const info = await getBotInfo(project.name)
        setBotInfo(info)
      } catch (error) {
        console.error('Failed to fetch bot info:', error)
        setBotInfo({ status: 'error', error: error.message })
      } finally {
        setLoadingBot(false)
      }
    }
    fetchBotInfo()
  }, [project.name])

  // Extract persona name (first line, truncated)
  const personaName = project.persona
    ? project.persona.split('\n')[0].substring(0, 60)
    : 'No persona'

  return (
    <Link
      to={`/projects/${encodeURIComponent(project.name)}`}
      className="group block bg-white/70 backdrop-blur-sm rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 p-6 border border-gray-200/50 hover:border-blue-300/50 transform hover:-translate-y-1"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
              {project.name}
            </h2>
            {!loadingBot && botInfo?.status === 'success' && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">@{botInfo.bot.username}</p>
            )}
          </div>
        </div>
        {!loadingBot && (
          <div className="flex-shrink-0 ml-3">
            {botInfo?.status === 'success' ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 whitespace-nowrap">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
                Connected
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-red-100 to-rose-100 text-red-700 whitespace-nowrap">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1.5"></span>
                Error
              </span>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3 text-sm">
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
          <div className="flex items-center space-x-2 mb-1">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <span className="text-xs font-medium text-gray-500 uppercase">Directory</span>
          </div>
          <p className="text-gray-700 font-mono text-xs truncate">
            {project.dir}
          </p>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-100">
          <div className="flex items-center space-x-2 mb-1">
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs font-medium text-blue-600 uppercase">Persona</span>
          </div>
          <p className="text-gray-700 text-xs truncate">{personaName}</p>
        </div>
      </div>
    </Link>
  )
}
