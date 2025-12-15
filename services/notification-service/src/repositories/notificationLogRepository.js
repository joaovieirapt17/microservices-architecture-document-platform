const db = require('../config/database');

class NotificationLogRepository {
  async create(logData) {
    const {
      notificationId,
      sourceService,
      eventType,
      recipient,
      channel = 'EMAIL',
      status,
      errorMessage = null,
      errorCode = null,
      smtpResponse = null,
      metadata = {}
    } = logData;

    const query = `
      INSERT INTO notification_logs (
        notification_id, source_service, event_type, recipient,
        channel, status, error_message, error_code, smtp_response, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      notificationId,
      sourceService,
      eventType,
      recipient,
      channel,
      status,
      errorMessage,
      errorCode,
      smtpResponse,
      JSON.stringify(metadata)
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  async findByNotificationId(notificationId) {
    const query = `
      SELECT * FROM notification_logs 
      WHERE notification_id = $1 
      ORDER BY created_at DESC
    `;

    const result = await db.query(query, [notificationId]);
    return result.rows;
  }

  async findAll(filters = {}, limit = 50, offset = 0) {
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }

    if (filters.channel) {
      conditions.push(`channel = $${paramIndex++}`);
      values.push(filters.channel);
    }

    if (filters.sourceService) {
      conditions.push(`source_service = $${paramIndex++}`);
      values.push(filters.sourceService);
    }

    if (filters.eventType) {
      conditions.push(`event_type = $${paramIndex++}`);
      values.push(filters.eventType);
    }

    if (filters.startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      values.push(filters.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    values.push(limit, offset);

    const query = `
      SELECT 
        l.*,
        n.user_id,
        n.subject
      FROM notification_logs l
      LEFT JOIN notifications n ON l.notification_id = n.id
      ${whereClause}
      ORDER BY l.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `;

    const result = await db.query(query, values);
    return result.rows;
  }

  async count(filters = {}) {
    const conditions = [];
    const values = [];
    let paramIndex = 1;

    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }

    if (filters.channel) {
      conditions.push(`channel = $${paramIndex++}`);
      values.push(filters.channel);
    }

    if (filters.sourceService) {
      conditions.push(`source_service = $${paramIndex++}`);
      values.push(filters.sourceService);
    }

    if (filters.eventType) {
      conditions.push(`event_type = $${paramIndex++}`);
      values.push(filters.eventType);
    }

    if (filters.startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      values.push(filters.endDate);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `SELECT COUNT(*) as total FROM notification_logs ${whereClause}`;

    const result = await db.query(query, values);
    return parseInt(result.rows[0].total);
  }
}

module.exports = new NotificationLogRepository();
