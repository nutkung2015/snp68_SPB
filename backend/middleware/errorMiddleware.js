const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    const statusCode = err.status || 500;
    const message = process.env.NODE_ENV === 'production' && statusCode === 500
        ? 'Internal server error'
        : err.message || 'Something went wrong';

    res.status(statusCode).json({
        status: 'error',
        message: message,
        ...(process.env.NODE_ENV === 'development' && {
            stack: err.stack,
            error: err
        })
    });
};

module.exports = errorHandler;
