/**
 * Format parameter value based on its type
 * @param {*} value - The parameter value
 * @param {string} paramType - The type of parameter (currency, percentage, boolean, etc.)
 * @returns {string} - Formatted value string
 */
export const formatParameterValue = (value, paramType) => {
  if (value === null || value === undefined || value === '') return '';
  if (paramType === 'currency') return `₹${parseFloat(value).toLocaleString()}`;
  if (paramType === 'percentage') return `${value}%`;
  if (paramType === 'boolean') return value === true || value === 'true' ? 'Yes' : 'No';
  return String(value);
};

/**
 * Render template content by replacing parameter placeholders with actual values
 * @param {Object} template - Template object with content and parameters
 * @param {Object} parameters - Object containing parameter values keyed by parameter name
 * @returns {string} - HTML content with placeholders replaced
 */
export const renderTemplateContent = (template, parameters = {}) => {
  if (!template?.content) return '';

  let content = template.content;

  // Replace all parameter placeholders with actual values
  Object.keys(parameters).forEach((paramName) => {
    const value = parameters[paramName];
    const param = template.parameters?.find((p) => p.name === paramName);

    let displayValue = '';
    if (value !== null && value !== undefined && value !== '') {
      if (param?.type === 'currency') {
        displayValue = `₹${parseFloat(value).toLocaleString()}`;
      } else if (param?.type === 'percentage') {
        displayValue = `${value}%`;
      } else if (param?.type === 'boolean') {
        displayValue = value === true || value === 'true' ? 'Yes' : 'No';
      } else {
        displayValue = String(value);
      }
    }

    if (!displayValue) {
      displayValue = `[${paramName}]`;
    }

    // Replace {{...paramName...}} with formatted value, preserving any HTML tags
    // Simply replace paramName with value while keeping surrounding tags intact
    const regex = new RegExp(`\\{\\{([\\s\\S]*?)${paramName}([\\s\\S]*?)\\}\\}`, 'g');
    content = content.replace(regex, (match, beforeTags, afterTags) => {
      // Preserve tags around the parameter name
      return `{{${beforeTags}${displayValue}${afterTags}}}`.replace(/\{\{|\}\}/g, '');
    });
  });

  return content;
};
