const { v4: uuidv4 } = require('uuid');

function requestId(req, res, next) {
  req.id = uuidv4();
  res.setHeader('X-Request-Id', req.id);
  next();
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : 'Internal server error';

  if (status >= 500) {
    console.error({ requestId: req.id, err }, 'Unhandled error');
  }

  res.status(status).json({ error: message, requestId: req.id });
}

module.exports = { requestId, errorHandler };
