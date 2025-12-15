const notificationLogRepository = require('../repositories/notificationLogRepository');

class LogController {
  async getLogs(req, res) {
    try {
      const {
        status,
        channel,
        sourceService,
        eventType,
        startDate,
        endDate,
        limit = 50,
        offset = 0
      } = req.query;

      const parsedLimit = Math.min(parseInt(limit) || 50, 100);
      const parsedOffset = parseInt(offset) || 0;

      const filters = {};
      if (status) filters.status = status.toUpperCase();
      if (channel) filters.channel = channel.toUpperCase();
      if (sourceService) filters.sourceService = sourceService;
      if (eventType) filters.eventType = eventType;
      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);

      const [logs, total] = await Promise.all([
        notificationLogRepository.findAll(filters, parsedLimit, parsedOffset),
        notificationLogRepository.count(filters)
      ]);

      console.log(`Logs retrieved: ${logs.length}/${total}`);

      return res.status(200).json({
        success: true,
        data: {
          logs,
          pagination: {
            limit: parsedLimit,
            offset: parsedOffset,
            total,
            totalPages: Math.ceil(total / parsedLimit)
          },
          filters
        }
      });
    } catch (error) {
      console.error('Error in getLogs:', error);

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve logs',
        error: error.message
      });
    }
  }

  async getLogsByNotificationId(req, res) {
    try {
      const { id } = req.params;

      const logs = await notificationLogRepository.findByNotificationId(id);

      console.log(`Notification logs retrieved: ${logs.length}`);

      return res.status(200).json({
        success: true,
        data: {
          notificationId: id,
          logs
        }
      });
    } catch (error) {
      console.error('Error in getLogsByNotificationId:', error);

      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve notification logs',
        error: error.message
      });
    }
  }
}

module.exports = new LogController();
