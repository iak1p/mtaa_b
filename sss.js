return res.status(500).json({
  error: "Internal Server Error",
  message: "An unexpected error occurred while processing your request",
  statusCode: 500,
});


return res.status(404).json({
  error: "Not Found",
  message: "User does not exist",
  statusCode: 404,
});

return res.status(401).json({
  error: "Unauthorized",
  message: "Authentication token is missing",
  statusCode: 401,
});

return res.status(403).json({
  error: "Forbidden",
  message: "Invalid token",
  statusCode: 403,
});

return res.status(409).json({
  error: "Conflict",
  message: "User already linked to this budget",
  statusCode: 409,
});