/**
 * Email Template Utilities
 * Provides helper functions for creating and formatting email content
 */

/**
 * Get email subject based on notification type
 */
export function getEmailSubject(type: string, data?: any): string {
  switch (type) {
    case 'timetable_published':
      return `📅 New Timetable Published - ${data?.batchName || 'Your Batch'}`;
    
    case 'schedule_change':
      return `⚠️ Schedule Change Alert - ${data?.subjectName || 'Class Update'}`;
    
    case 'urgent_update':
      return `🚨 URGENT: Important Update - Action Required`;
    
    case 'class_cancelled':
      return `❌ Class Cancelled - ${data?.subjectName || 'Notification'}`;
    
    case 'exam_schedule':
      return `📝 Exam Schedule Released - ${data?.semester || 'Your Semester'}`;
    
    case 'result_published':
      return `📊 Results Published - ${data?.examName || 'Examination'}`;
    
    default:
      return `📬 Notification from Academic Compass`;
  }
}

/**
 * Format date for email display
 */
export function formatEmailDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return dateObj.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Format time for email display
 */
export function formatEmailTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Create greeting based on time of day
 */
export function getTimeBasedGreeting(): string {
  const hour = new Date().getHours();
  
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

/**
 * Get role-specific message
 */
export function getRoleSpecificMessage(role: 'student' | 'faculty', type: string): string {
  if (role === 'student') {
    switch (type) {
      case 'timetable_published':
        return 'Your class timetable has been published and is now available for viewing.';
      case 'schedule_change':
        return 'There has been a change in your class schedule. Please review the details below.';
      default:
        return 'You have a new notification from Academic Compass.';
    }
  } else {
    switch (type) {
      case 'timetable_published':
        return 'A new timetable has been published for your assigned batches.';
      case 'schedule_change':
        return 'There has been a schedule change that affects your assigned classes.';
      default:
        return 'You have a new notification from Academic Compass.';
    }
  }
}

/**
 * Create email footer content
 */
export function getEmailFooter(): string {
  return `
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
      <p><strong>Academic Compass</strong><br>
      ${process.env.COLLEGE_NAME || 'Government College of Education'}<br>
      ${process.env.COLLEGE_WEBSITE || 'https://gcoej.edu.in'}</p>
      
      <p style="margin-top: 15px;">
        Need help? Contact us at 
        <a href="mailto:${process.env.COLLEGE_SUPPORT_EMAIL || 'support@gcoej.edu.in'}" style="color: #3b82f6; text-decoration: none;">
          ${process.env.COLLEGE_SUPPORT_EMAIL || 'support@gcoej.edu.in'}
        </a>
      </p>
      
      <p style="margin-top: 15px; color: #9ca3af; font-size: 11px;">
        This is an automated email from Academic Compass. Please do not reply to this email.
        If you believe you received this email by mistake, please contact your administrator.
      </p>
    </div>
  `;
}

/**
 * Create action button HTML
 */
export function createActionButton(text: string, url: string, color: string = '#3b82f6'): string {
  return `
    <table cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
      <tr>
        <td style="border-radius: 6px; background-color: ${color};">
          <a href="${url}" 
             target="_blank" 
             style="display: inline-block; padding: 12px 30px; font-size: 16px; color: #ffffff; text-decoration: none; font-weight: 600;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `;
}

/**
 * Create info box HTML
 */
export function createInfoBox(title: string, items: { label: string; value: string }[]): string {
  const itemsHtml = items
    .map(item => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
          <strong style="color: #374151;">${item.label}:</strong>
        </td>
        <td style="padding: 8px 0; border-bottom: 1px solid #f3f4f6; text-align: right; color: #1f2937;">
          ${item.value}
        </td>
      </tr>
    `)
    .join('');

  return `
    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #1f2937; font-size: 16px;">${title}</h3>
      <table cellpadding="0" cellspacing="0" border="0" style="width: 100%;">
        ${itemsHtml}
      </table>
    </div>
  `;
}

/**
 * Create alert box HTML
 */
export function createAlertBox(message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info'): string {
  const colors = {
    info: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
    warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
    error: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b' },
    success: { bg: '#dcfce7', border: '#10b981', text: '#065f46' }
  };

  const color = colors[type];

  return `
    <div style="background-color: ${color.bg}; border-left: 4px solid ${color.border}; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: ${color.text}; font-size: 14px; line-height: 1.5;">
        ${message}
      </p>
    </div>
  `;
}

/**
 * Sanitize email content to prevent XSS
 */
export function sanitizeEmailContent(content: string): string {
  return content
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Create email wrapper with consistent styling
 */
export function wrapEmailContent(content: string, preheader?: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>Academic Compass Notification</title>
      ${preheader ? `<style type="text/css">.preheader { display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; }</style>` : ''}
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      ${preheader ? `<div class="preheader">${preheader}</div>` : ''}
      
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f3f4f6; padding: 20px 0;">
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <tr>
                <td style="padding: 40px 30px;">
                  ${content}
                  ${getEmailFooter()}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}
