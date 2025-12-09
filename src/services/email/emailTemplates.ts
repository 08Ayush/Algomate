import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import juice from 'juice';

export async function renderTemplate(templateName: string, data: any): Promise<string> {
  try {
    // Load base layout
    const layoutPath = path.join(process.cwd(), 'templates/email/layouts/base.hbs');
    const layoutContent = await fs.readFile(layoutPath, 'utf-8');
    
    // Load specific template
    const templatePath = path.join(process.cwd(), `templates/email/${templateName}.hbs`);
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    
    // Compile templates
    const layoutTemplate = Handlebars.compile(layoutContent);
    const bodyTemplate = Handlebars.compile(templateContent);
    
    // Render body
    const bodyHtml = bodyTemplate({
      ...data,
      collegeName: process.env.COLLEGE_NAME || 'Academic Compass',
      collegeWebsite: process.env.COLLEGE_WEBSITE || 'https://academiccompass.edu',
    });
    
    // Render full email with layout
    const fullHtml = layoutTemplate({
      body: bodyHtml,
      subject: data.subject,
      collegeName: process.env.COLLEGE_NAME || 'Academic Compass',
      collegeWebsite: process.env.COLLEGE_WEBSITE || 'https://academiccompass.edu',
      supportEmail: process.env.COLLEGE_SUPPORT_EMAIL || 'support@academiccompass.edu',
      year: new Date().getFullYear(),
    });
    
    // Inline CSS for better email client compatibility
    const inlinedHtml = juice(fullHtml);
    
    return inlinedHtml;
  } catch (error) {
    console.error('❌ Template rendering error:', error);
    throw error;
  }
}

// Register Handlebars helpers
Handlebars.registerHelper('formatDate', (date: Date | string) => {
  return new Date(date).toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
});

Handlebars.registerHelper('formatTime', (time: string) => {
  if (!time) return '';
  // Handle time in HH:MM or HH:MM:SS format
  const timeParts = time.split(':');
  const hours = parseInt(timeParts[0]);
  const minutes = timeParts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${ampm}`;
});

Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
Handlebars.registerHelper('ne', (a: any, b: any) => a !== b);
Handlebars.registerHelper('gt', (a: any, b: any) => a > b);
Handlebars.registerHelper('lt', (a: any, b: any) => a < b);
