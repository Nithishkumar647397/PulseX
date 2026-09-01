export function generateReminderEmailHtml(
  title: string,
  category: string,
  eventDate: string,
  priority: number,
  stage: string
) {
  const pLabel = priority >= 3 ? 'High' : priority === 2 ? 'Medium' : 'Low'
  const pColor = priority >= 3 ? '#ef4444' : priority === 2 ? '#f59e0b' : '#6b7280'

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111827;">
      <div style="background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 12px; padding: 24px;">
        <h2 style="margin-top: 0; color: #111827;">PulseX Reminder</h2>
        <p style="font-size: 16px; color: #4b5563;">
          This is your <strong>${stage}</strong> reminder for an upcoming task.
        </p>
        
        <div style="background-color: white; border-radius: 8px; padding: 16px; border: 1px solid #e5e7eb; margin-top: 24px;">
          <h3 style="margin-top: 0; font-size: 18px;">${title}</h3>
          
          <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 16px; font-size: 14px;">
            <div><strong>Date & Time:</strong> ${new Date(eventDate).toLocaleString()}</div>
            <div><strong>Category:</strong> <span style="text-transform: capitalize;">${category}</span></div>
            <div>
              <strong>Priority:</strong> 
              <span style="color: ${pColor}; font-weight: bold;">${pLabel}</span>
            </div>
          </div>
        </div>

        <p style="margin-top: 24px; font-size: 12px; color: #9ca3af; text-align: center;">
          Sent by PulseX — keeping track for you.
        </p>
      </div>
    </div>
  `
}

export function generateConflictEmailHtml(date: string, events: any[]) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #111827;">
      <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 24px;">
        <h2 style="margin-top: 0; color: #92400e;">⚠️ Schedule Conflict Detected</h2>
        <p style="font-size: 16px; color: #92400e;">
          We noticed you have multiple high-priority tasks scheduled for <strong>${new Date(date).toLocaleDateString()}</strong>.
        </p>
        
        <ul style="margin-top: 24px; padding-left: 20px;">
          ${events.map(e => `
            <li style="margin-bottom: 12px;">
              <strong>${e.title}</strong> (${new Date(e.event_date).toLocaleTimeString()})<br/>
              <span style="font-size: 12px; color: #b45309;">Priority: ${e.priority >= 3 ? 'High' : 'Medium'} | Category: ${e.category}</span>
            </li>
          `).join('')}
        </ul>

        <p style="margin-top: 24px; font-size: 14px; color: #92400e;">
          Consider adjusting your schedule to ensure you have enough time to prepare.
        </p>
      </div>
    </div>
  `
}
