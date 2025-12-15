const db = require("../config/database");

class NotificationRepository {
  async create(notificationData) {
    const {
      userId,
      organizationId,
      templateId,
      recipientEmail,
      subject,
      bodyHtml,
      bodyText,
      channel = "EMAIL",
      status = "PENDING",
      maxRetries = 3,
      metadata = {},
    } = notificationData;

    const query = `
      INSERT INTO notifications (
        user_id, organization_id, template_id, recipient_email, 
        subject, body_html, body_text, channel, status, max_retries, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      userId,
      organizationId || null,
      templateId || null,
      recipientEmail,
      subject,
      bodyHtml,
      bodyText || null,
      channel,
      status,
      maxRetries,
      JSON.stringify(metadata),
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  async findById(id) {
    const query = "SELECT * FROM notifications WHERE id = $1";
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  async updateStatus(id, status, additionalData = {}) {
    const updates = ["status = $2", "updated_at = CURRENT_TIMESTAMP"];
    const values = [id, status];
    let paramIndex = 3;

    if (status === "SENT" && additionalData.sentAt) {
      updates.push(`sent_at = $${paramIndex++}`);
      values.push(additionalData.sentAt || new Date());
    }

    if (status === "FAILED" && additionalData.failedAt) {
      updates.push(`failed_at = $${paramIndex++}`);
      values.push(additionalData.failedAt || new Date());
    }

    if (additionalData.retryCount !== undefined) {
      updates.push(`retry_count = $${paramIndex++}`);
      values.push(additionalData.retryCount);
    }

    if (additionalData.nextRetryAt) {
      updates.push(`next_retry_at = $${paramIndex++}`);
      values.push(additionalData.nextRetryAt);
    }

    const query = `
      UPDATE notifications 
      SET ${updates.join(", ")}
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  async getPendingForRetry(limit = 10) {
    const query = `
      SELECT * FROM notifications 
      WHERE status = 'PENDING' 
        AND retry_count < max_retries
        AND (next_retry_at IS NULL OR next_retry_at <= CURRENT_TIMESTAMP)
      ORDER BY created_at ASC
      LIMIT $1
    `;

    const result = await db.query(query, [limit]);
    return result.rows;
  }

  async incrementRetry(id) {
    const query = `
      UPDATE notifications 
      SET retry_count = retry_count + 1,
          next_retry_at = CURRENT_TIMESTAMP + INTERVAL '5 minutes',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;

    const result = await db.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = new NotificationRepository();
