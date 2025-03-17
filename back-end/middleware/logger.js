export const loggerMiddleware = (req, res, next) => {
    console.log('=== Request Details ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('URL:', req.url);
    console.log('Method:', req.method);
    console.log('Body:', req.body);
    console.log('===================');
    next();
}; 