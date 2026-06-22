// components/Calendar.jsx - Calendar Component for Work Universe
// Month view + modal for adding events
// Responsive (mobile/tablet/desktop)

import React, { useState, useEffect } from 'react'

export default function Calendar({ hospital = 'MWHC', onEventAdd }) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 5, 22)) // June 22, 2026
  const [events, setEvents] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    event_type: 'installation',
    title: '',
    description: '',
    risk_level: 'normal'
  })

  // Fetch events for current month
  useEffect(() => {
    fetchEvents()
  }, [currentDate, hospital])

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const month = currentDate.toISOString().slice(0, 7) // YYYY-MM
      const res = await fetch(`/api/calendar?hospital=${hospital}&month=${month}`)
      const data = await res.json()
      setEvents(data || [])
    } catch (error) {
      console.error('Failed to fetch events:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDateClick = (day) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    setSelectedDate(date.toISOString().split('T')[0])
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospital,
          event_date: selectedDate,
          ...formData
        })
      })

      if (res.ok) {
        const newEvent = await res.json()
        setEvents([...events, newEvent])
        setShowModal(false)
        setFormData({ event_type: 'installation', title: '', description: '', risk_level: 'normal' })
        if (onEventAdd) onEventAdd(newEvent)
      }
    } catch (error) {
      console.error('Failed to create event:', error)
    }
  }

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const getEventsForDay = (day) => {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      .toISOString()
      .split('T')[0]
    return events.filter(e => e.event_date === dateStr)
  }

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })
  const daysInMonth = getDaysInMonth(currentDate)
  const firstDay = getFirstDayOfMonth(currentDate)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i)

  return (
    <div className="w-full bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{hospital} - {monthName}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            ← Prev
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Days of week header */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center font-bold text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {/* Empty cells before month starts */}
        {emptyDays.map((_, i) => (
          <div key={`empty-${i}`} className="bg-gray-50 rounded p-2 min-h-24"></div>
        ))}

        {/* Days of month */}
        {days.map(day => {
          const dayEvents = getEventsForDay(day)
          const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
            .toISOString()
            .split('T')[0]
          const isToday = dateStr === new Date().toISOString().split('T')[0]

          return (
            <div
              key={day}
              onClick={() => handleDateClick(day)}
              className={`rounded p-2 min-h-24 cursor-pointer border-2 ${
                isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="font-bold mb-1">{day}</div>
              <div className="text-xs space-y-1">
                {dayEvents.map(event => (
                  <div
                    key={event.id}
                    className={`p-1 rounded text-white text-xs truncate ${
                      event.risk_level === 'critical'
                        ? 'bg-red-500'
                        : event.risk_level === 'warning'
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    title={event.title}
                  >
                    {event.title}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Event Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Add Event for {selectedDate}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Event Type</label>
                <select
                  value={formData.event_type}
                  onChange={e => setFormData({ ...formData, event_type: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="installation">Installation</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="thermal-anomaly">Thermal Anomaly</option>
                  <option value="payment-due">Payment Due</option>
                  <option value="deliverable-due">Deliverable Due</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  rows="3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Risk Level</label>
                <select
                  value={formData.risk_level}
                  onChange={e => setFormData({ ...formData, risk_level: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                >
                  <option value="normal">Normal</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Add Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
