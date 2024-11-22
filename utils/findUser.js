const jwt = require('jsonwebtoken'); // Assuming you're using JWT for token handling

// Your secret key used to sign the JWTs
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

/**
 * Extract user information from Authorization Bearer token
 * @param {string} authorizationHeader - The Authorization header from the request
 * @returns {object} - Decoded user payload or throws an error if invalid
 */
const getUserFromToken = (authorizationHeader) => {
    if (!authorizationHeader) {
        throw new Error('Authorization header is missing');
    }

    const token = authorizationHeader.split(' ')[1]; // Extract the token part from "Bearer <token>"
    if (!token) {
        throw new Error('Token is missing from the Authorization header');
    }

    try {
        const userPayload = jwt.verify(token, JWT_SECRET); // Verify and decode the token
        return userPayload; // Return the user information from the payload
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
};

module.exports = {
    getUserFromToken,
};
