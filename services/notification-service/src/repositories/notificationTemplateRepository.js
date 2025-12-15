const db = require('../config/database');

class NotificationTemplateRepository {
  async create(templateData) {
    const {
      organizationId,
      templateName,
      templateType,
      subject,
      bodyHtml,
      bodyText = null,
      variables = {},
      isActive = true
    } = templateData;

    const query = `
      INSERT INTO notification_templates (
        organization_id, template_name, template_type, subject,
        body_html, body_text, variables, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      organizationId,
      templateName,
      templateType,
      subject,
      bodyHtml,
      bodyText,
      JSON.stringify(variables),
      isActive
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  async findById(id) {
    const query = 'SELECT * FROM notification_templates WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByOrgAndName(organizationId, templateName) {
    const query = `
      SELECT * FROM notification_templates 
      WHERE organization_id = $1 AND template_name = $2 AND is_active = true
    `;
    
    const result = await db.query(query, [organizationId, templateName]);
    return result.rows[0] || null;
  }

  async findWithFallback(organizationId, templateName) {
    let template = await this.findByOrgAndName(organizationId, templateName);
    
    if (!template) {
      template = await this.findByOrgAndName(
        '00000000-0000-0000-0000-000000000000',
        templateName
      );
    }

    return template;
  }

  async findByOrganization(organizationId, includeInactive = false) {
    let query = `
      SELECT * FROM notification_templates 
      WHERE organization_id = $1
    `;
    
    if (!includeInactive) {
      query += ' AND is_active = true';
    }
    
    query += ' ORDER BY template_name';

    const result = await db.query(query, [organizationId]);
    return result.rows;
  }

  async update(id, updateData) {
    const updates = [];
    const values = [id];
    let paramIndex = 2;

    if (updateData.subject !== undefined) {
      updates.push(`subject = $${paramIndex++}`);
      values.push(updateData.subject);
    }

    if (updateData.bodyHtml !== undefined) {
      updates.push(`body_html = $${paramIndex++}`);
      values.push(updateData.bodyHtml);
    }

    if (updateData.bodyText !== undefined) {
      updates.push(`body_text = $${paramIndex++}`);
      values.push(updateData.bodyText);
    }

    if (updateData.variables !== undefined) {
      updates.push(`variables = $${paramIndex++}`);
      values.push(JSON.stringify(updateData.variables));
    }

    if (updateData.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(updateData.isActive);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');

    const query = `
      UPDATE notification_templates 
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }
}

module.exports = new NotificationTemplateRepository();
